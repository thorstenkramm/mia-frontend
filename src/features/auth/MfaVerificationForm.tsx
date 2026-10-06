// Tailwind Plus: Application UI > Forms > Sign-in and Registration > Simple card
// Library version: 2026-09-13-083323, v4 React light. MIA keeps the blueprint's
// single-field form anatomy and adds method-neutral MFA outcomes and route switching.
import { useActionState, useLayoutEffect, useRef } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import {
  useAuthenticationBootstrapState,
  useSessionActions,
} from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import type { MfaRoute } from "../../platform/session/sessionController";
import { AuthSubmitButton } from "../../platform/ui/AuthSubmitButton";
import {
  isSixDigitMfaCode,
  normalizeRecoveryCode,
} from "../../platform/ui/mfaCodes";

type LocalResult = "invalid" | null;

export function MfaVerificationForm({ route }: { readonly route: MfaRoute }) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const navigate = useNavigate();
  const state = useAuthenticationBootstrapState();
  const { recheckMfa, selectMfaRoute, submitMfa } = useSessionActions();
  const inputRef = useRef<HTMLInputElement>(null);
  const recheckRef = useRef<HTMLButtonElement>(null);
  const outcome = state.kind === "MFA required" ? state.outcome : undefined;
  const rotating = state.kind === "Rotating" && state.origin === "mfa";
  const enabled =
    state.kind === "MFA required" &&
    state.route === route &&
    outcome?.kind !== "expired";
  const [localResult, submit] = useActionState<LocalResult, FormData>(
    async (_previous, data) => {
      const entered = data.get("code");
      data.delete("code");
      if (typeof entered !== "string") return "invalid";
      const wireCode =
        route === "challenge"
          ? isSixDigitMfaCode(entered)
            ? entered
            : null
          : normalizeRecoveryCode(entered);
      if (wireCode === null) {
        inputRef.current?.focus();
        return "invalid";
      }
      await submitMfa(route, wireCode);
      return null;
    },
    null,
  );

  useLayoutEffect(() => {
    if (state.kind === "MFA required" && state.outcome !== undefined) {
      if (state.outcome.kind === "expired")
        announce(intl.formatMessage(messages.mfaExpired), "urgent");
      else inputRef.current?.focus();
    }
    if (
      state.kind === "Rotating" &&
      state.origin === "mfa" &&
      state.phase === "reconciliation failed"
    )
      recheckRef.current?.focus();
  }, [announce, intl, state]);

  const error = rotating ? state.error : outcome?.error;
  const wait =
    outcome?.kind === "throttled" && error?.kind === "http"
      ? error.retryAfterSeconds
      : null;
  const statusMessage = rotating
    ? state.phase === "submitting"
      ? messages.mfaSubmitting
      : state.phase === "reconciling"
        ? messages.mfaReconciling
        : messages.mfaRecheckNeeded
    : localResult === "invalid"
      ? route === "challenge"
        ? messages.mfaLocalInvalid
        : messages.mfaRecoveryLocalInvalid
      : outcome
        ? outcomeMessage(outcome.kind, route)
        : null;

  function switchRoute(next: MfaRoute): void {
    if (!enabled) return;
    selectMfaRoute(next);
    navigate(next === "challenge" ? "/auth/mfa" : "/auth/mfa/recovery");
  }

  if (outcome?.kind === "expired") {
    return (
      <div className="mt-8 space-y-6">
        <p className="text-sm/6 text-gray-900">
          {intl.formatMessage(messages.mfaExpired)}
        </p>
        <TechnicalErrorDisclosure error={outcome.error} />
      </div>
    );
  }

  return (
    <>
      <form
        action={submit}
        onReset={(event) => event.preventDefault()}
        className="mt-8 space-y-6"
      >
        <div>
          <label
            htmlFor="mfa-code"
            className="block text-sm/6 font-medium text-gray-900"
          >
            {intl.formatMessage(
              route === "challenge"
                ? messages.mfaCodeLabel
                : messages.mfaRecoveryCodeLabel,
            )}
          </label>
          <p id="mfa-code-help" className="mt-1 text-sm/6 text-gray-600">
            {intl.formatMessage(
              route === "challenge"
                ? messages.mfaCodeHelp
                : messages.mfaRecoveryCodeHelp,
            )}
          </p>
          <div className="mt-2">
            <input
              ref={inputRef}
              id="mfa-code"
              name="code"
              type="text"
              {...(route === "challenge"
                ? {
                    autoComplete: "one-time-code",
                    inputMode: "numeric" as const,
                  }
                : {})}
              dir="ltr"
              required
              readOnly={!enabled}
              aria-disabled={!enabled}
              aria-invalid={
                localResult === "invalid" || outcome?.kind === "invalid-code"
              }
              aria-describedby="mfa-code-help mfa-status"
              className="block w-full rounded-md bg-white px-3 py-1.5 text-base tracking-widest text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
            />
          </div>
        </div>
        <AuthSubmitButton
          enabled={enabled}
          label={intl.formatMessage(
            route === "challenge"
              ? messages.mfaSubmit
              : messages.mfaRecoverySubmit,
          )}
        />
        <p
          id="mfa-status"
          role={
            localResult ||
            outcome ||
            (rotating && state.phase === "reconciliation failed")
              ? "alert"
              : "status"
          }
          aria-atomic="true"
          className="text-sm/6 text-gray-900"
        >
          {statusMessage ? intl.formatMessage(statusMessage) : null}
          {wait !== null
            ? ` ${intl.formatMessage(messages.mfaWait, { seconds: wait })}`
            : null}
        </p>
        {error ? <TechnicalErrorDisclosure error={error} /> : null}
        {rotating && state.reconciliationError ? (
          <TechnicalErrorDisclosure error={state.reconciliationError} />
        ) : null}
        {rotating && state.phase === "reconciliation failed" ? (
          <button
            ref={recheckRef}
            type="button"
            onClick={() => void recheckMfa()}
            className="min-h-6 text-sm/6 font-semibold text-indigo-600 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {intl.formatMessage(messages.mfaRecheck)}
          </button>
        ) : null}
      </form>
      {outcome?.kind !== "expired" ? (
        <button
          type="button"
          aria-disabled={!enabled}
          onClick={() =>
            switchRoute(route === "challenge" ? "recovery" : "challenge")
          }
          className="mt-6 min-h-6 text-sm/6 font-semibold text-indigo-600 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {intl.formatMessage(
            route === "challenge"
              ? messages.mfaUseRecovery
              : messages.mfaUseVerification,
          )}
        </button>
      ) : null}
    </>
  );
}

function outcomeMessage(
  kind:
    | "step-used"
    | "invalid-code"
    | "throttled"
    | "failed"
    | "unconfirmed"
    | "expired",
  route: MfaRoute,
) {
  switch (kind) {
    case "step-used":
      return messages.mfaStepUsed;
    case "invalid-code":
      return route === "challenge"
        ? messages.mfaInvalidCode
        : messages.mfaInvalidRecoveryCode;
    case "throttled":
      return messages.mfaThrottled;
    case "failed":
      return messages.mfaFailed;
    case "unconfirmed":
      return messages.mfaUnconfirmed;
    case "expired":
      return messages.mfaExpired;
    default:
      return assertNever(kind);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled MFA outcome: ${String(value)}`);
}
