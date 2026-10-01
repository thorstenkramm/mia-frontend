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
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/u);
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
  | {
      readonly kind: "mfa";
      readonly accountId: AccountId;
      readonly challengeId: MfaChallengeId;
    }
  | { readonly kind: "password-change" }
  | { readonly kind: "authenticated"; readonly accountId: AccountId };

export type AccountCapabilities = { readonly accountId: AccountId };

function toAccountId(id: string): AccountId {
  return id as AccountId;
}

function toMfaChallengeId(id: string): MfaChallengeId {
  return id as MfaChallengeId;
}

function toEntrySession(document: SessionDocument): EntrySession {
  if (document.data === null) {
    return { kind: "anonymous" };
  }

  switch (document.data.attributes.stage) {
    case "mfa":
      return {
        kind: "mfa",
        accountId: toAccountId(document.data.id),
        challengeId: toMfaChallengeId(
          document.data.attributes.mfa_challenge_id,
        ),
      };
    case "password-change":
      return { kind: "password-change" };
    case "authenticated":
      return {
        kind: "authenticated",
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

export async function loginWithPassword(
  username: string,
  password: string,
  csrfToken: string,
): Promise<EntrySession> {
  const document = {
    data: { type: "login-attempts", attributes: { username, password } },
  } satisfies operations["login"]["requestBody"]["content"][typeof jsonApiMediaType];
  const response = await sendUnsafeRequest({
    path: "/api/v1/auth/login",
    csrfToken,
    body: JSON.stringify(document),
  });
  const session = await parseJsonApiResponse(response, sessionDocumentSchema);
  if (session.data === null) {
    throw new ApiProtocolError();
  }
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
  const response = await sendUnsafeRequest({
    path,
    csrfToken,
    body: JSON.stringify(body),
  });
  const session = await parseJsonApiResponse(response, sessionDocumentSchema);
  if (session.data === null) throw new ApiProtocolError();
  return toEntrySession(session);
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

export async function logoutCurrentBrowser(
  csrfToken: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await sendUnsafeRequest({
    path: "/api/v1/auth/logout",
    csrfToken,
    ...(signal === undefined ? {} : { signal }),
  });
  if (response.status === 204) {
    return;
  }

  const body = await response.text();
  if (!response.ok) {
    throw new ApiHttpError({ status: response.status, body });
  }
  throw new ApiProtocolError();
}

export type EntryApiFailure = ApiFailure;
