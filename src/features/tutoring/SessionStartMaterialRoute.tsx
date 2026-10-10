import { useLayoutEffect, useState } from "react";
import { useIntl } from "react-intl";
import {
  listApprovedCourseMaterialMetadata,
  type LearnCourse,
  type LearnMaterialPage,
} from "../../platform/api/learnCourses";
import type { EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { messages } from "../../platform/i18n/messages";
import { AuthSubmitButton } from "../../platform/ui/AuthSubmitButton";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import {
  NotAcceptingSession,
  ResumeActiveSession,
  TutoringCheckedAt,
  TutoringCollectionFeedback,
  TutoringPagination,
  tutoringActionClass,
  useTutoringCollection,
} from "./SessionStartCourseChoiceRoute";
import type { TutoringLinks } from "./TutoringRouteProps";
import { useTutoringSessionStart } from "./useTutoringSessionStart";
import type { TutoringRouteProps } from "./TutoringRouteProps";

// The material choice admits exactly one course (ordered gate) and renders
// the BCG-002 resume presentation or the not-accepting truth instead of the
// start form when the host's discovery or eligibility says so.
export default function SessionStartMaterialRoute(props: TutoringRouteProps) {
  if (props.resource.kind !== "material-choice")
    throw new Error("Material choice requires its admitted course resource.");
  if (props.resource.active !== null)
    return (
      <ResumeActiveSession
        session={props.resource.active}
        links={props.links}
      />
    );
  if (props.resource.page === null)
    return (
      <NotAcceptingSession course={props.resource.course} links={props.links} />
    );
  return (
    <MaterialChoice
      course={props.resource.course}
      initial={props.resource.page}
      links={props.links}
      unavailable={props.unavailable}
    />
  );
}

// Tailwind Plus: Application UI > Forms > Radio Groups > Simple list,
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas (D6): localized
// fieldset/legend, an explicit default "No material" option, per-option name
// plus kind/format description, opaque radio ids/values only, controlled
// selection that survives pagination, and the existing AuthSubmitButton start
// action with the machine-2 feedback owner. Metadata labels mirror the Learn
// surface's server-parsed kind/format maps; the cross-feature import is barred
// by the architecture rule, so the maps are jscpd-marked here and a note at
// features/courses/LearnCourseSurface.tsx points here.
// jscpd:ignore-start
const kindMessages = {
  "text-book": messages.materialTextBook,
  exam: messages.materialExam,
  worksheet: messages.materialWorksheet,
  website: messages.materialWebsite,
  youtube: messages.materialYoutube,
} as const;
const formatMessages = {
  pdf: messages.materialPdf,
  jpeg: messages.materialJpeg,
  png: messages.materialPng,
  text: messages.materialText,
  markdown: messages.materialMarkdown,
  docx: messages.materialDocx,
  link: messages.materialLink,
} as const;
// jscpd:ignore-end
const radioClass =
  "relative size-4 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:before:bg-gray-400 forced-colors:appearance-auto forced-colors:before:hidden";

function MaterialChoice({
  course,
  initial,
  links,
  unavailable,
}: {
  readonly course: LearnCourse;
  readonly initial: LearnMaterialPage;
  readonly links: TutoringLinks;
  readonly unavailable: (failure: EntryApiFailure | null) => void;
}) {
  const intl = useIntl();
  const operation = useTutoringSessionStart(
    course,
    links.workspace,
    unavailable,
  );
  const [page, setPage] = useState(initial);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  // The single optional selection is component state, so explicit pagination
  // never drops it; the dispatched payload is read from the form at submit.
  const [selection, setSelection] = useState("");
  const collection = useTutoringCollection(unavailable);
  const load = (offset: number) =>
    void collection.load(
      (signal) => listApprovedCourseMaterialMetadata(course.id, offset, signal),
      (value) => {
        setPage(value);
        setCheckedAt(Date.now());
        operation.status.current?.focus();
      },
    );
  const { status, feedback } = operation;
  useLayoutEffect(() => {
    if (feedback !== null) status.current?.focus();
  }, [feedback, status]);
  // A 409/discovery reconciliation inside the start owner found the one active
  // session: the start form is replaced by the resume presentation.
  if (operation.activeSession !== null)
    return (
      <ResumeActiveSession session={operation.activeSession} links={links} />
    );
  const waiting =
    operation.state.kind === "Checking" ||
    operation.state.kind === "Starting" ||
    operation.state.kind === "Reconciling";
  return (
    <>
      <h2
        ref={status}
        tabIndex={-1}
        className="text-base font-semibold text-gray-900"
      >
        {intl.formatMessage(feedback ?? messages.tutoringMaterialHeading)}
      </h2>
      <p className="mt-2 text-sm/6 text-gray-700 wrap-anywhere">
        <bdi>{operation.applied.name}</bdi>
      </p>
      <TutoringCheckedAt time={operation.checkedAt} />
      {operation.error !== null ? (
        <TechnicalErrorDisclosure error={operation.error} />
      ) : null}
      {waiting ? (
        <p className="mt-3 text-sm/6 text-gray-700">
          {intl.formatMessage(
            operation.state.kind === "Starting"
              ? messages.tutoringStarting
              : messages.tutoringChecking,
          )}
        </p>
      ) : null}
      <form
        onSubmit={operation.guardSubmit}
        action={operation.action}
        className="mt-6"
      >
        <fieldset>
          <legend className="text-sm/6 font-semibold text-gray-900">
            {intl.formatMessage(messages.tutoringMaterialLegend)}
          </legend>
          <p className="mt-1 text-sm/6 text-gray-600">
            {intl.formatMessage(messages.tutoringMaterialHelp)}
          </p>
          <div className="mt-6 space-y-6">
            <div className="flex items-center">
              <input
                id="material-none"
                name="material"
                type="radio"
                value=""
                checked={selection === ""}
                disabled={operation.pending}
                onChange={() => setSelection("")}
                className={radioClass}
              />
              <label
                htmlFor="material-none"
                className="ml-3 block text-sm/6 font-medium text-gray-900"
              >
                {intl.formatMessage(messages.tutoringNoMaterial)}
              </label>
            </div>
            {collection.state.kind === "Loading"
              ? null
              : page.items.map((item) => (
                  <div key={item.id} className="flex items-center">
                    <input
                      id={`material-${item.id}`}
                      name="material"
                      type="radio"
                      value={item.id}
                      checked={selection === item.id}
                      disabled={operation.pending}
                      onChange={() => setSelection(item.id)}
                      className={radioClass}
                    />
                    <label
                      htmlFor={`material-${item.id}`}
                      className="ml-3 block text-sm/6 font-medium text-gray-900"
                    >
                      <span className="wrap-anywhere">
                        <bdi>{item.name}</bdi>
                      </span>
                      <span className="block font-normal wrap-anywhere text-gray-500">
                        {intl.formatMessage(kindMessages[item.kind])} ·{" "}
                        {intl.formatMessage(formatMessages[item.format])}
                      </span>
                    </label>
                  </div>
                ))}
          </div>
        </fieldset>
        <TutoringCollectionFeedback
          state={collection.state}
          retry={() => load(page.offset)}
        />
        <TutoringCheckedAt time={checkedAt} />
        <TutoringPagination
          page={page}
          busy={collection.state.kind === "Loading"}
          load={load}
        />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {!operation.unknown ? (
            <AuthSubmitButton
              enabled={operation.enabled}
              label={intl.formatMessage(messages.tutoringStart)}
            />
          ) : null}
          {waiting ? (
            <button
              type="button"
              className={tutoringActionClass}
              onClick={operation.stop}
            >
              {intl.formatMessage(messages.lifecycleStopWaiting)}
            </button>
          ) : (
            <button
              type="button"
              className={tutoringActionClass}
              onClick={() => void operation.reconcile()}
            >
              {intl.formatMessage(messages.invitationsRefresh)}
            </button>
          )}
          {operation.canRetry ? (
            <button
              type="button"
              className={tutoringActionClass}
              onClick={() => void operation.retry()}
            >
              {intl.formatMessage(messages.tutoringRetry)}
            </button>
          ) : null}
          {operation.canAbandon ? (
            <button
              type="button"
              className={tutoringActionClass}
              onClick={operation.abandon}
            >
              {intl.formatMessage(messages.tutoringStartAbandon)}
            </button>
          ) : null}
          {!operation.pending && !operation.unknown ? (
            <>
              <RouteDepartureLink
                to={links.start}
                className={tutoringActionClass}
              >
                {intl.formatMessage(messages.tutoringChooseCourse)}
              </RouteDepartureLink>
              <RouteDepartureLink
                to={links.courses}
                className={tutoringActionClass}
              >
                {intl.formatMessage(messages.learnCourses)}
              </RouteDepartureLink>
            </>
          ) : null}
        </div>
      </form>
      <DiscardChangesDialog
        departure={operation.departure}
        title={intl.formatMessage(messages.tutoringStartUnknown)}
        description={intl.formatMessage(messages.tutoringStartLeave)}
      />
    </>
  );
}
