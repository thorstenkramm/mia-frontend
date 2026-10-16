import type { Page, Route } from "@playwright/test";
import { routeBackend } from "./routeFixtures";
import { routeSecretFixture } from "./routeTestFixtures";

const mediaType = "application/vnd.api+json";
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
export const etagA = `"${"a".repeat(64)}"`;
export const etagB = `"${"b".repeat(64)}"`;

export type InvitationRecord = {
  id: string;
  email: string;
  role: "administrator" | "supervisor" | "mentor";
  status: "pending" | "accepted" | "revoked" | "faulty";
  deliveryState: "queued" | "delivered" | "ambiguous" | "failed";
  deliveryCode:
    | "invitation_delivery_timeout"
    | "invitation_delivery_ambiguous"
    | "invitation_delivery_rejected"
    | null;
  attempted: boolean;
  etag: string;
};

type Outcome = "success" | "fail" | "lose";

// A local OpenAPI protocol fake for administrator invitation management. Its
// ledger and counters record operation names and actual dispatches observed by
// the browser only; no bodies, headers, or fixture values are retained.
export async function invitationBackend(page: Page) {
  const base = await routeBackend(page);
  return Object.assign(await invitationRoutes(page), { base });
}

// The invitation routes alone, for a page whose base session fake is already
// installed (for example by the browser-zoom harness).
export async function invitationRoutes(page: Page) {
  const fixture = routeSecretFixture(page);
  const control = {
    invitations: [] as InvitationRecord[],
    ledger: [] as string[],
    dispatches: { create: 0, resend: 0, delete: 0 },
    // Boolean observations of the contract-relevant request content.
    createdSupervisorForFixtureAddress: [] as boolean[],
    reviewedPreconditions: [] as boolean[],
    createOutcome: "success" as Outcome,
    resendOutcome: "success" as Outcome,
    deleteOutcome: "success" as Outcome,
    // Applied after the next detail read is answered.
    afterRead: null as null | (() => void),
  };
  page.on("request", (request) => {
    const { pathname } = new URL(request.url());
    if (request.method() === "POST" && pathname === "/api/v1/invitations")
      control.dispatches.create++;
    if (request.method() === "POST" && pathname.endsWith("/resends"))
      control.dispatches.resend++;
    if (
      request.method() === "DELETE" &&
      pathname.startsWith("/api/v1/invitations/")
    )
      control.dispatches.delete++;
  });
  const json = (route: Route, body: unknown, status = 200, etag?: string) =>
    route.fulfill({
      status,
      contentType: mediaType,
      headers: etag === undefined ? {} : { ETag: etag },
      body: JSON.stringify(body),
    });
  const failure = (route: Route, status: number, code: string) =>
    route.fulfill({
      status,
      contentType: mediaType,
      body: JSON.stringify({
        errors: [{ status: String(status), code, detail: fixture.rawError }],
      }),
    });
  const resource = (record: InvitationRecord) => ({
    type: "invitations",
    id: record.id,
    attributes: {
      email: record.email,
      role: record.role,
      status: record.status,
      ...(record.status === "faulty"
        ? { failure_code: "invitation_delivery_rejected" }
        : {}),
      delivery_state: record.deliveryState,
      delivery_code: record.deliveryCode,
      delivery_attempted_at: record.attempted
        ? "2026-10-07T09:00:00.000000Z"
        : null,
      created_at: "2026-10-07T08:00:00.000000Z",
      updated_at: "2026-10-07T09:00:00.000000Z",
    },
  });
  const find = (id: string) =>
    control.invitations.find((record) => record.id === id);

  await page.route("**/api/v1/users/me/capabilities", (route) =>
    json(route, {
      data: {
        type: "account-capabilities",
        id: "account-id",
        attributes: {
          capabilities: actions.map((action) => ({
            action,
            available:
              action === "profile.view" || action === "accounts.administer",
            scope: {
              global: action === "accounts.administer",
              course_ids: [],
              student_ids: [],
              course_students: [],
              own_resource: action === "profile.view",
            },
          })),
        },
      },
    }),
  );
  await page.route(/\/api\/v1\/invitations(\?.*)?$/u, async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      control.ledger.push("list");
      return json(route, {
        data: control.invitations.map(resource),
        meta: { has_more: false },
      });
    }
    control.ledger.push("create");
    const body = request.postDataJSON() as {
      data: { attributes: { email: string; role: string } };
    };
    control.createdSupervisorForFixtureAddress.push(
      body.data.attributes.role === "supervisor" &&
        body.data.attributes.email === fixture.email,
    );
    if (control.createOutcome === "fail")
      return failure(route, 500, "internal_error");
    if (control.createOutcome === "lose") return route.abort("failed");
    const record: InvitationRecord = {
      id: `inv_${control.invitations.length + 1}`,
      email: body.data.attributes.email,
      role: "supervisor",
      status: "pending",
      deliveryState: "queued",
      deliveryCode: null,
      attempted: false,
      etag: etagA,
    };
    control.invitations.unshift(record);
    return json(route, { data: resource(record) }, 201, record.etag);
  });
  await page.route(/\/api\/v1\/invitations\/[^/]+$/u, async (route) => {
    const request = route.request();
    const id = decodeURIComponent(
      new URL(request.url()).pathname.split("/").at(-1) ?? "",
    );
    const record = find(id);
    if (request.method() === "GET") {
      control.ledger.push("read");
      if (record === undefined)
        return failure(route, 404, "invitation_not_found");
      await json(route, { data: resource(record) }, 200, record.etag);
      const after = control.afterRead;
      control.afterRead = null;
      after?.();
      return;
    }
    control.ledger.push("delete");
    control.reviewedPreconditions.push(
      record !== undefined && request.headers()["if-match"] === record.etag,
    );
    if (control.deleteOutcome === "lose") return route.abort("failed");
    if (record === undefined)
      return failure(route, 404, "invitation_not_found");
    if (request.headers()["if-match"] !== record.etag)
      return failure(route, 412, "invitation_precondition_failed");
    record.status = "revoked";
    record.etag = etagB;
    return json(route, {
      data: {
        type: "invitation-deletions",
        id: "invd_1",
        attributes: { invitation_id: id, effect: "revoked" },
      },
    });
  });
  await page.route(/\/api\/v1\/invitations\/[^/]+\/resends$/u, (route) => {
    control.ledger.push("resend");
    if (control.resendOutcome === "fail")
      return failure(route, 502, "bad_gateway");
    if (control.resendOutcome === "lose") return route.abort("failed");
    return route.fulfill({ status: 204 });
  });
  return control;
}

export function invitationRecord(
  page: Page,
  overrides: Partial<InvitationRecord> & { id: string },
): InvitationRecord {
  return {
    email: routeSecretFixture(page).email,
    role: "supervisor",
    status: "pending",
    deliveryState: "queued",
    deliveryCode: null,
    attempted: false,
    etag: etagA,
    ...overrides,
  };
}
