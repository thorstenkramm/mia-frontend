import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authenticatedSessionResponse,
  enrollmentResponse,
  mfaErrorResponse,
  mfaStateResponse,
  ownProfileCapabilities,
  provisioningUriFixture,
  recoveryCodesFixture,
  recoveryCodesResponse,
  totpSecretFixture,
  type MfaStateFixture,
} from "../../../test/mfaFixtures";
import { expectSameSecret } from "../../../test/secretAssertions";
import { server } from "../../../test/server";
import { toAccountId } from "../api/entry";
import { MfaEnrollment, mfaPaths } from "./mfaEnrollment";
import { SessionController } from "./sessionController";

const pendingId = "mfe_pending";

type Fixture = {
  controller: SessionController;
  mfa: MfaEnrollment;
  state: { current: MfaStateFixture; account: string };
  counts: { reads: number; starts: number; verifies: number; cancels: number };
};

async function authenticated(
  handlers: Parameters<typeof server.use> = [],
  ownProfileView = true,
  ownResource = ownProfileView,
): Promise<Fixture> {
  document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
  const state: Fixture["state"] = { current: {}, account: "account-id" };
  const counts = { reads: 0, starts: 0, verifies: 0, cancels: 0 };
  server.use(
    ...handlers,
    http.get("/api/v1/auth/session", () =>
      authenticatedSessionResponse(state.account),
    ),
    http.get("/api/v1/users/me/capabilities", () =>
      ownProfileCapabilities(state.account, ownProfileView, ownResource),
    ),
    http.get("/api/v1/users/me/mfa", () => {
      counts.reads++;
      return mfaStateResponse({ ...state.current, accountId: state.account });
    }),
  );
  const controller = new SessionController();
  const mfa = new MfaEnrollment(controller);
  controller.registerSecurityTeardown((scope) => mfa.observeTeardown(scope));
  controller.start();
  await waitFor(() =>
    expect(controller.getSnapshot().kind).toBe("Authenticated"),
  );
  return { controller, mfa, state, counts };
}

function countingStart(fixture: () => Fixture, uri: () => string) {
  return http.post("/api/v1/users/me/mfa-enrollments", () => {
    fixture().counts.starts++;
    fixture().state.current = { pending: { id: pendingId } };
    return enrollmentResponse(pendingId, uri());
  });
}

async function startedSetup(
  extra: Parameters<typeof server.use> = [],
  secret = totpSecretFixture(),
): Promise<Fixture & { secret: string }> {
  const holder: { fixture?: Fixture } = {};
  const current = () => {
    if (holder.fixture === undefined) throw new Error("Fixture is not ready.");
    return holder.fixture;
  };
  const fixture = await authenticated([
    countingStart(current, () => provisioningUriFixture(secret)),
    ...extra,
  ]);
  holder.fixture = fixture;
  await fixture.mfa.check(mfaPaths.enroll);
  await fixture.mfa.start();
  fixture.mfa.observePath(mfaPaths.verify);
  await fixture.mfa.check(mfaPaths.verify);
  return { ...fixture, secret };
}

afterEach(() => {
  document.cookie = "mia_csrf=; Max-Age=0; Path=/";
});

describe("authenticated gate decisions", () => {
  it.each([
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ])(
    "requires profile.view available=%s AND own_resource=%s",
    async (available, ownResource) => {
      const { controller, mfa, counts } = await authenticated(
        [],
        available,
        ownResource,
      );
      const permitted = available && ownResource;
      expect(controller.getAuthenticatedAccess()?.ownProfileView).toBe(
        permitted,
      );
      await mfa.check(mfaPaths.overview);
      expect(counts.reads).toBe(permitted ? 1 : 0);
      controller.shield();
      expect(controller.getAuthenticatedAccess()).toBeNull();
      controller.stop();
    },
  );
});

describe("TOTP enrollment owner", () => {
  it("starts a fresh visible setup after an empty lifecycle shield is reauthorized", async () => {
    const fixture = await authenticated();
    fixture.controller.shield("lifecycle");
    await fixture.controller.refreshSession();
    await fixture.mfa.check(mfaPaths.enroll);
    server.use(
      countingStart(
        () => fixture,
        () => provisioningUriFixture(),
      ),
    );
    await fixture.mfa.start();
    expect(fixture.mfa.getSnapshot().setup.kind).toBe("Visible");
    fixture.controller.stop();
  });

  it("keeps a start response masked when it arrives during an empty lifecycle shield", async () => {
    const fixture = await authenticated();
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post("/api/v1/users/me/mfa-enrollments", async () => {
        fixture.counts.starts++;
        await gate;
        fixture.state.current = { pending: { id: pendingId } };
        return enrollmentResponse(pendingId, provisioningUriFixture());
      }),
    );
    await fixture.mfa.check(mfaPaths.enroll);
    const started = fixture.mfa.start();
    await waitFor(() => expect(fixture.counts.starts).toBe(1));
    fixture.controller.shield("lifecycle");
    release();
    await started;
    expect(fixture.mfa.getSnapshot().setup.kind).toBe("Masked");
    fixture.mfa.reveal();
    expect(fixture.mfa.getSnapshot().setup.kind).toBe("Masked");
    await fixture.controller.refreshSession();
    await fixture.mfa.check(mfaPaths.verify);
    expect(fixture.mfa.getSnapshot().setup.kind).toBe("Masked");
    fixture.mfa.reveal();
    expect(fixture.mfa.getSnapshot().setup.kind).toBe("Visible");
    fixture.controller.stop();
  });

  it.each(["missing", "account", "epoch"] as const)(
    "projects no visible setup with a %s access binding",
    async (binding) => {
      const fixture = await startedSetup();
      const access = fixture.controller.getAuthenticatedAccess();
      if (access === null) throw new Error("Fixture access is missing.");
      const spy = vi
        .spyOn(fixture.controller, "getAuthenticatedAccess")
        .mockReturnValue(
          binding === "missing"
            ? null
            : {
                ...access,
                ...(binding === "epoch"
                  ? { epoch: access.epoch + 1 }
                  : { accountId: toAccountId("other-account") }),
              },
        );
      fixture.mfa.finishCodes();
      expect(fixture.mfa.getSnapshot().setup.kind).toBe("None");
      spy.mockRestore();
      fixture.controller.stop();
    },
  );

  it.each(["mfa", "password-change", "anonymous"] as const)(
    "destroys masked secrets when Refresh discovers %s",
    async (stage) => {
      const fixture = await startedSetup();
      fixture.controller.shield("lifecycle");
      server.use(
        http.get("/api/v1/auth/session", () =>
          HttpResponse.json(
            stage === "anonymous"
              ? { data: null, meta: { stage } }
              : {
                  data: {
                    type: "auth-sessions",
                    id: fixture.state.account,
                    attributes: {
                      stage,
                      ...(stage === "mfa"
                        ? { mfa_challenge_id: "challenge-id" }
                        : {}),
                      idle_expires_at: "2026-09-27T10:30:00.000000Z",
                      absolute_expires_at: "2026-09-27T22:00:00.000000Z",
                    },
                  },
                },
            { headers: { "Content-Type": "application/vnd.api+json" } },
          ),
        ),
      );
      const reads = fixture.counts.reads;
      await fixture.controller.refreshSession();
      expect(fixture.controller.getSnapshot().kind).toBe(
        stage === "mfa"
          ? "MFA required"
          : stage === "password-change"
            ? "Password change"
            : "Signed out",
      );
      expect(fixture.mfa.getSnapshot().setup.kind).toBe("None");
      expect(fixture.counts.reads).toBe(reads);
      fixture.controller.stop();
    },
  );

  it("destroys held setup on a different-account MFA read and cannot reveal it after a later valid read", async () => {
    const fixture = await startedSetup();
    fixture.controller.shield("lifecycle");
    await fixture.controller.refreshSession();
    let mismatch = true;
    server.use(
      http.get("/api/v1/users/me/mfa", () =>
        mfaStateResponse({
          ...fixture.state.current,
          accountId: mismatch ? "other-account" : fixture.state.account,
        }),
      ),
    );
    await fixture.mfa.check(mfaPaths.verify);
    expect(fixture.mfa.getSnapshot().read.kind).toBe("Check failed");
    expect(fixture.mfa.getSnapshot().setup.kind).toBe("None");
    mismatch = false;
    await fixture.mfa.check(mfaPaths.verify);
    fixture.mfa.reveal();
    expect(fixture.mfa.getSnapshot().setup.kind).toBe("None");
    fixture.controller.stop();
  });

  it("starts once with fresh CSRF and holds one visible setup on the verify route", async () => {
    const fixture = await startedSetup();
    const { setup } = fixture.mfa.getSnapshot();
    expect(fixture.counts.starts).toBe(1);
    expect(setup.kind).toBe("Visible");
    expectSameSecret(
      setup.kind === "Visible" ? setup.provisioning.secret : null,
      fixture.secret,
      "Visible setup",
    );
    fixture.controller.stop();
  });

  it("drops setup on departure and keeps no provisioning value", async () => {
    const fixture = await startedSetup();
    fixture.mfa.observePath(mfaPaths.overview);
    expect(fixture.mfa.getSnapshot().setup).toEqual({ kind: "None" });
    fixture.controller.stop();
  });

  it("masks on a lifecycle shield and reveals only after Refresh and a confirming read", async () => {
    const fixture = await startedSetup();
    fixture.controller.shield("lifecycle");
    expect(fixture.mfa.getSnapshot().setup).toEqual({
      kind: "Masked",
      enrollmentId: pendingId,
      confirmed: false,
    });
    fixture.mfa.reveal();
    expect(fixture.mfa.getSnapshot().setup.kind).toBe("Masked");
    await fixture.controller.refreshSession();
    expect(fixture.controller.getSnapshot().kind).toBe("Authenticated");
    await fixture.mfa.check(mfaPaths.verify);
    expect(fixture.mfa.getSnapshot().setup).toMatchObject({
      kind: "Masked",
      confirmed: true,
    });
    fixture.mfa.reveal();
    const { setup } = fixture.mfa.getSnapshot();
    expectSameSecret(
      setup.kind === "Visible" ? setup.provisioning.secret : null,
      fixture.secret,
      "Revealed setup",
    );
    expect(fixture.counts.starts).toBe(1);
    fixture.controller.stop();
  });

  it("destroys a masked setup when the confirming read reports another enrollment", async () => {
    const fixture = await startedSetup();
    fixture.controller.shield("lifecycle");
    fixture.state.current = { pending: { id: "mfe_other" } };
    await fixture.controller.refreshSession();
    await fixture.mfa.check(mfaPaths.verify);
    expect(fixture.mfa.getSnapshot().setup).toEqual({ kind: "None" });
    fixture.controller.stop();
  });

  it.each(["deadline", "continuation unknown", "recovery failed"] as const)(
    "destroys setup on a %s shield",
    async (reason) => {
      const fixture = await startedSetup();
      fixture.controller.shield(reason);
      expect(fixture.mfa.getSnapshot().setup).toEqual({ kind: "None" });
      await fixture.controller.refreshSession();
      await fixture.mfa.check(mfaPaths.verify);
      expect(fixture.mfa.getSnapshot().setup).toEqual({ kind: "None" });
      fixture.controller.stop();
    },
  );

  it("destroys masked secrets when Refresh finds another account", async () => {
    const fixture = await startedSetup();
    fixture.controller.shield("lifecycle");
    fixture.state.account = "other-account";
    await fixture.controller.refreshSession();
    expect(fixture.mfa.getSnapshot().setup).toEqual({ kind: "None" });
    fixture.controller.stop();
  });

  it("renders no setup for a rejected URI and reconciles the pending enrollment", async () => {
    const holder: { fixture?: Fixture } = {};
    const current = () => {
      if (holder.fixture === undefined)
        throw new Error("Fixture is not ready.");
      return holder.fixture;
    };
    const fixture = await authenticated([
      countingStart(current, () =>
        provisioningUriFixture(totpSecretFixture(), "mia.example.test", "x"),
      ),
    ]);
    holder.fixture = fixture;
    await fixture.mfa.check(mfaPaths.enroll);
    await fixture.mfa.start();
    const snapshot = fixture.mfa.getSnapshot();
    expect(snapshot.setup).toEqual({
      kind: "Rejected",
      enrollmentId: pendingId,
    });
    expect(snapshot.activity).toEqual({
      kind: "Settled",
      outcome: { kind: "uri-rejected" },
    });
    expect(fixture.counts).toMatchObject({ starts: 1, reads: 2 });
    fixture.controller.stop();
  });

  it("reconciles a pending-enrollment conflict without a second start", async () => {
    let starts = 0;
    const fixture = await authenticated([
      http.post("/api/v1/users/me/mfa-enrollments", () => {
        starts++;
        return mfaErrorResponse(409, "auth_mfa_enrollment_pending");
      }),
    ]);
    await fixture.mfa.check(mfaPaths.enroll);
    fixture.state.current = { pending: { id: pendingId } };
    await fixture.mfa.start();
    const { activity, read } = fixture.mfa.getSnapshot();
    expect(activity).toMatchObject({
      kind: "Settled",
      outcome: { kind: "pending-exists" },
    });
    expect(read.kind === "Ready" && read.state.pendingEnrollment?.id).toBe(
      pendingId,
    );
    expect(starts).toBe(1);
    fixture.controller.stop();
  });
});

describe("TOTP verification and recovery codes", () => {
  it("fences a verification response after an MFA read reports another account", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let verifies = 0;
    const fixture = await startedSetup([
      http.post(
        `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
        async () => {
          verifies++;
          await gate;
          return recoveryCodesResponse(pendingId, recoveryCodesFixture());
        },
      ),
    ]);
    const verified = fixture.mfa.verify("012345");
    await waitFor(() => expect(verifies).toBe(1));
    server.use(
      http.get("/api/v1/users/me/mfa", () =>
        mfaStateResponse({
          accountId: "other-account",
          active: "totp",
        }),
      ),
    );
    await fixture.mfa.check(mfaPaths.verify);
    release();
    await verified;
    expect(fixture.mfa.getSnapshot().read.kind).toBe("Check failed");
    expect(fixture.mfa.getSnapshot().setup.kind).toBe("None");
    expect(fixture.mfa.getSnapshot().codes.kind).toBe("None");
    expect(verifies).toBe(1);
    fixture.controller.stop();
  });

  it.each(["account mismatch", "restricted stage"] as const)(
    "destroys held recovery codes on %s and cannot restore them later",
    async (loss) => {
      const fixture = await startedSetup([
        http.post(
          `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
          () => recoveryCodesResponse(pendingId, recoveryCodesFixture()),
        ),
      ]);
      await fixture.mfa.verify("012345");
      fixture.state.current = { active: "totp" };
      await fixture.mfa.check(mfaPaths.recoveryCodes);
      fixture.controller.shield("lifecycle");
      if (loss === "restricted stage") {
        server.use(
          http.get("/api/v1/auth/session", () =>
            HttpResponse.json(
              {
                data: {
                  type: "auth-sessions",
                  id: fixture.state.account,
                  attributes: {
                    stage: "password-change",
                    idle_expires_at: "2026-09-27T10:30:00.000000Z",
                    absolute_expires_at: "2026-09-27T22:00:00.000000Z",
                  },
                },
              },
              { headers: { "Content-Type": "application/vnd.api+json" } },
            ),
          ),
        );
      } else {
        server.use(
          http.get("/api/v1/users/me/mfa", () =>
            mfaStateResponse({
              accountId: "other-account",
              active: "totp",
            }),
          ),
        );
      }
      await fixture.controller.refreshSession();
      await fixture.mfa.check(mfaPaths.recoveryCodes);
      expect(fixture.mfa.getSnapshot().codes.kind).toBe("None");
      server.use(
        http.get("/api/v1/auth/session", () => authenticatedSessionResponse()),
        http.get("/api/v1/users/me/mfa", () =>
          mfaStateResponse({ active: "totp" }),
        ),
      );
      fixture.controller.shield("lifecycle");
      await fixture.controller.refreshSession();
      await fixture.mfa.check(mfaPaths.recoveryCodes);
      fixture.mfa.reveal();
      expect(fixture.mfa.getSnapshot().codes.kind).toBe("None");
      fixture.controller.stop();
    },
  );

  it("activates once, drops setup, and holds ten codes until the codes route is left", async () => {
    const codes = recoveryCodesFixture();
    let verifies = 0;
    const fixture = await startedSetup([
      http.post(
        `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
        () => {
          verifies++;
          return recoveryCodesResponse(pendingId, codes);
        },
      ),
    ]);
    await fixture.mfa.verify("012345");
    let snapshot = fixture.mfa.getSnapshot();
    expect(verifies).toBe(1);
    expect(snapshot.setup).toEqual({ kind: "None" });
    expect(snapshot.codes).toEqual({ kind: "Masked", confirmed: false });
    fixture.mfa.reveal();
    expect(fixture.mfa.getSnapshot().codes.kind).toBe("Masked");
    fixture.state.current = { active: "totp" };
    fixture.mfa.observePath(mfaPaths.recoveryCodes);
    await fixture.mfa.check(mfaPaths.recoveryCodes);
    expect(fixture.mfa.getSnapshot().codes).toEqual({
      kind: "Masked",
      confirmed: true,
    });
    fixture.mfa.reveal();
    snapshot = fixture.mfa.getSnapshot();
    expectSameSecret(
      snapshot.codes.kind === "Visible" ? snapshot.codes.codes.join() : null,
      codes.join(),
      "Held codes",
    );
    expect(fixture.mfa.getSnapshot().codes.kind).toBe("Visible");
    fixture.mfa.finishCodes();
    snapshot = fixture.mfa.getSnapshot();
    expect(snapshot.codes).toEqual({ kind: "None" });
    fixture.controller.stop();
  });

  it("keeps a response that settles behind a lifecycle shield masked until revealed", async () => {
    const codes = recoveryCodesFixture();
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fixture = await startedSetup([
      http.post(
        `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
        async () => {
          await gate;
          return recoveryCodesResponse(pendingId, codes);
        },
      ),
    ]);
    const verified = fixture.mfa.verify("012345");
    await waitFor(() =>
      expect(fixture.mfa.getSnapshot().activity.kind).toBe("Verifying"),
    );
    fixture.controller.shield("lifecycle");
    release();
    await verified;
    expect(fixture.mfa.getSnapshot().codes).toEqual({
      kind: "Masked",
      confirmed: false,
    });
    fixture.state.current = { active: "totp" };
    await fixture.controller.refreshSession();
    fixture.mfa.observePath(mfaPaths.recoveryCodes);
    await fixture.mfa.check(mfaPaths.recoveryCodes);
    fixture.mfa.reveal();
    expect(fixture.mfa.getSnapshot().codes.kind).toBe("Visible");
    fixture.controller.stop();
  });

  it("drops a response that settles after a destroying teardown", async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fixture = await startedSetup([
      http.post(
        `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
        async () => {
          await gate;
          return recoveryCodesResponse(pendingId, recoveryCodesFixture());
        },
      ),
    ]);
    const verified = fixture.mfa.verify("012345");
    await waitFor(() =>
      expect(fixture.mfa.getSnapshot().activity.kind).toBe("Verifying"),
    );
    fixture.controller.shield("deadline");
    release();
    await verified;
    expect(fixture.mfa.getSnapshot().codes).toEqual({ kind: "None" });
    fixture.controller.stop();
  });

  it.each([
    [
      "an invalid code",
      () => mfaErrorResponse(422, "auth_invalid_mfa_code"),
      "code-invalid",
    ],
    ["a lost response", () => HttpResponse.error(), "verify-unknown"],
    [
      "a server failure",
      () => mfaErrorResponse(503, "unavailable"),
      "verify-unknown",
    ],
  ] as const)(
    "re-reads after %s and keeps the same pending setup without resubmitting",
    async (_label, respond, outcome) => {
      let verifies = 0;
      const fixture = await startedSetup([
        http.post(
          `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
          () => {
            verifies++;
            return respond();
          },
        ),
      ]);
      const readsBefore = fixture.counts.reads;
      await fixture.mfa.verify("012345");
      const snapshot = fixture.mfa.getSnapshot();
      expect(verifies).toBe(1);
      expect(fixture.counts.reads).toBe(readsBefore + 1);
      expect(snapshot.activity).toMatchObject({
        kind: "Settled",
        outcome: { kind: outcome },
      });
      expect(snapshot.setup.kind).toBe("Visible");
      fixture.controller.stop();
    },
  );

  it.each([
    ["active", { active: "totp" } as const],
    ["gone", {} as const],
  ])(
    "destroys setup when the unknown outcome reconciles as %s",
    async (_label, after) => {
      const fixture = await startedSetup([
        http.post(
          `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
          () => HttpResponse.error(),
        ),
      ]);
      fixture.state.current = after;
      await fixture.mfa.verify("012345");
      const snapshot = fixture.mfa.getSnapshot();
      expect(snapshot.setup).toEqual({ kind: "None" });
      expect(snapshot.codes).toEqual({ kind: "None" });
      fixture.controller.stop();
    },
  );

  it("does not replay a CSRF rejection", async () => {
    let verifies = 0;
    const fixture = await startedSetup([
      http.post(
        `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
        () => {
          verifies++;
          return mfaErrorResponse(403, "csrf_invalid");
        },
      ),
    ]);
    await fixture.mfa.verify("012345");
    expect(verifies).toBe(1);
    expect(fixture.mfa.getSnapshot().activity).toMatchObject({
      kind: "Settled",
      outcome: { kind: "verify-rejected" },
    });
    fixture.controller.stop();
  });

  it.each([
    [401, "auth_unauthenticated"],
    [403, "auth_password_change_required"],
  ] as const)(
    "destroys setup after verify returns HTTP %s access loss",
    async (status, code) => {
      let verifies = 0;
      const fixture = await startedSetup([
        http.post(
          `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
          () => {
            verifies++;
            return mfaErrorResponse(status, code);
          },
        ),
      ]);
      await fixture.mfa.verify("012345");
      expect(fixture.controller.getSnapshot()).toMatchObject({
        kind: "Privacy shield",
        reason: "access lost",
      });
      expect(fixture.mfa.getSnapshot().setup).toEqual({ kind: "None" });
      expect(fixture.mfa.getSnapshot().codes.kind).toBe("None");
      await fixture.controller.refreshSession();
      await fixture.mfa.check(mfaPaths.verify);
      fixture.mfa.reveal();
      expect(fixture.mfa.getSnapshot().setup.kind).toBe("None");
      expect(verifies).toBe(1);
      fixture.controller.stop();
    },
  );

  it.each(["setup", "codes"] as const)(
    "destroys held %s when the MFA state read returns 401",
    async (held) => {
      const fixture = await startedSetup([
        http.post(
          `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
          () => recoveryCodesResponse(pendingId, recoveryCodesFixture()),
        ),
      ]);
      const path = held === "setup" ? mfaPaths.verify : mfaPaths.recoveryCodes;
      if (held === "codes") {
        await fixture.mfa.verify(
          String(crypto.getRandomValues(new Uint32Array(1))[0] ?? 0)
            .slice(-6)
            .padStart(6, "0"),
        );
        fixture.state.current = { active: "totp" };
        await fixture.mfa.check(path);
        fixture.mfa.reveal();
      }
      expect(fixture.mfa.getSnapshot()[held].kind).toBe("Visible");
      let denied = true;
      let reads = 0;
      server.use(
        http.get("/api/v1/users/me/mfa", () => {
          reads++;
          return denied
            ? mfaErrorResponse(401, "auth_unauthenticated")
            : mfaStateResponse(fixture.state.current);
        }),
      );
      await fixture.mfa.check(path);
      expect(fixture.controller.getSnapshot()).toMatchObject({
        kind: "Privacy shield",
        reason: "access lost",
      });
      expect(fixture.mfa.getSnapshot().setup.kind).toBe("None");
      expect(fixture.mfa.getSnapshot().codes.kind).toBe("None");
      expect(reads).toBe(1);
      denied = false;
      await fixture.controller.refreshSession();
      await fixture.mfa.check(path);
      fixture.mfa.reveal();
      expect(fixture.mfa.getSnapshot()[held].kind).toBe("None");
      fixture.controller.stop();
    },
  );
});

describe("mutation completion after departure", () => {
  it.each([
    ["start", "authorized"],
    ["verify", "authorized"],
    ["start", "returned"],
    ["verify", "returned"],
    ["start", "lifecycle"],
    ["verify", "lifecycle"],
    ["start", "deadline"],
    ["verify", "deadline"],
  ] as const)(
    "reconciles %s after departure only while %s",
    async (operation, access) => {
      const fixture =
        operation === "start" ? await authenticated() : await startedSetup();
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let dispatches = 0;
      server.use(
        http.post(
          operation === "start"
            ? "/api/v1/users/me/mfa-enrollments"
            : `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
          async () => {
            dispatches++;
            await gate;
            fixture.state.current =
              operation === "start"
                ? { pending: { id: pendingId } }
                : { active: "totp" };
            return operation === "start"
              ? enrollmentResponse(pendingId, provisioningUriFixture())
              : recoveryCodesResponse(pendingId, recoveryCodesFixture());
          },
        ),
      );
      await fixture.mfa.check(
        operation === "start" ? mfaPaths.enroll : mfaPaths.verify,
      );
      const completed =
        operation === "start"
          ? fixture.mfa.start()
          : fixture.mfa.verify("012345");
      await waitFor(() => expect(dispatches).toBe(1));
      await fixture.mfa.check(mfaPaths.overview);
      if (access === "returned")
        await fixture.mfa.check(
          operation === "start" ? mfaPaths.enroll : mfaPaths.verify,
        );
      const shielded = access === "lifecycle" || access === "deadline";
      if (shielded) fixture.controller.shield(access);
      const reads = fixture.counts.reads;
      release();
      await completed;
      expect(dispatches).toBe(1);
      expect(fixture.counts.reads).toBe(reads + (shielded ? 0 : 1));
      expect(fixture.mfa.getSnapshot().setup.kind).toBe("None");
      expect(fixture.mfa.getSnapshot().codes.kind).toBe("None");
      if (shielded) {
        await fixture.controller.refreshSession();
        await fixture.mfa.check(mfaPaths.overview);
      }
      const { read, activity } = fixture.mfa.getSnapshot();
      expect(read.kind).toBe("Ready");
      expect(
        read.kind === "Ready" && read.state.pendingEnrollment !== null,
      ).toBe(operation === "start");
      expect(read.kind === "Ready" && read.state.activeFactor !== null).toBe(
        operation === "verify",
      );
      if (operation === "verify" && access !== "deadline")
        expect(activity).toMatchObject({
          kind: "Settled",
          outcome: { kind: "codes-lost" },
        });
      if (operation === "verify" && access === "returned") {
        await fixture.mfa.check(mfaPaths.overview);
        expect(fixture.mfa.getSnapshot().activity).toMatchObject({
          kind: "Settled",
          outcome: { kind: "codes-lost" },
        });
      }
      fixture.controller.stop();
    },
  );
});

describe("pending enrollment cancellation", () => {
  it.each([
    ["success", () => new HttpResponse(null, { status: 204 }), "cancelled"],
    [
      "an already-gone 422",
      () => mfaErrorResponse(422, "auth_invalid_request"),
      "cancel-rejected",
    ],
    ["a lost response", () => HttpResponse.error(), "cancel-unknown"],
  ] as const)(
    "sends one DELETE on %s and reconciles through one read",
    async (_label, respond, outcome) => {
      let cancels = 0;
      const fixture = await startedSetup([
        http.delete(`/api/v1/users/me/mfa-enrollments/${pendingId}`, () => {
          cancels++;
          return respond();
        }),
      ]);
      fixture.state.current = {};
      const readsBefore = fixture.counts.reads;
      await fixture.mfa.cancel();
      const snapshot = fixture.mfa.getSnapshot();
      expect(cancels).toBe(1);
      expect(fixture.counts.reads).toBe(readsBefore + 1);
      expect(snapshot.activity).toMatchObject({
        kind: "Settled",
        outcome: { kind: outcome },
      });
      expect(snapshot.setup).toEqual({ kind: "None" });
      fixture.controller.stop();
    },
  );
});
