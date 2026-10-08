import { useActionState, useLayoutEffect, useRef, useState } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/16/solid";
import { XCircleIcon } from "@heroicons/react/20/solid";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import {
  listSupervisorCandidates,
  type SupervisorCandidate,
  type SupervisorCandidatePage,
} from "../../platform/api/administrationAccounts";
import {
  createCourse,
  isHiddenCourseFailure,
} from "../../platform/api/courses";
import type { EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { AuthSubmitButton } from "../../platform/ui/AuthSubmitButton";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { RouteRecoveryPanel } from "../../platform/ui/RouteRecoveryPanel";
import { useUnsavedInputGuard } from "../../platform/ui/routeDeparture";
import type { CourseRouteProps } from "./CourseRouteProps";
import { courseActionClass } from "./CourseListRoute";
import { SupervisorSelector } from "./SupervisorSelector";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";

type CreateState =
  | {
      readonly kind: "Form ready";
      readonly nameError: boolean;
      readonly supervisorError: boolean;
      readonly supervisorErrorSelection: readonly SupervisorCandidate["id"][];
      readonly feedback:
        "invalid" | "conflict" | "supervisor" | "rejected" | null;
      readonly error: EntryApiFailure | null;
    }
  | {
      readonly kind: "Save outcome unknown";
      readonly error: EntryApiFailure | null;
    };
const ready = {
  kind: "Form ready",
  nameError: false,
  supervisorError: false,
  supervisorErrorSelection: [],
  feedback: null,
  error: null,
} satisfies CreateState;
type SelectorState =
  | { readonly kind: "Idle" }
  | { readonly kind: "Loading" }
  | { readonly kind: "Failed"; readonly error: EntryApiFailure };

// Tailwind Plus: Application UI > Forms > Input Groups > Input with label and
// help text / Input with validation error; Feedback > Alerts > With list;
// Alerts > With actions (RouteRecoveryPanel); Checkboxes > List with description
// (SupervisorSelector). Library 2026-09-13-083323, v4/react-light.jsx.
// MIA: React Action, native errors/summary, atomic initial assignments, no
// optimistic result or uniqueness/eligibility probe, mounted-only dirty draft.
// Accessibility delta (DESIGN colors / WCAG 1.4.11): inherited gray-500 and
// red-600 replace blueprint gray-300/red-300 for unfocused normal/error outlines.
// Supervisor errors are bound to the rejected selection; changing that set
// clears its invalid state and stale corrective messages, not its eligibility.
export default function CourseCreateRoute(props: CourseRouteProps) {
  if (props.resource.kind !== "create")
    throw new Error("Course creation requires its admitted selector decision.");
  return <CourseCreate {...props} initialPage={props.resource.page} />;
}
function CourseCreate({
  initialPage,
  links,
  canCreate,
  unavailable,
}: Omit<CourseRouteProps, "resource"> & {
  readonly initialPage: SupervisorCandidatePage | null;
}) {
  const intl = useIntl();
  const navigate = useNavigate();
  const { announce } = useAnnouncer();
  const { readAuthenticated, runAuthenticatedMutation } = useSessionActions();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<readonly SupervisorCandidate[]>([]);
  const [page, setPage] = useState(initialPage);
  const [stopped, setStopped] = useState(false);
  const mounted = useRef(false);
  const liveAttempt = useRef<symbol | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const selectorHeading = useRef<HTMLLegendElement>(null);
  const summary = useRef<HTMLHeadingElement>(null);
  const selector = useRouteActivity<SelectorState>({ kind: "Idle" });
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      liveAttempt.current = null;
    };
  }, []);

  const [result, action, pending] = useActionState<CreateState, FormData>(
    async (previous, data) => {
      data.delete("name");
      data.delete("supervisors");
      if (
        liveAttempt.current !== null ||
        previous.kind === "Save outcome unknown" ||
        stopped ||
        !canCreate ||
        page === null
      )
        return previous;
      const normalized = name.trim().normalize("NFC");
      const nameError =
        normalized === "" ||
        [...normalized].length > 200 ||
        new TextEncoder().encode(normalized).length > 800;
      const supervisorError = selected.length === 0;
      if (nameError || supervisorError)
        return {
          ...ready,
          nameError,
          supervisorError,
          supervisorErrorSelection: selected.map((choice) => choice.id),
          feedback: "invalid",
        };
      const attempt = Symbol("course-create");
      liveAttempt.current = attempt;
      const current = () => mounted.current && liveAttempt.current === attempt;
      announce(intl.formatMessage(messages.coursesSaving), "polite");
      const response = await runAuthenticatedMutation(
        {
          send: (csrf) =>
            createCourse(
              name,
              selected.map((choice) => choice.id),
              csrf,
            ),
        },
        current,
      );
      if (!current()) return previous;
      liveAttempt.current = null;
      switch (response.kind) {
        case "completed":
          setName("");
          setSelected([]);
          setPage(null);
          navigate(links.detail(response.value.id));
          return ready;
        case "rejected": {
          if (isHiddenCourseFailure(response.failure)) {
            unavailable(response.failure);
            return ready;
          }
          const feedback =
            response.failure.code === "course_name_taken"
              ? "conflict"
              : response.failure.code === "course_supervisor_invalid"
                ? "supervisor"
                : "rejected";
          return {
            ...ready,
            nameError: feedback === "conflict",
            supervisorError: feedback === "supervisor",
            supervisorErrorSelection: selected.map((choice) => choice.id),
            feedback,
            error: response.failure,
          };
        }
        case "not-sent":
          return { ...ready, feedback: "rejected", error: response.failure };
        case "unknown":
          setName("");
          setSelected([]);
          setPage(null);
          return { kind: "Save outcome unknown", error: response.failure };
        case "superseded":
          return previous;
      }
    },
    ready,
  );
  const unknown = stopped || result.kind === "Save outcome unknown";
  const clear = () => {
    setName("");
    setSelected([]);
  };
  const departure = useUnsavedInputGuard({
    dirty: !pending && !unknown && (name !== "" || selected.length !== 0),
    clear,
    stayTarget: input,
  });
  useLayoutEffect(() => {
    if (unknown) {
      summary.current?.focus();
      announce(intl.formatMessage(messages.coursesUnknown), "urgent");
    } else if (result.kind === "Form ready" && result.feedback !== null) {
      summary.current?.focus();
      announce(intl.formatMessage(messages.coursesValidationSummary), "urgent");
    }
  }, [result, unknown, announce, intl]);
  const load = async (offset: number) => {
    if (pending || selector.stateRef.current.kind === "Loading") return;
    selector.update({ kind: "Loading" });
    const response = await readAuthenticated((signal) =>
      listSupervisorCandidates(offset, signal),
    );
    if (!selector.mounted.current) return;
    if (response.kind === "completed") {
      setPage(response.value);
      selector.update({ kind: "Idle" });
      selectorHeading.current?.focus();
      if (response.value.offset !== page?.offset)
        announce(
          intl.formatMessage(messages.coursesPage, {
            page: Math.floor(response.value.offset / 25) + 1,
          }),
          "polite",
        );
    } else if (response.kind === "failed") {
      if (isHiddenCourseFailure(response.failure))
        unavailable(response.failure);
      else {
        selector.update({ kind: "Failed", error: response.failure });
        announce(intl.formatMessage(messages.coursesCheckFailed), "urgent");
      }
    }
  };
  if (unknown)
    return (
      <RouteRecoveryPanel
        heading={intl.formatMessage(messages.coursesUnknown)}
        headingRef={summary}
        actions={
          <RouteDepartureLink to={links.list} className={courseActionClass}>
            {intl.formatMessage(messages.coursesReview)}
          </RouteDepartureLink>
        }
      >
        <p>{intl.formatMessage(messages.coursesUnknownHelp)}</p>
        {result.kind === "Save outcome unknown" && result.error ? (
          <TechnicalErrorDisclosure error={result.error} />
        ) : null}
      </RouteRecoveryPanel>
    );
  const selectionErrorCurrent =
    result.kind === "Form ready" &&
    result.supervisorError &&
    result.supervisorErrorSelection.length === selected.length &&
    selected.every((choice) =>
      result.supervisorErrorSelection.includes(choice.id),
    );
  const errorState =
    result.kind === "Form ready"
      ? {
          ...result,
          supervisorError: selectionErrorCurrent,
          feedback:
            !selectionErrorCurrent &&
            (result.feedback === "supervisor" ||
              (result.feedback === "invalid" && !result.nameError))
              ? null
              : result.feedback,
        }
      : ready;
  const noCandidates =
    page !== null &&
    page.offset === 0 &&
    page.candidates.length === 0 &&
    page.nextOffset === null &&
    !page.hasMore &&
    selected.length === 0;
  return (
    <>
      {errorState.feedback ? (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="shrink-0">
              <XCircleIcon aria-hidden="true" className="size-5 text-red-400" />
            </div>
            <div className="ml-3 min-w-0">
              <h2
                ref={summary}
                tabIndex={-1}
                className="text-sm font-medium text-red-800"
              >
                {intl.formatMessage(messages.coursesValidationSummary)}
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                {errorState.nameError ? (
                  <li>
                    <a
                      href="#course-name"
                      onClick={(event) => {
                        event.preventDefault();
                        input.current?.focus();
                      }}
                    >
                      {intl.formatMessage(
                        errorState.feedback === "conflict"
                          ? messages.coursesNameConflict
                          : messages.coursesNameInvalid,
                      )}
                    </a>
                  </li>
                ) : null}
                {errorState.supervisorError ? (
                  <li>
                    <button
                      type="button"
                      onClick={() => selectorHeading.current?.focus()}
                    >
                      {intl.formatMessage(
                        errorState.feedback === "supervisor"
                          ? messages.coursesSupervisorInvalid
                          : messages.coursesSupervisorRequired,
                      )}
                    </button>
                  </li>
                ) : null}
                {errorState.feedback === "rejected" ? (
                  <li>{intl.formatMessage(messages.coursesRejected)}</li>
                ) : null}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
      <form action={action} noValidate autoComplete="off" className="space-y-6">
        <div>
          <label
            htmlFor="course-name"
            className="block text-sm/6 font-medium text-gray-900"
          >
            {intl.formatMessage(messages.coursesName)}
          </label>
          <div className="mt-2 grid grid-cols-1">
            <input
              ref={input}
              id="course-name"
              name="name"
              dir="auto"
              required
              autoComplete="off"
              value={name}
              readOnly={pending}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={errorState.nameError || undefined}
              aria-describedby={`course-name-help${errorState.nameError ? " course-name-error" : ""}`}
              className={
                errorState.nameError
                  ? "col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pr-10 pl-3 text-base text-red-900 outline-1 -outline-offset-1 outline-red-600 focus:outline-2 focus:-outline-offset-2 focus:outline-red-600 sm:pr-9 sm:text-sm/6"
                  : "col-start-1 row-start-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
              }
            />
            {errorState.nameError ? (
              <ExclamationCircleIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-red-500 sm:size-4"
              />
            ) : null}
          </div>
          <p id="course-name-help" className="mt-2 text-sm text-gray-700">
            {intl.formatMessage(messages.coursesNameHelp)}
          </p>
          {errorState.nameError ? (
            <p id="course-name-error" className="mt-2 text-sm text-red-600">
              {intl.formatMessage(
                errorState.feedback === "conflict"
                  ? messages.coursesNameConflict
                  : messages.coursesNameInvalid,
              )}
            </p>
          ) : null}
        </div>
        {page === null ? (
          <p className="text-sm/6 text-gray-700">
            {intl.formatMessage(messages.coursesPrerequisite)}
          </p>
        ) : (
          <SupervisorSelector
            page={page}
            selected={selected}
            busy={pending || selector.state.kind === "Loading"}
            headingRef={selectorHeading}
            error={
              errorState.supervisorError
                ? intl.formatMessage(
                    errorState.feedback === "supervisor"
                      ? messages.coursesSupervisorInvalid
                      : messages.coursesSupervisorRequired,
                  )
                : null
            }
            choose={(candidate, checked) =>
              setSelected(
                checked
                  ? selected.some((choice) => choice.id === candidate.id)
                    ? selected
                    : [...selected, candidate]
                  : selected.filter((choice) => choice.id !== candidate.id),
              )
            }
            load={(offset) => void load(offset)}
          />
        )}
        {selector.state.kind === "Failed" ? (
          <>
            <p className="text-sm text-gray-700">
              {intl.formatMessage(messages.coursesCheckFailed)}
            </p>
            <TechnicalErrorDisclosure error={selector.state.error} />
            <button
              type="button"
              className={courseActionClass}
              onClick={() => void load(page?.offset ?? 0)}
            >
              {intl.formatMessage(messages.mfaCheckAgain)}
            </button>
          </>
        ) : null}
        {noCandidates && links.invitation ? (
          <RouteDepartureLink
            to={links.invitation}
            className={courseActionClass}
          >
            {intl.formatMessage(messages.coursesInvite)}
          </RouteDepartureLink>
        ) : null}
        {errorState.error ? (
          <TechnicalErrorDisclosure error={errorState.error} />
        ) : null}
        <AuthSubmitButton
          enabled={
            canCreate &&
            !pending &&
            !noCandidates &&
            selector.state.kind === "Idle"
          }
          label={intl.formatMessage(
            pending ? messages.coursesSaving : messages.coursesCreateHeading,
          )}
        />
        {pending ? (
          <button
            type="button"
            className={courseActionClass}
            onClick={() => {
              liveAttempt.current = null;
              clear();
              setPage(null);
              setStopped(true);
            }}
          >
            {intl.formatMessage(messages.invitationsStopWaiting)}
          </button>
        ) : null}
        <RouteDepartureLink to={links.list} className={courseActionClass}>
          {intl.formatMessage(messages.coursesBackToList)}
        </RouteDepartureLink>
      </form>
      <DiscardChangesDialog
        departure={departure}
        title={intl.formatMessage(messages.coursesDiscard)}
        description={intl.formatMessage(messages.coursesDiscardHelp)}
      />
    </>
  );
}
