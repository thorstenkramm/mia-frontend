import { useIntl } from "react-intl";
import { messages } from "../../platform/i18n/messages";
import type { StreamView } from "./tutorStreamController";
import type { TutorResponseProjection } from "../../platform/api/tutoringSessions";

// Tailwind Plus: Application UI > Elements > Buttons > Secondary buttons,
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas: labelled
// transcript pause/resume and keyboard-reachable unseen/final response actions;
// native focus ring, minimum target and no auto-motion or automatic activation.
const actionClass =
  "rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

export function TutoringStreamControls({
  view,
  pause,
  resume,
  unseen,
  clearUnseen,
  finalChanged,
  retry,
  stopRetryWaiting,
  resumeRetries,
  newBound,
  stopTargets,
  stopResponse,
  retryResponse,
  retryResponseId,
  runRetry,
}: {
  readonly view: StreamView;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly unseen: boolean;
  readonly clearUnseen: () => void;
  readonly finalChanged: boolean;
  readonly retry: () => void;
  readonly stopRetryWaiting: () => void;
  readonly resumeRetries: () => void;
  readonly newBound: () => void;
  readonly stopTargets: readonly {
    readonly id: string;
    readonly state: "generating" | "queued";
    readonly attempt: number;
  }[];
  readonly stopResponse: (id: string) => void;
  readonly retryResponse: TutorResponseProjection | null;
  readonly retryResponseId: string | null;
  readonly runRetry: (messageId: string, parentId: string) => void;
}) {
  const intl = useIntl();
  if (
    view.responseId === null &&
    stopTargets.length === 0 &&
    retryResponseId === null
  )
    return null;
  const target = () => {
    document
      .getElementById(`tutoring-current-work-${view.responseId}`)
      ?.focus({ preventScroll: true });
    document
      .getElementById(`tutoring-current-work-${view.responseId}`)
      ?.scrollIntoView({ block: "start" });
    clearUnseen();
  };
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {view.retry === "waiting" || view.retry === "ready" ? (
        <>
          <p className="w-full text-sm/6 text-gray-700">
            {intl.formatMessage(
              view.retry === "ready"
                ? messages.tutoringReconnectAvailable
                : messages.tutoringStreamLost,
            )}
          </p>
          <button type="button" className={actionClass} onClick={retry}>
            {intl.formatMessage(messages.tutoringTryNow)}
          </button>
          <button
            type="button"
            className={actionClass}
            onClick={stopRetryWaiting}
          >
            {intl.formatMessage(messages.lifecycleStopWaiting)}
          </button>
        </>
      ) : view.retry === "paused" ? (
        <>
          <button type="button" className={actionClass} onClick={resumeRetries}>
            {intl.formatMessage(messages.tutoringResumeRetries)}
          </button>
          <button
            type="button"
            className={actionClass}
            onClick={() => {
              resumeRetries();
              retry();
            }}
          >
            {intl.formatMessage(messages.tutoringTryNow)}
          </button>
        </>
      ) : view.retry === "opening" ? (
        <button
          type="button"
          className={actionClass}
          onClick={stopRetryWaiting}
        >
          {intl.formatMessage(messages.lifecycleStopWaiting)}
        </button>
      ) : view.retry === "exhausted" ? (
        <>
          <p className="w-full text-sm/6 text-gray-700">
            {intl.formatMessage(messages.tutoringRetriesExhausted)}
          </p>
          <button type="button" className={actionClass} onClick={newBound}>
            {intl.formatMessage(messages.invitationTryAgain)}
          </button>
        </>
      ) : null}
      {stopTargets.map((target) => (
        <button
          key={target.id}
          type="button"
          className={actionClass}
          onClick={() => stopResponse(target.id)}
        >
          {intl.formatMessage(messages.tutoringStopResponse)}
          {" · "}
          {intl.formatMessage(
            target.state === "generating"
              ? messages.tutoringResponseGenerating
              : messages.tutoringResponseQueued,
          )}
          {" · "}
          {intl.formatMessage(messages.tutoringAttempt, {
            number: target.attempt,
          })}
        </button>
      ))}
      {retryResponseId === null ||
      retryResponse?.id !== retryResponseId ? null : (
        <button
          type="button"
          className={actionClass}
          onClick={() => runRetry(retryResponse.messageId, retryResponseId)}
        >
          {intl.formatMessage(messages.tutoringRetry)}
        </button>
      )}
      {view.kind === "Awaiting snapshot" ||
      view.kind === "Snapshot installed" ||
      view.kind === "Streaming" ? (
        <button
          type="button"
          className={actionClass}
          onClick={view.paused ? resume : pause}
        >
          {intl.formatMessage(
            view.paused
              ? messages.tutoringResumeUpdates
              : messages.tutoringPauseUpdates,
          )}
        </button>
      ) : view.paused ? (
        <button type="button" className={actionClass} onClick={resume}>
          {intl.formatMessage(messages.tutoringResumeUpdates)}
        </button>
      ) : null}
      {unseen ? (
        <button type="button" className={actionClass} onClick={target}>
          {intl.formatMessage(messages.tutoringNewContent)}
        </button>
      ) : null}
      {finalChanged ? (
        <button type="button" className={actionClass} onClick={target}>
          {intl.formatMessage(messages.tutoringViewFinal)}
        </button>
      ) : null}
    </div>
  );
}
