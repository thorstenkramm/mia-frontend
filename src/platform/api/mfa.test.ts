import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
  enrollmentResponse,
  mfaErrorResponse,
  mfaStateResponse,
  provisioningUriFixture,
  recoveryCodesFixture,
  recoveryCodesResponse,
  totpSecretFixture,
} from "../../../test/mfaFixtures";
import { expectSameSecret } from "../../../test/secretAssertions";
import { server } from "../../../test/server";
import { ApiHttpError, ApiProtocolError, jsonApiMediaType } from "./client";
import {
  cancelMfaEnrollment,
  getCurrentMfaState,
  startTotpEnrollment,
  verifyMfaEnrollment,
  type MfaEnrollmentId,
} from "./mfa";

const enrollmentId = "mfe_pending" as MfaEnrollmentId;

describe("MFA transport", () => {
  it("maps the authoritative MFA state without secret material", async () => {
    server.use(
      http.get("/api/v1/users/me/mfa", () =>
        mfaStateResponse({ pending: { id: enrollmentId } }),
      ),
    );
    const state = await getCurrentMfaState(new AbortController().signal);
    expect(state).toEqual({
      accountId: "account-id",
      activeFactor: null,
      pendingEnrollment: {
        id: enrollmentId,
        method: "totp",
        expiresAt: Date.parse("2026-09-27T10:30:00.000Z"),
      },
      actions: { enroll: false, cancel: true, verify: true },
    });
  });

  it("rejects an MFA state that carries an undeclared field", async () => {
    server.use(
      http.get("/api/v1/users/me/mfa", async () => {
        const document = (await mfaStateResponse({
          pending: { id: enrollmentId },
        }).json()) as { data: { attributes: Record<string, unknown> } };
        document.data.attributes.provisioning_uri = provisioningUriFixture();
        return HttpResponse.json(document, {
          headers: { "Content-Type": jsonApiMediaType },
        });
      }),
    );
    await expect(
      getCurrentMfaState(new AbortController().signal),
    ).rejects.toBeInstanceOf(ApiProtocolError);
  });

  it("starts TOTP enrollment once with fresh CSRF and validates the URI", async () => {
    const secret = totpSecretFixture();
    const csrf = crypto.randomUUID();
    const requests: Request[] = [];
    server.use(
      http.post("/api/v1/users/me/mfa-enrollments", ({ request }) => {
        requests.push(request.clone());
        return enrollmentResponse(enrollmentId, provisioningUriFixture(secret));
      }),
    );
    const started = await startTotpEnrollment(csrf);
    expect(requests).toHaveLength(1);
    const [request] = requests;
    expect(request?.headers.get("X-CSRF-Token")).toBe(csrf);
    expect(request?.headers.get("Content-Type")).toBe(jsonApiMediaType);
    expect(await request?.json()).toEqual({
      data: { type: "mfa-enrollments", attributes: { method: "totp" } },
    });
    expect(started.enrollmentId).toBe(enrollmentId);
    expectSameSecret(started.provisioning?.secret, secret, "Started secret");
  });

  it("keeps the enrollment ID but no provisioning value for a rejected URI", async () => {
    server.use(
      http.post("/api/v1/users/me/mfa-enrollments", () =>
        enrollmentResponse(
          enrollmentId,
          provisioningUriFixture(totpSecretFixture().toLowerCase()),
        ),
      ),
    );
    expect(await startTotpEnrollment(crypto.randomUUID())).toEqual({
      enrollmentId,
      provisioning: null,
    });
  });

  it("surfaces a pending-enrollment conflict as its stable code", async () => {
    server.use(
      http.post("/api/v1/users/me/mfa-enrollments", () =>
        mfaErrorResponse(409, "auth_mfa_enrollment_pending"),
      ),
    );
    const failure = await startTotpEnrollment(crypto.randomUUID()).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(ApiHttpError);
    expect((failure as ApiHttpError).code).toBe("auth_mfa_enrollment_pending");
  });

  it("returns exactly ten distinct codes for the verified enrollment", async () => {
    const codes = recoveryCodesFixture();
    let body: unknown;
    server.use(
      http.post(
        "/api/v1/users/me/mfa-enrollments/mfe_pending/verifications",
        async ({ request }) => {
          body = await request.json();
          return recoveryCodesResponse(enrollmentId, codes);
        },
      ),
    );
    const returned = await verifyMfaEnrollment(
      enrollmentId,
      "012345",
      crypto.randomUUID(),
    );
    expect(body).toEqual({
      data: {
        type: "mfa-enrollment-verifications",
        attributes: { code: "012345" },
      },
    });
    expectSameSecret(returned.join(), codes.join(), "Returned codes");
  });

  it.each([
    ["nine codes", (codes: string[]) => codes.slice(1), enrollmentId],
    [
      "a duplicated code",
      (codes: string[]) => [...codes.slice(1), codes[1] ?? ""],
      enrollmentId,
    ],
    [
      "a grouped code",
      (codes: string[]) => [
        `${codes[0]?.slice(0, 4) ?? ""}-${codes[0]?.slice(4) ?? ""}`,
        ...codes.slice(1),
      ],
      enrollmentId,
    ],
    ["another enrollment", (codes: string[]) => codes, "mfe_other"],
  ])("rejects %s", async (_label, shape, id) => {
    server.use(
      http.post(
        "/api/v1/users/me/mfa-enrollments/mfe_pending/verifications",
        () => recoveryCodesResponse(id, shape(recoveryCodesFixture())),
      ),
    );
    await expect(
      verifyMfaEnrollment(enrollmentId, "012345", crypto.randomUUID()),
    ).rejects.toBeInstanceOf(ApiProtocolError);
  });

  it("cancels with one bodyless DELETE and accepts only 204", async () => {
    const methods: string[] = [];
    let status = 204;
    server.use(
      http.delete(
        "/api/v1/users/me/mfa-enrollments/mfe_pending",
        async ({ request }) => {
          methods.push(request.method);
          expect(await request.text()).toBe("");
          expect(request.headers.get("Content-Type")).toBeNull();
          return status === 204
            ? new HttpResponse(null, { status })
            : HttpResponse.json({ data: null }, { status });
        },
      ),
    );
    await cancelMfaEnrollment(enrollmentId, crypto.randomUUID());
    status = 200;
    await expect(
      cancelMfaEnrollment(enrollmentId, crypto.randomUUID()),
    ).rejects.toBeInstanceOf(ApiProtocolError);
    expect(methods).toEqual(["DELETE", "DELETE"]);
  });
});
