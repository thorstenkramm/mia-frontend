// Pieces shared by the fragment-token link routes (password reset, invitation).
// Tailwind Plus: Application UI > Feedback > Alerts > With description (warning
// results; the heading is omitted when the page heading names the result)
// Tailwind Plus: Application UI > Feedback > Alerts > With actions (success results)
// Tailwind Plus: Application UI > Elements > Buttons > Primary buttons and Secondary
// buttons (interstitial and result actions)
// Library version: 2026-09-13-083323, v4 React light. MIA focuses each result
// heading and replaces alert buttons with navigation links.
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/20/solid";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";

type MessageDescriptor = (typeof messages)[keyof typeof messages];

export const primaryAction =
  "rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
export const secondaryAction =
  "rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

// The flow side of a link interstitial: it records the deliberate sign-out and
// drops its token on Go back.
type InterstitialLink = {
  readonly beginSignOut: () => void;
  readonly goBack: () => void;
};

// Shown while a captured link meets a signed-in stage. It names no account and
// mounts no application navigation.
export function SignedInInterstitial({
  signingOut,
  introduction,
  link,
}: {
  readonly signingOut: boolean;
  readonly introduction: MessageDescriptor;
  readonly link: InterstitialLink;
}) {
  const intl = useIntl();
  const { beginLinkLogout, continueDeferredAccess } = useSessionActions();
  return (
    <>
      <p className="text-center text-sm/6 text-gray-600">
        {intl.formatMessage(
          signingOut ? messages.logoutIntroduction : introduction,
        )}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {/* Sign out stays mounted and unavailable while logout runs, so focus stays. */}
        <button
          type="button"
          aria-disabled={signingOut}
          className={primaryAction}
          onClick={() => {
            if (!signingOut && beginLinkLogout()) link.beginSignOut();
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
              link.goBack();
            }}
          >
            {intl.formatMessage(messages.resetGoBack)}
          </button>
        )}
      </div>
    </>
  );
}

// Alerts > With description: a terminal link result with a focusable heading
// (omitted when the page heading names the result), followed by its actions.
export function WarningResult({
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

// Alerts > With actions: a link flow's terminal success. Its only action is a
// document navigation to sign-in, so sign-in starts from cold discovery.
export function SuccessResult({
  heading,
  body,
  takeFocus,
}: {
  readonly heading: MessageDescriptor;
  readonly body: readonly MessageDescriptor[];
  readonly takeFocus: boolean;
}) {
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
            {intl.formatMessage(heading)}
          </h2>
          <div className="mt-2 space-y-2 text-sm text-green-700">
            {body.map((message) => (
              <p key={message.id}>{intl.formatMessage(message)}</p>
            ))}
          </div>
          <div className="mt-4">
            <div className="-mx-2 -my-1.5 flex">
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

// A result that replaces earlier content moves focus to its target on mount.
export function useFocusedOnMount<T extends HTMLElement = HTMLHeadingElement>(
  takeFocus: boolean,
) {
  const ref = useRef<T>(null);
  const [focusAtMount] = useState(takeFocus);
  useLayoutEffect(() => {
    if (focusAtMount) ref.current?.focus();
  }, [focusAtMount]);
  return ref;
}

// A valid `Retry-After` makes the deliberate retry unavailable until it passes.
export function useRetryAvailable(retryAfterSeconds: number | null): boolean {
  const [available, setAvailable] = useState(
    retryAfterSeconds === null || retryAfterSeconds === 0,
  );
  useLayoutEffect(() => {
    if (retryAfterSeconds === null || retryAfterSeconds === 0) {
      setAvailable(true);
      return;
    }
    setAvailable(false);
    // Browsers overflow a delay above the 32-bit maximum and fire at once, so
    // a long wait runs as bounded chunks and enables only after the last one.
    let remaining = retryAfterSeconds * 1000;
    let timeout: number | undefined;
    const schedule = () => {
      const delay = Math.min(remaining, maximumTimerDelay);
      remaining -= delay;
      timeout = window.setTimeout(() => {
        if (remaining > 0) schedule();
        else setAvailable(true);
      }, delay);
    };
    schedule();
    return () => window.clearTimeout(timeout);
  }, [retryAfterSeconds]);
  return available;
}

const maximumTimerDelay = 2_147_483_647;

// The localized wait for a throttled state with a valid `Retry-After`.
export function waitText(
  intl: ReturnType<typeof useIntl>,
  retryAfterSeconds: number | null,
): string {
  return retryAfterSeconds === null
    ? ""
    : intl.formatMessage(messages.passwordChangeWait, {
        seconds: retryAfterSeconds,
      });
}
