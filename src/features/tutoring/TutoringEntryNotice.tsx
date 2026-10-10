import { InformationCircleIcon } from "@heroicons/react/20/solid";
import { useIntl } from "react-intl";
import { messages } from "../../platform/i18n/messages";

// Tailwind Plus: Application UI > Feedback > Alerts > With description,
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas (FFR-613):
// informational blue palette instead of the warning yellow, the information
// icon, persistent fixed product copy in every launch locale (never
// operator-configured, never a warning against speaking freely), no dismiss.
export function TutoringEntryNotice() {
  const intl = useIntl();
  return (
    <div className="rounded-md bg-blue-50 p-4">
      <div className="flex">
        <div className="shrink-0">
          <InformationCircleIcon
            aria-hidden="true"
            className="size-5 text-blue-400"
          />
        </div>
        <div className="ml-3 min-w-0">
          <h2 className="text-sm font-medium text-blue-800">
            {intl.formatMessage(messages.tutoringNoticeHeading)}
          </h2>
          <div className="mt-2 text-sm text-blue-700">
            <p>{intl.formatMessage(messages.tutoringNoticeBody)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
