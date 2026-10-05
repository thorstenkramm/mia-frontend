import { useIntl } from "react-intl";
import { messages } from "../../platform/i18n/messages";
import { useSessionActions } from "../../platform/data/EntryDataProvider";

export default function HomeEntryRoute() {
  const intl = useIntl();
  const { beginAuthenticatedLogout } = useSessionActions();
  return (
    <>
      <p className="mt-3 text-center text-sm/6 text-gray-600">
        {intl.formatMessage(messages.homeIntroduction)}
      </p>
      {/* Tailwind Plus: Application UI > Elements > Buttons > Secondary buttons.
        Library version: 2026-09-13-083323. MIA adds visible focus. */}
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={beginAuthenticatedLogout}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {intl.formatMessage(messages.logoutButton)}
        </button>
      </div>
    </>
  );
}
