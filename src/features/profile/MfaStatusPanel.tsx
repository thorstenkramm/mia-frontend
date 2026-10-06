import type { ReactNode } from "react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import type { MfaState } from "../../platform/api/mfa";
import { useMfaEnrollment } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { mfaPaths } from "../../platform/session/mfaEnrollment";

type Message = (typeof messages)[keyof typeof messages];

// Tailwind Plus: Application UI > Forms > Action Panels > Simple,
// v4/react-light.jsx, library version 2026-09-13-083323. MIA uses an h2,
// several description paragraphs, and wrapped actions.
export function MfaStatusPanel({
  heading,
  children,
  actions,
}: {
  readonly heading: Message;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}) {
  const intl = useIntl();
  return (
    <div className="mt-8 bg-white shadow-sm sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900">
          {intl.formatMessage(heading)}
        </h2>
        <div className="mt-2 max-w-xl space-y-2 text-sm text-gray-500">
          {children}
        </div>
        {actions === undefined ? null : (
          <div className="mt-5 flex flex-wrap gap-3">{actions}</div>
        )}
      </div>
    </div>
  );
}

export function PendingExpiry({ expiresAt }: { readonly expiresAt: number }) {
  const intl = useIntl();
  return (
    <p>
      {intl.formatMessage(messages.mfaPendingExpires, {
        expiresAt: intl.formatDate(expiresAt, {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        }),
      })}
    </p>
  );
}

// The pending-enrollment state shared by the overview and start surfaces.
export function PendingSetupPanel({
  state,
  busy,
  canContinue,
}: {
  readonly state: MfaState;
  readonly busy: boolean;
  readonly canContinue: boolean;
}) {
  const intl = useIntl();
  const mfa = useMfaEnrollment();
  const pending = state.pendingEnrollment;
  if (pending === null) return null;
  const continuable =
    canContinue && pending.method === "totp" && state.actions.verify;
  return (
    <MfaStatusPanel
      heading={messages.mfaStatusPending}
      actions={
        continuable || state.actions.cancel ? (
          <>
            {continuable ? (
              <PrimaryLink to={mfaPaths.verify}>
                {intl.formatMessage(messages.mfaContinueSetup)}
              </PrimaryLink>
            ) : null}
            {state.actions.cancel ? (
              <SecondaryButton
                disabled={busy}
                onClick={() => void mfa.cancel()}
              >
                {intl.formatMessage(messages.mfaCancelSetup)}
              </SecondaryButton>
            ) : null}
          </>
        ) : undefined
      }
    >
      <PendingExpiry expiresAt={pending.expiresAt} />
      {pending.method === "sms" ? (
        <p>{intl.formatMessage(messages.mfaPendingSms)}</p>
      ) : null}
    </MfaStatusPanel>
  );
}

// Primary and Secondary buttons: Application UI > Elements > Buttons, v4
// react-light, library version 2026-09-13-083323 (the `px-3 py-2` size).
// MIA keeps unavailable buttons focusable and refuses activation instead.
export function PrimaryLink({
  to,
  children,
}: {
  readonly to: string;
  readonly children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {children}
    </Link>
  );
}

export function PrimaryButton({
  disabled,
  onClick,
  onUnavailable,
  children,
}: {
  readonly disabled: boolean;
  readonly onClick: () => void;
  // Explains why an unavailable activation was refused.
  readonly onUnavailable?: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onClick();
        else onUnavailable?.();
      }}
      className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 aria-disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  disabled,
  onClick,
  children,
}: {
  readonly disabled: boolean;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onClick();
      }}
      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 aria-disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function TextLink({
  to,
  children,
}: {
  readonly to: string;
  readonly children: ReactNode;
}) {
  return (
    <p className="mt-8 text-center text-sm/6">
      <Link
        to={to}
        className="inline-block min-h-6 font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        {children}
      </Link>
    </p>
  );
}
