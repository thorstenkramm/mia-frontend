import type { Page, Route } from "@playwright/test";
import {
  learnCapabilities,
  learnCourseDocument,
  learnMaterialRow,
} from "../test/learnFixtures";
import { routeBackend } from "./routeFixtures";
import { routeSecretFixture } from "./routeSecretHygiene";

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/vnd.api+json",
    headers: { "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  });
export async function learnResources(
  page: Page,
  account = "account-id",
  staff = true,
) {
  const fixture = routeSecretFixture(page);
  const control = {
    ids: ["course_1"],
    available: true,
    active: true,
    accepting: false,
    deny: 0,
    materialDeny: false,
    fail: false,
    many: false,
    filteredEmpty: false,
    courseReads: 0,
    materialReads: 0,
    forbidden: 0,
    offsets: [] as number[],
    holdCourse: null as Promise<void> | null,
    holdCapabilities: null as Promise<void> | null,
    capabilities: 0,
  };
  await page.route("**/api/v1/users/me/capabilities", async (route) => {
    control.capabilities++;
    if (control.holdCapabilities) await control.holdCapabilities;
    return json(
      route,
      learnCapabilities(control.ids, control.available, account, staff),
    );
  });
  await page.route(/\/api\/v1\/courses\/[^/?]+$/u, async (route) => {
    control.courseReads++;
    const id = new URL(route.request().url()).pathname.split("/").at(-1) ?? "";
    if (id === "staff_only") control.forbidden++;
    if (control.holdCourse) await control.holdCourse;
    if (control.deny || control.fail)
      return json(
        route,
        { errors: [{ code: "course_not_found", detail: fixture.rawError }] },
        control.deny || 503,
      );
    return json(
      route,
      learnCourseDocument(
        fixture.courseName,
        fixture.teachingText,
        id,
        control.many
          ? id === "c25"
            ? "active"
            : "inactive"
          : control.active
            ? "active"
            : "inactive",
        control.accepting,
      ),
    );
  });
  await page.route(
    /\/api\/v1\/courses\/[^/?]+\/materials(?:\?|$)/u,
    (route) => {
      control.materialReads++;
      if (control.materialDeny)
        return json(
          route,
          {
            errors: [{ code: "material_not_found", detail: fixture.rawError }],
          },
          404,
        );
      const offset = Number(
        new URL(route.request().url()).searchParams.get("page[offset]"),
      );
      control.offsets.push(offset);
      return json(route, {
        data:
          offset === 0
            ? [
                learnMaterialRow(
                  fixture.courseName,
                  fixture.teachingText,
                  "file",
                  "course_1",
                  control.filteredEmpty ? "student-private" : "course-wide",
                ),
                learnMaterialRow(
                  fixture.courseName,
                  fixture.teachingText,
                  "link",
                  "course_1",
                  control.filteredEmpty ? "student-private" : "course-wide",
                  "ready",
                  true,
                  "link",
                ),
                learnMaterialRow(
                  fixture.rawError,
                  fixture.teachingText,
                  "private",
                  "course_1",
                  "student-private",
                ),
                learnMaterialRow(
                  fixture.rawError,
                  fixture.teachingText,
                  "unapproved",
                  "course_1",
                  "course-wide",
                  "ready",
                  false,
                ),
                learnMaterialRow(
                  fixture.rawError,
                  fixture.teachingText,
                  "processing",
                  "course_1",
                  "course-wide",
                  "processing",
                ),
              ]
            : [
                learnMaterialRow(
                  fixture.courseName,
                  fixture.teachingText,
                  "later",
                ),
              ],
        meta: { has_more: offset === 0 },
        links:
          offset === 0
            ? {
                next: "/api/v1/courses/course_1/materials?page[limit]=25&page[offset]=25",
              }
            : {
                prev: "/api/v1/courses/course_1/materials?page[limit]=25&page[offset]=0",
              },
      });
    },
  );
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (
      [
        "/api/v1/auth/login",
        "/api/v1/auth/password-changes",
        "/api/v1/auth/logout",
      ].includes(path)
    )
      return;
    if (
      path.startsWith("/api/") &&
      (request.method() !== "GET" ||
        ![
          /^\/api\/v1\/auth\/session$/u,
          /^\/api\/v1\/users\/me\/capabilities$/u,
          /^\/api\/v1\/courses\/[^/]+(?:\/materials)?$/u,
        ].some((pattern) => pattern.test(path)))
    )
      control.forbidden++;
  });
  return control;
}
export async function learnBackend(page: Page) {
  await routeBackend(page);
  return learnResources(page);
}
