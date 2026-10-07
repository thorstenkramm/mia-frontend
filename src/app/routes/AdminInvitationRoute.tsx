import { useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import {
  getInvitation,
  isHiddenInvitationFailure,
  listInvitations,
  type InvitationId,
} from "../../platform/api/invitations";
import type { EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { RouteRecoveryPanel } from "../../platform/ui/RouteRecoveryPanel";
import type {
  InvitationRouteLinks,
  InvitationRouteResource,
} from "../../features/invitations/InvitationRouteProps";
import { ApplicationShell } from "../ApplicationShell";
import { SessionWarning } from "../SessionLifecycle";
import { CheckingAccess } from "./CheckingAccess";
import {
  entryRoutes,
  invitationPath,
  invitationRoutePaths,
  type InvitationEntryRoute,
} from "./entryRoutes";
import { RouteRecoveryBoundary } from "./RouteRecoveryBoundary";
import { SimpleEntrySurface } from "./SimpleEntrySurface";

type HostRead =
  | { readonly kind: "Checking" }
  | { readonly kind: "Check failed"; readonly error: EntryApiFailure }
  // The one fixed existence-hiding result (SECURITY-PRIVACY-ACCEPTANCE.md
  // §Existence-Hiding Presentation): missing, out-of-scope, and unauthorized
  // invitation causes are indistinguishable.
  | { readonly kind: "Unavailable"; readonly error: EntryApiFailure }
  | { readonly kind: "Ready"; readonly resource: InvitationRouteResource };

const links: InvitationRouteLinks = {
  home: entryRoutes.home.path,
  list: invitationRoutePaths.list,
  create: invitationRoutePaths.create,
  detail: (id) => invitationPath(invitationRoutePaths.detail, id),
  resend: (id) => invitationPath(invitationRoutePaths.resend, id),
  revoke: (id) => invitationPath(invitationRoutePaths.revoke, id),
};

const actionClass =
  "rounded-md px-2 py-1.5 text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600";

// The third gate step for `/admin/invitations[...]`: the session stage and the
// Story 3.1 `accounts.administer` global mapping already passed in this epoch;
// the route resource (a collection page or one invitation) is read freshly for
// each route entry before the shell or any protected content mounts.
export function AdminInvitationRoute({
  route,
  invitationId,
}: {
  readonly route: InvitationEntryRoute;
  readonly invitationId: InvitationId | null;
}) {
  const intl = useIntl();
  const { readAuthenticated, beginAuthenticatedLogout } = useSessionActions();
  const [read, setRead] = useState<HostRead>(() =>
    route.resource === null
      ? { kind: "Ready", resource: { kind: "none" } }
      : { kind: "Checking" },
  );
  const sequence = useRef(0);
  // Check again starts a new read generation for this same route entry.
  const [generation, setGeneration] = useState(0);

  const startRead = useEffectEvent((isCurrent: () => boolean) => {
    const settle = (
      result:
        | {
            readonly kind: "completed";
            readonly value: InvitationRouteResource;
          }
        | { readonly kind: "failed"; readonly failure: EntryApiFailure }
        | { readonly kind: "superseded" },
    ) => {
      if (!isCurrent()) return;
      switch (result.kind) {
        case "completed":
          setRead({ kind: "Ready", resource: result.value });
          return;
        case "failed":
          setRead(
            isHiddenInvitationFailure(result.failure)
              ? { kind: "Unavailable", error: result.failure }
              : { kind: "Check failed", error: result.failure },
          );
          return;
        case "superseded":
          // A shield, epoch change, or access loss owns the next presentation.
          return;
      }
    };
    if (route.resource === "invitation list")
      void readAuthenticated(async (signal) => ({
        kind: "invitation list" as const,
        page: await listInvitations(0, signal),
      })).then(settle);
    else if (route.resource === "invitation") {
      if (invitationId === null)
        throw new Error("An invitation route was admitted without its ID.");
      void readAuthenticated(async (signal) => ({
        kind: "invitation" as const,
        reviewed: await getInvitation(invitationId, signal),
      })).then(settle);
    }
  });

  useLayoutEffect(() => {
    if (route.resource === null) return;
    // A late result never settles into a departed entry or generation.
    let active = true;
    const attempt = ++sequence.current;
    startRead(() => active && attempt === sequence.current);
    return () => {
      active = false;
    };
  }, [route.resource, generation]);

  const parentPath =
    route.parent.path === invitationRoutePaths.detail && invitationId !== null
      ? invitationPath(invitationRoutePaths.detail, invitationId)
      : route.parent.path;
  const signOut = (
    <button
      type="button"
      onClick={beginAuthenticatedLogout}
      className={actionClass}
    >
      {intl.formatMessage(messages.logoutButton)}
    </button>
  );

  switch (read.kind) {
    case "Checking":
      return (
        <CheckingAccess>
          <SessionWarning />
        </CheckingAccess>
      );
    case "Check failed":
      return (
        // This fixed error-shell prefix already belongs to SimpleEntrySurface.
        // Invitation resource recovery and profile-MFA authorization remain
        // distinct contracts; mark only the presentational opening, not actions.
        // jscpd:ignore-start
        <SimpleEntrySurface
          titleMessage={messages.errorPageTitle}
          headingMessage={messages.errorHeading}
        >
          {/* jscpd:ignore-end */}
          <SessionWarning />
          <RouteRecoveryPanel
            heading={intl.formatMessage(messages.errorSummary)}
            actions={
              <>
                <button
                  type="button"
                  onClick={() => {
                    setRead({ kind: "Checking" });
                    setGeneration((value) => value + 1);
                  }}
                  className={`bg-yellow-50 ${actionClass}`}
                >
                  {intl.formatMessage(messages.mfaCheckAgain)}
                </button>
                <RouteDepartureLink to={parentPath} className={actionClass}>
                  {intl.formatMessage(route.parent.label)}
                </RouteDepartureLink>
                {signOut}
              </>
            }
          >
            <p>{intl.formatMessage(messages.invitationsCheckFailed)}</p>
            <TechnicalErrorDisclosure error={read.error} />
          </RouteRecoveryPanel>
        </SimpleEntrySurface>
      );
    case "Unavailable": {
      // The list itself is the parent of every invitation route; its own
      // unavailable result exits to Home.
      const exit =
        route.resource === "invitation list"
          ? { path: links.home, label: messages.invitationsBackToHome }
          : { path: links.list, label: messages.invitationsBackToList };
      return (
        <SimpleEntrySurface
          titleMessage={messages.invitationsUnavailablePageTitle}
          headingMessage={messages.invitationsUnavailableHeading}
        >
          <SessionWarning />
          <RouteRecoveryPanel
            heading={intl.formatMessage(messages.invitationsUnavailableSummary)}
            actions={
              <>
                <RouteDepartureLink to={exit.path} className={actionClass}>
                  {intl.formatMessage(exit.label)}
                </RouteDepartureLink>
                {signOut}
              </>
            }
          >
            <p>{intl.formatMessage(messages.invitationsUnavailable)}</p>
            <TechnicalErrorDisclosure error={read.error} />
          </RouteRecoveryPanel>
        </SimpleEntrySurface>
      );
    }
    case "Ready": {
      const RouteContent = route.component;
      return (
        <ApplicationShell
          titleMessage={route.titleMessage}
          headingMessage={route.headingMessage}
        >
          <SessionWarning />
          <RouteRecoveryBoundary
            actions={
              <>
                <RouteDepartureLink to={parentPath} className={actionClass}>
                  {intl.formatMessage(route.parent.label)}
                </RouteDepartureLink>
                {signOut}
              </>
            }
          >
            <RouteContent
              resource={read.resource}
              links={links}
              unavailable={(failure) => {
                sequence.current++;
                setRead({ kind: "Unavailable", error: failure });
              }}
            />
          </RouteRecoveryBoundary>
        </ApplicationShell>
      );
    }
  }
}
