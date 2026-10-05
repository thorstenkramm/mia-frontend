import { z } from "zod";
import type { components, operations } from "./generated";
import {
  ApiHttpError,
  ApiProtocolError,
  jsonApiMediaType,
  readJsonApi,
  parseJsonApiResponse,
  sendUnsafeRequest,
  type ApiFailure,
} from "./client";

const utcInstant = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/u)
  .refine(
    (value) =>
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString() === value.replace(/\d{3}Z$/u, "Z"),
  );
const resourceId = z.string().min(1);

type SessionDocument =
  operations["discoverSession"]["responses"][200]["content"][typeof jsonApiMediaType];
type CapabilitiesDocument =
  operations["getCurrentAccountCapabilities"]["responses"][200]["content"][typeof jsonApiMediaType];
type AccountCapability = components["schemas"]["AccountCapability"];

const sessionResourceBase = {
  type: z.literal("auth-sessions"),
  id: resourceId,
};

const sessionDeadlines = {
  idle_expires_at: utcInstant,
  absolute_expires_at: utcInstant,
};

const sessionDocumentSchema = z.union([
  z.object({
    errors: z.never().optional(),
    data: z.null(),
    meta: z.object({ stage: z.literal("anonymous") }),
  }),
  z.object({
    errors: z.never().optional(),
    data: z.object({
      ...sessionResourceBase,
      attributes: z.union([
        z.object({
          ...sessionDeadlines,
          stage: z.literal("mfa"),
          mfa_challenge_id: resourceId,
        }),
        z.object({
          ...sessionDeadlines,
          stage: z.enum(["password-change", "authenticated"]),
          mfa_challenge_id: z.never().optional(),
        }),
      ]),
    }),
  }),
]) satisfies z.ZodType<SessionDocument>;

const capabilityActions = [
  "profile.view",
  "profile.edit",
  "accounts.administer",
  "audit.view",
  "jobs.view",
  "courses.create",
  "course_records.manage",
  "course_supervisors.manage",
  "courses.supervise",
  "students.manage",
  "students.ban",
  "students.unban",
  "learning.participate",
  "mentoring.fulfill",
] as const satisfies readonly AccountCapability["action"][];

const capabilitySchema = z
  .object({
    action: z.enum(capabilityActions),
    available: z.boolean(),
    scope: z
      .object({
        global: z.boolean(),
        course_ids: z.array(z.string()),
        student_ids: z.array(z.string()),
        course_students: z.array(
          z.object({ course_id: z.string(), student_id: z.string() }).strict(),
        ),
        own_resource: z.boolean(),
      })
      .strict(),
  })
  .strict();

const capabilitiesDocumentSchema = z.object({
  data: z.object({
    type: z.literal("account-capabilities"),
    id: z.string(),
    attributes: z
      .object({
        capabilities: z
          .array(capabilitySchema)
          .length(capabilityActions.length)
          .superRefine((capabilities, context) => {
            const returnedActions = new Set(
              capabilities.map((capability) => capability.action),
            );
            if (
              capabilityActions.some((action) => !returnedActions.has(action))
            ) {
              context.addIssue({
                code: "custom",
                message: "The capability catalog is incomplete.",
              });
            }
          }),
      })
      .strict(),
  }),
}) satisfies z.ZodType<CapabilitiesDocument>;

declare const accountIdBrand: unique symbol;
export type AccountId = string & { readonly [accountIdBrand]: "AccountId" };
declare const mfaChallengeIdBrand: unique symbol;
export type MfaChallengeId = string & {
  readonly [mfaChallengeIdBrand]: "MfaChallengeId";
};

export type EntrySession =
  | { readonly kind: "anonymous" }
  | (SessionDeadlines & {
      readonly kind: "mfa";
      readonly accountId: AccountId;
      readonly challengeId: MfaChallengeId;
    })
  | (SessionDeadlines & {
      readonly kind: "password-change";
      readonly accountId: AccountId;
    })
  | (SessionDeadlines & {
      readonly kind: "authenticated";
      readonly accountId: AccountId;
    });

export type SessionDeadlines = {
  readonly idleExpiresAt: number;
  readonly absoluteExpiresAt: number;
};

export type AccountCapabilities = { readonly accountId: AccountId };

function toAccountId(id: string): AccountId {
  return id as AccountId;
}

function toMfaChallengeId(id: string): MfaChallengeId {
  return id as MfaChallengeId;
}

function toEntrySession(
  document: z.infer<typeof sessionDocumentSchema>,
): EntrySession {
  if (document.data === null) {
    return { kind: "anonymous" };
  }
  const deadlines = {
    idleExpiresAt: Date.parse(document.data.attributes.idle_expires_at),
    absoluteExpiresAt: Date.parse(document.data.attributes.absolute_expires_at),
  };
  if (deadlines.idleExpiresAt > deadlines.absoluteExpiresAt)
    throw new ApiProtocolError();

  switch (document.data.attributes.stage) {
    case "mfa":
      return {
        kind: "mfa",
        ...deadlines,
        accountId: toAccountId(document.data.id),
        challengeId: toMfaChallengeId(
          document.data.attributes.mfa_challenge_id,
        ),
      };
    case "password-change":
      return {
        kind: "password-change",
        ...deadlines,
        accountId: toAccountId(document.data.id),
      };
    case "authenticated":
      return {
        kind: "authenticated",
        ...deadlines,
        accountId: toAccountId(document.data.id),
      };
  }
}

export async function discoverSession(
  signal?: AbortSignal,
): Promise<EntrySession> {
  const document = await readJsonApi({
    path: "/api/v1/auth/session",
    schema: sessionDocumentSchema,
    initiator: "background",
    ...(signal === undefined ? {} : { signal }),
  });
  return toEntrySession(document);
}

export async function continueSession(
  csrfToken: string,
): Promise<Extract<EntrySession, { kind: "authenticated" }>> {
  const response = await sendUnsafeRequest({
    path: "/api/v1/auth/session-continuations",
    csrfToken,
  });
  const session = toEntrySession(
    await parseJsonApiResponse(response, sessionDocumentSchema),
  );
  if (session.kind !== "authenticated") throw new ApiProtocolError();
  return session;
}

export function loginWithPassword(
  username: string,
  password: string,
  csrfToken: string,
): Promise<EntrySession> {
  const document = {
    data: { type: "login-attempts", attributes: { username, password } },
  } satisfies operations["login"]["requestBody"]["content"][typeof jsonApiMediaType];
  return sendAuthTransition("/api/v1/auth/login", csrfToken, document);
}

async function sendAuthTransition(
  path: string,
  csrfToken: string,
  body: unknown,
): Promise<EntrySession> {
  const response = await sendUnsafeRequest({
    path,
    csrfToken,
    body: JSON.stringify(body),
  });
  const session = await parseJsonApiResponse(response, sessionDocumentSchema);
  if (session.data === null) throw new ApiProtocolError();
  return toEntrySession(session);
}

async function completeMfaChallenge(
  challengeId: MfaChallengeId,
  csrfToken: string,
  operation: "verification" | "recovery",
  code: string,
): Promise<EntrySession> {
  const path = `/api/v1/auth/mfa-challenges/${encodeURIComponent(challengeId)}/${operation === "verification" ? "verifications" : "recovery-code-consumptions"}`;
  const body =
    operation === "verification"
      ? ({
          data: { type: "mfa-verifications", attributes: { code } },
        } satisfies operations["verifyMFAChallenge"]["requestBody"]["content"][typeof jsonApiMediaType])
      : ({
          data: {
            type: "mfa-recovery-code-consumptions",
            attributes: { code },
          },
        } satisfies operations["consumeMFARecoveryCode"]["requestBody"]["content"][typeof jsonApiMediaType]);
  return sendAuthTransition(path, csrfToken, body);
}

export function verifyMfaChallenge(
  challengeId: MfaChallengeId,
  code: string,
  csrfToken: string,
): Promise<EntrySession> {
  return completeMfaChallenge(challengeId, csrfToken, "verification", code);
}

export function consumeMfaRecoveryCode(
  challengeId: MfaChallengeId,
  code: string,
  csrfToken: string,
): Promise<EntrySession> {
  return completeMfaChallenge(challengeId, csrfToken, "recovery", code);
}

export function changeTemporaryPassword(
  password: string,
  passwordConfirmation: string,
  csrfToken: string,
): Promise<EntrySession> {
  const body = {
    data: {
      type: "password-changes",
      attributes: { password, password_confirmation: passwordConfirmation },
    },
  } satisfies operations["changePassword"]["requestBody"]["content"][typeof jsonApiMediaType];
  return sendAuthTransition("/api/v1/auth/password-changes", csrfToken, body);
}

export async function getCurrentAccountCapabilities(
  signal?: AbortSignal,
): Promise<AccountCapabilities> {
  const document = await readJsonApi({
    path: "/api/v1/users/me/capabilities",
    schema: capabilitiesDocumentSchema,
    initiator: "background",
    ...(signal === undefined ? {} : { signal }),
  });
  return { accountId: toAccountId(document.data.id) };
}

export function logoutCurrentBrowser(
  csrfToken: string,
  signal?: AbortSignal,
): Promise<void> {
  return sendNoContent({
    path: "/api/v1/auth/logout",
    csrfToken,
    ...(signal === undefined ? {} : { signal }),
  });
}

declare const passwordResetTokenBrand: unique symbol;
// A captured, canonical lowercase UUID v4 bearer token from a reset link.
export type PasswordResetToken = string & {
  readonly [passwordResetTokenBrand]: "PasswordResetToken";
};

// Only `204` is success. Any other non-error status is a malformed outcome.
export function requestPasswordRecovery(
  username: string,
  csrfToken: string,
): Promise<void> {
  const body = {
    data: { type: "password-recovery-requests", attributes: { username } },
  } satisfies operations["requestPasswordRecovery"]["requestBody"]["content"][typeof jsonApiMediaType];
  return sendNoContent({
    path: "/api/v1/auth/password-recovery-requests",
    csrfToken,
    body: JSON.stringify(body),
  });
}

export function resetPassword(
  token: PasswordResetToken,
  password: string,
  passwordConfirmation: string,
  csrfToken: string,
): Promise<void> {
  const body = {
    data: {
      type: "password-resets",
      attributes: {
        token,
        password,
        password_confirmation: passwordConfirmation,
      },
    },
  } satisfies operations["resetPassword"]["requestBody"]["content"][typeof jsonApiMediaType];
  return sendNoContent({
    path: "/api/v1/auth/password-resets",
    csrfToken,
    body: JSON.stringify(body),
  });
}

declare const invitationTokenBrand: unique symbol;
// A captured, canonical lowercase UUID v4 bearer token from an invitation link.
export type InvitationToken = string & {
  readonly [invitationTokenBrand]: "InvitationToken";
};

type InvitationPreviewDocument =
  operations["previewInvitation"]["responses"][200]["content"][typeof jsonApiMediaType];
export type InvitationRole =
  InvitationPreviewDocument["data"]["attributes"]["role"];

const invitationPreviewDocumentSchema = z.object({
  data: z.object({
    type: z.literal("invitation-previews"),
    id: z.literal("preview"),
    attributes: z.object({
      platform: z.literal("mia"),
      role: z.enum(["administrator", "supervisor", "mentor"]),
    }),
  }),
}) satisfies z.ZodType<InvitationPreviewDocument>;

type CreatedUserDocument =
  operations["acceptInvitation"]["responses"][201]["content"][typeof jsonApiMediaType];

const createdUserDocumentSchema = z.object({
  data: z.object({
    type: z.literal("users"),
    id: resourceId,
    attributes: z.object({}).strict(),
  }),
}) satisfies z.ZodType<CreatedUserDocument>;

// Only the invited role leaves this boundary; the preview exposes nothing else.
export async function previewInvitation(
  token: InvitationToken,
  csrfToken: string,
): Promise<InvitationRole> {
  const body = {
    data: { type: "invitation-previews", attributes: { token } },
  } satisfies operations["previewInvitation"]["requestBody"]["content"][typeof jsonApiMediaType];
  const response = await sendUnsafeRequest({
    path: "/api/v1/invitation-previews",
    csrfToken,
    body: JSON.stringify(body),
  });
  const document = await parseJsonApiResponse(
    response,
    invitationPreviewDocumentSchema,
  );
  return document.data.attributes.role;
}

export type InvitationAcceptanceFields = {
  readonly username: string;
  readonly password: string;
  readonly passwordConfirmation: string;
  readonly language: string;
  readonly country: string;
  readonly timeZone: string;
};

// Only a `201` identity-only `users` resource proves account creation. It never
// creates a session, so nothing about the account is returned.
export async function acceptInvitation(
  token: InvitationToken,
  fields: InvitationAcceptanceFields,
  csrfToken: string,
): Promise<void> {
  const body = {
    data: {
      type: "invitation-acceptances",
      attributes: {
        token,
        username: fields.username,
        password: fields.password,
        password_confirmation: fields.passwordConfirmation,
        language: fields.language,
        country: fields.country,
        time_zone: fields.timeZone,
      },
    },
  } satisfies operations["acceptInvitation"]["requestBody"]["content"][typeof jsonApiMediaType];
  const response = await sendUnsafeRequest({
    path: "/api/v1/invitation-acceptances",
    csrfToken,
    body: JSON.stringify(body),
  });
  await parseJsonApiResponse(response, createdUserDocumentSchema, 201);
}

async function sendNoContent(
  options: Parameters<typeof sendUnsafeRequest>[0],
): Promise<void> {
  const response = await sendUnsafeRequest(options);
  if (response.status === 204) {
    return;
  }

  const body = await response.text();
  if (!response.ok) {
    throw new ApiHttpError(
      { status: response.status, body },
      response.headers.get("Retry-After"),
    );
  }
  throw new ApiProtocolError();
}

export type EntryApiFailure = ApiFailure;
