import { useState } from "react";
import { useIntl } from "react-intl";
import type { EntryApiFailure } from "../../platform/api/entry";
import {
  listSessionTurns,
  type SessionTurnPage,
  type TutoringSession,
  type TutorResponseState,
} from "../../platform/api/tutoringSessions";
import { messages } from "../../platform/i18n/messages";
import {
  TutoringCheckedAt,
  TutoringCollectionFeedback,
  TutoringEmpty,
  TutoringExits,
  TutoringPagination,
  useTutoringCollection,
} from "./SessionStartCourseChoiceRoute";
import { TutoringEntryNotice } from "./TutoringEntryNotice";
import type { TutoringLinks } from "./TutoringRouteProps";
import type { TutoringRouteProps } from "./TutoringRouteProps";

// ROUTE-INVENTORY.md §Tutoring Workspace, D3/D4: fixed identity, no course
// re-read. A non-active addressed session is the fixed finished notice without
// a transcript read; only an active owned session renders the FFR-613 notice
// and its persisted transcript.
export default function TutoringWorkspaceRoute(props: TutoringRouteProps) {
  if (props.resource.kind !== "workspace")
    throw new Error("The workspace requires its admitted session resource.");
  if (props.resource.session.state !== "active")
    return <SessionFinished {...props} />;
  if (props.resource.page === null)
    throw new Error("An active workspace requires its transcript page.");
  return (
    <Transcript
      session={props.resource.session}
      initial={props.resource.page}
      links={props.links}
      unavailable={props.unavailable}
    />
  );
}

function SessionFinished({ links }: TutoringRouteProps) {
  const intl = useIntl();
  return (
    <>
      <p className="text-sm/6 font-semibold text-gray-900">
        {intl.formatMessage(messages.tutoringSessionFinished)}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <TutoringExits links={links} />
      </div>
    </>
  );
}

// Neutral per-response truth for a persisted non-completed response; a
// completed response needs no label. No streaming or retry state exists here.
const responseLabels: Partial<
  Record<TutorResponseState, (typeof messages)[keyof typeof messages]>
> = {
  queued: messages.tutoringResponseQueued,
  generating: messages.tutoringResponseGenerating,
  interrupted: messages.tutoringResponseInterrupted,
  failed: messages.tutoringResponseFailed,
};

// Tailwind Plus: Application UI > Lists > Stacked Lists > Simple,
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas: one labelled
// <article> per turn keyed by its opaque response id, student and tutor text
// as escaped plain text paragraphs with preserved line breaks, a neutral
// response-state label only for non-completed responses, and no avatars,
// secondary metadata column, links or actions.
function Transcript({
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
  const [page, setPage] = useState(initial);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const collection = useTutoringCollection(unavailable);
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
      <TutoringEntryNotice />
      <h2 className="mt-6 text-base font-semibold text-gray-900">
        {intl.formatMessage(messages.tutoringTranscript)}
      </h2>
      <TutoringCheckedAt time={checkedAt} />
      <TutoringCollectionFeedback
        state={collection.state}
        retry={() => load(page.offset)}
      />
      {collection.state.kind === "Loading" ? null : page.items.length === 0 ? (
        <TutoringEmpty
          text={intl.formatMessage(messages.tutoringTranscriptEmpty)}
        />
      ) : (
        <ul role="list" className="mt-6 divide-y divide-gray-100">
          {page.items.map((turn, index) => {
            const label = responseLabels[turn.responseState];
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
                  <p className="mt-1 text-sm/6 whitespace-pre-line wrap-anywhere text-gray-700">
                    {turn.responseContent}
                  </p>
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
      <div className="mt-6 flex flex-wrap gap-3">
        <TutoringExits links={links} refresh />
      </div>
    </>
  );
}
