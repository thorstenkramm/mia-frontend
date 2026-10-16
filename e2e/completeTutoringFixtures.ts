import type { Browser, BrowserContext, Page, Route } from "@playwright/test";
import { invitationBackend } from "./invitationFixtures";
import { courseRoutes } from "./courseFixtures";
import { materialBackend } from "./materialFixtures";
import { studentRoutes } from "./studentFixtures";
import { tutoringResources } from "./tutoringFixtures";
import { routeBackend } from "./routeFixtures";
import { routeSecretFixture } from "./routeTestFixtures";
import {
  activeTutoringSessionDocument,
  studentMessageResource,
  tutoringSessionDocument,
  tutoringTurn,
  tutoringTurnsPage,
  tutoringWorkDocument,
} from "../test/tutoringFixtures";
import { learnCapabilities } from "../test/learnFixtures";

const origin = "http://127.0.0.1:4173";
const mediaType = "application/vnd.api+json";
const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const instant = (minutes: number) =>
  new Date(Date.now() + minutes * 60_000).toISOString().replace("Z", "000Z");
const document = (route: Route, data: unknown, status = 200) =>
  route.fulfill({
    status,
    contentType: mediaType,
    headers: { "Cache-Control": "no-store" },
    body: JSON.stringify(data),
  });

// Each context has its own cookies and document state. All contexts share this
// in-memory fake resource graph; only a handled UI request changes its records.
export async function journeyScenario(browser: Browser) {
  const contexts: BrowserContext[] = [];
  const state = {
    invited: false,
    joined: false,
    courseCreated: false,
    studentCreated: false,
    replaced: false,
    secondStarted: false,
    firstCompleted: false,
    secondStarts: 0,
    secondSends: 0,
    secondStartAttempts: 0,
    secondSendAttempts: 0,
    secondStartValid: true,
    secondSendValid: true,
    secondStartId: null as string | null,
    secondSendId: null as string | null,
    unexpected: 0,
    external: 0,
  };
  const fresh = async () => {
    const context = await browser.newContext({ baseURL: origin });
    contexts.push(context);
    const page = await context.newPage();
    // Fail closed: the preview serves only static assets. No API or external
    // provider request may escape the local route fakes.
    await page.route("**/*", async (route) => {
      const address = new URL(route.request().url());
      if (address.origin !== origin) {
        state.external++;
        return route.abort("blockedbyclient");
      }
      if (address.pathname.startsWith("/api/")) {
        state.unexpected++;
        return document(
          route,
          {
            errors: [{ status: "404", code: "not_found" }],
          },
          404,
        );
      }
      return route.continue();
    });
    return page;
  };
  const admin = await fresh();
  const invitations = await invitationBackend(admin);
  const adminFixture = routeSecretFixture(admin);
  const adminCourse = await courseRoutes(admin);
  // Admin creation stays unavailable until the UI has accepted the invite.
  await admin.route(/\/api\/v1\/users\?/, (route) =>
    state.joined
      ? route.fallback()
      : document(route, { data: [], meta: { has_more: false } }),
  );
  admin.on("response", (response) => {
    if (response.status() !== 201) return;
    const path = new URL(response.url()).pathname;
    if (path === "/api/v1/invitations")
      state.invited =
        invitations.invitations.length === 1 &&
        invitations.dispatches.create === 1;
    if (path === "/api/v1/courses") {
      state.courseCreated = true;
      // This is the shared fake's server-equivalent course record, committed
      // only after the UI's successful creation of an assigned supervisor.
      course.persisted = state.joined && adminCourse.validPayload;
    }
  });
  const supervisor = await fresh();
  await routeBackend(supervisor);
  const supervisorFixture = routeSecretFixture(supervisor);
  const course = await courseRoutes(supervisor);
  course.accountId = "supervisor_1";
  course.grants = new Set(["courses.supervise"]);
  course.scopeIds = ["course_1"];
  course.name = adminFixture.courseName;
  const material = await materialBackend(supervisor, {
    lifecycle: true,
    course,
    enforceValidRequests: true,
  });
  const roster = await studentRoutes(supervisor, course);
  supervisor.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (
      response.status() === 201 &&
      path === "/api/v1/courses/course_1/students"
    )
      state.studentCreated = true;
    if (
      response.status() === 200 &&
      path === "/api/v1/materials/material_1/approvals" &&
      course.teaching.learning_goals &&
      course.teaching.ai_tutor_instructions &&
      material.approved
    ) {
      course.readiness = "inactive_activatable";
      course.activationEligible = true;
      course.activationBlockers = [];
      course.blockers = [];
    }
  });
  await supervisor.route("**/api/v1/auth/session", (route) =>
    document(
      route,
      supervisorStage === "anonymous"
        ? { data: null, meta: { stage: "anonymous" } }
        : session("supervisor_1", supervisorStage),
    ),
  );
  let supervisorStage: "anonymous" | "authenticated" = "anonymous";
  await supervisor.route("**/api/v1/invitation-previews", (route) =>
    document(
      route,
      state.invited
        ? {
            data: {
              type: "invitation-previews",
              id: "preview",
              attributes: { platform: "mia", role: "supervisor" },
            },
          }
        : { errors: [{ status: "422", code: "invitation_invalid" }] },
      state.invited ? 200 : 422,
    ),
  );
  await supervisor.route("**/api/v1/invitation-acceptances", (route) => {
    const body: unknown = route.request().postDataJSON();
    if (
      !state.invited ||
      !hasAttribute(body, "token", adminFixture.invitationToken)
    )
      return document(
        route,
        { errors: [{ status: "422", code: "invitation_invalid" }] },
        422,
      );
    state.joined = true;
    invitations.invitations[0]!.status = "accepted";
    return document(
      route,
      { data: { type: "users", id: "supervisor_1", attributes: {} } },
      201,
    );
  });
  await supervisor.route("**/api/v1/auth/login", (route) => {
    const body: unknown = route.request().postDataJSON();
    if (
      !state.joined ||
      !hasAttribute(body, "username", adminFixture.supervisorUsername) ||
      !hasAttribute(body, "password", supervisorFixture.password)
    )
      return document(
        route,
        { errors: [{ status: "401", code: "auth_invalid_credentials" }] },
        401,
      );
    supervisorStage = "authenticated";
    return document(route, session("supervisor_1", supervisorStage));
  });

  const student = await fresh();
  const studentFixture = routeSecretFixture(student);
  const studentBase = await routeBackend(student);
  let studentStage: "anonymous" | "password-change" | "authenticated" =
    "anonymous";
  const temporary = ` ${supervisorFixture.password} 密 `;
  const replacement = ` ${studentFixture.password} replaced é `;
  await student.route("**/api/v1/auth/session", (route) =>
    document(
      route,
      studentStage === "anonymous"
        ? { data: null, meta: { stage: "anonymous" } }
        : session("student_1", studentStage),
    ),
  );
  await student.route("**/api/v1/auth/login", async (route) => {
    const body: unknown = route.request().postDataJSON();
    if (
      !state.studentCreated ||
      !hasAttribute(body, "username", supervisorFixture.supervisorUsername) ||
      !hasAttribute(body, "password", state.replaced ? replacement : temporary)
    )
      return document(
        route,
        { errors: [{ status: "401", code: "auth_invalid_credentials" }] },
        401,
      );
    studentStage = state.replaced ? "authenticated" : "password-change";
    await student.context().addCookies([
      {
        name: "mia_csrf",
        value: `${studentFixture.csrf}-rotated`,
        url: origin,
      },
    ]);
    return document(route, session("student_1", studentStage));
  });
  await student.route("**/api/v1/auth/password-changes", (route) => {
    const body: unknown = route.request().postDataJSON();
    if (
      studentStage !== "password-change" ||
      !hasAttribute(body, "password", replacement) ||
      route.request().headers()["x-csrf-token"] !==
        `${studentFixture.csrf}-rotated`
    )
      return document(
        route,
        { errors: [{ status: "422", code: "auth_invalid_password" }] },
        422,
      );
    state.replaced = true;
    studentStage = "authenticated";
    return document(route, session("student_1", studentStage));
  });
  const tutor = await tutoringResources(student);
  tutor.studentOwner = "student_1";
  tutor.ids = ["course_1"];
  const savedTurns: ReturnType<typeof tutoringTurn>[] = [];
  let savedReads = 0;
  // The production server persists turns; the local fake only exposes a
  // completed turn after a dispatched send and a deterministic fake terminal
  // outcome. Never preload a transcript before the student has sent anything.
  await student.route(
    /\/api\/v1\/tutoring-sessions\/session_1\/messages(?:\?|$)/u,
    (route) => {
      if (route.request().method() !== "GET") return route.fallback();
      savedReads++;
      return document(
        route,
        tutoringTurnsPage(studentFixture.rawError, savedTurns),
      );
    },
  );
  const fakeTutor = {
    completeAnswer: () => {
      if (!tutor.sent || tutor.messagePosts !== savedTurns.length + 1)
        throw new Error("Fake provider cannot finish undispatched work.");
      const number = savedTurns.length + 1;
      const turn = tutoringTurn(
        studentFixture.rawError,
        `response_${number}`,
        "session_1",
        tutor.sentContent,
        "completed",
        studentFixture.teachingText,
      );
      turn.attributes.sequence = number;
      turn.attributes.student_message_id = `message_${number}`;
      turn.attributes.response.attributes.message_id = `message_${number}`;
      savedTurns.push(turn);
      tutor.sent = false;
      tutor.workGenerating = false;
      tutor.workState = "idle";
      tutor.terminalContent = studentFixture.teachingText;
    },
    get savedTurns() {
      return savedTurns.length;
    },
    get savedReads() {
      return savedReads;
    },
  };
  student.on("response", (response) => {
    if (
      response.status() === 200 &&
      new URL(response.url()).pathname ===
        "/api/v1/tutoring-sessions/session_1/completion"
    )
      state.firstCompleted = true;
  });
  await student.route("**/api/v1/users/me/capabilities", (route) => {
    const result = learnCapabilities(
      state.courseCreated && roster.persisted && course.courseState === "active"
        ? ["course_1"]
        : [],
      state.replaced && state.studentCreated,
      "student_1",
      false,
    );
    const profile = result.data.attributes.capabilities.find(
      (capability) => capability.action === "profile.view",
    );
    if (profile) {
      profile.available = true;
      profile.scope.own_resource = true;
    }
    return document(route, result);
  });
  // Only the admitted supervisor can see this preparation resource; the
  // student uses the narrow learning projection from the existing fixture.
  await student.route(/\/api\/v1\/courses\/[^/?]+$/u, (route) =>
    course.courseState === "active" && material.approved && roster.persisted
      ? route.fallback()
      : document(
          route,
          { errors: [{ status: "404", code: "course_not_found" }] },
          404,
        ),
  );
  const second = await installSecondSession(
    student,
    state,
    studentFixture.rawError,
    studentFixture.courseName,
    `${studentFixture.csrf}-rotated`,
  );
  const outsider = async () => {
    const page = await fresh();
    await routeBackend(page);
    const work = await tutoringResources(page);
    work.studentOwner = "student_1";
    work.sessionState = "completed";
    // The backend—not the UI—hides the other student's addressed session.
    // Never send a protected session document to the unauthorized browser.
    work.denySession = 404;
    await page.route("**/api/v1/auth/session", (route) =>
      document(route, session("student_other", "authenticated")),
    );
    await page.route("**/api/v1/users/me/capabilities", (route) =>
      document(
        route,
        learnCapabilities(["course_1"], true, "student_other", false),
      ),
    );
    return { page, work };
  };
  return {
    state,
    admin,
    supervisor,
    student,
    invitations,
    adminCourse,
    course,
    material,
    roster,
    tutor,
    fakeTutor,
    second,
    adminFixture,
    supervisorFixture,
    studentFixture,
    temporary,
    replacement,
    studentBase,
    outsider,
    close: async () => {
      for (const context of contexts) await context.close();
    },
  };
}

function session(id: string, stage: string) {
  return {
    data: {
      type: "auth-sessions",
      id,
      attributes: {
        stage,
        idle_expires_at: instant(30),
        absolute_expires_at: instant(720),
      },
    },
  };
}

function hasAttribute(body: unknown, name: string, value: string): boolean {
  if (
    typeof body !== "object" ||
    body === null ||
    !("data" in body) ||
    typeof body.data !== "object" ||
    body.data === null ||
    !("attributes" in body.data) ||
    typeof body.data.attributes !== "object" ||
    body.data.attributes === null ||
    !(name in body.data.attributes)
  )
    return false;
  return Object.entries(body.data.attributes).some(
    ([key, candidate]) => key === name && candidate === value,
  );
}

function requestBody(route: Route): unknown {
  try {
    return JSON.parse(route.request().postData() ?? "");
  } catch {
    // Malformed client input is an explicit validation failure, not a fake success.
    return null;
  }
}

function requestId(body: unknown): string | null {
  if (
    typeof body !== "object" ||
    body === null ||
    !("data" in body) ||
    typeof body.data !== "object" ||
    body.data === null ||
    !("attributes" in body.data) ||
    typeof body.data.attributes !== "object" ||
    body.data.attributes === null ||
    !("client_request_id" in body.data.attributes)
  )
    return null;
  const id: unknown = body.data.attributes.client_request_id;
  return typeof id === "string" && requestIdPattern.test(id) ? id : null;
}

function validUnsafeRequest(route: Route, csrf: string): boolean {
  const headers = route.request().headers();
  return (
    route.request().method() === "POST" &&
    headers["x-csrf-token"] === csrf &&
    headers.accept === mediaType &&
    headers["content-type"] === mediaType
  );
}

const invalidTutoringRequest = (route: Route) =>
  document(
    route,
    { errors: [{ status: "422", code: "tutoring_invalid" }] },
    422,
  );

async function installSecondSession(
  page: Page,
  state: {
    firstCompleted: boolean;
    secondStarted: boolean;
    secondStarts: number;
    secondSends: number;
    secondStartAttempts: number;
    secondSendAttempts: number;
    secondStartValid: boolean;
    secondSendValid: boolean;
    secondStartId: string | null;
    secondSendId: string | null;
  },
  forbidden: string,
  courseName: string,
  csrf: string,
) {
  await page.route("**/api/v1/users/me/active-tutoring-session", (route) =>
    state.secondStarted
      ? document(
          route,
          activeTutoringSessionDocument(courseName, forbidden, "session_2"),
        )
      : route.fallback(),
  );
  await page.route(
    /\/api\/v1\/courses\/[^/?]+\/tutoring-sessions$/u,
    (route) => {
      if (!state.firstCompleted) return route.fallback();
      state.secondStartAttempts++;
      if (state.secondStarted)
        return document(
          route,
          {
            errors: [{ status: "409", code: "tutoring_active_session" }],
          },
          409,
        );
      const address = new URL(route.request().url());
      const body = requestBody(route);
      const id = requestId(body);
      const valid =
        state.firstCompleted &&
        address.pathname === "/api/v1/courses/course_1/tutoring-sessions" &&
        address.search === "" &&
        validUnsafeRequest(route, csrf) &&
        id !== null &&
        JSON.stringify(body) ===
          JSON.stringify({
            data: {
              type: "tutoring-sessions",
              attributes: { client_request_id: id },
              relationships: {
                materials: { data: [{ type: "materials", id: "material_1" }] },
              },
            },
          });
      state.secondStartValid &&= valid;
      if (!valid) return invalidTutoringRequest(route);
      state.secondStarted = true;
      state.secondStarts++;
      state.secondStartId = id;
      return document(
        route,
        tutoringSessionDocument(
          forbidden,
          "session_2",
          "course_1",
          "active",
          "student_1",
        ),
        201,
      );
    },
  );
  await page.route(/\/api\/v1\/tutoring-sessions\/session_2$/u, (route) =>
    state.secondStarted && route.request().method() === "GET"
      ? document(
          route,
          tutoringSessionDocument(
            forbidden,
            "session_2",
            "course_1",
            "active",
            "student_1",
          ),
        )
      : invalidTutoringRequest(route),
  );
  await page.route(
    /\/api\/v1\/tutoring-sessions\/session_2\/current-work(?:\?|$)/u,
    (route) =>
      state.secondStarted && route.request().method() === "GET"
        ? document(
            route,
            tutoringWorkDocument(forbidden, {
              session: "session_2",
              state: "idle",
            }),
          )
        : invalidTutoringRequest(route),
  );
  await page.route(
    /\/api\/v1\/tutoring-sessions\/session_2\/messages(?:\?|$)/u,
    (route) => {
      const address = new URL(route.request().url());
      if (route.request().method() === "GET")
        return state.secondStarted
          ? document(route, tutoringTurnsPage(forbidden, []))
          : invalidTutoringRequest(route);
      state.secondSendAttempts++;
      const body = requestBody(route);
      const id = requestId(body);
      const valid =
        state.secondStarted &&
        state.secondSends === 0 &&
        address.pathname === "/api/v1/tutoring-sessions/session_2/messages" &&
        address.search === "" &&
        validUnsafeRequest(route, csrf) &&
        id !== null &&
        id !== state.secondStartId &&
        JSON.stringify(body) ===
          JSON.stringify({
            data: {
              type: "student-messages",
              attributes: { client_request_id: id, content: "second question" },
            },
          });
      state.secondSendValid &&= valid;
      if (!valid) return invalidTutoringRequest(route);
      state.secondSends++;
      state.secondSendId = id;
      return document(
        route,
        {
          data: studentMessageResource(
            forbidden,
            "message_second",
            "session_2",
            "second question",
            "response_second",
          ),
          links: {
            current_work: "/api/v1/tutoring-sessions/session_2/current-work",
          },
        },
        201,
      );
    },
  );
  return state;
}
