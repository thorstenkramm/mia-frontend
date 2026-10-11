import { useActionState, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import {
  activateCourse,
  canFirstActivate,
  getCoursePreparation,
  isHiddenCourseFailure,
  type CoursePreparation,
} from "../../platform/api/courses";
import type { EntryApiFailure } from "../../platform/api/entry";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import { useUnsavedInputGuard } from "../../platform/ui/routeDeparture";

type Feedback = (typeof messages)[keyof typeof messages];
type Settled = {
  readonly kind: "Reviewing" | "Rejected" | "Outcome unknown";
  readonly feedback: Feedback | null;
  readonly error: EntryApiFailure | null;
  readonly reconciled: boolean;
};
type ActivationState =
  | Settled
  | { readonly kind: "Checking" | "Submitting" | "Succeeded" }
  | { readonly kind: "Reconciling"; readonly previous: Settled };
const review = {
  kind: "Reviewing",
  feedback: null,
  error: null,
  reconciled: false,
} satisfies Settled;

// Reviewed facts only, not a local eligibility calculation or transaction lock.
function reviewedFacts(value: CoursePreparation): string {
  return JSON.stringify([
    value.course.id,
    value.course.name,
    value.course.state,
    value.activatedAt,
    value.deactivatedAt,
    value.fields.learningGoals,
    value.fields.instructions,
    value.fields.language,
    [...value.course.supervisors].sort(),
    value.readiness.state,
    value.readiness.activation.eligible,
    [...value.readiness.activation.blockers].sort(),
    value.readiness.activation.consequences,
    [...value.readiness.blockers].sort((a, b) => a.id.localeCompare(b.id)),
  ]);
}

// Machine 12's route-local operation owner. Session owns security/scope epochs,
// fresh CSRF, the single unsafe dispatch and settlement even after Stop waiting.
// The rhyming machine-2 session-start hook carries the jscpd marker for this
// pair: see useTutoringSessionBegin.ts (separate state-machine ownership; the
// architecture rule bars cross-feature imports). The machine-5 workspace-send
// hook rhymes the same way; its markers live in useStudentMessageSend.ts.
export function useCourseActivation(
  initial: CoursePreparation,
  hub: string,
  unavailable: (failure: EntryApiFailure) => void,
) {
  const intl = useIntl();
  const navigate = useNavigate();
  const { announce } = useAnnouncer();
  const { readAuthenticated, runAuthenticatedMutation } = useSessionActions();
  const [applied, setApplied] = useState(initial);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const { state, stateRef, mounted, update } =
    useRouteActivity<ActivationState>(review);
  const attempt = useRef<symbol | null>(null);
  const resourceActive = useRef(true);
  const status = useRef<HTMLHeadingElement>(null);
  const current = (id: symbol) =>
    mounted.current && resourceActive.current && attempt.current === id;
  const hidden = (failure: EntryApiFailure) => {
    if (
      !mounted.current ||
      !resourceActive.current ||
      !isHiddenCourseFailure(failure)
    )
      return false;
    resourceActive.current = false;
    attempt.current = null;
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
  const [, action, pending] = useActionState<void, FormData>(async () => {
    if (
      !mounted.current ||
      !resourceActive.current ||
      attempt.current !== null ||
      stateRef.current.kind !== "Reviewing" ||
      !canFirstActivate(applied)
    )
      return;
    const id = Symbol("activation");
    attempt.current = id;
    // The Action remains pending through settlement. Phase changes must still
    // reach the DOM immediately so Stop waiting has the correct local meaning.
    flushSync(() => update({ kind: "Checking" }));
    announce(intl.formatMessage(messages.courseActivationChecking));
    const before = await readAuthenticated((signal) =>
      getCoursePreparation(initial.course.id, signal),
    );
    if (before.kind === "failed" && hidden(before.failure)) return;
    if (!current(id)) return;
    if (before.kind !== "completed") {
      attempt.current = null;
      if (before.kind === "failed")
        feedback("Rejected", messages.preparationCheckFailed, before.failure);
      return;
    }
    setApplied(before.value);
    setCheckedAt(Date.now());
    if (
      reviewedFacts(before.value) !== reviewedFacts(applied) ||
      !canFirstActivate(before.value)
    ) {
      attempt.current = null;
      feedback("Reviewing", messages.courseActivationChanged, null);
      return;
    }
    const result = await runAuthenticatedMutation(
      {
        send: (csrf) => {
          flushSync(() => update({ kind: "Submitting" }));
          return activateCourse(initial.course.id, csrf);
        },
      },
      () => current(id),
    );
    // Applicable denial is terminal even for a locally retired attempt.
    if (result.kind === "rejected" && hidden(result.failure)) return;
    if (!current(id)) return;
    attempt.current = null;
    switch (result.kind) {
      case "completed":
        setApplied(result.value);
        update({ kind: "Succeeded" });
        announce(intl.formatMessage(messages.courseActivationSuccess));
        void navigate(hub);
        break;
      case "rejected":
      case "not-sent":
        feedback("Rejected", messages.courseActivationRejected, result.failure);
        break;
      case "unknown":
        feedback(
          "Outcome unknown",
          messages.courseActivationUnknown,
          result.failure,
        );
        break;
      case "superseded":
        break;
    }
  }, undefined);

  const reconcile = async () => {
    const previous = stateRef.current;
    if (
      attempt.current !== null ||
      (previous.kind !== "Reviewing" &&
        previous.kind !== "Rejected" &&
        previous.kind !== "Outcome unknown")
    )
      return;
    const id = Symbol("activation-read");
    attempt.current = id;
    update({ kind: "Reconciling", previous });
    const result = await readAuthenticated((signal) =>
      getCoursePreparation(initial.course.id, signal),
    );
    if (result.kind === "failed" && hidden(result.failure)) return;
    if (!current(id)) return;
    attempt.current = null;
    if (result.kind === "failed") {
      feedback(
        previous.kind === "Outcome unknown" ? "Outcome unknown" : "Rejected",
        previous.kind === "Outcome unknown"
          ? messages.courseActivationUnknown
          : messages.preparationCheckFailed,
        result.failure,
      );
    } else if (result.kind === "completed") {
      setApplied(result.value);
      setCheckedAt(Date.now());
      if (previous.kind === "Outcome unknown")
        update({ ...previous, error: null, reconciled: true });
      else if (reviewedFacts(result.value) !== reviewedFacts(applied))
        feedback("Reviewing", messages.courseActivationChanged, null);
      else update({ ...review, feedback: previous.feedback });
    }
  };
  const stop = () => {
    const previous = stateRef.current;
    attempt.current = null;
    if (previous.kind === "Submitting")
      feedback("Outcome unknown", messages.courseActivationUnknown, null);
    else if (previous.kind === "Checking")
      feedback("Rejected", messages.preparationCheckFailed, null);
    else if (previous.kind === "Reconciling") update(previous.previous);
  };
  const abandon = () => {
    const before = stateRef.current;
    if (
      pending ||
      before.kind !== "Outcome unknown" ||
      !before.reconciled ||
      applied.course.state !== "inactive"
    )
      return;
    // Abandonment never makes the current stale representation submit-ready.
    feedback("Rejected", messages.courseActivationAbandoned, null);
  };
  const unknown =
    state.kind === "Outcome unknown" ||
    (state.kind === "Reconciling" && state.previous.kind === "Outcome unknown");
  const departure = useUnsavedInputGuard({
    dirty: pending || unknown || state.kind === "Submitting",
    clear: () => {
      resourceActive.current = false;
      attempt.current = null;
    },
    stayTarget: status,
  });
  const settled =
    state.kind === "Reconciling"
      ? state.previous
      : state.kind === "Reviewing" ||
          state.kind === "Rejected" ||
          state.kind === "Outcome unknown"
        ? state
        : null;
  return {
    guardSubmit: (event: FormEvent<HTMLFormElement>) => {
      if (
        pending ||
        attempt.current !== null ||
        stateRef.current.kind !== "Reviewing" ||
        !canFirstActivate(applied)
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
    abandon,
    enabled:
      !pending && state.kind === "Reviewing" && canFirstActivate(applied),
    feedback: settled?.feedback ?? null,
    error: settled?.error ?? null,
    canAbandon:
      !pending &&
      state.kind === "Outcome unknown" &&
      state.reconciled &&
      applied.course.state === "inactive",
  };
}
