import { randomBytes } from "node:crypto";
import { http, HttpResponse, type JsonBodyType } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/server";
import {
  ApiHttpError,
  ApiProtocolError,
  ApiTransportError,
  jsonApiMediaType,
} from "./client";
import {
  changeTemporaryPassword,
  continueSession,
  discoverSession,
  consumeMfaRecoveryCode,
  getCurrentAccountCapabilities,
  logoutCurrentBrowser,
  loginWithPassword,
  acceptInvitation,
  previewInvitation,
  requestPasswordRecovery,
  resetPassword,
  verifyMfaChallenge,
  type InvitationToken,
  type PasswordResetToken,
} from "./entry";

function jsonApiResponse(body: JsonBodyType): HttpResponse<JsonBodyType> {
  return HttpResponse.json(body, {
    headers: { "Content-Type": jsonApiMediaType },
    status: 200,
  });
}

describe("continuation transport", () => {
  it.each([
    [
      "authenticated",
      "2026-02-30T10:30:00.000000Z",
      "2026-09-30T22:00:00.000000Z",
    ],
    [
      "authenticated",
      "2026-09-30T10:30:00.000000Z",
      "2026-09-30T10:00:00.000000Z",
    ],
    [
      "password-change",
      "2026-09-30T10:30:00.000000Z",
      "2026-09-30T22:00:00.000000Z",
    ],
  ])(
    "rejects invalid continuation stage or deadlines (%s, %s)",
    async (stage, idle, absolute) => {
      let posts = 0;
      server.use(
        http.post("/api/v1/auth/session-continuations", () => {
          posts++;
          return jsonApiResponse({
            data: {
              type: "auth-sessions",
              id: "account-id",
              attributes: {
                stage,
                idle_expires_at: idle,
                absolute_expires_at: absolute,
              },
            },
          });
        }),
      );
      await expect(continueSession(crypto.randomUUID())).rejects.toBeInstanceOf(
        ApiProtocolError,
      );
      expect(posts).toBe(1);
    },
  );
});

async function authoritativeChallenge() {
  server.use(
    http.get("/api/v1/auth/session", () =>
      jsonApiResponse({
        data: {
          type: "auth-sessions",
          id: "account-id",
          attributes: {
            stage: "mfa",
            mfa_challenge_id: "challenge-id",
            idle_expires_at: "2026-09-30T10:30:00.000000Z",
            absolute_expires_at: "2026-09-30T10:30:00.000000Z",
          },
        },
      }),
    ),
  );
  const session = await discoverSession();
  if (session.kind !== "mfa") throw new Error("Expected MFA fixture stage.");
  return session.challengeId;
}

function verificationFixture(): string {
  return String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0");
}

function recoveryFixture(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  return Array.from(
    randomBytes(16),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");
}

describe("entry API boundary", () => {
  it.each(["verification", "recovery"] as const)(
    "sends one exact MFA %s document with current CSRF and no correlation",
    async (operation) => {
      const challenge = await authoritativeChallenge();
      const code =
        operation === "verification"
          ? verificationFixture()
          : recoveryFixture();
      const csrf = crypto.randomUUID();
      let exactWire = false;
      let posts = 0;
      const path =
        operation === "verification"
          ? "/api/v1/auth/mfa-challenges/challenge-id/verifications"
          : "/api/v1/auth/mfa-challenges/challenge-id/recovery-code-consumptions";
      server.use(
        http.post(path, async ({ request }) => {
          posts++;
          exactWire =
            request.headers.get("X-CSRF-Token") === csrf &&
            !request.headers.has("X-Request-ID") &&
            (await request.text()) ===
              JSON.stringify({
                data: {
                  type:
                    operation === "verification"
                      ? "mfa-verifications"
                      : "mfa-recovery-code-consumptions",
                  attributes: { code },
                },
              });
          return jsonApiResponse({
            data: {
              type: "auth-sessions",
              id: "account-id",
              attributes: {
                stage: "password-change",
                idle_expires_at: "2026-09-30T10:30:00.000000Z",
                absolute_expires_at: "2026-09-30T10:30:00.000000Z",
              },
            },
          });
        }),
      );
      const result =
        operation === "verification"
          ? await verifyMfaChallenge(challenge, code, csrf)
          : await consumeMfaRecoveryCode(challenge, code, csrf);
      expect({ exactWire, posts, stage: result.kind }).toEqual({
        exactWire: true,
        posts: 1,
        stage: "password-change",
      });
    },
  );

  it.each([400, 401, 403, 406, 413, 415, 422, 429, 500])(
    "retains exact MFA HTTP %s disclosure and never replays",
    async (status) => {
      const challenge = await authoritativeChallenge();
      let posts = 0;
      server.use(
        http.post(
          "/api/v1/auth/mfa-challenges/challenge-id/verifications",
          () => {
            posts++;
            return new HttpResponse("controlled error", { status });
          },
        ),
      );
      const error = await verifyMfaChallenge(
        challenge,
        verificationFixture(),
        crypto.randomUUID(),
      ).catch((reason: unknown) => reason);
      expect(error instanceof ApiHttpError).toBe(true);
      expect(posts).toBe(1);
    },
  );
  it.each([400, 401, 403, 406, 413, 415, 422, 429, 500])(
    "retains exact login HTTP %s disclosure and never replays",
    async (status) => {
      const raw = `unconfirmed ${crypto.randomUUID()}\r\n`;
      let posts = 0;
      server.use(
        http.post("/api/v1/auth/login", () => {
          posts++;
          return new HttpResponse(raw, { status });
        }),
      );
      const result = await loginWithPassword(
        "example",
        crypto.randomUUID(),
        crypto.randomUUID(),
      ).catch((error: unknown) => error);
      expect(
        result instanceof ApiHttpError &&
          result.disclosure.status === status &&
          result.disclosure.body === raw,
      ).toBe(true);
      expect(posts).toBe(1);
    },
  );

  it.each([
    "missing-challenge",
    "forbidden-challenge",
    "error-and-data",
    "unknown-stage",
  ])("rejects malformed login session case %s", async (scenario) => {
    server.use(
      http.post("/api/v1/auth/login", () =>
        jsonApiResponse({
          ...(scenario === "error-and-data" ? { errors: [] } : {}),
          data: {
            type: "auth-sessions",
            id: "account-id",
            attributes: {
              stage:
                scenario === "missing-challenge"
                  ? "mfa"
                  : scenario === "unknown-stage"
                    ? "unknown"
                    : "authenticated",
              ...(scenario === "forbidden-challenge"
                ? { mfa_challenge_id: "challenge-id" }
                : {}),
              idle_expires_at: "2026-09-30T10:30:00.000000Z",
              absolute_expires_at: "2026-09-30T22:00:00.000000Z",
            },
          },
        }),
      ),
    );
    await expect(
      loginWithPassword("example", crypto.randomUUID(), crypto.randomUUID()),
    ).rejects.toBeInstanceOf(ApiProtocolError);
  });
  it("sends exact login bytes and only the documented headers without wire correlation", async () => {
    const password = ` ${crypto.randomUUID()} é `;
    const csrf = crypto.randomUUID();
    let exactWire = false;
    server.use(
      http.post("/api/v1/auth/login", async ({ request }) => {
        exactWire =
          (await request.text()) ===
            JSON.stringify({
              data: {
                type: "login-attempts",
                attributes: { username: "Example.User", password },
              },
            }) &&
          request.headers.get("X-CSRF-Token") === csrf &&
          request.headers.get("Content-Type") === jsonApiMediaType &&
          request.headers.get("Accept") === jsonApiMediaType &&
          !request.headers.has("X-Request-ID") &&
          !request.headers.has("Idempotency-Key");
        return jsonApiResponse({
          data: {
            type: "auth-sessions",
            id: "account-id",
            attributes: {
              stage: "password-change",
              idle_expires_at: "2026-09-30T10:30:00.000000Z",
              absolute_expires_at: "2026-09-30T10:30:00.000000Z",
            },
          },
        });
      }),
    );
    expect((await loginWithPassword("Example.User", password, csrf)).kind).toBe(
      "password-change",
    );
    expect(exactWire).toBe(true);
  });

  it("sends exact unnormalized password-change bytes once with current CSRF and no current password", async () => {
    // Leading/trailing spaces and a decomposed accent prove nothing is trimmed or normalized.
    const password = ` ${crypto.randomUUID()} e\u0301 `;
    const csrf = crypto.randomUUID();
    let exactWire = false;
    let posts = 0;
    server.use(
      http.post("/api/v1/auth/password-changes", async ({ request }) => {
        posts++;
        exactWire =
          (await request.text()) ===
            JSON.stringify({
              data: {
                type: "password-changes",
                attributes: { password, password_confirmation: password },
              },
            }) &&
          request.headers.get("X-CSRF-Token") === csrf &&
          request.headers.get("Content-Type") === jsonApiMediaType &&
          !request.headers.has("X-Request-ID") &&
          !request.headers.has("Idempotency-Key");
        return jsonApiResponse({
          data: {
            type: "auth-sessions",
            id: "account-id",
            attributes: {
              stage: "authenticated",
              idle_expires_at: "2026-10-01T10:30:00.000000Z",
              absolute_expires_at: "2026-10-01T22:00:00.000000Z",
            },
          },
        });
      }),
    );
    expect(await changeTemporaryPassword(password, password, csrf)).toEqual({
      kind: "authenticated",
      accountId: "account-id",
      idleExpiresAt: Date.parse("2026-10-01T10:30:00.000000Z"),
      absoluteExpiresAt: Date.parse("2026-10-01T22:00:00.000000Z"),
    });
    expect({ exactWire, posts }).toEqual({ exactWire: true, posts: 1 });
  });

  it.each([400, 403, 406, 413, 415, 422, 429, 500, 502])(
    "retains exact password-change HTTP %s disclosure and never replays",
    async (status) => {
      const raw = `controlled ${crypto.randomUUID()}\r\n`;
      let posts = 0;
      server.use(
        http.post("/api/v1/auth/password-changes", () => {
          posts++;
          return new HttpResponse(raw, { status });
        }),
      );
      const password = crypto.randomUUID();
      const result = await changeTemporaryPassword(
        password,
        password,
        crypto.randomUUID(),
      ).catch((error: unknown) => error);
      expect(
        result instanceof ApiHttpError &&
          result.disclosure.status === status &&
          result.disclosure.body === raw,
      ).toBe(true);
      expect(posts).toBe(1);
    },
  );

  it("sends one exact recovery request with current CSRF and accepts only 204", async () => {
    const username = ` Example.${crypto.randomUUID()} `;
    const csrf = crypto.randomUUID();
    let exactWire = false;
    let posts = 0;
    server.use(
      http.post(
        "/api/v1/auth/password-recovery-requests",
        async ({ request }) => {
          posts++;
          exactWire =
            (await request.text()) ===
              JSON.stringify({
                data: {
                  type: "password-recovery-requests",
                  attributes: { username },
                },
              }) &&
            request.headers.get("X-CSRF-Token") === csrf &&
            request.headers.get("Content-Type") === jsonApiMediaType &&
            request.headers.get("Accept") === jsonApiMediaType;
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    await requestPasswordRecovery(username, csrf);
    expect({ exactWire, posts }).toEqual({ exactWire: true, posts: 1 });
  });

  it("sends one exact reset document and treats a non-204 success as malformed", async () => {
    const token = crypto.randomUUID() as PasswordResetToken;
    const password = ` ${crypto.randomUUID()} e\u0301 `;
    const csrf = crypto.randomUUID();
    let exactWire = false;
    let posts = 0;
    let status = 204;
    server.use(
      http.post("/api/v1/auth/password-resets", async ({ request }) => {
        posts++;
        exactWire =
          (await request.text()) ===
            JSON.stringify({
              data: {
                type: "password-resets",
                attributes: {
                  token,
                  password,
                  password_confirmation: password,
                },
              },
            }) && request.headers.get("X-CSRF-Token") === csrf;
        return new HttpResponse(null, { status });
      }),
    );
    await resetPassword(token, password, password, csrf);
    expect({ exactWire, posts }).toEqual({ exactWire: true, posts: 1 });

    status = 200;
    await expect(
      resetPassword(token, password, password, csrf),
    ).rejects.toBeInstanceOf(ApiProtocolError);
    expect(posts).toBe(2);
  });

  it("keeps an exact reset 429 disclosure and its integer Retry-After", async () => {
    const raw = `controlled ${crypto.randomUUID()}`;
    server.use(
      http.post(
        "/api/v1/auth/password-resets",
        () =>
          new HttpResponse(raw, {
            status: 429,
            headers: { "Retry-After": "42" },
          }),
      ),
    );
    const password = crypto.randomUUID();
    const result = await resetPassword(
      crypto.randomUUID() as PasswordResetToken,
      password,
      password,
      crypto.randomUUID(),
    ).catch((error: unknown) => error);
    expect(
      result instanceof ApiHttpError &&
        result.disclosure.body === raw &&
        result.retryAfterSeconds === 42,
    ).toBe(true);
  });

  it("rejects anonymous password-change success as ambiguous", async () => {
    server.use(
      http.post("/api/v1/auth/password-changes", () =>
        jsonApiResponse({ data: null, meta: { stage: "anonymous" } }),
      ),
    );
    const password = crypto.randomUUID();
    await expect(
      changeTemporaryPassword(password, password, crypto.randomUUID()),
    ).rejects.toBeInstanceOf(ApiProtocolError);
  });

  it.each([
    null,
    "-1",
    "1.5",
    "not an HTTP date",
    "9007199254740992",
    "60",
    "0",
  ])(
    "validates throttle metadata case %# separately from untouched disclosure",
    async (header) => {
      const body = `<p>${crypto.randomUUID()}</p>\r\n`;
      server.use(
        http.post(
          "/api/v1/auth/login",
          () =>
            new HttpResponse(body, {
              status: 429,
              headers: header === null ? {} : { "Retry-After": header },
            }),
        ),
      );
      const error = await loginWithPassword(
        "example",
        crypto.randomUUID(),
        crypto.randomUUID(),
      ).catch((reason: unknown) => reason);
      if (!(error instanceof ApiHttpError))
        throw new Error("Expected HTTP failure");
      expect(error.disclosure.body === body).toBe(true);
      expect(Object.keys(error.disclosure).sort()).toEqual(["body", "status"]);
      expect(error.retryAfterSeconds).toBe(
        header === "60" ? 60 : header === "0" ? 0 : null,
      );
    },
  );

  it("accepts an HTTP-date Retry-After value", async () => {
    const retryAt = new Date(Date.now() + 60_000).toUTCString();
    server.use(
      http.post(
        "/api/v1/auth/login",
        () =>
          new HttpResponse("", {
            status: 429,
            headers: { "Retry-After": retryAt },
          }),
      ),
    );
    const error = await loginWithPassword(
      "example",
      crypto.randomUUID(),
      crypto.randomUUID(),
    ).catch((reason: unknown) => reason);
    if (!(error instanceof ApiHttpError))
      throw new Error("Expected HTTP failure");
    expect(
      error.retryAfterSeconds === 59 || error.retryAfterSeconds === 60,
    ).toBe(true);
  });

  it("rejects anonymous login success as ambiguous", async () => {
    server.use(
      http.post("/api/v1/auth/login", () =>
        jsonApiResponse({ data: null, meta: { stage: "anonymous" } }),
      ),
    );
    await expect(
      loginWithPassword("example", crypto.randomUUID(), crypto.randomUUID()),
    ).rejects.toBeInstanceOf(ApiProtocolError);
  });
  it("sends the documented read protocol and validates anonymous discovery", async () => {
    let accept = "";
    let csrfHeader: string | null = null;
    server.use(
      http.get("/api/v1/auth/session", ({ request }) => {
        accept = request.headers.get("Accept") ?? "";
        csrfHeader = request.headers.get("X-CSRF-Token");
        return jsonApiResponse({
          data: null,
          meta: { stage: "anonymous" },
        });
      }),
    );

    await expect(discoverSession()).resolves.toEqual({ kind: "anonymous" });
    expect(accept).toBe(jsonApiMediaType);
    expect(csrfHeader).toBeNull();
  });

  it("rejects an MFA stage without its required challenge identity", async () => {
    server.use(
      http.get("/api/v1/auth/session", () =>
        jsonApiResponse({
          data: {
            type: "auth-sessions",
            id: "account-id",
            attributes: {
              stage: "mfa",
              idle_expires_at: "2026-09-27T10:30:00.000000Z",
              absolute_expires_at: "2026-09-27T10:30:00.000000Z",
            },
          },
        }),
      ),
    );

    await expect(discoverSession()).rejects.toBeInstanceOf(ApiProtocolError);
  });

  it("retains one exact backend error disclosure without request metadata", async () => {
    const rawBody = ["line one", "<html>line two</html>"].join("\r\n");
    server.use(
      http.get(
        "/api/v1/auth/session",
        () => new HttpResponse(rawBody, { status: 500 }),
      ),
    );

    const error = await discoverSession().catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiHttpError);
    if (!(error instanceof ApiHttpError)) {
      throw new Error("Expected an HTTP error.");
    }
    expect(error.disclosure.status).toBe(500);
    expect(error.disclosure.body === rawBody).toBe(true);
    expect(Object.keys(error.disclosure).sort()).toEqual(["body", "status"]);
  });

  it("rejects a success response with the wrong media type", async () => {
    server.use(
      http.get(
        "/api/v1/auth/session",
        () =>
          new HttpResponse('{"data":null}', {
            headers: { "Content-Type": "application/json" },
            status: 200,
          }),
      ),
    );

    await expect(discoverSession()).rejects.toBeInstanceOf(ApiProtocolError);
  });

  it("represents transport loss without treating it as a protocol response", async () => {
    server.use(http.get("/api/v1/auth/session", () => HttpResponse.error()));

    await expect(discoverSession()).rejects.toBeInstanceOf(ApiTransportError);
  });

  it("dispatches logout once with the supplied current CSRF value", async () => {
    const csrfToken = crypto.randomUUID();
    let dispatchCount = 0;
    let sentCurrentToken = false;
    server.use(
      http.post("/api/v1/auth/logout", ({ request }) => {
        dispatchCount += 1;
        sentCurrentToken = request.headers.get("X-CSRF-Token") === csrfToken;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(logoutCurrentBrowser(csrfToken)).resolves.toBeUndefined();
    expect(dispatchCount).toBe(1);
    expect(sentCurrentToken).toBe(true);
  });

  it("rejects an undocumented successful logout status", async () => {
    server.use(
      http.post(
        "/api/v1/auth/logout",
        () => new HttpResponse(null, { status: 200 }),
      ),
    );

    await expect(
      logoutCurrentBrowser(crypto.randomUUID()),
    ).rejects.toBeInstanceOf(ApiProtocolError);
  });

  it("rejects an incomplete capability catalog", async () => {
    server.use(
      http.get("/api/v1/users/me/capabilities", () =>
        jsonApiResponse({
          data: {
            type: "account-capabilities",
            id: "account-id",
            attributes: { capabilities: [] },
          },
        }),
      ),
    );

    await expect(getCurrentAccountCapabilities()).rejects.toBeInstanceOf(
      ApiProtocolError,
    );
  });
});

describe("invitation transport", () => {
  function invitationToken(): InvitationToken {
    return crypto.randomUUID() as InvitationToken;
  }

  function created<T extends JsonBodyType>(
    body: T,
    status = 201,
  ): HttpResponse<T> {
    return HttpResponse.json(body, {
      headers: { "Content-Type": jsonApiMediaType },
      status,
    });
  }

  it("sends one exact preview document and returns only the invited role", async () => {
    const token = invitationToken();
    const csrf = crypto.randomUUID();
    let exactWire = false;
    let posts = 0;
    server.use(
      http.post("/api/v1/invitation-previews", async ({ request }) => {
        posts++;
        exactWire =
          (await request.text()) ===
            JSON.stringify({
              data: { type: "invitation-previews", attributes: { token } },
            }) &&
          request.headers.get("X-CSRF-Token") === csrf &&
          request.headers.get("Content-Type") === jsonApiMediaType;
        return jsonApiResponse({
          data: {
            type: "invitation-previews",
            id: "preview",
            attributes: { platform: "mia", role: "supervisor" },
          },
        });
      }),
    );

    expect(await previewInvitation(token, csrf)).toBe("supervisor");
    expect({ exactWire, posts }).toEqual({ exactWire: true, posts: 1 });
  });

  it.each([
    ["an unknown role", { platform: "mia", role: "student" }, 200],
    ["another platform", { platform: "other", role: "mentor" }, 200],
    ["a created status", { platform: "mia", role: "mentor" }, 201],
  ] as const)(
    "treats a preview with %s as malformed",
    async (_label, attributes, status) => {
      server.use(
        http.post("/api/v1/invitation-previews", () =>
          created(
            {
              data: { type: "invitation-previews", id: "preview", attributes },
            },
            status,
          ),
        ),
      );
      await expect(
        previewInvitation(invitationToken(), crypto.randomUUID()),
      ).rejects.toBeInstanceOf(ApiProtocolError);
    },
  );

  it("keeps the exact preview error and its stable code", async () => {
    server.use(
      http.post("/api/v1/invitation-previews", () =>
        HttpResponse.json(
          { errors: [{ status: "422", code: "invitation_invalid" }] },
          { status: 422, headers: { "Content-Type": jsonApiMediaType } },
        ),
      ),
    );
    const result = await previewInvitation(
      invitationToken(),
      crypto.randomUUID(),
    ).catch((error: unknown) => error);
    expect(
      result instanceof ApiHttpError &&
        result.code === "invitation_invalid" &&
        result.disclosure.status === 422,
    ).toBe(true);
  });

  it("sends one exact acceptance document with no email or role and accepts only 201 users", async () => {
    const token = invitationToken();
    const csrf = crypto.randomUUID();
    const password = ` ${crypto.randomUUID()} e\u0301 `;
    const fields = {
      username: "example.supervisor",
      password,
      passwordConfirmation: password,
      language: "de-DE",
      country: "DE",
      timeZone: "Europe/Berlin",
    };
    let exactWire = false;
    let posts = 0;
    let status = 201;
    server.use(
      http.post("/api/v1/invitation-acceptances", async ({ request }) => {
        posts++;
        exactWire =
          (await request.text()) ===
            JSON.stringify({
              data: {
                type: "invitation-acceptances",
                attributes: {
                  token,
                  username: "example.supervisor",
                  password,
                  password_confirmation: password,
                  language: "de-DE",
                  country: "DE",
                  time_zone: "Europe/Berlin",
                },
              },
            }) && request.headers.get("X-CSRF-Token") === csrf;
        return created(
          { data: { type: "users", id: "user-id", attributes: {} } },
          status,
        );
      }),
    );

    await acceptInvitation(token, fields, csrf);
    expect({ exactWire, posts }).toEqual({ exactWire: true, posts: 1 });

    status = 200;
    await expect(acceptInvitation(token, fields, csrf)).rejects.toBeInstanceOf(
      ApiProtocolError,
    );
    expect(posts).toBe(2);
  });

  it.each([
    [
      "another resource type",
      { type: "auth-sessions", id: "x", attributes: {} },
    ],
    [
      "account attributes",
      { type: "users", id: "x", attributes: { username: "x" } },
    ],
    ["no identity", { type: "users", id: "", attributes: {} }],
  ])("treats a 201 with %s as malformed", async (_label, data) => {
    server.use(
      http.post("/api/v1/invitation-acceptances", () => created({ data })),
    );
    const password = crypto.randomUUID();
    await expect(
      acceptInvitation(
        invitationToken(),
        {
          username: "example",
          password,
          passwordConfirmation: password,
          language: "en-US",
          country: "US",
          timeZone: "UTC",
        },
        crypto.randomUUID(),
      ),
    ).rejects.toBeInstanceOf(ApiProtocolError);
  });
});
