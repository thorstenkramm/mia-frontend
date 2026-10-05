import { useIntl } from "react-intl";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import {
  useAuthenticationBootstrapState,
  useSessionActions,
} from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";

export default function LogoutEntryRoute() {
  const intl = useIntl();
  const state = useAuthenticationBootstrapState();
  const { refreshLogoutStatus, retryRestrictedLogout } = useSessionActions();

  switch (state.kind) {
    case "Logout start":
    case "Logout quiescing":
    case "Logout dispatch":
    case "Logout confirming":
      return (
        <p className="text-center text-sm/6 text-gray-600">
          {intl.formatMessage(messages.logoutIntroduction)}
        </p>
      );
    case "Logout unconfirmed":
    case "Logout reconciliation needed": {
      const canRefresh = state.kind === "Logout reconciliation needed";
      return (
        <>
          <p className="text-center text-sm/6 text-gray-600">
            {intl.formatMessage(messages.logoutUnconfirmedIntroduction)}
          </p>
          <p className="mt-4 text-center text-sm/6 text-gray-600">
            {intl.formatMessage(messages.logoutCloseBrowserGuidance)}
          </p>
          <div className="mt-8 text-center">
            {/* Tailwind Plus: Application UI > Elements > Buttons > Secondary buttons */}
            {/* Library version: 2026-09-13-083323. MIA adds the required visible focus indicator. */}
            <button
              type="button"
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              onClick={canRefresh ? refreshLogoutStatus : retryRestrictedLogout}
            >
              {intl.formatMessage(
                canRefresh
                  ? messages.logoutRefreshButton
                  : messages.logoutRetryButton,
              )}
            </button>
          </div>
          {state.kind === "Logout unconfirmed" && state.error !== undefined ? (
            <TechnicalErrorDisclosure error={state.error} />
          ) : null}
        </>
      );
    }
    case "Cold":
    case "Privacy shield":
    case "Checking":
    case "Signed out":
    case "MFA required":
    case "Password change":
    case "Access checking":
    case "Authenticated":
    case "Access deferred":
    case "Rotating":
    case "Restricted expired":
    case "Logout confirmed":
      throw new Error("The logout route requires an active logout state.");
    default:
      return assertNever(state);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled logout route state: ${String(value)}`);
}
