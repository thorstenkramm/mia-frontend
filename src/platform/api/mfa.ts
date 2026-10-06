import { z } from "zod";
import type { operations } from "./generated";
import type { AccountId } from "./entry";
import {
  ApiProtocolError,
  jsonApiMediaType,
  parseJsonApiResponse,
  readJsonApi,
  sendUnsafeRequest,
} from "./client";
import { resourceId, sendNoContent, toAccountId, utcInstant } from "./entry";
import {
  parseTotpProvisioningUri,
  type TotpProvisioning,
} from "./totpProvisioning";

declare const mfaEnrollmentIdBrand: unique symbol;
export type MfaEnrollmentId = string & {
  readonly [mfaEnrollmentIdBrand]: "MfaEnrollmentId";
};
declare const mfaFactorIdBrand: unique symbol;
export type MfaFactorId = string & {
  readonly [mfaFactorIdBrand]: "MfaFactorId";
};

type MfaStateDocument =
  operations["getCurrentMFAState"]["responses"][200]["content"][typeof jsonApiMediaType];
type MfaEnrollmentDocument =
  operations["startMFAEnrollment"]["responses"][201]["content"][typeof jsonApiMediaType];
type MfaRecoveryCodesDocument =
  operations["verifyMFAEnrollment"]["responses"][200]["content"][typeof jsonApiMediaType];

function toMfaEnrollmentId(id: string): MfaEnrollmentId {
  return id as MfaEnrollmentId;
}

function toMfaFactorId(id: string): MfaFactorId {
  return id as MfaFactorId;
}

const mfaMethod = z.enum(["totp", "sms"]);

const mfaStateDocumentSchema = z.object({
  data: z.object({
    type: z.literal("mfa-states"),
    id: resourceId,
    attributes: z
      .object({
        active_factor: z
          .object({ id: resourceId, method: mfaMethod })
          .strict()
          .nullable(),
        pending_enrollment: z
          .object({
            id: resourceId,
            method: mfaMethod,
            expires_at: utcInstant,
            replaces_factor_id: resourceId.nullable(),
          })
          .strict()
          .nullable(),
        actions: z
          .object({
            enroll: z.boolean(),
            continue: z.boolean(),
            cancel: z.boolean(),
            disable: z.boolean(),
            replace: z.boolean(),
            verify: z.boolean(),
            sms_resend: z.boolean(),
          })
          .strict(),
      })
      .strict(),
  }),
}) satisfies z.ZodType<MfaStateDocument>;

// Authoritative MFA metadata; it never carries setup data or codes.
export type MfaState = {
  readonly accountId: AccountId;
  readonly activeFactor: {
    readonly id: MfaFactorId;
    readonly method: "totp" | "sms";
  } | null;
  readonly pendingEnrollment: {
    readonly id: MfaEnrollmentId;
    readonly method: "totp" | "sms";
    readonly expiresAt: number;
  } | null;
  readonly actions: {
    readonly enroll: boolean;
    readonly cancel: boolean;
    readonly verify: boolean;
  };
};

export async function getCurrentMfaState(
  signal: AbortSignal,
): Promise<MfaState> {
  const document = await readJsonApi({
    path: "/api/v1/users/me/mfa",
    schema: mfaStateDocumentSchema,
    initiator: "background",
    signal,
  });
  const { active_factor, pending_enrollment, actions } =
    document.data.attributes;
  return {
    accountId: toAccountId(document.data.id),
    activeFactor:
      active_factor === null
        ? null
        : {
            id: toMfaFactorId(active_factor.id),
            method: active_factor.method,
          },
    pendingEnrollment:
      pending_enrollment === null
        ? null
        : {
            id: toMfaEnrollmentId(pending_enrollment.id),
            method: pending_enrollment.method,
            expiresAt: Date.parse(pending_enrollment.expires_at),
          },
    actions: {
      enroll: actions.enroll,
      cancel: actions.cancel,
      verify: actions.verify,
    },
  };
}

const totpEnrollmentDocumentSchema = z.object({
  data: z.object({
    type: z.literal("mfa-enrollments"),
    id: resourceId,
    attributes: z
      .object({ method: z.literal("totp"), provisioning_uri: z.string() })
      .strict(),
  }),
}) satisfies z.ZodType<MfaEnrollmentDocument>;

// `provisioning` is `null` when the returned URI fails the grammar: the
// enrollment exists, but nothing derived from its URI may be rendered.
export type StartedTotpEnrollment = {
  readonly enrollmentId: MfaEnrollmentId;
  readonly provisioning: TotpProvisioning | null;
};

export async function startTotpEnrollment(
  csrfToken: string,
): Promise<StartedTotpEnrollment> {
  const body = {
    data: { type: "mfa-enrollments", attributes: { method: "totp" } },
  } satisfies operations["startMFAEnrollment"]["requestBody"]["content"][typeof jsonApiMediaType];
  const response = await sendUnsafeRequest({
    method: "POST",
    path: "/api/v1/users/me/mfa-enrollments",
    csrfToken,
    body: JSON.stringify(body),
  });
  const document = await parseJsonApiResponse(
    response,
    totpEnrollmentDocumentSchema,
    201,
  );
  return {
    enrollmentId: toMfaEnrollmentId(document.data.id),
    provisioning: parseTotpProvisioningUri(
      document.data.attributes.provisioning_uri,
    ),
  };
}

const recoveryCodePattern = /^[0-9A-HJKMNP-TV-Z]{16}$/u;

const recoveryCodesDocumentSchema = z.object({
  data: z.object({
    type: z.literal("mfa-recovery-codes"),
    id: resourceId,
    attributes: z
      .object({
        recovery_codes: z
          .array(z.string().regex(recoveryCodePattern))
          .length(10)
          .refine((codes) => new Set(codes).size === codes.length),
      })
      .strict(),
  }),
}) satisfies z.ZodType<MfaRecoveryCodesDocument>;

// The ten one-time codes leave this boundary exactly once, to their owner.
export async function verifyMfaEnrollment(
  enrollmentId: MfaEnrollmentId,
  code: string,
  csrfToken: string,
): Promise<readonly string[]> {
  const body = {
    data: { type: "mfa-enrollment-verifications", attributes: { code } },
  } satisfies operations["verifyMFAEnrollment"]["requestBody"]["content"][typeof jsonApiMediaType];
  const response = await sendUnsafeRequest({
    method: "POST",
    path: `/api/v1/users/me/mfa-enrollments/${encodeURIComponent(enrollmentId)}/verifications`,
    csrfToken,
    body: JSON.stringify(body),
  });
  const document = await parseJsonApiResponse(
    response,
    recoveryCodesDocumentSchema,
  );
  if (document.data.id !== enrollmentId) throw new ApiProtocolError();
  return document.data.attributes.recovery_codes;
}

// Bodyless; only `204` is success.
export function cancelMfaEnrollment(
  enrollmentId: MfaEnrollmentId,
  csrfToken: string,
): Promise<void> {
  return sendNoContent({
    method: "DELETE",
    path: `/api/v1/users/me/mfa-enrollments/${encodeURIComponent(enrollmentId)}`,
    csrfToken,
  });
}
