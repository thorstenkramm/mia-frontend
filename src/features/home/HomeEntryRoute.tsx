import { useIntl } from "react-intl";
import { Link } from "react-router";
import { messages } from "../../platform/i18n/messages";
import {
  useAuthenticatedAccess,
  useSessionActions,
} from "../../platform/data/EntryDataProvider";
import { mfaPaths } from "../../platform/session/mfaEnrollment";

export default function HomeEntryRoute() {
  const intl = useIntl();
  const { beginAuthenticatedLogout } = useSessionActions();
  const access = useAuthenticatedAccess();
  return (
    <>
      <p className="mt-3 text-center text-sm/6 text-gray-600">
        {intl.formatMessage(messages.homeIntroduction)}
      </p>
      {/* Tailwind Plus: Application UI > Elements > Buttons > Secondary buttons.
        Library version: 2026-09-13-083323. MIA adds visible focus. Until the
        Epic 2 profile exists, Home stands in as the MFA overview's parent. */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {access?.ownProfileView === true ? (
          <Link
            to={mfaPaths.overview}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {intl.formatMessage(messages.homeMfaLink)}
          </Link>
        ) : null}
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
