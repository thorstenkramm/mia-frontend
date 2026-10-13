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
} from "../../platform/api/tutoringSessions";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { ModelMarkdown } from "../../platform/markdown/ModelMarkdown";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import {
  TutoringCheckedAt,
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

// ROUTE-INVENTORY.md §Tutoring Workspace, D3/D4: fixed identity, no course
// re-read. A non-active addressed session (or one whose authoritative work
// read reports completed) is the fixed finished notice without a transcript
// read; only an active owned session renders the FFR-613 notice, its
// persisted transcript, the current-work region and the composer.
export default function TutoringWorkspaceRoute(props: TutoringRouteProps) {
  if (props.resource.kind !== "workspace")
    throw new Error("The workspace requires its admitted session resource.");
  if (
    props.resource.session.state !== "active" ||
    props.resource.work?.sessionState === "completed"
  )
    return <SessionFinished links={props.links} />;
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

function SessionFinished({ links }: { readonly links: TutoringLinks }) {
  const intl = useIntl();
  return (
    <>
      <p className="text-sm/6 font-semibold text-gray-900">
        {intl.formatMessage(messages.tutoringSessionFinished)}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
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
  // The draft lives in page memory only, guarded by the send owner's
  // unsaved-input guard; nothing enters storage, URL text or history state.
  const [draft, setDraft] = useState("");
  const [unseen, setUnseen] = useState(false);
  const atEnd = useRef(true);
  const previousScroll = useRef(0);
  const previousContent = useRef("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const collection = useTutoringCollection(unavailable);
  const send = useStudentMessageSend({
    session: session.id,
    work,
    settle: (update) => {
      if (update.kind === "work") {
        setWork(update.work);
        setWorkKnown(true);
      } else if (update.kind === "committed") {
        setSent((current) => [...current, update.message]);
        setDraft("");
      } else setWorkKnown(false);
    },
    unavailable,
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
    unavailable,
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
  if (send.finished) return <SessionFinished links={links} />;
  const waiting =
    send.state.kind === "Sending" ||
    send.state.kind === "Checking" ||
    send.state.kind === "Reconciling";
  const locked = waiting || send.unknown || send.pending;
  // D5: one rendered identity per attempt — response IDs the current work (or
  // a definitive send) already renders leave the paginated transcript.
  const regionIds = new Set<string>();
  if (workKnown) {
    if (work.generating !== null) regionIds.add(work.generating.id);
    if (work.queued !== null) regionIds.add(work.queued.response.id);
  }
  for (const message of sent) regionIds.add(message.response.id);
  if (stream.persisted !== null) regionIds.add(stream.persisted.id);
  const turns = page.items.filter((turn) => !regionIds.has(turn.id));
  return (
    <>
      <TutoringEntryNotice />
      <h2 className="mt-6 text-base font-semibold text-gray-900">
        {intl.formatMessage(messages.tutoringTranscript)}
      </h2>
      <TutoringCheckedAt time={checkedAt} />
      <TutoringCollectionFeedback
        state={collection.state}
        retry={() => load(page.offset)}
      />
      {collection.state.kind === "Loading" ? null : turns.length === 0 &&
        page.items.length === 0 ? (
        <TutoringEmpty
          text={intl.formatMessage(messages.tutoringTranscriptEmpty)}
        />
      ) : (
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
      )}
      <TutoringPagination
        page={page}
        busy={collection.state.kind === "Loading"}
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
      />
      <TutoringCurrentWork
        work={workKnown ? work : null}
        sent={sent}
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
        submitEnabled={workKnown && send.enabled}
        onDraft={setDraft}
        action={send.action}
        guardSubmit={send.guardSubmit}
        inputRef={inputRef}
      />
      <div className="mt-6 flex flex-wrap items-center gap-3">
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
