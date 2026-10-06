import { useActionState, useLayoutEffect, useRef } from "react";
import { useIntl } from "react-intl";
import { Navigate } from "react-router";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { useMfaEnrollment } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import {
  mfaPaths,
  type MfaSetupView,
} from "../../platform/session/mfaEnrollment";
import { AuthSubmitButton } from "../../platform/ui/AuthSubmitButton";
import { isSixDigitMfaCode } from "../../platform/ui/mfaCodes";
import { MfaActivityFeedback } from "./MfaActivityFeedback";
import type { MfaRouteProps } from "./MfaRouteProps";
import {
  MfaStatusPanel,
  PendingExpiry,
  PendingSetupPanel,
  PrimaryButton,
  PrimaryLink,
  SecondaryButton,
  TextLink,
} from "./MfaStatusPanel";
import { isBusy, useMfaSnapshot } from "./mfaOutcome";
import { TotpSetupDetails } from "./TotpSetupDetails";

export default function MfaVerifyRoute({ state }: MfaRouteProps) {
  const intl = useIntl();
  const mfa = useMfaEnrollment();
  const { activity, setup, codes } = useMfaSnapshot();
  const busy = isBusy(activity);
  const pending = state.pendingEnrollment;
  // Activation continues once, without a history entry, to the codes route.
  if (codes.kind !== "None")
    return <Navigate replace to={mfaPaths.recoveryCodes} />;

  if (pending === null || pending.method !== "totp")
    return (
      <>
        {pending === null ? (
          activity.kind === "Idle" ? (
            <p className="mt-8 text-sm/6 text-gray-900">
              {intl.formatMessage(messages.mfaNoPending)}
            </p>
          ) : null
        ) : (
          <PendingSetupPanel state={state} busy={busy} canContinue={false} />
        )}
        <MfaActivityFeedback activity={activity} state={state} />
        {pending === null && state.actions.enroll ? (
          <div className="mt-8 flex justify-center">
            <PrimaryLink to={mfaPaths.enroll}>
              {intl.formatMessage(messages.mfaSetUp)}
            </PrimaryLink>
          </div>
        ) : null}
        <TextLink to={mfaPaths.overview}>
          {intl.formatMessage(messages.mfaBackToOverview)}
        </TextLink>
      </>
    );

  return (
    <>
      <p className="mt-3 text-center text-sm/6 text-gray-600">
        {intl.formatMessage(messages.mfaVerifyIntroduction)}
      </p>
      <SetupSection setup={setup} />
      <div className="mt-6 text-sm/6 text-gray-600">
        <PendingExpiry expiresAt={pending.expiresAt} />
      </div>
      <EnrollmentCodeForm enabled={!busy && state.actions.verify} />
      <MfaActivityFeedback activity={activity} state={state} focusResult />
      {state.actions.cancel ? (
        <div className="mt-6">
          <SecondaryButton disabled={busy} onClick={() => void mfa.cancel()}>
            {intl.formatMessage(messages.mfaCancelSetup)}
          </SecondaryButton>
        </div>
      ) : null}
      <TextLink to={mfaPaths.overview}>
        {intl.formatMessage(messages.mfaBackToOverview)}
      </TextLink>
    </>
  );
}

function SetupSection({ setup }: { readonly setup: MfaSetupView }) {
  const intl = useIntl();
  const mfa = useMfaEnrollment();
  switch (setup.kind) {
    case "Visible":
      return <TotpSetupDetails provisioning={setup.provisioning} />;
    case "Masked":
      return (
        <MfaStatusPanel
          heading={messages.mfaSetupHidden}
          {...(setup.confirmed
            ? {
                actions: (
                  <PrimaryButton disabled={false} onClick={() => mfa.reveal()}>
                    {intl.formatMessage(messages.mfaRevealSetup)}
                  </PrimaryButton>
                ),
              }
            : {})}
        >
          <p>{intl.formatMessage(messages.mfaSetupHiddenHelp)}</p>
        </MfaStatusPanel>
      );
    case "Rejected":
      return (
        <p className="mt-6 text-sm/6 text-gray-900">
          {intl.formatMessage(messages.mfaUriRejected)}
        </p>
      );
    case "None":
      return (
        <p className="mt-6 text-sm/6 text-gray-900">
          {intl.formatMessage(messages.mfaSetupNotShown)}
        </p>
      );
    default:
      return assertNever(setup);
  }
}

// Tailwind Plus: Application UI > Forms > Sign-in and Registration > Simple card
// v4/react-light.jsx, library version 2026-09-13-083323: its single-field form
// anatomy with one native input holding the complete code.
function EnrollmentCodeForm({ enabled }: { readonly enabled: boolean }) {
  const intl = useIntl();
  const mfa = useMfaEnrollment();
  const { announce } = useAnnouncer();
  const { activity } = useMfaSnapshot();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localInvalid, submit] = useActionState<boolean, FormData>(
    async (_previous, data) => {
      const entered = data.get("code");
      data.delete("code");
      if (typeof entered !== "string" || !isSixDigitMfaCode(entered)) {
        inputRef.current?.focus();
        announce(
          intl.formatMessage(messages.mfaEnrollCodeLocalInvalid),
          "urgent",
        );
        return true;
      }
      await mfa.verify(entered);
      return false;
    },
    false,
  );
  const rejected =
    (activity.kind === "Settled" || activity.kind === "Reconcile failed") &&
    activity.outcome.kind === "code-invalid";

  // A correctable result keeps the entered value and returns focus to it.
  useLayoutEffect(() => {
    if (activity.kind === "Settled" && activity.outcome.kind === "code-invalid")
      inputRef.current?.focus();
  }, [activity]);

  return (
    <form
      action={submit}
      onReset={(event) => event.preventDefault()}
      className="mt-6 space-y-6"
    >
      <div>
        <label
          htmlFor="mfa-enrollment-code"
          className="block text-sm/6 font-medium text-gray-900"
        >
          {intl.formatMessage(messages.mfaEnrollCodeLabel)}
        </label>
        <p
          id="mfa-enrollment-code-help"
          className="mt-1 text-sm/6 text-gray-600"
        >
          {intl.formatMessage(messages.mfaEnrollCodeHelp)}
        </p>
        <div className="mt-2">
          <input
            ref={inputRef}
            id="mfa-enrollment-code"
            name="code"
            type="text"
            autoComplete="one-time-code"
            inputMode="numeric"
            dir="ltr"
            required
            readOnly={!enabled}
            aria-disabled={!enabled}
            aria-invalid={localInvalid || rejected}
            aria-describedby={
              localInvalid
                ? "mfa-enrollment-code-help mfa-enrollment-code-error"
                : rejected
                  ? "mfa-enrollment-code-help mfa-activity-outcome"
                  : "mfa-enrollment-code-help"
            }
            className="block w-full rounded-md bg-white px-3 py-1.5 text-base tracking-widest text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
          />
        </div>
        {localInvalid ? (
          <p
            id="mfa-enrollment-code-error"
            className="mt-2 text-sm/6 text-red-600"
          >
            {intl.formatMessage(messages.mfaEnrollCodeLocalInvalid)}
          </p>
        ) : null}
      </div>
      <AuthSubmitButton
        enabled={enabled}
        label={intl.formatMessage(messages.mfaVerifySubmit)}
      />
    </form>
  );
}

function assertNever(value: never): never {
  throw new Error(`Unhandled MFA setup view: ${String(value)}`);
}
