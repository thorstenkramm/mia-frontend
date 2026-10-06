import { useIntl } from "react-intl";
import { messages } from "../../platform/i18n/messages";

// A neutral entry until authoritative continuation data exists: it makes no
// request and claims neither pending nor absent work. Navigation and Sign out
// live in the application shell.
export default function HomeEntryRoute() {
  const intl = useIntl();
  return (
    <p className="text-sm/6 text-gray-600">
      {intl.formatMessage(messages.homeIntroduction)}
    </p>
  );
}
