import { createContext, use, useState, type ReactNode } from "react";

type Announcement = {
  readonly sequence: number;
  readonly message: string;
};

type AnnouncerContextValue = {
  announce: (message: string) => void;
};

const AnnouncerContext = createContext<AnnouncerContextValue | null>(null);

type AnnouncementProviderProps = {
  children: ReactNode;
};

export function AnnouncementProvider({ children }: AnnouncementProviderProps) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  function announce(message: string): void {
    setAnnouncement((current) => ({
      sequence: (current?.sequence ?? 0) + 1,
      message,
    }));
  }

  return (
    <AnnouncerContext value={{ announce }}>
      {children}
      <AnnouncementRegion announcement={announcement} />
    </AnnouncerContext>
  );
}

export function useAnnouncer(): AnnouncerContextValue {
  const context = use(AnnouncerContext);
  if (context === null) {
    throw new Error("MIA announcements require AnnouncementProvider.");
  }
  return context;
}

type AnnouncementRegionProps = {
  announcement: Announcement | null;
};

export function AnnouncementRegion({ announcement }: AnnouncementRegionProps) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement === null ? null : (
        <span key={announcement.sequence}>{announcement.message}</span>
      )}
    </div>
  );
}
