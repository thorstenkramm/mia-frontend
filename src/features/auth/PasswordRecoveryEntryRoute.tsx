// Tailwind Plus: Application UI > Forms > Sign-in and Registration > Simple card
// Tailwind Plus: Application UI > Feedback > Alerts > With actions (accepted result)
// Library version: 2026-09-13-083323, v4 React light. MIA keeps one username field and
// the primary submit, adds outcome status and disclosure, and replaces the alert's
// buttons with one Back to sign-in link. Branding, password, and social are omitted.
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import { useActionState, useLayoutEffect, useRef } from "react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import type { EntryApiFailure } from "../../platform/api/entry";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import type { PublicMutationResult } from "../../platform/session/sessionController";
import { AuthSubmitButton } from "./AuthSubmitButton";

// FRONTEND-STATE-MACHINES.md §1, Story 1-6 recovery states. `Submitting` is the
// form action's pending phase.
type RecoveryState =
  | { readonly kind: "Form ready" }
  | { readonly kind: "Submitting" }
  | { readonly kind: "Accepted" }
  | {
      readonly kind: "CSRF rejected";
      readonly error: EntryApiFailure;
      readonly refreshError?: EntryApiFailure;
    }
  | { readonly kind: "Failed"; readonly error: EntryApiFailure }
  | { readonly kind: "Outcome unknown"; readonly error: EntryApiFailure };

const formReady: RecoveryState = { kind: "Form ready" };

export default function PasswordRecoveryEntryRoute() {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { requestPasswordRecovery } = useSessionActions();
  const acceptedHeadingRef = useRef<HTMLHeadingElement>(null);
  // The route's lifetime: a request still waiting for the coordinator when the
  // route is left is never sent.
  const mounted = useRef(false);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [settled, submit, pending] = useActionState(
    async (_: RecoveryState, data: FormData): Promise<RecoveryState> => {
      const username = data.get("username");
      data.delete("username");
      if (typeof username !== "string") return formReady;
      announce(intl.formatMessage(messages.recoverySubmitting), "polite");
      const next = recoveryState(
        await requestPasswordRecovery(username, () => mounted.current),
      );
      const status = statusMessage(next);
      if (status !== null)
        announce(
          intl.formatMessage(status),
          next.kind === "Accepted" ? "polite" : "urgent",
        );
      return next;
    },
    formReady,
  );
  const state: RecoveryState = pending ? { kind: "Submitting" } : settled;

  useLayoutEffect(() => {
    if (settled.kind === "Accepted") acceptedHeadingRef.current?.focus();
  }, [settled]);

  if (state.kind === "Accepted") {
    return (
      <div className="mt-8 rounded-md bg-green-50 p-4">
        <div className="flex">
          <div className="shrink-0">
            <CheckCircleIcon
              aria-hidden="true"
              className="size-5 text-green-400"
            />
          </div>
          <div className="ml-3 min-w-0">
            <h2
              ref={acceptedHeadingRef}
              tabIndex={-1}
              className="text-sm font-medium text-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              {intl.formatMessage(messages.recoveryAcceptedHeading)}
            </h2>
            <div className="mt-2 text-sm text-green-700">
              <p>{intl.formatMessage(messages.recoveryAccepted)}</p>
            </div>
            <div className="mt-4">
              <div className="-mx-2 -my-1.5 flex">
                <Link
                  to="/login"
                  className="rounded-md bg-green-50 px-2 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                  {intl.formatMessage(messages.backToSignIn)}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const status = statusMessage(state);
  const error = "error" in state ? state.error : undefined;
  const enabled = state.kind !== "Submitting";
  return (
    <>
      <p className="text-center text-sm/6 text-gray-600">
        {intl.formatMessage(messages.recoveryIntroduction)}
      </p>
      <div className="mt-8 bg-white px-6 py-12 shadow-sm sm:rounded-lg sm:px-12">
        <form
          action={submit}
          onSubmit={(event) => {
            if (!enabled) event.preventDefault();
          }}
          onReset={(event) => event.preventDefault()}
          className="space-y-6"
        >
          {/* Cancel React's native form reset so the username survives every
              outcome; it never becomes action, controlled, or global state. */}
          <div>
            <label
              htmlFor="recovery-username"
              className="block text-sm/6 font-medium text-gray-900"
            >
              {intl.formatMessage(messages.loginUsername)}
            </label>
            <div className="mt-2">
              <input
                id="recovery-username"
                name="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                dir="ltr"
                required
                readOnly={!enabled}
                aria-disabled={!enabled}
                aria-describedby="recovery-status"
                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
              />
            </div>
          </div>
          <AuthSubmitButton
            enabled={enabled}
            label={intl.formatMessage(
              state.kind === "Outcome unknown"
                ? messages.recoverySendAgain
                : messages.recoverySubmit,
            )}
          />
          {/* Visible status only; the shared announcement owner speaks results. */}
          <p id="recovery-status" className="text-sm/6 text-gray-900">
            {status === null ? null : intl.formatMessage(status)}
          </p>
          {error === undefined ? null : (
            <TechnicalErrorDisclosure error={error} />
          )}
          {state.kind === "CSRF rejected" &&
          state.refreshError !== undefined ? (
            <TechnicalErrorDisclosure error={state.refreshError} />
          ) : null}
          <p className="text-sm/6">
            <Link
              to="/login"
              className="inline-block min-h-6 font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {intl.formatMessage(messages.backToSignIn)}
            </Link>
          </p>
        </form>
      </div>
    </>
  );
}

function recoveryState(result: PublicMutationResult): RecoveryState {
  switch (result.kind) {
    case "completed":
      return { kind: "Accepted" };
    case "rejected":
    case "not-sent":
      return { kind: "Failed", error: result.failure };
    case "csrf-rejected":
      return {
        kind: "CSRF rejected",
        error: result.failure,
        ...(result.refreshFailure === undefined
          ? {}
          : { refreshError: result.refreshFailure }),
      };
    case "unknown":
      return { kind: "Outcome unknown", error: result.failure };
    case "superseded":
      return formReady;
    default:
      return assertNever(result);
  }
}

function statusMessage(
  state: RecoveryState,
): (typeof messages)[keyof typeof messages] | null {
  switch (state.kind) {
    case "Form ready":
      return null;
    case "Submitting":
      return messages.recoverySubmitting;
    case "Accepted":
      return messages.recoveryAccepted;
    case "CSRF rejected":
      return messages.recoveryCsrfRejected;
    case "Failed":
      return messages.authRequestFailed;
    case "Outcome unknown":
      return messages.recoveryUnknown;
    default:
      return assertNever(state);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled password-recovery state: ${String(value)}`);
}
