import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installTestOriginLocks } from "../../../test/originLocks";
import { server } from "../../../test/server";
import { captureInvitationLink } from "./invitationLink";
import { capturePasswordResetLink } from "./passwordResetLink";
import { SessionController } from "./sessionController";
import { MaterialUpload } from "../transfer/materialUpload";
import { ApiHttpError } from "../api/client";
import { courseUnitFixture } from "../../../test/courseUnitFixture";
import {
  authenticatedSessionResponse,
  ownProfileCapabilities,
  mfaErrorResponse,
} from "../../../test/mfaFixtures";

const mediaType = "application/vnd.api+json";
it("material CSRF rejection destroys authenticated work and only explicit recovery restores admission", async () => {
  const fixture = courseUnitFixture();
  document.cookie = `mia_csrf=${fixture.csrf}; Path=/; SameSite=Strict`;
  const reads: string[] = [];
  server.use(
    http.get("/api/v1/auth/session", () => {
      reads.push("session");
      return authenticatedSessionResponse();
    }),
    http.get("/api/v1/users/me/capabilities", () => {
      reads.push("capabilities");
      return ownProfileCapabilities();
    }),
  );
  const controller = new SessionController();
  controller.start();
  let teardown = 0;
  const unregister = controller.registerSecurityTeardown((scope) => {
    if (scope === "destroy") teardown++;
  });
  try {
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    teardown = 0;
    const before = reads.length;
    let sends = 0;
    const result = await controller.runAuthenticatedMutation(
      {
        send: async (csrf) => {
          sends++;
          expect(csrf === fixture.csrf).toBe(true);
          throw new ApiHttpError({
            status: 403,
            body: JSON.stringify({
              errors: [{ code: "csrf_invalid", detail: fixture.rawError }],
            }),
          });
        },
      },
      () => true,
    );
    const next = await controller.runAuthenticatedMutation(
      {
        send: async () => {
          sends++;
          return true;
        },
      },
      () => true,
    );
    controller.observeLifecycle();
    expect(
      result.kind === "superseded" &&
        next.kind === "superseded" &&
        controller.getSnapshot().kind === "Privacy shield" &&
        teardown === 1 &&
        sends === 1 &&
        reads.length === before,
    ).toBe(true);
    await controller.refreshSession();
    expect(
      controller.getSnapshot().kind === "Authenticated" &&
        reads.slice(before).join() === "session,capabilities" &&
        sends === 1,
    ).toBe(true);
  } finally {
    unregister();
    controller.stop();
  }
});
it("material route references clear synchronously before protected purge without renewing sign-in", async () => {
  let reads = 0;
  server.use(
    http.get("/api/v1/auth/session", () => {
      reads++;
      return authenticatedSessionResponse();
    }),
    http.get("/api/v1/users/me/capabilities", () => ownProfileCapabilities()),
  );
  const controller = new SessionController();
  const transfer = new MaterialUpload(controller);
  const order: string[] = [];
  const unregister = controller.registerSecurityTeardown(() =>
    transfer.destroy(),
  );
  let unregisterRoute: () => void = () => undefined;
  const unregisterPurge = controller.registerSecurityTeardown(() =>
    order.push("purged"),
  );
  controller.start();
  try {
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    order.length = 0;
    unregisterRoute = transfer.registerRouteTeardown(() =>
      order.push("route-cleared"),
    );
    const before = reads;
    controller.observeLifecycle();
    expect(order).toEqual(["route-cleared", "purged"]);
    expect(
      reads === before && controller.getSnapshot().kind === "Privacy shield",
    ).toBe(true);
  } finally {
    unregisterRoute();
    unregister();
    unregisterPurge();
    controller.stop();
  }
});

describe("deliberate route admission", () => {
  it.each(["courses.supervise", "learning.participate"])(
    "fences pending course reads and replaces %s scope on fresh admission",
    async (grant) => {
      let scope = ["assigned_1"];
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
      server.use(
        http.get("/api/v1/auth/session", () => authenticatedSessionResponse()),
        http.get("/api/v1/users/me/capabilities", () =>
          HttpResponse.json(
            {
              data: {
                type: "account-capabilities",
                id: "account-id",
                attributes: {
                  capabilities: actions.map((action) => ({
                    action,
                    available: action === grant,
                    scope: {
                      global: false,
                      own_resource: false,
                      course_ids: action === grant ? scope : [],
                      student_ids: [],
                      course_students: [],
                    },
                  })),
                },
              },
            },
            { headers: { "Content-Type": mediaType } },
          ),
        ),
      );
      const controller = new SessionController();
      const gate = lifecycleGate();
      controller.start();
      try {
        await waitFor(() =>
          expect(controller.getSnapshot().kind).toBe("Authenticated"),
        );
        expect(
          grant === "courses.supervise"
            ? controller.getAuthenticatedAccess()?.supervisedCourseIds
            : controller.getAuthenticatedAccess()?.joinedCourseIds,
        ).toEqual(["assigned_1"]);
        const pending = controller.readAuthenticated(async () => {
          await gate.promise;
          return true;
        });
        scope = ["assigned_2"];
        await controller.checkRouteAdmission();
        gate.resolve();
        expect((await pending).kind).toBe("superseded");
        expect(
          grant === "courses.supervise"
            ? controller.getAuthenticatedAccess()?.supervisedCourseIds
            : controller.getAuthenticatedAccess()?.joinedCourseIds,
        ).toEqual(["assigned_2"]);
      } finally {
        gate.resolve();
        controller.stop();
      }
    },
  );
  it.each([
    ["anonymous", anonymousSession, "Signed out"],
    ["mfa", restrictedSession, "MFA required"],
    [
      "password-change",
      () => stageSession("password-change"),
      "Password change",
    ],
  ] as const)(
    "a new %s result destroys the old authority without another capability read",
    async (_, response, state) => {
      let changed = false;
      let capabilities = 0;
      server.use(
        http.get("/api/v1/auth/session", () =>
          changed ? response() : authenticatedSessionResponse(),
        ),
        http.get("/api/v1/users/me/capabilities", () => {
          capabilities++;
          return ownProfileCapabilities();
        }),
      );
      const controller = new SessionController();
      controller.start();
      try {
        await waitFor(() =>
          expect(controller.getSnapshot().kind).toBe("Authenticated"),
        );
        changed = true;
        await controller.checkRouteAdmission();
        expect(controller.getSnapshot().kind).toBe(state);
        expect(controller.getAuthenticatedAccess()).toBeNull();
        expect(capabilities).toBe(1);
      } finally {
        controller.stop();
      }
    },
  );

  it("rechecks in order and fences a superseded discovery without unsafe dispatch", async () => {
    const ledger: string[] = [];
    const gate = lifecycleGate();
    let held = false;
    server.use(
      http.get("/api/v1/auth/session", async () => {
        ledger.push("session");
        if (held) await gate.promise;
        return authenticatedSessionResponse();
      }),
      http.get("/api/v1/users/me/capabilities", () => {
        ledger.push("capabilities");
        return ownProfileCapabilities();
      }),
    );
    const controller = new SessionController();
    controller.start();
    try {
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("Authenticated"),
      );
      held = true;
      const old = controller.checkRouteAdmission();
      await waitFor(() => expect(ledger).toHaveLength(3));
      held = false;
      await controller.checkRouteAdmission();
      gate.resolve();
      await old;
      expect(ledger).toEqual([
        "session",
        "capabilities",
        "session",
        "session",
        "capabilities",
      ]);
      expect(controller.getSnapshot().kind).toBe("Authenticated");
    } finally {
      controller.stop();
    }
  });

  it("destroys held state on current scope loss and on a failed new capability gate", async () => {
    let own = true;
    let fail = false;
    server.use(
      http.get("/api/v1/auth/session", () => authenticatedSessionResponse()),
      http.get("/api/v1/users/me/capabilities", () =>
        fail
          ? mfaErrorResponse(503, "unavailable")
          : ownProfileCapabilities("account-id", own),
      ),
    );
    const controller = new SessionController();
    const scopes: string[] = [];
    controller.registerSecurityTeardown((scope) => scopes.push(scope));
    controller.start();
    try {
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("Authenticated"),
      );
      own = false;
      await controller.checkRouteAdmission();
      expect(controller.getAuthenticatedAccess()?.ownProfileView).toBe(false);
      expect(scopes).toEqual(["destroy"]);
      fail = true;
      await controller.checkRouteAdmission();
      expect(controller.getSnapshot()).toMatchObject({
        kind: "Access checking",
        phase: "failed",
      });
      expect(scopes).toEqual(["destroy", "destroy"]);
      fail = false;
      await controller.checkRouteAdmission();
      expect(controller.getSnapshot().kind).toBe("Authenticated");
    } finally {
      controller.stop();
    }
  });

  it("cannot auto-release a lifecycle shield or move a server-authored deadline", async () => {
    let discoveries = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        discoveries++;
        return authenticatedSessionResponse();
      }),
      http.get("/api/v1/users/me/capabilities", () => ownProfileCapabilities()),
    );
    const controller = new SessionController();
    controller.start();
    try {
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("Authenticated"),
      );
      await controller.checkRouteAdmission();
      expect(discoveries).toBe(2);
      controller.observeLifecycle();
      await controller.checkRouteAdmission();
      expect(discoveries).toBe(2);
      expect(controller.getSnapshot().kind).toBe("Privacy shield");
      await controller.refreshSession();
      expect(discoveries).toBe(3);
      vi.setSystemTime(new Date("2026-09-27T10:30:00.000Z"));
      await controller.checkRouteAdmission();
      expect(discoveries).toBe(3);
      expect(controller.getSnapshot()).toMatchObject({
        kind: "Privacy shield",
        reason: "deadline",
      });
    } finally {
      controller.stop();
    }
  });
});

function lifecycleGate() {
  const pending: { release?: () => void } = {};
  const promise = new Promise<void>((resolve) => {
    pending.release = resolve;
  });
  return {
    promise,
    resolve: () => {
      if (!pending.release)
        throw new Error("Missing lifecycle fixture release");
      pending.release();
    },
  };
}

function deadlineSession(
  idle: number,
  absolute: number,
  stage = "authenticated",
  accountId = "account-id",
) {
  const instant = (value: number) =>
    new Date(value).toISOString().replace("Z", "000Z");
  return HttpResponse.json(
    {
      data: {
        type: "auth-sessions",
        id: accountId,
        attributes: {
          stage,
          idle_expires_at: instant(idle),
          absolute_expires_at: instant(absolute),
        },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}

describe("authoritative session lifecycle", () => {
  it("recovery with authenticated discovery and failed capabilities remains pending behind the shield", async () => {
    const now = Date.now();
    let failCapabilities = false;
    server.use(
      http.get("/api/v1/auth/session", () =>
        deadlineSession(now + 4 * 60_000, now + 60 * 60_000),
      ),
      http.get("/api/v1/users/me/capabilities", () =>
        failCapabilities
          ? errorDocument(503, "unavailable")
          : capabilitiesFor(),
      ),
    );
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    controller.shield();
    failCapabilities = true;
    await controller.refreshSession();
    expect(controller.getSnapshot()).toMatchObject({
      kind: "Privacy shield",
      phase: "pending",
      reason: "recovery failed",
    });
    controller.stop();
  });

  it("absolute-governed warnings cannot dispatch continuation", async () => {
    const now = Date.now();
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () =>
        deadlineSession(now + 4 * 60_000, now + 4 * 60_000),
      ),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      http.post("/api/v1/auth/session-continuations", () => {
        posts++;
        return deadlineSession(now + 4 * 60_000, now + 4 * 60_000);
      }),
    );
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot()).toMatchObject({
        kind: "Authenticated",
        lifecycle: "Warning due",
        absoluteWarning: true,
      }),
    );
    await controller.continueWorking();
    expect(posts).toBe(0);
    controller.stop();
  });

  it("a receiving authenticated tab retries unconfirmed logout with authenticated discovery", async () => {
    vi.stubGlobal("BroadcastChannel", TestBroadcastChannel);
    const now = Date.now();
    let posts = 0;
    let anonymous = false;
    server.use(
      http.get("/api/v1/auth/session", () =>
        anonymous
          ? anonymousSession()
          : deadlineSession(now + 30 * 60_000, now + 60 * 60_000),
      ),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      http.post("/api/v1/auth/logout", () => {
        posts++;
        if (posts === 1) return errorDocument(503, "unavailable");
        anonymous = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const initiator = new SessionController();
    const receiver = new SessionController();
    initiator.start();
    receiver.start();
    await waitFor(() =>
      expect([
        initiator.getSnapshot().kind,
        receiver.getSnapshot().kind,
      ]).toEqual(["Authenticated", "Authenticated"]),
    );
    initiator.beginAuthenticatedLogout();
    await waitFor(() =>
      expect(receiver.getSnapshot().kind).toBe("Logout unconfirmed"),
    );
    expect(posts).toBe(1);
    receiver.retryRestrictedLogout();
    await waitFor(() =>
      expect(receiver.getSnapshot().kind).toBe("Logout confirmed"),
    );
    expect(posts).toBe(2);
    initiator.stop();
    receiver.stop();
  });

  it("shield during delayed logout does not fence confirmation", async () => {
    const now = Date.now();
    const gate = lifecycleGate();
    let posts = 0;
    let anonymous = false;
    server.use(
      http.get("/api/v1/auth/session", () =>
        anonymous
          ? anonymousSession()
          : deadlineSession(now + 30 * 60_000, now + 60 * 60_000),
      ),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      http.post("/api/v1/auth/logout", async () => {
        posts++;
        await gate.promise;
        anonymous = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    controller.beginAuthenticatedLogout();
    await waitFor(() => expect(posts).toBe(1));
    controller.shield();
    expect(controller.getSnapshot().kind).toBe("Logout dispatch");
    gate.resolve();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Logout confirmed"),
    );
    controller.stop();
  });

  it("retains a proven not-sent warning and admits only an explicit retry with fresh CSRF", async () => {
    const now = Date.now();
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () =>
        deadlineSession(now + 4 * 60_000, now + 60 * 60_000),
      ),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      http.post("/api/v1/auth/session-continuations", () => {
        posts++;
        return deadlineSession(now + 30 * 60_000, now + 60 * 60_000);
      }),
    );
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    document.cookie = "mia_csrf=; Max-Age=0; Path=/";
    await controller.continueWorking();
    expect(controller.getSnapshot()).toMatchObject({
      kind: "Authenticated",
      lifecycle: "Continue retryable",
      error: { kind: "protocol" },
    });
    expect(posts).toBe(0);
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    await controller.continueWorking();
    expect(controller.getSnapshot()).toEqual({ kind: "Authenticated" });
    expect(posts).toBe(1);
    controller.stop();
  });

  it.each(["queued", "dispatched"])(
    "Stop waiting fences a %s continuation without bypassing logout quiescence",
    async (phase) => {
      const now = Date.now();
      const gate = lifecycleGate();
      let posts = 0;
      let logouts = 0;
      let anonymous = false;
      server.use(
        http.get("/api/v1/auth/session", () =>
          anonymous
            ? anonymousSession()
            : deadlineSession(now + 4 * 60_000, now + 60 * 60_000),
        ),
        http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
        http.post("/api/v1/auth/session-continuations", async () => {
          posts++;
          await gate.promise;
          return deadlineSession(now + 30 * 60_000, now + 60 * 60_000);
        }),
        http.post("/api/v1/auth/logout", () => {
          logouts++;
          anonymous = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const controller = new SessionController();
      controller.start();
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("Authenticated"),
      );
      const lease =
        phase === "queued"
          ? navigator.locks.request(
              "mia-authenticated-requests-v1",
              { mode: "exclusive" },
              () => gate.promise,
            )
          : Promise.resolve();
      const continuation = controller.continueWorking();
      if (phase === "dispatched") await waitFor(() => expect(posts).toBe(1));
      controller.stopLifecycleWaiting();
      expect(controller.getSnapshot()).toMatchObject({
        kind: "Privacy shield",
        reason: "continuation unknown",
      });
      await controller.continueWorking();
      controller.beginAuthenticatedLogout();
      expect(controller.getSnapshot().kind).toBe("Logout quiescing");
      expect(logouts).toBe(0);
      gate.resolve();
      await lease;
      await continuation;
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("Logout confirmed"),
      );
      expect({ posts, logouts }).toEqual({
        posts: phase === "queued" ? 0 : 1,
        logouts: 1,
      });
      controller.stop();
    },
  );

  it.each(["session", "capabilities"])(
    "Stop waiting fences late %s recovery results",
    async (pending) => {
      const now = Date.now();
      const gate = lifecycleGate();
      let recovering = false;
      let waiting = false;
      server.use(
        http.get("/api/v1/auth/session", async () => {
          if (recovering && pending === "session") {
            waiting = true;
            await gate.promise;
          }
          return deadlineSession(now + 4 * 60_000, now + 60 * 60_000);
        }),
        http.get("/api/v1/users/me/capabilities", async () => {
          if (recovering && pending === "capabilities") {
            waiting = true;
            await gate.promise;
          }
          return capabilitiesFor();
        }),
      );
      const controller = new SessionController();
      controller.start();
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("Authenticated"),
      );
      controller.shield();
      recovering = true;
      const recovery = controller.refreshSession();
      await waitFor(() => expect(waiting).toBe(true));
      expect(controller.getSnapshot()).toMatchObject({
        kind: "Privacy shield",
        phase: "checking",
      });
      controller.stopLifecycleWaiting();
      gate.resolve();
      await recovery;
      expect(controller.getSnapshot()).toMatchObject({
        kind: "Privacy shield",
        phase: "pending",
        reason: "stopped",
      });
      controller.stop();
    },
  );

  it("cumulative monotonic elapsed time prevents incremental backward wall adjustments extending the deadline", async () => {
    const now = Date.now();
    server.use(
      http.get("/api/v1/auth/session", () =>
        deadlineSession(now + 10_000, now + 60_000),
      ),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
    );
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    vi.useFakeTimers({
      toFake: ["Date", "performance", "setTimeout", "clearTimeout"],
    });
    controller.shield();
    await controller.refreshSession();
    for (let step = 0; step < 10; step++) {
      // The next sampled wall clock still advances by 500ms; successive wall
      // comparisons alone miss the cumulative rollback of five seconds.
      vi.setSystemTime(Date.now() - 500);
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(Date.now()).toBe(now + 5000);
    expect(controller.getSnapshot()).toMatchObject({
      kind: "Privacy shield",
      reason: "deadline",
    });
    // Even explicit discovery of the same deadline cannot forget already
    // observed elapsed time while the wall clock remains behind.
    await controller.refreshSession();
    expect(controller.getSnapshot()).toMatchObject({
      kind: "Privacy shield",
      reason: "deadline",
    });
    controller.stop();
  });

  it.each(["auth_password_change_required", "csrf_invalid"])(
    "denial %s shields until explicit authoritative reconciliation",
    async (code) => {
      const now = Date.now();
      let reads = 0;
      let posts = 0;
      server.use(
        http.get("/api/v1/auth/session", () => {
          reads++;
          return deadlineSession(now + 4 * 60_000, now + 60 * 60_000);
        }),
        http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
        http.post("/api/v1/auth/session-continuations", () => {
          posts++;
          return errorDocument(403, code);
        }),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const controller = new SessionController();
      controller.start();
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("Authenticated"),
      );
      await controller.continueWorking();
      expect(controller.getSnapshot()).toMatchObject({
        kind: "Privacy shield",
        reason: "continuation denied",
      });
      expect({ reads, posts }).toEqual({ reads: 1, posts: 1 });
      await controller.refreshSession();
      expect(controller.getSnapshot().kind).toBe("Authenticated");
      expect({ reads, posts }).toEqual({ reads: 2, posts: 1 });
      controller.stop();
    },
  );

  it("fences a delayed continuation behind logout and confirms anonymous state only after settlement", async () => {
    const now = Date.now();
    let anonymous = false;
    let posts = 0;
    let logouts = 0;
    const pending: { release?: () => void } = {};
    const response = new Promise<void>((resolve) => {
      pending.release = resolve;
    });
    server.use(
      http.get("/api/v1/auth/session", () =>
        anonymous
          ? anonymousSession()
          : deadlineSession(now + 4 * 60_000, now + 60 * 60_000),
      ),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      http.post("/api/v1/auth/session-continuations", async () => {
        posts++;
        await response;
        return deadlineSession(now + 30 * 60_000, now + 60 * 60_000);
      }),
      http.post("/api/v1/auth/logout", () => {
        logouts++;
        anonymous = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    const continuation = controller.continueWorking();
    await waitFor(() => expect(posts).toBe(1));
    controller.beginAuthenticatedLogout();
    expect(controller.getSnapshot().kind).toBe("Logout quiescing");
    expect(logouts).toBe(0);
    if (!pending.release)
      throw new Error("Missing continuation fixture release");
    pending.release();
    await continuation;
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Logout confirmed"),
    );
    expect({ posts, logouts }).toEqual({ posts: 1, logouts: 1 });
    controller.stop();
  });

  it("never reveals an expired discovery result and keeps failed recovery shielded", async () => {
    const now = Date.now();
    let fail = false;
    let capabilities = 0;
    server.use(
      http.get("/api/v1/auth/session", () =>
        fail
          ? errorDocument(503, "unavailable")
          : deadlineSession(now, now + 60_000),
      ),
      http.get("/api/v1/users/me/capabilities", () => {
        capabilities++;
        return capabilitiesFor();
      }),
    );
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Privacy shield"),
    );
    expect(capabilities).toBe(0);
    fail = true;
    await controller.refreshSession();
    expect(controller.getSnapshot()).toMatchObject({
      kind: "Privacy shield",
      phase: "pending",
      error: { kind: "http" },
    });
    controller.stop();
  });
  it("warns without requests, continues once with fresh CSRF, and keeps the absolute boundary", async () => {
    const start = Date.now();
    const absolute = start + 12 * 60 * 60_000;
    let reads = 0;
    let posts = 0;
    let bodyless = false;
    let currentCsrf = false;
    const csrf = crypto.randomUUID();
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return deadlineSession(start + 30 * 60_000, absolute);
      }),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      http.post("/api/v1/auth/session-continuations", async ({ request }) => {
        posts++;
        bodyless = (await request.text()) === "";
        currentCsrf = request.headers.get("X-CSRF-Token") === csrf;
        return deadlineSession(Date.now() + 30 * 60_000, absolute);
      }),
    );
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    vi.useFakeTimers({
      toFake: ["Date", "setTimeout", "clearTimeout", "performance"],
    });
    // Reinstall through explicit recovery so the watchdog belongs to this clock.
    controller.shield();
    await controller.refreshSession();
    await vi.advanceTimersByTimeAsync(25 * 60_000);
    expect(controller.getSnapshot()).toEqual({
      kind: "Authenticated",
      lifecycle: "Warning due",
    });
    expect(reads).toBe(2);
    expect(posts).toBe(0);
    document.cookie = `mia_csrf=${csrf}; Path=/`;
    await controller.continueWorking();
    expect(controller.getSnapshot()).toEqual({ kind: "Authenticated" });
    expect({ posts, bodyless, currentCsrf, reads }).toEqual({
      posts: 1,
      bodyless: true,
      currentCsrf: true,
      reads: 2,
    });
    await vi.advanceTimersByTimeAsync(30 * 60_000);
    expect(controller.getSnapshot().kind).toBe("Privacy shield");
    expect(posts).toBe(1);
    // Another tab may have renewed the cookie while this tab retained its old
    // deadline. Only the user's explicit discovery may reveal the renewed stage.
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return deadlineSession(Date.now() + 30 * 60_000, absolute);
      }),
    );
    await controller.refreshSession();
    expect(controller.getSnapshot()).toEqual({ kind: "Authenticated" });
    expect({ reads, posts }).toEqual({ reads: 3, posts: 1 });
    controller.stop();
  });

  it.each([
    "lost",
    "server",
    "absolute changed",
    "account changed",
    "429",
    "404",
  ])(
    "shields immediately after continuation %s without replay or automatic discovery",
    async (outcome) => {
      const now = Date.now();
      let reads = 0;
      let posts = 0;
      server.use(
        http.get("/api/v1/auth/session", () => {
          reads++;
          return deadlineSession(now + 4 * 60_000, now + 60 * 60_000);
        }),
        http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
        http.post("/api/v1/auth/session-continuations", () => {
          posts++;
          if (outcome === "lost") return HttpResponse.error();
          if (outcome === "server") return errorDocument(503, "unavailable");
          if (outcome === "429" || outcome === "404")
            return errorDocument(Number(outcome), "unexpected");
          if (outcome === "account changed")
            return deadlineSession(
              now + 30 * 60_000,
              now + 60 * 60_000,
              "authenticated",
              "other-account",
            );
          return deadlineSession(now + 30 * 60_000, now + 2 * 60 * 60_000);
        }),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const controller = new SessionController();
      controller.start();
      await waitFor(() =>
        expect(controller.getSnapshot().kind).toBe("Authenticated"),
      );
      await controller.continueWorking();
      expect(controller.getSnapshot()).toMatchObject({
        kind: "Privacy shield",
        reason: "continuation unknown",
      });
      await controller.continueWorking();
      expect({ reads, posts }).toEqual({ reads: 1, posts: 1 });
      controller.stop();
    },
  );

  it("purges before notification, stays silent behind the shield, and explicitly reauthorizes another tab's renewal", async () => {
    const now = Date.now();
    let reads = 0;
    let capabilities = 0;
    const order: string[] = [];
    const controller = new SessionController();
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return deadlineSession(now + 60_000, now + 60 * 60_000);
      }),
      http.get("/api/v1/users/me/capabilities", () => {
        capabilities++;
        return capabilitiesFor();
      }),
    );
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    controller.registerSecurityTeardown(() => order.push("purge"));
    controller.subscribe(() => order.push("notify"));
    controller.shield();
    controller.shield();
    expect(order).toEqual(["purge", "notify"]);
    expect({ reads, capabilities }).toEqual({ reads: 1, capabilities: 1 });
    await controller.refreshSession();
    expect(controller.getSnapshot().kind).toBe("Authenticated");
    expect({ reads, capabilities }).toEqual({ reads: 2, capabilities: 2 });
    controller.stop();
  });

  it.each(["rollback", "suspension", "restricted expiry"])(
    "shields on %s without making a request",
    async (reason) => {
      const now = Date.now();
      let reads = 0;
      server.use(
        http.get("/api/v1/auth/session", () => {
          reads++;
          return deadlineSession(
            now + 60_000,
            now + 60_000,
            reason === "restricted expiry"
              ? "password-change"
              : "authenticated",
          );
        }),
        http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      );
      const controller = new SessionController();
      controller.start();
      await waitFor(() =>
        expect(["Authenticated", "Password change"]).toContain(
          controller.getSnapshot().kind,
        ),
      );
      // Wake/rollback judgment starts only after one trusted watchdog
      // interval: let the real one-second watchdog establish its baseline
      // before jumping the wall clock.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      vi.setSystemTime(
        now +
          (reason === "rollback"
            ? -60_000
            : reason === "suspension"
              ? 5000
              : 60_000),
      );
      await waitFor(
        () => expect(controller.getSnapshot().kind).toBe("Privacy shield"),
        { timeout: 2000 },
      );
      expect(reads).toBe(1);
      controller.stop();
    },
  );
});

describe("SessionController lifecycle recovery fencing", () => {
  it("fences a recovery whose session discovery is still pending when a lifecycle signal arrives", async () => {
    const now = Date.now();
    let delay: Promise<void> | null = null;
    let capabilities = 0;
    server.use(
      http.get("/api/v1/auth/session", async () => {
        if (delay) await delay;
        return deadlineSession(now + 30 * 60_000, now + 60 * 60_000);
      }),
      http.get("/api/v1/users/me/capabilities", () => {
        capabilities++;
        return capabilitiesFor();
      }),
    );
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    controller.shield();
    const gate = lifecycleGate();
    delay = gate.promise;
    const recovery = controller.refreshSession();
    expect(controller.getSnapshot()).toMatchObject({
      kind: "Privacy shield",
      phase: "checking",
    });

    controller.observeLifecycle();
    gate.resolve();
    await recovery;

    expect(controller.getSnapshot()).toMatchObject({
      kind: "Privacy shield",
      phase: "pending",
      reason: "lifecycle",
    });
    expect(controller.getAuthenticatedAccess()).toBeNull();
    expect(capabilities).toBe(1);

    delay = null;
    await controller.refreshSession();
    expect(controller.getSnapshot()).toEqual({ kind: "Authenticated" });
    expect(capabilities).toBe(2);
    controller.stop();
  });

  it("fences a recovery whose capability read is still pending when a lifecycle signal arrives", async () => {
    const now = Date.now();
    let delay: Promise<void> | null = null;
    let capabilities = 0;
    server.use(
      http.get("/api/v1/auth/session", () =>
        deadlineSession(now + 30 * 60_000, now + 60 * 60_000),
      ),
      http.get("/api/v1/users/me/capabilities", async () => {
        capabilities++;
        if (delay) await delay;
        return capabilitiesFor();
      }),
    );
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    controller.shield();
    const gate = lifecycleGate();
    delay = gate.promise;
    const recovery = controller.refreshSession();
    await waitFor(() => expect(capabilities).toBe(2));

    controller.observeLifecycle();
    gate.resolve();
    await recovery;

    expect(controller.getSnapshot()).toMatchObject({
      kind: "Privacy shield",
      phase: "pending",
      reason: "lifecycle",
    });
    expect(controller.getAuthenticatedAccess()).toBeNull();
    controller.stop();
  });

  it("keeps an anonymous-origin shield anonymous and sends nothing when it fences recovery", async () => {
    let delay: Promise<void> | null = null;
    let reads = 0;
    server.use(
      http.get("/api/v1/auth/session", async () => {
        reads++;
        if (delay) await delay;
        return anonymousSession();
      }),
    );
    const controller = new SessionController();
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Signed out"),
    );
    controller.shield("lifecycle", true);
    const gate = lifecycleGate();
    delay = gate.promise;
    const recovery = controller.refreshSession();
    await waitFor(() => expect(reads).toBe(2));

    controller.observeLifecycle();
    controller.observeLifecycle();
    gate.resolve();
    await recovery;

    expect(controller.getSnapshot()).toMatchObject({
      kind: "Privacy shield",
      phase: "pending",
      reason: "lifecycle",
      anonymousOrigin: true,
    });
    expect(reads).toBe(2);
    controller.stop();
  });
});

describe("SessionController logout retry after a recorded 204", () => {
  function observeSecurityMessages(): string[] {
    vi.stubGlobal("BroadcastChannel", TestBroadcastChannel);
    const kinds: string[] = [];
    new TestBroadcastChannel("mia-security-v1").addEventListener(
      "message",
      (event) => {
        if (!(event instanceof MessageEvent)) return;
        const data: unknown = event.data;
        if (typeof data === "object" && data !== null && "kind" in data)
          kinds.push(String(data.kind));
      },
    );
    return kinds;
  }

  async function signIn(controller: SessionController) {
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
  }

  it("confirms an anonymous retry without a second logout when confirmation was unavailable", async () => {
    const kinds = observeSecurityMessages();
    const now = Date.now();
    let posts = 0;
    let confirmationReads = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        if (posts === 0)
          return deadlineSession(now + 30 * 60_000, now + 60 * 60_000);
        confirmationReads++;
        return confirmationReads === 1
          ? errorDocument(503, "unavailable")
          : anonymousSession();
      }),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      http.post("/api/v1/auth/logout", () => {
        posts++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const controller = new SessionController();
    await signIn(controller);

    controller.beginAuthenticatedLogout();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Logout unconfirmed"),
    );
    expect(kinds).not.toContain("logout-confirmed");

    controller.retryRestrictedLogout();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Logout confirmed"),
    );
    expect({ posts, confirmationReads }).toEqual({
      posts: 1,
      confirmationReads: 2,
    });
    expect(kinds.at(-1)).toBe("logout-confirmed");
    controller.stop();
  });

  it("never confirms an anonymous retry when no 204 was recorded", async () => {
    const now = Date.now();
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () =>
        posts === 0
          ? deadlineSession(now + 30 * 60_000, now + 60 * 60_000)
          : anonymousSession(),
      ),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      http.post("/api/v1/auth/logout", () => {
        posts++;
        return HttpResponse.error();
      }),
    );
    const controller = new SessionController();
    await signIn(controller);

    controller.beginAuthenticatedLogout();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Logout unconfirmed"),
    );
    controller.retryRestrictedLogout();
    await waitFor(() =>
      expect(controller.getSnapshot()).toEqual({ kind: "Logout unconfirmed" }),
    );
    expect(posts).toBe(1);
    controller.stop();
  });

  it("drops a recorded 204 once a retry observes the browser signed in again", async () => {
    const now = Date.now();
    let posts = 0;
    const afterLogout = [
      () => errorDocument(503, "unavailable"),
      () => restrictedSession(),
      () => anonymousSession(),
    ];
    server.use(
      http.get("/api/v1/auth/session", () => {
        if (posts === 0)
          return deadlineSession(now + 30 * 60_000, now + 60 * 60_000);
        const next = afterLogout.shift();
        if (!next) throw new Error("Unexpected session read");
        return next();
      }),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      http.post("/api/v1/auth/logout", () => {
        posts++;
        return posts === 1
          ? new HttpResponse(null, { status: 204 })
          : HttpResponse.error();
      }),
    );
    const controller = new SessionController();
    await signIn(controller);

    controller.beginAuthenticatedLogout();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Logout unconfirmed"),
    );
    controller.retryRestrictedLogout();
    await waitFor(() => expect(posts).toBe(2));
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Logout unconfirmed"),
    );

    controller.retryRestrictedLogout();
    await waitFor(() => expect(afterLogout).toHaveLength(0));
    await waitFor(() =>
      expect(controller.getSnapshot()).toEqual({ kind: "Logout unconfirmed" }),
    );
    expect(posts).toBe(2);
    controller.stop();
  });

  it("requires a readable anonymous CSRF cookie before confirming", async () => {
    const now = Date.now();
    let posts = 0;
    let anonymousReads = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        if (posts === 0)
          return deadlineSession(now + 30 * 60_000, now + 60 * 60_000);
        anonymousReads++;
        // The second anonymous read issues the anonymous CSRF cookie.
        if (anonymousReads === 2)
          document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
        return anonymousSession();
      }),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      http.post("/api/v1/auth/logout", () => {
        posts++;
        document.cookie = "mia_csrf=; Max-Age=0; Path=/";
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const controller = new SessionController();
    await signIn(controller);

    controller.beginAuthenticatedLogout();
    await waitFor(() =>
      expect(controller.getSnapshot()).toEqual({ kind: "Logout unconfirmed" }),
    );
    expect(anonymousReads).toBe(1);

    controller.retryRestrictedLogout();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Logout confirmed"),
    );
    expect({ posts, anonymousReads }).toEqual({ posts: 1, anonymousReads: 2 });
    controller.stop();
  });
});

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

describe("SessionController public recovery and reset", () => {
  async function startAnonymous(controller: SessionController) {
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Signed out"),
    );
  }

  it("discovers anonymous CSRF when none is readable, then dispatches recovery once", async () => {
    const controller = new SessionController();
    const csrf = crypto.randomUUID();
    let reads = 0;
    let posts = 0;
    let csrfAtDispatch: string | null = null;
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        if (reads === 2) document.cookie = `mia_csrf=${csrf}; Path=/`;
        return anonymousSession();
      }),
      http.post("/api/v1/auth/password-recovery-requests", ({ request }) => {
        posts++;
        csrfAtDispatch = request.headers.get("X-CSRF-Token");
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await startAnonymous(controller);

    expect(
      await controller.requestPasswordRecovery("example.user", () => true),
    ).toEqual({
      kind: "completed",
    });
    expect({ reads, posts, csrfAtDispatch }).toEqual({
      reads: 2,
      posts: 1,
      csrfAtDispatch: csrf,
    });
    controller.stop();
  });

  it("rediscovers CSRF after csrf_invalid and never replays the request", async () => {
    const controller = new SessionController();
    let reads = 0;
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return anonymousSession();
      }),
      http.post("/api/v1/auth/password-resets", () => {
        posts++;
        return errorDocument(403, "csrf_invalid");
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    await startAnonymous(controller);
    const password = crypto.randomUUID();

    const result = await controller.resetPassword(
      crypto.randomUUID() as Parameters<SessionController["resetPassword"]>[0],
      password,
      password,
      () => true,
      new AbortController().signal,
    );

    expect(result.kind).toBe("csrf-rejected");
    expect({ reads, posts }).toEqual({ reads: 2, posts: 1 });
    expect(controller.getSnapshot().kind).toBe("Signed out");
    controller.stop();
  });

  it.each([
    [500, "unknown"],
    [422, "rejected"],
    [429, "rejected"],
  ] as const)(
    "classifies HTTP %s as %s after exactly one dispatch",
    async (status, kind) => {
      const controller = new SessionController();
      let posts = 0;
      server.use(
        http.get("/api/v1/auth/session", () => anonymousSession()),
        http.post("/api/v1/auth/password-recovery-requests", () => {
          posts++;
          return errorDocument(status, "controlled");
        }),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      await startAnonymous(controller);

      expect(
        (await controller.requestPasswordRecovery("example", () => true)).kind,
      ).toBe(kind);
      expect(posts).toBe(1);
      controller.stop();
    },
  );

  it("treats transport loss after dispatch as unknown without replay", async () => {
    const controller = new SessionController();
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () => anonymousSession()),
      http.post("/api/v1/auth/password-recovery-requests", () => {
        posts++;
        return HttpResponse.error();
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    await startAnonymous(controller);

    expect(
      (await controller.requestPasswordRecovery("example", () => true)).kind,
    ).toBe("unknown");
    expect(posts).toBe(1);
    controller.stop();
  });

  it("sends nothing outside an anonymous stage and follows a peer's new stage", async () => {
    const controller = new SessionController();
    let posts = 0;
    let stage: "anonymous" | "authenticated" = "authenticated";
    server.use(
      http.get("/api/v1/auth/session", () =>
        stage === "anonymous"
          ? anonymousSession()
          : stageSession("authenticated"),
      ),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      http.post("/api/v1/auth/password-recovery-requests", () => {
        posts++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    expect(
      (await controller.requestPasswordRecovery("example", () => true)).kind,
    ).toBe("superseded");

    controller.stop();
    stage = "anonymous";
    await startAnonymous(controller);
    // No readable CSRF cookie: discovery now reports a peer's sign-in.
    stage = "authenticated";
    expect(
      (await controller.requestPasswordRecovery("example", () => true)).kind,
    ).toBe("superseded");
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    expect(posts).toBe(0);
    controller.stop();
  });

  it("signs out an authenticated stage for a reset link through the logout phases", async () => {
    const controller = new SessionController();
    let stage: "anonymous" | "authenticated" = "authenticated";
    let logouts = 0;
    let csrfAtLogout: string | null = null;
    const csrf = crypto.randomUUID();
    server.use(
      http.get("/api/v1/auth/session", () => {
        if (stage === "authenticated")
          document.cookie = `mia_csrf=${csrf}; Path=/`;
        return stage === "anonymous"
          ? anonymousSession()
          : stageSession("authenticated");
      }),
      http.get("/api/v1/users/me/capabilities", () => capabilitiesFor()),
      http.post("/api/v1/auth/logout", ({ request }) => {
        logouts++;
        csrfAtLogout = request.headers.get("X-CSRF-Token");
        stage = "anonymous";
        return new HttpResponse(null, { status: 204 });
      }),
    );
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Authenticated"),
    );
    // Recovering CSRF first must accept the authenticated stage.
    document.cookie = "mia_csrf=; Max-Age=0; Path=/";

    expect(controller.beginLinkLogout()).toBe(true);
    expect(controller.beginLinkLogout()).toBe(false);
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Logout confirmed"),
    );
    expect({ logouts, csrfAtLogout }).toEqual({
      logouts: 1,
      csrfAtLogout: csrf,
    });
    controller.stop();
  });

  it("keeps restricted logout unable to recover CSRF from an authenticated stage", async () => {
    const controller = new SessionController();
    let reads = 0;
    let logouts = 0;
    server.use(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return reads === 1
          ? stageSession("password-change")
          : stageSession("authenticated");
      }),
      http.post("/api/v1/auth/logout", () => {
        logouts++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Password change"),
    );

    controller.beginRestrictedLogout();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Logout unconfirmed"),
    );
    expect(logouts).toBe(0);
    controller.stop();
  });
});

describe("SessionController reset attempt lifetime", () => {
  it("never sends a reset that waited for the coordinator after its route was left", async () => {
    const controller = new SessionController();
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () => anonymousSession()),
      http.post("/api/v1/auth/password-resets", () => {
        posts++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Signed out"),
    );
    window.history.replaceState(
      null,
      "",
      `/password-reset#token=${crypto.randomUUID()}`,
    );
    const link = capturePasswordResetLink(window.location, window.history);
    link.observeSession(controller.getSnapshot());
    let release: () => void = () => undefined;
    let held: () => void = () => undefined;
    const lockHeld = new Promise<void>((resolve) => {
      held = resolve;
    });
    const blocker = navigator.locks.request(
      "mia-authenticated-requests-v1",
      { mode: "exclusive" },
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
          held();
        }),
    );
    await lockHeld;
    const password = crypto.randomUUID();

    const pending = link.submit(password, password, (...args) =>
      controller.resetPassword(...args),
    );
    expect(link.getSnapshot().kind).toBe("Submitting");
    link.depart();
    release();
    await Promise.all([blocker, pending]);

    expect(posts).toBe(0);
    expect(link.getSnapshot().kind).toBe("Link unusable");
    window.history.replaceState(null, "", "/");
    controller.stop();
  });
});

describe("SessionController invitation preview and acceptance", () => {
  const acceptanceFields = (password: string) => ({
    username: "example.mentor",
    password,
    passwordConfirmation: password,
    language: "en-US",
    country: "US",
    timeZone: "UTC",
  });

  async function startAnonymous(controller: SessionController) {
    const csrf = crypto.randomUUID();
    document.cookie = `mia_csrf=${csrf}; Path=/`;
    controller.start();
    await waitFor(() =>
      expect(controller.getSnapshot().kind).toBe("Signed out"),
    );
    return csrf;
  }

  function openInvitation() {
    window.history.replaceState(
      null,
      "",
      `/invitation#token=${crypto.randomUUID()}`,
    );
    return captureInvitationLink(window.location, window.history);
  }

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("previews once with the current CSRF and exposes only the role", async () => {
    const controller = new SessionController();
    let posts = 0;
    const csrf: (string | null)[] = [];
    server.use(
      http.get("/api/v1/auth/session", () => anonymousSession()),
      http.post("/api/v1/invitation-previews", ({ request }) => {
        posts++;
        csrf.push(request.headers.get("X-CSRF-Token"));
        return HttpResponse.json(
          {
            data: {
              type: "invitation-previews",
              id: "preview",
              attributes: { platform: "mia", role: "mentor" },
            },
          },
          { headers: { "Content-Type": "application/vnd.api+json" } },
        );
      }),
    );
    const current = await startAnonymous(controller);
    const link = openInvitation();
    link.observeSession(controller.getSnapshot());

    await link.preview((...args) => controller.previewInvitation(...args));

    expect(link.getSnapshot()).toEqual({
      kind: "Acceptance ready",
      role: "mentor",
    });
    expect(posts).toBe(1);
    expect(csrf).toEqual([current]);
    controller.stop();
  });

  it("enters outcome unknown after connection loss with exactly one acceptance dispatch", async () => {
    const controller = new SessionController();
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () => anonymousSession()),
      http.post("/api/v1/invitation-previews", () =>
        HttpResponse.json(
          {
            data: {
              type: "invitation-previews",
              id: "preview",
              attributes: { platform: "mia", role: "supervisor" },
            },
          },
          { headers: { "Content-Type": "application/vnd.api+json" } },
        ),
      ),
      http.post("/api/v1/invitation-acceptances", async ({ request }) => {
        posts++;
        // The request bytes reached the server before the connection dropped.
        await request.text();
        return HttpResponse.error();
      }),
    );
    await startAnonymous(controller);
    const link = openInvitation();
    link.observeSession(controller.getSnapshot());
    await link.preview((...args) => controller.previewInvitation(...args));

    await link.accept(acceptanceFields(crypto.randomUUID()), (...args) =>
      controller.acceptInvitation(...args),
    );
    await link.accept(acceptanceFields(crypto.randomUUID()), (...args) =>
      controller.acceptInvitation(...args),
    );

    expect(link.getSnapshot().kind).toBe("Acceptance outcome unknown");
    expect(posts).toBe(1);
    controller.stop();
  });

  it("never sends an acceptance that waited for the coordinator after Stop waiting", async () => {
    const controller = new SessionController();
    let posts = 0;
    server.use(
      http.get("/api/v1/auth/session", () => anonymousSession()),
      http.post("/api/v1/invitation-acceptances", () => {
        posts++;
        return new HttpResponse(null, { status: 500 });
      }),
    );
    await startAnonymous(controller);
    const link = openInvitation();
    link.observeSession(controller.getSnapshot());
    await link.preview(() =>
      Promise.resolve({ kind: "completed", value: "mentor" }),
    );
    let release: () => void = () => undefined;
    let held: () => void = () => undefined;
    const lockHeld = new Promise<void>((resolve) => {
      held = resolve;
    });
    const blocker = navigator.locks.request(
      "mia-authenticated-requests-v1",
      { mode: "exclusive" },
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
          held();
        }),
    );
    await lockHeld;

    const pending = link.accept(
      acceptanceFields(crypto.randomUUID()),
      (...args) => controller.acceptInvitation(...args),
    );
    link.stopWaiting();
    release();
    await Promise.all([blocker, pending]);

    expect(posts).toBe(0);
    expect(link.getSnapshot()).toEqual({
      kind: "Acceptance outcome unknown",
      error: null,
    });
    controller.stop();
  });
});
