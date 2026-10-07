import { PlusIcon } from "@heroicons/react/20/solid";
import { useId, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import {
  isHiddenInvitationFailure,
  listInvitations,
  type InvitationPage,
} from "../../platform/api/invitations";
import type { EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import type { InvitationRouteProps } from "./InvitationRouteProps";
import {
  DeliveryBadge,
  OutcomeAlert,
  StatusBadge,
  expectResource,
  formatInstant,
  primaryActionClass,
  roleLabel,
  secondaryActionClass,
} from "./InvitationStatus";

type ListActivity =
  | { readonly kind: "Idle" }
  | { readonly kind: "Loading" }
  | { readonly kind: "Load failed"; readonly error: EntryApiFailure };

// Tailwind Plus: Application UI > Lists > Tables > Simple, Navigation >
// Pagination > Simple card footer, and Feedback > Empty States > Simple;
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas: the shell owns
// the h1; a captioned, keyboard-scrollable table region; each row's only
// control is its detail link (no row actions, FFR-804); pagination follows the
// backend links with no total or page count; explicit Refresh and last-checked
// time instead of polling.
export default function InvitationListRoute({
  resource,
  links,
  unavailable,
}: InvitationRouteProps) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { readAuthenticated } = useSessionActions();
  const captionId = useId();
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const [view, setView] = useState<{
    readonly page: InvitationPage;
    readonly checkedAt: number;
  }>(() => ({
    page: expectResource(resource, "invitation list").page,
    checkedAt: Date.now(),
  }));
  const [activity, setActivity] = useState<ListActivity>({ kind: "Idle" });
  const sequence = useRef(0);

  const load = (offset: number) => {
    const attempt = ++sequence.current;
    setActivity({ kind: "Loading" });
    void readAuthenticated((signal) => listInvitations(offset, signal)).then(
      (result) => {
        if (attempt !== sequence.current) return;
        switch (result.kind) {
          case "completed":
            setView({ page: result.value, checkedAt: Date.now() });
            setActivity({ kind: "Idle" });
            announce(
              intl.formatMessage(messages.invitationsListUpdated),
              "polite",
            );
            listHeadingRef.current?.focus({ preventScroll: false });
            return;
          case "failed":
            if (isHiddenInvitationFailure(result.failure))
              return unavailable(result.failure);
            setActivity({ kind: "Load failed", error: result.failure });
            announce(
              intl.formatMessage(messages.invitationsListLoadFailed),
              "urgent",
            );
            return;
          case "superseded":
            return;
        }
      },
    );
  };

  const { page, checkedAt } = view;
  const busy = activity.kind === "Loading";
  const inviteLink = (
    <Link to={links.create} className={primaryActionClass}>
      <PlusIcon aria-hidden="true" className="mr-1.5 -ml-0.5 size-5" />
      {intl.formatMessage(messages.invitationsInviteSupervisor)}
    </Link>
  );

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <p className="text-sm text-gray-700">
            {intl.formatMessage(messages.invitationsListIntroduction)}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">{inviteLink}</div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2
          ref={listHeadingRef}
          tabIndex={-1}
          className="text-base font-semibold text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {intl.formatMessage(messages.invitationsListSectionHeading)}
        </h2>
        <p className="text-sm text-gray-500">
          {intl.formatMessage(messages.invitationsLastChecked, {
            time: formatInstant(intl, checkedAt),
          })}
        </p>
        <button
          type="button"
          aria-disabled={busy}
          onClick={() => {
            if (!busy) load(page.offset);
          }}
          className={secondaryActionClass}
        >
          {intl.formatMessage(
            busy ? messages.invitationsChecking : messages.invitationsRefresh,
          )}
        </button>
      </div>

      {activity.kind === "Load failed" ? (
        <OutcomeAlert
          tone="warning"
          heading={intl.formatMessage(messages.invitationsListLoadFailed)}
        >
          <p>{intl.formatMessage(messages.invitationsShowingOld)}</p>
          <TechnicalErrorDisclosure error={activity.error} />
        </OutcomeAlert>
      ) : null}

      {page.invitations.length === 0 ? (
        <div className="mt-8 text-center">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="mx-auto size-12 text-gray-400"
          >
            <path
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            {intl.formatMessage(
              page.offset === 0
                ? messages.invitationsEmptyHeading
                : messages.invitationsEmptyPageHeading,
            )}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {intl.formatMessage(
              page.offset === 0
                ? messages.invitationsEmpty
                : messages.invitationsEmptyPage,
            )}
          </p>
          {page.offset === 0 ? <div className="mt-6">{inviteLink}</div> : null}
        </div>
      ) : (
        <div className="mt-4 flow-root">
          <div
            role="region"
            aria-labelledby={captionId}
            tabIndex={0}
            className="-mx-4 -my-2 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:-mx-6 lg:-mx-8"
          >
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="relative min-w-full divide-y divide-gray-300">
                <caption id={captionId} className="sr-only">
                  {intl.formatMessage(messages.invitationsTableCaption)}
                </caption>
                <thead>
                  <tr>
                    {[
                      messages.invitationsFieldEmail,
                      messages.invitationsFieldRole,
                      messages.invitationsFieldStatus,
                      messages.invitationsFieldDelivery,
                      messages.invitationsFieldCreated,
                    ].map((label, index) => (
                      <th
                        key={label.id}
                        scope="col"
                        className={
                          index === 0
                            ? "py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-gray-900 sm:pl-0"
                            : "px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                        }
                      >
                        {intl.formatMessage(label)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {page.invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <th
                        scope="row"
                        className="py-4 pr-3 pl-4 text-left text-sm font-medium text-gray-900 sm:pl-0"
                      >
                        <Link
                          to={links.detail(invitation.id)}
                          dir="ltr"
                          className="break-all text-indigo-600 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                          {invitation.email}
                        </Link>
                      </th>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        {roleLabel(intl, invitation.role)}
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        <StatusBadge status={invitation.status} />
                      </td>
                      <td className="px-3 py-4 text-sm whitespace-nowrap text-gray-500">
                        <DeliveryBadge state={invitation.deliveryState} />
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {formatInstant(intl, invitation.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {page.previousOffset === null && page.nextOffset === null ? null : (
        <nav
          aria-label={intl.formatMessage(messages.invitationsPagination)}
          className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
        >
          <div className="flex flex-1 flex-wrap justify-between gap-3 sm:justify-end">
            {page.previousOffset === null ? null : (
              <PageButton
                busy={busy}
                label={intl.formatMessage(messages.invitationsPreviousPage)}
                onClick={() => {
                  if (page.previousOffset !== null) load(page.previousOffset);
                }}
              />
            )}
            {page.nextOffset === null ? null : (
              <PageButton
                busy={busy}
                label={intl.formatMessage(messages.invitationsNextPage)}
                onClick={() => {
                  if (page.nextOffset !== null) load(page.nextOffset);
                }}
              />
            )}
          </div>
        </nav>
      )}
    </div>
  );
}

function PageButton({
  busy,
  label,
  onClick,
}: {
  readonly busy: boolean;
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-disabled={busy}
      onClick={() => {
        if (!busy) onClick();
      }}
      className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-700 inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 aria-disabled:opacity-50"
    >
      {label}
    </button>
  );
}
