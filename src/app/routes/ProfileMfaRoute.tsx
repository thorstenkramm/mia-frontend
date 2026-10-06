import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { Suspense, useEffect } from "react";
import { useIntl } from "react-intl";
import { useLocation } from "react-router";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useMfaEnrollment } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { useMfaSnapshot } from "../../features/profile/mfaOutcome";
import { SessionWarning } from "../SessionLifecycle";
import { CheckingAccess } from "./CheckingAccess";
import type { ProfileMfaEntryRoute } from "./entryRoutes";
import { SimpleEntrySurface } from "./SimpleEntrySurface";

// The third gate step for `/profile/security/mfa[...]`: the session stage and
// own-scope `profile.view` already passed in this epoch; the route resource is
// the current MFA state, read freshly for each surface before it mounts.
export function ProfileMfaRoute({
  route,
}: {
  readonly route: ProfileMfaEntryRoute;
}) {
  const intl = useIntl();
  const mfa = useMfaEnrollment();
  const { read } = useMfaSnapshot();
  const { pathname } = useLocation();

  useEffect(() => {
    void mfa.check(pathname);
  }, [mfa, pathname]);

  if (read.kind === "Checking" || read.path !== pathname)
    return (
      <CheckingAccess>
        <SessionWarning />
      </CheckingAccess>
    );

  if (read.kind === "Check failed")
    return (
      <SimpleEntrySurface
        titleMessage={messages.errorPageTitle}
        headingMessage={messages.errorHeading}
      >
        <SessionWarning />
        {/* Tailwind Plus: Application UI > Feedback > Alerts > With actions */}
        {/* v4/react-light.jsx, library version 2026-09-13-083323. MIA uses warning
            colors, an h2, and the required inert raw-error disclosure. */}
        <div className="mt-8 rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="shrink-0">
              <ExclamationTriangleIcon
                aria-hidden="true"
                className="size-5 text-yellow-400"
              />
            </div>
            <div className="ml-3 min-w-0">
              <h2 className="text-sm font-medium text-yellow-800">
                {intl.formatMessage(messages.errorSummary)}
              </h2>
              <div className="mt-2 text-sm text-yellow-700">
                <p>{intl.formatMessage(messages.mfaCheckFailed)}</p>
                <TechnicalErrorDisclosure error={read.error} />
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void mfa.check(pathname)}
                    className="rounded-md bg-yellow-50 px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
                  >
                    {intl.formatMessage(messages.mfaCheckAgain)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SimpleEntrySurface>
    );

  const RouteContent = route.component;
  return (
    <SimpleEntrySurface
      titleMessage={route.titleMessage}
      headingMessage={route.headingMessage}
    >
      <SessionWarning />
      <Suspense fallback={null}>
        <RouteContent state={read.state} />
      </Suspense>
    </SimpleEntrySurface>
  );
}
