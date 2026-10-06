import { ExclamationTriangleIcon } from "@heroicons/react/20/solid";
import { useIntl } from "react-intl";
import { useEffect, useRef } from "react";
import { useAnnouncer } from "../platform/announcer/AnnouncementRegion";
import { TechnicalErrorDisclosure } from "../platform/api/TechnicalErrorDisclosure";
import {
  useAuthenticationBootstrapState,
  useSessionActions,
} from "../platform/data/EntryDataProvider";
import { messages } from "../platform/i18n/messages";
import { SimpleEntrySurface } from "./routes/SimpleEntrySurface";

// Tailwind Plus: Application UI > Feedback > Alerts > With actions, v4/react-light.jsx.
// Library version: 2026-09-13-083323. MIA uses warning colors/icon, an h2,
// wrapped actions, and a persistent non-modal status; there is no dismissal.
export function SessionWarning() {
  const intl = useIntl();
  const state = useAuthenticationBootstrapState();
  const { continueWorking, beginAuthenticatedLogout, stopLifecycleWaiting } =
    useSessionActions();
  const { announce, clear } = useAnnouncer();
  const previous = useRef<string | undefined>(undefined);
  const warningFocused = useRef(false);
  const continueButton = useRef<HTMLButtonElement>(null);
  const announced = useRef(false);
  const absoluteWarning =
    state.kind === "Authenticated" && state.absoluteWarning;
  const warning =
    state.kind === "Authenticated" && state.lifecycle !== undefined;
  const lifecycle =
    state.kind === "Authenticated" ? state.lifecycle : undefined;
  const error = state.kind === "Authenticated" ? state.error : undefined;
  useEffect(() => {
    const wasDispatching = previous.current === "Continue dispatching";
    if (
      wasDispatching &&
      lifecycle !== "Continue dispatching" &&
      warningFocused.current &&
      document.activeElement === document.body
    )
      (
        continueButton.current ?? document.querySelector<HTMLElement>("main h1")
      )?.focus({ preventScroll: true });
    if (
      previous.current === "Continue dispatching" &&
      state.kind === "Authenticated" &&
      (lifecycle === undefined || lifecycle === "Warning due")
    ) {
      announce(intl.formatMessage(messages.lifecycleSucceeded));
      announced.current = true;
    } else if (lifecycle === "Continue retryable") {
      announce(intl.formatMessage(messages.lifecycleNotSent));
      announced.current = true;
    } else if (lifecycle === "Warning due" && previous.current === undefined) {
      announce(
        intl.formatMessage(
          absoluteWarning
            ? messages.lifecycleAbsoluteWarning
            : messages.lifecycleWarning,
        ),
      );
      announced.current = true;
    } else if (!warning && announced.current) {
      clear();
      announced.current = false;
    }
    previous.current = lifecycle;
  }, [
    warning,
    lifecycle,
    error,
    state.kind,
    absoluteWarning,
    announce,
    clear,
    intl,
  ]);
  if (state.kind !== "Authenticated" || state.lifecycle === undefined)
    return null;
  return (
    <div
      className="mt-8 rounded-md bg-yellow-50 p-4"
      onFocusCapture={() => {
        warningFocused.current = true;
      }}
      onBlurCapture={(event) => {
        warningFocused.current = event.currentTarget.contains(
          event.relatedTarget,
        );
      }}
    >
      <div className="flex">
        <div className="shrink-0">
          <ExclamationTriangleIcon
            aria-hidden="true"
            className="size-5 text-yellow-400"
          />
        </div>
        <div className="ml-3 min-w-0">
          <div>
            <h2 className="text-sm font-medium text-yellow-800">
              {intl.formatMessage(
                absoluteWarning
                  ? messages.lifecycleAbsoluteWarning
                  : messages.lifecycleWarning,
              )}
            </h2>
            <p className="mt-2 text-sm text-yellow-700">
              {intl.formatMessage(
                absoluteWarning
                  ? messages.lifecycleAbsoluteHelp
                  : messages.lifecycleWarningHelp,
              )}
            </p>
            {state.lifecycle === "Continue retryable" ? (
              <p className="mt-2 text-sm text-yellow-700">
                {intl.formatMessage(messages.lifecycleNotSent)}
              </p>
            ) : null}
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex flex-wrap gap-3">
              {!absoluteWarning ? (
                <button
                  type="button"
                  ref={continueButton}
                  aria-disabled={state.lifecycle === "Continue dispatching"}
                  onClick={() => void continueWorking()}
                  className="rounded-md bg-yellow-50 px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600 aria-disabled:opacity-50"
                >
                  {intl.formatMessage(
                    state.lifecycle === "Continue retryable"
                      ? messages.lifecycleRetryContinue
                      : messages.lifecycleContinue,
                  )}
                </button>
              ) : null}
              {state.lifecycle === "Continue dispatching" ? (
                <button
                  type="button"
                  onClick={stopLifecycleWaiting}
                  className="rounded-md bg-yellow-50 px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
                >
                  {intl.formatMessage(messages.lifecycleStopWaiting)}
                </button>
              ) : null}
              <button
                type="button"
                onClick={beginAuthenticatedLogout}
                className="rounded-md bg-yellow-50 px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600"
              >
                {intl.formatMessage(messages.logoutButton)}
              </button>
            </div>
          </div>
          {state.error ? (
            <TechnicalErrorDisclosure error={state.error} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Privacy shield binding: Application UI > Forms > Sign-in and Registration >
// Simple card, v4/react-light.jsx, 2026-09-13-083323, via SimpleEntrySurface.
// No credentials or branding; the neutral surface replaces the protected tree.
// Actions: Application UI > Elements > Buttons > Secondary buttons, same version.
export function SessionPrivacyShield() {
  const intl = useIntl();
  const refreshButton = useRef<HTMLButtonElement>(null);
  const stopFocused = useRef(false);
  const announced = useRef(false);
  const state = useAuthenticationBootstrapState();
  const { refreshSession, beginAuthenticatedLogout, stopLifecycleWaiting } =
    useSessionActions();
  const { announce, clear } = useAnnouncer();
  const reason = state.kind === "Privacy shield" ? state.reason : undefined;
  const failure = state.kind === "Privacy shield" ? state.error : undefined;
  const phase = state.kind === "Privacy shield" ? state.phase : undefined;
  const feedback =
    reason === "deadline"
      ? messages.lifecycleDeadlineReached
      : reason === "continuation unknown"
        ? messages.lifecycleUnknown
        : reason === "continuation denied"
          ? messages.lifecycleDenied
          : reason === "recovery failed"
            ? messages.lifecycleRecoveryFailed
            : reason === "stopped"
              ? messages.lifecycleStopped
              : reason === "access lost"
                ? messages.lifecycleAccessLost
                : null;
  useEffect(() => {
    if (
      phase === "pending" &&
      stopFocused.current &&
      document.activeElement === document.body
    )
      refreshButton.current?.focus({ preventScroll: true });
    if (feedback) {
      announce(
        intl.formatMessage(feedback),
        reason === "deadline" ? "auth" : "polite",
      );
      announced.current = true;
    } else if (announced.current) {
      clear();
      announced.current = false;
    }
  }, [feedback, failure, phase, reason, announce, clear, intl]);
  if (state.kind !== "Privacy shield") return null;
  return (
    <SimpleEntrySurface
      titleMessage={messages.lifecycleShieldTitle}
      headingMessage={messages.lifecycleShieldHeading}
    >
      <p className="text-center text-sm/6 text-gray-600">
        {intl.formatMessage(messages.lifecycleShieldHelp)}
      </p>
      {feedback ? (
        <p className="mt-3 text-center text-sm/6 text-gray-600">
          {intl.formatMessage(feedback)}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          aria-disabled={state.phase === "checking"}
          ref={refreshButton}
          onClick={() => void refreshSession()}
          className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 aria-disabled:opacity-50"
        >
          {intl.formatMessage(messages.lifecycleRefresh)}
        </button>
        {state.phase === "checking" ? (
          <button
            type="button"
            onFocus={() => {
              stopFocused.current = true;
            }}
            onBlur={() => {
              stopFocused.current = false;
            }}
            onClick={() => {
              stopLifecycleWaiting();
              refreshButton.current?.focus();
            }}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {intl.formatMessage(messages.lifecycleStopWaiting)}
          </button>
        ) : null}
        {!state.anonymousOrigin ? (
          <button
            type="button"
            onClick={beginAuthenticatedLogout}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {intl.formatMessage(messages.logoutButton)}
          </button>
        ) : null}
      </div>
      {state.error ? <TechnicalErrorDisclosure error={state.error} /> : null}
    </SimpleEntrySurface>
  );
}
