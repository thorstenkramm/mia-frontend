import { useActionState, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import {
  getLearnCourse,
  type LearnCourse,
} from "../../platform/api/learnCourses";
import {
  toMaterialId,
  type EntryApiFailure,
  type MaterialId,
} from "../../platform/api/entry";
import {
  createTutoringSession,
  getActiveTutoringSession,
  isHiddenTutoringFailure,
  type ActiveTutoringSession,
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
  // Authoritative reconciliation ran and found no active session; only then
  // may Retry exact attempt or Abandon unknown attempt be offered.
  readonly reconciled: boolean;
};
type StartState =
  | Settled
  | { readonly kind: "Checking" | "Starting" }
  | { readonly kind: "Active session"; readonly session: ActiveTutoringSession }
  | { readonly kind: "Reconciling"; readonly previous: Settled };
const ready: Settled = {
  kind: "Ready",
  feedback: null,
  error: null,
  reconciled: false,
};

// FRONTEND-STATE-MACHINES.md machine 2 for the tutoring-session start: one
// request-ID-bound creation, dispatched at most once per attempt, ID minted
// after fresh course/discovery checks immediately before dispatch and held in
// page memory only. No automatic replay: outcome unknown reconciles through
// the one authoritative discovery read and offers only an explicit Retry exact
// attempt (same ID and payload) or Abandon after inconclusive reconciliation.
export function useTutoringSessionStart(
  initial: LearnCourse,
  // The hook preamble rhymes with useCourseActivation by contract, not by
  // shared ownership: machine 2's start owner and machine 12's activation
  // owner are separate state machines, and the architecture rule bars
  // features/tutoring importing features/courses. jscpd markers are
  // line-based and the matched range begins mid-signature, so the ignore
  // covers the declaration head through the route-activity binding.
  // jscpd:ignore-start
  workspace: (session: TutoringSessionId) => string,
  unavailable: (failure: EntryApiFailure) => void,
) {
  const intl = useIntl();
  const navigate = useNavigate();
  const { announce } = useAnnouncer();
  const { readAuthenticated, runAuthenticatedMutation } = useSessionActions();
  const [applied, setApplied] = useState(initial);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const { state, stateRef, mounted, update } =
    useRouteActivity<StartState>(ready);
  // jscpd:ignore-end
  const attempt = useRef<symbol | null>(null);
  // The immutable attempt payload: ID minted after fresh checks, cleared on
  // definitive settlement, retained only for an explicit exact retry.
  const retained = useRef<{
    readonly requestId: string;
    readonly material: MaterialId | null;
  } | null>(null);
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
  const resume = (session: ActiveTutoringSession) => {
    attempt.current = null;
    retained.current = null;
    flushSync(() => update({ kind: "Active session", session }));
    announce(
      intl.formatMessage(messages.tutoringResumeActive, {
        course: session.courseName,
      }),
      "urgent",
    );
  };
  // The fresh pre-dispatch (or pre-retry) course re-read plus BCG-002
  // discovery. Returns true only when a dispatch may follow immediately.
  const checkFresh = async (
    id: symbol,
    failure: "start" | "retry",
  ): Promise<boolean> => {
    flushSync(() => update({ kind: "Checking" }));
    announce(intl.formatMessage(messages.tutoringChecking));
    const result = await readAuthenticated(async (signal) => ({
      course: await getLearnCourse(initial.id, signal),
      active: await getActiveTutoringSession(signal),
    }));
    if (result.kind === "failed" && hidden(result.failure)) return false;
    if (!current(id)) return false;
    if (result.kind !== "completed") {
      attempt.current = null;
      // A failed read retires only the attempt symbol; a retained unknown
      // attempt keeps its ID and returns to its unreconciled unknown state.
      if (result.kind === "failed")
        feedback(
          failure === "start" ? "Rejected" : "Outcome unknown",
          failure === "start"
            ? messages.tutoringStartRejected
            : messages.tutoringStartUnknown,
          result.failure,
        );
      return false;
    }
    const { course, active } = result.value;
    if (active !== null) {
      resume(active);
      return false;
    }
    if (course !== null) {
      setApplied(course);
      setCheckedAt(Date.now());
    }
    if (course === null || !course.newSession.eligible) {
      attempt.current = null;
      retained.current = null;
      feedback("Rejected", messages.tutoringStartChanged, null);
      return false;
    }
    return true;
  };
  const settle = async (
    id: symbol,
    requestId: string,
    material: MaterialId | null,
  ) => {
    const result = await runAuthenticatedMutation(
      {
        send: (csrf) => {
          flushSync(() => update({ kind: "Starting" }));
          return createTutoringSession(initial.id, material, requestId, csrf);
        },
      },
      () => current(id),
    );
    // Applicable denial is terminal even for a locally retired attempt.
    if (result.kind === "rejected" && hidden(result.failure)) return;
    if (!current(id)) return;
    if (result.kind === "completed") {
      attempt.current = null;
      retained.current = null;
      // 200 and 201 are the same definitive success (D7): navigate by the
      // returned identity, never surfacing the distinction.
      void navigate(workspace(result.value.id));
      return;
    }
    if (result.kind === "unknown") {
      attempt.current = null;
      // The ID and payload stay bound for an explicit Retry exact attempt.
      feedback(
        "Outcome unknown",
        messages.tutoringStartUnknown,
        result.failure,
      );
      return;
    }
    if (result.kind === "superseded") return;
    if (result.kind === "not-sent") {
      attempt.current = null;
      retained.current = null;
      feedback("Rejected", messages.tutoringStartRejected, result.failure);
      return;
    }
    // Definitive HTTP rejection.
    const { status: httpStatus } = result.failure.disclosure;
    const code = result.failure.code;
    if (httpStatus === 409 && code === "tutoring_invalid_state") {
      // Attempt retired; current truth returns through explicit Refresh.
      attempt.current = null;
      retained.current = null;
      feedback("Rejected", messages.tutoringStartChanged, result.failure);
      return;
    }
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
      if (discovery.kind === "failed" && hidden(discovery.failure)) return;
      if (!current(id)) return;
      attempt.current = null;
      retained.current = null;
      if (discovery.kind === "completed" && discovery.value !== null) {
        resume(discovery.value);
        return;
      }
      feedback(
        "Rejected",
        discovery.kind === "completed"
          ? messages.tutoringStartChanged
          : messages.tutoringStartConflict,
        discovery.kind === "failed" ? discovery.failure : null,
      );
      return;
    }
    // 422 tutoring_invalid and every other definitive <500 rejection; any
    // later submit mints a fresh request ID.
    attempt.current = null;
    retained.current = null;
    feedback("Rejected", messages.tutoringStartRejected, result.failure);
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
      const chosen = formData.get("material");
      const material =
        chosen === null || chosen === "" ? null : toMaterialId(String(chosen));
      if (material === null && chosen !== null && chosen !== "") return;
      const id = Symbol("tutoring-start");
      attempt.current = id;
      if (!(await checkFresh(id, "start"))) return;
      // Mint the canonical lowercase UUID v4 after fresh checks, immediately
      // before the single dispatch, and bind it to the immutable payload.
      const requestId = crypto.randomUUID();
      retained.current = { requestId, material };
      if (!current(id)) return;
      await settle(id, requestId, material);
    },
    undefined,
  );

  // Reconcile = the authoritative fresh course re-read plus discovery. It never
  // repeats the unsafe request and never claims the attempt's outcome.
  const reconcile = async () => {
    const previous = stateRef.current;
    if (
      attempt.current !== null ||
      (previous.kind !== "Ready" &&
        previous.kind !== "Rejected" &&
        previous.kind !== "Outcome unknown")
    )
      return;
    const id = Symbol("tutoring-start-read");
    attempt.current = id;
    update({ kind: "Reconciling", previous });
    const result = await readAuthenticated(async (signal) => ({
      course: await getLearnCourse(initial.id, signal),
      active: await getActiveTutoringSession(signal),
    }));
    if (result.kind === "failed" && hidden(result.failure)) return;
    if (!current(id)) return;
    attempt.current = null;
    if (result.kind !== "completed") {
      if (result.kind === "failed")
        feedback(
          previous.kind === "Outcome unknown" ? "Outcome unknown" : "Rejected",
          previous.kind === "Outcome unknown"
            ? messages.tutoringStartUnknown
            : messages.tutoringStartRejected,
          result.failure,
        );
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
      // Discovery found no active session: inconclusive for the attempt, but
      // enough to unlock Retry exact attempt and Abandon unknown attempt.
      update({ ...previous, error: null, reconciled: true });
    else if (course === null || !course.newSession.eligible)
      feedback("Rejected", messages.tutoringStartChanged, null);
    else update({ ...ready, feedback: previous.feedback });
  };
  // Retry exact attempt: only after reconciliation, with the retained ID and
  // payload, and only after the fresh checks pass again.
  const retry = async () => {
    const settled = stateRef.current;
    const bound = retained.current;
    if (
      attempt.current !== null ||
      settled.kind !== "Outcome unknown" ||
      !settled.reconciled ||
      bound === null
    )
      return;
    const id = Symbol("tutoring-start-retry");
    attempt.current = id;
    if (!(await checkFresh(id, "retry"))) return;
    if (!current(id)) return;
    await settle(id, bound.requestId, bound.material);
  };
  const stop = () => {
    const previous = stateRef.current;
    attempt.current = null;
    if (previous.kind === "Starting")
      feedback("Outcome unknown", messages.tutoringStartUnknown, null);
    else if (previous.kind === "Checking") {
      // A stopped retry attempt was never dispatched; its unknown outcome and
      // retained ID stay as reconciled. A stopped first start sent nothing.
      if (retained.current !== null)
        update({
          kind: "Outcome unknown",
          feedback: messages.tutoringStartUnknown,
          error: null,
          reconciled: true,
        });
      else feedback("Rejected", messages.tutoringStartRejected, null);
    } else if (previous.kind === "Reconciling") update(previous.previous);
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
    feedback("Rejected", messages.tutoringStartAbandoned, null);
  };
  const unknown =
    state.kind === "Outcome unknown" ||
    (state.kind === "Reconciling" && state.previous.kind === "Outcome unknown");
  const departure = useUnsavedInputGuard({
    dirty: pending || unknown || state.kind === "Starting",
    clear: () => {
      resourceActive.current = false;
      attempt.current = null;
      retained.current = null;
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
      retained.current !== null,
    canAbandon:
      !pending &&
      state.kind === "Outcome unknown" &&
      state.reconciled &&
      retained.current !== null,
  };
}
