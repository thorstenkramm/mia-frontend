import type { ReactNode } from "react";
import { useIntl } from "react-intl";
import type { TotpProvisioning } from "../../platform/api/totpProvisioning";
import { messages } from "../../platform/i18n/messages";
import { TotpQrCode } from "./TotpQrCode";

// The QR code and the selectable manual values are derived from one validated
// provisioning value, so both describe the same setup.
export function TotpSetupDetails({
  provisioning,
}: {
  readonly provisioning: TotpProvisioning;
}) {
  const intl = useIntl();
  return (
    <>
      <div className="mt-6 flex justify-center">
        <TotpQrCode
          value={provisioning.uri}
          label={intl.formatMessage(messages.mfaQrLabel)}
        />
      </div>
      {/* Tailwind Plus: Application UI > Data Display > Description Lists > Left-aligned in card */}
      {/* v4/react-light.jsx, library version 2026-09-13-083323. MIA uses an h2,
          drops attachments, and keeps credential values left-to-right and untranslated. */}
      <div className="mt-6 overflow-hidden bg-white shadow-sm sm:rounded-lg">
        <div className="px-4 py-6 sm:px-6">
          <h2 className="text-base/7 font-semibold text-gray-900">
            {intl.formatMessage(messages.mfaManualHeading)}
          </h2>
          <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
            {intl.formatMessage(messages.mfaManualHelp)}
          </p>
        </div>
        <div className="border-t border-gray-100">
          <dl className="divide-y divide-gray-100">
            <Row term={intl.formatMessage(messages.mfaIssuer)} value>
              {provisioning.issuer}
            </Row>
            <Row term={intl.formatMessage(messages.mfaAccount)} value>
              {provisioning.account}
            </Row>
            <Row term={intl.formatMessage(messages.mfaSecret)} value>
              <span className="font-mono">{provisioning.secret}</span>
            </Row>
            <Row term={intl.formatMessage(messages.mfaAlgorithm)} value>
              SHA-1
            </Row>
            <Row term={intl.formatMessage(messages.mfaDigits)}>
              {intl.formatNumber(provisioning.digits)}
            </Row>
            <Row term={intl.formatMessage(messages.mfaPeriod)}>
              {intl.formatMessage(messages.mfaPeriodValue, {
                seconds: provisioning.period,
              })}
            </Row>
          </dl>
        </div>
      </div>
    </>
  );
}

function Row({
  term,
  value = false,
  children,
}: {
  readonly term: string;
  // A literal setup value: left-to-right, untranslated, and wrapping anywhere.
  readonly value?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
      <dt className="text-sm font-medium text-gray-900">{term}</dt>
      <dd
        className="mt-1 text-sm/6 break-all text-gray-700 sm:col-span-2 sm:mt-0"
        {...(value ? { dir: "ltr", translate: "no" as const } : {})}
      >
        {children}
      </dd>
    </div>
  );
}
