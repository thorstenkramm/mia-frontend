import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { Suspense, useEffect, useSyncExternalStore } from "react";
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
  useAuthenticationBootstrapState,
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
import { entryRoutes, type EntryRouteKey } from "./routes/entryRoutes";
import { SimpleEntrySurface } from "./routes/SimpleEntrySurface";
import { SessionPrivacyShield, SessionWarning } from "./SessionLifecycle";

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
      </BrowserRouter>
    </EntryDataProvider>
  );
}

function routeKey(
  state: AuthenticationBootstrapState,
  pathname: string,
  resetSurface: PasswordResetSurface | null,
  invitation: InvitationSurface | null,
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
      return "home";
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
  const state = useAuthenticationBootstrapState();
  const { continueDeferredAccess } = useSessionActions();
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
  const key = routeKey(state, location.pathname, resetSurface, invitation);

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
  }, [invitationLink, passwordResetLink, location.pathname]);
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

  if (key === null) {
    return <EntryStateSurface state={state} />;
  }

  const route = entryRoutes[key];
  if (location.pathname !== route.path) {
    return <Navigate replace to={route.path} />;
  }

  const RouteContent = route.component;
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
      <Suspense fallback={null}>
        <RouteContent
          initialTextSize={initialTextSize}
          passwordResetLink={passwordResetLink}
          invitationLink={invitationLink}
          {...(state.kind === "Logout confirmed"
            ? { logoutConfirmed: true }
            : {})}
        />
      </Suspense>
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

function EntryIntroduction({
  message,
}: {
  message: (typeof messages)[keyof typeof messages];
}) {
  const intl = useIntl();
  return (
    <p className="mt-3 text-center text-sm/6 text-gray-600">
      {intl.formatMessage(message)}
    </p>
  );
}

function CheckingAccess() {
  return (
    <SimpleEntrySurface
      titleMessage={messages.checkingPageTitle}
      headingMessage={messages.checkingHeading}
    >
      <EntryIntroduction message={messages.checkingIntroduction} />
    </SimpleEntrySurface>
  );
}

function EntryFailure({
  error,
  source,
}: {
  error: EntryError;
  source: "session" | "capabilities";
}) {
  const intl = useIntl();
  const explanation =
    source === "session"
      ? messages.sessionErrorIntroduction
      : messages.capabilityErrorIntroduction;

  return (
    <SimpleEntrySurface
      titleMessage={messages.errorPageTitle}
      headingMessage={messages.errorHeading}
    >
      {/* Tailwind Plus: Application UI > Feedback > Alerts > With description */}
      {/* Library version: 2026-09-13-083323. MIA adds the required inert raw-error disclosure. */}
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
              <p>{intl.formatMessage(explanation)}</p>
              <TechnicalErrorDisclosure error={error} />
            </div>
          </div>
        </div>
      </div>
    </SimpleEntrySurface>
  );
}
