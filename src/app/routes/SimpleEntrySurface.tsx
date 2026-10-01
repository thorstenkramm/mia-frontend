import { useEffect, useRef, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { useLocation } from "react-router";
import { messages } from "../../platform/i18n/messages";

type MessageDescriptor = (typeof messages)[keyof typeof messages];

export function SimpleEntrySurface({
  titleMessage,
  headingMessage,
  children,
}: {
  titleMessage: MessageDescriptor;
  headingMessage: MessageDescriptor;
  children: ReactNode;
}) {
  const intl = useIntl();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const location = useLocation();

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [location.pathname, headingMessage.id]);

  return (
    <>
      <title>{intl.formatMessage(titleMessage)}</title>
      <a
        className="sr-only focus:absolute focus:top-4 focus:left-4 focus:z-10 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-gray-900 focus:shadow-xs focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600"
        href="#main-content"
      >
        {intl.formatMessage(messages.skipLink)}
      </a>
      <main id="main-content" className="min-h-screen bg-gray-50" tabIndex={-1}>
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
          <p
            className="mt-8 break-all text-center text-sm/6 text-gray-500"
            data-testid="build-identifier"
          >
            {intl.formatMessage(messages.buildIdentifier, {
              buildId: __MIA_BUILD_ID__,
            })}
          </p>
        </div>
      </main>
    </>
  );
}
