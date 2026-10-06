// Tailwind Plus: Application UI > Forms > Sign-in and Registration > Simple card
// Library version: 2026-09-13-083323, v4 React light. MIA uses username, adds reveal
// and outcome disclosure, keeps the "Forgot password?" link for staff recovery, and
// omits social login, registration, and remember-me.
import {
  useActionState,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import {
  useAuthenticationBootstrapState,
  useSessionActions,
  type AuthenticationBootstrapState,
} from "../../platform/data/EntryDataProvider";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { messages } from "../../platform/i18n/messages";
import { AuthSubmitButton } from "../../platform/ui/AuthSubmitButton";
import { PasswordRevealButton } from "./PasswordRevealButton";

const outcomeMessages = {
  rejected: messages.loginRejected,
  blocked: messages.loginBlocked,
  throttled: messages.loginThrottled,
  failed: messages.loginFailed,
  unconfirmed: messages.loginUnconfirmed,
};

export function PasswordSignInForm() {
  const state = useAuthenticationBootstrapState();
  const { recheckLogin } = useSessionActions();
  const usernameRef = useRef<HTMLInputElement>(null);
  const recheckRef = useRef<HTMLButtonElement>(null);
  const explicitRecovery = useRef(false);
  const recheckHeldFocus = useRef(false);
  // Synchronize browser focus after security teardown or safe-read settlement.
  // Initial entry and definitive rejection leave the existing focus owner alone.
  useLayoutEffect(() => {
    if (
      state.kind === "Restricted expired" ||
      (state.kind === "Rotating" && state.phase === "reconciliation failed")
    ) {
      recheckRef.current?.focus();
    } else if (
      state.kind === "Signed out" &&
      (explicitRecovery.current || recheckHeldFocus.current)
    ) {
      explicitRecovery.current = false;
      recheckHeldFocus.current = false;
      usernameRef.current?.focus();
    } else if (explicitRecovery.current && state.kind === "Rotating") {
      recheckRef.current?.focus();
    }
  }, [state]);
  // Security invalidation destroys native credential controls even when the URL
  // remains /login. Ordinary submission/result changes retain the same controls.
  return (
    <PasswordSignInFields
      key={state.kind === "Restricted expired" ? "expired" : "current"}
      state={state}
      usernameRef={usernameRef}
      recheckRef={recheckRef}
      onRecheckBlur={(nextTargetExists) => {
        if (nextTargetExists) recheckHeldFocus.current = false;
      }}
      onRecheckFocus={() => {
        recheckHeldFocus.current = true;
      }}
      onRecheck={() => {
        explicitRecovery.current = true;
        void recheckLogin();
      }}
    />
  );
}

function PasswordSignInFields({
  state,
  usernameRef,
  recheckRef,
  onRecheckBlur,
  onRecheckFocus,
  onRecheck,
}: {
  state: AuthenticationBootstrapState;
  usernameRef: RefObject<HTMLInputElement | null>;
  recheckRef: RefObject<HTMLButtonElement | null>;
  onRecheckBlur: (nextTargetExists: boolean) => void;
  onRecheckFocus: () => void;
  onRecheck: () => void;
}) {
  const intl = useIntl();
  const { login } = useSessionActions();
  const passwordInput = useRef<HTMLInputElement>(null);
  const submissionAdmitted = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [, submit] = useActionState(async (_: null, data: FormData) => {
    const username = data.get("username");
    const password = data.get("password");
    data.delete("username");
    data.delete("password");
    if (typeof username === "string" && typeof password === "string") {
      await login(username, password);
    }
    submissionAdmitted.current = false;
    return null;
  }, null);
  const rotating = state.kind === "Rotating";
  const enabled =
    state.kind === "Signed out" || state.kind === "Logout confirmed";
  const outcome = state.kind === "Signed out" ? state.outcome : undefined;
  const error = rotating ? state.error : outcome?.error;
  const wait =
    outcome?.kind === "throttled" && error?.kind === "http"
      ? error.retryAfterSeconds
      : null;
  const statusMessage = rotating
    ? state.phase === "submitting"
      ? messages.loginSubmitting
      : state.phase === "reconciling"
        ? messages.loginReconciling
        : messages.loginRecheckNeeded
    : state.kind === "Restricted expired"
      ? messages.loginRecheckNeeded
      : outcome
        ? outcomeMessages[outcome.kind]
        : null;

  return (
    <form
      action={submit}
      onSubmit={(event) => {
        if (!enabled || submissionAdmitted.current) event.preventDefault();
        else submissionAdmitted.current = true;
      }}
      onReset={(event) => event.preventDefault()}
      className="mb-8 space-y-6"
    >
      {/* Cancel React's native form reset: definitive rejection must retain exact
          native values; credentials never become action state or controlled state. */}
      <div>
        <label
          htmlFor="username"
          className="block text-sm/6 font-medium text-gray-900"
        >
          {intl.formatMessage(messages.loginUsername)}
        </label>
        <div className="mt-2">
          <input
            ref={usernameRef}
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            dir="ltr"
            required
            readOnly={!enabled}
            aria-disabled={!enabled}
            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-sm/6 font-medium text-gray-900"
        >
          {intl.formatMessage(messages.loginPassword)}
        </label>
        <p id="password-help" className="mt-1 text-sm/6 text-gray-600">
          {intl.formatMessage(messages.loginPasswordHelp)}
        </p>
        <div className="mt-2">
          <input
            ref={passwordInput}
            id="password"
            name="password"
            type={revealed ? "text" : "password"}
            autoComplete="current-password"
            aria-describedby="password-help"
            required
            readOnly={!enabled}
            aria-disabled={!enabled}
            className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
          />
        </div>
        <PasswordRevealButton
          inputRef={passwordInput}
          revealed={revealed}
          enabled={enabled}
          label={intl.formatMessage(
            revealed ? messages.loginHide : messages.loginReveal,
          )}
          onRevealedChange={setRevealed}
        />
      </div>
      <AuthSubmitButton
        enabled={enabled}
        label={intl.formatMessage(messages.loginSubmit)}
      />
      <p
        role={
          outcome || (rotating && state.phase === "reconciliation failed")
            ? "alert"
            : "status"
        }
        aria-atomic="true"
        className="text-sm/6 text-gray-900"
      >
        {statusMessage ? intl.formatMessage(statusMessage) : null}
        {wait !== null
          ? ` ${intl.formatMessage(messages.loginWait, { seconds: wait })}`
          : null}
      </p>
      {error ? (
        <TechnicalErrorDisclosure
          key={rotating ? state.phase : outcome?.kind}
          error={error}
        />
      ) : null}
      {rotating && state.reconciliationError ? (
        <TechnicalErrorDisclosure error={state.reconciliationError} />
      ) : null}
      {(rotating && state.phase !== "submitting") ||
      state.kind === "Restricted expired" ? (
        <button
          ref={recheckRef}
          type="button"
          aria-disabled={rotating && state.phase === "reconciling"}
          onBlur={(event) =>
            onRecheckBlur(
              event.relatedTarget !== null &&
                event.relatedTarget !== document.body,
            )
          }
          onFocus={onRecheckFocus}
          onClick={() => {
            if (!rotating || state.phase === "reconciliation failed")
              onRecheck();
          }}
          className="min-h-6 text-sm/6 font-semibold text-indigo-600 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {intl.formatMessage(messages.loginRecheck)}
        </button>
      ) : null}
      {/* The card's "Forgot password?" link, placed after submission so the
          credential, reveal, and submit focus order stays unchanged. */}
      <p className="text-sm/6">
        <Link
          to="/login/recovery"
          className="inline-block min-h-6 font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {intl.formatMessage(messages.loginForgotPassword)}
        </Link>
      </p>
    </form>
  );
}
