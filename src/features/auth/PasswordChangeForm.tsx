// Tailwind Plus: Application UI > Forms > Sign-in and Registration > Simple card
// Library version: 2026-09-13-083323, v4 React light. MIA keeps the card's two
// password fields (NewPasswordFields), adds outcome disclosure and safe recheck,
// and omits branding, social, and remember-me.
import { useLayoutEffect, useRef } from "react";
import { useIntl } from "react-intl";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import {
  useAuthenticationBootstrapState,
  useSessionActions,
  type AuthenticationBootstrapState,
} from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { NewPasswordForm, useNewPasswordCheck } from "./NewPasswordFields";

const outcomeMessages = {
  rejected: messages.passwordChangeRejected,
  throttled: messages.passwordChangeThrottled,
  failed: messages.passwordChangeFailed,
  unconfirmed: messages.passwordChangeUnconfirmed,
};

export function PasswordChangeForm() {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const state = useAuthenticationBootstrapState();
  const announcedState = useRef<AuthenticationBootstrapState | null>(null);
  const { recheckPasswordChange, submitPasswordChange } = useSessionActions();
  const check = useNewPasswordCheck();
  const { problems, passwordRef } = check;
  const recheckRef = useRef<HTMLButtonElement>(null);
  const recheckHeldFocus = useRef(false);
  const rotating =
    state.kind === "Rotating" && state.origin === "password-change";
  const enabled = state.kind === "Password change";
  const outcome = state.kind === "Password change" ? state.outcome : undefined;

  // Backend transitions never move a surviving focus owner. Focus moves only
  // when the recheck action that held it was removed by the recovered state.
  // Each authoritative transition is announced once through the shared owner.
  useLayoutEffect(() => {
    if (announcedState.current === state) return;
    const initial = announcedState.current === null;
    announcedState.current = state;
    if (initial) return;
    if (recheckHeldFocus.current && recheckRef.current === null) {
      recheckHeldFocus.current = false;
      passwordRef.current?.focus();
    }
    const status = transitionStatus(state);
    if (status !== null)
      announce(
        statusText(intl, status),
        status.priority === "polite" ? "polite" : "urgent",
      );
  }, [announce, intl, passwordRef, state]);

  async function submit(data: FormData): Promise<void> {
    const password = data.get("password");
    const confirmation = data.get("password_confirmation");
    data.delete("password");
    data.delete("password_confirmation");
    if (typeof password === "string" && typeof confirmation === "string")
      await submitPasswordChange(password, confirmation);
  }

  const error = rotating ? state.error : outcome?.error;
  const status = problems === null ? transitionStatus(state) : null;

  return (
    <NewPasswordForm
      action={submit}
      check={check}
      enabled={enabled}
      rejectedBy={
        outcome?.kind === "rejected" ? "password-change-status" : null
      }
      className="mt-8 space-y-6"
    >
      <AuthSubmitButton
        enabled={enabled}
        label={intl.formatMessage(messages.passwordChangeSubmit)}
      />
      {/* Visible status only; the shared announcement owner speaks transitions. */}
      <p id="password-change-status" className="text-sm/6 text-gray-900">
        {status === null ? null : statusText(intl, status)}
      </p>
      {error && problems === null ? (
        <TechnicalErrorDisclosure error={error} />
      ) : null}
      {rotating && state.reconciliationError ? (
        <TechnicalErrorDisclosure error={state.reconciliationError} />
      ) : null}
      {/* The recheck stays mounted while its read runs so it keeps focus. */}
      {rotating && state.phase !== "submitting" ? (
        <button
          ref={recheckRef}
          type="button"
          aria-disabled={state.phase === "reconciling"}
          onFocus={() => {
            recheckHeldFocus.current = true;
          }}
          onBlur={(event) => {
            // Removal blurs with no destination; a deliberate move has one.
            if (event.relatedTarget !== null) recheckHeldFocus.current = false;
          }}
          onClick={() => {
            if (state.phase === "reconciliation failed")
              void recheckPasswordChange();
          }}
          className="min-h-6 text-sm/6 font-semibold text-indigo-600 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {intl.formatMessage(messages.passwordChangeRecheck)}
        </button>
      ) : null}
    </NewPasswordForm>
  );
}

type TransitionStatus = {
  readonly message: (typeof messages)[keyof typeof messages];
  readonly waitSeconds: number | null;
  readonly priority: "polite" | "urgent";
};

function transitionStatus(
  state: AuthenticationBootstrapState,
): TransitionStatus | null {
  if (state.kind === "Rotating" && state.origin === "password-change") {
    const { phase } = state;
    switch (phase) {
      case "submitting":
        return {
          message: messages.passwordChangeSubmitting,
          waitSeconds: null,
          priority: "polite",
        };
      case "reconciling":
        return {
          message: messages.passwordChangeReconciling,
          waitSeconds: null,
          priority: "polite",
        };
      case "reconciliation failed":
        return {
          message: messages.passwordChangeRecheckNeeded,
          waitSeconds: null,
          priority: "urgent",
        };
      default:
        return assertNever(phase);
    }
  }
  if (state.kind !== "Password change" || state.outcome === undefined)
    return null;
  const { kind, error } = state.outcome;
  return {
    message: outcomeMessages[kind],
    waitSeconds:
      kind === "throttled" && error.kind === "http"
        ? error.retryAfterSeconds
        : null,
    priority: "urgent",
  };
}

function statusText(
  intl: ReturnType<typeof useIntl>,
  status: TransitionStatus,
): string {
  const text = intl.formatMessage(status.message);
  return status.waitSeconds === null
    ? text
    : `${text} ${intl.formatMessage(messages.passwordChangeWait, { seconds: status.waitSeconds })}`;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled password-change phase: ${String(value)}`);
}
