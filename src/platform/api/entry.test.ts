import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/server";
import {
  ApiHttpError,
  ApiProtocolError,
  ApiTransportError,
  jsonApiMediaType,
} from "./client";
import {
  discoverSession,
  getCurrentAccountCapabilities,
  logoutCurrentBrowser,
} from "./entry";

function jsonApiResponse(body: unknown): HttpResponse {
  return HttpResponse.json(body, {
    headers: { "Content-Type": jsonApiMediaType },
    status: 200,
  });
}

describe("entry API boundary", () => {
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
