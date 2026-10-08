import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import type { ReactNode, Ref } from "react";

// Tailwind Plus: Application UI > Feedback > Alerts > With actions,
// v4/react-light.jsx, library 2026-09-13-083323. MIA warning palette, h2,
// wrapping actions and optional inert API disclosure (no JS error props).
export function RouteRecoveryPanel({
  heading,
  children,
  actions,
  headingRef,
}: {
  readonly heading: string;
  readonly children: ReactNode;
  readonly actions: ReactNode;
  readonly headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="mt-8 rounded-md bg-yellow-50 p-4">
      <div className="flex">
        <div className="shrink-0">
          <ExclamationTriangleIcon
            aria-hidden="true"
            className="size-5 text-yellow-400"
          />
        </div>
        <div className="ml-3 min-w-0">
          <h2
            ref={headingRef}
            tabIndex={headingRef ? -1 : undefined}
            className="text-sm font-medium text-yellow-800"
          >
            {heading}
          </h2>
          <div className="mt-2 text-sm text-yellow-700">{children}</div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex flex-wrap gap-3">{actions}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
