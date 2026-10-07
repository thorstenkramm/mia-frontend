import { Link, useNavigate, type LinkProps } from "react-router";
import { useRouteDeparture } from "./routeDeparture";

// Ordinary parent/recovery and shell links ask the same route-owned guard.
// Security exits (Sign out) do not pass through this channel.
export function RouteDepartureLink({
  onDepart,
  onClick,
  ...props
}: LinkProps & { readonly onDepart?: (after?: () => void) => void }) {
  const departure = useRouteDeparture();
  const navigate = useNavigate();
  return (
    <Link
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        const decision = departure();
        if (decision.kind === "refuse") {
          event.preventDefault();
          if (onDepart) onDepart(decision.explain);
          else decision.explain();
          return;
        }
        if (
          !event.metaKey &&
          !event.ctrlKey &&
          !event.shiftKey &&
          !event.altKey &&
          event.button === 0
        )
          onDepart?.();
        // Keep native modified-click behavior unless this route's departure must
        // replace history/release held state in the current tab.
        if (!decision.replace && decision.release === undefined) return;
        event.preventDefault();
        navigate(props.to, { replace: decision.replace });
        decision.release?.();
      }}
    />
  );
}
