import { useRef, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { messages } from "../../platform/i18n/messages";
import {
  BuildIdentifier,
  BypassLink,
  useRouteHeadingFocus,
} from "./routeFrame";

type MessageDescriptor = (typeof messages)[keyof typeof messages];

export function SimpleEntrySurface({
  titleMessage,
  headingMessage,
  showBuildIdentifier = true,
  children,
}: {
  titleMessage: MessageDescriptor;
  headingMessage: MessageDescriptor;
  showBuildIdentifier?: boolean;
  children: ReactNode;
}) {
  const intl = useIntl();
  const headingRef = useRouteHeadingFocus(headingMessage.id);
  const mainRef = useRef<HTMLElement>(null);

  return (
    <>
      <title>{intl.formatMessage(titleMessage)}</title>
      <BypassLink target={mainRef} />
      <main
        ref={mainRef}
        id="main-content"
        className="min-h-screen bg-gray-50"
        tabIndex={-1}
      >
        {/* Tailwind Plus: Application UI > Forms > Sign-in and Registration > Simple card */}
        {/* Library version: 2026-09-13-083323. MIA removes remote branding and credentials. */}
        <div className="flex min-h-screen flex-col justify-center break-words px-4 py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h1
              ref={headingRef}
              className="text-center text-2xl/9 font-bold tracking-tight text-gray-900"
              tabIndex={-1}
            >
              {intl.formatMessage(headingMessage)}
            </h1>
          </div>
          {/* The exact 480px maximum is inherited from the licensed Simple card blueprint. */}
          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
            {children}
          </div>
          {showBuildIdentifier ? (
            <BuildIdentifier className="mt-8 break-all text-center text-sm/6 text-gray-500" />
          ) : null}
        </div>
      </main>
    </>
  );
}
