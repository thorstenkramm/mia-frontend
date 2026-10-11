import { useLayoutEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import type { MaterialId } from "../../platform/api/entry";
import type { LearnCourse } from "../../platform/api/learnCourses";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { messages } from "../../platform/i18n/messages";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import {
  NotAcceptingSession,
  ResumeActiveSession,
  TutoringCheckedAt,
  tutoringActionClass,
} from "./SessionStartCourseChoiceRoute";
import { TutoringComposer } from "./TutoringComposer";
import type { TutoringRouteProps } from "./TutoringRouteProps";
import { useTutoringSessionBegin } from "./useTutoringSessionBegin";

// ROUTE-INVENTORY.md §Session Start Static Starters and §Free-Form Intent:
// one route hosting both presentations. The ordered gate (course re-read,
// then BCG-002 discovery) ran in the host; a found active session renders the
// 6.1 resume presentation and an ineligible course the truthful fixed copy.
export default function SessionStartIntentRoute(props: TutoringRouteProps) {
  if (props.resource.kind !== "intent")
    throw new Error("The intent route requires its admitted course resource.");
  if (props.resource.active !== null)
    return (
      <ResumeActiveSession
        session={props.resource.active}
        links={props.links}
      />
    );
  if (!props.resource.course.newSession.eligible)
    return (
      <NotAcceptingSession course={props.resource.course} links={props.links} />
    );
  return (
    <IntentCompose
      key={props.resource.course.id}
      props={props}
      course={props.resource.course}
      material={props.resource.material}
    />
  );
}

// FFR-611: the five frontend-owned static starters, localized per locale. The
// first four insert editable text; the free-form starter guides the next step
// by focusing the textarea. None ever submits.
const starters = [
  {
    label: messages.tutoringStarterHomework,
    text: messages.tutoringStarterHomeworkText,
  },
  {
    label: messages.tutoringStarterPractice,
    text: messages.tutoringStarterPracticeText,
  },
  {
    label: messages.tutoringStarterExplain,
    text: messages.tutoringStarterExplainText,
  },
  {
    label: messages.tutoringStarterExam,
    text: messages.tutoringStarterExamText,
  },
] as const;

function IntentCompose({
  props,
  course,
  material,
}: {
  readonly props: TutoringRouteProps;
  readonly course: LearnCourse;
  readonly material: MaterialId | null;
}) {
  const intl = useIntl();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const operation = useTutoringSessionBegin(
    course,
    material,
    props.links.workspace,
    props.unavailable,
    draft !== "",
  );
  const { status, feedback } = operation;
  useLayoutEffect(() => {
    if (feedback !== null) status.current?.focus();
  }, [feedback, status]);
  // A discovery reconciliation inside the begin owner found the one active
  // session: the compose form is replaced by the resume presentation. The
  // departure guard and its dialog stay mounted so a retained draft still
  // confirms before leaving.
  if (operation.activeSession !== null)
    return (
      <>
        <ResumeActiveSession
          session={operation.activeSession}
          links={props.links}
        />
        <IntentDepartureDialog operation={operation} />
      </>
    );
  const waiting =
    operation.state.kind === "Checking" ||
    operation.state.kind === "Starting" ||
    operation.state.kind === "Sending" ||
    operation.state.kind === "Reconciling";
  const locked = waiting || operation.unknown || operation.pending;
  const insertStarter = (text: string) => {
    setDraft((current) => (current === "" ? text : `${current}\n${text}`));
    inputRef.current?.focus();
  };
  return (
    <>
      <h2
        ref={status}
        tabIndex={-1}
        className="text-base font-semibold text-gray-900"
      >
        {intl.formatMessage(feedback ?? messages.tutoringIntentHeading)}
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
              : operation.state.kind === "Sending"
                ? messages.tutoringSending
                : messages.tutoringChecking,
          )}
        </p>
      ) : (
        <p className="mt-3 text-sm/6 text-gray-700">
          {intl.formatMessage(messages.tutoringIntentHelp)}
        </p>
      )}
      <h3 className="mt-6 text-sm/6 font-semibold text-gray-900">
        {intl.formatMessage(messages.tutoringStarters)}
      </h3>
      <div className="mt-3 flex flex-wrap gap-3">
        {starters.map((starter) => (
          <button
            key={starter.label.id}
            type="button"
            disabled={locked}
            onClick={() => insertStarter(intl.formatMessage(starter.text))}
            className={`${tutoringActionClass} disabled:opacity-50`}
          >
            {intl.formatMessage(starter.label)}
          </button>
        ))}
        <button
          type="button"
          disabled={locked}
          onClick={() => inputRef.current?.focus()}
          className={`${tutoringActionClass} disabled:opacity-50`}
        >
          {intl.formatMessage(messages.tutoringStarterFreeform)}
        </button>
      </div>
      <TutoringComposer
        card
        draft={draft}
        locked={locked}
        submitLabel={intl.formatMessage(messages.tutoringStart)}
        submitEnabled={operation.enabled}
        submitHidden={operation.unknown}
        onDraft={setDraft}
        action={operation.action}
        guardSubmit={operation.guardSubmit}
        inputRef={inputRef}
      />
      <div className="mt-6 flex flex-wrap items-center gap-3">
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
              to={props.links.material(course.id)}
              className={tutoringActionClass}
            >
              {intl.formatMessage(messages.tutoringMaterialHeading)}
            </RouteDepartureLink>
            <RouteDepartureLink
              to={props.links.courses}
              className={tutoringActionClass}
            >
              {intl.formatMessage(messages.learnCourses)}
            </RouteDepartureLink>
          </>
        ) : null}
      </div>
      <IntentDepartureDialog operation={operation} />
    </>
  );
}

// The departure dialog copy follows the attempt phase once one exists; a
// composed-but-never-submitted draft uses the draft copy. Shared by the
// compose and resume presentations so the guard is never mounted without
// its confirmation dialog.
function IntentDepartureDialog({
  operation,
}: {
  readonly operation: ReturnType<typeof useTutoringSessionBegin>;
}) {
  const intl = useIntl();
  return (
    <DiscardChangesDialog
      departure={operation.departure}
      title={intl.formatMessage(
        operation.attemptDirty
          ? operation.phase === "send"
            ? messages.tutoringSendUnknown
            : messages.tutoringStartUnknown
          : messages.tutoringDraftDiscard,
      )}
      description={intl.formatMessage(
        operation.attemptDirty
          ? operation.phase === "send"
            ? messages.tutoringSendLeave
            : messages.tutoringStartLeave
          : messages.tutoringDraftLeaveHelp,
      )}
    />
  );
}
