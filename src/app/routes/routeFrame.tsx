import { useEffect, useRef, type RefObject } from "react";
import { useIntl } from "react-intl";
import { useLocation } from "react-router";
import { messages } from "../../platform/i18n/messages";

// The route frame parts every rendered route shares, whichever layout hosts it:
// route-heading focus, the bypass link, and the public build identifier.

// Focuses the page heading on route entry and when the heading changes in
// place, without scrolling unexpectedly.
export function useRouteHeadingFocus(
  headingId: string,
): RefObject<HTMLHeadingElement | null> {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const location = useLocation();

  useEffect(() => {
    const heading = headingRef.current;
    if (heading === null) return;
    heading.focus({ preventScroll: true });
    // A heading that changes in place (a result replacing a form) may sit above
    // the scrolled viewport; reveal it so focus is never off-screen.
    if (heading.getBoundingClientRect().bottom < 0)
      heading.scrollIntoView({ block: "nearest" });
  }, [location.pathname, headingId]);

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
