import { randomBytes } from "node:crypto";
import { HttpResponse } from "msw";

// Synthetic, per-test MFA fixtures. Assertions refer to them by label only.
const mediaType = "application/vnd.api+json";
const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const recoveryAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function totpSecretFixture(): string {
  return Array.from(
    randomBytes(32),
    (byte) => base32Alphabet[byte % base32Alphabet.length],
  ).join("");
}

export function provisioningUriFixture(
  secret = totpSecretFixture(),
  host = "mia.example.test",
  username = "example.learner",
  suffix = "",
): string {
  return `otpauth://totp/MIA%20(${host}):${username}?secret=${secret}&issuer=MIA${suffix}`;
}

export function recoveryCodesFixture(): string[] {
  return Array.from({ length: 10 }, () =>
    Array.from(
      randomBytes(16),
      (byte) => recoveryAlphabet[byte % recoveryAlphabet.length],
    ).join(""),
  );
}

export type MfaStateFixture = {
  readonly accountId?: string;
  readonly active?: "totp" | "sms" | null;
  readonly pending?: {
    readonly id: string;
    readonly method?: "totp" | "sms";
  } | null;
  readonly enroll?: boolean;
};

export function mfaStateResponse({
  accountId = "account-id",
  active = null,
  pending = null,
  enroll,
}: MfaStateFixture = {}) {
  return HttpResponse.json(
    {
      data: {
        type: "mfa-states",
        id: accountId,
        attributes: {
          active_factor:
            active === null ? null : { id: "mff_active", method: active },
          pending_enrollment:
            pending === null
              ? null
              : {
                  id: pending.id,
                  method: pending.method ?? "totp",
                  expires_at: "2026-09-27T10:30:00.000000Z",
                  replaces_factor_id: null,
                },
          actions: {
            enroll: enroll ?? (active === null && pending === null),
            continue: pending !== null,
            cancel: pending !== null,
            disable: active !== null,
            replace: active !== null,
            verify: pending !== null,
            sms_resend: false,
          },
        },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}

export function enrollmentResponse(id: string, uri: string) {
  return HttpResponse.json(
    {
      data: {
        type: "mfa-enrollments",
        id,
        attributes: { method: "totp", provisioning_uri: uri },
      },
    },
    { status: 201, headers: { "Content-Type": mediaType } },
  );
}

export function recoveryCodesResponse(id: string, codes: readonly string[]) {
  return HttpResponse.json(
    {
      data: {
        type: "mfa-recovery-codes",
        id,
        attributes: { recovery_codes: codes },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}

export function mfaErrorResponse(status: number, code: string) {
  return HttpResponse.json(
    { errors: [{ status: String(status), code }] },
    { status, headers: { "Content-Type": mediaType } },
  );
}

// The capability catalog with `profile.view` granted in own scope only.
export function ownProfileCapabilities(
  accountId = "account-id",
  ownProfileView = true,
  ownResource = ownProfileView,
) {
  const actions = [
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
  ];
  return HttpResponse.json(
    {
      data: {
        type: "account-capabilities",
        id: accountId,
        attributes: {
          capabilities: actions.map((action) => {
            const own = ownProfileView && action === "profile.view";
            return {
              action,
              available: own,
              scope: {
                global: false,
                course_ids: [],
                student_ids: [],
                course_students: [],
                own_resource: ownResource && action === "profile.view",
              },
            };
          }),
        },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}

export function authenticatedSessionResponse(accountId = "account-id") {
  return HttpResponse.json(
    {
      data: {
        type: "auth-sessions",
        id: accountId,
        attributes: {
          stage: "authenticated",
          idle_expires_at: "2026-09-27T10:30:00.000000Z",
          absolute_expires_at: "2026-09-27T22:00:00.000000Z",
        },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}
