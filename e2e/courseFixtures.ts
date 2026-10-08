import type { Page, Route } from "@playwright/test";
import { routeBackend } from "./routeFixtures";
import { routeSecretFixture } from "./routeSecretHygiene";

export async function courseBackend(page: Page) {
  const base = await routeBackend(page);
  return Object.assign(await courseRoutes(page), { base });
}
export async function courseRoutes(page: Page) {
  const fixture = routeSecretFixture(page);
  const control = {
    grants: new Set([
      "course_records.manage",
      "courses.create",
      "course_supervisors.manage",
      "accounts.administer",
      "courses.supervise",
    ]),
    scopeIds: [] as string[],
    collectionReads: 0,
    candidateReads: 0,
    detailReads: [] as string[],
    creates: 0,
    validPayload: false,
    validQuery: true,
    persisted: false,
    denial: false,
    candidateDenial: false,
    outcome: "success" as
      | "success"
      | "lose"
      | "reject"
      | "malformed"
      | "server-error"
      | "supervisor-invalid",
    release: null as Promise<void> | null,
  };
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
  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/vnd.api+json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify(body),
    });
  const fail = (route: Route, status: number, code: string) =>
    json(
      route,
      { errors: [{ status: String(status), code, detail: fixture.rawError }] },
      status,
    );
  const resource = (id = "course_1") => ({
    type: "courses",
    id,
    attributes: {
      name: fixture.courseName,
      state: "inactive",
      created_at: "2026-10-08T10:00:00.000000Z",
    },
    relationships: {
      supervisors: { data: [{ type: "users", id: "supervisor_1" }] },
    },
  });
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/courses") {
      if (request.method() === "POST") control.creates++;
      else control.collectionReads++;
    }
    if (path === "/api/v1/users") control.candidateReads++;
    if (path.startsWith("/api/v1/courses/"))
      control.detailReads.push(path.slice("/api/v1/courses/".length));
  });
  await page.route("**/api/v1/users/me/capabilities", (route) =>
    json(route, {
      data: {
        type: "account-capabilities",
        id: "account-id",
        attributes: {
          capabilities: actions.map((action) => ({
            action,
            available: control.grants.has(action),
            scope: {
              global:
                control.grants.has(action) && action !== "courses.supervise",
              course_ids:
                action === "courses.supervise" ? control.scopeIds : [],
              student_ids: [],
              course_students: [],
              own_resource: false,
            },
          })),
        },
      },
    }),
  );
  await page.route(/\/api\/v1\/users\?/, (route) => {
    const query = new URL(route.request().url()).searchParams;
    const offset = Number(query.get("page[offset]"));
    control.validQuery &&=
      query.size === 4 &&
      query.get("filter[role]") === "supervisor" &&
      query.get("filter[state]") === "active" &&
      query.get("page[limit]") === "25";
    if (control.candidateDenial)
      return fail(route, 403, "user_administration_unauthorized");
    const link = (number: number) =>
      `/api/v1/users?filter[role]=supervisor&filter[state]=active&page[limit]=25&page[offset]=${number}`;
    return json(route, {
      data: [
        {
          type: "administration-accounts",
          id: offset === 0 ? "supervisor_1" : "supervisor_2",
          attributes: {
            username:
              offset === 0 ? fixture.supervisorUsername : "second.candidate",
            account_class: "staff",
            account_state: "active",
            permanent_roles: ["supervisor", "student"],
          },
        },
      ],
      meta: { has_more: offset === 0 },
      links: offset === 0 ? { next: link(25) } : { prev: link(0) },
    });
  });
  await page.route(/\/api\/v1\/courses(?:\?|$)/, async (route) => {
    if (route.request().method() === "POST") {
      const body: unknown = route.request().postDataJSON();
      control.validPayload =
        JSON.stringify(body) ===
          JSON.stringify({
            data: {
              type: "courses",
              attributes: { name: fixture.courseName },
              relationships: {
                supervisors: { data: [{ type: "users", id: "supervisor_1" }] },
              },
            },
          }) && route.request().headers()["x-csrf-token"] === fixture.csrf;
      if (control.release) await control.release;
      if (control.outcome === "reject")
        return fail(route, 409, "course_name_taken");
      if (control.outcome === "supervisor-invalid")
        return fail(route, 422, "course_supervisor_invalid");
      if (control.outcome === "server-error")
        return fail(route, 503, "unavailable");
      control.persisted = true;
      if (control.outcome === "lose") return route.abort("failed");
      return json(
        route,
        control.outcome === "malformed" ? { data: null } : { data: resource() },
        201,
      );
    }
    return control.denial
      ? fail(route, 404, "course_not_found")
      : json(route, {
          data: control.persisted ? [resource()] : [],
          meta: { has_more: false },
        });
  });
  await page.route("**/api/v1/courses/*", (route) =>
    control.denial
      ? fail(route, 404, "course_not_found")
      : json(route, {
          data: resource(
            new URL(route.request().url()).pathname.split("/").at(-1),
          ),
        }),
  );
  return control;
}
