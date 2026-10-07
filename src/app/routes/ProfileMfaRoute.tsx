import { useLayoutEffect, useState } from "react";
import { useIntl } from "react-intl";
import { useLocation } from "react-router";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import {
  useMfaEnrollment,
  useSessionActions,
} from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { mfaPaths } from "../../platform/session/mfaEnrollment";
import {
  RouteDepartureProvider,
  type RouteDeparture,
} from "../../platform/ui/routeDeparture";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { RouteRecoveryPanel } from "../../platform/ui/RouteRecoveryPanel";
import { RouteRecoveryBoundary } from "./RouteRecoveryBoundary";
import { useMfaSnapshot } from "../../features/profile/mfaOutcome";
import { ApplicationShell } from "../ApplicationShell";
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
  const { read, codes } = useMfaSnapshot();
  const { pathname } = useLocation();
  const { announce } = useAnnouncer();
  const { beginAuthenticatedLogout } = useSessionActions();
  const [requested, setRequested] = useState(false);
  const holdingCodes =
    route.path === mfaPaths.recoveryCodes && codes.kind !== "None";
  const departureFallback = holdingCodes
    ? (): RouteDeparture => ({
        kind: "refuse",
        explain: () =>
          announce(
            intl.formatMessage(messages.mfaCodesAcknowledgeFirst),
            "urgent",
          ),
      })
    : undefined;
  const signOut = (
    <button
      type="button"
      onClick={beginAuthenticatedLogout}
      className="rounded-md px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
    >
      {intl.formatMessage(messages.logoutButton)}
    </button>
  );

  useLayoutEffect(() => {
    void mfa.check(pathname);
    setRequested(true);
  }, [mfa, pathname]);

  if (!requested || read.kind === "Checking" || read.path !== pathname)
    return (
      <CheckingAccess>
        <SessionWarning />
      </CheckingAccess>
    );

  if (read.kind === "Check failed")
    return (
      <RouteDepartureProvider fallback={departureFallback ?? null}>
        <SimpleEntrySurface
          titleMessage={messages.errorPageTitle}
          headingMessage={messages.errorHeading}
        >
          <SessionWarning />
          <RouteRecoveryPanel
            heading={intl.formatMessage(messages.errorSummary)}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => void mfa.check(pathname)}
                  className="rounded-md bg-yellow-50 px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
                >
                  {intl.formatMessage(messages.mfaCheckAgain)}
                </button>
                <RouteDepartureLink
                  to="/"
                  className="rounded-md px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
                >
                  {intl.formatMessage(messages.mfaBackToHome)}
                </RouteDepartureLink>
                {signOut}
              </>
            }
          >
            <p>{intl.formatMessage(messages.mfaCheckFailed)}</p>
            <TechnicalErrorDisclosure error={read.error} />
          </RouteRecoveryPanel>
        </SimpleEntrySurface>
      </RouteDepartureProvider>
    );

  // Every gate step passed in this epoch: only now does the shared shell mount.
  const RouteContent = route.component;
  return (
    <ApplicationShell
      titleMessage={route.titleMessage}
      headingMessage={route.headingMessage}
      {...(departureFallback ? { departureFallback } : {})}
    >
      <SessionWarning />
      <RouteRecoveryBoundary
        canReload={!holdingCodes}
        actions={
          <>
            {route.parent ? (
              <RouteDepartureLink
                to={route.parent.path}
                className="rounded-md px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
              >
                {intl.formatMessage(route.parent.label)}
              </RouteDepartureLink>
            ) : null}
            {signOut}
          </>
        }
      >
        <RouteContent state={read.state} />
      </RouteRecoveryBoundary>
    </ApplicationShell>
  );
}
