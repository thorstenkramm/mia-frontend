import { useActionState, useRef, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { useIntl } from "react-intl";
import type { EntryApiFailure } from "../../platform/api/entry";
import {
  createStudentMessage,
  getTutoringSession,
  getTutoringSessionCurrentWork,
  isHiddenTutoringFailure,
  type StudentMessageProjection,
  type TutorResponseState,
  type TutoringSessionId,
  type TutoringWork,
} from "../../platform/api/tutoringSessions";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import { useUnsavedInputGuard } from "../../platform/ui/routeDeparture";

// This hook rhymes with useTutoringSessionBegin by contract, not by shared
// ownership: machine 5's workspace-send owner and machine 2's begin-chain
// owner are separate state machines (FRONTEND-STATE-MACHINES.md), so their
// similar transition code is the documented false positive. The jscpd
// markers below live on this side; useTutoringSessionBegin carries a
// cross-reference note.
// jscpd:ignore-start
type Feedback = (typeof messages)[keyof typeof messages];
type Settled = {
  readonly kind: "Ready" | "Rejected" | "Outcome unknown";
  readonly feedback: Feedback | null;
  readonly error: EntryApiFailure | null;
  // Authoritative reconciliation ran without finding the attempt committed;
  // only then may Retry exact attempt or Abandon unknown attempt be offered.
  readonly reconciled: boolean;
};
type SendState =
  | Settled
  | { readonly kind: "Checking" | "Sending" }
  // 409 tutoring_invalid_state: the session is completed; the workspace shows
  // the fixed read-only finished truth.
  | { readonly kind: "Finished" }
  | { readonly kind: "Reconciling"; readonly previous: Settled };
// jscpd:ignore-end
const ready: Settled = {
  kind: "Ready",
  feedback: null,
  error: null,
  reconciled: false,
};
type Retained = {
  readonly messageRequestId: string;
  readonly content: string;
  readonly conflicted: boolean;
};

// Machine-5 work updates the workspace installs: an authoritative work read,
// the definitive committed message from the mutation document (rendered even
// when the follow-up read fails), or the follow-up read's failure (the
// committed message still renders; the composer stays covered until explicit
// Refresh — criterion 7).
export type SendWorkUpdate =
  | { readonly kind: "work"; readonly work: TutoringWork }
  | { readonly kind: "committed"; readonly message: StudentMessageProjection }
  | { readonly kind: "unknown" };

// FRONTEND-STATE-MACHINES.md machines 2 and 5 for the workspace send: one
// request-ID-bound immutable payload against the known session, dispatched at
// most once per attempt, never replayed automatically. After a definitive
// 200/201 (D9) exactly one current-work follow-up read (D4) refreshes the
// authoritative work state and composer enablement. Outcome unknown
// reconciles explicitly through the current-work read with the retained
// message request ID; Retry exact attempt re-sends the same ID and content
// only after fresh session/work checks; Abandon destroys the retained attempt
// locally and never resends.
export function useStudentMessageSend({
  session,
  work,
  settle,
  unavailable,
  hasContent,
}: {
  readonly session: TutoringSessionId;
  // The latest admitted/refreshed authoritative work; server-authored actions
  // alone enable the composer (never transcript inference).
  readonly work: TutoringWork;
  readonly settle: (update: SendWorkUpdate) => void;
  readonly unavailable: (failure: EntryApiFailure) => void;
  readonly hasContent: boolean;
}) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { readAuthenticated, runAuthenticatedMutation } = useSessionActions();
  const { state, stateRef, mounted, update } =
    useRouteActivity<SendState>(ready);
  const attempt = useRef<symbol | null>(null);
  const retained = useRef<Retained | null>(null);
  const resourceActive = useRef(true);
  const status = useRef<HTMLHeadingElement>(null);
  // AC-013 seed: "Message queued" is announced politely exactly once per
  // response ID for this page's lifetime.
  const announcedQueued = useRef<ReadonlySet<string>>(new Set());
  const current = (id: symbol) =>
    mounted.current && resourceActive.current && attempt.current === id;
  // Machine-5/machine-2 separate-ownership rhyme (see the header note).
  // jscpd:ignore-start
  const hidden = (failure: EntryApiFailure) => {
    if (
      !mounted.current ||
      !resourceActive.current ||
      !isHiddenTutoringFailure(failure)
    )
      return false;
    resourceActive.current = false;
    attempt.current = null;
    retained.current = null;
    unavailable(failure);
    return true;
  };
  const feedback = (
    kind: Settled["kind"],
    message: Feedback,
    error: EntryApiFailure | null,
    reconciled = false,
  ) => {
    flushSync(() => update({ kind, feedback: message, error, reconciled }));
    announce(intl.formatMessage(message), "urgent");
  };
  // jscpd:ignore-end
  const announceQueued = (responseId: string, state: TutorResponseState) => {
    if (state !== "queued" || announcedQueued.current.has(responseId)) return;
    announcedQueued.current = new Set(announcedQueued.current).add(responseId);
    announce(intl.formatMessage(messages.tutoringMessageQueued), "polite");
  };
  const finish = () => {
    attempt.current = null;
    retained.current = null;
    flushSync(() => update({ kind: "Finished" }));
    announce(intl.formatMessage(messages.tutoringSessionFinished), "urgent");
  };
  // The definitive committed presentation: the mutation document's message is
  // authoritative and renders even when the D4 follow-up read fails.
  const committed = (message: StudentMessageProjection) => {
    settle({ kind: "committed", message });
    announceQueued(message.response.id, message.response.state);
  };
  const settleSend = async (
    id: symbol,
    messageRequestId: string,
    content: string,
  ): Promise<void> => {
    // Machine-5/machine-2 separate-ownership rhyme (see the header note).
    // jscpd:ignore-start
    const result = await runAuthenticatedMutation(
      {
        send: (csrf) => {
          flushSync(() => update({ kind: "Sending" }));
          announce(intl.formatMessage(messages.tutoringSending));
          return createStudentMessage(session, content, messageRequestId, csrf);
        },
      },
      () => current(id),
    );
    // jscpd:ignore-end
    // Applicable denial is terminal even for a locally retired attempt.
    if (result.kind === "rejected" && hidden(result.failure)) return;
    if (!current(id)) return;
    if (result.kind === "completed") {
      attempt.current = null;
      retained.current = null;
      committed(result.value);
      // D4: exactly one immediate current-work follow-up read refreshes the
      // authoritative work state and composer enablement. It is the mutation
      // document's documented reconciliation purpose, constructed locally
      // from trusted branded IDs; never a poll or keepalive.
      const followUp = await readAuthenticated((signal) =>
        getTutoringSessionCurrentWork(session, {}, signal),
      );
      if (!mounted.current || !resourceActive.current) return;
      if (followUp.kind === "completed") {
        settle({ kind: "work", work: followUp.value });
        if (followUp.value.queued !== null)
          announceQueued(
            followUp.value.queued.response.id,
            followUp.value.queued.response.state,
          );
        update(ready);
        return;
      }
      if (followUp.kind === "failed" && hidden(followUp.failure)) return;
      settle({ kind: "unknown" });
      feedback(
        "Ready",
        messages.tutoringWorkUnknown,
        followUp.kind === "failed" ? followUp.failure : null,
      );
      return;
    }
    if (result.kind === "unknown") {
      attempt.current = null;
      // The ID and bound text stay retained for reconcile/retry.
      feedback("Outcome unknown", messages.tutoringSendUnknown, result.failure);
      return;
    }
    if (result.kind === "superseded") return;
    if (result.kind === "not-sent") {
      attempt.current = null;
      retained.current = null;
      feedback("Rejected", messages.tutoringSendRejected, result.failure);
      return;
    }
    const { status: httpStatus } = result.failure.disclosure;
    const code = result.failure.code;
    if (httpStatus === 409 && code === "tutoring_invalid_state") {
      finish();
      return;
    }
    if (httpStatus === 409 && code === "tutoring_work_busy") {
      // Slot lost: the draft stays in the composer; only an explicit Refresh
      // of the current work permits a new attempt.
      attempt.current = null;
      retained.current = null;
      feedback("Rejected", messages.tutoringSendBusy, result.failure);
      return;
    }
    if (httpStatus === 409 && code === "tutoring_request_conflict") {
      // Locked conflict: never resent; explicit reconciliation through the
      // current-work read decides, then only Abandon remains.
      attempt.current = null;
      if (retained.current !== null)
        retained.current = { ...retained.current, conflicted: true };
      feedback(
        "Outcome unknown",
        messages.tutoringSendConflict,
        result.failure,
      );
      return;
    }
    // 422 tutoring_invalid and every other definitive <500 rejection; any
    // later submit mints a fresh request ID.
    // Machine-5/machine-2 separate-ownership rhyme (see the header note).
    // jscpd:ignore-start
    attempt.current = null;
    retained.current = null;
    feedback("Rejected", messages.tutoringSendRejected, result.failure);
  };
  const [, action, pending] = useActionState<void, FormData>(
    async (_previous, formData) => {
      const settled = stateRef.current;
      if (
        !mounted.current ||
        !resourceActive.current ||
        attempt.current !== null ||
        (settled.kind !== "Ready" && settled.kind !== "Rejected")
      )
        return;
      const raw = formData.get("message");
      if (typeof raw !== "string") return;
      const id = Symbol("tutoring-send");
      // jscpd:ignore-end
      attempt.current = id;
      // Mint the canonical lowercase UUID v4 immediately before the single
      // dispatch and bind it to the immutable payload.
      const messageRequestId = crypto.randomUUID();
      retained.current = { messageRequestId, content: raw, conflicted: false };
      await settleSend(id, messageRequestId, raw);
    },
    undefined,
  );

  // Reconcile = the one authoritative current-work read, with the retained
  // message request ID while an attempt is unsettled. It never repeats the
  // unsafe request and never claims the attempt's outcome.
  // Machine-5/machine-2 separate-ownership rhyme (see the header note).
  // jscpd:ignore-start
  const reconcile = async () => {
    const previous = stateRef.current;
    if (
      attempt.current !== null ||
      (previous.kind !== "Ready" &&
        previous.kind !== "Rejected" &&
        previous.kind !== "Outcome unknown")
    )
      return;
    const id = Symbol("tutoring-send-read");
    attempt.current = id;
    update({ kind: "Reconciling", previous });
    const bound = retained.current;
    const result = await readAuthenticated((signal) =>
      getTutoringSessionCurrentWork(
        session,
        bound === null ? {} : { messageRequestId: bound.messageRequestId },
        signal,
      ),
    );
    if (result.kind === "failed" && hidden(result.failure)) return;
    if (!current(id)) return;
    attempt.current = null;
    if (result.kind !== "completed") {
      if (result.kind === "failed")
        feedback(
          previous.kind === "Outcome unknown" ? "Outcome unknown" : "Rejected",
          previous.kind === "Outcome unknown"
            ? messages.tutoringSendUnknown
            : (previous.feedback ?? messages.tutoringSendBusy),
          result.failure,
        );
      return;
    }
    // jscpd:ignore-end
    const workNow = result.value;
    if (workNow.sessionState === "completed" || workNow.state === "completed") {
      finish();
      return;
    }
    settle({ kind: "work", work: workNow });
    if (workNow.queued !== null)
      announceQueued(workNow.queued.response.id, workNow.queued.response.state);
    if (previous.kind === "Outcome unknown") {
      if (workNow.reconciledMessage !== null) {
        // Definitive reconciled-committed: the committed presentation from
        // authoritative state; the attempt record is destroyed.
        retained.current = null;
        committed(workNow.reconciledMessage);
        update(ready);
        return;
      }
      // Authoritative not-committed: Retry exact attempt and Abandon unlock.
      update({ ...previous, error: null, reconciled: true });
      return;
    }
    // Ready/Rejected refresh: server-authored actions alone re-enable.
    update(
      workNow.actions.submit || workNow.actions.queue
        ? ready
        : { ...previous, error: null },
    );
  };
  // Retry exact attempt: only after reconciliation, with the retained ID and
  // content, and only after fresh session/work checks pass. A committed
  // result renders instead of resending.
  // Machine-5/machine-2 separate-ownership rhyme (see the header note).
  // jscpd:ignore-start
  const retry = async () => {
    const settled = stateRef.current;
    const bound = retained.current;
    if (
      attempt.current !== null ||
      settled.kind !== "Outcome unknown" ||
      !settled.reconciled ||
      bound === null ||
      bound.conflicted
    )
      return;
    const id = Symbol("tutoring-send-retry");
    // jscpd:ignore-end
    attempt.current = id;
    flushSync(() => update({ kind: "Checking" }));
    announce(intl.formatMessage(messages.tutoringChecking));
    const check = await readAuthenticated(async (signal) => ({
      session: await getTutoringSession(session, signal),
      work: await getTutoringSessionCurrentWork(
        session,
        { messageRequestId: bound.messageRequestId },
        signal,
      ),
    }));
    if (check.kind === "failed" && hidden(check.failure)) return;
    if (!current(id)) return;
    if (check.kind !== "completed") {
      attempt.current = null;
      if (check.kind === "failed")
        feedback(
          "Outcome unknown",
          messages.tutoringSendUnknown,
          check.failure,
        );
      return;
    }
    if (check.value.session.state !== "active") {
      finish();
      return;
    }
    const workNow = check.value.work;
    if (workNow.sessionState === "completed" || workNow.state === "completed") {
      finish();
      return;
    }
    settle({ kind: "work", work: workNow });
    if (workNow.reconciledMessage !== null) {
      // The fresh check proves the attempt committed; never resent.
      retained.current = null;
      committed(workNow.reconciledMessage);
      update(ready);
      return;
    }
    if (!workNow.actions.submit && !workNow.actions.queue) {
      attempt.current = null;
      retained.current = null;
      feedback("Rejected", messages.tutoringSendBusy, null);
      return;
    }
    await settleSend(id, bound.messageRequestId, bound.content);
  };
  const stop = () => {
    const previous = stateRef.current;
    attempt.current = null;
    if (previous.kind === "Sending")
      feedback("Outcome unknown", messages.tutoringSendUnknown, null);
    else if (previous.kind === "Checking")
      // A stopped retry was never dispatched; its unknown outcome and
      // retained ID stay as reconciled.
      update({
        kind: "Outcome unknown",
        feedback: messages.tutoringSendUnknown,
        error: null,
        reconciled: true,
      });
    else if (previous.kind === "Reconciling") update(previous.previous);
  };
  const abandon = () => {
    const before = stateRef.current;
    if (
      pending ||
      before.kind !== "Outcome unknown" ||
      !before.reconciled ||
      retained.current === null
    )
      return;
    // Local abandonment only: the ID and payload are destroyed, never resent.
    retained.current = null;
    feedback("Rejected", messages.tutoringSendAbandoned, null);
  };
  const unknown =
    state.kind === "Outcome unknown" ||
    (state.kind === "Reconciling" && state.previous.kind === "Outcome unknown");
  const departure = useUnsavedInputGuard({
    dirty: pending || unknown || state.kind === "Sending" || hasContent,
    clear: () => {
      resourceActive.current = false;
      attempt.current = null;
      retained.current = null;
    },
    stayTarget: status,
  });
  // Machine-5/machine-2 separate-ownership rhyme (see the header note).
  // jscpd:ignore-start
  const settled =
    state.kind === "Reconciling"
      ? state.previous
      : state.kind === "Ready" ||
          state.kind === "Rejected" ||
          state.kind === "Outcome unknown"
        ? state
        : null;
  // jscpd:ignore-end
  const attemptDirty = pending || unknown || state.kind === "Sending";
  return {
    guardSubmit: (event: FormEvent<HTMLFormElement>) => {
      const settledNow = stateRef.current;
      if (
        pending ||
        attempt.current !== null ||
        (settledNow.kind !== "Ready" && settledNow.kind !== "Rejected") ||
        (!work.actions.submit && !work.actions.queue)
      )
        event.preventDefault();
    },
    state,
    status,
    action,
    pending,
    unknown,
    attemptDirty,
    departure,
    stop,
    reconcile,
    retry,
    abandon,
    finished: state.kind === "Finished",
    enabled:
      !pending &&
      (state.kind === "Ready" || state.kind === "Rejected") &&
      (work.actions.submit || work.actions.queue),
    feedback: settled?.feedback ?? null,
    error: settled?.error ?? null,
    canRetry:
      !pending &&
      state.kind === "Outcome unknown" &&
      state.reconciled &&
      retained.current !== null &&
      !retained.current.conflicted,
    canAbandon:
      !pending &&
      state.kind === "Outcome unknown" &&
      state.reconciled &&
      retained.current !== null,
  };
}
