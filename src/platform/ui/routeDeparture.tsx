import { createContext, use, useEffect, useState, type ReactNode } from "react";

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
