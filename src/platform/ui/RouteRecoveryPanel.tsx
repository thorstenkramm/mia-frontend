import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/20/solid";
import type { ReactNode, Ref } from "react";

// Tailwind Plus: Application UI > Feedback > Alerts > With actions,
// v4/react-light.jsx, library 2026-09-13-083323. MIA warning palette, h2,
// wrapping actions and optional inert API disclosure (no JS error props).
export function RouteRecoveryPanel({
  heading,
  children,
  actions,
  headingRef,
  pageHeading = false,
  tone = "yellow",
}: {
  readonly heading: string;
  readonly children: ReactNode;
  readonly actions: ReactNode;
  readonly headingRef?: Ref<HTMLHeadingElement>;
  readonly pageHeading?: boolean;
  readonly tone?: "yellow" | "red" | "gray";
}) {
  const Icon =
    tone === "gray" ? InformationCircleIcon : ExclamationTriangleIcon;
  return (
    <div
      className={
        tone === "red"
          ? "mt-8 rounded-md bg-red-50 p-4"
          : tone === "gray"
            ? "mt-8 rounded-md bg-gray-50 p-4"
            : "mt-8 rounded-md bg-yellow-50 p-4"
      }
    >
      <div className="flex">
        <div className="shrink-0">
          <Icon
            aria-hidden="true"
            className={
              tone === "red"
                ? "size-5 text-red-600"
                : tone === "gray"
                  ? "size-5 text-gray-700"
                  : "size-5 text-yellow-700"
            }
          />
        </div>
        <div className="ml-3 min-w-0">
          {pageHeading ? (
            <h1
              className={
                tone === "red"
                  ? "text-sm font-medium text-red-800"
                  : tone === "gray"
                    ? "text-sm font-medium text-gray-900"
                    : "text-sm font-medium text-yellow-800"
              }
            >
              {heading}
            </h1>
          ) : (
            <h2
              ref={headingRef}
              tabIndex={headingRef ? -1 : undefined}
              className={
                tone === "red"
                  ? "text-sm font-medium text-red-800"
                  : tone === "gray"
                    ? "text-sm font-medium text-gray-900"
                    : "text-sm font-medium text-yellow-800"
              }
            >
              {heading}
            </h2>
          )}
          <div
            className={
              tone === "red"
                ? "mt-2 text-sm text-red-800"
                : tone === "gray"
                  ? "mt-2 text-sm text-gray-700"
                  : "mt-2 text-sm text-yellow-700"
            }
          >
            {children}
          </div>
          {/* jscpd:ignore-start — the actions slot is the same Tailwind Plus
              alert-with-actions blueprint instance as InvitationStatus.tsx;
              blueprint-bound markup is deliberately not extracted into a
              shared wrapper (see .agents/rules/duplication.md). */}
          {actions === null ? null : (
            <div className="mt-4">
              <div className="-mx-2 -my-1.5 flex flex-wrap gap-3">
                {actions}
              </div>
            </div>
          )}
          {/* jscpd:ignore-end */}
        </div>
      </div>
    </div>
  );
}
