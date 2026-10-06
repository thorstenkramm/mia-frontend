import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useIntl } from "react-intl";
import type { MfaState } from "../../platform/api/mfa";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { useMfaEnrollment } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import type { MfaActivity } from "../../platform/session/mfaEnrollment";
import { outcomeView, progressMessage } from "./mfaOutcome";

// The progress text and settled result of the current MFA mutation. Each
// settled result is announced once through the shared owner.
export function MfaActivityFeedback({
  activity,
  state,
  focusResult = false,
}: {
  readonly activity: MfaActivity;
  readonly state: MfaState;
  readonly focusResult?: boolean;
}) {
  const intl = useIntl();
  const mfa = useMfaEnrollment();
  const { announce } = useAnnouncer();
  const announced = useRef<MfaActivity | null>(null);
  const feedback = useRef<HTMLHeadingElement>(null);
  const checkAgain = useRef<HTMLButtonElement>(null);
  const progress = progressMessage(activity);
  const view =
    activity.kind === "Settled" || activity.kind === "Reconcile failed"
      ? outcomeView(activity.outcome, state)
      : null;

  // Focus the actionable uncertainty, rather than suggesting the code is wrong.
  useLayoutEffect(() => {
    if (!focusResult) return;
    if (activity.kind === "Reconcile failed") checkAgain.current?.focus();
    else if (
      activity.kind === "Settled" &&
      activity.outcome.kind !== "code-invalid"
    )
      feedback.current?.focus();
  }, [activity, focusResult]);

  useEffect(() => {
    if (announced.current === activity) return;
    announced.current = activity;
    if (activity.kind === "Reconcile failed")
      announce(intl.formatMessage(messages.mfaCheckFailed), "urgent");
    else if (activity.kind === "Settled") {
      const settled = outcomeView(activity.outcome, state);
      announce(
        intl.formatMessage(settled.message),
        settled.problem ? "urgent" : "polite",
      );
    }
  }, [activity, announce, intl, state]);

  if (progress !== null)
    return (
      <p className="mt-6 text-sm/6 text-gray-600">
        {intl.formatMessage(progress)}
      </p>
    );
  if (view === null) return null;
  const wait =
    view.error?.kind === "http" &&
    view.message === messages.mfaSettingsThrottled
      ? view.error.retryAfterSeconds
      : null;
  if (!view.problem && activity.kind === "Settled")
    return (
      <p className="mt-6 text-sm/6 text-gray-900">
        {intl.formatMessage(view.message)}
      </p>
    );
  return (
    // Tailwind Plus: Application UI > Feedback > Alerts > With description, and
    // > With actions for a failed reconciliation read. v4/react-light.jsx,
    // library version 2026-09-13-083323. MIA uses an h2, wraps actions, and adds
    // the required inert raw-error disclosure.
    <div className="mt-6 rounded-md bg-yellow-50 p-4">
      <div className="flex">
        <div className="shrink-0">
          <ExclamationTriangleIcon
            aria-hidden="true"
            className="size-5 text-yellow-400"
          />
        </div>
        <div className="ml-3 min-w-0">
          <h2
            ref={feedback}
            tabIndex={-1}
            id={
              activity.kind === "Reconcile failed"
                ? undefined
                : "mfa-activity-outcome"
            }
            className="text-sm font-medium text-yellow-800"
          >
            {intl.formatMessage(
              activity.kind === "Reconcile failed"
                ? messages.mfaCheckFailed
                : view.message,
            )}
          </h2>
          <div className="mt-2 text-sm text-yellow-700">
            {activity.kind === "Reconcile failed" ? (
              <p id="mfa-activity-outcome">
                {intl.formatMessage(view.message)}
              </p>
            ) : null}
            {wait !== null ? (
              <p>{intl.formatMessage(messages.mfaWait, { seconds: wait })}</p>
            ) : null}
            {view.error !== null ? (
              <TechnicalErrorDisclosure error={view.error} />
            ) : null}
            {activity.kind === "Reconcile failed" ? (
              <TechnicalErrorDisclosure error={activity.error} />
            ) : null}
          </div>
          {activity.kind === "Reconcile failed" ? (
            <div className="mt-4">
              <div className="-mx-2 -my-1.5 flex flex-wrap gap-3">
                <button
                  ref={checkAgain}
                  type="button"
                  onClick={() => void mfa.recheck()}
                  className="rounded-md bg-yellow-50 px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
                >
                  {intl.formatMessage(messages.mfaCheckAgain)}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
