// Tailwind Plus: Application UI > Forms > Sign-in and Registration > Simple card (preview
// and acceptance form)
// Tailwind Plus: Application UI > Forms > Input Groups > Input with label and help text
// (username)
// Tailwind Plus: Application UI > Forms > Select Menus > Simple native (language, country,
// time zone)
// Tailwind Plus: Application UI > Feedback > Alerts > With description (preview retry,
// invalid, lost, rejected, and unknown results; the invalid alert omits its heading
// because the page heading names that result) and With actions (account created)
// Tailwind Plus: Application UI > Elements > Buttons > Primary buttons and Secondary
// buttons
// Library version: 2026-09-13-083323, v4 React light. MIA keeps the card's password pair
// (NewPasswordFields) with a leading username field, places help text below the input as
// in the blueprint, marks rejected fields with the Input with validation error outline,
// focuses each result heading after a deliberate action, replaces alert buttons with
// navigation links, and omits branding, social, and remember-me. Shared link pieces live
// in LinkFlowParts.
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { clsx } from "clsx";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { useIntl, type IntlShape } from "react-intl";
import { Link, useLocation } from "react-router";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import type { InvitationRole } from "../../platform/api/entry";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import {
  useAuthenticationBootstrapState,
  useSessionActions,
} from "../../platform/data/EntryDataProvider";
import { localeDisplayName, locales } from "../../platform/i18n/locales";
import { messages } from "../../platform/i18n/messages";
import { useMiaI18n } from "../../platform/i18n/MiaIntlProvider";
import {
  invitationAcceptPath,
  invitationSurface,
  type AcceptanceFormState,
  type AcceptanceRejection,
  type InvitationLink,
  type InvitationState,
  type InvitationView,
} from "../../platform/session/invitationLink";
import { AuthSubmitButton } from "../../platform/ui/AuthSubmitButton";
import {
  countryOptions,
  timeZoneOptions,
} from "../../platform/ui/accountProfileOptions";
import {
  primaryAction,
  secondaryAction,
  SignedInInterstitial,
  SuccessResult,
  useFocusedOnMount,
  useRetryAvailable,
  waitText,
  WarningResult,
} from "./LinkFlowParts";
import {
  NewPasswordForm,
  useNewPasswordCheck,
} from "../../platform/ui/NewPasswordFields";

type MessageDescriptor = (typeof messages)[keyof typeof messages];

const roleMessages = {
  administrator: messages.roleAdministrator,
  supervisor: messages.roleSupervisor,
  mentor: messages.roleMentor,
} satisfies Record<InvitationRole, MessageDescriptor>;

const statusId = "invitation-status";

export default function InvitationEntryRoute({
  invitationLink,
}: {
  readonly invitationLink: InvitationLink;
}) {
  // Both invitation routes resolve to this component, so React keeps one
  // instance across them; each path entry starts its own route-entry state.
  const { pathname } = useLocation();
  return <InvitationContent key={pathname} invitationLink={invitationLink} />;
}

function InvitationContent({
  invitationLink,
}: {
  readonly invitationLink: InvitationLink;
}) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const session = useAuthenticationBootstrapState();
  const { previewInvitation } = useSessionActions();
  const location = useLocation();
  const flow = useSyncExternalStore(
    invitationLink.subscribe,
    invitationLink.getSnapshot,
    invitationLink.getSnapshot,
  );
  const announcedFlow = useRef<InvitationState | null>(null);
  const surface = invitationSurface(session, flow, location.pathname);
  // Route entry focuses the page heading. A later view takes focus only after a
  // deliberate action (sign-out, Try again, or submit), never because the
  // link's own preview answered.
  const [entryKind] = useState(surface?.view.kind);
  const [retried, setRetried] = useState(false);
  const takeFocus =
    surface?.view.kind !== entryKind && (entryKind !== "checking" || retried);

  // Opening the link is the activation for its single preview.
  useEffect(() => {
    if (flow.kind === "Preview due")
      void invitationLink.preview(previewInvitation);
  }, [flow, invitationLink, previewInvitation]);

  // Each authoritative flow transition is announced once; route entry is not.
  useLayoutEffect(() => {
    const previous = announcedFlow.current;
    if (previous === flow) return;
    announcedFlow.current = flow;
    if (previous === null) return;
    const announcement = flowAnnouncement(intl, flow, previous);
    if (announcement !== null)
      announce(announcement.text, announcement.priority);
  }, [announce, flow, intl]);

  if (surface === null)
    throw new Error("The invitation route requires an invitation surface.");
  const { view } = surface;
  switch (view.kind) {
    case "interstitial":
      return (
        <SignedInInterstitial
          signingOut={view.signingOut}
          introduction={messages.invitationSignedInIntroduction}
          link={invitationLink}
        />
      );
    case "checking":
    case "preview retry":
      return (
        <PreviewStatus
          view={view}
          retried={retried}
          takeFocus={takeFocus}
          onRetry={() => {
            setRetried(true);
            void invitationLink.preview(previewInvitation);
          }}
        />
      );
    case "preview":
      return <InvitationPreview role={view.role} takeFocus={takeFocus} />;
    case "form":
      return (
        <AcceptanceForm state={view.state} invitationLink={invitationLink} />
      );
    case "invalid":
      return <InvitationInvalid />;
    case "preview lost":
      return (
        <WarningResult
          heading={messages.invitationLostHeading}
          body={messages.invitationLost}
          takeFocus={takeFocus}
          disclosure={<TechnicalErrorDisclosure error={view.error} />}
        >
          <SignInAction />
        </WarningResult>
      );
    case "acceptance rejected":
      return (
        <WarningResult
          heading={messages.invitationNotCreatedHeading}
          body={
            view.cause === "email registered"
              ? messages.invitationEmailRegistered
              : messages.authRequestFailed
          }
          takeFocus={takeFocus}
          disclosure={<TechnicalErrorDisclosure error={view.error} />}
        >
          <SignInAction />
        </WarningResult>
      );
    case "outcome unknown":
      return (
        <WarningResult
          heading={messages.invitationUnknownHeading}
          body={messages.invitationUnknown}
          takeFocus={takeFocus}
          disclosure={
            view.error === null ? null : (
              <TechnicalErrorDisclosure error={view.error} />
            )
          }
        >
          <SignInAction />
        </WarningResult>
      );
    case "account created":
      return (
        <SuccessResult
          heading={messages.invitationCreatedHeading}
          body={[messages.invitationCreated]}
          takeFocus={takeFocus}
        />
      );
    default:
      return assertNever(view);
  }
}

// A document navigation, so sign-in starts from cold discovery.
function SignInAction() {
  const intl = useIntl();
  return (
    <a href="/login" className={primaryAction}>
      {intl.formatMessage(messages.loginSubmit)}
    </a>
  );
}

// The checking status and the retryable preview results share one structure,
// so Try again keeps focus while a deliberate retry is checking.
function PreviewStatus({
  view,
  retried,
  takeFocus,
  onRetry,
}: {
  readonly view: Extract<
    InvitationView,
    { readonly kind: "checking" | "preview retry" }
  >;
  readonly retried: boolean;
  readonly takeFocus: boolean;
  readonly onRetry: () => void;
}) {
  const intl = useIntl();
  const statusRef = useFocusedOnMount<HTMLParagraphElement>(takeFocus);
  const state = view.kind === "preview retry" ? view.state : null;
  const retryAfter =
    state?.kind === "Preview throttled" ? state.error.retryAfterSeconds : null;
  const retryAvailable = useRetryAvailable(retryAfter);
  const showRetry = state !== null || retried;
  return (
    <>
      {state === null ? (
        <p
          ref={statusRef}
          tabIndex={-1}
          className="text-center text-sm/6 text-gray-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {intl.formatMessage(messages.invitationChecking)}
        </p>
      ) : (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="text-sm text-yellow-700">
            <p>
              {[
                intl.formatMessage(previewRetryMessage(state)),
                waitText(intl, retryAfter),
              ]
                .filter((text) => text !== "")
                .join(" ")}
            </p>
            {state.error === undefined ? null : (
              <TechnicalErrorDisclosure error={state.error} />
            )}
            {state.kind === "Preview CSRF rejected" &&
            state.refreshError !== undefined ? (
              <TechnicalErrorDisclosure error={state.refreshError} />
            ) : null}
          </div>
        </div>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {showRetry ? (
          <button
            type="button"
            aria-disabled={state === null || !retryAvailable}
            className={primaryAction}
            onClick={() => {
              if (state !== null && retryAvailable) onRetry();
            }}
          >
            {intl.formatMessage(messages.invitationTryAgain)}
          </button>
        ) : null}
      </div>
    </>
  );
}

// Only the invited role is shown; the preview exposes nothing else.
function InvitationPreview({
  role,
  takeFocus,
}: {
  readonly role: InvitationRole;
  readonly takeFocus: boolean;
}) {
  const intl = useIntl();
  const acceptRef = useFocusedOnMount<HTMLAnchorElement>(takeFocus);
  return (
    <>
      <p className="text-center text-sm/6 text-gray-600">
        {intl.formatMessage(messages.invitationPreviewIntroduction)}
      </p>
      <div className="mt-8 bg-white px-6 py-12 shadow-sm sm:rounded-lg sm:px-12">
        <p className="text-base/7 font-semibold text-gray-900">
          {intl.formatMessage(messages.invitationRole, {
            role: intl.formatMessage(roleMessages[role]),
          })}
        </p>
        <div className="mt-6">
          {/* A client navigation inside the active flow keeps the in-memory token. */}
          <Link
            ref={acceptRef}
            to={invitationAcceptPath}
            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            {intl.formatMessage(messages.invitationAccept)}
          </Link>
        </div>
      </div>
    </>
  );
}

// One presentation for every invalid cause and for a missing or lost token on
// either path. Its heading is the page heading, which receives focus whenever
// it appears; it announces itself once whenever it appears.
function InvitationInvalid() {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  useLayoutEffect(() => {
    announce(
      [messages.invitationInvalidHeading, messages.invitationInvalid]
        .map((message) => intl.formatMessage(message))
        .join(" "),
      "urgent",
    );
  }, [announce, intl]);
  return (
    <WarningResult
      heading={null}
      body={messages.invitationInvalid}
      takeFocus={false}
      disclosure={null}
    >
      <SignInAction />
    </WarningResult>
  );
}

function AcceptanceForm({
  state,
  invitationLink,
}: {
  readonly state: AcceptanceFormState;
  readonly invitationLink: InvitationLink;
}) {
  const intl = useIntl();
  const { locale } = useMiaI18n();
  const { acceptInvitation } = useSessionActions();
  const check = useNewPasswordCheck();
  const { problems, passwordRef, confirmationRef } = check;
  const countryRef = useRef<HTMLSelectElement>(null);
  const [countryMissing, setCountryMissing] = useState(false);
  const rejection =
    state.kind === "Acceptance ready" ? state.rejection : undefined;
  const retryAfter =
    rejection?.kind === "throttled" ? rejection.error.retryAfterSeconds : null;
  const retryAvailable = useRetryAvailable(retryAfter);
  const submitting = state.kind === "Acceptance submitting";
  const enabled = !submitting && retryAvailable;
  const [timeZones] = useState(timeZoneOptions);

  // A correctable rejection keeps the token and the other fields but clears
  // the passwords for a deliberate resubmit.
  useLayoutEffect(() => {
    if (rejection === undefined) return;
    for (const input of [passwordRef.current, confirmationRef.current])
      if (input !== null) input.value = "";
  }, [confirmationRef, passwordRef, rejection]);

  // Returns the pending work instead of awaiting it, so no frame here keeps the
  // passwords while the request waits or runs.
  function submit(data: FormData): Promise<void> {
    const take = (name: string): string | null => {
      const value = data.get(name);
      data.delete(name);
      return typeof value === "string" ? value : null;
    };
    const username = take("username");
    const password = take("password");
    const passwordConfirmation = take("password_confirmation");
    const language = take("language");
    const country = take("country");
    const timeZone = take("time_zone");
    if (
      username === null ||
      password === null ||
      passwordConfirmation === null ||
      language === null ||
      country === null ||
      timeZone === null
    )
      return Promise.resolve();
    return invitationLink.accept(
      {
        username,
        password,
        passwordConfirmation,
        language,
        country,
        timeZone,
      },
      acceptInvitation,
    );
  }

  const status = problems === null ? formStatus(state) : null;
  const error =
    state.kind === "Acceptance pre-dispatch failure"
      ? state.error
      : rejection?.error;
  // `auth_invalid_request` may concern any profile field, so only a taken
  // username is attributed to the username field.
  const usernameRejected =
    problems === null && rejection?.kind === "username taken";
  return (
    <>
      <p className="text-center text-sm/6 text-gray-600">
        {intl.formatMessage(messages.invitationAcceptIntroduction)}
      </p>
      <div className="mt-8 bg-white px-6 py-12 shadow-sm sm:rounded-lg sm:px-12">
        <NewPasswordForm
          action={submit}
          check={check}
          enabled={enabled}
          rejectedBy={rejection?.kind === "password rejected" ? statusId : null}
          className="space-y-6"
          leading={
            <UsernameField
              enabled={enabled}
              rejectedBy={usernameRejected ? statusId : null}
            />
          }
          extraCheck={{
            problem: (data) => {
              const missing = data.get("country") === "";
              setCountryMissing(missing);
              return missing
                ? intl.formatMessage(messages.invitationCountryMissing)
                : null;
            },
            focus: () => countryRef.current?.focus(),
          }}
        >
          <NativeSelect
            id="language"
            label={intl.formatMessage(messages.invitationLanguageLabel)}
            defaultValue={locale}
            locked={submitting}
            problem={null}
          >
            {locales.map((option) => (
              <option key={option} value={option}>
                {localeDisplayName(option, locale)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            id="country"
            label={intl.formatMessage(messages.invitationCountryLabel)}
            defaultValue=""
            locked={submitting}
            selectRef={countryRef}
            problem={
              countryMissing
                ? intl.formatMessage(messages.invitationCountryMissing)
                : null
            }
          >
            <option value="">
              {intl.formatMessage(messages.invitationCountryEmpty)}
            </option>
            {countryOptions(locale).map(({ code, name }) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            id="time_zone"
            label={intl.formatMessage(messages.invitationTimeZoneLabel)}
            defaultValue={timeZones.browser}
            locked={submitting}
            problem={null}
          >
            {timeZones.zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </NativeSelect>
          <AuthSubmitButton
            enabled={enabled}
            label={intl.formatMessage(messages.invitationSubmit)}
          />
          {submitting ? (
            <button
              type="button"
              className={clsx(secondaryAction, "w-full")}
              onClick={() => invitationLink.stopWaiting()}
            >
              {intl.formatMessage(messages.invitationStopWaiting)}
            </button>
          ) : null}
          {/* Visible status only; the shared announcement owner speaks transitions. */}
          <p id={statusId} className="text-sm/6 text-gray-900">
            {status === null
              ? null
              : [intl.formatMessage(status), waitText(intl, retryAfter)]
                  .filter((text) => text !== "")
                  .join(" ")}
          </p>
          {error !== undefined && problems === null ? (
            <TechnicalErrorDisclosure error={error} />
          ) : null}
          {rejection?.kind === "CSRF rejected" &&
          rejection.refreshError !== undefined &&
          problems === null ? (
            <TechnicalErrorDisclosure error={rejection.refreshError} />
          ) : null}
        </NewPasswordForm>
      </div>
    </>
  );
}

function UsernameField({
  enabled,
  rejectedBy,
}: {
  readonly enabled: boolean;
  // The visible status element describing a definitive server rejection, if any.
  readonly rejectedBy: string | null;
}) {
  const intl = useIntl();
  return (
    <div>
      <label
        htmlFor="username"
        className="block text-sm/6 font-medium text-gray-900"
      >
        {intl.formatMessage(messages.loginUsername)}
      </label>
      <div className="mt-2">
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          readOnly={!enabled}
          aria-disabled={!enabled}
          aria-invalid={rejectedBy !== null}
          aria-describedby={["username-description", rejectedBy]
            .filter((value) => value !== null)
            .join(" ")}
          className={clsx(
            "block w-full rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 focus:outline-2 focus:-outline-offset-2 sm:text-sm/6",
            rejectedBy === null
              ? "text-gray-900 outline-gray-300 focus:outline-indigo-600"
              : "text-red-900 outline-red-300 focus:outline-red-600",
          )}
        />
      </div>
      <p id="username-description" className="mt-2 text-sm text-gray-500">
        {intl.formatMessage(messages.invitationUsernameHelp)}
      </p>
    </div>
  );
}

function NativeSelect({
  id,
  label,
  defaultValue,
  locked,
  problem,
  selectRef,
  children,
}: {
  readonly id: string;
  readonly label: string;
  readonly defaultValue: string;
  readonly locked: boolean;
  readonly problem: string | null;
  readonly selectRef?: RefObject<HTMLSelectElement | null>;
  readonly children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm/6 font-medium text-gray-900">
        {label}
      </label>
      <div className="mt-2 grid grid-cols-1">
        <select
          ref={selectRef}
          id={id}
          name={id}
          defaultValue={defaultValue}
          required
          // A native select has no read-only state. It locks only while the
          // request is in flight, when focus is on the submit controls.
          disabled={locked}
          aria-invalid={problem !== null}
          {...(problem === null ? {} : { "aria-describedby": `${id}-error` })}
          className={clsx(
            "col-start-1 row-start-1 w-full min-w-0 appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base outline-1 -outline-offset-1 focus-visible:outline-2 focus-visible:-outline-offset-2 sm:text-sm/6",
            problem === null
              ? "text-gray-900 outline-gray-300 focus-visible:outline-indigo-600"
              : "text-red-900 outline-red-300 focus-visible:outline-red-600",
          )}
        >
          {children}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
        />
      </div>
      {problem === null ? null : (
        <p id={`${id}-error`} className="mt-2 text-sm text-red-600">
          {problem}
        </p>
      )}
    </div>
  );
}

function previewRetryMessage(
  state: Extract<InvitationView, { readonly kind: "preview retry" }>["state"],
): MessageDescriptor {
  switch (state.kind) {
    case "Preview throttled":
      return messages.invitationPreviewThrottled;
    case "Preview CSRF rejected":
      return messages.invitationPreviewCsrfRejected;
    case "Preview not sent":
      return messages.invitationPreviewNotSent;
    default:
      return assertNever(state);
  }
}

function rejectionMessage(rejection: AcceptanceRejection): MessageDescriptor {
  switch (rejection.kind) {
    case "username taken":
      return messages.invitationUsernameTaken;
    case "password rejected":
      return messages.invitationPasswordRejected;
    case "request invalid":
      return messages.invitationRequestInvalid;
    case "throttled":
      return messages.invitationThrottled;
    case "CSRF rejected":
      return messages.invitationCsrfRejected;
    default:
      return assertNever(rejection);
  }
}

function formStatus(state: AcceptanceFormState): MessageDescriptor | null {
  switch (state.kind) {
    case "Acceptance ready":
      return state.rejection === undefined
        ? null
        : rejectionMessage(state.rejection);
    case "Acceptance submitting":
      return messages.invitationSubmitting;
    case "Acceptance pre-dispatch failure":
      return messages.invitationNotSent;
    default:
      return assertNever(state);
  }
}

type FlowAnnouncement = {
  readonly text: string;
  readonly priority: "polite" | "urgent";
};

function flowAnnouncement(
  intl: IntlShape,
  state: InvitationState,
  previous: InvitationState,
): FlowAnnouncement | null {
  const say = (
    priority: FlowAnnouncement["priority"],
    ...parts: readonly (MessageDescriptor | string)[]
  ): FlowAnnouncement => ({
    priority,
    text: parts
      .map((part) =>
        typeof part === "string" ? part : intl.formatMessage(part),
      )
      .filter((part) => part !== "")
      .join(" "),
  });
  switch (state.kind) {
    case "Awaiting stage":
    case "Signed-in interstitial":
    case "Signing out":
      return null;
    case "Preview due":
      return previous.kind === "Signing out"
        ? say("polite", messages.invitationSignedOut)
        : null;
    case "Checking":
      return previous.kind === "Preview due"
        ? null
        : say("polite", messages.invitationChecking);
    case "Preview throttled":
      return say(
        "urgent",
        messages.invitationPreviewThrottled,
        waitText(intl, state.error.retryAfterSeconds),
      );
    case "Preview CSRF rejected":
    case "Preview not sent":
      return say("urgent", previewRetryMessage(state));
    case "Acceptance ready":
      if (state.rejection !== undefined) {
        const { rejection } = state;
        return say(
          "urgent",
          rejectionMessage(rejection),
          waitText(
            intl,
            rejection.kind === "throttled"
              ? rejection.error.retryAfterSeconds
              : null,
          ),
        );
      }
      return previous.kind === "Checking"
        ? say(
            "polite",
            intl.formatMessage(messages.invitationRole, {
              role: intl.formatMessage(roleMessages[state.role]),
            }),
          )
        : null;
    case "Acceptance submitting":
      return say("polite", messages.invitationSubmitting);
    case "Acceptance pre-dispatch failure":
      return say("urgent", messages.invitationNotSent);
    case "Preview lost":
      return say(
        "urgent",
        messages.invitationLostHeading,
        messages.invitationLost,
      );
    case "Acceptance rejected":
      return say(
        "urgent",
        messages.invitationNotCreatedHeading,
        state.cause === "email registered"
          ? messages.invitationEmailRegistered
          : messages.authRequestFailed,
      );
    case "Acceptance succeeded":
      return say(
        "polite",
        messages.invitationCreatedHeading,
        messages.invitationCreated,
      );
    case "Acceptance outcome unknown":
      return say(
        "urgent",
        messages.invitationUnknownHeading,
        messages.invitationUnknown,
      );
    case "Link invalid":
      // Announced by the result itself, identically on entry and on rejection.
      return null;
    default:
      return assertNever(state);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled invitation surface: ${String(value)}`);
}
