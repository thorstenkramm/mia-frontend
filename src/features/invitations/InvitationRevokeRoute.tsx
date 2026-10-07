import { useLayoutEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import {
  getInvitation,
  isHiddenInvitationFailure,
  revokeInvitation,
  type ReviewedInvitation,
} from "../../platform/api/invitations";
// Matching bounded-error import markers live in InvitationDetailRoute and
// InvitationResendRoute; revoke's reviewed-ETag machine stays independently owned.
import type { EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import type { InvitationRouteProps } from "./InvitationRouteProps";
import {
  InvitationSummary,
  OutcomeAlert,
  alertActionClass,
  dangerActionClass,
  expectResource,
  secondaryActionClass,
} from "./InvitationStatus";
import { useInvitationActivity } from "./useInvitationActivity";

// FRONTEND-STATE-MACHINES.md §22 with the Story 3.1 BCG-014 decision: the
// reviewed strong ETag is the atomic precondition for pending revocation.
type RevokeState =
  | { readonly kind: "Review" }
  // Final confirmation re-reads the target before any dispatch.
  | { readonly kind: "Pre-dispatch checking"; readonly attempt: symbol }
  | {
      readonly kind: "Revoking";
      readonly attempt: symbol;
      readonly originalError?: EntryApiFailure;
    }
  | { readonly kind: "Revoked" }
  // The target changed since review: a new review is required.
  | { readonly kind: "State changed"; readonly error: EntryApiFailure | null }
  // A definitive rejection, failed pre-dispatch read, or unsent request.
  | {
      readonly kind: "Not revoked";
      readonly error: EntryApiFailure;
      readonly originalError?: EntryApiFailure;
    }
  | { readonly kind: "Outcome unknown"; readonly error: EntryApiFailure | null }
  | { readonly kind: "Reconciling"; readonly attempt: symbol }
  // The fresh read after an unknown outcome; never a success claim.
  | { readonly kind: "Not confirmed" }
  | { readonly kind: "Reconcile failed"; readonly error: EntryApiFailure };

// Tailwind Plus: Application UI > Forms > Action Panels > Simple and Feedback
// > Alerts > With actions, v4/react-light.jsx, library 2026-09-13-083323. MIA
// deltas: h2 panel heading, exact effect and irreversibility copy, the
// blueprint's red destructive action, Stop waiting while in flight.
export default function InvitationRevokeRoute({
  resource,
  links,
  unavailable,
}: InvitationRouteProps) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { readAuthenticated, runAuthenticatedMutation } = useSessionActions();
  const [reviewed, setReviewed] = useState<{
    readonly value: ReviewedInvitation;
    readonly checkedAt: number;
  }>(() => ({
    value: expectResource(resource, "invitation").reviewed,
    checkedAt: Date.now(),
  }));
  const { state, stateRef, mounted, update } =
    useInvitationActivity<RevokeState>({ kind: "Review" });
  const outcomeRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (
      state.kind !== "Review" &&
      state.kind !== "Pre-dispatch checking" &&
      state.kind !== "Revoking" &&
      state.kind !== "Reconciling"
    )
      outcomeRef.current?.focus();
  }, [state]);
  const { invitation, etag } = reviewed.value;
  const isAttempt = (attempt: symbol) =>
    mounted.current &&
    "attempt" in stateRef.current &&
    stateRef.current.attempt === attempt;

  const settle = (next: RevokeState, heading: string, urgent = true) => {
    update(next);
    announce(heading, urgent ? "urgent" : "polite");
  };

  // Reads the target again; `then` decides with the fresh representation.
  const reread = (
    attempt: symbol,
    then: (fresh: ReviewedInvitation) => void,
    onFailure: (error: EntryApiFailure) => void,
  ) => {
    void readAuthenticated((signal) =>
      getInvitation(invitation.id, signal),
    ).then((result) => {
      if (!isAttempt(attempt)) return;
      switch (result.kind) {
        case "completed":
          return then(result.value);
        case "failed":
          if (isHiddenInvitationFailure(result.failure))
            return unavailable(result.failure);
          return onFailure(result.failure);
        case "superseded":
          return;
      }
    });
  };

  const install = (fresh: ReviewedInvitation) =>
    setReviewed({ value: fresh, checkedAt: Date.now() });

  const changed = (
    fresh: ReviewedInvitation,
    error: EntryApiFailure | null = null,
  ) => {
    install(fresh);
    settle(
      { kind: "State changed", error },
      intl.formatMessage(messages.invitationsRevokeChangedHeading),
    );
  };

  const confirm = () => {
    if (
      invitation.status !== "pending" ||
      state.kind === "Pre-dispatch checking" ||
      state.kind === "Revoking" ||
      state.kind === "Reconciling"
    )
      return;
    const attempt = Symbol("invitation-revoke");
    update({ kind: "Pre-dispatch checking", attempt });
    announce(intl.formatMessage(messages.invitationsRevoking), "polite");
    reread(
      attempt,
      (fresh) => {
        // Dispatch only for the exact reviewed representation.
        if (fresh.etag !== etag || fresh.invitation.status !== "pending")
          return changed(fresh);
        dispatch(attempt, fresh);
      },
      (error) =>
        settle(
          { kind: "Not revoked", error },
          intl.formatMessage(messages.invitationsNotRevokedHeading),
        ),
    );
  };

  const dispatch = (attempt: symbol, target: ReviewedInvitation) => {
    update({ kind: "Revoking", attempt });
    void runAuthenticatedMutation(
      {
        send: (csrf) =>
          revokeInvitation(target.invitation.id, target.etag, csrf),
      },
      () => isAttempt(attempt),
    ).then((result) => {
      if (!isAttempt(attempt)) return;
      switch (result.kind) {
        case "completed":
          // Only the definitive `revoked` effect is this action's success.
          if (result.value === "revoked")
            return settle(
              { kind: "Revoked" },
              intl.formatMessage(messages.invitationsRevokedHeading),
              false,
            );
          return unknownOutcome(null);
        case "rejected": {
          const { failure } = result;
          if (isHiddenInvitationFailure(failure)) return unavailable(failure);
          const status = failure.disclosure.status;
          if (
            status === 412 ||
            status === 428 ||
            (status === 422 && failure.code === "invitation_invalid")
          ) {
            update({ kind: "Revoking", attempt, originalError: failure });
            return reread(
              attempt,
              (fresh) => changed(fresh, failure),
              (error) =>
                settle(
                  { kind: "Not revoked", error, originalError: failure },
                  intl.formatMessage(messages.invitationsNotRevokedHeading),
                ),
            );
          }
          return settle(
            { kind: "Not revoked", error: failure },
            intl.formatMessage(messages.invitationsNotRevokedHeading),
          );
        }
        case "not-sent":
          return settle(
            { kind: "Not revoked", error: result.failure },
            intl.formatMessage(messages.invitationsNotRevokedHeading),
          );
        case "unknown":
          return unknownOutcome(result.failure);
        case "superseded":
          return;
      }
    });
  };

  const unknownOutcome = (error: EntryApiFailure | null) =>
    settle(
      { kind: "Outcome unknown", error },
      intl.formatMessage(messages.invitationsRevokeUnknownHeading),
    );

  const reconcile = () => {
    const attempt = Symbol("invitation-revoke-reconcile");
    update({ kind: "Reconciling", attempt });
    reread(
      attempt,
      (fresh) => {
        install(fresh);
        settle(
          { kind: "Not confirmed" },
          intl.formatMessage(messages.invitationsRevokeNotConfirmedHeading),
        );
      },
      (error) =>
        settle(
          { kind: "Reconcile failed", error },
          intl.formatMessage(messages.invitationsCheckStateFailed),
        ),
    );
  };

  if (state.kind === "Revoked")
    return (
      <OutcomeAlert
        tone="success"
        heading={intl.formatMessage(messages.invitationsRevokedHeading)}
        headingRef={outcomeRef}
        actions={
          <>
            <Link
              to={links.detail(invitation.id)}
              className={alertActionClass("success")}
            >
              {intl.formatMessage(messages.invitationsViewInvitation)}
            </Link>
            <Link to={links.list} className={alertActionClass("success")}>
              {intl.formatMessage(messages.invitationsBackToList)}
            </Link>
          </>
        }
      >
        <p>{intl.formatMessage(messages.invitationsRevoked)}</p>
      </OutcomeAlert>
    );

  const busy =
    state.kind === "Pre-dispatch checking" ||
    state.kind === "Revoking" ||
    state.kind === "Reconciling";
  // An unknown outcome must be reconciled, and the old attempt abandoned,
  // before a completely new review can confirm again.
  const awaitingReconciliation =
    state.kind === "Outcome unknown" || state.kind === "Reconcile failed";
  const pending = invitation.status === "pending";

  return (
    <>
      {state.kind === "Revoking" && state.originalError !== undefined ? (
        <TechnicalErrorDisclosure error={state.originalError} />
      ) : null}
      {state.kind === "State changed" ? (
        <OutcomeAlert
          tone="warning"
          heading={intl.formatMessage(messages.invitationsRevokeChangedHeading)}
          headingRef={outcomeRef}
        >
          <p>{intl.formatMessage(messages.invitationsRevokeChanged)}</p>
          {state.error === null ? null : (
            <TechnicalErrorDisclosure error={state.error} />
          )}
        </OutcomeAlert>
      ) : null}
      {state.kind === "Not revoked" ? (
        <OutcomeAlert
          tone="warning"
          heading={intl.formatMessage(messages.invitationsNotRevokedHeading)}
          headingRef={outcomeRef}
        >
          <p>{intl.formatMessage(messages.invitationsNothingChanged)}</p>
          <TechnicalErrorDisclosure error={state.error} />
          {state.originalError === undefined ? null : (
            <TechnicalErrorDisclosure error={state.originalError} />
          )}
        </OutcomeAlert>
      ) : null}
      {state.kind === "Outcome unknown" || state.kind === "Reconcile failed" ? (
        <OutcomeAlert
          tone="warning"
          heading={intl.formatMessage(
            state.kind === "Outcome unknown"
              ? messages.invitationsRevokeUnknownHeading
              : messages.invitationsCheckStateFailed,
          )}
          headingRef={outcomeRef}
          actions={
            <button
              type="button"
              onClick={reconcile}
              className={alertActionClass("warning")}
            >
              {intl.formatMessage(messages.invitationsCheckCurrentState)}
            </button>
          }
        >
          <p>{intl.formatMessage(messages.invitationsRevokeUnknown)}</p>
          {state.error === null ? null : (
            <TechnicalErrorDisclosure error={state.error} />
          )}
        </OutcomeAlert>
      ) : null}
      {state.kind === "Not confirmed" ? (
        <OutcomeAlert
          tone="warning"
          heading={intl.formatMessage(
            messages.invitationsRevokeNotConfirmedHeading,
          )}
          headingRef={outcomeRef}
        >
          <p>{intl.formatMessage(messages.invitationsRevokeNotConfirmed)}</p>
        </OutcomeAlert>
      ) : null}
      {state.kind === "Reconciling" ? (
        <p className="mt-6 text-sm/6 text-gray-700">
          {intl.formatMessage(messages.invitationsChecking)}
        </p>
      ) : null}

      <InvitationSummary
        invitation={invitation}
        checkedAt={reviewed.checkedAt}
      />

      {pending && !awaitingReconciliation ? (
        <div className="mt-6 bg-white shadow-sm sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-base font-semibold text-gray-900">
              {intl.formatMessage(messages.invitationsRevokePanelHeading)}
            </h2>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>{intl.formatMessage(messages.invitationsRevokeConsequence)}</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                aria-disabled={busy}
                onClick={confirm}
                className={dangerActionClass}
              >
                {intl.formatMessage(
                  busy
                    ? messages.invitationsRevoking
                    : messages.invitationsRevokeAction,
                )}
              </button>
              {state.kind === "Revoking" ? (
                <button
                  type="button"
                  onClick={() => {
                    if (stateRef.current.kind === "Revoking")
                      unknownOutcome(null);
                  }}
                  className={secondaryActionClass}
                >
                  {intl.formatMessage(messages.invitationsStopWaiting)}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : !pending ? (
        <p className="mt-6 text-sm/6 text-gray-700">
          {intl.formatMessage(messages.invitationsRevokeNotPending)}
        </p>
      ) : null}

      {/* Matching detail-link presentation marker lives in InvitationResendRoute. */}
      <p className="mt-6 text-sm/6">
        <Link
          to={links.detail(invitation.id)}
          className="font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {intl.formatMessage(messages.invitationsBackToDetail)}
        </Link>
      </p>
    </>
  );
}
