import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installTestOriginLocks } from "../../../test/originLocks";
import { server } from "../../../test/server";
import { SessionController } from "./sessionController";

const mediaType = "application/vnd.api+json";

function anonymousSession() {
  return HttpResponse.json(
    { data: null, meta: { stage: "anonymous" } },
    { headers: { "Content-Type": mediaType } },
  );
}

class TestBroadcastChannel extends EventTarget {
  static readonly channels = new Map<string, Set<TestBroadcastChannel>>();
  static deferSecurityEpoch = false;
  static readonly deferredSecurityEpochs: Array<() => void> = [];
  readonly name: string;

  constructor(name: string) {
    super();
    this.name = name;
    const peers = TestBroadcastChannel.channels.get(name) ?? new Set();
    peers.add(this);
    TestBroadcastChannel.channels.set(name, peers);
  }

  postMessage(message: unknown): void {
    for (const peer of TestBroadcastChannel.channels.get(this.name) ?? []) {
      if (peer !== this) {
        const dispatch = () =>
          peer.dispatchEvent(new MessageEvent("message", { data: message }));
        if (
          TestBroadcastChannel.deferSecurityEpoch &&
          typeof message === "object" &&
          message !== null &&
          "kind" in message &&
          message.kind === "security-epoch"
        )
          TestBroadcastChannel.deferredSecurityEpochs.push(dispatch);
        else dispatch();
      }
    }
  }

  static flushSecurityEpochs(): void {
    for (const dispatch of this.deferredSecurityEpochs.splice(0)) dispatch();
  }

  close(): void {
    TestBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}

function restrictedSession(challengeId = "challenge-id") {
  return HttpResponse.json(
    {
      data: {
        type: "auth-sessions",
        id: "account-id",
        attributes: {
          stage: "mfa",
          mfa_challenge_id: challengeId,
          idle_expires_at: "2026-09-27T10:30:00.000000Z",
          absolute_expires_at: "2026-09-27T22:00:00.000000Z",
        },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}

function mfaCodeFixture(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

afterEach(() => {
  vi.unstubAllGlobals();
  TestBroadcastChannel.channels.clear();
  TestBroadcastChannel.deferSecurityEpoch = false;
  TestBroadcastChannel.deferredSecurityEpochs.length = 0;
  document.cookie = "mia_csrf=; Max-Age=0; Path=/";
});

describe("SessionController logout coordination", () => {
  it.each([
    ["challenge", 403, "auth_mfa_step_used", "step-used"],
    ["challenge", 422, "auth_invalid_mfa_code", "invalid-code"],
    ["challenge", 422, "auth_mfa_challenge_expired", "expired"],
    ["challenge", 429, "rate_limited", "throttled"],
    ["challenge", 422, "auth_invalid_request", "failed"],
    ["recovery", 422, "auth_invalid_recovery_code", "invalid-code"],
    ["recovery", 422, "auth_mfa_challenge_expired", "expired"],
    ["recovery", 429, "rate_limited", "throttled"],
  ] as const)(
    "renders definitive MFA %s error code %s without replay",
    async (route, status, code, outcome) => {
      const controller = new SessionController();
      let posts = 0;
      server.use(
        http.get("/api/v1/auth/session", () => restrictedSession()),
        http.post(
          /\/api\/v1\/auth\/mfa-challenges\/challenge-id\/(?:verifications|recovery-code-consumptions)$/u,
          () => {
            posts++;
            return HttpResponse.json(
              { errors: [{ status: String(status), code }] },
              {
                status,
                headers: { "Content-Type": mediaType, "Retry-After": "31" },
              },
            );
          },
        ),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      controller.start();
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("MFA required"),
      );
      if (route === "recovery") controller.selectMfaRoute("recovery");

      await controller.submitMfa(route, crypto.randomUUID());

      expect(controller.getSnapshot()).toMatchObject({
        kind: "MFA required",
        route,
        outcome: { kind: outcome },
      });
      expect(posts).toBe(1);
      controller.stop();
    },
  );

  it.each([
    [403, "csrf_invalid", "mfa", "MFA required"],
    [
      403,
      "auth_password_change_required",
      "password-change",
      "Password change",
    ],
    [401, "auth_unauthenticated", "anonymous", "Signed out"],
  ] as const)(
    "reconciles MFA HTTP %s code %s through authoritative discovery",
    async (status, code, recoveredStage, expectedState) => {
      const controller = new SessionController();
      let reads = 0;
      let posts = 0;
      server.use(
        http.get("/api/v1/auth/session", () => {
          reads++;
          if (reads === 1 || recoveredStage === "mfa")
            return restrictedSession();
          if (recoveredStage === "anonymous")
            return HttpResponse.json(
              { data: null, meta: { stage: "anonymous" } },
              { headers: { "Content-Type": mediaType } },
            );
          return HttpResponse.json(
            {
              data: {
                type: "auth-sessions",
                id: "account-id",
                attributes: {
                  stage: "password-change",
                  idle_expires_at: "2026-10-01T10:30:00.000000Z",
                  absolute_expires_at: "2026-10-01T10:30:00.000000Z",
                },
              },
            },
            { headers: { "Content-Type": mediaType } },
          );
        }),
        http.post(
          "/api/v1/auth/mfa-challenges/challenge-id/verifications",
          () => {
            posts++;
            return HttpResponse.json(
              { errors: [{ status: String(status), code }] },
              { status, headers: { "Content-Type": mediaType } },
            );
          },
        ),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      controller.start();
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("MFA required"),
      );

      await controller.submitMfa("challenge", mfaCodeFixture());

      expect(controller.getSnapshot().kind).toBe(expectedState);
      expect({ posts, reads }).toEqual({ posts: 1, reads: 2 });
      controller.stop();
    },
  );

  it("chains definitive MFA completion directly to password change", async () => {
    const controller = new SessionController();
    let reads = 0;
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return restrictedSession();
      }),
      http.post(
        "/api/v1/auth/mfa-challenges/challenge-id/verifications",
        () => {
          posts++;
          return HttpResponse.json(
            {
              data: {
                type: "auth-sessions",
                id: "account-id",
                attributes: {
                  stage: "password-change",
                  idle_expires_at: "2026-09-30T10:30:00.000000Z",
                  absolute_expires_at: "2026-09-30T10:30:00.000000Z",
                },
              },
            },
            { headers: { "Content-Type": mediaType } },
          );
        },
      ),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("MFA required"),
    );

    await controller.submitMfa("challenge", mfaCodeFixture());

    expect(controller.getSnapshot().kind).toBe("Password change");
    expect({ posts, reads }).toEqual({ posts: 1, reads: 1 });
    controller.stop();
  });

  it("reconciles an ambiguous MFA result without replay and permits an explicit safe recheck", async () => {
    const controller = new SessionController();
    let reads = 0;
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return reads === 2 ? HttpResponse.error() : restrictedSession();
      }),
      http.post(
        "/api/v1/auth/mfa-challenges/challenge-id/verifications",
        () => {
          posts++;
          return HttpResponse.error();
        },
      ),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("MFA required"),
    );

    await controller.submitMfa("challenge", mfaCodeFixture());

    expect(controller.getSnapshot()).toMatchObject({
      kind: "Rotating",
      origin: "mfa",
      phase: "reconciliation failed",
    });
    expect({ posts, reads }).toEqual({ posts: 1, reads: 2 });
    await controller.recheckMfa();
    expect(controller.getSnapshot()).toMatchObject({
      kind: "MFA required",
      route: "challenge",
    });
    expect({ posts, reads }).toEqual({ posts: 1, reads: 3 });
    controller.stop();
  });

  it("replaces an invalidated challenge binding only from authoritative discovery", async () => {
    const controller = new SessionController();
    let reads = 0;
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return restrictedSession(
          reads === 1 ? "challenge-id" : "challenge-new",
        );
      }),
      http.post(
        "/api/v1/auth/mfa-challenges/challenge-id/verifications",
        () => {
          posts++;
          return HttpResponse.error();
        },
      ),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("MFA required"),
    );

    await controller.submitMfa("challenge", mfaCodeFixture());

    expect(controller.getSnapshot()).toMatchObject({
      kind: "MFA required",
      challengeId: "challenge-new",
    });
    expect({ posts, reads }).toEqual({ posts: 1, reads: 2 });
    controller.stop();
  });

  it("quiesces an admitted MFA transition before restricted logout and fences its late result", async () => {
    const controller = new SessionController();
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let mfaPosts = 0;
    let logoutPosts = 0;
    server.use(
      http.get("/api/v1/auth/session", () => restrictedSession()),
      http.post(
        "/api/v1/auth/mfa-challenges/challenge-id/verifications",
        async () => {
          mfaPosts++;
          await pending;
          return HttpResponse.json(
            {
              data: {
                type: "auth-sessions",
                id: "account-id",
                attributes: {
                  stage: "password-change",
                  idle_expires_at: "2026-10-01T10:30:00.000000Z",
                  absolute_expires_at: "2026-10-01T10:30:00.000000Z",
                },
              },
            },
            { headers: { "Content-Type": mediaType } },
          );
        },
      ),
      http.post("/api/v1/auth/logout", () => {
        logoutPosts++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("MFA required"),
    );
    const transition = controller.submitMfa("challenge", mfaCodeFixture());
    await waitFor(() => expect(mfaPosts).toBe(1));

    controller.beginRestrictedLogout();
    expect(controller.getSnapshot().kind).toBe("Logout quiescing");
    expect(logoutPosts).toBe(0);
    release();
    await transition;
    await waitFor(() => expect(logoutPosts).toBe(1));
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe(
        "Logout reconciliation needed",
      ),
    );
    expect(mfaPosts).toBe(1);
    controller.stop();
  });

  it("serializes two tabs and never sends queued MFA work for a superseded challenge", async () => {
    const first = new SessionController();
    const second = new SessionController();
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let transitioned = false;
    let posts = 0;
    const passwordChange = () =>
      HttpResponse.json(
        {
          data: {
            type: "auth-sessions",
            id: "account-id",
            attributes: {
              stage: "password-change",
              idle_expires_at: "2026-10-01T10:30:00.000000Z",
              absolute_expires_at: "2026-10-01T10:30:00.000000Z",
            },
          },
        },
        { headers: { "Content-Type": mediaType } },
      );
    server.use(
      http.get("/api/v1/auth/session", () =>
        transitioned ? passwordChange() : restrictedSession(),
      ),
      http.post(
        "/api/v1/auth/mfa-challenges/challenge-id/verifications",
        async () => {
          posts++;
          await pending;
          transitioned = true;
          return passwordChange();
        },
      ),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    first.start();
    second.start();
    await waitFor(() =>
      expect([first.getSnapshot().kind, second.getSnapshot().kind]).toEqual([
        "MFA required",
        "MFA required",
      ]),
    );
    const firstWork = first.submitMfa("challenge", mfaCodeFixture());
    await waitFor(() => expect(posts).toBe(1));
    const queuedWork = second.submitMfa("challenge", mfaCodeFixture());
    release();
    await Promise.all([firstWork, queuedWork]);

    expect(posts).toBe(1);
    expect([first.getSnapshot().kind, second.getSnapshot().kind]).toEqual([
      "Password change",
      "Password change",
    ]);
    first.stop();
    second.stop();
  });

  it("fails closed without origin locks and never dispatches concurrent login", async () => {
    const restore = installTestOriginLocks();
    const first = new SessionController();
    const second = new SessionController();
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", anonymousSession),
      http.post("/api/v1/auth/login", () => {
        posts++;
        return restrictedSession();
      }),
    );
    try {
      first.start();
      second.start();
      await waitFor(() =>
        expect([first.getSnapshot().kind, second.getSnapshot().kind]).toEqual([
          "Signed out",
          "Signed out",
        ]),
      );
      restore();
      Reflect.deleteProperty(navigator, "locks");
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;

      await Promise.all([
        first.login("example", crypto.randomUUID()),
        second.login("example", crypto.randomUUID()),
      ]);

      expect(posts).toBe(0);
      expect(first.getSnapshot()).toMatchObject({
        kind: "Rotating",
        phase: "reconciliation failed",
      });
      expect(second.getSnapshot()).toMatchObject({
        kind: "Rotating",
        phase: "reconciliation failed",
      });
    } finally {
      first.stop();
      second.stop();
      restore();
    }
  });

  it("serializes two tabs' admitted login transitions across the origin", async () => {
    const restore = installTestOriginLocks();
    const first = new SessionController();
    const second = new SessionController();
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", anonymousSession),
      http.post("/api/v1/auth/login", async () => {
        posts++;
        if (posts === 1) await pending;
        return new HttpResponse("rejected", { status: 401 });
      }),
    );
    try {
      first.start();
      second.start();
      await waitFor(() =>
        expect([first.getSnapshot().kind, second.getSnapshot().kind]).toEqual([
          "Signed out",
          "Signed out",
        ]),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const a = first.login("example", crypto.randomUUID());
      await waitFor(() => expect(posts).toBe(1));
      const b = second.login("example", crypto.randomUUID());
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(posts).toBe(1);
      release();
      await Promise.all([a, b]);
      expect(posts).toBe(2);
    } finally {
      release();
      first.stop();
      second.stop();
      restore();
    }
  });

  it("invalidates a queued login through authoritative discovery before a delayed peer epoch arrives", async () => {
    vi.stubGlobal(
      "BroadcastChannel",
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    TestBroadcastChannel.deferSecurityEpoch = true;
    const first = new SessionController();
    const second = new SessionController();
    let transitioned = false;
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let posts = 0;
    let reads = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return transitioned ? restrictedSession() : anonymousSession();
      }),
      http.post("/api/v1/auth/login", async () => {
        posts++;
        await pending;
        transitioned = true;
        return restrictedSession();
      }),
    );
    first.start();
    second.start();
    await waitFor(() =>
      expect([first.getSnapshot().kind, second.getSnapshot().kind]).toEqual([
        "Signed out",
        "Signed out",
      ]),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;

    const firstLogin = first.login("example", crypto.randomUUID());
    await waitFor(() => expect(posts).toBe(1));
    const queuedLogin = second.login("example", crypto.randomUUID());
    release();
    await Promise.all([firstLogin, queuedLogin]);

    expect({ posts, reads }).toEqual({ posts: 1, reads: 3 });
    expect(first.getSnapshot().kind).toBe("MFA required");
    expect(second.getSnapshot().kind).toBe("Restricted expired");
    TestBroadcastChannel.flushSecurityEpochs();
    expect(first.getSnapshot().kind).toBe("MFA required");
    expect(second.getSnapshot().kind).toBe("Restricted expired");
    first.stop();
    second.stop();
  });

  it("makes explicit ambiguity reconciliation wait behind another admitted login", async () => {
    const restore = installTestOriginLocks();
    const recovering = new SessionController();
    const signingIn = new SessionController();
    let reads = 0;
    let posts = 0;
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return reads === 3 ? HttpResponse.error() : anonymousSession();
      }),
      http.post("/api/v1/auth/login", async () => {
        posts++;
        if (posts === 1) return HttpResponse.error();
        await pending;
        return new HttpResponse("rejected", { status: 401 });
      }),
    );
    try {
      recovering.start();
      signingIn.start();
      await waitFor(() =>
        expect([
          recovering.getSnapshot().kind,
          signingIn.getSnapshot().kind,
        ]).toEqual(["Signed out", "Signed out"]),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      await recovering.login("example", crypto.randomUUID());
      expect(recovering.getSnapshot()).toMatchObject({
        kind: "Rotating",
        phase: "reconciliation failed",
      });
      const login = signingIn.login("example", crypto.randomUUID());
      await waitFor(() => expect(posts).toBe(2));
      const recheck = recovering.recheckLogin();
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(reads).toBe(3);
      release();
      await Promise.all([login, recheck]);
      expect(reads).toBe(4);
      expect(recovering.getSnapshot().kind).toBe("Signed out");
    } finally {
      release();
      recovering.stop();
      signingIn.stop();
      restore();
    }
  });

  it.each([false, true])(
    "broadcasts only a locally applied non-anonymous ambiguity recovery (restricted: %s)",
    async (restricted) => {
      vi.stubGlobal(
        "BroadcastChannel",
        TestBroadcastChannel as unknown as typeof BroadcastChannel,
      );
      const peer = new TestBroadcastChannel("mia-security-v1");
      const signals: unknown[] = [];
      const controller = new SessionController();
      const stages: string[] = [];
      peer.addEventListener("message", (event) => {
        signals.push((event as MessageEvent<unknown>).data);
        stages.push(controller.getSnapshot().kind);
      });
      let reads = 0;
      server.use(
        http.get("/api/v1/auth/session", () => {
          reads++;
          return reads > 1 && restricted
            ? restrictedSession()
            : anonymousSession();
        }),
        http.post("/api/v1/auth/login", () => HttpResponse.error()),
      );
      controller.start();
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("Signed out"),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      await controller.login("example", crypto.randomUUID());
      expect(signals.length).toBe(restricted ? 1 : 0);
      if (restricted) {
        expect(stages).toEqual(["MFA required"]);
        expect(signals[0]).toEqual({
          version: 1,
          kind: "security-epoch",
          eventNonce: expect.any(String),
        });
      }
      controller.stop();
      peer.close();
    },
  );

  it("fences a pending new login on delayed logout confirmation without starting discovery", async () => {
    vi.stubGlobal(
      "BroadcastChannel",
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    const controller = new SessionController();
    const peer = new TestBroadcastChannel("mia-security-v1");
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let posts = 0;
    let reads = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return anonymousSession();
      }),
      http.post("/api/v1/auth/login", async () => {
        posts++;
        await pending;
        return restrictedSession();
      }),
    );
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Signed out"),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const work = controller.login("example", crypto.randomUUID());
    await waitFor(() => expect(posts).toBe(1));
    peer.postMessage({
      version: 1,
      kind: "logout-confirmed",
      logoutNonce: crypto.randomUUID(),
      eventNonce: crypto.randomUUID(),
    });
    expect(controller.getSnapshot().kind).toBe("Logout reconciliation needed");
    release();
    await work;
    expect(controller.getSnapshot().kind).toBe("Logout reconciliation needed");
    expect(reads).toBe(1);
    controller.stop();
    peer.close();
  });

  it("fences a pending login on delayed logout-unconfirmed notification", async () => {
    vi.stubGlobal(
      "BroadcastChannel",
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    const controller = new SessionController();
    const peer = new TestBroadcastChannel("mia-security-v1");
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", anonymousSession),
      http.post("/api/v1/auth/login", async () => {
        posts++;
        await pending;
        return restrictedSession();
      }),
    );
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Signed out"),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const work = controller.login("example", crypto.randomUUID());
    await waitFor(() => expect(posts).toBe(1));

    peer.postMessage({
      version: 1,
      kind: "logout-unconfirmed",
      logoutNonce: crypto.randomUUID(),
      eventNonce: crypto.randomUUID(),
    });
    expect(controller.getSnapshot().kind).toBe("Logout unconfirmed");
    release();
    await work;
    expect(controller.getSnapshot().kind).toBe("Logout reconciliation needed");
    controller.stop();
    peer.close();
  });

  it("fences pending capability discovery on logout-unconfirmed notification", async () => {
    vi.stubGlobal(
      "BroadcastChannel",
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    const controller = new SessionController();
    const peer = new TestBroadcastChannel("mia-security-v1");
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get("/api/v1/auth/session", () =>
        HttpResponse.json(
          {
            data: {
              type: "auth-sessions",
              id: "account-id",
              attributes: {
                stage: "authenticated",
                idle_expires_at: "2026-09-27T10:30:00.000000Z",
                absolute_expires_at: "2026-09-27T22:00:00.000000Z",
              },
            },
          },
          { headers: { "Content-Type": mediaType } },
        ),
      ),
      http.get("/api/v1/users/me/capabilities", async () => {
        await pending;
        return HttpResponse.json(
          {
            data: {
              type: "account-capabilities",
              id: "account-id",
              attributes: { capabilities: [] },
            },
          },
          { headers: { "Content-Type": mediaType } },
        );
      }),
    );
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot()).toEqual({
        kind: "Access checking",
        phase: "loading",
      }),
    );

    peer.postMessage({
      version: 1,
      kind: "logout-unconfirmed",
      logoutNonce: crypto.randomUUID(),
      eventNonce: crypto.randomUUID(),
    });
    expect(controller.getSnapshot().kind).toBe("Logout unconfirmed");
    release();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(controller.getSnapshot().kind).toBe("Logout unconfirmed");
    controller.stop();
    peer.close();
  });

  it("keeps both tabs stable when passive peer revalidation finds the completed restricted stage", async () => {
    vi.stubGlobal(
      "BroadcastChannel",
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    const signingIn = new SessionController();
    const peer = new SessionController();
    let transitioned = false;
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () =>
        transitioned ? restrictedSession() : anonymousSession(),
      ),
      http.post("/api/v1/auth/login", () => {
        posts++;
        transitioned = true;
        return restrictedSession();
      }),
    );
    signingIn.start();
    peer.start();
    await waitFor(() =>
      expect([signingIn.getSnapshot().kind, peer.getSnapshot().kind]).toEqual([
        "Signed out",
        "Signed out",
      ]),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    await signingIn.login("example", crypto.randomUUID());
    expect(signingIn.getSnapshot().kind).toBe("MFA required");
    expect(peer.getSnapshot().kind).toBe("Restricted expired");

    await peer.recheckLogin();

    expect(posts).toBe(1);
    expect(signingIn.getSnapshot().kind).toBe("MFA required");
    expect(peer.getSnapshot().kind).toBe("MFA required");
    signingIn.stop();
    peer.stop();
  });
  it.each([false, true])(
    "checks a queued login lease against fresh CSRF and superseding epochs (superseded: %s)",
    async (superseded) => {
      vi.stubGlobal(
        "BroadcastChannel",
        TestBroadcastChannel as unknown as typeof BroadcastChannel,
      );
      let release: (() => void) | undefined;
      const pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      let posts = 0;
      let fresh = false;
      const token = crypto.randomUUID();
      server.use(
        http.get("/api/v1/auth/session", () =>
          HttpResponse.json(
            { data: null, meta: { stage: "anonymous" } },
            { headers: { "Content-Type": mediaType } },
          ),
        ),
        http.post("/api/v1/auth/login", ({ request }) => {
          posts++;
          fresh = request.headers.get("X-CSRF-Token") === token;
          return restrictedSession();
        }),
      );
      const controller = new SessionController();
      controller.start();
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("Signed out"),
      );
      const original = Object.getOwnPropertyDescriptor(navigator, "locks");
      Object.defineProperty(navigator, "locks", {
        configurable: true,
        value: {
          request: async (
            _name: string,
            _options: unknown,
            action: () => Promise<void>,
          ) => {
            await pending;
            return action();
          },
        },
      });
      const peer = new TestBroadcastChannel("mia-security-v1");
      try {
        document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
        const work = controller.login("example", crypto.randomUUID());
        document.cookie = `mia_csrf=${token}; Path=/`;
        if (superseded)
          peer.postMessage({
            version: 1,
            kind: "security-epoch",
            eventNonce: crypto.randomUUID(),
          });
        release?.();
        await work;
        expect(posts).toBe(superseded ? 0 : 1);
        expect(fresh).toBe(!superseded);
        expect(controller.getSnapshot().kind).toBe(
          superseded ? "Restricted expired" : "MFA required",
        );
      } finally {
        if (original) Object.defineProperty(navigator, "locks", original);
        else Reflect.deleteProperty(navigator, "locks");
        controller.stop();
        peer.close();
      }
    },
  );

  it("recovers an ambiguous login to an authoritative restricted stage without another mutation", async () => {
    let reads = 0;
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return reads === 1
          ? HttpResponse.json(
              { data: null, meta: { stage: "anonymous" } },
              { headers: { "Content-Type": mediaType } },
            )
          : restrictedSession();
      }),
      http.post("/api/v1/auth/login", () => {
        posts++;
        return HttpResponse.error();
      }),
    );
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Signed out"),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    await controller.login("example", crypto.randomUUID());
    expect(controller.getSnapshot().kind).toBe("MFA required");
    expect({ reads, posts }).toEqual({ reads: 2, posts: 1 });
    controller.stop();
  });
  it("serializes login and uses the CSRF cookie current at dispatch with direct restricted routing", async () => {
    let posts = 0;
    let reads = 0;
    let fresh = false;
    const token = crypto.randomUUID();
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return HttpResponse.json(
          { data: null, meta: { stage: "anonymous" } },
          { headers: { "Content-Type": mediaType } },
        );
      }),
      http.post("/api/v1/auth/login", ({ request }) => {
        posts++;
        fresh = request.headers.get("X-CSRF-Token") === token;
        return restrictedSession();
      }),
    );
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Signed out"),
    );
    document.cookie = `mia_csrf=${token}; Path=/`;
    const first = controller.login("example", crypto.randomUUID());
    await controller.login("example", crypto.randomUUID());
    await first;
    expect(controller.getSnapshot().kind).toBe("MFA required");
    expect({ posts, reads, fresh }).toEqual({
      posts: 1,
      reads: 1,
      fresh: true,
    });
    controller.stop();
  });

  it.each(["network", "malformed", "internal"])(
    "reconciles %s ambiguity once and requires explicit safe recheck after discovery failure",
    async (failure) => {
      let reads = 0;
      let posts = 0;
      server.use(
        http.get("/api/v1/auth/session", () => {
          reads++;
          return reads === 2
            ? HttpResponse.error()
            : HttpResponse.json(
                { data: null, meta: { stage: "anonymous" } },
                { headers: { "Content-Type": mediaType } },
              );
        }),
        http.post("/api/v1/auth/login", () => {
          posts++;
          return failure === "network"
            ? HttpResponse.error()
            : new HttpResponse("unconfirmed", {
                status: failure === "internal" ? 500 : 200,
              });
        }),
      );
      const controller = new SessionController();
      controller.start();
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("Signed out"),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      await controller.login("example", crypto.randomUUID());
      expect(controller.getSnapshot()).toMatchObject({
        kind: "Rotating",
        phase: "reconciliation failed",
      });
      await controller.login("example", crypto.randomUUID());
      expect({ reads, posts }).toEqual({ reads: 2, posts: 1 });
      await controller.recheckLogin();
      expect(controller.getSnapshot().kind).toBe("Signed out");
      expect({ reads, posts }).toEqual({ reads: 3, posts: 1 });
      controller.stop();
    },
  );

  it("fences admitted login when a peer starts logout and does not discover or reveal after late success", async () => {
    vi.stubGlobal(
      "BroadcastChannel",
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let posts = 0;
    let reads = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return HttpResponse.json(
          { data: null, meta: { stage: "anonymous" } },
          { headers: { "Content-Type": mediaType } },
        );
      }),
      http.post("/api/v1/auth/login", async () => {
        posts++;
        await pending;
        return restrictedSession();
      }),
    );
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Signed out"),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const work = controller.login("example", crypto.randomUUID());
    await waitFor(() => expect(posts).toBe(1));
    const peer = new TestBroadcastChannel("mia-security-v1");
    const logoutNonce = crypto.randomUUID();
    peer.postMessage({
      version: 1,
      kind: "logout-start",
      eventNonce: crypto.randomUUID(),
      logoutNonce,
    });
    expect(controller.getSnapshot().kind).toBe("Logout quiescing");
    release?.();
    await work;
    peer.postMessage({
      version: 1,
      kind: "logout-confirmed",
      eventNonce: crypto.randomUUID(),
      logoutNonce,
    });
    expect(controller.getSnapshot().kind).toBe("Logout reconciliation needed");
    expect({ posts, reads }).toEqual({ posts: 1, reads: 1 });
    controller.stop();
    peer.close();
  });
  it("restarts cleanly after React Strict Mode effect cleanup", async () => {
    server.use(
      http.get("/api/v1/auth/session", () =>
        HttpResponse.json(
          { data: null, meta: { stage: "anonymous" } },
          { headers: { "Content-Type": mediaType } },
        ),
      ),
    );
    const controller = new SessionController();

    controller.start();
    controller.stop();
    controller.start();

    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Signed out"),
    );
    controller.stop();
  });

  it("shields a receiving tab and requires its independent confirmation", async () => {
    vi.stubGlobal(
      "BroadcastChannel",
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    let discoveryCount = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        discoveryCount += 1;
        return discoveryCount <= 2
          ? restrictedSession()
          : HttpResponse.json(
              { data: null, meta: { stage: "anonymous" } },
              { headers: { "Content-Type": mediaType } },
            );
      }),
      http.post(
        "/api/v1/auth/logout",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const initiatingTab = new SessionController();
    const receivingTab = new SessionController();
    initiatingTab.start();
    receivingTab.start();
    await waitFor(() => {
      expect(initiatingTab.getSnapshot().kind).toBe("MFA required");
      expect(receivingTab.getSnapshot().kind).toBe("MFA required");
    });

    initiatingTab.beginRestrictedLogout();

    expect(receivingTab.getSnapshot().kind).toBe("Logout quiescing");
    await waitFor(() => {
      expect(initiatingTab.getSnapshot().kind).toBe("Logout confirmed");
      expect(receivingTab.getSnapshot().kind).toBe(
        "Logout reconciliation needed",
      );
    });
    expect(discoveryCount).toBe(3);

    initiatingTab.stop();
    receivingTab.stop();
  });

  it("treats malformed cross-tab messages as a reason to keep content shielded", async () => {
    vi.stubGlobal(
      "BroadcastChannel",
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    server.use(http.get("/api/v1/auth/session", () => restrictedSession()));
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("MFA required"),
    );
    const attacker = new TestBroadcastChannel("mia-security-v1");

    attacker.postMessage({ kind: "logout-confirmed", accountId: "private" });

    expect(controller.getSnapshot().kind).toBe("Logout reconciliation needed");
    controller.stop();
    attacker.close();
  });

  it("retains an active logout result for explicit reconciliation after a late transition", async () => {
    vi.stubGlobal(
      "BroadcastChannel",
      TestBroadcastChannel as unknown as typeof BroadcastChannel,
    );
    let discoveryCount = 0;
    let logoutCount = 0;
    let releaseLogout: (() => void) | undefined;
    const logoutReleased = new Promise<void>((resolve) => {
      releaseLogout = resolve;
    });
    server.use(
      http.get("/api/v1/auth/session", () => {
        discoveryCount += 1;
        return discoveryCount === 1
          ? restrictedSession()
          : HttpResponse.json(
              { data: null, meta: { stage: "anonymous" } },
              { headers: { "Content-Type": mediaType } },
            );
      }),
      http.post("/api/v1/auth/logout", async () => {
        logoutCount += 1;
        await logoutReleased;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("MFA required"),
    );
    const peer = new TestBroadcastChannel("mia-security-v1");

    controller.beginRestrictedLogout();
    await waitFor(() => expect(logoutCount).toBe(1));
    peer.postMessage({
      version: 1,
      kind: "security-epoch",
      eventNonce: crypto.randomUUID(),
    });
    expect(controller.getSnapshot().kind).toBe("Logout dispatch");
    if (releaseLogout === undefined) {
      throw new Error("The logout request did not start.");
    }
    releaseLogout();

    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe(
        "Logout reconciliation needed",
      ),
    );
    expect(discoveryCount).toBe(1);

    controller.refreshLogoutStatus();

    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Logout confirmed"),
    );
    expect(discoveryCount).toBe(2);
    expect(logoutCount).toBe(1);
    controller.stop();
    peer.close();
  });
});

function stageSession(
  stage: "password-change" | "authenticated",
  accountId = "account-id",
) {
  return HttpResponse.json(
    {
      data: {
        type: "auth-sessions",
        id: accountId,
        attributes: {
          stage,
          idle_expires_at: "2026-10-01T10:30:00.000000Z",
          absolute_expires_at: "2026-10-01T22:00:00.000000Z",
        },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}

function capabilitiesFor(accountId = "account-id") {
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
          capabilities: actions.map((action) => ({
            action,
            available: false,
            scope: {
              global: false,
              course_ids: [],
              student_ids: [],
              course_students: [],
              own_resource: false,
            },
          })),
        },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}

function errorDocument(status: number, code: string, retryAfter?: string) {
  return HttpResponse.json(
    { errors: [{ status: String(status), code }] },
    {
      status,
      headers: {
        "Content-Type": mediaType,
        ...(retryAfter === undefined ? {} : { "Retry-After": retryAfter }),
      },
    },
  );
}

async function startInPasswordChange(controller: SessionController) {
  document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
  controller.start();
  await waitFor(() =>
    expect(controller.getSnapshot().kind).toBe("Password change"),
  );
}

describe("SessionController required password replacement", () => {
  it("dispatches once with current CSRF and chains directly to the capability gate", async () => {
    const controller = new SessionController();
    const password = crypto.randomUUID();
    let reads = 0;
    let posts = 0;
    let capabilities = 0;
    let csrfAtDispatch: string | null = null;
    let currentCsrf = "";
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return stageSession("password-change");
      }),
      http.post("/api/v1/auth/password-changes", ({ request }) => {
        posts++;
        csrfAtDispatch = request.headers.get("X-CSRF-Token");
        return stageSession("authenticated");
      }),
      http.get("/api/v1/users/me/capabilities", () => {
        capabilities++;
        return capabilitiesFor();
      }),
    );
    await startInPasswordChange(controller);
    // A rotated cookie written after discovery must be the one sent.
    currentCsrf = crypto.randomUUID();
    document.cookie = `mia_csrf=${currentCsrf}; Path=/`;
    const states: string[] = [];
    controller.subscribe(() => states.push(controller.getSnapshot().kind));

    await controller.submitPasswordChange(password, password);

    expect(controller.getSnapshot().kind).toBe("Authenticated");
    expect(states).toEqual(["Rotating", "Access checking", "Authenticated"]);
    expect(csrfAtDispatch === currentCsrf).toBe(true);
    expect({ reads, posts, capabilities }).toEqual({
      reads: 1,
      posts: 1,
      capabilities: 1,
    });
    controller.stop();
  });

  it.each([
    [422, "auth_invalid_password", "rejected"],
    [429, "rate_limited", "throttled"],
    [400, "malformed_request", "failed"],
    [415, "unsupported_media_type", "failed"],
  ] as const)(
    "keeps definitive HTTP %s %s in the form without replay or discovery",
    async (status, code, outcome) => {
      const controller = new SessionController();
      let reads = 0;
      let posts = 0;
      server.use(
        http.get("/api/v1/auth/session", () => {
          reads++;
          return stageSession("password-change");
        }),
        http.post("/api/v1/auth/password-changes", () => {
          posts++;
          return errorDocument(status, code, "17");
        }),
      );
      await startInPasswordChange(controller);
      const password = crypto.randomUUID();

      await controller.submitPasswordChange(password, password);

      expect(controller.getSnapshot()).toMatchObject({
        kind: "Password change",
        accountId: "account-id",
        outcome: { kind: outcome },
      });
      expect({ reads, posts }).toEqual({ reads: 1, posts: 1 });
      controller.stop();
    },
  );

  it.each([
    ["anonymous", "Signed out"],
    ["password-change", "Password change"],
    ["authenticated", "Authenticated"],
  ] as const)(
    "rediscovers the actual stage after auth_password_change_required (%s)",
    async (recovered, expected) => {
      const controller = new SessionController();
      let reads = 0;
      let posts = 0;
      server.use(
        http.get("/api/v1/auth/session", () => {
          reads++;
          if (reads === 1) return stageSession("password-change");
          return recovered === "anonymous"
            ? anonymousSession()
            : stageSession(recovered);
        }),
        http.post("/api/v1/auth/password-changes", () => {
          posts++;
          return errorDocument(403, "auth_password_change_required");
        }),
        http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      );
      await startInPasswordChange(controller);
      const password = crypto.randomUUID();

      await controller.submitPasswordChange(password, password);

      await waitFor(() => expect(controller.getSnapshot().kind).toBe(expected));
      if (recovered === "password-change")
        expect(controller.getSnapshot()).toMatchObject({
          outcome: { kind: "unconfirmed" },
        });
      expect({ reads, posts }).toEqual({ reads: 2, posts: 1 });
      controller.stop();
    },
  );

  it.each(["transport", "500", "503", "csrf_invalid", "malformed"] as const)(
    "treats %s as an unclear outcome reconciled only by discovery",
    async (failure) => {
      const controller = new SessionController();
      let reads = 0;
      let posts = 0;
      server.use(
        http.get("/api/v1/auth/session", () => {
          reads++;
          return stageSession("password-change");
        }),
        http.post("/api/v1/auth/password-changes", () => {
          posts++;
          switch (failure) {
            case "transport":
              return HttpResponse.error();
            case "500":
            case "503":
              return new HttpResponse("controlled", {
                status: Number(failure),
              });
            case "csrf_invalid":
              return errorDocument(403, "csrf_invalid");
            case "malformed":
              return HttpResponse.json(
                { data: null, meta: { stage: "anonymous" } },
                { headers: { "Content-Type": mediaType } },
              );
          }
        }),
      );
      await startInPasswordChange(controller);
      const states: string[] = [];
      controller.subscribe(() => {
        const state = controller.getSnapshot();
        states.push(
          state.kind === "Rotating" ? `Rotating:${state.phase}` : state.kind,
        );
      });
      const password = crypto.randomUUID();

      await controller.submitPasswordChange(password, password);

      expect(states).toEqual([
        "Rotating:submitting",
        "Rotating:reconciling",
        "Password change",
      ]);
      expect(controller.getSnapshot()).toMatchObject({
        kind: "Password change",
        outcome: { kind: "unconfirmed" },
      });
      expect({ reads, posts }).toEqual({ reads: 2, posts: 1 });
      controller.stop();
    },
  );

  it("permits only an explicit safe recheck after failed reconciliation", async () => {
    const controller = new SessionController();
    let reads = 0;
    let posts = 0;
    let capabilities = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        if (reads === 1) return stageSession("password-change");
        if (reads === 2) return HttpResponse.error();
        return stageSession("authenticated");
      }),
      http.post("/api/v1/auth/password-changes", () => {
        posts++;
        return HttpResponse.error();
      }),
      http.get("/api/v1/users/me/capabilities", () => {
        capabilities++;
        return capabilitiesFor();
      }),
    );
    await startInPasswordChange(controller);
    const password = crypto.randomUUID();

    await controller.submitPasswordChange(password, password);
    expect(controller.getSnapshot()).toMatchObject({
      kind: "Rotating",
      origin: "password-change",
      phase: "reconciliation failed",
    });
    await controller.submitPasswordChange(password, password);
    expect({ reads, posts }).toEqual({ reads: 2, posts: 1 });

    await controller.recheckPasswordChange();

    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    expect({ reads, posts, capabilities }).toEqual({
      reads: 3,
      posts: 1,
      capabilities: 1,
    });
    controller.stop();
  });

  it("rebinds the stage to a replacement account found by discovery", async () => {
    const controller = new SessionController();
    let reads = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return stageSession(
          "password-change",
          reads === 1 ? "account-id" : "other-account",
        );
      }),
      http.post("/api/v1/auth/password-changes", () => HttpResponse.error()),
    );
    await startInPasswordChange(controller);
    const password = crypto.randomUUID();

    await controller.submitPasswordChange(password, password);

    const state = controller.getSnapshot();
    expect(state).toMatchObject({
      kind: "Password change",
      accountId: "other-account",
    });
    expect("outcome" in state).toBe(false);
    controller.stop();
  });

  it("quiesces an admitted replacement before restricted logout and fences its late result", async () => {
    const controller = new SessionController();
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let posts = 0;
    let logoutPosts = 0;
    let capabilities = 0;
    server.use(
      http.get("/api/v1/auth/session", () => stageSession("password-change")),
      http.post("/api/v1/auth/password-changes", async () => {
        posts++;
        await pending;
        return stageSession("authenticated");
      }),
      http.post("/api/v1/auth/logout", () => {
        logoutPosts++;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get("/api/v1/users/me/capabilities", () => {
        capabilities++;
        return capabilitiesFor();
      }),
    );
    await startInPasswordChange(controller);
    const password = crypto.randomUUID();
    const transition = controller.submitPasswordChange(password, password);
    await waitFor(() => expect(posts).toBe(1));

    controller.beginRestrictedLogout();
    expect(controller.getSnapshot().kind).toBe("Logout quiescing");
    expect(logoutPosts).toBe(0);
    release();
    await transition;
    await waitFor(() => expect(logoutPosts).toBe(1));
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe(
        "Logout reconciliation needed",
      ),
    );
    expect({ posts, capabilities }).toEqual({ posts: 1, capabilities: 0 });
    controller.stop();
  });

  it("serializes two tabs and never sends a queued replacement after the stage changed", async () => {
    const first = new SessionController();
    const second = new SessionController();
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let replaced = false;
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () =>
        stageSession(replaced ? "authenticated" : "password-change"),
      ),
      http.post("/api/v1/auth/password-changes", async () => {
        posts++;
        await pending;
        replaced = true;
        return stageSession("authenticated");
      }),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    first.start();
    second.start();
    await waitFor(() =>
      expect([first.getSnapshot().kind, second.getSnapshot().kind]).toEqual([
        "Password change",
        "Password change",
      ]),
    );
    const firstPassword = crypto.randomUUID();
    const secondPassword = crypto.randomUUID();
    const firstWork = first.submitPasswordChange(firstPassword, firstPassword);
    await waitFor(() => expect(posts).toBe(1));
    const queuedWork = second.submitPasswordChange(
      secondPassword,
      secondPassword,
    );
    release();
    await Promise.all([firstWork, queuedWork]);

    expect(posts).toBe(1);
    await waitFor(() =>
      expect([first.getSnapshot().kind, second.getSnapshot().kind]).toEqual([
        "Authenticated",
        "Authenticated",
      ]),
    );
    first.stop();
    second.stop();
  });

  it("dispatches nothing without a readable CSRF cookie", async () => {
    const controller = new SessionController();
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () => stageSession("password-change")),
      http.post("/api/v1/auth/password-changes", () => {
        posts++;
        return stageSession("authenticated");
      }),
    );
    await startInPasswordChange(controller);
    document.cookie = "mia_csrf=; Max-Age=0; Path=/";
    const password = crypto.randomUUID();

    await controller.submitPasswordChange(password, password);

    expect(posts).toBe(0);
    expect(controller.getSnapshot()).toMatchObject({
      kind: "Rotating",
      origin: "password-change",
      phase: "reconciliation failed",
    });
    controller.stop();
  });
});
