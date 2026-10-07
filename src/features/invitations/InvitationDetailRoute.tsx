import { useState } from "react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import {
  getInvitation,
  isHiddenInvitationFailure,
  type ReviewedInvitation,
} from "../../platform/api/invitations";
// All invitation surfaces consume this one bounded transport-error type. Its
// fixed import shape is not shared workflow logic: detail, resend and revoke
// keep their own domain contracts. The marker covers this declaration only.
// jscpd:ignore-start
import type { EntryApiFailure } from "../../platform/api/entry";
// jscpd:ignore-end
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import type { InvitationRouteProps } from "./InvitationRouteProps";
import {
  InvitationSummary,
  OutcomeAlert,
  expectResource,
  primaryActionClass,
  secondaryActionClass,
} from "./InvitationStatus";

type DetailActivity =
  | { readonly kind: "Idle" }
  | { readonly kind: "Checking" }
  | { readonly kind: "Check failed"; readonly error: EntryApiFailure };

// FRONTEND-STATE-MACHINES.md §23 and §27: the persisted lifecycle and latest
// delivery, refreshed only by an explicit check; actions follow the status.
export default function InvitationDetailRoute({
  resource,
  links,
  unavailable,
}: InvitationRouteProps) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { readAuthenticated } = useSessionActions();
  const [view, setView] = useState<{
    readonly reviewed: ReviewedInvitation;
    readonly checkedAt: number;
  }>(() => ({
    reviewed: expectResource(resource, "invitation").reviewed,
    checkedAt: Date.now(),
  }));
  const [activity, setActivity] = useState<DetailActivity>({ kind: "Idle" });
  const invitation = view.reviewed.invitation;
  const checking = activity.kind === "Checking";

  const refresh = () => {
    if (checking) return;
    setActivity({ kind: "Checking" });
    void readAuthenticated((signal) =>
      getInvitation(invitation.id, signal),
    ).then((result) => {
      switch (result.kind) {
        case "completed": {
          const next = result.value.invitation;
          setView({ reviewed: result.value, checkedAt: Date.now() });
          setActivity({ kind: "Idle" });
          announce(
            intl.formatMessage(
              next.status !== invitation.status ||
                next.deliveryState !== invitation.deliveryState ||
                next.deliveryCode !== invitation.deliveryCode
                ? messages.invitationsStateChanged
                : messages.invitationsStateUnchanged,
            ),
            "polite",
          );
          return;
        }
        case "failed":
          if (isHiddenInvitationFailure(result.failure))
            return unavailable(result.failure);
          setActivity({ kind: "Check failed", error: result.failure });
          announce(
            intl.formatMessage(messages.invitationsCheckStateFailed),
            "urgent",
          );
          return;
        case "superseded":
          return;
      }
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-disabled={checking}
          onClick={refresh}
          className={secondaryActionClass}
        >
          {intl.formatMessage(
            checking
              ? messages.invitationsChecking
              : messages.invitationsRefresh,
          )}
        </button>
        <Link
          to={links.list}
          className="text-sm/6 font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {intl.formatMessage(messages.invitationsBackToList)}
        </Link>
      </div>
      {activity.kind === "Check failed" ? (
        <OutcomeAlert
          tone="warning"
          heading={intl.formatMessage(messages.invitationsCheckStateFailed)}
        >
          <p>{intl.formatMessage(messages.invitationsShowingOld)}</p>
          <TechnicalErrorDisclosure error={activity.error} />
        </OutcomeAlert>
      ) : null}
      <InvitationSummary invitation={invitation} checkedAt={view.checkedAt} />
      {invitation.status === "pending" ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={links.resend(invitation.id)} className={primaryActionClass}>
            {intl.formatMessage(messages.invitationsResendAction)}
          </Link>
          <Link
            to={links.revoke(invitation.id)}
            className={secondaryActionClass}
          >
            {intl.formatMessage(messages.invitationsRevokeAction)}
          </Link>
        </div>
      ) : (
        <p className="mt-6 text-sm/6 text-gray-700">
          {intl.formatMessage(
            invitation.status === "faulty"
              ? messages.invitationsFaultyHelp
              : messages.invitationsNoActions,
          )}
        </p>
      )}
    </>
  );
}
