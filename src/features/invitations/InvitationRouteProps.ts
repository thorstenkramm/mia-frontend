import type {
  InvitationId,
  InvitationPage,
  ReviewedInvitation,
} from "../../platform/api/invitations";
import type { EntryApiFailure } from "../../platform/api/entry";

// The admitted route resource the gate read before this surface mounted.
export type InvitationRouteResource =
  | { readonly kind: "none" }
  | { readonly kind: "invitation list"; readonly page: InvitationPage }
  | { readonly kind: "invitation"; readonly reviewed: ReviewedInvitation };

// Concrete destinations from the route table; features never build paths.
export type InvitationRouteLinks = {
  readonly home: string;
  readonly list: string;
  readonly create: string;
  readonly detail: (id: InvitationId) => string;
  readonly resend: (id: InvitationId) => string;
  readonly revoke: (id: InvitationId) => string;
};

export type InvitationRouteProps = {
  readonly resource: InvitationRouteResource;
  readonly links: InvitationRouteLinks;
  // A fresh read found the target hidden: the gate's one fixed unavailable
  // result replaces this surface and its protected content.
  readonly unavailable: (failure: EntryApiFailure) => void;
};
