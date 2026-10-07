import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// How the mounted route answers an intentional in-application departure, such
// as activating an application-shell link. Browser history and sign-out are
// not departures through this channel.
export type RouteDeparture =
  // Stay; the route explains why and moves focus to the resolving control.
  | { readonly kind: "refuse"; readonly explain: () => void }
  // Leave; `replace` keeps the departed entry out of history, and `release`
  // drops route-owned state once the navigation is issued.
  | {
      readonly kind: "leave";
      readonly replace: boolean;
      readonly release?: () => void;
    }
  // Unsaved local input (FRONTEND-STATE-MACHINES.md §18 In-app leave): the
  // route asks Stay or Discard; `proceed` completes this departure only after
  // the route has discarded its input.
  | {
      readonly kind: "confirm";
      readonly ask: (proceed: () => void) => void;
    };

type DepartureGuard = () => RouteDeparture;
type GuardSlot = { current: DepartureGuard | null };
type DepartureContext = {
  readonly slot: GuardSlot;
  // The host's answer while no route guard is registered, for example while
  // the route's lazily loaded module is still arriving.
  readonly fallback: DepartureGuard | null;
};

const RouteDepartureContext = createContext<DepartureContext | null>(null);
const ordinaryDeparture: RouteDeparture = { kind: "leave", replace: false };

// Hosted by the layout that owns the departure controls.
export function RouteDepartureProvider({
  fallback = null,
  children,
}: {
  readonly fallback?: DepartureGuard | null;
  readonly children: ReactNode;
}) {
  const [slot] = useState<GuardSlot>(() => ({ current: null }));
  return (
    <RouteDepartureContext value={{ slot, fallback }}>
      {children}
    </RouteDepartureContext>
  );
}

// A route with a departure contract registers its current answer while mounted.
export function useRouteDepartureGuard(guard: DepartureGuard): void {
  const slot = use(RouteDepartureContext)?.slot ?? null;
  useEffect(() => {
    if (slot === null) return;
    slot.current = guard;
    return () => {
      if (slot.current === guard) slot.current = null;
    };
  }, [slot, guard]);
}

// Asked by a departure control at activation time.
export function useRouteDeparture(): () => RouteDeparture {
  const context = use(RouteDepartureContext);
  return () =>
    context?.slot.current?.() ?? context?.fallback?.() ?? ordinaryDeparture;
}

export type UnsavedInputDeparture = {
  // A departure waits for the Stay or Discard choice.
  readonly asking: boolean;
  readonly stay: () => void;
  readonly discard: () => void;
};

type RouterHistoryState = { readonly idx?: unknown } | null;

// The current unsaved-input guard for same-document Back/Forward; it returns
// true when it held the traversal.
let traversalGuard: ((event: PopStateEvent) => boolean) | null = null;
let traversalGateInstalled = false;

// Installed once by the bootstrap before the router starts. Listeners on the
// window run in registration order, so this gate sees each same-document
// traversal before React Router's own `popstate` listener and can hold it.
export function holdGuardedHistoryTraversals(target: Window): () => void {
  const gate = (event: PopStateEvent) => {
    if (traversalGuard?.(event) === true) event.stopImmediatePropagation();
  };
  target.addEventListener("popstate", gate);
  traversalGateInstalled = true;
  return () => {
    target.removeEventListener("popstate", gate);
    traversalGateInstalled = false;
  };
}

function historyIndex(state: unknown): number | null {
  const index = (state as RouterHistoryState)?.idx;
  return typeof index === "number" ? index : null;
}

// FRONTEND-STATE-MACHINES.md §18 for one form's unsaved, never-persisted input.
// While `dirty`, guarded in-app links and same-document Back/Forward ask Stay
// or Discard, and document unload asks the browser's native prompt. Security
// exits (sign-out, shields, expiry, access loss) are not departures here: they
// unmount the form, which removes every listener without asking.
export function useUnsavedInputGuard({
  dirty,
  clear,
  stayTarget,
}: {
  readonly dirty: boolean;
  // Drops the unsaved input before the departure proceeds.
  readonly clear: () => void;
  // Stay returns focus here, the control holding the input.
  readonly stayTarget: { readonly current: HTMLElement | null };
}): UnsavedInputDeparture {
  const [pending, setPending] = useState<{ readonly proceed: () => void }>();
  // Set by Discard so the departure it completes is not asked again.
  const released = useRef(false);

  useEffect(() => {
    if (!dirty) released.current = false;
  }, [dirty]);

  const guard = useCallback(
    (): RouteDeparture =>
      dirty && !released.current
        ? { kind: "confirm", ask: (proceed) => setPending({ proceed }) }
        : { kind: "leave", replace: false },
    [dirty],
  );
  useRouteDepartureGuard(guard);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!released.current) event.preventDefault();
    };
    // React Router's declarative browser history records each entry's index in
    // `history.state.idx`. A same-document traversal away from this entry is
    // held by the bootstrap gate before the router observes it, reverted, and
    // asked; Discard repeats the same traversal.
    if (!traversalGateInstalled)
      throw new Error("The history traversal gate is not installed.");
    const current = historyIndex(window.history.state);
    const holdTraversal = (event: PopStateEvent): boolean => {
      if (released.current || current === null) return false;
      const next = historyIndex(event.state);
      // Entries the router did not create carry no index; the router itself
      // treats them as unknown and this guard leaves them to it.
      if (next === null) return false;
      const delta = next - current;
      // The revert below arriving back at this entry.
      if (delta === 0) return true;
      window.history.go(-delta);
      setPending({ proceed: () => window.history.go(delta) });
      return true;
    };
    traversalGuard = holdTraversal;
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      if (traversalGuard === holdTraversal) traversalGuard = null;
    };
  }, [dirty]);

  return {
    asking: pending !== undefined,
    stay: () => {
      setPending(undefined);
      // After the dialog's own focus restoration.
      window.setTimeout(() => stayTarget.current?.focus(), 0);
    },
    discard: () => {
      const proceed = pending?.proceed;
      released.current = true;
      clear();
      setPending(undefined);
      proceed?.();
    },
  };
}
