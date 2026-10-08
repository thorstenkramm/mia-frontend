import { useActionState, useRef, useState } from "react";
import { useIntl } from "react-intl";
import {
  getCoursePreparation,
  isHiddenCourseFailure,
  updateCourseTeachingField,
  type CoursePreparation,
  type CourseTeachingField,
} from "../../platform/api/courses";
import type { EntryApiFailure } from "../../platform/api/entry";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import { useUnsavedInputGuard } from "../../platform/ui/routeDeparture";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import { teachingTextInvalid } from "./courseTeachingFields";

type Feedback = (typeof messages)[keyof typeof messages];
type Editable = {
  readonly kind:
    | "Clean"
    | "Dirty sensitive"
    | "Save accepted"
    | "Read matches submit"
    | "Post-save newer"
    | "Server rejected stale";
  readonly error: EntryApiFailure | null;
  readonly feedback: Feedback | null;
  readonly invalid: boolean;
};
type Unconfirmed = {
  readonly kind: "Save outcome unknown" | "Read differs";
  readonly submitted: string;
  readonly error: EntryApiFailure | null;
};
type FieldState =
  | Editable
  | Unconfirmed
  | { readonly kind: "Save submitting"; readonly submitted: string }
  | {
      readonly kind: "Reconciling form";
      readonly previous: Editable | Unconfirmed;
    };
const clean = {
  kind: "Clean",
  error: null,
  feedback: null,
  invalid: false,
} satisfies Editable;
function unconfirmed(state: FieldState): state is Unconfirmed {
  return state.kind === "Save outcome unknown" || state.kind === "Read differs";
}

// Machine 18: applied server baseline, editable draft and immutable unconfirmed
// submission are separate. Current epoch reads reconcile values, never a PATCH.
export function useCourseTeachingField(
  initial: CoursePreparation,
  field: CourseTeachingField,
  unavailable: (failure: EntryApiFailure) => void,
) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { runAuthenticatedMutation, readAuthenticated } = useSessionActions();
  const [applied, setApplied] = useState(initial);
  const [draft, setDraft] = useState(initial.fields[field] ?? "");
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const control = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const live = useRef<symbol | null>(null);
  // Stop waiting fences local results, not a current resource's access loss.
  // The session owner fences security epochs; a same-page read is not a new
  // authorization epoch. Discard invalidates the route before it unmounts.
  const resourceActive = useRef(true);
  const { state, stateRef, mounted, update } =
    useRouteActivity<FieldState>(clean);
  const current = (attempt: symbol) =>
    mounted.current && live.current === attempt;
  const currentResource = () => mounted.current && resourceActive.current;
  const setFeedback = (
    feedback: Feedback,
    error: EntryApiFailure | null,
    invalid: boolean,
  ) => {
    update({ kind: "Dirty sensitive", feedback, error, invalid });
    control.current?.focus();
    announce(intl.formatMessage(feedback), "urgent");
  };
  const [, action, pending] = useActionState<void, FormData>(
    async (_, data) => {
      data.delete("teaching-field");
      const before = stateRef.current;
      if (
        live.current !== null ||
        unconfirmed(before) ||
        before.kind === "Reconciling form" ||
        before.kind === "Save submitting"
      )
        return;
      if (teachingTextInvalid(field, draft)) {
        setFeedback(messages.preparationBoundsError, null, true);
        return;
      }
      const attempt = Symbol("course-field-save");
      live.current = attempt;
      const submitted = draft;
      update({ kind: "Save submitting", submitted });
      announce(intl.formatMessage(messages.coursesSaving));
      const result = await runAuthenticatedMutation(
        {
          send: (csrf) =>
            updateCourseTeachingField(
              initial.course.id,
              field,
              submitted === "" ? null : submitted,
              csrf,
            ),
        },
        () => current(attempt),
      );
      if (
        currentResource() &&
        result.kind === "rejected" &&
        isHiddenCourseFailure(result.failure)
      ) {
        unavailable(result.failure);
        return;
      }
      if (!current(attempt)) return;
      live.current = null;
      switch (result.kind) {
        case "completed":
          setApplied(result.value);
          setDraft(result.value.fields[field] ?? "");
          setCheckedAt(Date.now());
          update({
            ...clean,
            kind: "Save accepted",
            feedback: messages.preparationSaved,
          });
          announce(intl.formatMessage(messages.preparationSaved));
          break;
        case "rejected":
          setFeedback(
            result.failure.code === "course_activation_unavailable"
              ? messages.preparationActiveError
              : messages.preparationRejected,
            result.failure,
            result.failure.code === "course_invalid" ||
              result.failure.code === "course_activation_unavailable",
          );
          break;
        case "not-sent":
          setFeedback(messages.preparationRejected, result.failure, false);
          break;
        case "unknown":
          update({
            kind: "Save outcome unknown",
            submitted,
            error: result.failure,
          });
          announce(intl.formatMessage(messages.preparationUnknown), "urgent");
          break;
        case "superseded":
          break;
      }
    },
    undefined,
  );
  // An Action's transition updates may be deferred until it settles. React's
  // pending flag is available immediately and freezes the already-dispatched form.
  const submitting =
    pending && !unconfirmed(state) && state.kind !== "Reconciling form";
  const locked =
    pending ||
    unconfirmed(state) ||
    state.kind === "Save submitting" ||
    state.kind === "Reconciling form";
  const dirty = draft !== (applied.fields[field] ?? "");
  // Locking controls during an explicit read does not submit/discard a draft.
  // Unknown submissions keep their existing unconfirmed-departure contract.
  const dirtyDraft =
    dirty &&
    !pending &&
    state.kind !== "Save submitting" &&
    !unconfirmed(state) &&
    (state.kind !== "Reconciling form" || !unconfirmed(state.previous));
  const departure = useUnsavedInputGuard({
    dirty: dirtyDraft,
    clear: () => {
      live.current = null;
      resourceActive.current = false;
      setDraft("");
    },
    stayTarget: control,
  });
  const change = (value: string) => {
    if (locked) return;
    setDraft(value);
    update({
      ...clean,
      kind:
        value === (applied.fields[field] ?? "") ? "Clean" : "Dirty sensitive",
    });
  };
  const stop = () => {
    const before = stateRef.current;
    live.current = null;
    if (before.kind === "Save submitting") {
      update({
        kind: "Save outcome unknown",
        submitted: before.submitted,
        error: null,
      });
      announce(intl.formatMessage(messages.preparationUnknown), "urgent");
    } else if (before.kind === "Reconciling form") update(before.previous);
  };
  const reconcile = async () => {
    const previous = stateRef.current;
    if (
      previous.kind === "Save submitting" ||
      previous.kind === "Reconciling form" ||
      live.current !== null
    )
      return;
    const attempt = Symbol("course-field-read");
    live.current = attempt;
    update({ kind: "Reconciling form", previous });
    const result = await readAuthenticated((signal) =>
      getCoursePreparation(initial.course.id, signal),
    );
    if (
      currentResource() &&
      result.kind === "failed" &&
      isHiddenCourseFailure(result.failure)
    ) {
      unavailable(result.failure);
      return;
    }
    if (!current(attempt)) return;
    live.current = null;
    if (result.kind === "failed") {
      update({ ...previous, error: result.failure });
      announce(intl.formatMessage(messages.preparationCheckFailed), "urgent");
    } else if (result.kind === "completed") {
      const value = result.value.fields[field] ?? "";
      setApplied(result.value);
      setCheckedAt(Date.now());
      if (unconfirmed(previous)) {
        if (value === previous.submitted) {
          setDraft(value);
          update({
            ...clean,
            kind: "Read matches submit",
            feedback: messages.preparationMatches,
          });
          announce(intl.formatMessage(messages.preparationMatches));
        } else {
          update({
            kind: "Read differs",
            submitted: previous.submitted,
            error: null,
          });
          announce(intl.formatMessage(messages.preparationDiffers), "urgent");
        }
      } else if (value !== (applied.fields[field] ?? "")) {
        if (!dirty) setDraft(value);
        update({
          ...clean,
          kind: "Post-save newer",
          feedback: messages.preparationNewer,
        });
        announce(intl.formatMessage(messages.preparationNewer));
      } else update(previous);
    }
  };
  const useCurrent = () => {
    if (stateRef.current.kind !== "Read differs") return;
    setDraft(applied.fields[field] ?? "");
    update(clean);
    control.current?.focus();
  };
  const error =
    state.kind === "Save submitting" || state.kind === "Reconciling form"
      ? null
      : state.error;
  const feedback = unconfirmed(state)
    ? state.kind === "Read differs"
      ? messages.preparationDiffers
      : messages.preparationUnknown
    : state.kind === "Save submitting" || state.kind === "Reconciling form"
      ? null
      : state.feedback;
  return {
    applied,
    draft,
    checkedAt,
    control,
    state,
    action,
    pending,
    submitting,
    locked,
    dirty,
    departure,
    change,
    stop,
    reconcile,
    useCurrent,
    feedback,
    error,
    invalid: !locked && !unconfirmed(state) && state.invalid,
  };
}
