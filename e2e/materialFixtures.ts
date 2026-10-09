import type { Page, Route } from "@playwright/test";
import { courseBackend } from "./courseFixtures";
import { routeSecretFixture } from "./routeSecretHygiene";

export async function materialBackend(page: Page) {
  const course = await courseBackend(page);
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
      approved: false,
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
      state: "draft",
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
  await page.route("**/api/v1/materials/material_1", (route) => {
    control.reads++;
    if (control.readFailure?.path === "material")
      return control.readFailure.outcome === "transport"
        ? route.abort()
        : fail(route, 500, "internal_error");
    return json(route, { data: material() });
  });
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
      /\/finalizations|\/jobs|\/brief|\/approvals|\/content|\/download|\/activations/u.test(
        new URL(request.url()).pathname,
      )
    )
      control.forbidden++;
  });
  return control;
}
