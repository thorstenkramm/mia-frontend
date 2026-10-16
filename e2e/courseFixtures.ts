import type { Page, Route } from "@playwright/test";
import { routeBackend } from "./routeFixtures";
import { routeSecretFixture } from "./routeTestFixtures";

export async function courseBackend(page: Page) {
  const base = await routeBackend(page);
  return Object.assign(await courseRoutes(page), { base });
}
export async function courseRoutes(page: Page) {
  const fixture = routeSecretFixture(page);
  const control = {
    accountId: "account-id",
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
    patches: 0,
    expectedPatch: null as Record<string, string | null> | null,
    patchValid: false,
    patchOutcome: "success" as
      "success" | "lose" | "reject" | "malformed" | "server-error",
    patchRelease: null as Promise<void> | null,
    readUnavailable: false,
    readRelease: null as Promise<void> | null,
    courseState: "inactive" as "inactive" | "active",
    activatedAt: null as string | null,
    deactivatedAt: null as string | null,
    activationEligible: false,
    activationBlockers: [
      "learning_goals",
      "ai_tutor_instructions",
      "language",
      "qualifying_material",
    ] as string[],
    activations: 0,
    activationValid: false,
    activationOutcome: "success" as
      | "success"
      | "conflict"
      | "already-active"
      | "lose"
      | "malformed"
      | "server-error"
      | "csrf"
      | "expired"
      | "restricted",
    activationReadiness: "active_accepting" as
      "active_accepting" | "active_not_accepting",
    activationRelease: null as Promise<void> | null,
    name: fixture.courseName,
    readiness: "inactive_incomplete" as
      | "inactive_incomplete"
      | "inactive_activatable"
      | "active_accepting"
      | "active_not_accepting",
    blockers: [
      { id: "learning_goals", link: "/api/v1/courses/course_1" },
      { id: "ai_tutor_instructions", link: "/api/v1/courses/course_1" },
      { id: "language", link: "/api/v1/courses/course_1" },
      { id: "qualifying_material", link: "/api/v1/courses/course_1/materials" },
    ] as { id: string; link: string | null }[],
    teaching: {
      description: null,
      curriculum: null,
      learning_goals: null,
      ai_tutor_instructions: null,
      language: null,
    } as Record<string, string | null>,
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
      name: control.name,
      state: control.courseState,
      created_at: "2026-10-08T10:00:00.000000Z",
      ...control.teaching,
      activated_at: control.activatedAt,
      deactivated_at: control.deactivatedAt,
      updated_at: null,
      logo_url: null,
      readiness: {
        state: control.readiness,
        blockers: control.blockers,
        activation: {
          eligible: control.activationEligible,
          blockers: control.activationBlockers,
          consequences: ["activate_course"],
        },
        new_session: {
          eligible: false,
          blockers: ["course_membership_required"],
          consequences: ["start_tutoring_session"],
        },
      },
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
    if (path.startsWith("/api/v1/courses/") && request.method() === "GET")
      control.detailReads.push(path.slice("/api/v1/courses/".length));
    if (path.startsWith("/api/v1/courses/") && request.method() === "PATCH")
      control.patches++;
    if (
      path === "/api/v1/courses/course_1/activations" &&
      request.method() === "POST"
    )
      control.activations++;
  });
  await page.route("**/api/v1/users/me/capabilities", (route) =>
    json(route, {
      data: {
        type: "account-capabilities",
        id: control.accountId,
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
  await page.route("**/api/v1/courses/*", async (route) => {
    if (control.denial) return fail(route, 404, "course_not_found");
    const id = new URL(route.request().url()).pathname.split("/").at(-1);
    if (route.request().method() === "PATCH") {
      control.patchValid =
        control.expectedPatch !== null &&
        Object.keys(control.expectedPatch).length === 1 &&
        Object.keys(control.expectedPatch).every(
          (key) => key in control.teaching,
        ) &&
        JSON.stringify(route.request().postDataJSON()) ===
          JSON.stringify({
            data: { type: "courses", id, attributes: control.expectedPatch },
          }) &&
        route.request().headers()["x-csrf-token"] === fixture.csrf;
      if (control.patchRelease) await control.patchRelease;
      if (control.denial) return fail(route, 404, "course_not_found");
      if (!control.patchValid || control.patchOutcome === "reject")
        return fail(route, 422, "course_invalid");
      if (control.patchOutcome === "server-error")
        return fail(route, 503, "course_readiness_unavailable");
      for (const [key, value] of Object.entries(control.expectedPatch ?? {}))
        control.teaching[key] = value?.trim().normalize("NFC") ?? null;
      if (control.patchOutcome === "lose") return route.abort("failed");
      return json(
        route,
        control.patchOutcome === "malformed"
          ? { data: null }
          : { data: resource(id) },
      );
    }
    if (control.readRelease) await control.readRelease;
    if (control.denial) return fail(route, 404, "course_not_found");
    return control.readUnavailable
      ? fail(route, 503, "course_readiness_unavailable")
      : json(route, { data: resource(id) });
  });
  await page.route("**/api/v1/courses/course_1/activations", async (route) => {
    const request = route.request();
    control.activationValid =
      request.method() === "POST" &&
      request.postData() === null &&
      request.headers()["accept"] === "application/vnd.api+json" &&
      request.headers()["x-csrf-token"] === fixture.csrf &&
      request.headers()["content-type"] === undefined &&
      request.headers()["if-match"] === undefined;
    if (control.activationRelease) await control.activationRelease;
    if (control.denial) return fail(route, 404, "course_not_found");
    if (control.activationOutcome === "conflict")
      return fail(route, 409, "course_activation_unavailable");
    if (control.activationOutcome === "already-active")
      return fail(route, 409, "course_invalid_state");
    if (control.activationOutcome === "csrf")
      return fail(route, 403, "csrf_invalid");
    if (control.activationOutcome === "expired")
      return fail(route, 401, "unauthorized");
    if (control.activationOutcome === "restricted")
      return fail(route, 403, "auth_password_change_required");
    if (control.activationOutcome === "server-error")
      return fail(route, 503, "unavailable");
    control.courseState = "active";
    control.activatedAt = "2026-10-09T12:00:00.000000Z";
    control.readiness = control.activationReadiness;
    control.activationEligible = false;
    control.activationBlockers = ["course_already_active"];
    if (control.readiness === "active_not_accepting")
      control.blockers = [
        {
          id: "qualifying_material",
          link: "/api/v1/courses/course_1/materials",
        },
      ];
    if (control.activationOutcome === "lose") return route.abort("failed");
    return json(
      route,
      control.activationOutcome === "malformed"
        ? { data: null }
        : { data: resource() },
    );
  });
  return control;
}
