import type { Page, Route } from "@playwright/test";
import {
  learnCapabilities,
  learnCourseDocument,
  learnMaterialRow,
} from "../test/learnFixtures";
import {
  activeTutoringSessionDocument,
  tutoringSessionDocument,
  tutoringTurn,
  tutoringTurnsPage,
} from "../test/tutoringFixtures";
import { routeBackend } from "./routeFixtures";
import { routeSecretFixture } from "./routeSecretHygiene";

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/vnd.api+json",
    headers: { "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  });

// The Story 6.1 tutoring envelope on the shared route fake: BCG-002 discovery,
// the learner course/material reads, one request-ID-bound creation and the
// session/transcript reads. The ledger and counters carry operation names and
// counts only; request IDs are captured for identity equality, never logged.
export async function tutoringResources(page: Page) {
  const fixture = routeSecretFixture(page);
  const control = {
    ids: ["course_1"],
    available: true,
    accepting: true,
    activeSession: false,
    sessionState: "active" as "active" | "completed",
    outcome: "created",
    createOnPost: false,
    denyCourse: 0,
    denyDiscovery: 0,
    denySession: 0,
    courseReads: 0,
    discoveryReads: 0,
    materialReads: 0,
    sessionReads: 0,
    turnReads: 0,
    starts: 0,
    forbidden: 0,
    requestIds: [] as string[],
    materialsSent: [] as string[],
    holdPost: null as Promise<void> | null,
  };
  const fail = (route: Route, status: number, code: string) =>
    json(
      route,
      { errors: [{ status: String(status), code, detail: fixture.rawError }] },
      status,
    );
  await page.route("**/api/v1/users/me/capabilities", (route) =>
    json(route, learnCapabilities(control.ids, control.available)),
  );
  await page.route("**/api/v1/users/me/active-tutoring-session", (route) => {
    control.discoveryReads++;
    if (control.denyDiscovery)
      return fail(route, control.denyDiscovery, "tutoring_unavailable");
    return json(
      route,
      control.activeSession
        ? activeTutoringSessionDocument(fixture.courseName, fixture.rawError)
        : { data: null },
    );
  });
  await page.route(/\/api\/v1\/courses\/[^/?]+$/u, (route) => {
    control.courseReads++;
    if (control.denyCourse)
      return fail(route, control.denyCourse, "course_not_found");
    const id = new URL(route.request().url()).pathname.split("/").at(-1) ?? "";
    return json(
      route,
      learnCourseDocument(
        fixture.courseName,
        fixture.teachingText,
        id,
        "active",
        control.accepting,
      ),
    );
  });
  await page.route(
    /\/api\/v1\/courses\/[^/?]+\/materials(?:\?|$)/u,
    (route) => {
      control.materialReads++;
      return json(route, {
        data: [
          learnMaterialRow(
            fixture.courseName,
            fixture.rawError,
            "material_1",
            "course_1",
          ),
        ],
        meta: { has_more: false },
      });
    },
  );
  await page.route(
    /\/api\/v1\/courses\/[^/?]+\/tutoring-sessions$/u,
    async (route) => {
      control.starts++;
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        data?: {
          attributes?: { client_request_id?: unknown };
          relationships?: { materials?: { data?: { id?: unknown }[] } };
        };
      };
      control.requestIds.push(
        String(body.data?.attributes?.client_request_id ?? ""),
      );
      control.materialsSent.push(
        (body.data?.relationships?.materials?.data ?? [])
          .map((row) => String(row.id ?? ""))
          .join(","),
      );
      if (control.holdPost) await control.holdPost;
      if (control.outcome === "conflict-active") {
        control.activeSession = true;
        return fail(route, 409, "tutoring_active_session");
      }
      if (control.createOnPost) control.activeSession = true;
      // Transport loss after the server received the start: the response
      // never arrives, so the outcome is unknown to the client.
      if (control.outcome === "lose") return route.abort("failed");
      return json(
        route,
        tutoringSessionDocument(fixture.rawError),
        control.outcome === "replay" ? 200 : 201,
      );
    },
  );
  await page.route(/\/api\/v1\/tutoring-sessions\/[^/?]+$/u, (route) => {
    control.sessionReads++;
    if (control.denySession)
      return fail(route, control.denySession, "tutoring_not_found");
    return json(
      route,
      tutoringSessionDocument(
        fixture.rawError,
        "session_1",
        "course_1",
        control.sessionState,
      ),
    );
  });
  await page.route(
    /\/api\/v1\/tutoring-sessions\/[^/?]+\/messages(?:\?|$)/u,
    (route) => {
      control.turnReads++;
      return json(
        route,
        tutoringTurnsPage(fixture.rawError, [
          tutoringTurn(
            fixture.rawError,
            "response_1",
            "session_1",
            fixture.teachingText,
            "completed",
            "tutor reply",
          ),
        ]),
      );
    },
  );
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/auth/logout") return;
    const allowedGet = [
      /^\/api\/v1\/auth\/session$/u,
      /^\/api\/v1\/users\/me\/capabilities$/u,
      /^\/api\/v1\/users\/me\/active-tutoring-session$/u,
      /^\/api\/v1\/courses\/[^/]+(?:\/materials)?$/u,
      /^\/api\/v1\/tutoring-sessions\/[^/]+(?:\/messages)?$/u,
    ].some((pattern) => pattern.test(path));
    const allowedPost =
      request.method() === "POST" &&
      /^\/api\/v1\/courses\/[^/]+\/tutoring-sessions$/u.test(path);
    if (
      path.startsWith("/api/") &&
      !allowedPost &&
      !(request.method() === "GET" && allowedGet)
    )
      control.forbidden++;
  });
  return control;
}

export async function tutoringBackend(page: Page) {
  await routeBackend(page);
  return tutoringResources(page);
}
