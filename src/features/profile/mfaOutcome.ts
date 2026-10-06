import { useSyncExternalStore } from "react";
import type { EntryApiFailure } from "../../platform/api/entry";
import type { MfaState } from "../../platform/api/mfa";
import { useMfaEnrollment } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import type {
  MfaActivity,
  MfaEnrollmentSnapshot,
  MfaOutcome,
} from "../../platform/session/mfaEnrollment";

type Message = (typeof messages)[keyof typeof messages];

export type OutcomeView = {
  readonly message: Message;
  readonly problem: boolean;
  readonly error: EntryApiFailure | null;
};

export function useMfaSnapshot(): MfaEnrollmentSnapshot {
  const mfa = useMfaEnrollment();
  return useSyncExternalStore(mfa.subscribe, mfa.getSnapshot, mfa.getSnapshot);
}

export function isBusy(activity: MfaActivity): boolean {
  return (
    activity.kind === "Starting" ||
    activity.kind === "Verifying" ||
    activity.kind === "Cancelling" ||
    activity.kind === "Reconciling"
  );
}

export function progressMessage(activity: MfaActivity): Message | null {
  switch (activity.kind) {
    case "Starting":
      return messages.mfaStarting;
    case "Verifying":
      return messages.mfaVerifying;
    case "Cancelling":
      return messages.mfaCancelling;
    case "Reconciling":
      return messages.mfaStatusReconciling;
    case "Idle":
    case "Settled":
    case "Reconcile failed":
      return null;
    default:
      return assertNever(activity);
  }
}

// Owner decision 6: an ambiguous or rejected attempt is described only by the
// authoritative state its reconciliation read returned.
export function outcomeView(outcome: MfaOutcome, state: MfaState): OutcomeView {
  const resolution =
    state.pendingEnrollment !== null
      ? "pending"
      : state.activeFactor !== null
        ? "active"
        : "gone";
  const afterAttempt = (pending: Message): Message =>
    resolution === "pending"
      ? pending
      : resolution === "active"
        ? messages.mfaCodesLost
        : messages.mfaSetupGone;
  switch (outcome.kind) {
    case "start-rejected":
      return problem(messages.mfaStartRejected, outcome.error);
    case "start-throttled":
    case "verify-throttled":
      return problem(messages.mfaSettingsThrottled, outcome.error);
    case "start-not-sent":
    case "verify-not-sent":
    case "cancel-not-sent":
      return problem(messages.mfaNotSent, outcome.error);
    case "start-unknown":
      return problem(
        resolution === "gone"
          ? messages.mfaStartUnknownNone
          : messages.mfaStartUnknownPending,
        outcome.error,
      );
    case "pending-exists":
      return problem(messages.mfaPendingExists, null);
    case "uri-rejected":
      return problem(messages.mfaUriRejected, null);
    case "codes-lost":
      return problem(messages.mfaCodesLost, null);
    case "code-invalid":
      return problem(afterAttempt(messages.mfaCodeInvalid), outcome.error);
    case "verify-unknown":
      return problem(
        afterAttempt(messages.mfaVerifyUnknownPending),
        outcome.error,
      );
    case "verify-rejected":
      return problem(messages.mfaVerifyRejected, outcome.error);
    case "cancelled":
      return { message: messages.mfaCancelled, problem: false, error: null };
    case "cancel-rejected":
      return resolution === "pending"
        ? problem(messages.mfaCancelRejected, outcome.error)
        : problem(messages.mfaCancelGone, outcome.error);
    case "cancel-unknown":
      return resolution === "pending"
        ? problem(messages.mfaCancelUnknownPending, outcome.error)
        : problem(messages.mfaCancelUnknownGone, outcome.error);
    default:
      return assertNever(outcome);
  }
}

function problem(message: Message, error: EntryApiFailure | null): OutcomeView {
  return { message, problem: true, error };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled MFA outcome: ${String(value)}`);
}
