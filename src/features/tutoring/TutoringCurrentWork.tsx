import { useIntl } from "react-intl";
import type {
  StudentMessageProjection,
  TutorResponseState,
  TutoringWork,
} from "../../platform/api/tutoringSessions";
import { messages } from "../../platform/i18n/messages";

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
};

// Tailwind Plus: Application UI > Lists > Stacked Lists > Simple,
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas: one labelled
// <article> per current attempt keyed by its opaque response ID, the
// machine-13 speaker/attempt/state heading, escaped plain-text paragraphs
// with preserved line breaks, and no avatars, metadata column, links or
// actions. Renders the authoritative queued_work (student text + queued
// state) and generating_response (state + persisted partial content), plus a
// definitively sent message while the follow-up read is outstanding (D5
// dedup: response IDs already in the work document are not repeated).
export function TutoringCurrentWork({
  work,
  sent,
}: {
  readonly work: TutoringWork | null;
  readonly sent: readonly StudentMessageProjection[];
}) {
  const intl = useIntl();
  const articles: WorkArticle[] = [];
  if (work?.queued != null)
    articles.push({
      responseId: work.queued.response.id,
      speaker: messages.tutoringTurnYou,
      attempt: work.queued.response.attempt,
      state: work.queued.response.state,
      text: work.queued.content,
    });
  if (work?.generating != null)
    articles.push({
      responseId: work.generating.id,
      speaker: messages.tutoringTurnTutor,
      attempt: work.generating.attempt,
      state: work.generating.state,
      text: work.generating.content,
    });
  const known = new Set(articles.map((article) => article.responseId));
  for (const message of sent) {
    if (known.has(message.response.id)) continue;
    articles.push({
      responseId: message.response.id,
      speaker: messages.tutoringTurnYou,
      attempt: message.response.attempt,
      state: message.response.state,
      text: message.content,
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
                <p className="mt-1 text-sm/6 whitespace-pre-line wrap-anywhere text-gray-700">
                  {article.text}
                </p>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
