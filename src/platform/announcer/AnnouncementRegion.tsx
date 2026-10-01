import {
  createContext,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type AnnouncementPriority = "auth" | "urgent" | "polite";
type AnnouncementOwner = symbol;

type Announcement = {
  readonly owner: AnnouncementOwner;
  readonly priority: AnnouncementPriority;
  readonly sequence: number;
  readonly message: string;
};

type AnnouncerContextValue = {
  announce: (
    owner: AnnouncementOwner,
    message: string,
    priority: AnnouncementPriority,
  ) => void;
  activate: (owner: AnnouncementOwner) => void;
  clear: (owner: AnnouncementOwner) => void;
  retire: (owner: AnnouncementOwner) => void;
};

type OwnedAnnouncerContextValue = {
  announce: (message: string, priority?: AnnouncementPriority) => void;
  clear: () => void;
};

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

type AnnouncementProviderProps = {
  children: ReactNode;
};

export function AnnouncementProvider({ children }: AnnouncementProviderProps) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const pending = useRef<Announcement[]>([]);
  const activeOwners = useRef(new Set<AnnouncementOwner>());
  const flushScheduled = useRef(false);
  const sequence = useRef(0);

  const announce = useCallback(function announce(
    owner: AnnouncementOwner,
    message: string,
    priority: AnnouncementPriority,
  ): void {
    if (!activeOwners.current.has(owner)) return;
    sequence.current += 1;
    pending.current.push({
      owner,
      priority,
      sequence: sequence.current,
      message,
    });
    if (flushScheduled.current) return;
    flushScheduled.current = true;
    queueMicrotask(() => {
      flushScheduled.current = false;
      const candidates = pending.current.splice(0);
      const winner = candidates.reduce<Announcement | null>(
        (current, candidate) =>
          current === null || winsArbitration(candidate, current)
            ? candidate
            : current,
        null,
      );
      if (winner !== null) setAnnouncement(winner);
    });
  }, []);

  const activate = useCallback(function activate(
    owner: AnnouncementOwner,
  ): void {
    activeOwners.current.add(owner);
  }, []);

  const clear = useCallback(function clear(owner: AnnouncementOwner): void {
    pending.current = pending.current.filter(
      (announcement) => announcement.owner !== owner,
    );
    setAnnouncement((current) => (current?.owner === owner ? null : current));
  }, []);
  const retire = useCallback(
    function retire(owner: AnnouncementOwner): void {
      activeOwners.current.delete(owner);
      clear(owner);
    },
    [clear],
  );
  const value = useMemo(
    () => ({ activate, announce, clear, retire }),
    [activate, announce, clear, retire],
  );

  return (
    <AnnouncerContext value={value}>
      {children}
      <AnnouncementRegion priority="polite" announcement={announcement} />
      <AnnouncementRegion priority="assertive" announcement={announcement} />
    </AnnouncerContext>
  );
}

export function useAnnouncer(): OwnedAnnouncerContextValue {
  const context = use(AnnouncerContext);
  const owner = useRef<AnnouncementOwner>(Symbol("announcement-owner"));
  const announce = useCallback(
    (message: string, priority: AnnouncementPriority = "polite"): void => {
      if (context === null)
        throw new Error("MIA announcements require AnnouncementProvider.");
      context.announce(owner.current, message, priority);
    },
    [context],
  );
  const clear = useCallback((): void => {
    context?.clear(owner.current);
  }, [context]);
  useLayoutEffect(() => {
    if (context === null) return;
    const currentOwner = owner.current;
    context.activate(currentOwner);
    return () => context.retire(currentOwner);
  }, [context]);
  if (context === null) {
    throw new Error("MIA announcements require AnnouncementProvider.");
  }
  return useMemo(() => ({ announce, clear }), [announce, clear]);
}

type AnnouncementRegionProps = {
  announcement: Announcement | null;
  priority: "polite" | "assertive";
};

export function AnnouncementRegion({
  announcement,
  priority,
}: AnnouncementRegionProps) {
  const shouldRender =
    announcement !== null &&
    (priority === "polite") === (announcement.priority === "polite");
  return (
    <div aria-live={priority} aria-atomic="true" className="sr-only">
      {shouldRender ? (
        <span key={announcement.sequence}>{announcement.message}</span>
      ) : null}
    </div>
  );
}

const priorityRank = {
  auth: 3,
  urgent: 2,
  polite: 1,
} satisfies Record<AnnouncementPriority, number>;

function winsArbitration(
  candidate: Announcement,
  current: Announcement,
): boolean {
  const priorityDifference =
    priorityRank[candidate.priority] - priorityRank[current.priority];
  return (
    priorityDifference > 0 ||
    (priorityDifference === 0 && candidate.sequence > current.sequence)
  );
}
