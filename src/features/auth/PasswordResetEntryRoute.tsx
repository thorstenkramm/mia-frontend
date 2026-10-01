// Tailwind Plus: Application UI > Forms > Sign-in and Registration > Simple card (form)
// Tailwind Plus: Application UI > Feedback > Alerts > With actions (password changed)
// Tailwind Plus: Application UI > Feedback > Alerts > With description (link unusable,
// request rejected, outcome unknown; the unusable-link alert omits its heading
// because the page heading names that result)
// Tailwind Plus: Application UI > Elements > Buttons > Primary buttons and Secondary
// buttons (interstitial and result actions)
// Library version: 2026-09-13-083323, v4 React light. MIA keeps the card's two password
// fields (NewPasswordFields), focuses each result heading, replaces alert buttons with
// navigation links, and omits branding, social, and remember-me.
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/20/solid";
import {
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useIntl } from "react-intl";
import { Link, useLocation } from "react-router";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import type { EntryApiFailure } from "../../platform/api/entry";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import {
  useAuthenticationBootstrapState,
  useSessionActions,
} from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import {
  passwordResetSurface,
  type PasswordResetFormState,
  type PasswordResetLink,
  type PasswordResetState,
} from "../../platform/session/passwordResetLink";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { NewPasswordForm, useNewPasswordCheck } from "./NewPasswordFields";

type MessageDescriptor = (typeof messages)[keyof typeof messages];

const primaryAction =
  "rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
const secondaryAction =
  "rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

export default function PasswordResetEntryRoute({
  passwordResetLink,
}: {
  readonly passwordResetLink: PasswordResetLink;
}) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const session = useAuthenticationBootstrapState();
  const location = useLocation();
  const flow = useSyncExternalStore(
    passwordResetLink.subscribe,
    passwordResetLink.getSnapshot,
    passwordResetLink.getSnapshot,
  );
  const announcedFlow = useRef<PasswordResetState | null>(null);
  const surface = passwordResetSurface(session, flow, location.pathname);
  // Route entry focuses the page heading. Only a surface that replaces the one
  // shown at entry takes focus, so arrival never distinguishes a result.
  const [entrySurface] = useState(surface?.kind);
  const takeFocus = surface?.kind !== entrySurface;

  // Each authoritative flow transition is announced once; route entry is not.
  useLayoutEffect(() => {
    const previous = announcedFlow.current;
    if (previous === flow) return;
    announcedFlow.current = flow;
    if (previous === null) return;
    const announcement = flowAnnouncement(flow, previous);
    if (announcement === null) return;
    const text = [announcement.message, ...(announcement.detail ?? [])]
      .map((message) => intl.formatMessage(message))
      .concat(waitText(intl, flow))
      .filter((part) => part !== "")
      .join(" ");
    announce(text, announcement.priority);
  }, [announce, flow, intl]);

  if (surface === null)
    throw new Error("The reset route requires a reset surface.");
  switch (surface.kind) {
    case "interstitial":
      return (
        <SignedInInterstitial
          signingOut={surface.signingOut}
          passwordResetLink={passwordResetLink}
        />
      );
    case "form":
      return (
        <ResetForm
          state={surface.state}
          passwordResetLink={passwordResetLink}
          takeFocus={takeFocus}
        />
      );
    case "link unusable":
      return <LinkUnusable />;
    case "request rejected":
      return <RequestRejected error={surface.error} takeFocus={takeFocus} />;
    case "outcome unknown":
      return <OutcomeUnknown error={surface.error} takeFocus={takeFocus} />;
    case "password changed":
      return <PasswordChanged takeFocus={takeFocus} />;
    default:
      return assertNever(surface);
  }
}

function SignedInInterstitial({
  signingOut,
  passwordResetLink,
}: {
  readonly signingOut: boolean;
  readonly passwordResetLink: PasswordResetLink;
}) {
  const intl = useIntl();
  const { beginResetLinkLogout, continueDeferredAccess } = useSessionActions();
  return (
    <>
      <p className="text-center text-sm/6 text-gray-600">
        {intl.formatMessage(
          signingOut
            ? messages.logoutIntroduction
            : messages.resetSignedInIntroduction,
        )}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {/* Sign out stays mounted and unavailable while logout runs, so focus stays. */}
        <button
          type="button"
          aria-disabled={signingOut}
          className={primaryAction}
          onClick={() => {
            if (!signingOut && beginResetLinkLogout())
              passwordResetLink.beginSignOut();
          }}
        >
          {intl.formatMessage(messages.resetSignOutAndContinue)}
        </button>
        {signingOut ? null : (
          <button
            type="button"
            className={secondaryAction}
            onClick={() => {
              // Only a deliberate return runs the deferred capability gate.
              void continueDeferredAccess();
              passwordResetLink.goBack();
            }}
          >
            {intl.formatMessage(messages.resetGoBack)}
          </button>
        )}
      </div>
    </>
  );
}

function ResetForm({
  state,
  passwordResetLink,
  takeFocus,
}: {
  readonly state: PasswordResetFormState;
  readonly passwordResetLink: PasswordResetLink;
  readonly takeFocus: boolean;
}) {
  const intl = useIntl();
  const { resetPassword } = useSessionActions();
  const check = useNewPasswordCheck();
  const { problems, passwordRef, confirmationRef } = check;
  const retryAfter =
    state.kind === "Throttled" ? state.error.retryAfterSeconds : null;
  const [retryAvailable, setRetryAvailable] = useState(
    retryAfter === null || retryAfter === 0,
  );
  useLayoutEffect(() => {
    if (retryAfter === null || retryAfter === 0) {
      setRetryAvailable(true);
      return;
    }
    setRetryAvailable(false);
    const timeout = window.setTimeout(
      () => setRetryAvailable(true),
      retryAfter * 1000,
    );
    return () => window.clearTimeout(timeout);
  }, [retryAfter]);
  const enabled = state.kind !== "Submitting" && retryAvailable;

  // A form that replaces the signed-in interstitial takes focus once.
  const [focusAtMount] = useState(takeFocus);
  useLayoutEffect(() => {
    if (focusAtMount) passwordRef.current?.focus();
  }, [focusAtMount, passwordRef]);

  // Throttling and a rejected security check keep the token but clear passwords.
  useLayoutEffect(() => {
    if (state.kind !== "Throttled" && state.kind !== "CSRF rejected") return;
    for (const input of [passwordRef.current, confirmationRef.current])
      if (input !== null) input.value = "";
  }, [confirmationRef, passwordRef, state]);

  // Returns the pending work instead of awaiting it, so no frame here keeps the
  // passwords while the request waits or runs.
  function submit(data: FormData): Promise<void> {
    const password = data.get("password");
    const confirmation = data.get("password_confirmation");
    data.delete("password");
    data.delete("password_confirmation");
    return typeof password === "string" && typeof confirmation === "string"
      ? passwordResetLink.submit(password, confirmation, resetPassword)
      : Promise.resolve();
  }

  const status = problems === null ? formStatus(state) : null;
  const error = "error" in state ? state.error : undefined;
  return (
    <>
      <p className="text-center text-sm/6 text-gray-600">
        {intl.formatMessage(messages.resetIntroduction)}
      </p>
      <div className="mt-8 bg-white px-6 py-12 shadow-sm sm:rounded-lg sm:px-12">
        <NewPasswordForm
          action={submit}
          check={check}
          enabled={enabled}
          rejectedBy={
            state.kind === "Password rejected" ? "password-reset-status" : null
          }
          className="space-y-6"
        >
          <AuthSubmitButton
            enabled={enabled}
            label={intl.formatMessage(messages.resetSubmit)}
          />
          {/* Visible status only; the shared announcement owner speaks transitions. */}
          <p id="password-reset-status" className="text-sm/6 text-gray-900">
            {status === null
              ? null
              : [intl.formatMessage(status), waitText(intl, state)]
                  .filter((text) => text !== "")
                  .join(" ")}
          </p>
          {error !== undefined && problems === null ? (
            <TechnicalErrorDisclosure error={error} />
          ) : null}
          {state.kind === "CSRF rejected" &&
          state.refreshError !== undefined &&
          problems === null ? (
            <TechnicalErrorDisclosure error={state.refreshError} />
          ) : null}
        </NewPasswordForm>
      </div>
      <p className="mt-6 text-center text-sm/6 text-gray-600">
        <Link
          to="/login"
          className="inline-flex min-h-6 items-center font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => passwordResetLink.depart()}
        >
          {intl.formatMessage(messages.resetGoBack)}
        </Link>
      </p>
    </>
  );
}

// One presentation for every unusable cause and for a missing or lost token.
// Its heading is the page heading, which receives focus on route entry and when
// it replaces the form; it announces itself once whenever it appears.
function LinkUnusable() {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  useLayoutEffect(() => {
    announce(
      [messages.resetLinkUnusableHeading, messages.resetLinkUnusable]
        .map((message) => intl.formatMessage(message))
        .join(" "),
      "urgent",
    );
  }, [announce, intl]);
  return (
    <WarningResult
      heading={null}
      body={messages.resetLinkUnusable}
      takeFocus={false}
      disclosure={null}
    >
      <RequestNewLinkActions />
    </WarningResult>
  );
}

// The two exits shared by results that end this link's use.
function RequestNewLinkActions() {
  const intl = useIntl();
  return (
    <>
      <Link to="/login/recovery" className={primaryAction}>
        {intl.formatMessage(messages.resetRequestNewLink)}
      </Link>
      <Link to="/login" className={secondaryAction}>
        {intl.formatMessage(messages.backToSignIn)}
      </Link>
    </>
  );
}

// Decision 7: a definitive generic rejection ends this link's use.
function RequestRejected({
  error,
  takeFocus,
}: {
  readonly error: EntryApiFailure;
  readonly takeFocus: boolean;
}) {
  return (
    <WarningResult
      heading={messages.resetRejectedHeading}
      body={messages.authRequestFailed}
      takeFocus={takeFocus}
      disclosure={<TechnicalErrorDisclosure error={error} />}
    >
      <RequestNewLinkActions />
    </WarningResult>
  );
}

function OutcomeUnknown({
  error,
  takeFocus,
}: {
  readonly error: EntryApiFailure;
  readonly takeFocus: boolean;
}) {
  const intl = useIntl();
  return (
    <WarningResult
      heading={messages.resetUnknownHeading}
      body={messages.resetUnknown}
      takeFocus={takeFocus}
      disclosure={<TechnicalErrorDisclosure error={error} />}
    >
      {/* A document navigation, so sign-in starts from cold discovery. */}
      <a href="/login" className={primaryAction}>
        {intl.formatMessage(messages.resetTrySignIn)}
      </a>
      <Link to="/login/recovery" className={secondaryAction}>
        {intl.formatMessage(messages.resetRequestNewLink)}
      </Link>
    </WarningResult>
  );
}

// Alerts > With description: a terminal reset result with a focusable heading
// (omitted when the page heading names the result), followed by its actions.
function WarningResult({
  heading,
  body,
  takeFocus,
  disclosure,
  children,
}: {
  readonly heading: MessageDescriptor | null;
  readonly body: MessageDescriptor;
  readonly takeFocus: boolean;
  readonly disclosure: ReactNode;
  readonly children: ReactNode;
}) {
  const intl = useIntl();
  const headingRef = useFocusedOnMount(takeFocus);
  return (
    <>
      <div className="mt-8 rounded-md bg-yellow-50 p-4">
        <div className="flex">
          <div className="shrink-0">
            <ExclamationTriangleIcon
              aria-hidden="true"
              className="size-5 text-yellow-400"
            />
          </div>
          <div className="ml-3 min-w-0">
            {heading === null ? null : (
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="mb-2 text-sm font-medium text-yellow-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                {intl.formatMessage(heading)}
              </h2>
            )}
            <div className="text-sm text-yellow-700">
              <p>{intl.formatMessage(body)}</p>
              {disclosure}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>
    </>
  );
}

function PasswordChanged({ takeFocus }: { readonly takeFocus: boolean }) {
  const intl = useIntl();
  const headingRef = useFocusedOnMount(takeFocus);
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
            ref={headingRef}
            tabIndex={-1}
            className="text-sm font-medium text-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            {intl.formatMessage(messages.resetChangedHeading)}
          </h2>
          <div className="mt-2 space-y-2 text-sm text-green-700">
            <p>{intl.formatMessage(messages.resetChangedMfa)}</p>
            <p>{intl.formatMessage(messages.resetChangedOtherBrowsers)}</p>
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
              {/* A document navigation, so sign-in starts from cold discovery. */}
              <a
                href="/login"
                className="rounded-md bg-green-50 px-2 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
              >
                {intl.formatMessage(messages.loginSubmit)}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// A result that replaces the form moves focus to its heading when it mounts.
function useFocusedOnMount(takeFocus: boolean) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [focusAtMount] = useState(takeFocus);
  useLayoutEffect(() => {
    if (focusAtMount) ref.current?.focus();
  }, [focusAtMount]);
  return ref;
}

function formStatus(state: PasswordResetFormState): MessageDescriptor | null {
  switch (state.kind) {
    case "Form ready":
      return null;
    case "Submitting":
      return messages.resetSubmitting;
    case "Password rejected":
      return messages.passwordChangeRejected;
    case "Throttled":
      return messages.resetThrottled;
    case "CSRF rejected":
      return messages.resetCsrfRejected;
    case "Failed":
      return messages.authRequestFailed;
    default:
      return assertNever(state);
  }
}

type FlowAnnouncement = {
  readonly message: MessageDescriptor;
  readonly detail?: readonly MessageDescriptor[];
  readonly priority: "polite" | "urgent";
};

function flowAnnouncement(
  state: PasswordResetState,
  previous: PasswordResetState,
): FlowAnnouncement | null {
  switch (state.kind) {
    case "Awaiting stage":
    case "Signed-in interstitial":
    case "Signing out":
      return null;
    case "Form ready":
      return previous.kind === "Signing out"
        ? { message: messages.resetSignedOut, priority: "polite" }
        : null;
    case "Submitting":
    case "Password rejected":
    case "Throttled":
    case "CSRF rejected":
    case "Failed": {
      const message = formStatus(state);
      return message === null
        ? null
        : {
            message,
            priority: state.kind === "Submitting" ? "polite" : "urgent",
          };
    }
    case "Link unusable":
      // Announced by the result itself, identically on entry and on rejection.
      return null;
    case "Request rejected":
      return {
        message: messages.resetRejectedHeading,
        detail: [messages.authRequestFailed],
        priority: "urgent",
      };
    case "Outcome unknown":
      return {
        message: messages.resetUnknownHeading,
        detail: [messages.resetUnknown],
        priority: "urgent",
      };
    case "Password changed":
      return {
        message: messages.resetChangedHeading,
        detail: [messages.resetChangedMfa, messages.resetChangedOtherBrowsers],
        priority: "polite",
      };
    default:
      return assertNever(state);
  }
}

function waitText(
  intl: ReturnType<typeof useIntl>,
  state: PasswordResetState,
): string {
  return state.kind === "Throttled" && state.error.retryAfterSeconds !== null
    ? intl.formatMessage(messages.passwordChangeWait, {
        seconds: state.error.retryAfterSeconds,
      })
    : "";
}

function assertNever(value: never): never {
  throw new Error(`Unhandled password-reset surface: ${String(value)}`);
}
