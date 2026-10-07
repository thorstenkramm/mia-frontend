import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/server";
import { ApiHttpError, ApiProtocolError, jsonApiMediaType } from "./client";
import type { StrongETag } from "./client";
import {
  createSupervisorInvitation,
  getInvitation,
  isHiddenInvitationFailure,
  listInvitations,
  resendInvitation,
  revokeInvitation,
  toInvitationId,
} from "./invitations";

const etag = `"${"c".repeat(64)}"` as StrongETag;
const id = toInvitationId("inv_1");

function invitation(overrides: Record<string, unknown> = {}) {
  return {
    type: "invitations",
    id: "inv_1",
    attributes: {
      email: `invitee-${crypto.randomUUID()}@example.test`,
      role: "supervisor",
      status: "pending",
      delivery_state: "ambiguous",
      delivery_code: "invitation_delivery_timeout",
      delivery_attempted_at: "2026-09-27T09:00:00.000000Z",
      created_at: "2026-09-27T08:00:00.000000Z",
      updated_at: "2026-09-27T09:00:00.000000Z",
      ...overrides,
    },
  };
}

function json(body: unknown, init: ResponseInit = {}) {
  return HttpResponse.json(body as never, {
    ...init,
    headers: { "Content-Type": jsonApiMediaType, ...init.headers },
  });
}

const signal = () => new AbortController().signal;

describe("invitation transport", () => {
  it("keeps pending lifecycle and ambiguous delivery distinct with the reviewed ETag", async () => {
    server.use(
      http.get("/api/v1/invitations/inv_1", () =>
        json({ data: invitation() }, { headers: { ETag: etag } }),
      ),
    );
    const reviewed = await getInvitation(id, signal());
    expect(reviewed.etag).toBe(etag);
    expect(reviewed.invitation).toMatchObject({
      id,
      status: "pending",
      deliveryState: "ambiguous",
      deliveryCode: "invitation_delivery_timeout",
      deliveryAttemptedAt: Date.parse("2026-09-27T09:00:00.000Z"),
      failureCode: null,
    });
  });

  it.each([null, 'W/"abc"', `"${"c".repeat(63)}"`])(
    "rejects a detail read whose validator is %s",
    async (value) => {
      server.use(
        http.get("/api/v1/invitations/inv_1", () =>
          json(
            { data: invitation() },
            value === null ? {} : { headers: { ETag: value } },
          ),
        ),
      );
      await expect(getInvitation(id, signal())).rejects.toBeInstanceOf(
        ApiProtocolError,
      );
    },
  );

  it("rejects a detail read for a different invitation", async () => {
    server.use(
      http.get("/api/v1/invitations/inv_1", () =>
        json(
          { data: { ...invitation(), id: "inv_2" } },
          { headers: { ETag: etag } },
        ),
      ),
    );
    await expect(getInvitation(id, signal())).rejects.toBeInstanceOf(
      ApiProtocolError,
    );
  });

  it("requests a bounded page and follows only canonical collection links", async () => {
    const requested: string[] = [];
    server.use(
      http.get("/api/v1/invitations", ({ request }) => {
        requested.push(new URL(request.url).search);
        return json({
          data: [invitation()],
          meta: { has_more: true },
          links: {
            prev: "/api/v1/invitations?page%5Blimit%5D=25&page%5Boffset%5D=0",
            next: "/api/v1/invitations?page%5Blimit%5D=25&page%5Boffset%5D=50",
          },
        });
      }),
    );
    const page = await listInvitations(25, signal());
    expect(requested).toEqual(["?page%5Blimit%5D=25&page%5Boffset%5D=25"]);
    expect(page).toMatchObject({
      offset: 25,
      previousOffset: 0,
      nextOffset: 50,
    });
  });

  it.each([
    "https://elsewhere.example/api/v1/invitations?page%5Blimit%5D=25&page%5Boffset%5D=25",
    "//elsewhere.example/api/v1/invitations?page%5Blimit%5D=25&page%5Boffset%5D=25",
    "/api/v1/users?page%5Blimit%5D=25&page%5Boffset%5D=25",
    "/api/v1/invitations?page%5Blimit%5D=100&page%5Boffset%5D=25",
    "/api/v1/invitations?page%5Blimit%5D=25&page%5Boffset%5D=25&filter=x",
    "/api/v1/invitations?page%5Blimit%5D=25&page%5Boffset%5D=-25",
    "/api/v1/invitations?page%5Blimit%5D=25&page%5Boffset%5D=0",
  ])("rejects the next link %s", async (next) => {
    server.use(
      http.get("/api/v1/invitations", () =>
        json({ data: [], meta: { has_more: true }, links: { next } }),
      ),
    );
    await expect(listInvitations(0, signal())).rejects.toBeInstanceOf(
      ApiProtocolError,
    );
  });

  it("creates only a supervisor invitation for the entered address", async () => {
    const observations: { bodyMatches: boolean; csrfMatches: boolean }[] = [];
    const address =
      process.env.MIA_INVITATION_UNIT_EMAIL ??
      `invitee-${crypto.randomUUID()}@example.test`;
    const csrf = process.env.MIA_INVITATION_UNIT_CSRF ?? crypto.randomUUID();
    server.use(
      http.post("/api/v1/invitations", async ({ request }) => {
        const body = await request.json();
        observations.push({
          bodyMatches:
            JSON.stringify(body) ===
            JSON.stringify({
              data: {
                type: "invitations",
                attributes: { email: address, role: "supervisor" },
              },
            }),
          csrfMatches: request.headers.get("X-CSRF-Token") === csrf,
        });
        return json(
          {
            data: invitation({
              email: address,
              delivery_state: "queued",
              delivery_code: null,
              delivery_attempted_at: null,
            }),
          },
          { status: 201 },
        );
      }),
    );
    const created = await createSupervisorInvitation(address, csrf);
    expect(observations).toHaveLength(1);
    // The deliberate-failure probe uses this actual request-contract assertion.
    // Only booleans can reach Vitest's original failure formatter.
    expect(observations[0]?.bodyMatches, "Invitation request contract").toBe(
      process.env.MIA_INVITATION_UNIT_FAIL !== "1",
    );
    expect(observations[0]?.csrfMatches).toBe(true);
    expect(created).toMatchObject({
      status: "pending",
      deliveryState: "queued",
      deliveryAttemptedAt: null,
    });
  });

  it("treats a create success other than 201 as a protocol failure", async () => {
    server.use(
      http.post("/api/v1/invitations", () => json({ data: invitation() })),
    );
    await expect(
      createSupervisorInvitation("x@example.test", crypto.randomUUID()),
    ).rejects.toBeInstanceOf(ApiProtocolError);
  });

  it("resends without a body and accepts only 204", async () => {
    let bodyLength = -1;
    server.use(
      http.post("/api/v1/invitations/inv_1/resends", async ({ request }) => {
        bodyLength = (await request.text()).length;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await resendInvitation(id, crypto.randomUUID());
    expect(bodyLength).toBe(0);
    server.use(
      http.post("/api/v1/invitations/inv_1/resends", () =>
        json({ data: null }),
      ),
    );
    await expect(
      resendInvitation(id, crypto.randomUUID()),
    ).rejects.toBeInstanceOf(ApiProtocolError);
  });

  it("revokes with the reviewed If-Match and returns the committed effect", async () => {
    const preconditions: (string | null)[] = [];
    server.use(
      http.delete("/api/v1/invitations/inv_1", ({ request }) => {
        preconditions.push(request.headers.get("If-Match"));
        return json({
          data: {
            type: "invitation-deletions",
            id: "invd_1",
            attributes: { invitation_id: "inv_1", effect: "deleted" },
          },
        });
      }),
    );
    expect(await revokeInvitation(id, etag, crypto.randomUUID())).toBe(
      "deleted",
    );
    expect(preconditions).toEqual([etag]);
  });

  it("rejects a deletion result for another invitation", async () => {
    server.use(
      http.delete("/api/v1/invitations/inv_1", () =>
        json({
          data: {
            type: "invitation-deletions",
            id: "invd_1",
            attributes: { invitation_id: "inv_2", effect: "revoked" },
          },
        }),
      ),
    );
    await expect(
      revokeInvitation(id, etag, crypto.randomUUID()),
    ).rejects.toBeInstanceOf(ApiProtocolError);
  });

  it("classifies only declared invitation denials as the hidden result", () => {
    const failure = (status: number, code: string) =>
      new ApiHttpError({
        status,
        body: JSON.stringify({ errors: [{ status: String(status), code }] }),
      });
    expect(
      isHiddenInvitationFailure(failure(404, "invitation_not_found")),
    ).toBe(true);
    expect(
      isHiddenInvitationFailure(failure(403, "invitation_list_unauthorized")),
    ).toBe(true);
    expect(
      isHiddenInvitationFailure(failure(403, "invitation_role_unauthorized")),
    ).toBe(true);
    expect(isHiddenInvitationFailure(failure(403, "csrf_invalid"))).toBe(false);
    expect(isHiddenInvitationFailure(failure(422, "invitation_invalid"))).toBe(
      false,
    );
    expect(isHiddenInvitationFailure(new ApiProtocolError())).toBe(false);
  });
});
