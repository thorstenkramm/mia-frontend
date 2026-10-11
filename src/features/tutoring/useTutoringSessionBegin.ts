import { useActionState, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import {
  getLearnCourse,
  type LearnCourse,
} from "../../platform/api/learnCourses";
import type { EntryApiFailure, MaterialId } from "../../platform/api/entry";
import {
  createStudentMessage,
  createTutoringSession,
  getActiveTutoringSession,
  getTutoringSessionCurrentWork,
  isHiddenTutoringFailure,
  type ActiveTutoringSession,
  type TutoringSession,
  type TutoringSessionId,
} from "../../platform/api/tutoringSessions";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import { useUnsavedInputGuard } from "../../platform/ui/routeDeparture";

type Feedback = (typeof messages)[keyof typeof messages];
type Settled = {
  readonly kind: "Ready" | "Rejected" | "Outcome unknown";
  readonly feedback: Feedback | null;
  readonly error: EntryApiFailure | null;
  // Authoritative reconciliation ran without finding the attempt committed;
  // only then may Retry exact attempt or Abandon unknown attempt be offered.
  readonly reconciled: boolean;
};
type BeginState =
  | Settled
  | { readonly kind: "Checking" | "Starting" | "Sending" }
  | { readonly kind: "Active session"; readonly session: ActiveTutoringSession }
  | { readonly kind: "Reconciling"; readonly previous: Settled };
const ready: Settled = {
  kind: "Ready",
  feedback: null,
  error: null,
  reconciled: false,
};
// The immutable attempt record. The create request ID lives only until its
// definitive settlement; the created session, message request ID and bound
// content survive a create success so an exact retry re-sends only the
// message (D3). `conflicted` suppresses Retry after a 409 request conflict.
type Retained = {
  readonly createRequestId: string | null;
  readonly session: TutoringSession | null;
  readonly messageRequestId: string | null;
  readonly content: string | null;
  readonly conflicted: boolean;
};
const emptyRetained: Retained = {
  createRequestId: null,
  session: null,
  messageRequestId: null,
  content: null,
  conflicted: false,
};

// FRONTEND-STATE-MACHINES.md machine 2 for the Story 6.2 begin chain: two
// request-ID-bound attempts — session creation, then the first message send
// only after definitive create success. Each is dispatched at most once per
// attempt, its ID minted after fresh course/discovery checks immediately
// before dispatch and held in page memory only. No automatic replay: create
// ambiguity reconciles through the one authoritative discovery read (6.1),
// send ambiguity through the BCG-012 current-work read with the retained
// message request ID; the workspace is entered only after definitive send
// success or definitive reconciled-committed.
// Machine-5's workspace-send owner (useStudentMessageSend) rhymes with this
// hook by contract; the jscpd markers for that pair live there.
export function useTutoringSessionBegin(
  initial: LearnCourse,
  // The hook preamble rhymes with useCourseActivation by contract, not by
  // shared ownership: machine 2's begin owner and machine 12's activation
  // owner are separate state machines, and the architecture rule bars
  // features/tutoring importing features/courses. jscpd markers are
  // line-based and the matched range begins mid-signature, so the ignore
  // covers the declaration head through the route-activity binding.
  // jscpd:ignore-start
  material: MaterialId | null,
  workspace: (session: TutoringSessionId) => string,
  unavailable: (failure: EntryApiFailure) => void,
  hasContent: boolean,
) {
  const intl = useIntl();
  const navigate = useNavigate();
  const { announce } = useAnnouncer();
  const { readAuthenticated, runAuthenticatedMutation } = useSessionActions();
  const [applied, setApplied] = useState(initial);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const { state, stateRef, mounted, update } =
    useRouteActivity<BeginState>(ready);
  // jscpd:ignore-end
  const attempt = useRef<symbol | null>(null);
  const retained = useRef<Retained>(emptyRetained);
  const resourceActive = useRef(true);
  const status = useRef<HTMLHeadingElement>(null);
  const current = (id: symbol) =>
    mounted.current && resourceActive.current && attempt.current === id;
  const hidden = (failure: EntryApiFailure) => {
    if (
      !mounted.current ||
      !resourceActive.current ||
      !isHiddenTutoringFailure(failure)
    )
      return false;
    // The hidden/feedback settlement rhymes with useCourseActivation for the
    // same separate-ownership reason stated at the declaration head above.
    // jscpd:ignore-start
    resourceActive.current = false;
    attempt.current = null;
    retained.current = emptyRetained;
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
  const resume = (session: ActiveTutoringSession) => {
    attempt.current = null;
    retained.current = emptyRetained;
    flushSync(() => update({ kind: "Active session", session }));
    announce(
      intl.formatMessage(messages.tutoringResumeActive, {
        course: session.courseName,
      }),
      "urgent",
    );
  };
  // The fresh pre-dispatch (or pre-retry) course re-read plus BCG-002
  // discovery. In the send phase the discovered session must be the one this
  // chain created. Returns true only when a dispatch may follow immediately.
  const checkFresh = async (
    id: symbol,
    retrying: boolean,
  ): Promise<boolean> => {
    flushSync(() => update({ kind: "Checking" }));
    announce(intl.formatMessage(messages.tutoringChecking));
    const result = await readAuthenticated(async (signal) => ({
      course: await getLearnCourse(initial.id, signal),
      active: await getActiveTutoringSession(signal),
    }));
    if (result.kind === "failed" && hidden(result.failure)) return false;
    if (!current(id)) return false;
    const sending = retained.current.session !== null;
    if (result.kind !== "completed") {
      attempt.current = null;
      // A failed read retires only the attempt symbol; a retained unknown
      // attempt keeps its IDs and returns to its unreconciled unknown state.
      if (result.kind === "failed")
        feedback(
          retrying ? "Outcome unknown" : "Rejected",
          retrying
            ? sending
              ? messages.tutoringSendUnknown
              : messages.tutoringStartUnknown
            : sending
              ? messages.tutoringSessionReady
              : messages.tutoringStartRejected,
          result.failure,
        );
      return false;
    }
    const { course, active } = result.value;
    if (active !== null) {
      if (sending && active.id === retained.current.session?.id) {
        // Our own created session is the one active session: proceed.
      } else {
        resume(active);
        return false;
      }
    }
    if (course !== null) {
      setApplied(course);
      setCheckedAt(Date.now());
    }
    if (course === null || !course.newSession.eligible) {
      attempt.current = null;
      retained.current = emptyRetained;
      feedback("Rejected", messages.tutoringStartChanged, null);
      return false;
    }
    if (sending && active === null) {
      // The created session no longer reads as active; the current truth
      // returns through the workspace after a fresh admission.
      attempt.current = null;
      retained.current = emptyRetained;
      feedback("Rejected", messages.tutoringStartChanged, null);
      return false;
    }
    return true;
  };
  // 409 tutoring_invalid_state ends either phase the same way: the session
  // completed mid-attempt; the current truth returns through explicit
  // Refresh. Returns true when the failure was that definitive rejection.
  const rejectCompletedState = (
    failure: Extract<EntryApiFailure, { readonly kind: "http" }>,
  ): boolean => {
    if (
      failure.disclosure.status !== 409 ||
      failure.code !== "tutoring_invalid_state"
    )
      return false;
    attempt.current = null;
    retained.current = emptyRetained;
    feedback("Rejected", messages.tutoringStartChanged, failure);
    return true;
  };
  // Returns true only on definitive create success, when the send may follow.
  const settleCreate = async (
    id: symbol,
    createRequestId: string,
  ): Promise<boolean> => {
    const result = await runAuthenticatedMutation(
      {
        send: (csrf) => {
          flushSync(() => update({ kind: "Starting" }));
          return createTutoringSession(
            initial.id,
            material,
            createRequestId,
            csrf,
          );
        },
      },
      () => current(id),
    );
    // Applicable denial is terminal even for a locally retired attempt.
    if (result.kind === "rejected" && hidden(result.failure)) return false;
    if (!current(id)) return false;
    if (result.kind === "completed") {
      retained.current = {
        ...retained.current,
        createRequestId: null,
        session: result.value,
      };
      return true;
    }
    if (result.kind === "unknown") {
      attempt.current = null;
      // The create ID and payload stay bound for an explicit exact retry.
      feedback(
        "Outcome unknown",
        messages.tutoringStartUnknown,
        result.failure,
      );
      return false;
    }
    if (result.kind === "superseded") return false;
    if (result.kind === "not-sent") {
      attempt.current = null;
      retained.current = emptyRetained;
      feedback("Rejected", messages.tutoringStartRejected, result.failure);
      return false;
    }
    // Definitive HTTP rejection.
    if (rejectCompletedState(result.failure)) return false;
    const { status: httpStatus } = result.failure.disclosure;
    const code = result.failure.code;
    if (
      httpStatus === 409 &&
      (code === "tutoring_active_session" ||
        code === "tutoring_request_conflict")
    ) {
      // One discovery read under the live attempt, then resume what exists;
      // never a second session. The attempt retires only after the read.
      const discovery = await readAuthenticated((signal) =>
        getActiveTutoringSession(signal),
      );
      if (discovery.kind === "failed" && hidden(discovery.failure))
        return false;
      if (!current(id)) return false;
      attempt.current = null;
      retained.current = emptyRetained;
      if (discovery.kind === "completed" && discovery.value !== null) {
        resume(discovery.value);
        return false;
      }
      feedback(
        "Rejected",
        discovery.kind === "completed"
          ? messages.tutoringStartChanged
          : messages.tutoringStartConflict,
        discovery.kind === "failed" ? discovery.failure : null,
      );
      return false;
    }
    // 422 tutoring_invalid and every other definitive <500 rejection; any
    // later submit mints fresh request IDs.
    attempt.current = null;
    retained.current = emptyRetained;
    feedback("Rejected", messages.tutoringStartRejected, result.failure);
    return false;
  };
  const settleSend = async (
    id: symbol,
    session: TutoringSession,
    messageRequestId: string,
    content: string,
  ): Promise<void> => {
    const result = await runAuthenticatedMutation(
      {
        send: (csrf) => {
          flushSync(() => update({ kind: "Sending" }));
          announce(intl.formatMessage(messages.tutoringSending));
          return createStudentMessage(
            session.id,
            content,
            messageRequestId,
            csrf,
          );
        },
      },
      () => current(id),
    );
    if (result.kind === "rejected" && hidden(result.failure)) return;
    if (!current(id)) return;
    if (result.kind === "completed") {
      // 200 and 201 are the same definitive success (D9): enter the workspace
      // by the created session's identity, never surfacing the distinction.
      attempt.current = null;
      retained.current = emptyRetained;
      void navigate(workspace(session.id));
      return;
    }
    if (result.kind === "unknown") {
      attempt.current = null;
      // The message ID and bound text stay retained for reconcile/retry.
      feedback("Outcome unknown", messages.tutoringSendUnknown, result.failure);
      return;
    }
    if (result.kind === "superseded") return;
    const clearSend = {
      ...retained.current,
      messageRequestId: null,
      content: null,
      conflicted: false,
    };
    if (result.kind === "not-sent") {
      attempt.current = null;
      retained.current = clearSend;
      feedback("Rejected", messages.tutoringSessionReady, result.failure);
      return;
    }
    if (rejectCompletedState(result.failure)) return;
    const { status: httpStatus } = result.failure.disclosure;
    const code = result.failure.code;
    if (httpStatus === 409 && code === "tutoring_work_busy") {
      // Slot lost: the draft stays in the composer; only an explicit Refresh
      // of the current state permits a new attempt.
      attempt.current = null;
      retained.current = clearSend;
      feedback("Rejected", messages.tutoringSendBusy, result.failure);
      return;
    }
    if (httpStatus === 409 && code === "tutoring_request_conflict") {
      // Locked conflict: never resent; explicit reconciliation through the
      // current-work read decides, then only Abandon remains.
      attempt.current = null;
      retained.current = { ...retained.current, conflicted: true };
      feedback(
        "Outcome unknown",
        messages.tutoringSendConflict,
        result.failure,
      );
      return;
    }
    // 422 tutoring_invalid and every other definitive <500 rejection; the
    // created session remains and any later submit mints a fresh message ID.
    attempt.current = null;
    retained.current = clearSend;
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
      const id = Symbol("tutoring-begin");
      attempt.current = id;
      if (!(await checkFresh(id, false))) return;
      if (!current(id)) return;
      if (retained.current.session === null) {
        // Mint the canonical lowercase UUID v4 after fresh checks, immediately
        // before the single dispatch, and bind it to the immutable payload.
        const createRequestId = crypto.randomUUID();
        retained.current = { ...emptyRetained, createRequestId, content: raw };
        if (!(await settleCreate(id, createRequestId))) return;
        if (!current(id)) return;
      }
      const session = retained.current.session;
      if (session === null) return;
      const messageRequestId = crypto.randomUUID();
      retained.current = {
        ...retained.current,
        messageRequestId,
        content: raw,
        conflicted: false,
      };
      await settleSend(id, session, messageRequestId, raw);
    },
    undefined,
  );

  // A failed reconciliation read re-settles the previous state with the
  // phase's own copy; it never claims the attempt's outcome.
  const reconcileFailed = (
    previous: Settled,
    failure: EntryApiFailure,
    send: boolean,
  ) => {
    attempt.current = null;
    feedback(
      previous.kind === "Outcome unknown" ? "Outcome unknown" : "Rejected",
      previous.kind === "Outcome unknown"
        ? send
          ? messages.tutoringSendUnknown
          : messages.tutoringStartUnknown
        : send
          ? (previous.feedback ?? messages.tutoringSendBusy)
          : messages.tutoringStartRejected,
      failure,
    );
  };
  // Reconcile = the authoritative fresh truth, never an unsafe replay: the
  // 6.1 course/discovery reads before creation, the BCG-012 current-work read
  // with the retained message request ID once the session definitively exists.
  const reconcile = async () => {
    const previous = stateRef.current;
    if (
      attempt.current !== null ||
      (previous.kind !== "Ready" &&
        previous.kind !== "Rejected" &&
        previous.kind !== "Outcome unknown")
    )
      return;
    const id = Symbol("tutoring-begin-read");
    attempt.current = id;
    update({ kind: "Reconciling", previous });
    const session = retained.current.session;
    if (session === null) {
      const result = await readAuthenticated(async (signal) => ({
        course: await getLearnCourse(initial.id, signal),
        active: await getActiveTutoringSession(signal),
      }));
      if (result.kind === "failed" && hidden(result.failure)) return;
      if (!current(id)) return;
      attempt.current = null;
      if (result.kind !== "completed") {
        if (result.kind === "failed")
          reconcileFailed(previous, result.failure, false);
        return;
      }
      const { course, active } = result.value;
      if (active !== null) {
        resume(active);
        return;
      }
      if (course !== null) {
        setApplied(course);
        setCheckedAt(Date.now());
      }
      if (previous.kind === "Outcome unknown")
        // Discovery found no active session: inconclusive for the attempt,
        // but enough to unlock Retry exact attempt and Abandon.
        update({ ...previous, error: null, reconciled: true });
      else if (course === null || !course.newSession.eligible)
        feedback("Rejected", messages.tutoringStartChanged, null);
      else update({ ...ready, feedback: previous.feedback });
      return;
    }
    const messageRequestId = retained.current.messageRequestId;
    const result = await readAuthenticated((signal) =>
      getTutoringSessionCurrentWork(
        session.id,
        messageRequestId === null ? {} : { messageRequestId },
        signal,
      ),
    );
    if (result.kind === "failed" && hidden(result.failure)) return;
    if (!current(id)) return;
    attempt.current = null;
    if (result.kind !== "completed") {
      if (result.kind === "failed")
        reconcileFailed(previous, result.failure, true);
      return;
    }
    const work = result.value;
    if (work.sessionState === "completed" || work.state === "completed") {
      // The session is finished: fixed read-only truth, no further send.
      retained.current = emptyRetained;
      feedback("Rejected", messages.tutoringStartChanged, null);
      return;
    }
    if (
      previous.kind === "Outcome unknown" &&
      messageRequestId !== null &&
      work.reconciledMessage !== null
    ) {
      // Definitive reconciled-committed: enter the workspace.
      retained.current = emptyRetained;
      void navigate(workspace(session.id));
      return;
    }
    if (previous.kind === "Outcome unknown") {
      // Authoritative not-committed: Retry exact attempt and Abandon unlock.
      update({ ...previous, error: null, reconciled: true });
      return;
    }
    // Ready/Rejected refresh: server-authored submit eligibility decides
    // whether a new send may be attempted now.
    update(
      work.actions.submit
        ? {
            kind: "Rejected",
            feedback: messages.tutoringSessionReady,
            error: null,
            reconciled: false,
          }
        : { ...previous, error: null },
    );
  };
  // Retry exact attempt: only after reconciliation, with the retained IDs and
  // payload, and only after the fresh checks pass again. A definitive create
  // is never repeated; the retry re-sends only the message (D3).
  const retry = async () => {
    const settled = stateRef.current;
    const bound = retained.current;
    if (
      attempt.current !== null ||
      settled.kind !== "Outcome unknown" ||
      !settled.reconciled ||
      bound.conflicted ||
      (bound.createRequestId === null && bound.messageRequestId === null) ||
      bound.content === null
    )
      return;
    const id = Symbol("tutoring-begin-retry");
    attempt.current = id;
    if (!(await checkFresh(id, true))) return;
    if (!current(id)) return;
    if (bound.createRequestId !== null) {
      if (!(await settleCreate(id, bound.createRequestId))) return;
      if (!current(id)) return;
      const session = retained.current.session;
      if (session === null) return;
      const messageRequestId = crypto.randomUUID();
      retained.current = { ...retained.current, messageRequestId };
      await settleSend(id, session, messageRequestId, bound.content);
      return;
    }
    const session = bound.session;
    if (session === null || bound.messageRequestId === null) return;
    await settleSend(id, session, bound.messageRequestId, bound.content);
  };
  const stop = () => {
    const previous = stateRef.current;
    attempt.current = null;
    if (previous.kind === "Starting")
      feedback("Outcome unknown", messages.tutoringStartUnknown, null);
    else if (previous.kind === "Sending")
      feedback("Outcome unknown", messages.tutoringSendUnknown, null);
    else if (previous.kind === "Checking") {
      // A stopped retry attempt was never dispatched; its unknown outcome and
      // retained IDs stay as reconciled. A stopped first begin sent nothing.
      if (
        retained.current.createRequestId !== null ||
        retained.current.messageRequestId !== null
      )
        update({
          kind: "Outcome unknown",
          feedback:
            retained.current.session === null
              ? messages.tutoringStartUnknown
              : messages.tutoringSendUnknown,
          error: null,
          reconciled: true,
        });
      else feedback("Rejected", messages.tutoringStartRejected, null);
    } else if (previous.kind === "Reconciling") update(previous.previous);
  };
  const abandon = () => {
    const before = stateRef.current;
    const bound = retained.current;
    if (
      pending ||
      before.kind !== "Outcome unknown" ||
      !before.reconciled ||
      (bound.createRequestId === null && bound.messageRequestId === null)
    )
      return;
    // Local abandonment only: the IDs and payload are destroyed, never resent.
    // A definitively created session remains server truth; the next begin's
    // fresh discovery presents it through the resume presentation.
    const sending = bound.session !== null;
    retained.current = emptyRetained;
    feedback(
      "Rejected",
      sending
        ? messages.tutoringSendAbandoned
        : messages.tutoringStartAbandoned,
      null,
    );
  };
  const unknown =
    state.kind === "Outcome unknown" ||
    (state.kind === "Reconciling" && state.previous.kind === "Outcome unknown");
  const departure = useUnsavedInputGuard({
    dirty:
      pending ||
      unknown ||
      state.kind === "Starting" ||
      state.kind === "Sending" ||
      hasContent,
    clear: () => {
      resourceActive.current = false;
      attempt.current = null;
      retained.current = emptyRetained;
    },
    stayTarget: status,
  });
  const settled =
    state.kind === "Reconciling"
      ? state.previous
      : state.kind === "Ready" ||
          state.kind === "Rejected" ||
          state.kind === "Outcome unknown"
        ? state
        : null;
  const attemptDirty =
    pending || unknown || state.kind === "Starting" || state.kind === "Sending";
  return {
    guardSubmit: (event: FormEvent<HTMLFormElement>) => {
      const settledNow = stateRef.current;
      if (
        pending ||
        attempt.current !== null ||
        (settledNow.kind !== "Ready" && settledNow.kind !== "Rejected") ||
        !applied.newSession.eligible
      )
        event.preventDefault();
    },
    applied,
    checkedAt,
    state,
    status,
    action,
    pending,
    unknown,
    attemptDirty,
    // The departure dialog copy follows the attempt phase once one exists;
    // a composed-but-never-submitted draft uses the draft copy.
    phase:
      retained.current.session === null
        ? ("create" as const)
        : ("send" as const),
    departure,
    stop,
    reconcile,
    retry,
    abandon,
    activeSession: state.kind === "Active session" ? state.session : null,
    enabled:
      !pending &&
      (state.kind === "Ready" || state.kind === "Rejected") &&
      applied.newSession.eligible,
    feedback: settled?.feedback ?? null,
    error: settled?.error ?? null,
    canRetry:
      !pending &&
      state.kind === "Outcome unknown" &&
      state.reconciled &&
      !retained.current.conflicted &&
      (retained.current.createRequestId !== null ||
        retained.current.messageRequestId !== null),
    canAbandon:
      !pending &&
      state.kind === "Outcome unknown" &&
      state.reconciled &&
      (retained.current.createRequestId !== null ||
        retained.current.messageRequestId !== null),
  };
}
