import { useLayoutEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import {
  getInvitation,
  isHiddenInvitationFailure,
  resendInvitation,
  type Invitation,
} from "../../platform/api/invitations";
// The detail surface's matching import marker is in InvitationDetailRoute.
// This bounded transport type fixes the dependency shape; resend and revoke
// retain separate domain machines, rather than hide their imports in a facade.
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
  alertActionClass,
  expectResource,
  primaryActionClass,
  secondaryActionClass,
} from "./InvitationStatus";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";

// FRONTEND-STATE-MACHINES.md §27 Resend in flight / failed / unknown.
type ResendOutcome =
  | { readonly kind: "resent" }
  | { readonly kind: "not pending"; readonly error: EntryApiFailure }
  // The request may have been processed; only a read shows current state.
  | { readonly kind: "unknown"; readonly error: EntryApiFailure | null }
  // A definitive rejection or a request that never left: nothing changed.
  | { readonly kind: "not resent"; readonly error: EntryApiFailure };

type ResendState =
  | { readonly kind: "Review" }
  | { readonly kind: "Sending"; readonly attempt: symbol }
  | { readonly kind: "Reconciling"; readonly outcome: ResendOutcome }
  | {
      readonly kind: "Settled";
      readonly outcome: ResendOutcome;
      // A fresh read after the outcome replaced the summary.
      readonly reconciled: boolean;
    }
  | {
      readonly kind: "Reconcile failed";
      readonly outcome: ResendOutcome;
      readonly error: EntryApiFailure;
    };

// Tailwind Plus: Application UI > Forms > Action Panels > Simple and Feedback
// > Alerts > With actions, v4/react-light.jsx, library 2026-09-13-083323. MIA
// deltas: h2 panel heading, explicit consequence copy, Stop waiting while the
// request is in flight, and outcome alerts that never claim delivery.
export default function InvitationResendRoute({
  resource,
  links,
  unavailable,
}: InvitationRouteProps) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { readAuthenticated, runAuthenticatedMutation } = useSessionActions();
  const [current, setCurrent] = useState<{
    readonly invitation: Invitation;
    readonly checkedAt: number;
  }>(() => ({
    invitation: expectResource(resource, "invitation").reviewed.invitation,
    checkedAt: Date.now(),
  }));
  const { state, stateRef, mounted, update } = useRouteActivity<ResendState>({
    kind: "Review",
  });
  const outcomeRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (state.kind === "Settled" || state.kind === "Reconcile failed")
      outcomeRef.current?.focus();
  }, [state]);
  const { invitation } = current;

  const reconcile = (outcome: ResendOutcome) => {
    update({ kind: "Reconciling", outcome });
    void readAuthenticated((signal) =>
      getInvitation(invitation.id, signal),
    ).then((result) => {
      if (
        !mounted.current ||
        stateRef.current.kind !== "Reconciling" ||
        stateRef.current.outcome !== outcome
      )
        return;
      switch (result.kind) {
        case "completed":
          setCurrent({
            invitation: result.value.invitation,
            checkedAt: Date.now(),
          });
          update({ kind: "Settled", outcome, reconciled: true });
          announce(intl.formatMessage(outcomeHeading(outcome)), "polite");
          return;
        case "failed":
          if (isHiddenInvitationFailure(result.failure))
            return unavailable(result.failure);
          update({ kind: "Reconcile failed", outcome, error: result.failure });
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

  const resend = () => {
    if (state.kind === "Sending" || state.kind === "Reconciling") return;
    const attempt = Symbol("invitation-resend");
    update({ kind: "Sending", attempt });
    announce(intl.formatMessage(messages.invitationsResending), "polite");
    const isCurrent = () =>
      mounted.current &&
      stateRef.current.kind === "Sending" &&
      stateRef.current.attempt === attempt;
    void runAuthenticatedMutation(
      { send: (csrf) => resendInvitation(invitation.id, csrf) },
      isCurrent,
    ).then((result) => {
      if (!isCurrent()) return;
      switch (result.kind) {
        case "completed":
          return reconcile({ kind: "resent" });
        case "rejected":
          if (isHiddenInvitationFailure(result.failure))
            return unavailable(result.failure);
          if (
            result.failure.disclosure.status === 422 &&
            result.failure.code === "invitation_invalid"
          )
            return reconcile({ kind: "not pending", error: result.failure });
          return settleWithoutRead({
            kind: "not resent",
            error: result.failure,
          });
        case "not-sent":
          return settleWithoutRead({
            kind: "not resent",
            error: result.failure,
          });
        case "unknown":
          return settleWithoutRead({ kind: "unknown", error: result.failure });
        case "superseded":
          return;
      }
    });
  };

  const settleWithoutRead = (outcome: ResendOutcome) => {
    update({ kind: "Settled", outcome, reconciled: false });
    announce(intl.formatMessage(outcomeHeading(outcome)), "urgent");
  };

  const outcome =
    state.kind === "Settled" ||
    state.kind === "Reconciling" ||
    state.kind === "Reconcile failed"
      ? state.outcome
      : null;
  const sending = state.kind === "Sending";
  const busy = sending || state.kind === "Reconciling";
  // A new explicit resend is offered only while the invitation is pending and
  // no earlier attempt still needs reconciliation.
  const canResend =
    invitation.status === "pending" &&
    (outcome === null ||
      outcome.kind === "not resent" ||
      (outcome.kind === "unknown" &&
        state.kind === "Settled" &&
        state.reconciled));

  return (
    <>
      {outcome === null || state.kind === "Reconciling" ? null : (
        <OutcomeAlert
          tone={outcome.kind === "resent" ? "success" : "warning"}
          heading={intl.formatMessage(outcomeHeading(outcome))}
          headingRef={outcomeRef}
          actions={
            outcome.kind === "unknown" &&
            state.kind === "Settled" &&
            !state.reconciled ? (
              <button
                type="button"
                onClick={() => reconcile(outcome)}
                className={alertActionClass("warning")}
              >
                {intl.formatMessage(messages.invitationsCheckCurrentState)}
              </button>
            ) : state.kind === "Reconcile failed" ? (
              <button
                type="button"
                onClick={() => reconcile(outcome)}
                className={alertActionClass(
                  outcome.kind === "resent" ? "success" : "warning",
                )}
              >
                {intl.formatMessage(messages.invitationsCheckCurrentState)}
              </button>
            ) : undefined
          }
        >
          <p>{intl.formatMessage(outcomeText(outcome))}</p>
          {state.kind === "Settled" &&
          state.reconciled &&
          outcome.kind === "unknown" ? (
            <p>
              {intl.formatMessage(messages.invitationsResendUnknownReconciled)}
            </p>
          ) : null}
          {state.kind === "Reconcile failed" ? (
            <>
              <p>{intl.formatMessage(messages.invitationsCheckStateFailed)}</p>
              <TechnicalErrorDisclosure error={state.error} />
            </>
          ) : null}
          {"error" in outcome && outcome.error !== null ? (
            <TechnicalErrorDisclosure error={outcome.error} />
          ) : null}
        </OutcomeAlert>
      )}
      {state.kind === "Reconciling" ? (
        <>
          <p className="mt-6 text-sm/6 text-gray-700">
            {intl.formatMessage(messages.invitationsChecking)}
          </p>
          {"error" in state.outcome && state.outcome.error !== null ? (
            <TechnicalErrorDisclosure error={state.outcome.error} />
          ) : null}
        </>
      ) : null}

      <InvitationSummary
        invitation={invitation}
        checkedAt={current.checkedAt}
      />

      {canResend ? (
        <div className="mt-6 bg-white shadow-sm sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-base font-semibold text-gray-900">
              {intl.formatMessage(messages.invitationsResendPanelHeading)}
            </h2>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>{intl.formatMessage(messages.invitationsResendConsequence)}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                aria-disabled={busy}
                onClick={resend}
                className={primaryActionClass}
              >
                {intl.formatMessage(
                  sending
                    ? messages.invitationsResending
                    : messages.invitationsResendAction,
                )}
              </button>
              {sending ? (
                <button
                  type="button"
                  onClick={() => {
                    if (stateRef.current.kind !== "Sending") return;
                    settleWithoutRead({ kind: "unknown", error: null });
                  }}
                  className={secondaryActionClass}
                >
                  {intl.formatMessage(messages.invitationsStopWaiting)}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : invitation.status !== "pending" && outcome?.kind !== "not pending" ? (
        <p className="mt-6 text-sm/6 text-gray-700">
          {intl.formatMessage(messages.invitationsResendNotPending)}
        </p>
      ) : null}

      <p className="mt-6 text-sm/6">
        {/* The identical detail-link presentation is fixed by its trusted route
            and blueprint. Resend and revoke still own separate consequences;
            keep the marker on the link opening, not their branching logic. */}
        {/* jscpd:ignore-start */}
        <Link
          to={links.detail(invitation.id)}
          className="font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {/* jscpd:ignore-end */}
          {intl.formatMessage(messages.invitationsBackToDetail)}
        </Link>
      </p>
    </>
  );
}

function outcomeHeading(
  outcome: ResendOutcome,
): (typeof messages)[keyof typeof messages] {
  switch (outcome.kind) {
    case "resent":
      return messages.invitationsResentHeading;
    case "not pending":
      return messages.invitationsResendNotPendingHeading;
    case "unknown":
      return messages.invitationsResendUnknownHeading;
    case "not resent":
      return messages.invitationsNotResentHeading;
  }
}

function outcomeText(
  outcome: ResendOutcome,
): (typeof messages)[keyof typeof messages] {
  switch (outcome.kind) {
    case "resent":
      return messages.invitationsResent;
    case "not pending":
      return messages.invitationsResendNotPending;
    case "unknown":
      return messages.invitationsResendUnknown;
    case "not resent":
      return messages.invitationsNothingChanged;
  }
}
