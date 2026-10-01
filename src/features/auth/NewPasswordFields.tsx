// Tailwind Plus: Application UI > Forms > Input Groups > Input with validation error
// Tailwind Plus: Application UI > Feedback > Alerts > With list (error summary)
// Library version: 2026-09-13-083323, v4 React light. MIA adds rules help, pressed
// reveal, and linked error-summary entries. Shared by required password replacement
// and token reset, which apply the same local password rules before dispatch.
import { ExclamationCircleIcon } from "@heroicons/react/16/solid";
import { XCircleIcon } from "@heroicons/react/20/solid";
import { clsx } from "clsx";
import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useIntl } from "react-intl";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import {
  checkReplacementPassword,
  type ReplacementPasswordProblems,
} from "./passwordRules";
import { PasswordRevealButton } from "./PasswordRevealButton";

const passwordProblemMessages = {
  "too-short": messages.passwordChangeTooShort,
  "too-long": messages.passwordChangeTooLong,
};

export type NewPasswordCheck = {
  readonly problems: ReplacementPasswordProblems | null;
  readonly passwordRef: RefObject<HTMLInputElement | null>;
  readonly confirmationRef: RefObject<HTMLInputElement | null>;
  readonly summaryRef: RefObject<HTMLDivElement | null>;
  // Checks the native values on submit. A failure cancels the submission, sends
  // nothing, moves focus to the failed field or summary, and announces it.
  readonly checkSubmission: (event: FormEvent<HTMLFormElement>) => boolean;
};

export function useNewPasswordCheck(): NewPasswordCheck {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  // Each failed local check is a new object, so repeated failures refocus.
  const [problems, setProblems] = useState<ReplacementPasswordProblems | null>(
    null,
  );

  useLayoutEffect(() => {
    if (problems === null) return;
    if (problems.password !== null && problems.confirmation !== null)
      summaryRef.current?.focus();
    else if (problems.password !== null) passwordRef.current?.focus();
    else confirmationRef.current?.focus();
  }, [problems]);

  function checkSubmission(event: FormEvent<HTMLFormElement>): boolean {
    // Read the native values only to check them; nothing is retained.
    const data = new FormData(event.currentTarget);
    const password = data.get("password");
    const confirmation = data.get("password_confirmation");
    const found =
      typeof password === "string" && typeof confirmation === "string"
        ? checkReplacementPassword(password, confirmation)
        : { password: "too-short" as const, confirmation: null };
    setProblems(found);
    if (found === null) return true;
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
    return false;
  }

  return {
    problems,
    passwordRef,
    confirmationRef,
    summaryRef,
    checkSubmission,
  };
}

// The form that owns the pair: it refuses submission while unavailable, runs the
// local rules first, and cancels React's native reset so a definitive rejection
// keeps the exact native values. Passwords never become action or global state.
export function NewPasswordForm({
  action,
  check,
  enabled,
  rejectedBy,
  className,
  children,
}: {
  readonly action: (data: FormData) => Promise<void>;
  readonly check: NewPasswordCheck;
  readonly enabled: boolean;
  readonly rejectedBy: string | null;
  readonly className: string;
  readonly children: ReactNode;
}) {
  return (
    <form
      action={action}
      noValidate
      onSubmit={(event) => {
        if (!enabled) {
          event.preventDefault();
          return;
        }
        check.checkSubmission(event);
      }}
      onReset={(event) => event.preventDefault()}
      className={className}
    >
      <NewPasswordFields
        check={check}
        enabled={enabled}
        rejectedBy={rejectedBy}
      />
      {children}
    </form>
  );
}

function NewPasswordFields({
  check,
  enabled,
  rejectedBy,
}: {
  readonly check: NewPasswordCheck;
  readonly enabled: boolean;
  // The visible status element describing a definitive server rejection, if any.
  readonly rejectedBy: string | null;
}) {
  const intl = useIntl();
  const [passwordRevealed, setPasswordRevealed] = useState(false);
  const [confirmationRevealed, setConfirmationRevealed] = useState(false);
  const { problems, passwordRef, confirmationRef, summaryRef } = check;
  const passwordProblem = problems?.password ?? null;
  const confirmationProblem = problems?.confirmation ?? null;
  const serverRejection = problems === null ? rejectedBy : null;

  return (
    <>
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
        invalid={passwordProblem !== null || serverRejection !== null}
        extraDescription={serverRejection}
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
    </>
  );
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
