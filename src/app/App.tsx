import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { Suspense } from "react";
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
  type AuthenticationBootstrapState,
  type EntryError,
} from "../platform/data/EntryDataProvider";
import { messages } from "../platform/i18n/messages";
import { TechnicalErrorDisclosure } from "../platform/api/TechnicalErrorDisclosure";
import type { TextSize } from "../platform/prefs/preferences";
import { entryRoutes, type EntryRouteKey } from "./routes/entryRoutes";
import { SimpleEntrySurface } from "./routes/SimpleEntrySurface";

type AppProps = {
  initialTextSize: TextSize;
  queryClient?: Parameters<typeof EntryDataProvider>[0]["queryClient"];
};

export function App({ initialTextSize, queryClient }: AppProps) {
  return (
    <EntryDataProvider {...(queryClient ? { queryClient } : {})}>
      <BrowserRouter>
        <Routes>
          <Route
            path="*"
            element={<CanonicalEntry initialTextSize={initialTextSize} />}
          />
        </Routes>
      </BrowserRouter>
    </EntryDataProvider>
  );
}

function routeKey(state: AuthenticationBootstrapState): EntryRouteKey | null {
  switch (state.kind) {
    case "Cold":
    case "Checking":
    case "Access checking":
      return null;
    case "Signed out":
      return "signedOut";
    case "MFA required":
      return "mfa";
    case "Password change":
      return "passwordChange";
    case "Authenticated":
      return "home";
    case "Restricted expired":
      return "signedOut";
    case "Rotating":
      return null;
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

function CanonicalEntry({ initialTextSize }: AppProps) {
  const state = useAuthenticationBootstrapState();
  const location = useLocation();
  const key = routeKey(state);

  if (key === null) {
    return <EntryStateSurface state={state} />;
  }

  const route = entryRoutes[key];
  if (location.pathname !== route.path) {
    return <Navigate replace to={route.path} />;
  }

  const RouteContent = route.component;
  return (
    <SimpleEntrySurface
      titleMessage={route.titleMessage}
      headingMessage={
        key === "restrictedLogout" &&
        (state.kind === "Logout unconfirmed" ||
          state.kind === "Logout reconciliation needed")
          ? messages.logoutUnconfirmedHeading
          : route.headingMessage
      }
    >
      <Suspense fallback={null}>
        <RouteContent
          initialTextSize={initialTextSize}
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
