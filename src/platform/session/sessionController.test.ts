import { waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "../../../test/server";
import { SessionController } from "./sessionController";

const mediaType = "application/vnd.api+json";

class TestBroadcastChannel extends EventTarget {
  static readonly channels = new Map<string, Set<TestBroadcastChannel>>();
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
        peer.dispatchEvent(new MessageEvent("message", { data: message }));
      }
    }
  }

  close(): void {
    TestBroadcastChannel.channels.get(this.name)?.delete(this);
  }
}

function restrictedSession() {
  return HttpResponse.json(
    {
      data: {
        type: "auth-sessions",
        id: "account-id",
        attributes: {
          stage: "mfa",
          mfa_challenge_id: "challenge-id",
          idle_expires_at: "2026-09-27T10:30:00.000000Z",
          absolute_expires_at: "2026-09-27T22:00:00.000000Z",
        },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  TestBroadcastChannel.channels.clear();
  document.cookie = "mia_csrf=; Max-Age=0; Path=/";
});

describe("SessionController logout coordination", () => {
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
