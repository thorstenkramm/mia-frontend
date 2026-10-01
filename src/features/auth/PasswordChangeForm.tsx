// Tailwind Plus: Application UI > Forms > Sign-in and Registration > Simple card
// Tailwind Plus: Application UI > Forms > Input Groups > Input with validation error
// Tailwind Plus: Application UI > Feedback > Alerts > With list (error summary)
// Library version: 2026-09-13-083323, v4 React light. MIA keeps the card's two
// password fields, adds rules help, pressed reveal, linked error-summary entries,
// outcome disclosure, and safe recheck, and omits branding, social, and remember-me.
import { ExclamationCircleIcon } from "@heroicons/react/16/solid";
import { XCircleIcon } from "@heroicons/react/20/solid";
import { clsx } from "clsx";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useIntl } from "react-intl";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import {
  useAuthenticationBootstrapState,
  useSessionActions,
  type AuthenticationBootstrapState,
} from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import {
  checkReplacementPassword,
  type ReplacementPasswordProblems,
} from "./passwordRules";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { PasswordRevealButton } from "./PasswordRevealButton";

const passwordProblemMessages = {
  "too-short": messages.passwordChangeTooShort,
  "too-long": messages.passwordChangeTooLong,
};
const outcomeMessages = {
  rejected: messages.passwordChangeRejected,
  throttled: messages.passwordChangeThrottled,
  failed: messages.passwordChangeFailed,
  unconfirmed: messages.passwordChangeUnconfirmed,
};

export function PasswordChangeForm() {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const state = useAuthenticationBootstrapState();
  const announcedState = useRef<AuthenticationBootstrapState | null>(null);
  const { recheckPasswordChange, submitPasswordChange } = useSessionActions();
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const recheckRef = useRef<HTMLButtonElement>(null);
  const recheckHeldFocus = useRef(false);
  const [passwordRevealed, setPasswordRevealed] = useState(false);
  const [confirmationRevealed, setConfirmationRevealed] = useState(false);
  // Each failed local check is a new object, so repeated failures refocus.
  const [problems, setProblems] = useState<ReplacementPasswordProblems | null>(
    null,
  );
  const rotating =
    state.kind === "Rotating" && state.origin === "password-change";
  const enabled = state.kind === "Password change";
  const outcome = state.kind === "Password change" ? state.outcome : undefined;

  useLayoutEffect(() => {
    if (problems === null) return;
    if (problems.password !== null && problems.confirmation !== null)
      summaryRef.current?.focus();
    else if (problems.password !== null) passwordRef.current?.focus();
    else confirmationRef.current?.focus();
  }, [problems]);

  // Backend transitions never move a surviving focus owner. Focus moves only
  // when the recheck action that held it was removed by the recovered state.
  // Each authoritative transition is announced once through the shared owner.
  useLayoutEffect(() => {
    if (announcedState.current === state) return;
    const initial = announcedState.current === null;
    announcedState.current = state;
    if (initial) return;
    if (recheckHeldFocus.current && recheckRef.current === null) {
      recheckHeldFocus.current = false;
      passwordRef.current?.focus();
    }
    const status = transitionStatus(state);
    if (status !== null)
      announce(
        statusText(intl, status),
        status.priority === "polite" ? "polite" : "urgent",
      );
  }, [announce, intl, state]);

  async function submit(data: FormData): Promise<void> {
    const password = data.get("password");
    const confirmation = data.get("password_confirmation");
    data.delete("password");
    data.delete("password_confirmation");
    if (typeof password === "string" && typeof confirmation === "string")
      await submitPasswordChange(password, confirmation);
  }

  const error = rotating ? state.error : outcome?.error;
  const status = problems === null ? transitionStatus(state) : null;
  const passwordProblem = problems?.password ?? null;
  const confirmationProblem = problems?.confirmation ?? null;
  const passwordInvalid =
    passwordProblem !== null ||
    (problems === null && outcome?.kind === "rejected");

  return (
    <form
      action={submit}
      noValidate
      onSubmit={(event) => {
        if (!enabled) {
          event.preventDefault();
          return;
        }
        // Read the native values only to check them; nothing is retained.
        const data = new FormData(event.currentTarget);
        const password = data.get("password");
        const confirmation = data.get("password_confirmation");
        const found =
          typeof password === "string" && typeof confirmation === "string"
            ? checkReplacementPassword(password, confirmation)
            : { password: "too-short" as const, confirmation: null };
        setProblems(found);
        if (found === null) return;
        event.preventDefault();
        // Form submit to invalid: one assertive corrective summary per attempt.
        const corrections = [
          found.password === null
            ? null
            : intl.formatMessage(passwordProblemMessages[found.password]),
          found.confirmation === null
            ? null
            : intl.formatMessage(messages.passwordChangeMismatch),
        ].filter((text) => text !== null);
        announce(
          (corrections.length > 1
            ? [intl.formatMessage(messages.passwordChangeErrorSummary)]
            : []
          )
            .concat(corrections)
            .join(" "),
          "urgent",
        );
      }}
      onReset={(event) => event.preventDefault()}
      className="mt-8 space-y-6"
    >
      {/* Cancel React's native form reset so definitive rejection retains the exact
          native values; passwords never become action, controlled, or global state. */}
      {passwordProblem !== null && confirmationProblem !== null ? (
        <div
          ref={summaryRef}
          tabIndex={-1}
          aria-labelledby="password-change-summary-heading"
          className="rounded-md bg-red-50 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          <div className="flex">
            <div className="shrink-0">
              <XCircleIcon aria-hidden="true" className="size-5 text-red-400" />
            </div>
            <div className="ml-3 min-w-0">
              <h2
                id="password-change-summary-heading"
                className="text-sm font-medium text-red-800"
              >
                {intl.formatMessage(messages.passwordChangeErrorSummary)}
              </h2>
              <div className="mt-2 text-sm text-red-700">
                <ul role="list" className="list-disc space-y-1 pl-5">
                  <SummaryEntry
                    targetRef={passwordRef}
                    target="new-password"
                    label={intl.formatMessage(
                      passwordProblemMessages[passwordProblem],
                    )}
                  />
                  <SummaryEntry
                    targetRef={confirmationRef}
                    target="password-confirmation"
                    label={intl.formatMessage(messages.passwordChangeMismatch)}
                  />
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <PasswordField
        id="new-password"
        name="password"
        inputRef={passwordRef}
        label={intl.formatMessage(messages.passwordChangeNewLabel)}
        help={intl.formatMessage(messages.passwordChangeRules)}
        problem={
          passwordProblem === null
            ? null
            : intl.formatMessage(passwordProblemMessages[passwordProblem])
        }
        invalid={passwordInvalid}
        extraDescription={
          problems === null && outcome?.kind === "rejected"
            ? "password-change-status"
            : null
        }
        enabled={enabled}
        revealed={passwordRevealed}
        onRevealedChange={setPasswordRevealed}
        revealLabel={intl.formatMessage(
          passwordRevealed
            ? messages.passwordChangeHide
            : messages.passwordChangeReveal,
        )}
      />
      <PasswordField
        id="password-confirmation"
        name="password_confirmation"
        inputRef={confirmationRef}
        label={intl.formatMessage(messages.passwordChangeConfirmationLabel)}
        help={intl.formatMessage(messages.passwordChangeConfirmationHelp)}
        problem={
          confirmationProblem === null
            ? null
            : intl.formatMessage(messages.passwordChangeMismatch)
        }
        invalid={confirmationProblem !== null}
        extraDescription={null}
        enabled={enabled}
        revealed={confirmationRevealed}
        onRevealedChange={setConfirmationRevealed}
        revealLabel={intl.formatMessage(
          confirmationRevealed
            ? messages.passwordChangeConfirmationHide
            : messages.passwordChangeConfirmationReveal,
        )}
      />
      <AuthSubmitButton
        enabled={enabled}
        label={intl.formatMessage(messages.passwordChangeSubmit)}
      />
      {/* Visible status only; the shared announcement owner speaks transitions. */}
      <p id="password-change-status" className="text-sm/6 text-gray-900">
        {status === null ? null : statusText(intl, status)}
      </p>
      {error && problems === null ? (
        <TechnicalErrorDisclosure error={error} />
      ) : null}
      {rotating && state.reconciliationError ? (
        <TechnicalErrorDisclosure error={state.reconciliationError} />
      ) : null}
      {/* The recheck stays mounted while its read runs so it keeps focus. */}
      {rotating && state.phase !== "submitting" ? (
        <button
          ref={recheckRef}
          type="button"
          aria-disabled={state.phase === "reconciling"}
          onFocus={() => {
            recheckHeldFocus.current = true;
          }}
          onBlur={(event) => {
            // Removal blurs with no destination; a deliberate move has one.
            if (event.relatedTarget !== null) recheckHeldFocus.current = false;
          }}
          onClick={() => {
            if (state.phase === "reconciliation failed")
              void recheckPasswordChange();
          }}
          className="min-h-6 text-sm/6 font-semibold text-indigo-600 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {intl.formatMessage(messages.passwordChangeRecheck)}
        </button>
      ) : null}
    </form>
  );
}

type TransitionStatus = {
  readonly message: (typeof messages)[keyof typeof messages];
  readonly waitSeconds: number | null;
  readonly priority: "polite" | "urgent";
};

function transitionStatus(
  state: AuthenticationBootstrapState,
): TransitionStatus | null {
  if (state.kind === "Rotating" && state.origin === "password-change") {
    const { phase } = state;
    switch (phase) {
      case "submitting":
        return {
          message: messages.passwordChangeSubmitting,
          waitSeconds: null,
          priority: "polite",
        };
      case "reconciling":
        return {
          message: messages.passwordChangeReconciling,
          waitSeconds: null,
          priority: "polite",
        };
      case "reconciliation failed":
        return {
          message: messages.passwordChangeRecheckNeeded,
          waitSeconds: null,
          priority: "urgent",
        };
      default:
        return assertNever(phase);
    }
  }
  if (state.kind !== "Password change" || state.outcome === undefined)
    return null;
  const { kind, error } = state.outcome;
  return {
    message: outcomeMessages[kind],
    waitSeconds:
      kind === "throttled" && error.kind === "http"
        ? error.retryAfterSeconds
        : null,
    priority: "urgent",
  };
}

function statusText(
  intl: ReturnType<typeof useIntl>,
  status: TransitionStatus,
): string {
  const text = intl.formatMessage(status.message);
  return status.waitSeconds === null
    ? text
    : `${text} ${intl.formatMessage(messages.passwordChangeWait, { seconds: status.waitSeconds })}`;
}

function assertNever(value: never): never {
  throw new Error(`Unhandled password-change phase: ${String(value)}`);
}

function SummaryEntry({
  targetRef,
  target,
  label,
}: {
  readonly targetRef: RefObject<HTMLInputElement | null>;
  readonly target: string;
  readonly label: string;
}) {
  return (
    <li>
      <a
        href={`#${target}`}
        onClick={(event) => {
          // Move focus without adding a fragment history entry.
          event.preventDefault();
          targetRef.current?.focus();
        }}
        className="underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        {label}
      </a>
    </li>
  );
}

function PasswordField({
  id,
  name,
  inputRef,
  label,
  help,
  problem,
  invalid,
  extraDescription,
  enabled,
  revealed,
  onRevealedChange,
  revealLabel,
}: {
  readonly id: string;
  readonly name: string;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly label: string;
  readonly help: string;
  readonly problem: string | null;
  readonly invalid: boolean;
  readonly extraDescription: string | null;
  readonly enabled: boolean;
  readonly revealed: boolean;
  readonly onRevealedChange: (revealed: boolean) => void;
  readonly revealLabel: string;
}) {
  const describedBy = [
    `${id}-help`,
    problem === null ? null : `${id}-error`,
    extraDescription,
  ]
    .filter((value) => value !== null)
    .join(" ");
  return (
    <div>
      <label htmlFor={id} className="block text-sm/6 font-medium text-gray-900">
        {label}
      </label>
      <p id={`${id}-help`} className="mt-1 text-sm/6 text-gray-600">
        {help}
      </p>
      <div className="mt-2 grid grid-cols-1">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={revealed ? "text" : "password"}
          autoComplete="new-password"
          required
          readOnly={!enabled}
          aria-disabled={!enabled}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className={clsx(
            "col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pl-3 text-base outline-1 -outline-offset-1 focus:outline-2 focus:-outline-offset-2 sm:text-sm/6",
            invalid
              ? "pr-10 text-red-900 outline-red-300 focus:outline-red-600 sm:pr-9"
              : "pr-3 text-gray-900 outline-gray-300 focus:outline-indigo-600",
          )}
        />
        {invalid ? (
          <ExclamationCircleIcon
            aria-hidden="true"
            className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-red-500 sm:size-4"
          />
        ) : null}
      </div>
      {problem === null ? null : (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-600">
          {problem}
        </p>
      )}
      <PasswordRevealButton
        inputRef={inputRef}
        revealed={revealed}
        enabled={enabled}
        label={revealLabel}
        onRevealedChange={onRevealedChange}
      />
    </div>
  );
}
