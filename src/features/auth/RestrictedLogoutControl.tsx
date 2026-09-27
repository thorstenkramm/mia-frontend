import { useIntl } from "react-intl";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";

export function RestrictedLogoutControl() {
  const intl = useIntl();
  const { beginRestrictedLogout } = useSessionActions();

  return (
    <div className="mt-8 text-center">
      {/* Tailwind Plus: Application UI > Elements > Buttons > Secondary buttons */}
      {/* Library version: 2026-09-13-083323. MIA adds the required visible focus indicator. */}
      <button
        type="button"
        className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={beginRestrictedLogout}
      >
        {intl.formatMessage(messages.logoutButton)}
      </button>
    </div>
  );
}
