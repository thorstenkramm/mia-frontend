import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useRef,
  type RefObject,
  type ReactNode,
} from "react";
import { useIntl } from "react-intl";
import { useLocation } from "react-router";
import { messages } from "../../platform/i18n/messages";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";

const RouteSequenceContext = createContext<{ current: string | null } | null>(
  null,
);

// One location ledger survives neutral/admitted layout replacement, but holds
// no protected title, content or history payload.
export function RouteSequenceProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const sequence = useRef<string | null>(null);
  return (
    <RouteSequenceContext value={sequence}>{children}</RouteSequenceContext>
  );
}

// The route frame parts every rendered route shares, whichever layout hosts it:
// route-heading focus, the bypass link, and the public build identifier.

// Focuses the page heading on route entry and when the heading changes in
// place, without scrolling unexpectedly.
export function useRouteHeadingFocus(
  headingId: string,
): RefObject<HTMLHeadingElement | null> {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const location = useLocation();
  const intl = useIntl();
  const routeSubject = useEffectEvent(() =>
    intl.formatMessage({ id: headingId }),
  );
  const { announce } = useAnnouncer();
  const sequence = use(RouteSequenceContext);

  useEffect(() => {
    const heading = headingRef.current;
    if (heading === null) return;
    let active = true;
    const focus = (selected = true) => {
      if (!active || !heading.isConnected) return;
      // Urgent/auth owners retain their chosen corrective target. A suppressed
      // but current route still needs heading focus if unmount left only body.
      if (
        !selected &&
        document.activeElement !== document.body &&
        document.activeElement !== null &&
        document.activeElement !== heading
      )
        return;
      heading.focus({ preventScroll: true });
      if (heading.getBoundingClientRect().bottom < 0)
        heading.scrollIntoView({ block: "nearest" });
    };
    const checking = headingId === messages.checkingHeading.id;
    const changed =
      sequence !== null &&
      sequence.current !== null &&
      sequence.current !== location.key;
    if (!checking && sequence !== null) sequence.current = location.key;
    if (!checking && changed) announce(routeSubject(), "polite", focus);
    else focus();
    return () => {
      active = false;
    };
    // Locale/text-size changes do not reset route focus or announce entry.
  }, [location.key, headingId, announce, sequence]);

  return headingRef;
}

export function BypassLink({
  target,
}: {
  readonly target: RefObject<HTMLElement | null>;
}) {
  const intl = useIntl();
  return (
    <a
      // Visible on focus and stacked above the shell's fixed sidebar (z-50).
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-60 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow-xs focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600"
      href="#main-content"
      onClick={(event) => {
        // Move focus without a fragment: no history entry, and a reset page
        // never mistakes the bypass for a newly pasted link.
        event.preventDefault();
        target.current?.focus();
      }}
    >
      {intl.formatMessage(messages.skipLink)}
    </a>
  );
}

export function BuildIdentifier({ className }: { readonly className: string }) {
  const intl = useIntl();
  return (
    <p className={className} data-testid="build-identifier">
      {intl.formatMessage(messages.buildIdentifier, {
        buildId: __MIA_BUILD_ID__,
      })}
    </p>
  );
}
