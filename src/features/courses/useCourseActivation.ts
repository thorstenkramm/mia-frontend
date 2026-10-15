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

type Outcome =
  | "changed"
  | "rejected"
  | "checkFailed"
  | "unknown"
  | "abandoned"
  | "unavailable";
type Settled = {
  readonly kind: "Reviewing" | "Rejected" | "Outcome unknown";
  readonly outcome: Outcome | null;
  readonly changedRows: readonly ("course" | "state" | "prerequisites")[];
  readonly error: EntryApiFailure | null;
  readonly reconciled: boolean;
};
type ActivationState =
  | Settled
  | { readonly kind: "Checking" | "Submitting" | "Succeeded" }
  | { readonly kind: "Reconciling"; readonly previous: Settled };
const review = {
  kind: "Reviewing",
  outcome: null,
  changedRows: [],
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
function changedRows(
  before: CoursePreparation,
  after: CoursePreparation,
): Settled["changedRows"] {
  return [
    ...(before.course.name !== after.course.name ? ["course" as const] : []),
    ...(before.course.state !== after.course.state ? ["state" as const] : []),
    ...(before.readiness.blockers.length !== after.readiness.blockers.length
      ? ["prerequisites" as const]
      : []),
  ];
}
const outcomeHeading = {
  changed: messages.activationChangedHeading,
  rejected: messages.activationRejectedHeading,
  checkFailed: messages.preparationCheckFailed,
  unknown: messages.activationUnknownHeading,
  abandoned: messages.courseActivationAbandoned,
  unavailable: messages.activationUnavailableHeading,
} as const;

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
    outcome: Outcome,
    error: EntryApiFailure | null,
    reconciled = false,
    rows: Settled["changedRows"] = [],
  ) => {
    flushSync(() =>
      update({ kind, outcome, error, reconciled, changedRows: rows }),
    );
    announce(intl.formatMessage(outcomeHeading[outcome]), "urgent");
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
        feedback("Rejected", "checkFailed", before.failure);
      return;
    }
    const rows = changedRows(applied, before.value);
    setApplied(before.value);
    setCheckedAt(Date.now());
    if (
      reviewedFacts(before.value) !== reviewedFacts(applied) ||
      !canFirstActivate(before.value)
    ) {
      attempt.current = null;
      feedback(
        "Reviewing",
        canFirstActivate(before.value) ? "changed" : "unavailable",
        null,
        false,
        rows,
      );
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
        feedback(
          "Rejected",
          result.kind === "not-sent" ? "checkFailed" : "rejected",
          result.failure,
        );
        break;
      case "unknown":
        feedback("Outcome unknown", "unknown", result.failure);
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
        previous.kind === "Outcome unknown" ? "unknown" : "checkFailed",
        result.failure,
      );
    } else if (result.kind === "completed") {
      setApplied(result.value);
      setCheckedAt(Date.now());
      if (previous.kind === "Outcome unknown")
        update({ ...previous, error: null, reconciled: true });
      else if (reviewedFacts(result.value) !== reviewedFacts(applied))
        feedback(
          "Reviewing",
          canFirstActivate(result.value) ? "changed" : "unavailable",
          null,
          false,
          changedRows(applied, result.value),
        );
      else update(review);
    }
  };
  const stop = () => {
    const previous = stateRef.current;
    attempt.current = null;
    if (previous.kind === "Submitting")
      feedback("Outcome unknown", "unknown", null);
    else if (previous.kind === "Checking")
      feedback("Rejected", "checkFailed", null);
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
    feedback(
      "Reviewing",
      canFirstActivate(applied) ? "abandoned" : "unavailable",
      null,
    );
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
    outcome: settled?.outcome ?? null,
    changedRows: settled?.changedRows ?? [],
    error: settled?.error ?? null,
    canAbandon:
      !pending &&
      state.kind === "Outcome unknown" &&
      state.reconciled &&
      applied.course.state === "inactive",
  };
}
