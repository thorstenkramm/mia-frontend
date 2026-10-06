import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { useMfaEnrollment } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { mfaPaths } from "../../platform/session/mfaEnrollment";
import { formatRecoveryCode } from "../../platform/ui/mfaCodes";
import { useRouteDepartureGuard } from "../../platform/ui/routeDeparture";
import {
  MfaStatusPanel,
  PrimaryButton,
  SecondaryButton,
  TextLink,
} from "./MfaStatusPanel";
import { useMfaSnapshot } from "./mfaOutcome";

export default function MfaRecoveryCodesRoute() {
  const intl = useIntl();
  const { codes } = useMfaSnapshot();
  switch (codes.kind) {
    case "Visible":
      return <RecoveryCodes codes={codes.codes.map(formatRecoveryCode)} />;
    case "Masked":
      return <MaskedCodes confirmed={codes.confirmed} />;
    case "None":
      return (
        <>
          <p className="mt-8 text-sm/6 text-gray-900">
            {intl.formatMessage(messages.mfaCodesUnavailable)}
          </p>
          <TextLink to={mfaPaths.overview}>
            {intl.formatMessage(messages.mfaBackToOverview)}
          </TextLink>
        </>
      );
    default:
      return assertNever(codes);
  }
}

// Held codes need an explicit reveal and the safe-storage acknowledgement
// before an intentional departure, so shell navigation is refused here.
function MaskedCodes({ confirmed }: { readonly confirmed: boolean }) {
  const intl = useIntl();
  const mfa = useMfaEnrollment();
  const { announce } = useAnnouncer();
  const reveal = useRef<HTMLButtonElement>(null);
  useRouteDepartureGuard(() => ({
    kind: "refuse",
    explain: () => {
      announce(intl.formatMessage(messages.mfaCodesAcknowledgeFirst), "urgent");
      reveal.current?.focus();
    },
  }));
  return (
    <MfaStatusPanel
      heading={messages.mfaCodesHidden}
      {...(confirmed
        ? {
            actions: (
              <PrimaryButton
                ref={reveal}
                disabled={false}
                onClick={() => mfa.reveal()}
              >
                {intl.formatMessage(messages.mfaRevealCodes)}
              </PrimaryButton>
            ),
          }
        : {})}
    >
      <p>{intl.formatMessage(messages.mfaCodesWarning)}</p>
    </MfaStatusPanel>
  );
}

type CopyResult = "idle" | "copied" | "failed";

function RecoveryCodes({ codes }: { readonly codes: readonly string[] }) {
  const intl = useIntl();
  const mfa = useMfaEnrollment();
  const navigate = useNavigate();
  const { announce } = useAnnouncer();
  const acknowledgement = useRef<HTMLInputElement>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [copyResult, setCopyResult] = useState<CopyResult>("idle");
  const [printFailed, setPrintFailed] = useState(false);
  const [doneRefused, setDoneRefused] = useState(false);

  // Copies exactly the visible grouped codes, one per line, on request only.
  async function copyCodes(): Promise<void> {
    try {
      if (navigator.clipboard === undefined)
        throw new Error("Clipboard API unavailable.");
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopyResult("copied");
      announce(intl.formatMessage(messages.mfaCopyCodesSuccess));
    } catch {
      setCopyResult("failed");
      announce(intl.formatMessage(messages.mfaCopyCodesFailure), "urgent");
    }
  }

  function printCodes(): void {
    try {
      setPrintFailed(false);
      announce(intl.formatMessage(messages.mfaPrintInitiated));
      window.print();
    } catch {
      setPrintFailed(true);
      announce(intl.formatMessage(messages.mfaPrintFailure), "urgent");
    }
  }

  function refuseDone(): void {
    setDoneRefused(true);
    announce(intl.formatMessage(messages.mfaCodesAcknowledgeFirst), "urgent");
    acknowledgement.current?.focus();
  }

  function done(): void {
    // Replace the entry so Back cannot return to this surface.
    navigate(mfaPaths.overview, { replace: true });
    mfa.finishCodes();
  }

  // Shell navigation follows the same rule as Done: refused until the
  // acknowledgement, then a replacing departure that drops the codes.
  useRouteDepartureGuard(() =>
    acknowledged
      ? { kind: "leave", replace: true, release: () => mfa.finishCodes() }
      : { kind: "refuse", explain: refuseDone },
  );

  return (
    <>
      {/* Tailwind Plus: Application UI > Feedback > Alerts > With description */}
      {/* v4/react-light.jsx, library version 2026-09-13-083323. MIA uses an h2. */}
      {/* jscpd:ignore-start — the same licensed alert blueprint as App.tsx's
          access-check failure; a shared wrapper would break the exact binding
          (duplication.md: presentation is not deduplicated). */}
      <div className="mt-8 rounded-md bg-yellow-50 p-4">
        <div className="flex">
          <div className="shrink-0">
            <ExclamationTriangleIcon
              aria-hidden="true"
              className="size-5 text-yellow-400"
            />
          </div>
          <div className="ml-3 min-w-0">
            <h2 className="text-sm font-medium text-yellow-800">
              {intl.formatMessage(messages.mfaCodesWarningHeading)}
            </h2>
            <div className="mt-2 text-sm text-yellow-700">
              <p>{intl.formatMessage(messages.mfaCodesWarning)}</p>
            </div>
            {/* jscpd:ignore-end */}
          </div>
        </div>
      </div>
      {/* Tailwind Plus: Application UI > Layout > Cards > Card with header and footer */}
      {/* v4/react-light.jsx, library version 2026-09-13-083323. MIA puts the
          copy and print actions in the footer. */}
      <div className="mt-6 divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm">
        <div className="px-4 py-5 sm:px-6">
          <h2
            id="recovery-codes-heading"
            className="text-base font-semibold text-gray-900"
          >
            {intl.formatMessage(messages.mfaCodesListLabel)}
          </h2>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <CodeList codes={codes} labelledBy="recovery-codes-heading" />
        </div>
        <div className="px-4 py-4 sm:px-6">
          <div className="flex flex-wrap gap-3">
            <SecondaryButton disabled={false} onClick={() => void copyCodes()}>
              {intl.formatMessage(messages.mfaCopyCodes)}
            </SecondaryButton>
            <SecondaryButton disabled={false} onClick={printCodes}>
              {intl.formatMessage(messages.mfaPrintCodes)}
            </SecondaryButton>
          </div>
          {copyResult !== "idle" ? (
            <p className="mt-3 text-sm/6 text-gray-700">
              {intl.formatMessage(
                copyResult === "copied"
                  ? messages.mfaCopyCodesSuccess
                  : messages.mfaCopyCodesFailure,
              )}
            </p>
          ) : null}
          {printFailed ? (
            <p className="mt-3 text-sm/6 text-gray-700">
              {intl.formatMessage(messages.mfaPrintFailure)}
            </p>
          ) : null}
        </div>
      </div>
      {/* Tailwind Plus: Application UI > Forms > Checkboxes > List with description */}
      {/* v4/react-light.jsx, library version 2026-09-13-083323. One item. */}
      <fieldset className="mt-6">
        <legend className="sr-only">
          {intl.formatMessage(messages.mfaCodesStorageLegend)}
        </legend>
        <div className="space-y-5">
          <div className="flex gap-3">
            <div className="flex h-6 shrink-0 items-center">
              <div className="group grid size-4 grid-cols-1">
                <input
                  ref={acknowledgement}
                  id="recovery-codes-saved"
                  name="recovery-codes-saved"
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => {
                    setAcknowledged(event.currentTarget.checked);
                    setDoneRefused(false);
                  }}
                  aria-describedby="recovery-codes-saved-description"
                  aria-invalid={doneRefused}
                  className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
                />
                <svg
                  fill="none"
                  viewBox="0 0 14 14"
                  aria-hidden="true"
                  className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25"
                >
                  <path
                    d="M3 8L6 11L11 3.5"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-has-checked:opacity-100"
                  />
                  <path
                    d="M3 7H11"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-has-indeterminate:opacity-100"
                  />
                </svg>
              </div>
            </div>
            <div className="text-sm/6">
              <label
                htmlFor="recovery-codes-saved"
                className="font-medium text-gray-900"
              >
                {intl.formatMessage(messages.mfaCodesAcknowledge)}
              </label>
              <p
                id="recovery-codes-saved-description"
                className="text-gray-500"
              >
                {intl.formatMessage(messages.mfaCodesAcknowledgeHelp)}
              </p>
              {doneRefused ? (
                <p className="font-medium text-gray-900">
                  {intl.formatMessage(messages.mfaCodesAcknowledgeFirst)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </fieldset>
      <div className="mt-8">
        <PrimaryButton
          disabled={!acknowledged}
          onClick={done}
          onUnavailable={refuseDone}
        >
          {intl.formatMessage(messages.mfaCodesDone)}
        </PrimaryButton>
      </div>
      {/* The only print surface: #root is hidden in print, so this portal
          outside it prints only codes and their warning. It unmounts with the codes. */}
      {createPortal(
        <div
          className="hidden p-8 print:block"
          data-testid="recovery-code-print"
        >
          <p>{intl.formatMessage(messages.mfaCodesWarning)}</p>
          <CodeList
            codes={codes}
            label={intl.formatMessage(messages.mfaCodesListLabel)}
          />
        </div>,
        document.body,
      )}
    </>
  );
}

function CodeList({
  codes,
  labelledBy,
  label,
}: {
  readonly codes: readonly string[];
  readonly labelledBy?: string;
  readonly label?: string;
}) {
  return (
    <ol
      {...(labelledBy === undefined ? {} : { "aria-labelledby": labelledBy })}
      {...(label === undefined ? {} : { "aria-label": label })}
      dir="ltr"
      translate="no"
      className="grid grid-cols-1 gap-x-6 gap-y-2 font-mono text-base text-gray-900 sm:grid-cols-2"
    >
      {codes.map((code) => (
        <li key={code}>{code}</li>
      ))}
    </ol>
  );
}

function assertNever(value: never): never {
  throw new Error(`Unhandled recovery-code view: ${String(value)}`);
}
