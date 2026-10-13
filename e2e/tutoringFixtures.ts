import type { Page, Route } from "@playwright/test";
import {
  learnCapabilities,
  learnCourseDocument,
  learnMaterialRow,
} from "../test/learnFixtures";
import {
  activeTutoringSessionDocument,
  studentMessageMutationDocument,
  studentMessageResource,
  tutorResponseResource,
  tutoringSessionDocument,
  tutoringTurn,
  tutoringTurnsPage,
  tutoringWorkDocument,
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

// The Story 6.1/6.2 tutoring envelope on the shared route fake: BCG-002
// discovery, the learner course/material reads, one request-ID-bound creation,
// the first-message and workspace message sends, the BCG-012 current-work
// read, and the session/transcript reads. The ledger and counters carry
// operation names and counts only; request IDs are captured for identity
// equality, never logged.
export async function tutoringResources(page: Page) {
  const fixture = routeSecretFixture(page);
  const control = {
    ids: ["course_1"],
    available: true,
    accepting: true,
    activeSession: false,
    sessionState: "active" as "active" | "completed",
    studentOwner: "account-id",
    supervisesCourse: false,
    outcome: "created",
    sendOutcome: "created",
    createOnPost: false,
    commitOnSend: false,
    sent: false,
    sentContent: "",
    workState: "idle",
    workGenerating: false,
    workQueued: false,
    workSubmit: undefined as boolean | undefined,
    workQueue: undefined as boolean | undefined,
    finishEligible: undefined as boolean | undefined,
    finishOutcome: "success" as "success" | "busy" | "completed" | "lose",
    finishCommitsOnLoss: false,
    finishPosts: 0,
    holdFinish: null as Promise<void> | null,
    denyCourse: 0,
    denyDiscovery: 0,
    denySession: 0,
    denyWork: 0,
    courseReads: 0,
    discoveryReads: 0,
    materialReads: 0,
    sessionReads: 0,
    turnReads: 0,
    workReads: 0,
    starts: 0,
    messagePosts: 0,
    forbidden: 0,
    requestIds: [] as string[],
    messageRequestIds: [] as string[],
    workQueries: [] as (string | null)[],
    streamReads: 0,
    streamEvents: null as
      null | { name: string; data: Record<string, string> }[],
    terminalContent: null as string | null,
    terminalState: "completed" as "completed" | "interrupted" | "failed",
    holdTerminal: null as Promise<void> | null,
    longTurn: false,
    responseQueries: [] as (string | null)[],
    materialsSent: [] as string[],
    holdPost: null as Promise<void> | null,
    holdSend: null as Promise<void> | null,
    stopOutcome: "success" as "success" | "conflict" | "lose",
    retryOutcome: "created" as "created" | "replay" | "conflict" | "lose",
    stopped: false,
    retryCommitted: false,
    retryTerminalBeforeFollowUp: false,
    failRetryFollowUp: false,
    stoppedResponseId: "response_gen",
    snapshotTerminalBeforeHold: false,
    stopPosts: 0,
    retryPosts: 0,
    retryRequestIds: [] as string[],
    holdStop: null as Promise<void> | null,
    holdRetry: null as Promise<void> | null,
  };
  const fail = (route: Route, status: number, code: string) =>
    json(
      route,
      { errors: [{ status: String(status), code, detail: fixture.rawError }] },
      status,
    );
  const workDocument = (
    sessionId: string,
    reconcile: string | null,
    responseQuery: string | null = null,
  ) => {
    const retried =
      control.retryCommitted && !control.retryTerminalBeforeFollowUp
        ? studentMessageResource(
            fixture.rawError,
            "message_gen",
            sessionId,
            fixture.courseName,
            "response_retry",
          )
        : null;
    if (retried !== null)
      retried.attributes.response = tutorResponseResource(
        fixture.rawError,
        "response_retry",
        sessionId,
        "message_gen",
        "queued",
        "",
        2,
        "response_gen",
      );
    const terminalRetry =
      control.retryCommitted && control.retryTerminalBeforeFollowUp
        ? tutorResponseResource(
            fixture.rawError,
            "response_retry",
            sessionId,
            "message_gen",
            "completed",
            fixture.teachingText,
            2,
            "response_gen",
          )
        : null;
    const response =
      control.terminalContent === null &&
      (!control.stopped || control.stoppedResponseId !== "response_gen")
        ? null
        : tutorResponseResource(
            fixture.rawError,
            "response_gen",
            sessionId,
            "message_gen",
            control.stopped && control.stoppedResponseId === "response_gen"
              ? "interrupted"
              : control.terminalState,
            control.terminalContent ?? fixture.teachingText,
          );
    const stoppedQueued =
      control.stopped && control.stoppedResponseId === "response_q"
        ? tutorResponseResource(
            fixture.rawError,
            "response_q",
            sessionId,
            "message_q",
            "interrupted",
            fixture.teachingText,
          )
        : null;
    const withResponse = (value: ReturnType<typeof tutoringWorkDocument>) => {
      if (
        responseQuery === "response_retry" &&
        (retried !== null || terminalRetry !== null)
      ) {
        value.data.attributes.reconciled_response =
          terminalRetry ?? retried?.attributes.response ?? null;
      } else if (responseQuery === "response_q" && stoppedQueued !== null) {
        value.data.attributes.reconciled_response = stoppedQueued;
      } else if (control.terminalContent !== null) {
        value.data.attributes.reconciled_response = response;
      }
      if (
        control.stopped &&
        control.terminalContent === null &&
        responseQuery !== "response_retry"
      )
        value.data.attributes.reconciled_response = stoppedQueued ?? response;
      return value;
    };
    const sentMessage = () =>
      studentMessageResource(
        fixture.rawError,
        "message_new",
        sessionId,
        control.sentContent,
      );
    const reconciled =
      reconcile !== null && control.sent ? sentMessage() : null;
    if (control.sent)
      return withResponse(
        tutoringWorkDocument(fixture.rawError, {
          session: sessionId,
          state: control.workGenerating ? "generating_and_queued" : "queued",
          generating: control.workGenerating
            ? tutorResponseResource(
                fixture.rawError,
                "response_gen",
                sessionId,
                "message_gen",
                "generating",
                fixture.teachingText,
              )
            : null,
          queued: sentMessage(),
          reconciled,
        }),
      );
    return withResponse(
      tutoringWorkDocument(fixture.rawError, {
        session: sessionId,
        sessionState: control.sessionState,
        state: control.retryCommitted
          ? terminalRetry === null
            ? "queued"
            : "idle"
          : control.workState,
        generating: control.workGenerating
          ? tutorResponseResource(
              fixture.rawError,
              "response_gen",
              sessionId,
              "message_gen",
              "generating",
              fixture.teachingText,
            )
          : null,
        queued:
          retried ??
          (control.workQueued
            ? studentMessageResource(
                fixture.rawError,
                "message_q",
                sessionId,
                fixture.courseName,
                "response_q",
                "queued",
              )
            : null),
        submit: control.workSubmit,
        queue: control.workQueue,
        ...(control.finishEligible === undefined
          ? {}
          : { finish: control.finishEligible }),
        reconciled,
        retryId:
          control.stopped && !control.retryCommitted
            ? control.stoppedResponseId
            : null,
        latest:
          terminalRetry ??
          (control.stopped ? (stoppedQueued ?? response) : null),
      }),
    );
  };
  await page.route("**/api/v1/users/me/capabilities", (route) => {
    const document = learnCapabilities(control.ids, control.available);
    if (control.supervisesCourse)
      document.data.attributes.capabilities.find(
        (item) => item.action === "courses.supervise",
      )!.scope.course_ids = ["course_1"];
    return json(route, document);
  });
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
  await page.route(
    /\/api\/v1\/tutoring-sessions\/[^/?]+\/current-work(?:\?|$)/u,
    async (route) => {
      control.workReads++;
      if (control.denyWork)
        return fail(route, control.denyWork, "tutoring_not_found");
      const reconcile = new URL(route.request().url()).searchParams.get(
        "message_request_id",
      );
      control.workQueries.push(reconcile);
      const responseQuery = new URL(route.request().url()).searchParams.get(
        "response_id",
      );
      control.responseQueries.push(responseQuery);
      if (responseQuery === "response_retry" && control.failRetryFollowUp) {
        control.failRetryFollowUp = false;
        return fail(route, 503, "unavailable");
      }
      if (
        responseQuery !== null &&
        control.holdTerminal !== null &&
        control.snapshotTerminalBeforeHold
      ) {
        if (control.terminalContent !== null) {
          control.workGenerating = false;
          control.workState = control.workQueued ? "queued" : "idle";
        }
        const sessionId =
          new URL(route.request().url()).pathname.split("/").at(-2) ??
          "session_1";
        const snapshot = workDocument(sessionId, reconcile, responseQuery);
        await control.holdTerminal;
        return json(route, snapshot);
      }
      if (responseQuery !== null && control.holdTerminal !== null)
        await control.holdTerminal;
      if (
        responseQuery !== null &&
        (control.terminalContent !== null || control.stopped)
      ) {
        control.workGenerating = false;
        control.workState = "idle";
      }
      const sessionId =
        new URL(route.request().url()).pathname.split("/").at(-2) ??
        "session_1";
      return json(route, workDocument(sessionId, reconcile, responseQuery));
    },
  );
  await page.route(
    /\/api\/v1\/tutoring-sessions\/[^/?]+\/completion$/u,
    async (route) => {
      control.finishPosts++;
      if (control.holdFinish) await control.holdFinish;
      if (control.finishOutcome === "busy") {
        control.workState = "generating";
        control.workGenerating = true;
        return fail(route, 409, "tutoring_busy");
      }
      if (control.finishOutcome === "completed") {
        control.sessionState = "completed";
        return fail(route, 409, "tutoring_invalid_state");
      }
      if (control.finishOutcome === "success" || control.finishCommitsOnLoss) {
        control.sessionState = "completed";
        control.activeSession = false;
      }
      if (control.finishOutcome === "lose") return route.abort("failed");
      return json(route, {
        ...tutoringSessionDocument(
          fixture.rawError,
          "session_1",
          "course_1",
          "completed",
        ),
        links: {
          current_work: "/api/v1/tutoring-sessions/session_1/current-work",
        },
      });
    },
  );
  await page.route(
    /\/api\/v1\/tutor-responses\/[^/?]+\/interruptions$/u,
    async (route) => {
      control.stopPosts++;
      if (control.holdStop !== null) await control.holdStop;
      if (control.stopOutcome === "conflict")
        return fail(route, 409, "tutoring_invalid_state");
      control.stopped = true;
      control.stoppedResponseId =
        new URL(route.request().url()).pathname.split("/").at(-2) ??
        "response_gen";
      control.workGenerating = false;
      control.workQueued = false;
      control.workState = "idle";
      if (control.stopOutcome === "lose") return route.abort("failed");
      return json(
        route,
        workDocument("session_1", null, control.stoppedResponseId),
      );
    },
  );
  await page.route(
    /\/api\/v1\/student-messages\/[^/?]+\/response-retries$/u,
    async (route) => {
      control.retryPosts++;
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        data?: { attributes?: { client_request_id?: string } };
      };
      control.retryRequestIds.push(
        String(body.data?.attributes?.client_request_id ?? ""),
      );
      if (control.holdRetry !== null) await control.holdRetry;
      if (control.retryOutcome === "conflict")
        return fail(route, 409, "tutoring_work_busy");
      control.retryCommitted = true;
      if (control.retryOutcome === "lose") return route.abort("failed");
      return json(
        route,
        {
          data: tutorResponseResource(
            fixture.rawError,
            "response_retry",
            "session_1",
            "message_gen",
            "queued",
            "",
            2,
            "response_gen",
          ),
        },
        control.retryOutcome === "replay" ? 200 : 201,
      );
    },
  );
  await page.route(/\/api\/v1\/tutor-responses\/[^/?]+\/events$/u, (route) => {
    control.streamReads++;
    const responseId = new URL(route.request().url()).pathname
      .split("/")
      .at(-2);
    const events = control.streamEvents ?? [
      {
        name: "snapshot",
        data:
          responseId === "response_gen"
            ? { state: "generating", content: fixture.teachingText }
            : { state: "queued" },
      },
    ];
    void route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "Cache-Control": "no-store" },
      body: events
        .map(
          (event) =>
            `event: ${event.name}\ndata: ${JSON.stringify(event.data)}\n\n`,
        )
        .join(""),
    });
  });
  await page.route(
    /\/api\/v1\/tutoring-sessions\/[^/?]+\/messages(?:\?|$)/u,
    async (route) => {
      if (route.request().method() !== "POST") {
        control.turnReads++;
        return json(
          route,
          tutoringTurnsPage(fixture.rawError, [
            tutoringTurn(
              fixture.rawError,
              "response_1",
              "session_1",
              control.longTurn
                ? fixture.teachingText.repeat(30)
                : fixture.teachingText,
              "completed",
              "tutor reply",
            ),
          ]),
        );
      }
      control.messagePosts++;
      const body = JSON.parse(route.request().postData() ?? "{}") as {
        data?: {
          attributes?: { client_request_id?: unknown; content?: unknown };
        };
      };
      control.messageRequestIds.push(
        String(body.data?.attributes?.client_request_id ?? ""),
      );
      const content = String(body.data?.attributes?.content ?? "");
      if (control.holdSend) await control.holdSend;
      if (control.sendOutcome === "busy")
        return fail(route, 409, "tutoring_work_busy");
      if (control.sendOutcome === "conflict")
        return fail(route, 409, "tutoring_request_conflict");
      if (control.sendOutcome === "invalid-state")
        return fail(route, 409, "tutoring_invalid_state");
      if (control.sendOutcome === "invalid")
        return fail(route, 422, "tutoring_invalid");
      if (control.sendOutcome === "lose") {
        if (control.commitOnSend) {
          control.sent = true;
          control.sentContent = content;
        }
        return route.abort("failed");
      }
      control.sent = true;
      control.sentContent = content;
      return json(
        route,
        studentMessageMutationDocument(fixture.rawError, content),
        control.sendOutcome === "replay" ? 200 : 201,
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
        control.studentOwner,
      ),
    );
  });
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/auth/logout") return;
    const allowedGet = [
      /^\/api\/v1\/auth\/session$/u,
      /^\/api\/v1\/users\/me\/capabilities$/u,
      /^\/api\/v1\/users\/me\/active-tutoring-session$/u,
      /^\/api\/v1\/courses\/[^/]+(?:\/materials)?$/u,
      /^\/api\/v1\/tutoring-sessions\/[^/]+(?:\/messages|\/current-work)?$/u,
      /^\/api\/v1\/tutor-responses\/[^/]+\/events$/u,
    ].some((pattern) => pattern.test(path));
    const allowedPost =
      request.method() === "POST" &&
      (/^\/api\/v1\/courses\/[^/]+\/tutoring-sessions$/u.test(path) ||
        /^\/api\/v1\/tutoring-sessions\/[^/]+\/messages$/u.test(path) ||
        /^\/api\/v1\/tutor-responses\/[^/]+\/interruptions$/u.test(path) ||
        /^\/api\/v1\/student-messages\/[^/]+\/response-retries$/u.test(path) ||
        /^\/api\/v1\/tutoring-sessions\/[^/]+\/completion$/u.test(path));
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
