import type { Page, Route } from "@playwright/test";
import { courseBackend, courseRoutes } from "./courseFixtures";
import { routeSecretFixture } from "./routeSecretHygiene";
import {
  materialBriefSchema,
  type MaterialBrief,
} from "../src/platform/api/materialBrief";

export async function materialBackend(
  page: Page,
  options: {
    lifecycle?: boolean;
    course?: Awaited<ReturnType<typeof courseRoutes>>;
    enforceValidRequests?: boolean;
  } = {},
) {
  const course = options.course ?? (await courseBackend(page));
  course.scopeIds = ["course_1"];
  const fixture = routeSecretFixture(page);
  const control = {
    course,
    creates: 0,
    uploads: 0,
    deletes: 0,
    reads: 0,
    fileReads: 0,
    persisted: false,
    scope: "course-wide",
    state: "draft",
    relatedCourse: "course_1",
    validCreate: true,
    validMultipart: true,
    forbidden: 0,
    finalizes: 0,
    saves: 0,
    approvals: 0,
    revokes: 0,
    jobReads: 0,
    jobState: null as "queued" | "running" | "failed" | null,
    jobRelease: null as Promise<void> | null,
    approved: false,
    brief: null as MaterialBrief | null,
    briefSource: null as "generated" | "supervisor" | null,
    updated: null as string | null,
    lifecycleValid: true,
    lifecycleOutcome: "success" as
      "success" | "lose" | "reject" | "hidden" | "malformed",
    lifecycleRelease: null as Promise<void> | null,
    createOutcome: "success" as "success" | "lose" | "reject",
    uploadOutcome: "success" as
      "success" | "lose" | "reject" | "hidden" | "conflict" | "csrf",
    deleteOutcome: "success" as
      "success" | "lose" | "reject" | "not-acceptable",
    deleteRelease: null as Promise<void> | null,
    release: null as Promise<void> | null,
    files: [] as string[],
    admissionLedger: [] as string[],
    readFailure: null as {
      path: "material" | "files";
      outcome: "http" | "transport";
    } | null,
  };
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
  const material = (scope = control.scope, id = "material_1") => ({
    type: "materials",
    id,
    attributes: {
      name: fixture.courseName,
      scope,
      kind: "worksheet",
      format: "pdf",
      state: control.state,
      approved: control.approved,
      brief: control.brief,
      brief_source: control.briefSource,
      brief_updated_at: control.updated,
      approved_at: control.approved ? control.updated : null,
      failure_code: null,
      created_at: "2026-10-09T10:00:00.000000Z",
      updated_at: control.updated,
    },
    relationships: {
      course: { data: { type: "courses", id: control.relatedCourse } },
    },
  });
  const file = (id: string) => ({
    type: "material-files",
    id,
    attributes: {
      original_filename: `${fixture.courseName}.pdf`,
      media_type: "application/pdf",
      size_bytes: Buffer.byteLength(fixture.teachingText),
      page_count: 1,
      state:
        control.state === "ready"
          ? "processed"
          : control.state === "processing"
            ? "processing"
            : control.state === "failed"
              ? "failed"
              : "draft",
      failure_code: null,
    },
    relationships: {
      material: { data: { type: "materials", id: "material_1" } },
    },
  });
  await page.route(
    /\/api\/v1\/courses\/course_1\/materials(?:\?|$)/,
    (route) => {
      if (route.request().method() === "POST") {
        control.creates++;
        control.validCreate &&=
          JSON.stringify(route.request().postDataJSON()) ===
            JSON.stringify({
              data: {
                type: "materials",
                attributes: {
                  name: fixture.courseName,
                  kind: "worksheet",
                  format: "pdf",
                  scope: "course-wide",
                },
              },
            }) && route.request().headers()["x-csrf-token"] === fixture.csrf;
        if (options.enforceValidRequests && !control.validCreate)
          return fail(route, 422, "material_invalid");
        if (control.createOutcome === "reject")
          return fail(route, 422, "material_invalid");
        control.persisted = true;
        if (control.createOutcome === "lose") return route.abort();
        return json(route, { data: material() }, 201);
      }
      control.reads++;
      const query = new URL(route.request().url()).searchParams;
      const offset = query.get("page[offset]");
      control.validCreate &&=
        query.size === 2 && query.get("page[limit]") === "25";
      return json(route, {
        data: control.persisted
          ? [material(), material("student-private", "private_1")]
          : [],
        meta: { has_more: offset === "0" && control.persisted },
        links:
          offset === "0" && control.persisted
            ? {
                next: "/api/v1/courses/course_1/materials?page[limit]=25&page[offset]=25",
              }
            : offset === "25"
              ? {
                  prev: "/api/v1/courses/course_1/materials?page[limit]=25&page[offset]=0",
                }
              : {},
      });
    },
  );
  let revision = 0;
  const mutate = async (
    route: Route,
    operation: "save" | "finalize" | "approve" | "revoke",
  ) => {
    if (control.lifecycleRelease) await control.lifecycleRelease;
    if (control.lifecycleOutcome === "hidden")
      return fail(route, 404, "material_not_found");
    if (control.lifecycleOutcome === "reject")
      return fail(route, 409, "material_invalid_state");
    if (operation === "save") {
      const input: unknown = route.request().postDataJSON();
      const attrs =
        typeof input === "object" &&
        input !== null &&
        "data" in input &&
        typeof input.data === "object" &&
        input.data !== null &&
        "attributes" in input.data
          ? input.data.attributes
          : null;
      const requested =
        typeof attrs === "object" && attrs !== null && "brief" in attrs
          ? attrs.brief
          : null;
      if (typeof requested !== "object" || requested === null) {
        control.lifecycleValid = false;
        return fail(route, 422, "material_invalid");
      }
      const parsed = materialBriefSchema.safeParse({
        learning_goals: null,
        sections: null,
        warnings: null,
        educational_level: null,
        ...requested,
      });
      if (!parsed.success) {
        control.lifecycleValid = false;
        return fail(route, 422, "material_invalid");
      }
      if (JSON.stringify(control.brief) !== JSON.stringify(parsed.data))
        control.approved = false;
      control.brief = parsed.data;
      control.briefSource = "supervisor";
    } else if (operation === "finalize") control.state = "processing";
    else control.approved = operation === "approve";
    control.updated = `2026-10-09T10:00:${String(++revision).padStart(2, "0")}.000000Z`;
    if (control.lifecycleOutcome === "lose") return route.abort();
    if (control.lifecycleOutcome === "malformed")
      return json(route, { data: null });
    return json(route, { data: material() });
  };
  await page.route("**/api/v1/materials/material_1", (route) => {
    if (route.request().method() === "PATCH" && options.lifecycle) {
      control.saves++;
      const body: unknown = route.request().postDataJSON();
      control.lifecycleValid &&=
        typeof body === "object" &&
        body !== null &&
        "data" in body &&
        typeof body.data === "object" &&
        body.data !== null &&
        "type" in body.data &&
        body.data.type === "materials" &&
        "id" in body.data &&
        body.data.id === "material_1" &&
        route.request().headers()["x-csrf-token"] === fixture.csrf;
      if (options.enforceValidRequests && !control.lifecycleValid)
        return fail(route, 422, "material_invalid");
      return mutate(route, "save");
    }
    control.reads++;
    if (control.readFailure?.path === "material")
      return control.readFailure.outcome === "transport"
        ? route.abort()
        : fail(route, 500, "internal_error");
    return json(route, { data: material() });
  });
  if (options.lifecycle) {
    await page.route(
      "**/api/v1/materials/material_1/finalizations",
      (route) => {
        control.finalizes++;
        control.lifecycleValid &&=
          route.request().method() === "POST" &&
          route.request().postData() === null &&
          route.request().headers()["x-csrf-token"] === fixture.csrf;
        if (options.enforceValidRequests && !control.lifecycleValid)
          return fail(route, 422, "material_invalid");
        return mutate(route, "finalize");
      },
    );
    await page.route("**/api/v1/materials/material_1/approvals", (route) => {
      const approve = route.request().method() === "POST";
      if (approve) control.approvals++;
      else control.revokes++;
      control.lifecycleValid &&=
        (approve || route.request().method() === "DELETE") &&
        route.request().postData() === null &&
        route.request().headers()["x-csrf-token"] === fixture.csrf;
      if (options.enforceValidRequests && !control.lifecycleValid)
        return fail(route, 422, "material_invalid");
      return mutate(route, approve ? "approve" : "revoke");
    });
    await page.route(
      /\/api\/v1\/materials\/material_1\/jobs\?/,
      async (route) => {
        control.jobReads++;
        if (control.jobRelease) await control.jobRelease;
        const offset = new URL(route.request().url()).searchParams.get(
          "page[offset]",
        );
        return json(route, {
          data: [
            {
              type: "jobs",
              id: offset === "0" ? "job_1" : "job_2",
              attributes: {
                job_type: "material-brief",
                subject_type: "material",
                subject_id: "material_1",
                state:
                  control.jobState ??
                  (control.state === "ready"
                    ? "succeeded"
                    : offset === "0"
                      ? "queued"
                      : "running"),
                attempt_count: 1,
                created_at: "2026-10-09T10:00:00.000000Z",
                started_at: null,
                finished_at: null,
              },
            },
          ],
          meta: { has_more: offset === "0" },
          links:
            offset === "0"
              ? {
                  next: "/api/v1/materials/material_1/jobs?page[limit]=25&page[offset]=25",
                }
              : {
                  prev: "/api/v1/materials/material_1/jobs?page[limit]=25&page[offset]=0",
                },
        });
      },
    );
  }
  await page.route("**/api/v1/materials/material_1/files", async (route) => {
    if (route.request().method() === "POST") {
      control.uploads++;
      const body = route.request().postDataBuffer()?.toString("utf8") ?? "";
      const headers = route.request().headers();
      control.validMultipart &&=
        (body.match(/name="file";/gu) ?? []).length === 1 &&
        body.includes(fixture.teachingText) &&
        body.includes(`${fixture.courseName}.pdf`) &&
        headers["content-type"]?.startsWith(
          "multipart/form-data; boundary=",
        ) === true &&
        headers["x-csrf-token"] === fixture.csrf;
      if (options.enforceValidRequests && !control.validMultipart)
        return fail(route, 422, "material_invalid");
      if (control.release) await control.release;
      if (control.uploadOutcome === "hidden")
        return fail(route, 404, "material_not_found");
      if (control.uploadOutcome === "csrf")
        return fail(route, 403, "csrf_invalid");
      if (control.uploadOutcome === "reject")
        return fail(route, 422, "material_invalid");
      if (control.uploadOutcome === "conflict") {
        control.state = "processing";
        return fail(route, 409, "material_invalid_state");
      }
      const id = `file_${control.files.length + 1}`;
      control.files.push(id);
      if (control.uploadOutcome === "lose") return route.abort();
      return json(route, { data: file(id) }, 201);
    }
    control.fileReads++;
    if (control.readFailure?.path === "files")
      return control.readFailure.outcome === "transport"
        ? route.abort()
        : fail(route, 500, "internal_error");
    return json(route, { data: control.files.map(file) });
  });
  await page.route(/\/api\/v1\/material-files\/file_\d+$/, async (route) => {
    control.deletes++;
    if (control.deleteRelease) await control.deleteRelease;
    if (control.deleteOutcome === "not-acceptable")
      return fail(route, 406, "not_acceptable");
    if (control.deleteOutcome === "reject")
      return fail(route, 409, "material_invalid_state");
    const id = new URL(route.request().url()).pathname.split("/").at(-1);
    control.files = control.files.filter((candidate) => candidate !== id);
    if (control.state === "failed") control.state = "draft";
    if (control.deleteOutcome === "lose") return route.abort();
    return route.fulfill({
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  });
  page.on("request", (request) => {
    if (request.method() === "GET") {
      const path = new URL(request.url()).pathname;
      const operations: Record<string, string> = {
        "/api/v1/auth/session": "session",
        "/api/v1/users/me/capabilities": "capabilities",
        "/api/v1/courses/course_1": "course",
        "/api/v1/materials/material_1": "material",
        "/api/v1/materials/material_1/files": "files",
      };
      const operation = operations[path];
      if (operation !== undefined) control.admissionLedger.push(operation);
    }
    if (
      (options.lifecycle
        ? /\/brief|\/content|\/download|\/activations/u
        : /\/finalizations|\/jobs|\/brief|\/approvals|\/content|\/download|\/activations/u
      ).test(new URL(request.url()).pathname)
    )
      control.forbidden++;
  });
  return Object.assign(control, {
    makeReady: () => {
      if (
        options.enforceValidRequests &&
        (!control.validCreate ||
          !control.validMultipart ||
          !control.lifecycleValid ||
          control.state !== "processing" ||
          control.files.length === 0)
      )
        throw new Error("Invalid fake material processing preconditions.");
      control.state = "ready";
      control.briefSource = "generated";
      control.brief = {
        version: 1,
        summary: fixture.teachingText,
        subjects: [fixture.courseName],
        learning_goals: [fixture.teachingText],
        sections: [
          {
            sequence: 1,
            label: null,
            title: fixture.courseName,
            description: fixture.teachingText,
            search_terms: [],
          },
        ],
        warnings: [],
        educational_level: null,
      };
    },
  });
}
