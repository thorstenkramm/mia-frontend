import { useLayoutEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import type { EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import {
  listSessionTurns,
  type SessionTurnPage,
  type StudentMessageProjection,
  type TutoringSession,
  type TutoringWork,
  type TutorResponseProjection,
} from "../../platform/api/tutoringSessions";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { ModelMarkdown } from "../../platform/markdown/ModelMarkdown";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import {
  TutoringCheckedAt,
  type TutoringCollectionActivity,
  TutoringCollectionFeedback,
  TutoringEmpty,
  TutoringPagination,
  tutoringActionClass,
  useTutoringCollection,
} from "./SessionStartCourseChoiceRoute";
import { TutoringComposer } from "./TutoringComposer";
import {
  TutoringCurrentWork,
  tutoringResponseLabels,
} from "./TutoringCurrentWork";
import { TutoringEntryNotice } from "./TutoringEntryNotice";
import { TutoringStreamControls } from "./TutoringStreamControls";
import { useTutorStream } from "./useTutorStream";
import type { TutoringLinks } from "./TutoringRouteProps";
import type { TutoringRouteProps } from "./TutoringRouteProps";
import { useStudentMessageSend } from "./useStudentMessageSend";
import { tutoringRetention } from "./tutoringRetention";
import { TutorStreamController } from "./tutorStreamController";
import { useTutorResponseActions } from "./useTutorResponseActions";
import { useAuthenticatedAccess } from "../../platform/data/EntryDataProvider";
import { useLocation } from "react-router";

// ROUTE-INVENTORY.md §Tutoring Workspace and Story 6.5's completed-in-place
// exception: only a completed addressed session admits a persisted read-only
// transcript. Active sessions retain their current-work/composer/stream owner.
export default function TutoringWorkspaceRoute(props: TutoringRouteProps) {
  if (props.resource.kind !== "workspace")
    throw new Error("The workspace requires its admitted session resource.");
  if (props.resource.session.state === "completed") {
    if (props.resource.page === null)
      throw new Error(
        "Completed transcript requires admitted persisted turns.",
      );
    return (
      <SessionFinished
        session={props.resource.session}
        initial={props.resource.page}
        links={props.links}
        unavailable={props.unavailable}
      />
    );
  }
  if (props.resource.work?.sessionState === "completed")
    return <CompletionObserved />;
  if (props.resource.page === null || props.resource.work === null)
    throw new Error("An active workspace requires its work and transcript.");
  return (
    <Transcript
      session={props.resource.session}
      initial={props.resource.page}
      initialWork={props.resource.work}
      links={props.links}
      unavailable={props.unavailable}
    />
  );
}

function CompletionObserved() {
  const intl = useIntl();
  const { checkRouteAdmission } = useSessionActions();
  useLayoutEffect(() => tutoringRetention.destroy(), []);
  return (
    <>
      <p className="text-sm/6 text-gray-700">
        {intl.formatMessage(messages.tutoringFinishChanged)}
      </p>
      <button
        type="button"
        className={tutoringActionClass}
        onClick={() => void checkRouteAdmission()}
      >
        {intl.formatMessage(messages.invitationsRefresh)}
      </button>
    </>
  );
}

function SessionFinished({
  session,
  initial,
  links,
  unavailable,
}: {
  readonly session: TutoringSession;
  readonly initial: SessionTurnPage;
  readonly links: TutoringLinks;
  readonly unavailable: (failure: EntryApiFailure | null) => void;
}) {
  const intl = useIntl();
  useLayoutEffect(() => tutoringRetention.destroy(), []);
  const collection = useTutoringCollection(unavailable);
  const [page, setPage] = useState(initial);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const load = (offset: number) =>
    void collection.load(
      (signal) => listSessionTurns(session.id, offset, signal),
      (value) => {
        setPage(value);
        setCheckedAt(Date.now());
      },
    );
  return (
    <>
      <p className="text-sm/6 font-semibold text-gray-900">
        {intl.formatMessage(messages.tutoringSessionFinished)}
      </p>
      <TranscriptCollection
        page={page}
        turns={page.items}
        checkedAt={checkedAt}
        state={collection.state}
        load={load}
      />
      <div className="mt-6 flex flex-wrap gap-3">
        <RouteDepartureLink to={links.start} className={tutoringActionClass}>
          {intl.formatMessage(messages.tutoringStartLink)}
        </RouteDepartureLink>
        <RouteDepartureLink to={links.courses} className={tutoringActionClass}>
          {intl.formatMessage(messages.learnCourses)}
        </RouteDepartureLink>
        <RouteDepartureLink to={links.home} className={tutoringActionClass}>
          {intl.formatMessage(messages.invitationsBackToHome)}
        </RouteDepartureLink>
      </div>
    </>
  );
}

// Tailwind Plus: Application UI > Lists > Stacked Lists > Simple,
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas: one labelled
// <article> per turn keyed by its opaque response id, student and tutor text
// as escaped plain text paragraphs with preserved line breaks, a neutral
// response-state label only for non-completed responses, and no avatars,
// secondary metadata column, links or actions. Story 6.2 adds the
// current-work region and composer below the transcript; D5 suppresses
// transcript turns whose response IDs the current work already renders, so
// each attempt has exactly one stable rendered identity.
function Transcript({
  session,
  initial,
  initialWork,
  links,
  unavailable,
}: {
  readonly session: TutoringSession;
  readonly initial: SessionTurnPage;
  readonly initialWork: TutoringWork;
  readonly links: TutoringLinks;
  readonly unavailable: (failure: EntryApiFailure | null) => void;
}) {
  const intl = useIntl();
  const access = useAuthenticatedAccess();
  const location = useLocation();
  if (access === null)
    throw new Error("Tutoring workspace requires admitted access.");
  const retention = tutoringRetention.claim(
    location.pathname,
    access.accountId,
    access.epoch,
    session.id,
    () => new TutorStreamController(),
  );
  const hide = (failure: EntryApiFailure | null) => {
    tutoringRetention.destroy();
    unavailable(failure);
  };
  const { checkRouteAdmission } = useSessionActions();
  const [page, setPage] = useState(initial);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  // The authoritative work state: admitted with the route, then only the send
  // owner's D4 follow-up, reconcile or an explicit route Refresh replaces it.
  const [work, setWork] = useState(initialWork);
  // False only after a definitive send whose follow-up read failed: the
  // committed message still renders, the composer stays covered (criterion 7).
  const [workKnown, setWorkKnown] = useState(true);
  // Definitively sent this page lifetime; rendered from the mutation document
  // until an authoritative work read carries the same response ID (D5).
  const [sent, setSent] = useState<readonly StudentMessageProjection[]>([]);
  const [linked, setLinked] = useState<readonly TutorResponseProjection[]>([]);
  // The draft lives in page memory only, guarded by the send owner's
  // unsaved-input guard; nothing enters storage, URL text or history state.
  const [draft, setDraft] = useState(() => retention.draft);
  const changeDraft = (value: string) => {
    retention.draft = value;
    setDraft(value);
  };
  const [unseen, setUnseen] = useState(false);
  const atEnd = useRef(true);
  const previousScroll = useRef(0);
  const previousContent = useRef("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const collection = useTutoringCollection(hide);
  const send = useStudentMessageSend({
    session: session.id,
    work,
    settle: (update) => {
      if (update.kind === "work") {
        setWork(update.work);
        setWorkKnown(true);
      } else if (update.kind === "committed") {
        setSent((current) => [...current, update.message]);
        changeDraft("");
      } else setWorkKnown(false);
    },
    unavailable: hide,
    hasContent: draft !== "",
  });
  const { status, feedback } = send;
  const stream = useTutorStream({
    session: session.id,
    work: workKnown && !send.finished ? work : null,
    installWork: (value) => {
      setWork(value);
      setWorkKnown(true);
    },
    unavailable: hide,
    retention,
  });
  const actions = useTutorResponseActions({
    session: session.id,
    work,
    install: (next, response) => {
      stream.fenceWork();
      if (response !== undefined) {
        if (stream.view.responseId === response.id)
          stream.recordTerminal(response);
        else
          setLinked((previous) => [
            ...previous.filter((item) => item.id !== response.id),
            response,
          ]);
      }
      setWork(next);
      setWorkKnown(true);
    },
    unavailable: hide,
    retention,
    linked: (response) =>
      setLinked((previous) => [
        ...previous.filter((item) => item.id !== response.id),
        response,
      ]),
  });
  useLayoutEffect(() => {
    const check = () => {
      previousScroll.current = window.scrollY;
      atEnd.current =
        document.documentElement.scrollHeight -
          (window.scrollY + window.innerHeight) <
        24;
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  useLayoutEffect(() => {
    const value = stream.view.content + (stream.persisted?.content ?? "");
    if (value === previousContent.current) return;
    previousContent.current = value;
    if (atEnd.current && !stream.view.paused)
      window.scrollTo(0, document.documentElement.scrollHeight);
    else {
      window.scrollTo(0, previousScroll.current);
      setUnseen(true);
    }
  }, [stream.view.content, stream.view.paused, stream.persisted]);
  useLayoutEffect(() => {
    if (feedback !== null) status.current?.focus();
  }, [feedback, status]);
  const load = (offset: number) =>
    void collection.load(
      (signal) => listSessionTurns(session.id, offset, signal),
      (value) => {
        setPage(value);
        setCheckedAt(Date.now());
      },
    );
  // The session completed mid-view (409 tutoring_invalid_state or a reconcile
  // truth): the fixed read-only finished presentation replaces the workspace.
  if (send.finished) return <CompletionObserved />;
  const waiting =
    send.state.kind === "Sending" ||
    send.state.kind === "Checking" ||
    send.state.kind === "Reconciling";
  const locked =
    waiting || send.unknown || send.pending || actions.state.kind !== "ready";
  const finishUnknown = tutoringRetention.finishUnresolved(
    access.accountId,
    access.epoch,
    session.id,
  );
  const finishEligible =
    workKnown &&
    !locked &&
    !finishUnknown &&
    work.sessionState === "active" &&
    work.state === "idle" &&
    work.generating === null &&
    work.queued === null &&
    work.actions.finish;
  // D5: one rendered identity per attempt — response IDs the current work (or
  // a definitive send) already renders leave the paginated transcript.
  const regionIds = new Set<string>();
  if (workKnown) {
    if (work.generating !== null) regionIds.add(work.generating.id);
    if (work.queued !== null) regionIds.add(work.queued.response.id);
  }
  for (const message of sent) regionIds.add(message.response.id);
  if (stream.persisted !== null) regionIds.add(stream.persisted.id);
  for (const response of linked) regionIds.add(response.id);
  if (work.latest !== null && work.actions.retryResponseId === work.latest.id)
    regionIds.add(work.latest.id);
  const turns = page.items.filter((turn) => !regionIds.has(turn.id));
  return (
    <>
      <TutoringEntryNotice />
      <TranscriptCollection
        page={page}
        turns={turns}
        checkedAt={checkedAt}
        state={collection.state}
        load={load}
      />
      <TutoringStreamControls
        view={stream.view}
        pause={stream.pause}
        resume={stream.resume}
        unseen={unseen}
        clearUnseen={() => setUnseen(false)}
        finalChanged={
          stream.persisted !== null &&
          stream.view.content !== stream.persisted.content
        }
        retry={stream.tryNow}
        stopRetryWaiting={stream.stopWaiting}
        resumeRetries={stream.resumeRetries}
        newBound={stream.newBound}
        stopTargets={
          workKnown && actions.state.kind === "ready"
            ? work.actions.stopResponseIds.map((id) => {
                if (work.generating?.id === id)
                  return {
                    id,
                    state: "generating" as const,
                    attempt: work.generating.attempt,
                  };
                if (work.queued?.response.id === id)
                  return {
                    id,
                    state: "queued" as const,
                    attempt: work.queued.response.attempt,
                  };
                throw new Error(
                  "An eligible Stop target requires current work.",
                );
              })
            : []
        }
        stopResponse={actions.stop}
        retryResponse={
          workKnown && actions.state.kind === "ready" ? work.latest : null
        }
        retryResponseId={workKnown ? work.actions.retryResponseId : null}
        runRetry={actions.retry}
      />
      {actions.state.kind === "stopping" ||
      actions.state.kind === "retrying" ? (
        <button
          type="button"
          className={tutoringActionClass}
          onClick={actions.stopWaiting}
        >
          {intl.formatMessage(messages.lifecycleStopWaiting)}
        </button>
      ) : null}
      {actions.state.kind === "stop unknown" ||
      actions.state.kind === "retry unknown" ||
      actions.state.kind === "rejected" ||
      actions.state.kind === "work unknown" ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <p className="w-full text-sm/6 text-gray-700">
            {intl.formatMessage(
              actions.state.kind === "stop unknown"
                ? messages.tutoringStopUnknown
                : actions.state.kind === "retry unknown"
                  ? messages.tutoringResponseRetryUnknown
                  : actions.state.kind === "work unknown"
                    ? messages.tutoringCheckFailed
                    : messages.tutoringActionRejected,
            )}
          </p>
          <button
            type="button"
            className={tutoringActionClass}
            onClick={() => void actions.reconcile()}
          >
            {intl.formatMessage(messages.invitationsRefresh)}
          </button>
          {actions.state.kind === "retry unknown" &&
          actions.retryBound !== null ? (
            <button
              type="button"
              className={tutoringActionClass}
              onClick={() =>
                void actions.retry(
                  actions.retryBound!.messageId,
                  actions.retryBound!.parentId,
                )
              }
            >
              {intl.formatMessage(messages.tutoringRetry)}
            </button>
          ) : null}
        </div>
      ) : null}
      <TutoringCurrentWork
        work={workKnown ? work : null}
        sent={sent}
        linked={linked}
        stream={stream.view}
        persisted={stream.persisted}
        pending={stream.pending}
      />
      <h2
        ref={status}
        tabIndex={-1}
        className="mt-6 text-base font-semibold text-gray-900"
      >
        {intl.formatMessage(feedback ?? messages.tutoringComposerHeading)}
      </h2>
      {send.error !== null ? (
        <TechnicalErrorDisclosure error={send.error} />
      ) : null}
      {waiting ? (
        <p className="mt-3 text-sm/6 text-gray-700">
          {intl.formatMessage(
            send.state.kind === "Sending"
              ? messages.tutoringSending
              : messages.tutoringChecking,
          )}
        </p>
      ) : null}
      <TutoringComposer
        draft={draft}
        locked={locked}
        submitLabel={intl.formatMessage(
          workKnown && !work.actions.submit && work.actions.queue
            ? messages.tutoringQueueMessage
            : messages.tutoringSend,
        )}
        submitEnabled={
          workKnown && actions.state.kind === "ready" && send.enabled
        }
        onDraft={changeDraft}
        action={send.action}
        guardSubmit={send.guardSubmit}
        inputRef={inputRef}
      />
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {finishEligible ? (
          <RouteDepartureLink
            to={links.finish(session.id)}
            className={tutoringActionClass}
          >
            {intl.formatMessage(messages.tutoringFinishHeading)}
          </RouteDepartureLink>
        ) : (
          <button
            type="button"
            className={tutoringActionClass}
            disabled
            aria-describedby="finish-unavailable"
          >
            {intl.formatMessage(messages.tutoringFinishHeading)}
          </button>
        )}
        {!finishEligible ? (
          <p id="finish-unavailable" className="w-full text-sm/6 text-gray-700">
            {intl.formatMessage(
              finishUnknown
                ? messages.tutoringFinishUnknown
                : messages.tutoringFinishUnavailable,
            )}
          </p>
        ) : null}
        {finishUnknown ? (
          <RouteDepartureLink
            to={links.finish(session.id)}
            className={tutoringActionClass}
          >
            {intl.formatMessage(messages.tutoringFinishCheckOutcome)}
          </RouteDepartureLink>
        ) : null}
        {waiting ? (
          <button
            type="button"
            className={tutoringActionClass}
            onClick={send.stop}
          >
            {intl.formatMessage(messages.lifecycleStopWaiting)}
          </button>
        ) : send.unknown ? (
          <button
            type="button"
            className={tutoringActionClass}
            onClick={() => void send.reconcile()}
          >
            {intl.formatMessage(messages.invitationsRefresh)}
          </button>
        ) : (
          <button
            type="button"
            className={tutoringActionClass}
            onClick={() => void checkRouteAdmission()}
          >
            {intl.formatMessage(messages.invitationsRefresh)}
          </button>
        )}
        {send.canRetry ? (
          <button
            type="button"
            className={tutoringActionClass}
            onClick={() => void send.retry()}
          >
            {intl.formatMessage(messages.tutoringRetry)}
          </button>
        ) : null}
        {send.canAbandon ? (
          <button
            type="button"
            className={tutoringActionClass}
            onClick={send.abandon}
          >
            {intl.formatMessage(messages.tutoringStartAbandon)}
          </button>
        ) : null}
        {!send.pending && !send.unknown ? (
          <>
            <RouteDepartureLink
              to={links.courses}
              className={tutoringActionClass}
            >
              {intl.formatMessage(messages.learnCourses)}
            </RouteDepartureLink>
            <RouteDepartureLink to={links.home} className={tutoringActionClass}>
              {intl.formatMessage(messages.invitationsBackToHome)}
            </RouteDepartureLink>
          </>
        ) : null}
      </div>
      <DiscardChangesDialog
        departure={send.departure}
        title={intl.formatMessage(
          send.attemptDirty
            ? messages.tutoringSendUnknown
            : messages.tutoringDraftDiscard,
        )}
        description={intl.formatMessage(
          send.attemptDirty
            ? messages.tutoringSendLeave
            : messages.tutoringDraftLeaveHelp,
        )}
      />
    </>
  );
}

// One persisted-turn collection for both the active and completed workspace.
// Each owner supplies its own visible turns and authorized page loader.
function TranscriptCollection({
  page,
  turns,
  checkedAt,
  state,
  load,
}: {
  readonly page: SessionTurnPage;
  readonly turns: SessionTurnPage["items"];
  readonly checkedAt: number;
  readonly state: TutoringCollectionActivity;
  readonly load: (offset: number) => void;
}) {
  const intl = useIntl();
  return (
    <>
      <h2 className="mt-6 text-base font-semibold text-gray-900">
        {intl.formatMessage(messages.tutoringTranscript)}
      </h2>
      <TutoringCheckedAt time={checkedAt} />
      <TutoringCollectionFeedback
        state={state}
        retry={() => load(page.offset)}
      />
      {state.kind !== "Loading" && (
        <TranscriptTurns page={page} turns={turns} />
      )}
      <TutoringPagination
        page={page}
        busy={state.kind === "Loading"}
        load={load}
      />
    </>
  );
}

// Same exact Tailwind Plus stacked-list anatomy for active and completed
// persisted turns. No current-work or stream content enters the read-only path.
function TranscriptTurns({
  page,
  turns,
}: {
  readonly page: SessionTurnPage;
  readonly turns: SessionTurnPage["items"];
}) {
  const intl = useIntl();
  if (page.items.length === 0)
    return (
      <TutoringEmpty
        text={intl.formatMessage(messages.tutoringTranscriptEmpty)}
      />
    );
  return (
    <ul role="list" className="mt-6 divide-y divide-gray-100">
      {turns.map((turn, index) => {
        const label = tutoringResponseLabels[turn.responseState];
        return (
          <li key={turn.id} className="py-5">
            <article
              aria-label={intl.formatMessage(messages.tutoringTurn, {
                number: page.offset + index + 1,
              })}
            >
              <p className="text-sm/6 font-semibold text-gray-900">
                {intl.formatMessage(messages.tutoringTurnYou)}
              </p>
              <p className="mt-1 text-sm/6 whitespace-pre-line wrap-anywhere text-gray-700">
                {turn.studentContent}
              </p>
              <p className="mt-4 text-sm/6 font-semibold text-gray-900">
                {intl.formatMessage(messages.tutoringTurnTutor)}
                {label === undefined ? null : (
                  <span className="ml-2 text-xs/5 font-normal text-gray-500">
                    {intl.formatMessage(label)}
                  </span>
                )}
              </p>
              <ModelMarkdown
                text={turn.responseContent}
                context={intl.formatMessage(messages.tutoringTurnTutor)}
                partial={
                  turn.responseState === "queued" ||
                  turn.responseState === "generating"
                }
              />
            </article>
          </li>
        );
      })}
    </ul>
  );
}
