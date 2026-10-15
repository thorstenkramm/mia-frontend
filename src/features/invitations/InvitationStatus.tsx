import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/20/solid";
import clsx from "clsx";
import type { ReactNode, Ref } from "react";
import { useIntl, type IntlShape } from "react-intl";
import type {
  Invitation,
  InvitationDeliveryCode,
  InvitationDeliveryState,
  InvitationRole,
  InvitationStatus,
} from "../../platform/api/invitations";
import { messages } from "../../platform/i18n/messages";
import type { InvitationRouteResource } from "./InvitationRouteProps";

type MessageDescriptor = (typeof messages)[keyof typeof messages];

// The lifecycle and the latest delivery are separate authoritative states
// (BACKEND-CONTRACT-GAPS.md §BCG-006 Story 3.1 decision). `queued` and
// `ambiguous` never mean sent; `delivered` is SMTP acceptance only.
const roleLabels: Record<InvitationRole, MessageDescriptor> = {
  administrator: messages.roleAdministrator,
  supervisor: messages.roleSupervisor,
  mentor: messages.roleMentor,
};
const statusLabels: Record<InvitationStatus, MessageDescriptor> = {
  pending: messages.invitationsStatusPending,
  accepted: messages.invitationsStatusAccepted,
  revoked: messages.invitationsStatusRevoked,
  faulty: messages.invitationsStatusFaulty,
};
const deliveryLabels: Record<InvitationDeliveryState, MessageDescriptor> = {
  queued: messages.invitationsDeliveryQueued,
  delivered: messages.invitationsDeliveryDelivered,
  ambiguous: messages.invitationsDeliveryAmbiguous,
  failed: messages.invitationsDeliveryFailed,
};
const deliveryExplanations: Record<InvitationDeliveryState, MessageDescriptor> =
  {
    queued: messages.invitationsDeliveryQueuedHelp,
    delivered: messages.invitationsDeliveryDeliveredHelp,
    ambiguous: messages.invitationsDeliveryAmbiguousHelp,
    failed: messages.invitationsDeliveryFailedHelp,
  };
const deliveryCodes: Record<
  NonNullable<InvitationDeliveryCode>,
  MessageDescriptor
> = {
  invitation_delivery_timeout: messages.invitationsDeliveryCodeTimeout,
  invitation_delivery_ambiguous: messages.invitationsDeliveryCodeAmbiguous,
  invitation_delivery_rejected: messages.invitationsDeliveryCodeRejected,
};

type Tone = "gray" | "yellow" | "green" | "red";
const statusTones: Record<InvitationStatus, Tone> = {
  pending: "yellow",
  accepted: "green",
  revoked: "gray",
  faulty: "red",
};
const deliveryTones: Record<InvitationDeliveryState, Tone> = {
  queued: "gray",
  delivered: "green",
  ambiguous: "yellow",
  failed: "red",
};

export function roleLabel(intl: IntlShape, role: InvitationRole): string {
  return intl.formatMessage(roleLabels[role]);
}

export function formatInstant(intl: IntlShape, instant: number): string {
  return intl.formatDate(instant, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// Tailwind Plus: Application UI > Elements > Badges > Flat with dot,
// v4/react-light.jsx, library 2026-09-13-083323. The full text is the state;
// the dot only reinforces it and is hidden from assistive technology.
function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium forced-colors:border",
        {
          gray: "bg-gray-100 text-gray-600",
          yellow: "bg-yellow-100 text-yellow-800",
          green: "bg-green-100 text-green-700",
          red: "bg-red-100 text-red-700",
        }[tone],
      )}
    >
      <svg
        viewBox="0 0 6 6"
        aria-hidden="true"
        className={clsx(
          "size-1.5 shrink-0",
          {
            gray: "fill-gray-400",
            yellow: "fill-yellow-500",
            green: "fill-green-500",
            red: "fill-red-500",
          }[tone],
        )}
      >
        <circle r={3} cx={3} cy={3} />
      </svg>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: InvitationStatus }) {
  const intl = useIntl();
  return (
    <Badge tone={statusTones[status]}>
      {intl.formatMessage(statusLabels[status])}
    </Badge>
  );
}

export function DeliveryBadge({ state }: { state: InvitationDeliveryState }) {
  const intl = useIntl();
  return (
    <Badge tone={deliveryTones[state]}>
      {intl.formatMessage(deliveryLabels[state])}
    </Badge>
  );
}

// Tailwind Plus: Application UI > Data Display > Description Lists >
// Left-aligned in card, v4/react-light.jsx, library 2026-09-13-083323. MIA
// deltas: h2 card heading, escaped text only, and wrapping values.
export function InvitationSummary({
  invitation,
  checkedAt,
}: {
  readonly invitation: Invitation;
  // When this representation was read; omitted for a mutation's own result.
  readonly checkedAt?: number;
}) {
  const intl = useIntl();
  const rows: { label: MessageDescriptor; value: ReactNode }[] = [
    {
      label: messages.invitationsFieldEmail,
      value: <span dir="ltr">{invitation.email}</span>,
    },
    {
      label: messages.invitationsFieldRole,
      value: roleLabel(intl, invitation.role),
    },
    {
      label: messages.invitationsFieldStatus,
      value: <StatusBadge status={invitation.status} />,
    },
    {
      label: messages.invitationsFieldDelivery,
      value: (
        <>
          <DeliveryBadge state={invitation.deliveryState} />
          {invitation.status === "pending" ? (
            <p className="mt-2">
              {intl.formatMessage(
                deliveryExplanations[invitation.deliveryState],
              )}
            </p>
          ) : (
            <p className="mt-2">
              {intl.formatMessage(messages.invitationsDeliveryLifecycleNeutral)}
            </p>
          )}
          {invitation.deliveryCode === null ? null : (
            <p className="mt-1">
              {intl.formatMessage(messages.invitationsDeliveryCode, {
                reason: intl.formatMessage(
                  deliveryCodes[invitation.deliveryCode],
                ),
              })}
            </p>
          )}
        </>
      ),
    },
    {
      label: messages.invitationsFieldAttempted,
      value:
        invitation.deliveryAttemptedAt === null
          ? intl.formatMessage(messages.invitationsNoAttempt)
          : formatInstant(intl, invitation.deliveryAttemptedAt),
    },
    ...(invitation.status === "faulty" && invitation.failureCode !== null
      ? [
          {
            label: messages.invitationsFieldFailureCode,
            value: (
              <code dir="ltr" className="break-all">
                {invitation.failureCode}
              </code>
            ),
          },
        ]
      : []),
    {
      label: messages.invitationsFieldCreated,
      value: formatInstant(intl, invitation.createdAt),
    },
  ];
  return (
    <div className="mt-6 overflow-hidden bg-white shadow-sm sm:rounded-lg">
      <div className="px-4 py-6 sm:px-6">
        <h2 className="text-base/7 font-semibold text-gray-900">
          {intl.formatMessage(messages.invitationsSummaryHeading)}
        </h2>
        {checkedAt === undefined ? null : (
          <p className="mt-1 max-w-2xl text-sm/6 text-gray-500">
            {intl.formatMessage(messages.invitationsLastChecked, {
              time: formatInstant(intl, checkedAt),
            })}
          </p>
        )}
      </div>
      <div className="border-t border-gray-100">
        <dl className="divide-y divide-gray-100">
          {rows.map((row) => (
            <div
              key={row.label.id}
              className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
            >
              <dt className="text-sm font-medium text-gray-900">
                {intl.formatMessage(row.label)}
              </dt>
              <dd className="mt-1 text-sm/6 break-words text-gray-700 sm:col-span-2 sm:mt-0">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// Tailwind Plus: Application UI > Feedback > Alerts > With actions,
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas: success uses the
// blueprint's green palette, every other outcome the existing MIA warning
// palette; h2 heading that can take focus; wrapping actions.
export function OutcomeAlert({
  tone,
  heading,
  headingRef,
  children,
  actions,
}: {
  readonly tone: "success" | "warning";
  readonly heading: string;
  readonly headingRef?: Ref<HTMLHeadingElement>;
  readonly children: ReactNode;
  readonly actions?: ReactNode;
}) {
  const success = tone === "success";
  const Icon = success ? CheckCircleIcon : ExclamationTriangleIcon;
  return (
    <div
      className={clsx(
        "mt-6 rounded-md p-4",
        success ? "bg-green-50" : "bg-yellow-50",
      )}
    >
      <div className="flex">
        <div className="shrink-0">
          <Icon
            aria-hidden="true"
            className={clsx(
              "size-5",
              success ? "text-green-400" : "text-yellow-400",
            )}
          />
        </div>
        <div className="ml-3 min-w-0">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className={clsx(
              "text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2",
              success
                ? "text-green-800 focus-visible:outline-green-600"
                : "text-yellow-800 focus-visible:outline-yellow-600",
            )}
          >
            {heading}
          </h2>
          <div
            className={clsx(
              "mt-2 space-y-2 text-sm",
              success ? "text-green-700" : "text-yellow-700",
            )}
          >
            {children}
          </div>
          {/* This actions slot shares the Tailwind Plus alert-with-actions
              blueprint with RouteRecoveryPanel.tsx; the pair's jscpd marker
              lives in RouteRecoveryPanel.tsx. */}
          {actions === undefined ? null : (
            <div className="mt-4">
              <div className="-mx-2 -my-1.5 flex flex-wrap gap-3">
                {actions}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function alertActionClass(tone: "success" | "warning"): string {
  return clsx(
    "rounded-md px-2 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2",
    tone === "success"
      ? "bg-green-50 text-green-800 hover:bg-green-100 focus-visible:outline-green-600"
      : "bg-yellow-50 text-yellow-800 hover:bg-yellow-100 focus-visible:outline-yellow-600",
  );
}

// Primary and Secondary buttons: Application UI > Elements > Buttons, v4
// react-light, library 2026-09-13-083323 (`px-3 py-2`). MIA keeps unavailable
// controls focusable and refuses activation instead.
export const primaryActionClass =
  "inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 aria-disabled:opacity-50";
export const secondaryActionClass =
  "inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 aria-disabled:opacity-50";
export const dangerActionClass =
  "inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 aria-disabled:opacity-50";

// The route table admits each surface with its declared resource only.
export function expectResource<K extends InvitationRouteResource["kind"]>(
  resource: InvitationRouteResource,
  kind: K,
): Extract<InvitationRouteResource, { kind: K }> {
  if (resource.kind !== kind)
    throw new Error(`Invitation route admitted without its ${kind} resource.`);
  return resource as Extract<InvitationRouteResource, { kind: K }>;
}
