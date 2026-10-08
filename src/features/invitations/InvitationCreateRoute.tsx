import { ExclamationCircleIcon } from "@heroicons/react/16/solid";
import { useLayoutEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import {
  createSupervisorInvitation,
  isHiddenInvitationFailure,
  type Invitation,
} from "../../platform/api/invitations";
import type { EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { useUnsavedInputGuard } from "../../platform/ui/routeDeparture";
import type { InvitationRouteProps } from "./InvitationRouteProps";
import {
  InvitationSummary,
  OutcomeAlert,
  alertActionClass,
  primaryActionClass,
} from "./InvitationStatus";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";

const maxEmailLength = 254;

type FieldError = "required" | "too long" | "invalid" | "conflict";

// FRONTEND-STATE-MACHINES.md §18 and §27 for one supervisor invitation.
type CreateState =
  | {
      readonly kind: "Form ready";
      readonly fieldError: FieldError | null;
      readonly error?: EntryApiFailure;
    }
  | { readonly kind: "Submitting"; readonly attempt: symbol }
  | { readonly kind: "Created"; readonly invitation: Invitation }
  // A definitive rejection or a request that never left: nothing was created.
  | { readonly kind: "Not created"; readonly error: EntryApiFailure }
  // Dispatched without a definitive response, or Stop waiting.
  | {
      readonly kind: "Outcome unknown";
      readonly error: EntryApiFailure | null;
    };

const formReady: CreateState = { kind: "Form ready", fieldError: null };

const fieldErrors: Record<
  FieldError,
  (typeof messages)[keyof typeof messages]
> = {
  required: messages.invitationsEmailRequired,
  "too long": messages.invitationsEmailTooLong,
  invalid: messages.invitationsEmailInvalid,
  conflict: messages.invitationsEmailConflict,
};

// Tailwind Plus: Application UI > Forms > Input Groups > Input with label and
// help text and Input with validation error; Elements > Buttons; Feedback >
// Alerts > With actions; v4/react-light.jsx, library 2026-09-13-083323. MIA
// deltas: one email field for the invitee (no autofill of the user's own
// address), one fixed role, explicit outcome states, and no reset of the value
// on a recoverable failure.
export default function InvitationCreateRoute({
  links,
  unavailable,
}: InvitationRouteProps) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { runAuthenticatedMutation } = useSessionActions();
  const [email, setEmail] = useState("");
  const { state, stateRef, mounted, update } =
    useRouteActivity<CreateState>(formReady);
  const inputRef = useRef<HTMLInputElement>(null);
  const outcomeRef = useRef<HTMLHeadingElement>(null);

  const formShown = state.kind === "Form ready" || state.kind === "Not created";
  const departure = useUnsavedInputGuard({
    dirty: formShown && email !== "",
    clear: () => setEmail(""),
    stayTarget: inputRef,
  });

  // Each settled outcome moves focus to its own heading or the field.
  useLayoutEffect(() => {
    if (state.kind === "Created" || state.kind === "Outcome unknown")
      outcomeRef.current?.focus();
    else if (state.kind === "Form ready" && state.fieldError !== null)
      inputRef.current?.focus();
    else if (state.kind === "Not created") outcomeRef.current?.focus();
  }, [state]);

  const settle = (next: CreateState, status: string, urgent: boolean) => {
    update(next);
    announce(status, urgent ? "urgent" : "polite");
  };

  const submit = () => {
    if (state.kind === "Submitting") return;
    const value = email;
    const fieldError: FieldError | null =
      value.trim() === ""
        ? "required"
        : value.length > maxEmailLength
          ? "too long"
          : null;
    if (fieldError !== null) {
      update({ kind: "Form ready", fieldError });
      announce(intl.formatMessage(fieldErrors[fieldError]), "urgent");
      return;
    }
    const attempt = Symbol("invitation-create");
    update({ kind: "Submitting", attempt });
    announce(intl.formatMessage(messages.invitationsCreating), "polite");
    const current = () =>
      mounted.current &&
      stateRef.current.kind === "Submitting" &&
      stateRef.current.attempt === attempt;
    void runAuthenticatedMutation(
      { send: (csrf) => createSupervisorInvitation(value, csrf) },
      current,
    ).then((result) => {
      if (!current()) return;
      switch (result.kind) {
        case "completed":
          setEmail("");
          return settle(
            { kind: "Created", invitation: result.value },
            intl.formatMessage(messages.invitationsCreatedHeading),
            false,
          );
        case "rejected": {
          const { failure } = result;
          if (isHiddenInvitationFailure(failure)) return unavailable(failure);
          const rejected: FieldError | null =
            failure.disclosure.status === 409 &&
            failure.code === "invitation_email_registered"
              ? "conflict"
              : failure.disclosure.status === 422 &&
                  failure.code === "auth_invalid_request"
                ? "invalid"
                : null;
          if (rejected !== null)
            return settle(
              { kind: "Form ready", fieldError: rejected, error: failure },
              intl.formatMessage(fieldErrors[rejected]),
              true,
            );
          return settle(
            { kind: "Not created", error: failure },
            intl.formatMessage(messages.invitationsNotCreated),
            true,
          );
        }
        case "not-sent":
          return settle(
            { kind: "Not created", error: result.failure },
            intl.formatMessage(messages.invitationsNotCreated),
            true,
          );
        case "unknown":
          setEmail("");
          return settle(
            { kind: "Outcome unknown", error: result.failure },
            intl.formatMessage(messages.invitationsCreateUnknownHeading),
            true,
          );
        case "superseded":
          return;
      }
    });
  };

  const startAnother = () => {
    setEmail("");
    update(formReady);
    // The field is the next control to use.
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (state.kind === "Created")
    return (
      <>
        <OutcomeAlert
          tone="success"
          heading={intl.formatMessage(messages.invitationsCreatedHeading)}
          headingRef={outcomeRef}
          actions={
            <>
              <Link
                to={links.detail(state.invitation.id)}
                className={alertActionClass("success")}
              >
                {intl.formatMessage(messages.invitationsViewInvitation)}
              </Link>
              <button
                type="button"
                onClick={startAnother}
                className={alertActionClass("success")}
              >
                {intl.formatMessage(messages.invitationsInviteAnother)}
              </button>
              <Link to={links.list} className={alertActionClass("success")}>
                {intl.formatMessage(messages.invitationsBackToList)}
              </Link>
            </>
          }
        >
          <p>{intl.formatMessage(messages.invitationsCreated)}</p>
        </OutcomeAlert>
        <InvitationSummary invitation={state.invitation} />
      </>
    );

  if (state.kind === "Outcome unknown")
    return (
      <OutcomeAlert
        tone="warning"
        heading={intl.formatMessage(messages.invitationsCreateUnknownHeading)}
        headingRef={outcomeRef}
        actions={
          <>
            <Link to={links.list} className={alertActionClass("warning")}>
              {intl.formatMessage(messages.invitationsReviewList)}
            </Link>
            <button
              type="button"
              onClick={startAnother}
              className={alertActionClass("warning")}
            >
              {intl.formatMessage(messages.invitationsNewAttempt)}
            </button>
          </>
        }
      >
        <p>{intl.formatMessage(messages.invitationsCreateUnknown)}</p>
        {state.error === null ? null : (
          <TechnicalErrorDisclosure error={state.error} />
        )}
      </OutcomeAlert>
    );

  const submitting = state.kind === "Submitting";
  const fieldError = state.kind === "Form ready" ? state.fieldError : null;
  return (
    <>
      <p className="text-sm/6 text-gray-700">
        {intl.formatMessage(messages.invitationsCreateIntroduction)}
      </p>
      <form
        noValidate
        className="mt-6 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div>
          <label
            htmlFor="invitation-email"
            className="block text-sm/6 font-medium text-gray-900"
          >
            {intl.formatMessage(messages.invitationsEmailLabel)}
          </label>
          <div className="mt-2 grid grid-cols-1">
            <input
              ref={inputRef}
              id="invitation-email"
              name="email"
              type="email"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              dir="ltr"
              required
              maxLength={maxEmailLength}
              value={email}
              readOnly={submitting}
              aria-invalid={fieldError === null ? undefined : true}
              aria-describedby={
                fieldError === null
                  ? "invitation-email-help"
                  : "invitation-email-error invitation-email-help"
              }
              onChange={(event) => {
                setEmail(event.target.value);
                if (state.kind === "Form ready" && state.fieldError !== null)
                  update(formReady);
              }}
              className={
                fieldError === null
                  ? "col-start-1 row-start-1 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                  : "col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pr-10 pl-3 text-base text-red-900 outline-1 -outline-offset-1 outline-red-300 focus:outline-2 focus:-outline-offset-2 focus:outline-red-600 sm:pr-9 sm:text-sm/6"
              }
            />
            {fieldError === null ? null : (
              <ExclamationCircleIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-red-500 sm:size-4"
              />
            )}
          </div>
          {fieldError === null ? null : (
            <p
              id="invitation-email-error"
              className="mt-2 text-sm text-red-600"
            >
              {intl.formatMessage(fieldErrors[fieldError])}
            </p>
          )}
          <p id="invitation-email-help" className="mt-2 text-sm text-gray-500">
            {intl.formatMessage(messages.invitationsEmailHelp)}
          </p>
        </div>

        {state.kind === "Form ready" && state.error !== undefined ? (
          <TechnicalErrorDisclosure error={state.error} />
        ) : null}
        {state.kind === "Not created" ? (
          <OutcomeAlert
            tone="warning"
            heading={intl.formatMessage(messages.invitationsNotCreated)}
            headingRef={outcomeRef}
          >
            <p>{intl.formatMessage(messages.invitationsNotCreatedHelp)}</p>
            <TechnicalErrorDisclosure error={state.error} />
          </OutcomeAlert>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            aria-disabled={submitting}
            className={primaryActionClass}
          >
            {intl.formatMessage(
              submitting
                ? messages.invitationsCreating
                : messages.invitationsSendInvitation,
            )}
          </button>
          {submitting ? (
            <button
              type="button"
              onClick={() => {
                if (stateRef.current.kind !== "Submitting") return;
                setEmail("");
                settle(
                  { kind: "Outcome unknown", error: null },
                  intl.formatMessage(messages.invitationsCreateUnknownHeading),
                  true,
                );
              }}
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {intl.formatMessage(messages.invitationsStopWaiting)}
            </button>
          ) : (
            <RouteDepartureLink
              to={links.list}
              className="text-sm/6 font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {intl.formatMessage(messages.invitationsBackToList)}
            </RouteDepartureLink>
          )}
        </div>
      </form>
      <DiscardChangesDialog
        departure={departure}
        title={intl.formatMessage(messages.invitationsDiscardTitle)}
        description={intl.formatMessage(messages.invitationsDiscardDescription)}
      />
    </>
  );
}
