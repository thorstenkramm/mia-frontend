import { useIntl } from "react-intl";
import { useAuthenticationBootstrapState } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { PasswordChangeForm } from "./PasswordChangeForm";
import { RestrictedLogoutControl } from "./RestrictedLogoutControl";

export default function PasswordChangeEntryRoute() {
  const intl = useIntl();
  const state = useAuthenticationBootstrapState();
  // The secret-bearing form lives only as long as one authoritative account binding.
  const accountId =
    state.kind === "Password change" ||
    (state.kind === "Rotating" && state.origin === "password-change")
      ? state.accountId
      : "unavailable";
  return (
    <>
      <p className="mt-3 text-center text-sm/6 text-gray-600">
        {intl.formatMessage(messages.passwordChangeIntroduction)}
      </p>
      <PasswordChangeForm key={accountId} />
      <RestrictedLogoutControl />
    </>
  );
}
