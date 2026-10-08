import { z } from "zod";
import type { operations } from "./generated";
import {
  ApiProtocolError,
  jsonApiMediaType,
  parseJsonApiResponse,
  readJsonApi,
  readJsonApiResource,
  sendUnsafeRequest,
  type ApiFailure,
  type StrongETag,
} from "./client";
import { resourceId, sendNoContent, utcInstant } from "./entry";
import {
  collectionNavigation,
  collectionPageLimit,
  collectionQuery,
} from "./collectionNavigation";

// Administrator invitation management (Story 3.1 slice decision,
// BACKEND-CONTRACT-GAPS.md §BCG-006 and §BCG-014). Only `supervisor`
// invitations are created here; reads cover every invitation the caller sees.

declare const invitationIdBrand: unique symbol;
export type InvitationId = string & {
  readonly [invitationIdBrand]: "InvitationId";
};

export function toInvitationId(id: string): InvitationId {
  return id as InvitationId;
}

type InvitationDocument =
  operations["getInvitation"]["responses"][200]["content"][typeof jsonApiMediaType];
type InvitationCollectionDocument =
  operations["listInvitations"]["responses"][200]["content"][typeof jsonApiMediaType];
type InvitationDeletionDocument =
  operations["deleteInvitation"]["responses"][200]["content"][typeof jsonApiMediaType];
type InvitationCreateBody =
  operations["createInvitation"]["requestBody"]["content"][typeof jsonApiMediaType];

export type InvitationRole = InvitationDocument["data"]["attributes"]["role"];
export type InvitationStatus =
  InvitationDocument["data"]["attributes"]["status"];
export type InvitationDeliveryState =
  InvitationDocument["data"]["attributes"]["delivery_state"];
export type InvitationDeliveryCode =
  InvitationDocument["data"]["attributes"]["delivery_code"];

const invitationSchema = z.object({
  type: z.literal("invitations"),
  id: resourceId,
  attributes: z.object({
    email: z.string(),
    role: z.enum(["administrator", "supervisor", "mentor"]),
    status: z.enum(["pending", "accepted", "revoked", "faulty"]),
    failure_code: z.string().exactOptional(),
    delivery_state: z.enum(["queued", "delivered", "ambiguous", "failed"]),
    delivery_code: z
      .enum([
        "invitation_delivery_timeout",
        "invitation_delivery_ambiguous",
        "invitation_delivery_rejected",
      ])
      .nullable(),
    delivery_attempted_at: utcInstant.nullable(),
    created_at: utcInstant,
    updated_at: utcInstant,
  }),
});

const invitationDocumentSchema = z.object({
  data: invitationSchema,
}) satisfies z.ZodType<InvitationDocument>;

const invitationCollectionDocumentSchema = z.object({
  data: z.array(invitationSchema),
  meta: z.object({ has_more: z.boolean() }),
  links: z
    .object({
      prev: z.string().exactOptional(),
      next: z.string().exactOptional(),
    })
    .exactOptional(),
}) satisfies z.ZodType<InvitationCollectionDocument>;

const invitationDeletionDocumentSchema = z.object({
  data: z.object({
    type: z.literal("invitation-deletions"),
    id: resourceId,
    attributes: z
      .object({
        invitation_id: resourceId,
        effect: z.enum(["revoked", "deleted"]),
      })
      .strict(),
  }),
}) satisfies z.ZodType<InvitationDeletionDocument>;

// The minimized view the invitation surfaces render. Instants are epoch ms.
export type Invitation = {
  readonly id: InvitationId;
  readonly email: string;
  readonly role: InvitationRole;
  readonly status: InvitationStatus;
  readonly failureCode: string | null;
  readonly deliveryState: InvitationDeliveryState;
  readonly deliveryCode: InvitationDeliveryCode;
  readonly deliveryAttemptedAt: number | null;
  readonly createdAt: number;
};

// One invitation as reviewed, bound to its strong validator.
export type ReviewedInvitation = {
  readonly invitation: Invitation;
  readonly etag: StrongETag;
};

export type InvitationPage = {
  readonly invitations: readonly Invitation[];
  readonly offset: number;
  readonly previousOffset: number | null;
  readonly nextOffset: number | null;
};

// Declared invitation denials that share the one fixed existence-hiding
// result: missing or out-of-scope invitations and invitation authorization.
const hiddenCodes = new Set([
  "invitation_not_found",
  "invitation_list_unauthorized",
  "invitation_role_unauthorized",
]);

export function isHiddenInvitationFailure(failure: ApiFailure): boolean {
  return (
    failure.kind === "http" &&
    (failure.disclosure.status === 404 ||
      (failure.disclosure.status === 403 &&
        failure.code !== null &&
        hiddenCodes.has(failure.code)))
  );
}

const collectionPath = "/api/v1/invitations";
export const invitationPageLimit = collectionPageLimit;

function toInvitation(resource: z.infer<typeof invitationSchema>): Invitation {
  const attributes = resource.attributes;
  return {
    id: toInvitationId(resource.id),
    email: attributes.email,
    role: attributes.role,
    status: attributes.status,
    failureCode: attributes.failure_code ?? null,
    deliveryState: attributes.delivery_state,
    deliveryCode: attributes.delivery_code,
    deliveryAttemptedAt:
      attributes.delivery_attempted_at === null
        ? null
        : Date.parse(attributes.delivery_attempted_at),
    createdAt: Date.parse(attributes.created_at),
  };
}

function invitationPath(id: InvitationId): string {
  return `${collectionPath}/${encodeURIComponent(id)}`;
}

export async function listInvitations(
  offset: number,
  signal: AbortSignal,
): Promise<InvitationPage> {
  const document = await readJsonApi({
    path: `${collectionPath}?${collectionQuery(offset)}`,
    schema: invitationCollectionDocumentSchema,
    initiator: "user",
    signal,
  });
  const { previousOffset, nextOffset } = collectionNavigation(
    collectionPath,
    offset,
    document.meta.has_more,
    document.links,
  );
  return {
    invitations: document.data.map(toInvitation),
    offset,
    previousOffset,
    nextOffset,
  };
}

export async function getInvitation(
  id: InvitationId,
  signal: AbortSignal,
): Promise<ReviewedInvitation> {
  const { value, etag } = await readJsonApiResource({
    path: invitationPath(id),
    schema: invitationDocumentSchema,
    initiator: "user",
    signal,
  });
  if (value.data.id !== id) throw new ApiProtocolError();
  return { invitation: toInvitation(value.data), etag };
}

// The invited role is fixed: this slice creates supervisor invitations only.
export async function createSupervisorInvitation(
  email: string,
  csrfToken: string,
): Promise<Invitation> {
  const body = {
    data: { type: "invitations", attributes: { email, role: "supervisor" } },
  } satisfies InvitationCreateBody;
  const response = await sendUnsafeRequest({
    method: "POST",
    path: collectionPath,
    csrfToken,
    body: JSON.stringify(body),
  });
  const document = await parseJsonApiResponse(
    response,
    invitationDocumentSchema,
    201,
  );
  return toInvitation(document.data);
}

// `204` rotates the token and admits delivery; only a later read shows its
// outcome.
export function resendInvitation(
  id: InvitationId,
  csrfToken: string,
): Promise<void> {
  return sendNoContent({
    method: "POST",
    path: `${invitationPath(id)}/resends`,
    csrfToken,
  });
}

export type InvitationDeletionEffect = "revoked" | "deleted";

// DELETE bound to the reviewed validator; the committed effect is returned.
export async function revokeInvitation(
  id: InvitationId,
  etag: StrongETag,
  csrfToken: string,
): Promise<InvitationDeletionEffect> {
  const response = await sendUnsafeRequest({
    method: "DELETE",
    path: invitationPath(id),
    csrfToken,
    ifMatch: etag,
  });
  const document = await parseJsonApiResponse(
    response,
    invitationDeletionDocumentSchema,
  );
  if (document.data.attributes.invitation_id !== id)
    throw new ApiProtocolError();
  return document.data.attributes.effect;
}
