import {
  useActionState,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import {
  getCourse,
  isHiddenCourseFailure,
  type Course,
} from "../../platform/api/courses";
import {
  provisionCourseStudent,
  listCourseStudents,
  isHiddenStudentFailure,
  type StudentPage,
} from "../../platform/api/courseStudents";
import type { EntryApiFailure } from "../../platform/api/entry";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import { useUnsavedInputGuard } from "../../platform/ui/routeDeparture";
import type { NewPasswordCheck } from "../../platform/ui/NewPasswordFields";
import type { CourseStudentRouteProps } from "./CourseStudentRouteProps";

type Feedback = (typeof messages)[keyof typeof messages];
type ProvisionState =
  | {
      readonly kind:
        "Clean" | "Dirty sensitive" | "Definitive rejected" | "Not sent";
      readonly feedback: Feedback | null;
      readonly error: EntryApiFailure | null;
      readonly invalid: "username" | null;
    }
  | { readonly kind: "Pre-dispatch checking" | "Submitting" | "Save accepted" }
  | {
      readonly kind: "Save outcome unknown";
      readonly error: EntryApiFailure | null;
    }
  | { readonly kind: "Reconciling form" }
  | { readonly kind: "Current roster reviewed"; readonly page: StudentPage }
  | {
      readonly kind: "Check required";
      readonly feedback: Feedback;
      readonly error: EntryApiFailure | null;
    };
const clean = {
  kind: "Clean",
  feedback: null,
  error: null,
  invalid: null,
} satisfies ProvisionState;

// Temporary Passwords overrides generic machine-18 retention: an unknown
// attempt holds only its disposition, never input or a retry payload. Session
// owns CSRF/security epochs and post-Stop-waiting mutation settlement.
export function useStudentProvisioning(
  initial: Course,
  check: NewPasswordCheck,
  links: CourseStudentRouteProps["links"],
  unavailable: CourseStudentRouteProps["unavailable"],
) {
  const intl = useIntl();
  const navigate = useNavigate();
  const { announce } = useAnnouncer();
  const { readAuthenticated, runAuthenticatedMutation } = useSessionActions();
  const [course, setCourse] = useState(initial);
  const [generation, setGeneration] = useState(0);
  const [dirty, setDirty] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const username = useRef<HTMLInputElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const recoveryStatus = useRef<HTMLHeadingElement>(null);
  const attempt = useRef<symbol | null>(null);
  const resourceActive = useRef<symbol | null>(null);
  const dispatchSlot = useRef<{
    send: ((csrf: string) => ReturnType<typeof provisionCourseStudent>) | null;
  } | null>(null);
  const { state, stateRef, mounted, update } =
    useRouteActivity<ProvisionState>(clean);
  const current = (id: symbol, owner: symbol | null) =>
    mounted.current &&
    owner !== null &&
    resourceActive.current === owner &&
    attempt.current === id;
  const clearControls = () => {
    if (form.current !== null)
      for (const control of Array.from(form.current.elements)) {
        if (
          control instanceof HTMLInputElement ||
          control instanceof HTMLSelectElement
        )
          control.value = "";
      }
    for (const input of [
      check.passwordRef.current,
      check.confirmationRef.current,
    ])
      if (input !== null) {
        input.value = "";
        input.type = "password";
      }
    if (dispatchSlot.current !== null) dispatchSlot.current.send = null;
    dispatchSlot.current = null;
  };
  const clear = () => {
    clearControls();
    attempt.current = null;
    setDirty(false);
  };
  const transition = (
    next: ProvisionState,
    message: Feedback | null = null,
    priority: "polite" | "urgent" = "urgent",
  ) => {
    flushSync(() => update(next));
    (recoveryStatus.current ?? status.current)?.focus();
    if (message !== null) announce(intl.formatMessage(message), priority);
  };
  const hidden = (failure: EntryApiFailure, owner: symbol | null) => {
    if (
      !mounted.current ||
      owner === null ||
      resourceActive.current !== owner ||
      (!isHiddenStudentFailure(failure) && !isHiddenCourseFailure(failure))
    )
      return false;
    clear();
    resourceActive.current = null;
    unavailable(failure);
    return true;
  };
  // Every lifecycle/destroying teardown drops native input synchronously. It
  // never sends a read and cannot refill values after browser restoration.
  const destroy = useEffectEvent((owner: symbol) => {
    if (resourceActive.current !== owner) return;
    clearControls();
    attempt.current = null;
    resourceActive.current = null;
  });
  const hide = useEffectEvent(() => {
    if (!mounted.current) return;
    const sent = stateRef.current.kind === "Submitting";
    clear();
    update(
      sent
        ? { kind: "Save outcome unknown", error: null }
        : {
            kind: "Check required",
            feedback: messages.studentCheckRequired,
            error: null,
          },
    );
  });
  useLayoutEffect(() => {
    // Each setup owns a fresh lifecycle, including StrictMode's replay. Retired
    // callbacks keep their old owner and can never affect the replacement.
    const owner = Symbol("student-resource");
    resourceActive.current = owner;
    const onHide = () => hide();
    const visibility = () => {
      if (document.visibilityState === "hidden") hide();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      destroy(owner);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  const perform = async (id: symbol) => {
    const owner = resourceActive.current;
    const before = await readAuthenticated((signal) =>
      getCourse(initial.id, signal),
    );
    if (before.kind === "failed" && hidden(before.failure, owner)) return;
    if (!current(id, owner)) return;
    if (before.kind !== "completed") {
      attempt.current = null;
      if (before.kind === "failed")
        transition(
          {
            kind: "Not sent",
            feedback: messages.studentNotSent,
            error: before.failure,
            invalid: null,
          },
          messages.studentNotSent,
        );
      return;
    }
    setCourse(before.value);
    if (
      before.value.state !== "active" ||
      before.value.name !== course.name ||
      before.value.supervisors.join("\0") !== course.supervisors.join("\0")
    ) {
      clear();
      transition(
        {
          kind: "Check required",
          feedback:
            before.value.state !== "active"
              ? messages.studentInactive
              : messages.studentCheckRequired,
          error: null,
        },
        messages.studentCheckRequired,
      );
      return;
    }
    const slot = {
      send: (csrf: string) => {
        flushSync(() => update({ kind: "Submitting" }));
        // Read controls only inside the owner's current one-shot dispatch. This
        // synchronous frame returns the promise; it never awaits with a secret.
        const native = form.current;
        const value = (name: string): string => {
          const control = native?.elements.namedItem(name);
          if (!(
            control instanceof HTMLInputElement ||
            control instanceof HTMLSelectElement
          ))
            throw new Error(
              "Provisioning requires its mounted native controls.",
            );
          return control.value;
        };
        return provisionCourseStudent(
          initial.id,
          {
            username: value("username"),
            temporaryPassword: value("password"),
            language: value("language"),
            country: value("country"),
            timeZone: value("time_zone"),
          },
          csrf,
        );
      },
    };
    dispatchSlot.current = slot;
    const result = await runAuthenticatedMutation(slot, () =>
      current(id, owner),
    );
    dispatchSlot.current = null;
    if (result.kind === "rejected" && hidden(result.failure, owner)) return;
    if (!current(id, owner)) return;
    attempt.current = null;
    switch (result.kind) {
      case "completed":
        clear();
        transition(
          { kind: "Save accepted" },
          messages.studentCreated,
          "polite",
        );
        void navigate(links.membership(result.value.studentId));
        break;
      case "rejected": {
        if (result.failure.code === "course_invalid_state") {
          clear();
          transition(
            {
              kind: "Check required",
              feedback: messages.studentInactive,
              error: result.failure,
            },
            messages.studentInactive,
          );
          break;
        }
        const conflict = result.failure.code === "username_taken";
        transition(
          {
            kind: "Definitive rejected",
            feedback: conflict
              ? messages.invitationUsernameTaken
              : messages.studentInvalid,
            error: result.failure,
            invalid: conflict ? "username" : null,
          },
          conflict ? messages.invitationUsernameTaken : messages.studentInvalid,
        );
        break;
      }
      case "not-sent":
        transition(
          {
            kind: "Not sent",
            feedback: messages.studentNotSent,
            error: result.failure,
            invalid: null,
          },
          messages.studentNotSent,
        );
        break;
      case "unknown":
        clear();
        transition(
          { kind: "Save outcome unknown", error: result.failure },
          messages.studentUnknown,
        );
        break;
      case "superseded":
        clear();
        break;
    }
  };
  const [, action, pending] = useActionState<void, FormData>((_, data) => {
    for (const key of [...data.keys()]) data.delete(key);
    const id = attempt.current;
    return id === null || stateRef.current.kind !== "Pre-dispatch checking"
      ? Promise.resolve()
      : perform(id);
  }, undefined);
  const locked =
    pending ||
    state.kind === "Pre-dispatch checking" ||
    state.kind === "Submitting";
  const editable = [
    "Clean",
    "Dirty sensitive",
    "Definitive rejected",
    "Not sent",
  ].includes(state.kind);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (attempt.current !== null || !editable || locked) {
      event.preventDefault();
      return;
    }
    const valid = check.checkSubmission(event, {
      fields: (data) => {
        const candidate = data.get("username");
        const invalidUsername =
          typeof candidate !== "string" ||
          !/^[A-Za-z0-9][A-Za-z0-9._-]{1,30}[A-Za-z0-9]$/u.test(candidate);
        const profileProblems = [
          { name: "language", message: messages.studentLanguageMissing },
          { name: "country", message: messages.studentCountryMissing },
          { name: "time_zone", message: messages.studentTimeZoneMissing },
        ].filter(({ name }) => !data.get(name));
        if (invalidUsername || profileProblems.length > 0)
          update({
            kind: "Dirty sensitive",
            feedback: messages.studentInvalid,
            error: null,
            invalid: null,
          });
        return [
          ...(invalidUsername
            ? [
                {
                  target: "student-username",
                  label: intl.formatMessage(messages.studentUsernameInvalid),
                },
              ]
            : []),
          ...profileProblems.map(({ name, message }) => ({
            target: `student-${name}`,
            label: intl.formatMessage(message),
          })),
        ];
      },
    });
    if (!valid) return;
    attempt.current = Symbol("student-provision");
    update({ kind: "Pre-dispatch checking" });
    announce(intl.formatMessage(messages.studentChecking));
  };
  // The wrapper strips React's FormData *before* the Action queue can retain it.
  const formAction = (data: FormData) => {
    for (const key of [...data.keys()]) data.delete(key);
    action(data);
  };
  const departure = useUnsavedInputGuard({
    dirty: dirty && editable && !locked,
    clear: () => {
      clear();
      resourceActive.current = null;
    },
    stayTarget: username,
  });
  const stop = () => {
    const sent = stateRef.current.kind === "Submitting";
    clear();
    transition(
      sent
        ? { kind: "Save outcome unknown", error: null }
        : {
            kind: "Check required",
            feedback: messages.studentNotSent,
            error: null,
          },
      sent ? messages.studentUnknown : messages.studentNotSent,
    );
  };
  const reconcile = async (offset = 0) => {
    if (attempt.current !== null || locked) return;
    const previous = stateRef.current;
    const unknown =
      previous.kind === "Save outcome unknown" ||
      previous.kind === "Current roster reviewed";
    const id = Symbol("student-current-read");
    const owner = resourceActive.current;
    attempt.current = id;
    update({ kind: "Reconciling form" });
    const result = await readAuthenticated(async (signal) => {
      const nextCourse = await getCourse(initial.id, signal);
      return {
        course: nextCourse,
        page: unknown
          ? await listCourseStudents(initial.id, offset, signal)
          : null,
      };
    });
    if (result.kind === "failed" && hidden(result.failure, owner)) return;
    if (!current(id, owner)) return;
    attempt.current = null;
    if (result.kind === "completed") {
      setCourse(result.value.course);
      if (unknown && result.value.page !== null)
        transition(
          { kind: "Current roster reviewed", page: result.value.page },
          offset === 0 ? null : messages.studentUnknown,
          "polite",
        );
      else if (result.value.course.state === "active") {
        clear();
        setGeneration((value) => value + 1);
        update(clean);
      } else
        transition({
          kind: "Check required",
          feedback: messages.studentInactive,
          error: null,
        });
    } else if (result.kind === "failed")
      transition(
        unknown
          ? { kind: "Save outcome unknown", error: result.failure }
          : {
              kind: "Check required",
              feedback: messages.coursesCheckFailed,
              error: result.failure,
            },
        messages.coursesCheckFailed,
      );
  };
  const abandon = () => {
    if (
      stateRef.current.kind !== "Current roster reviewed" ||
      course.state !== "active" ||
      pending
    )
      return;
    clear();
    setGeneration((value) => value + 1);
    update(clean);
  };
  return {
    state,
    stateRef,
    course,
    generation,
    form,
    username,
    status,
    recoveryStatus,
    dirty,
    locked,
    editable,
    pending,
    formAction,
    submit,
    departure,
    stop,
    reconcile,
    abandon,
    change: () => {
      if (editable && !locked) {
        setDirty(true);
        update({ ...clean, kind: "Dirty sensitive" });
      }
    },
  };
}
