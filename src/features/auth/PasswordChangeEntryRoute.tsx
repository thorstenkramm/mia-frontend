import { useIntl } from "react-intl";
import { messages } from "../../platform/i18n/messages";
import { RestrictedLogoutControl } from "./RestrictedLogoutControl";

export default function PasswordChangeEntryRoute() {
  const intl = useIntl();
  return (
    <>
      <p className="mt-3 text-center text-sm/6 text-gray-600">
        {intl.formatMessage(messages.passwordChangeIntroduction)}
      </p>
      <RestrictedLogoutControl />
    </>
  );
}
