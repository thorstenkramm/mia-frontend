import { useIntl } from "react-intl";
import { messages } from "../../platform/i18n/messages";
import type { StreamView } from "./tutorStreamController";

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
}: {
  readonly view: StreamView;
  readonly pause: () => void;
  readonly resume: () => void;
  readonly unseen: boolean;
  readonly clearUnseen: () => void;
  readonly finalChanged: boolean;
}) {
  const intl = useIntl();
  if (view.responseId === null) return null;
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
