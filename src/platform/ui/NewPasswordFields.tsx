// Tailwind Plus: Application UI > Forms > Input Groups > Input with validation error
// Tailwind Plus: Application UI > Feedback > Alerts > With list (error summary)
// Library version: 2026-09-13-083323, v4 React light. MIA adds rules help, pressed
// reveal, and linked error-summary entries. Shared by required password replacement,
// token reset, and invitation acceptance, which apply the same local password rules
// before dispatch; acceptance adds its own leading fields and one extra check.
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
import { useAnnouncer } from "../announcer/AnnouncementRegion";
import { messages } from "../i18n/messages";
import {
  checkReplacementPassword,
  type ReplacementPasswordProblems,
} from "./passwordRules";
import { PasswordRevealButton } from "./PasswordRevealButton";

const passwordProblemMessages = {
  "too-short": messages.passwordChangeTooShort,
  "too-long": messages.passwordChangeTooLong,
};

// A form-specific local check beyond the password rules. `problem` reads the
// native values and returns the localized correction, or null when it passes;
// `focus` moves to the failed field when no password problem takes focus first.
export type LocalFieldProblem = {
  readonly target: string;
  readonly label: string;
};
export type ExtraLocalCheck =
  | {
      readonly problem: (data: FormData) => string | null;
      readonly focus: () => void;
    }
  | { readonly fields: (data: FormData) => readonly LocalFieldProblem[] };

export type NewPasswordCheck = {
  readonly fieldProblems: readonly LocalFieldProblem[];
  readonly problems: ReplacementPasswordProblems | null;
  readonly passwordRef: RefObject<HTMLInputElement | null>;
  readonly confirmationRef: RefObject<HTMLInputElement | null>;
  readonly summaryRef: RefObject<HTMLDivElement | null>;
  // Checks the native values on submit. A failure cancels the submission, sends
  // nothing, moves focus to the failed field or summary, and announces it.
  readonly checkSubmission: (
    event: FormEvent<HTMLFormElement>,
    extra?: ExtraLocalCheck,
  ) => boolean;
};

export function useNewPasswordCheck(): NewPasswordCheck {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const checkedForm = useRef<HTMLFormElement | null>(null);
  const [fieldProblems, setFieldProblems] = useState<
    readonly LocalFieldProblem[]
  >([]);
  // Each failed local check is a new object, so repeated failures refocus.
  const [problems, setProblems] = useState<ReplacementPasswordProblems | null>(
    null,
  );

  useLayoutEffect(() => {
    if (fieldProblems.length > 0) {
      if (fieldProblems.length > 1) summaryRef.current?.focus();
      else {
        const target = fieldProblems[0]?.target;
        for (const control of Array.from(checkedForm.current?.elements ?? []))
          if (control instanceof HTMLElement && control.id === target)
            control.focus();
      }
      return;
    }
    if (problems === null) return;
    if (problems.password !== null && problems.confirmation !== null)
      summaryRef.current?.focus();
    else if (problems.password !== null) passwordRef.current?.focus();
    else confirmationRef.current?.focus();
  }, [problems, fieldProblems]);

  function checkSubmission(
    event: FormEvent<HTMLFormElement>,
    extra?: ExtraLocalCheck,
  ): boolean {
    // Read the native values only to check them; nothing is retained.
    const data = new FormData(event.currentTarget);
    const password = data.get("password");
    const confirmation = data.get("password_confirmation");
    const found =
      typeof password === "string" && typeof confirmation === "string"
        ? checkReplacementPassword(password, confirmation)
        : { password: "too-short" as const, confirmation: null };
    const extraProblem =
      extra !== undefined && "problem" in extra ? extra.problem(data) : null;
    const fields =
      extra !== undefined && "fields" in extra ? extra.fields(data) : [];
    const allFields = [
      ...fields,
      ...(found?.password
        ? [
            {
              target: "new-password",
              label: intl.formatMessage(
                passwordProblemMessages[found.password],
              ),
            },
          ]
        : []),
      ...(found?.confirmation
        ? [
            {
              target: "password-confirmation",
              label: intl.formatMessage(messages.passwordChangeMismatch),
            },
          ]
        : []),
    ];
    // The native form owns reading order; retain corrections/identities only, never values.
    const controls = Array.from(event.currentTarget.elements);
    allFields.sort(
      (left, right) =>
        controls.findIndex((node) => node.id === left.target) -
        controls.findIndex((node) => node.id === right.target),
    );
    checkedForm.current = event.currentTarget;
    setFieldProblems(allFields);
    setProblems(found);
    if (found === null && extraProblem === null && fields.length === 0)
      return true;
    event.preventDefault();
    if (found === null && extra !== undefined && "focus" in extra)
      extra.focus();
    // Form submit to invalid: one assertive corrective summary per attempt.
    const corrections = allFields.map((field) => field.label);
    announce(
      (corrections.length > 1
        ? [intl.formatMessage(messages.passwordChangeErrorSummary)]
        : []
      )
        .concat(corrections, extraProblem ?? [])
        .join(" "),
      "urgent",
    );
    return false;
  }

  return {
    fieldProblems,
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
  leading,
  extraCheck,
  children,
}: {
  readonly action: (data: FormData) => Promise<void>;
  readonly check: NewPasswordCheck;
  readonly enabled: boolean;
  readonly rejectedBy: string | null;
  readonly className: string;
  // Fields that precede the password pair, such as the invitation username.
  readonly leading?: ReactNode;
  readonly extraCheck?: ExtraLocalCheck;
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
        check.checkSubmission(event, extraCheck);
      }}
      onReset={(event) => event.preventDefault()}
      className={className}
    >
      {leading}
      <NewPasswordFields
        check={check}
        enabled={enabled}
        rejectedBy={rejectedBy}
      />
      {children}
    </form>
  );
}

export function NewPasswordFields({
  check,
  enabled,
  rejectedBy,
  temporary = false,
  summary = true,
}: {
  readonly check: NewPasswordCheck;
  readonly enabled: boolean;
  // The visible status element describing a definitive server rejection, if any.
  readonly rejectedBy: string | null;
  readonly temporary?: boolean;
  readonly summary?: boolean;
}) {
  const intl = useIntl();
  const [passwordRevealed, setPasswordRevealed] = useState(false);
  const [confirmationRevealed, setConfirmationRevealed] = useState(false);
  const { problems, passwordRef, confirmationRef } = check;
  const passwordProblem = problems?.password ?? null;
  const confirmationProblem = problems?.confirmation ?? null;
  const serverRejection = problems === null ? rejectedBy : null;

  return (
    <>
      {summary ? <NewPasswordSummary check={check} /> : null}
      <PasswordField
        id="new-password"
        name="password"
        inputRef={passwordRef}
        label={intl.formatMessage(
          temporary
            ? messages.studentTemporaryPassword
            : messages.passwordChangeNewLabel,
        )}
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
            ? temporary
              ? messages.studentPasswordHide
              : messages.passwordChangeHide
            : temporary
              ? messages.studentPasswordReveal
              : messages.passwordChangeReveal,
        )}
      />
      <PasswordField
        id="password-confirmation"
        name="password_confirmation"
        inputRef={confirmationRef}
        label={intl.formatMessage(
          temporary
            ? messages.studentPasswordConfirmation
            : messages.passwordChangeConfirmationLabel,
        )}
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
            ? temporary
              ? messages.studentConfirmationHide
              : messages.passwordChangeConfirmationHide
            : temporary
              ? messages.studentConfirmationReveal
              : messages.passwordChangeConfirmationReveal,
        )}
      />
    </>
  );
}

// Same licensed With list alert, lifted to the start of the owning form when
// leading/trailing fields participate in the shared local validation attempt.
export function NewPasswordSummary({
  check,
}: {
  readonly check: NewPasswordCheck;
}) {
  const intl = useIntl();
  const { fieldProblems, summaryRef } = check;
  return fieldProblems.length > 1 ? (
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
              {fieldProblems.map(({ target, label }) => (
                <SummaryEntry key={target} target={target} label={label} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  ) : null;
}

function SummaryEntry({
  target,
  label,
}: {
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
          document.getElementById(target)?.focus();
        }}
        className="inline-block min-h-6 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
              ? "pr-10 text-red-900 outline-red-600 focus:outline-red-600 sm:pr-9"
              : "pr-3 text-gray-900 outline-gray-500 focus:outline-indigo-600",
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
