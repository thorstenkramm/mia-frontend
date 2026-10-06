import type { ReactNode } from "react";
import { useIntl } from "react-intl";
import { messages } from "../../platform/i18n/messages";
import { SimpleEntrySurface } from "./SimpleEntrySurface";

export function EntryIntroduction({
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

// The neutral shell rendered until every gate step succeeds.
export function CheckingAccess({
  children,
}: {
  readonly children?: ReactNode;
}) {
  return (
    <SimpleEntrySurface
      titleMessage={messages.checkingPageTitle}
      headingMessage={messages.checkingHeading}
    >
      {children}
      <EntryIntroduction message={messages.checkingIntroduction} />
    </SimpleEntrySurface>
  );
}
