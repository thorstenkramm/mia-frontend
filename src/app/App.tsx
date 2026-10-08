import { useEffect, useSyncExternalStore } from "react";
import { useIntl } from "react-intl";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router";
import {
  EntryDataProvider,
  useAuthenticatedAccess,
  useAuthenticationBootstrapState,
  useMfaEnrollment,
  useSessionActions,
  type AuthenticationBootstrapState,
  type EntryError,
} from "../platform/data/EntryDataProvider";
import { messages } from "../platform/i18n/messages";
import { TechnicalErrorDisclosure } from "../platform/api/TechnicalErrorDisclosure";
import type { TextSize } from "../platform/prefs/preferences";
import {
  invitationPaths,
  invitationSurface,
  type InvitationLink,
  type InvitationSurface,
} from "../platform/session/invitationLink";
import {
  passwordResetPath,
  passwordResetSurface,
  type PasswordResetLink,
  type PasswordResetSurface,
} from "../platform/session/passwordResetLink";
import { ApplicationShell } from "./ApplicationShell";
import { CheckingAccess } from "./routes/CheckingAccess";
import {
  authenticatedRoute,
  entryRoutes,
  type AuthenticatedRoute,
  type AuthenticatedRouteAccess,
  type EntryRouteKey,
} from "./routes/entryRoutes";
import { AdminInvitationRoute } from "./routes/AdminInvitationRoute";
import { AdminCourseRoute } from "./routes/AdminCourseRoute";
import { PrepareCourseRoute } from "./routes/PrepareCourseRoute";
import { ProfileMfaRoute } from "./routes/ProfileMfaRoute";
import { SimpleEntrySurface } from "./routes/SimpleEntrySurface";
import { SessionPrivacyShield, SessionWarning } from "./SessionLifecycle";
import { RouteSequenceProvider } from "./routes/routeFrame";
import { useRouteAdmission } from "./routes/RouteAdmission";
import { RouteRecoveryBoundary } from "./routes/RouteRecoveryBoundary";
import { RouteDepartureLink } from "../platform/ui/RouteDepartureLink";
import { RouteRecoveryPanel } from "../platform/ui/RouteRecoveryPanel";
import { LogoutRecovery } from "../features/auth/LogoutRecovery";

type AppProps = {
  initialTextSize: TextSize;
  passwordResetLink: PasswordResetLink;
  invitationLink: InvitationLink;
  queryClient?: Parameters<typeof EntryDataProvider>[0]["queryClient"];
};

export function App({
  initialTextSize,
  passwordResetLink,
  invitationLink,
  queryClient,
}: AppProps) {
  return (
    <EntryDataProvider
      // A link captured at bootstrap shows its interstitial from stage discovery
      // alone; the capability gate runs only after a deliberate Go back.
      deferCapabilityGate={
        passwordResetLink.getSnapshot().kind === "Awaiting stage" ||
        invitationLink.getSnapshot().kind === "Awaiting stage"
      }
      {...(queryClient ? { queryClient } : {})}
    >
      <BrowserRouter>
        <RouteSequenceProvider>
          <Routes>
            <Route
              path="*"
              element={
                <CanonicalEntry
                  initialTextSize={initialTextSize}
                  passwordResetLink={passwordResetLink}
                  invitationLink={invitationLink}
                />
              }
            />
          </Routes>
        </RouteSequenceProvider>
      </BrowserRouter>
    </EntryDataProvider>
  );
}

function routeKey(
  state: AuthenticationBootstrapState,
  pathname: string,
  resetSurface: PasswordResetSurface | null,
  invitation: InvitationSurface | null,
  authenticated: AuthenticatedRoute,
): EntryRouteKey | null {
  if (state.kind === "Privacy shield") return null;
  // A captured reset or invitation link owns its paths until the flow ends;
  // otherwise the public recovery and link routes exist only for anonymous
  // sessions.
  if (resetSurface !== null) return "passwordReset";
  if (invitation !== null) return invitation.route;
  if (
    pathname === "/login/recovery" &&
    (state.kind === "Signed out" || state.kind === "Logout confirmed")
  )
    return "passwordRecovery";
  switch (state.kind) {
    case "Cold":
    case "Checking":
    case "Access checking":
      return null;
    case "Signed out":
      return "signedOut";
    case "MFA required":
      return pathname === "/auth/mfa/recovery"
        ? "mfaRecovery"
        : pathname === "/auth/mfa"
          ? "mfa"
          : state.route === "recovery"
            ? "mfaRecovery"
            : "mfa";
    case "Password change":
      return "passwordChange";
    case "Authenticated":
      return authenticated.key;
    case "Access deferred":
      // Only a link interstitial renders this state; without it, stay neutral.
      return null;
    case "Restricted expired":
      return "signedOut";
    case "Rotating":
      switch (state.origin) {
        case "login":
          return "signedOut";
        case "mfa":
          return state.route === "challenge" ? "mfa" : "mfaRecovery";
        case "password-change":
          return "passwordChange";
        default:
          return assertNever(state);
      }
    case "Logout confirmed":
      return "signedOut";
    case "Logout start":
    case "Logout quiescing":
    case "Logout dispatch":
    case "Logout confirming":
    case "Logout unconfirmed":
    case "Logout reconciliation needed":
      return "restrictedLogout";
    default:
      return assertNever(state);
  }
}

function CanonicalEntry({
  initialTextSize,
  passwordResetLink,
  invitationLink,
}: Omit<AppProps, "queryClient">) {
  const intl = useIntl();
  const state = useAuthenticationBootstrapState();
  const access = useAuthenticatedAccess();
  const mfaEnrollment = useMfaEnrollment();
  const {
    continueDeferredAccess,
    beginAuthenticatedLogout,
    beginRestrictedLogout,
    beginLinkLogout,
  } = useSessionActions();
  const location = useLocation();
  const resetState = useSyncExternalStore(
    passwordResetLink.subscribe,
    passwordResetLink.getSnapshot,
    passwordResetLink.getSnapshot,
  );
  const resetSurface = passwordResetSurface(
    state,
    resetState,
    location.pathname,
  );
  const invitationState = useSyncExternalStore(
    invitationLink.subscribe,
    invitationLink.getSnapshot,
    invitationLink.getSnapshot,
  );
  const invitation = invitationSurface(
    state,
    invitationState,
    location.pathname,
  );
  const routeAccess: AuthenticatedRouteAccess = {
    ownProfileView: access?.ownProfileView === true,
    invitationAdministration: access?.invitationAdministration === true,
    courseRecords: access?.courseRecords === true,
    courseCreate: access?.courseCreate === true,
    supervisorAssignments: access?.supervisorAssignments === true,
    courseSupervision: access?.courseSupervision === true,
  };
  const authenticated = authenticatedRoute(location.pathname, routeAccess);
  const key = routeKey(
    state,
    location.pathname,
    resetSurface,
    invitation,
    authenticated,
  );
  // The canonical concrete path; parameterized routes keep their own ID.
  const canonicalPath =
    key === null
      ? null
      : key === authenticated.key
        ? authenticated.path
        : entryRoutes[key].path;
  const admitted = useRouteAdmission(canonicalPath);

  // These route-local owners exist outside the mounted form. Drop their tokens
  // synchronously before BFCache capture, including cold/anonymous entry.
  useEffect(() => {
    const depart = () => {
      passwordResetLink.depart();
      invitationLink.depart();
    };
    window.addEventListener("pagehide", depart);
    return () => window.removeEventListener("pagehide", depart);
  }, [passwordResetLink, invitationLink]);

  // The stores live outside React: each link flow follows session changes and
  // drops its token as soon as its paths are left. Back and Forward between
  // the two invitation paths keep the invitation token.
  useEffect(() => {
    passwordResetLink.observeSession(state);
    invitationLink.observeSession(state);
  }, [invitationLink, passwordResetLink, state]);
  useEffect(() => {
    if (location.pathname !== passwordResetPath) passwordResetLink.depart();
    if (!invitationPaths.includes(location.pathname)) invitationLink.depart();
    // MFA setup data and recovery codes are dropped on route departure.
    mfaEnrollment.observePath(location.pathname);
  }, [invitationLink, mfaEnrollment, passwordResetLink, location.pathname]);
  useEffect(() => {
    // A link can be abandoned while discovery is pending. Once discovery then
    // reports authenticated, resume the ordinary gate instead of stranding the
    // departed route in its link-only deferred state.
    if (
      state.kind === "Access deferred" &&
      passwordResetLink.getSnapshot().kind === "Link unusable" &&
      invitationLink.getSnapshot().kind === "Link invalid"
    )
      void continueDeferredAccess();
  }, [continueDeferredAccess, invitationLink, passwordResetLink, state]);

  if (!admitted) return <CheckingAccess />;
  if (key === null) {
    return <EntryStateSurface state={state} />;
  }

  const route = entryRoutes[key];
  if (canonicalPath !== null && location.pathname !== canonicalPath) {
    return <Navigate replace to={canonicalPath} />;
  }

  if (route.gate === "Profile(own MFA)")
    return <ProfileMfaRoute key={location.key} route={route} />;
  if (route.gate === "Administer(invitations)")
    return (
      <AdminInvitationRoute
        key={location.key}
        route={route}
        invitationId={authenticated.invitationId}
      />
    );

  if (route.gate === "Administer(courses)")
    return (
      <AdminCourseRoute
        key={`${location.key}:${access?.epoch}`}
        route={route}
        courseId={authenticated.courseId ?? null}
      />
    );
  if (route.gate === "Prepare(courses)")
    return (
      <PrepareCourseRoute
        key={`${location.key}:${access?.epoch}`}
        route={route}
      />
    );
  const RouteContent = route.component;
  const parent =
    invitation?.view.kind === "interstitial"
      ? null
      : invitation &&
          invitation.view.kind !== "form" &&
          invitation.view.kind !== "preview" &&
          invitation.view.kind !== "checking" &&
          invitation.view.kind !== "preview retry"
        ? entryRoutes.invitation.parent
        : route.parent;
  const parentLink =
    parent === null ? null : (
      <RouteDepartureLink
        to={parent.path}
        className="mt-6 inline-block rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onDepart={(explain) => {
          if (explain) {
            explain();
            return;
          }
          passwordResetLink.depart();
          if (!invitationPaths.some((path) => path === parent.path))
            invitationLink.depart();
        }}
      >
        {intl.formatMessage(parent.label)}
      </RouteDepartureLink>
    );
  const signOut =
    state.kind === "Authenticated"
      ? beginAuthenticatedLogout
      : state.kind === "MFA required" || state.kind === "Password change"
        ? beginRestrictedLogout
        : state.kind === "Access deferred"
          ? beginLinkLogout
          : null;
  const recoveryActions = (
    <>
      {parentLink}
      {signOut ? (
        <button
          type="button"
          onClick={signOut}
          className="rounded-md px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
        >
          {intl.formatMessage(messages.logoutButton)}
        </button>
      ) : null}
    </>
  );
  const content = (
    <RouteRecoveryBoundary
      key={location.key}
      actions={recoveryActions}
      {...(key === "restrictedLogout" ? { recovery: <LogoutRecovery /> } : {})}
    >
      <RouteContent
        initialTextSize={initialTextSize}
        passwordResetLink={passwordResetLink}
        invitationLink={invitationLink}
        {...(state.kind === "Logout confirmed"
          ? { logoutConfirmed: true }
          : {})}
      />
    </RouteRecoveryBoundary>
  );
  // Home's complete gate is stage plus capabilities; only then does the shared
  // application shell (and its navigation) mount.
  if (route.gate === "Authenticated")
    return (
      <ApplicationShell
        titleMessage={route.titleMessage}
        headingMessage={route.headingMessage}
      >
        <SessionWarning />
        {content}
      </ApplicationShell>
    );

  const mfaExpired =
    state.kind === "MFA required" && state.outcome?.kind === "expired";
  // The uniform invalid invitation result has one title and heading on both
  // invitation paths.
  const invitationInvalid = invitation?.view.kind === "invalid";
  return (
    <SimpleEntrySurface
      titleMessage={
        mfaExpired
          ? messages.mfaRestartPageTitle
          : invitationInvalid
            ? messages.invitationPageTitle
            : route.titleMessage
      }
      headingMessage={
        mfaExpired
          ? messages.mfaRestartHeading
          : key === "restrictedLogout" &&
              (state.kind === "Logout unconfirmed" ||
                state.kind === "Logout reconciliation needed")
            ? messages.logoutUnconfirmedHeading
            : // The uniform unusable-link result is the page heading, so route
              // entry and a rejected submission focus the same target.
              resetSurface?.kind === "link unusable"
              ? messages.resetLinkUnusableHeading
              : invitationInvalid
                ? messages.invitationInvalidHeading
                : route.headingMessage
      }
    >
      <SessionWarning />
      {content}
      {invitation &&
      (invitation.view.kind === "checking" ||
        invitation.view.kind === "preview retry" ||
        invitation.view.kind === "preview" ||
        invitation.view.kind === "form")
        ? parentLink
        : null}
    </SimpleEntrySurface>
  );
}

function EntryStateSurface({ state }: { state: AuthenticationBootstrapState }) {
  switch (state.kind) {
    case "Privacy shield":
      return <SessionPrivacyShield />;
    case "Cold":
      return <CheckingAccess />;
    case "Checking":
      return state.phase === "loading" ? (
        <CheckingAccess />
      ) : (
        <EntryFailure error={state.error} source="session" />
      );
    case "Access checking":
      return state.phase === "loading" ? (
        <CheckingAccess />
      ) : (
        <EntryFailure error={state.error} source="capabilities" />
      );
    case "Rotating":
    case "Access deferred":
      return <CheckingAccess />;
    case "Signed out":
    case "MFA required":
    case "Password change":
    case "Authenticated":
    case "Restricted expired":
    case "Logout confirmed":
      throw new Error("A resolved entry state must render through its route.");
    case "Logout start":
    case "Logout quiescing":
    case "Logout dispatch":
    case "Logout confirming":
    case "Logout unconfirmed":
    case "Logout reconciliation needed":
      throw new Error("A logout state must render through its route.");
    default:
      return assertNever(state);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled authentication bootstrap state: ${String(value)}`);
}

function EntryFailure({
  error,
  source,
}: {
  error: EntryError;
  source: "session" | "capabilities";
}) {
  const intl = useIntl();
  const { checkRouteAdmission } = useSessionActions();
  const explanation =
    source === "session"
      ? messages.sessionErrorIntroduction
      : messages.capabilityErrorIntroduction;

  return (
    <SimpleEntrySurface
      titleMessage={messages.errorPageTitle}
      headingMessage={messages.errorHeading}
    >
      <RouteRecoveryPanel
        heading={intl.formatMessage(messages.errorSummary)}
        actions={
          <button
            type="button"
            onClick={() => void checkRouteAdmission()}
            className="rounded-md px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
          >
            {intl.formatMessage(messages.mfaCheckAgain)}
          </button>
        }
      >
        <p>{intl.formatMessage(explanation)}</p>
        <TechnicalErrorDisclosure error={error} />
      </RouteRecoveryPanel>
    </SimpleEntrySurface>
  );
}
