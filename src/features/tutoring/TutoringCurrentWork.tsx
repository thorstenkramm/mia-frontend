import { useIntl } from "react-intl";
import type {
  StudentMessageProjection,
  TutorResponseState,
  TutoringWork,
} from "../../platform/api/tutoringSessions";
import { messages } from "../../platform/i18n/messages";
import { ModelMarkdown } from "../../platform/markdown/ModelMarkdown";
import type { StreamView } from "./tutorStreamController";
import type { TutorResponseProjection } from "../../platform/api/tutoringSessions";

// Neutral per-response truth for a non-completed response; a completed
// response needs no label. Shared by the transcript and the current-work
// region so one attempt never carries two different state texts.
export const tutoringResponseLabels: Partial<
  Record<TutorResponseState, (typeof messages)[keyof typeof messages]>
> = {
  queued: messages.tutoringResponseQueued,
  generating: messages.tutoringResponseGenerating,
  interrupted: messages.tutoringResponseInterrupted,
  failed: messages.tutoringResponseFailed,
};

type WorkArticle = {
  // The stable response-ID identity (machine 13): one rendered article per
  // attempt, never a capacity or idleness inference.
  readonly responseId: string;
  readonly speaker: (typeof messages)[keyof typeof messages];
  readonly attempt: number;
  readonly state: TutorResponseState;
  readonly text: string;
  readonly tutor: boolean;
  readonly partial: boolean;
  readonly studentText?: string;
};

// Tailwind Plus: Application UI > Lists > Stacked Lists > Simple,
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas: one labelled
// <article> per current attempt keyed by its opaque response ID, the
// machine-13 speaker/attempt/state heading, escaped student text and locked Markdown
// with preserved line breaks, and no avatars, metadata column, links or
// actions. Renders the authoritative queued_work (student text + queued
// state) and generating_response (state + persisted partial content), plus a
// definitively sent message while the follow-up read is outstanding (D5
// dedup: response IDs already in the work document are not repeated).
export function TutoringCurrentWork({
  work,
  sent,
  linked,
  stream,
  persisted,
  pending,
}: {
  readonly work: TutoringWork | null;
  readonly sent: readonly StudentMessageProjection[];
  readonly linked: readonly TutorResponseProjection[];
  readonly stream: StreamView;
  readonly persisted: TutorResponseProjection | null;
  readonly pending: boolean;
}) {
  const intl = useIntl();
  const articles: WorkArticle[] = [];
  if (work?.queued != null)
    articles.push({
      responseId: work.queued.response.id,
      speaker:
        stream.responseId === work.queued.response.id &&
        stream.state === "generating"
          ? messages.tutoringTurnTutor
          : messages.tutoringTurnYou,
      attempt: work.queued.response.attempt,
      state:
        stream.responseId === work.queued.response.id &&
        (stream.state === "queued" || stream.state === "generating")
          ? stream.state
          : work.queued.response.state,
      text:
        stream.responseId === work.queued.response.id &&
        stream.state === "generating"
          ? stream.content
          : work.queued.content,
      tutor:
        stream.responseId === work.queued.response.id &&
        stream.state === "generating",
      partial:
        stream.responseId === work.queued.response.id &&
        stream.state === "generating",
      studentText: work.queued.content,
    });
  if (work?.generating != null)
    articles.push({
      responseId: work.generating.id,
      speaker: messages.tutoringTurnTutor,
      attempt: work.generating.attempt,
      state:
        stream.responseId === work.generating.id &&
        (stream.state === "queued" || stream.state === "generating")
          ? stream.state
          : work.generating.state,
      text:
        stream.responseId === work.generating.id && stream.state !== null
          ? stream.content
          : work.generating.content,
      tutor: true,
      partial: true,
    });
  if (persisted !== null) {
    const index = articles.findIndex(
      (article) => article.responseId === persisted.id,
    );
    const article: WorkArticle = {
      responseId: persisted.id,
      speaker: messages.tutoringTurnTutor,
      attempt: persisted.attempt,
      state: persisted.state,
      text: persisted.content,
      tutor: true,
      partial: false,
    };
    if (index === -1) articles.push(article);
    else articles[index] = article;
  }
  const retryParent =
    work !== null &&
    work.latest !== null &&
    work.actions.retryResponseId === work.latest.id
      ? work.latest
      : null;
  for (const response of [
    ...(retryParent === null ? [] : [retryParent]),
    ...linked,
  ]) {
    if (articles.some((article) => article.responseId === response.id))
      continue;
    articles.push({
      responseId: response.id,
      speaker: messages.tutoringTurnTutor,
      attempt: response.attempt,
      state: response.state,
      text: response.content,
      tutor: true,
      partial: response.state === "queued" || response.state === "generating",
    });
  }
  const known = new Set(articles.map((article) => article.responseId));
  for (const message of sent) {
    if (known.has(message.response.id)) continue;
    articles.push({
      responseId: message.response.id,
      speaker: messages.tutoringTurnYou,
      attempt: message.response.attempt,
      state: message.response.state,
      text: message.content,
      tutor: false,
      partial: false,
    });
  }
  if (articles.length === 0) return null;
  return (
    <section aria-labelledby="tutoring-current-work" className="mt-6">
      <h2
        id="tutoring-current-work"
        className="text-base font-semibold text-gray-900"
      >
        {intl.formatMessage(messages.tutoringCurrentWork)}
      </h2>
      <ul role="list" className="mt-4 divide-y divide-gray-100">
        {articles.map((article) => {
          const label = tutoringResponseLabels[article.state];
          return (
            <li key={article.responseId} className="py-5">
              <article
                aria-labelledby={`tutoring-current-work-${article.responseId}`}
              >
                <h3
                  id={`tutoring-current-work-${article.responseId}`}
                  tabIndex={-1}
                  className="text-sm/6 font-semibold text-gray-900"
                >
                  {intl.formatMessage(article.speaker)}
                  {" · "}
                  {intl.formatMessage(messages.tutoringAttempt, {
                    number: article.attempt,
                  })}
                  {label === undefined ? null : (
                    <span className="ml-2 text-xs/5 font-normal text-gray-500">
                      {intl.formatMessage(label)}
                    </span>
                  )}
                </h3>
                {article.tutor && article.studentText !== undefined ? (
                  <p className="mt-1 text-sm/6 whitespace-pre-line wrap-anywhere text-gray-700">
                    {article.studentText}
                  </p>
                ) : null}
                {article.tutor ? (
                  <ModelMarkdown
                    text={article.text}
                    context={intl.formatMessage(messages.tutoringTurnTutor)}
                    partial={article.partial}
                  />
                ) : (
                  <p className="mt-1 text-sm/6 whitespace-pre-line wrap-anywhere text-gray-700">
                    {article.text}
                  </p>
                )}
                {stream.responseId === article.responseId &&
                (stream.kind === "Transport lost" ||
                  stream.kind === "Protocol error") ? (
                  <p className="text-sm/6 text-gray-700">
                    {intl.formatMessage(
                      stream.kind === "Transport lost"
                        ? messages.tutoringStreamLost
                        : messages.tutoringStreamInvalid,
                    )}
                  </p>
                ) : null}
                {stream.responseId === article.responseId && pending ? (
                  <p className="text-sm/6 text-gray-700">
                    {intl.formatMessage(messages.tutoringFinalPending)}
                  </p>
                ) : null}
                {stream.responseId === article.responseId &&
                stream.kind === "Terminal known" &&
                !pending &&
                persisted === null &&
                !stream.paused ? (
                  <p className="text-sm/6 text-gray-700">
                    {intl.formatMessage(messages.tutoringFinalUnconfirmed)}
                  </p>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
