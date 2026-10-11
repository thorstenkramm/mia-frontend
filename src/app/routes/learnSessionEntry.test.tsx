import {
  act,
  configure,
  fireEvent,
  getConfig,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { server } from "../../../test/server";
import {
  learnCapabilities,
  learnCourseDocument,
  learnMaterialRow,
} from "../../../test/learnFixtures";
import { authenticatedSessionResponse } from "../../../test/mfaFixtures";
import {
  activeTutoringSessionDocument,
  studentMessageMutationDocument,
  studentMessageResource,
  tutorResponseResource,
  tutoringSessionDocument,
  tutoringTurn,
  tutoringTurnsPage,
  tutoringWorkDocument,
} from "../../../test/tutoringFixtures";
import {
  courseUnitCheckpoint,
  courseUnitFixture,
} from "../../../scripts/secret-hygiene-evidence";
import { App } from "../App";
import { AnnouncementProvider } from "../../platform/announcer/AnnouncementRegion";
import { MiaIntlProvider } from "../../platform/i18n/MiaIntlProvider";
import { InvitationLink } from "../../platform/session/invitationLink";
import { PasswordResetLink } from "../../platform/session/passwordResetLink";
import { holdGuardedHistoryTraversals } from "../../platform/ui/routeDeparture";

const originalError = getConfig().getElementError;
let releaseHistory = () => {};
beforeAll(() =>
  configure({
    getElementError: () =>
      new Error("Tutoring assertion failed (content omitted)."),
  }),
);
afterAll(() => configure({ getElementError: originalError }));
beforeEach(() => {
  releaseHistory = holdGuardedHistoryTraversals(window);
});
afterEach(() => releaseHistory());
const json = (body: unknown, status = 200) =>
  new HttpResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/vnd.api+json",
      "Cache-Control": "no-store",
    },
  });
const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
function backend() {
  const seed = courseUnitFixture();
  document.cookie = `mia_csrf=${seed.csrf}; Path=/; SameSite=Strict`;
  const control = {
    ids: ["course_1"],
    available: true,
    accepting: true,
    courseState: "active",
    blockers: [] as string[],
    activeSession: false,
    sessionState: "active" as "active" | "completed",
    denyCourse: 0,
    denyDiscovery: 0,
    denySession: 0,
    denyWork: 0,
    outcome: "created",
    sendOutcome: "created",
    createOnPost: false,
    commitOnSend: false,
    sent: false,
    sentContent: "",
    turns: null as unknown[] | null,
    workState: "idle",
    workGenerating: false,
    workQueued: false,
    workSubmit: undefined as boolean | undefined,
    workQueue: undefined as boolean | undefined,
    courseReads: 0,
    discoveryReads: 0,
    materialReads: 0,
    sessionReads: 0,
    turnReads: 0,
    workReads: 0,
    capabilityReads: 0,
    posts: 0,
    postBodies: [] as string[],
    postCsrf: [] as (string | null)[],
    postTypes: [] as (string | null)[],
    messagePosts: 0,
    messageBodies: [] as string[],
    messageCsrf: [] as (string | null)[],
    messageTypes: [] as (string | null)[],
    workQueries: [] as (string | null)[],
    holdCapabilities: null as Promise<void> | null,
    holdPost: null as Promise<void> | null,
    holdSend: null as Promise<void> | null,
    ledger: [] as string[],
  };
  const fail = (status: number, code: string) =>
    json(
      { errors: [{ status: String(status), code, detail: seed.rawError }] },
      status,
    );
  const workDocument = (sessionId: string, reconcile: string | null) => {
    const sentMessage = () =>
      studentMessageResource(
        seed.rawError,
        "message_new",
        sessionId,
        control.sentContent,
      );
    const reconciled =
      reconcile !== null && control.sent ? sentMessage() : null;
    if (control.sent)
      return tutoringWorkDocument(seed.rawError, {
        session: sessionId,
        state: control.workGenerating ? "generating_and_queued" : "queued",
        generating: control.workGenerating
          ? tutorResponseResource(
              seed.rawError,
              "response_gen",
              sessionId,
              "message_gen",
              "generating",
              seed.teachingText,
            )
          : null,
        queued: sentMessage(),
        reconciled,
      });
    return tutoringWorkDocument(seed.rawError, {
      session: sessionId,
      sessionState: control.sessionState,
      state: control.workState,
      generating: control.workGenerating
        ? tutorResponseResource(
            seed.rawError,
            "response_gen",
            sessionId,
            "message_gen",
            "generating",
            seed.teachingText,
          )
        : null,
      queued: control.workQueued
        ? studentMessageResource(
            seed.rawError,
            "message_q",
            sessionId,
            seed.name,
            "response_q",
            "queued",
          )
        : null,
      submit: control.workSubmit,
      queue: control.workQueue,
      reconciled,
    });
  };
  server.use(
    http.get("/api/v1/auth/session", () => {
      control.ledger.push("session");
      return authenticatedSessionResponse();
    }),
    http.get("/api/v1/users/me/capabilities", async () => {
      control.capabilityReads++;
      control.ledger.push("capabilities");
      if (control.holdCapabilities) await control.holdCapabilities;
      return json(learnCapabilities(control.ids, control.available));
    }),
    http.get("/api/v1/users/me/active-tutoring-session", () => {
      control.discoveryReads++;
      control.ledger.push("discovery");
      if (control.denyDiscovery)
        return fail(control.denyDiscovery, "tutoring_unavailable");
      return json(
        control.activeSession
          ? activeTutoringSessionDocument(seed.name, seed.rawError)
          : { data: null },
      );
    }),
    http.get("/api/v1/courses/:id", ({ params }) => {
      control.courseReads++;
      control.ledger.push("course");
      if (control.denyCourse)
        return fail(control.denyCourse, "course_not_found");
      const id = String(params.id);
      const accepting = id === "course_1" ? control.accepting : false;
      return json(
        learnCourseDocument(
          seed.name,
          seed.teachingText,
          id,
          control.courseState,
          accepting,
          accepting ? [] : control.blockers,
        ),
      );
    }),
    http.get("/api/v1/courses/:id/materials", ({ params }) => {
      control.materialReads++;
      control.ledger.push("materials");
      return json({
        data: [
          learnMaterialRow(
            `${seed.name} material`,
            seed.rawError,
            "material_1",
            String(params.id),
          ),
        ],
        meta: { has_more: false },
      });
    }),
    http.post("/api/v1/courses/:id/tutoring-sessions", async ({ request }) => {
      control.posts++;
      control.ledger.push("create");
      control.postBodies.push(await request.text());
      control.postCsrf.push(request.headers.get("X-CSRF-Token"));
      control.postTypes.push(request.headers.get("Content-Type"));
      if (control.holdPost) await control.holdPost;
      if (
        control.outcome === "conflict-active" ||
        control.outcome === "conflict-request"
      ) {
        // The server holds the one active session; discovery resolves it.
        control.activeSession = true;
        return fail(
          409,
          control.outcome === "conflict-active"
            ? "tutoring_active_session"
            : "tutoring_request_conflict",
        );
      }
      if (control.outcome === "invalid-state")
        return fail(409, "tutoring_invalid_state");
      if (control.outcome === "invalid") return fail(422, "tutoring_invalid");
      if (control.outcome === "not-found")
        return fail(404, "tutoring_not_found");
      if (control.outcome === "server") return fail(503, "internal_error");
      if (control.outcome === "lose") {
        if (control.createOnPost) control.activeSession = true;
        return HttpResponse.error();
      }
      // A definitive create means the session is the one active session.
      control.activeSession = true;
      return json(
        tutoringSessionDocument(seed.rawError),
        control.outcome === "replay" ? 200 : 201,
      );
    }),
    http.post("/api/v1/tutoring-sessions/:id/messages", async ({ request }) => {
      control.messagePosts++;
      control.ledger.push("send");
      const text = await request.text();
      control.messageBodies.push(text);
      control.messageCsrf.push(request.headers.get("X-CSRF-Token"));
      control.messageTypes.push(request.headers.get("Content-Type"));
      if (control.holdSend) await control.holdSend;
      const content = String(
        (
          JSON.parse(text) as {
            data?: { attributes?: { content?: unknown } };
          }
        ).data?.attributes?.content ?? "",
      );
      if (control.sendOutcome === "busy")
        return fail(409, "tutoring_work_busy");
      if (control.sendOutcome === "conflict")
        return fail(409, "tutoring_request_conflict");
      if (control.sendOutcome === "invalid-state")
        return fail(409, "tutoring_invalid_state");
      if (control.sendOutcome === "invalid")
        return fail(422, "tutoring_invalid");
      if (control.sendOutcome === "not-found")
        return fail(404, "tutoring_not_found");
      if (control.sendOutcome === "server") return fail(503, "internal_error");
      if (control.sendOutcome === "lose") {
        if (control.commitOnSend) {
          control.sent = true;
          control.sentContent = content;
        }
        return HttpResponse.error();
      }
      control.sent = true;
      control.sentContent = content;
      return json(
        studentMessageMutationDocument(seed.rawError, content),
        control.sendOutcome === "replay" ? 200 : 201,
      );
    }),
    http.get(
      "/api/v1/tutoring-sessions/:id/current-work",
      ({ params, request }) => {
        control.workReads++;
        control.ledger.push("current-work");
        if (control.denyWork)
          return fail(control.denyWork, "tutoring_not_found");
        const reconcile = new URL(request.url).searchParams.get(
          "message_request_id",
        );
        control.workQueries.push(reconcile);
        return json(workDocument(String(params.id), reconcile));
      },
    ),
    http.get("/api/v1/tutoring-sessions/:id", ({ params }) => {
      control.sessionReads++;
      control.ledger.push("tutoring-session");
      if (control.denySession)
        return fail(control.denySession, "tutoring_not_found");
      return json(
        tutoringSessionDocument(
          seed.rawError,
          String(params.id),
          "course_1",
          control.sessionState,
        ),
      );
    }),
    http.get("/api/v1/tutoring-sessions/:id/messages", () => {
      control.turnReads++;
      control.ledger.push("turns");
      return json(
        tutoringTurnsPage(
          seed.rawError,
          control.turns ?? [
            tutoringTurn(
              seed.rawError,
              "response_1",
              "session_1",
              seed.teachingText,
              "completed",
              "tutor reply",
            ),
          ],
        ),
      );
    }),
  );
  return { control, seed };
}
function mount(location = "/learn/start", state: unknown = null) {
  window.history.replaceState(state, "", location);
  return render(
    <AnnouncementProvider>
      <MiaIntlProvider initialLocale="en-US">
        <App
          initialTextSize="standard"
          invitationLink={new InvitationLink(null)}
          passwordResetLink={new PasswordResetLink(null)}
        />
      </MiaIntlProvider>
    </AnnouncementProvider>,
  );
}
async function ready(name: string) {
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { level: 1 }).textContent === name &&
        document.title === `${name} | MIA`,
    ).toBe(true),
  );
  await waitFor(() =>
    expect(
      document.activeElement === screen.getByRole("heading", { level: 1 }),
    ).toBe(true),
  );
}
const main = () => {
  const node = document.querySelector("main");
  if (node === null) throw new Error("Missing main landmark.");
  return node;
};
const composer = () => screen.getByLabelText("Your message to the tutor");
// The 6.2 start flow: course choice → material choice (Continue hands the
// selection to the intent route) → intent (compose + begin chain).
async function startIntent(withMaterial: "none" | "select" | "skip" = "skip") {
  const view = mount("/learn/start/course_1/material");
  await ready("Choose material");
  const user = userEvent.setup();
  if (withMaterial === "select") {
    const radios = await screen.findAllByRole("radio");
    const chosen = radios[1];
    if (chosen === undefined)
      throw new Error("Expected the No material option and one material row.");
    await user.click(chosen);
  }
  await user.click(await screen.findByRole("link", { name: "Continue" }));
  await ready("Choose how to begin");
  // The route component is lazy; wait for its admitted begin action.
  await screen.findByRole("button", { name: "Start session" });
  return { user, view };
}
async function submitIntent(
  user: ReturnType<typeof userEvent.setup>,
  content = "first question",
) {
  await user.click(composer());
  await user.keyboard(content);
  await user.click(screen.getByRole("button", { name: "Start session" }));
}
const messageRequestId = (
  control: { messageBodies: string[] },
  index: number,
) =>
  String(
    (
      JSON.parse(control.messageBodies[index] ?? "{}") as {
        data?: { attributes?: { client_request_id?: unknown } };
      }
    ).data?.attributes?.client_request_id ?? "",
  );
const unknownHeading =
  "The start outcome is unknown. The session may have been created. Reconcile checks the current state; this attempt is never repeated automatically.";
const unknownSendHeading =
  "The message outcome is unknown. The message may have been sent. Reconcile checks the current state; this attempt is never repeated automatically.";

it("Tutoring workspace withholds session and transcript reads until learning participation settles", async () => {
  const { control, seed } = backend();
  let release = () => {};
  control.holdCapabilities = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount("/learn/sessions/session_1");
  try {
    await waitFor(() => expect(control.capabilityReads).toBe(1));
    expect(
      control.sessionReads === 0 &&
        control.turnReads === 0 &&
        control.workReads === 0 &&
        document.title === "MIA" &&
        !document.body.textContent?.includes(seed.teachingText),
    ).toBe(true);
    await act(async () => release());
    await ready("Tutoring session");
    await waitFor(() =>
      expect(document.body.textContent?.includes(seed.teachingText)).toBe(true),
    );
    expect(
      control.ledger.join() ===
        "session,capabilities,tutoring-session,current-work,turns" &&
        !document.body.textContent?.includes(seed.rawError),
    ).toBe(true);
    courseUnitCheckpoint("tutoring-admitted");
  } finally {
    release();
  }
});

it("Tutoring start runs discovery before any start affordance and resumes the found session", async () => {
  const { control, seed } = backend();
  control.activeSession = true;
  mount("/learn/start");
  await ready("Start a tutoring session");
  await waitFor(() =>
    expect(
      document.body.textContent?.includes(
        "You already have an active tutoring session in",
      ),
    ).toBe(true),
  );
  expect(
    control.ledger.join() === "session,capabilities,discovery" &&
      control.courseReads === 0 &&
      control.materialReads === 0 &&
      document.body.textContent?.includes(seed.name) &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  expect(
    within(main())
      .getByRole("link", { name: "Continue session" })
      .getAttribute("href"),
  ).toBe("/learn/sessions/session_1");
  expect(screen.queryByRole("button", { name: "Start session" })).toBeNull();
  courseUnitCheckpoint("tutoring-resume");
});

it("Tutoring course choice lists joined courses with server eligibility and no local computation", async () => {
  const { control, seed } = backend();
  control.ids = ["course_1", "course_2"];
  control.blockers = ["qualifying_material"];
  mount("/learn/start");
  await ready("Start a tutoring session");
  await screen.findByRole("heading", { level: 2, name: "Choose a course" });
  expect(
    control.ledger.join() === "session,capabilities,discovery,course,course" &&
      control.materialReads === 0,
  ).toBe(true);
  const eligible = within(main()).getByRole("link", { name: seed.name });
  expect(eligible.getAttribute("href")).toBe("/learn/start/course_1/material");
  // The ineligible course renders truthful fixed copy and no link.
  expect(
    within(main()).queryAllByRole("link", { name: seed.name }).length === 1 &&
      document.body.textContent?.includes("Not accepting new sessions") ===
        true &&
      screen.queryByRole("button", { name: "Start session" }) === null &&
      !document.body.textContent?.includes(seed.teachingText) &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-choice");
});

it("Tutoring material choice continues to the intent route carrying one opaque selection", async () => {
  const { control, seed } = backend();
  const { user } = await startIntent("select");
  expect(window.location.pathname).toBe("/learn/start/course_1/intent");
  await submitIntent(user, seed.teachingText);
  await ready("Tutoring session");
  const create = JSON.parse(control.postBodies[0] ?? "{}") as {
    data?: { relationships?: unknown };
  };
  expect(
    JSON.stringify(create.data?.relationships) ===
      JSON.stringify({
        materials: { data: [{ type: "materials", id: "material_1" }] },
      }) && control.posts === 1,
  ).toBe(true);
  // The handoff is one opaque ID; the message text never entered URL or
  // history state, and the raw error body never rendered.
  expect(
    !window.location.pathname.includes("material_1") &&
      !JSON.stringify(window.history.state).includes(seed.teachingText) &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-handoff");
});

it("Tutoring intent without handoff state starts intent-only with the visible material parent", async () => {
  const { control, seed } = backend();
  const view = mount("/learn/start/course_1/intent");
  await ready("Choose how to begin");
  await screen.findByRole("button", { name: "Start session" });
  expect(
    within(main())
      .getByRole("link", { name: "Choose material" })
      .getAttribute("href"),
  ).toBe("/learn/start/course_1/material");
  const user = userEvent.setup();
  await submitIntent(user);
  await ready("Tutoring session");
  const create = JSON.parse(control.postBodies[0] ?? "{}") as {
    data?: { relationships?: unknown };
  };
  expect(create.data?.relationships === undefined && control.posts === 1).toBe(
    true,
  );
  view.unmount();
  // A malformed handoff is equally absent; nothing is fabricated. The first
  // start made the session active; clear it so discovery admits a fresh
  // intent-only start.
  control.activeSession = false;
  mount("/learn/start/course_1/intent", { material: 42 });
  await ready("Choose how to begin");
  await screen.findByRole("button", { name: "Start session" });
  await submitIntent(userEvent.setup());
  await waitFor(() => expect(control.posts).toBe(2));
  const second = JSON.parse(control.postBodies[1] ?? "{}") as {
    data?: { relationships?: unknown };
  };
  expect(
    second.data?.relationships === undefined &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-intent-only");
});

it("Tutoring intent begin dispatches one request-ID-bound creation then the first message", async () => {
  const { control, seed } = backend();
  const { user } = await startIntent();
  await submitIntent(user, seed.teachingText);
  await ready("Tutoring session");
  const create = JSON.parse(control.postBodies[0] ?? "{}") as {
    data?: { attributes?: Record<string, unknown> };
  };
  const message = JSON.parse(control.messageBodies[0] ?? "{}") as {
    data?: { attributes?: Record<string, unknown> };
  };
  expect(
    control.posts === 1 &&
      control.messagePosts === 1 &&
      control.postCsrf[0] === seed.csrf &&
      control.messageCsrf[0] === seed.csrf &&
      control.postTypes[0] === "application/vnd.api+json" &&
      control.messageTypes[0] === "application/vnd.api+json" &&
      requestIdPattern.test(
        String(create.data?.attributes?.client_request_id ?? ""),
      ) &&
      requestIdPattern.test(
        String(message.data?.attributes?.client_request_id ?? ""),
      ) &&
      create.data?.attributes?.client_request_id !==
        message.data?.attributes?.client_request_id &&
      message.data?.attributes?.content === seed.teachingText,
  ).toBe(true);
  // The workspace shows the persistent FFR-613 notice, the transcript and
  // the queued work from the authoritative follow-up read.
  await waitFor(() =>
    expect(
      document.body.textContent?.includes("MIA's tutor is AI-powered.") ===
        true &&
        document.body.textContent?.includes("Current work") === true &&
        document.body.textContent?.includes(seed.teachingText) === true,
    ).toBe(true),
  );
  expect(
    window.location.pathname === "/learn/sessions/session_1" &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-created");
});

it("Tutoring intent replay 200 without material is the same definitive navigation", async () => {
  const { control } = backend();
  control.outcome = "replay";
  control.sendOutcome = "replay";
  const { user } = await startIntent();
  await submitIntent(user);
  await ready("Tutoring session");
  const create = JSON.parse(control.postBodies[0] ?? "{}") as {
    data?: { attributes?: Record<string, unknown>; relationships?: unknown };
  };
  expect(
    control.posts === 1 &&
      control.messagePosts === 1 &&
      window.location.pathname === "/learn/sessions/session_1" &&
      requestIdPattern.test(
        String(create.data?.attributes?.client_request_id ?? ""),
      ) &&
      create.data?.relationships === undefined,
  ).toBe(true);
  courseUnitCheckpoint("tutoring-replay");
});

it("Tutoring active-session and request conflicts reconcile through one discovery read without a second start", async () => {
  for (const outcome of ["conflict-active", "conflict-request"]) {
    const { control, seed } = backend();
    control.outcome = outcome;
    const { user, view } = await startIntent();
    await submitIntent(user);
    await waitFor(() =>
      expect(
        document.body.textContent?.includes(
          "You already have an active tutoring session in",
        ),
      ).toBe(true),
    );
    expect(
      control.posts === 1 &&
        control.messagePosts === 0 &&
        document.body.textContent?.includes(seed.name) &&
        within(main())
          .getByRole("link", { name: "Continue session" })
          .getAttribute("href") === "/learn/sessions/session_1" &&
        !document.body.textContent?.includes(seed.rawError),
    ).toBe(true);
    view.unmount();
  }
  courseUnitCheckpoint("tutoring-conflict");
});

for (const outcome of ["invalid-state", "invalid", "not-found"])
  it(`Tutoring ${outcome} ends the attempt definitively without replay`, async () => {
    const { control, seed } = backend();
    control.outcome = outcome;
    const { user } = await startIntent();
    await submitIntent(user);
    if (outcome === "not-found") {
      await ready("Tutoring access unavailable");
      expect(
        !document.body.textContent?.includes(seed.name) &&
          !document.body.textContent?.includes(seed.rawError),
      ).toBe(true);
    } else {
      await screen.findByRole("heading", {
        name:
          outcome === "invalid-state"
            ? "Course or session state changed. Review the current state before starting."
            : "The session was not started. Review the current course and material choice before trying again; a new attempt is a fresh start.",
      });
      expect(window.location.pathname.endsWith("/intent")).toBe(true);
    }
    expect(
      control.posts === 1 &&
        control.messagePosts === 0 &&
        !document.body.textContent?.includes(seed.rawError),
    ).toBe(true);
    courseUnitCheckpoint("tutoring-rejected");
  });

it("Tutoring lost start response stays unknown and explicit reconcile resumes the discovered session", async () => {
  const { control, seed } = backend();
  control.outcome = "lose";
  control.createOnPost = true;
  const { user } = await startIntent();
  await submitIntent(user);
  await screen.findByRole("heading", { name: unknownHeading });
  expect(
    control.posts === 1 &&
      control.messagePosts === 0 &&
      window.location.pathname.endsWith("/intent") &&
      screen.queryByRole("button", { name: "Start session" }) === null,
  ).toBe(true);
  courseUnitCheckpoint("tutoring-unknown");
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() =>
    expect(
      document.body.textContent?.includes(
        "You already have an active tutoring session in",
      ),
    ).toBe(true),
  );
  expect(
    control.posts === 1 &&
      document.body.textContent?.includes(seed.name) &&
      within(main())
        .getByRole("link", { name: "Continue session" })
        .getAttribute("href") === "/learn/sessions/session_1",
  ).toBe(true);
  courseUnitCheckpoint("tutoring-reconciled");
});

it("Tutoring reconciled unknown retries the exact retained attempt only explicitly", async () => {
  const { control } = backend();
  control.outcome = "lose";
  const { user } = await startIntent();
  await submitIntent(user);
  await screen.findByRole("heading", { name: unknownHeading });
  // Discovery still finds nothing: reconcile, then only the exact retry.
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  const retry = await screen.findByRole("button", {
    name: "Retry exact attempt",
  });
  expect(control.posts === 1).toBe(true);
  control.outcome = "created";
  await user.click(retry);
  await ready("Tutoring session");
  // The retried create carries the identical request identity and payload;
  // the first message follows with its own fresh identity.
  expect(
    control.posts === 2 &&
      control.postBodies.length === 2 &&
      control.postBodies[0] === control.postBodies[1] &&
      control.messagePosts === 1,
  ).toBe(true);
  courseUnitCheckpoint("tutoring-retry");
});

it("Tutoring abandon destroys the retained attempt locally and a later start is a fresh attempt", async () => {
  const { control } = backend();
  control.outcome = "lose";
  const { user } = await startIntent();
  await submitIntent(user);
  await screen.findByRole("heading", { name: unknownHeading });
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await user.click(
    await screen.findByRole("button", { name: "Abandon unknown attempt" }),
  );
  await screen.findByRole("heading", {
    name: "The unknown attempt was abandoned locally, not cancelled on the server. Review the current state before a new attempt.",
  });
  expect(control.posts === 1).toBe(true);
  control.outcome = "created";
  await user.click(screen.getByRole("button", { name: "Start session" }));
  await ready("Tutoring session");
  expect(
    control.posts === 2 &&
      control.postBodies.length === 2 &&
      control.postBodies[0] !== control.postBodies[1] &&
      control.messagePosts === 1,
  ).toBe(true);
  courseUnitCheckpoint("tutoring-abandon");
});

it("Tutoring Stop waiting after dispatch keeps the outcome unknown and never claims the late success", async () => {
  const { control } = backend();
  control.createOnPost = true;
  let release = () => {};
  control.holdPost = new Promise<void>((resolve) => {
    release = resolve;
  });
  const { user } = await startIntent();
  await submitIntent(user);
  await waitFor(() => expect(control.posts).toBe(1));
  await user.click(screen.getByRole("button", { name: "Stop waiting" }));
  await screen.findByRole("heading", { name: unknownHeading });
  await act(async () => release());
  await waitFor(() => expect(control.activeSession).toBe(true));
  expect(
    control.posts === 1 &&
      control.messagePosts === 0 &&
      window.location.pathname.endsWith("/intent"),
  ).toBe(true);
  // Explicit reconciliation, never the late response, surfaces the session.
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() =>
    expect(
      document.body.textContent?.includes(
        "You already have an active tutoring session in",
      ),
    ).toBe(true),
  );
  courseUnitCheckpoint("tutoring-stopped");
});

it("Tutoring lost first send reconciles committed through the current-work read without resending", async () => {
  const { control, seed } = backend();
  control.sendOutcome = "lose";
  control.commitOnSend = true;
  const { user } = await startIntent();
  await submitIntent(user, seed.teachingText);
  await screen.findByRole("heading", { name: unknownSendHeading });
  expect(
    control.posts === 1 &&
      control.messagePosts === 1 &&
      window.location.pathname.endsWith("/intent"),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-send-unknown");
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await ready("Tutoring session");
  // The reconcile read carried the retained request ID; nothing was resent.
  // The workspace host then performs its own ordered admission reads (D4),
  // which adds a follow-up current-work read without a reconcile parameter.
  expect(
    control.messagePosts === 1 &&
      control.workQueries[0] === messageRequestId(control, 0) &&
      requestIdPattern.test(control.workQueries[0] ?? ""),
  ).toBe(true);
  await waitFor(() =>
    expect(
      document.body.textContent?.includes(seed.teachingText) === true &&
        !document.body.textContent?.includes(seed.rawError),
    ).toBe(true),
  );
  courseUnitCheckpoint("tutoring-send-reconciled");
});

it("Tutoring uncommitted first send retries only the message with the retained request identity", async () => {
  const { control } = backend();
  control.sendOutcome = "lose";
  const { user } = await startIntent();
  await submitIntent(user);
  await screen.findByRole("heading", { name: unknownSendHeading });
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  const retry = await screen.findByRole("button", {
    name: "Retry exact attempt",
  });
  control.sendOutcome = "created";
  await user.click(retry);
  await ready("Tutoring session");
  // The session is never re-created; the exact message attempt is resent.
  expect(
    control.posts === 1 &&
      control.messagePosts === 2 &&
      control.messageBodies[0] === control.messageBodies[1],
  ).toBe(true);
  courseUnitCheckpoint("tutoring-send-retry");
});

it("Tutoring first-send conflict locks the attempt to reconcile and abandon without retry", async () => {
  const { control, seed } = backend();
  control.sendOutcome = "conflict";
  const { user } = await startIntent();
  await submitIntent(user);
  await screen.findByRole("heading", {
    name: "This attempt conflicts with committed work. Reconcile to review the current state; the conflicting attempt is discarded and never resent.",
  });
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await screen.findByRole("button", { name: "Abandon unknown attempt" });
  expect(
    screen.queryByRole("button", { name: "Retry exact attempt" }) === null,
  ).toBe(true);
  await user.click(
    screen.getByRole("button", { name: "Abandon unknown attempt" }),
  );
  await screen.findByRole("heading", {
    name: "The unknown attempt was abandoned locally, not cancelled on the server. Review the current state before a new attempt.",
  });
  expect(
    control.posts === 1 &&
      control.messagePosts === 1 &&
      control.workQueries.length === 1 &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-send-conflict");
});

it("Tutoring busy first send keeps the session and draft until explicit Refresh", async () => {
  const { control, seed } = backend();
  control.sendOutcome = "busy";
  const { user } = await startIntent();
  await submitIntent(user, seed.teachingText);
  await screen.findByRole("heading", {
    name: "The tutor is busy with other work right now. Your draft stays unchanged. Refresh the current state before sending.",
  });
  // The draft is retained; nothing is replayed.
  expect(
    (composer() as HTMLTextAreaElement).value === seed.teachingText &&
      control.posts === 1 &&
      control.messagePosts === 1,
  ).toBe(true);
  courseUnitCheckpoint("tutoring-send-busy");
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await screen.findByRole("heading", {
    name: "The session exists and your message was not sent yet. Choose Start session to send it.",
  });
  control.sendOutcome = "created";
  await user.click(screen.getByRole("button", { name: "Start session" }));
  await ready("Tutoring session");
  // Only the message was sent again, with a fresh request identity.
  expect(
    control.posts === 1 &&
      control.messagePosts === 2 &&
      messageRequestId(control, 0) !== messageRequestId(control, 1),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-send-fresh");
});

it("Tutoring rejected first send mints a fresh message identity without recreating the session", async () => {
  const { control } = backend();
  control.sendOutcome = "invalid";
  const { user } = await startIntent();
  await submitIntent(user);
  await screen.findByRole("heading", {
    name: "The message was not sent. Review the message and current state before trying again; a new attempt is a fresh send.",
  });
  control.sendOutcome = "created";
  await user.click(screen.getByRole("button", { name: "Start session" }));
  await ready("Tutoring session");
  expect(
    control.posts === 1 &&
      control.messagePosts === 2 &&
      messageRequestId(control, 0) !== messageRequestId(control, 1),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-send-rejected");
});

it("Tutoring first send to a completed session ends the attempt without replay", async () => {
  const { control, seed } = backend();
  control.sendOutcome = "invalid-state";
  const { user } = await startIntent();
  await submitIntent(user);
  await screen.findByRole("heading", {
    name: "Course or session state changed. Review the current state before starting.",
  });
  expect(
    control.posts === 1 &&
      control.messagePosts === 1 &&
      window.location.pathname.endsWith("/intent") &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-send-finished");
});

it("Tutoring starters insert editable localized text and never submit", async () => {
  const { control } = backend();
  const { user } = await startIntent();
  await user.click(screen.getByRole("button", { name: "Homework help" }));
  expect(
    (composer() as HTMLTextAreaElement).value ===
      "I need help with my homework:" && document.activeElement === composer(),
  ).toBe(true);
  await user.click(screen.getByRole("button", { name: "Topic practice" }));
  expect(
    (composer() as HTMLTextAreaElement).value ===
      "I need help with my homework:\nI want to practice this topic:",
  ).toBe(true);
  await user.click(screen.getByRole("button", { name: "Free-form question" }));
  expect(
    document.activeElement === composer() &&
      control.posts === 0 &&
      control.messagePosts === 0,
  ).toBe(true);
  // The inserted text stays fully editable and is what the begin chain sends.
  await user.click(composer());
  await user.keyboard(" edited");
  await user.click(screen.getByRole("button", { name: "Start session" }));
  await ready("Tutoring session");
  const message = JSON.parse(control.messageBodies[0] ?? "{}") as {
    data?: { attributes?: { content?: unknown } };
  };
  expect(
    message.data?.attributes?.content ===
      "I need help with my homework:\nI want to practice this topic: edited",
  ).toBe(true);
  courseUnitCheckpoint("tutoring-starters");
});

it("Tutoring composer validates documented bounds locally without dispatch", async () => {
  const { control } = backend();
  const { user } = await startIntent();
  // Empty content never dispatches; the corrective text names the problem.
  await user.click(screen.getByRole("button", { name: "Start session" }));
  await within(main()).findByText("Enter a message first.");
  expect(control.posts === 0 && control.messagePosts === 0).toBe(true);
  // Enter inserts a newline; it never submits.
  await user.click(composer());
  await user.keyboard("line one{Enter}line two");
  expect(
    (composer() as HTMLTextAreaElement).value === "line one\nline two" &&
      control.posts === 0 &&
      control.messagePosts === 0,
  ).toBe(true);
  // Beyond 8,000 code points: local rejection, no dispatch, bytes preserved.
  fireEvent.change(composer(), { target: { value: `é${"x".repeat(8000)}` } });
  await user.click(screen.getByRole("button", { name: "Start session" }));
  await within(main()).findByText(
    "Shorten the message to at most 8,000 characters and 32 KiB of UTF-8 text.",
  );
  expect(
    control.posts === 0 &&
      control.messagePosts === 0 &&
      (composer() as HTMLTextAreaElement).value === `é${"x".repeat(8000)}`,
  ).toBe(true);
  courseUnitCheckpoint("tutoring-bounds");
});

it("Tutoring hidden causes share one neutral presentation on the start and workspace routes", async () => {
  let primary: string | null = null;
  for (const cause of [
    "capability",
    "scope",
    "inactive",
    "404",
    "403",
    "429",
    "discovery-429",
    "session-404",
    "intent-404",
  ]) {
    const { control, seed } = backend();
    control.available = cause !== "capability";
    control.ids = cause === "scope" ? [] : ["course_1"];
    control.courseState = cause === "inactive" ? "inactive" : "active";
    control.denyCourse = ["404", "403", "429"].includes(cause)
      ? Number(cause)
      : cause === "intent-404"
        ? 404
        : 0;
    control.denyDiscovery = cause === "discovery-429" ? 429 : 0;
    control.denySession = cause === "session-404" ? 404 : 0;
    const path =
      cause === "session-404"
        ? "/learn/sessions/session_1"
        : cause === "intent-404"
          ? "/learn/start/course_1/intent"
          : "/learn/start/course_1/material";
    const view = mount(path);
    await ready("Tutoring access unavailable");
    const surface = {
      heading: screen.getByRole("heading", { level: 1 }).textContent,
      copy: screen.getByText(
        "This tutoring view is unavailable. Use an available exit.",
      ).textContent,
      buttons: screen
        .queryAllByRole("button")
        .filter((node) => node.textContent !== "Technical details")
        .map((node) => node.textContent),
      links: Array.from(document.querySelectorAll("main a")).map((node) =>
        node.getAttribute("href"),
      ),
      title: document.title,
      focus: document.activeElement?.tagName,
    };
    if (primary === null) primary = JSON.stringify(surface);
    expect(primary, `Fixed primary for ${cause}`).toBe(JSON.stringify(surface));
    expect(window.location.pathname).toBe(path);
    expect(
      !document.body.textContent?.includes(seed.name) &&
        !document.body.textContent?.includes(seed.teachingText) &&
        !document.body.textContent?.includes(seed.rawError) &&
        control.materialReads === 0 &&
        control.turnReads === 0 &&
        control.workReads === 0 &&
        control.posts === 0 &&
        control.messagePosts === 0,
    ).toBe(true);
    view.unmount();
  }
  courseUnitCheckpoint("tutoring-route-hidden");
});

it("Tutoring recovery replaces a found session with the workspace and offers fixed exits when none", async () => {
  const { control, seed } = backend();
  control.activeSession = true;
  const view = mount("/learn/session");
  await ready("Tutoring session");
  await waitFor(() =>
    expect(document.body.textContent?.includes(seed.teachingText)).toBe(true),
  );
  expect(window.location.pathname).toBe("/learn/sessions/session_1");
  view.unmount();
  control.activeSession = false;
  mount("/learn/session");
  await ready("Resume tutoring");
  await screen.findByText("No active tutoring session was found.");
  const exits = within(main());
  expect(
    exits
      .getByRole("link", { name: "Start a tutoring session" })
      .getAttribute("href"),
  ).toBe("/learn/start");
  expect(
    exits.getByRole("link", { name: "Back to Home" }).getAttribute("href"),
  ).toBe("/");
  courseUnitCheckpoint("tutoring-recovery");
});

it("Tutoring completed session renders the fixed finished notice without a transcript read", async () => {
  const { control, seed } = backend();
  control.sessionState = "completed";
  mount("/learn/sessions/session_1");
  await ready("Tutoring session");
  await within(main()).findByText("This tutoring session is finished.");
  expect(
    control.turnReads === 0 &&
      control.workReads === 0 &&
      !document.body.textContent?.includes(seed.teachingText) &&
      !document.body.textContent?.includes(seed.rawError) &&
      within(main())
        .getByRole("link", { name: "Joined courses" })
        .getAttribute("href") === "/learn/courses",
  ).toBe(true);
  courseUnitCheckpoint("tutoring-finished");
});

it("Tutoring workspace renders persisted turns as escaped text with neutral response labels", async () => {
  const { control, seed } = backend();
  control.turns = [
    tutoringTurn(
      seed.rawError,
      "response_1",
      "session_1",
      `${seed.teachingText} <b>html</b>`,
      "completed",
      "tutor reply one",
    ),
    tutoringTurn(seed.rawError, "response_2", "session_1", "q2", "queued", ""),
    tutoringTurn(
      seed.rawError,
      "response_3",
      "session_1",
      "q3",
      "generating",
      "",
    ),
    tutoringTurn(
      seed.rawError,
      "response_4",
      "session_1",
      "q4",
      "interrupted",
      "partial",
    ),
    tutoringTurn(seed.rawError, "response_5", "session_1", "q5", "failed", ""),
  ];
  mount("/learn/sessions/session_1");
  await ready("Tutoring session");
  await waitFor(() =>
    expect(document.querySelectorAll("main article").length).toBe(5),
  );
  const text = main().textContent ?? "";
  expect(
    text.includes(`${seed.teachingText} <b>html</b>`) &&
      main().querySelector("b") === null &&
      text.includes("tutor reply one") &&
      text.includes("Response queued") &&
      text.includes("Response in progress") &&
      text.includes("Response interrupted") &&
      text.includes("Response failed") &&
      !text.includes(seed.rawError),
  ).toBe(true);
  expect(
    document.querySelectorAll("main article")[0]?.getAttribute("aria-label"),
  ).toBe("Turn 1");
  // The persistent FFR-613 notice is informational and cannot be dismissed.
  expect(
    text.includes("MIA's tutor is AI-powered.") &&
      screen.queryByRole("button", { name: /dismiss/iu }) === null,
  ).toBe(true);
  courseUnitCheckpoint("tutoring-transcript");
});

it("Tutoring workspace sends one message and renders the queued work from the follow-up read", async () => {
  const { control, seed } = backend();
  mount("/learn/sessions/session_1");
  await ready("Tutoring session");
  await screen.findByRole("button", { name: "Send" });
  const user = userEvent.setup();
  await user.click(composer());
  await user.keyboard(seed.teachingText);
  await user.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(control.workReads).toBe(2));
  const message = JSON.parse(control.messageBodies[0] ?? "{}") as {
    data?: { attributes?: Record<string, unknown> };
  };
  expect(
    control.messagePosts === 1 &&
      control.messageCsrf[0] === seed.csrf &&
      control.messageTypes[0] === "application/vnd.api+json" &&
      requestIdPattern.test(
        String(message.data?.attributes?.client_request_id ?? ""),
      ) &&
      message.data?.attributes?.content === seed.teachingText &&
      // The follow-up read is the plain current-work read (D4), never the
      // mutation document's links URL.
      control.workQueries.join() === "," &&
      !control.ledger.includes("create"),
  ).toBe(true);
  // The committed message renders from the authoritative work state; the
  // draft cleared; the queued announcement fired politely exactly once.
  await waitFor(() =>
    expect(
      document.body.textContent?.includes("Current work") === true &&
        document.body.textContent?.includes("Response queued") === true,
    ).toBe(true),
  );
  const polite = Array.from(document.querySelectorAll("[aria-live]")).find(
    (node) => node.getAttribute("aria-live") === "polite",
  );
  expect(
    (composer() as HTMLTextAreaElement).value === "" &&
      polite?.textContent === "Message queued." &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-workspace-send");
});

it("Tutoring workspace queue-only work offers Queue message and dedupes current work from the transcript", async () => {
  const { control, seed } = backend();
  control.workState = "generating";
  control.workGenerating = true;
  control.workQueue = true;
  // The generating response's transcript turn is suppressed from the
  // paginated list while the current-work region renders it (D5).
  control.turns = [
    tutoringTurn(
      seed.rawError,
      "response_gen",
      "session_1",
      seed.name,
      "generating",
      "",
    ),
  ];
  mount("/learn/sessions/session_1");
  await ready("Tutoring session");
  await screen.findByRole("button", { name: "Queue message" });
  await waitFor(() =>
    expect(
      document.body.textContent?.includes("Current work") === true &&
        document.body.textContent?.includes("Response in progress") === true,
    ).toBe(true),
  );
  // One rendered identity: the generating attempt appears once, in the region.
  expect(document.querySelectorAll("main article").length).toBe(1);
  const user = userEvent.setup();
  await user.click(composer());
  await user.keyboard(seed.name);
  await user.click(screen.getByRole("button", { name: "Queue message" }));
  await waitFor(() => expect(control.workReads).toBe(2));
  await waitFor(() =>
    expect(
      document.body.textContent?.includes("Response queued") === true,
    ).toBe(true),
  );
  expect(
    control.messagePosts === 1 &&
      document.querySelectorAll("main article").length === 2 &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-workspace-queue");
});

it("Tutoring workspace full queue keeps the draft and submission disabled until explicit Refresh", async () => {
  const { control, seed } = backend();
  control.workState = "generating_and_queued";
  control.workGenerating = true;
  control.workQueued = true;
  control.workSubmit = false;
  control.workQueue = false;
  mount("/learn/sessions/session_1");
  await ready("Tutoring session");
  const submit = await screen.findByRole("button", { name: "Send" });
  const user = userEvent.setup();
  await user.click(composer());
  await user.keyboard(seed.teachingText);
  expect(submit.getAttribute("aria-disabled")).toBe("true");
  await user.click(submit);
  // No dispatch; the draft is retained; only explicit Refresh re-reads.
  expect(
    control.messagePosts === 0 &&
      (composer() as HTMLTextAreaElement).value === seed.teachingText &&
      document.body.textContent?.includes("Current work") === true &&
      document.body.textContent?.includes("Response queued") === true &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-workspace-full");
});

it("Tutoring lost workspace send reconciles through the current-work read and retries only the exact attempt", async () => {
  const { control, seed } = backend();
  control.sendOutcome = "lose";
  control.commitOnSend = true;
  mount("/learn/sessions/session_1");
  await ready("Tutoring session");
  await screen.findByRole("button", { name: "Send" });
  const user = userEvent.setup();
  await user.click(composer());
  await user.keyboard(seed.teachingText);
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("heading", { name: unknownSendHeading });
  // The bound text is locked while the outcome is unknown.
  expect(
    (composer() as HTMLTextAreaElement).disabled === true &&
      control.messagePosts === 1,
  ).toBe(true);
  courseUnitCheckpoint("tutoring-workspace-unknown");
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  // Committed: the current-work read carried the retained request ID, the
  // committed message renders, and the draft cleared without a resend.
  await waitFor(() =>
    expect(
      (composer() as HTMLTextAreaElement).value === "" &&
        document.body.textContent?.includes("Current work") === true,
    ).toBe(true),
  );
  expect(
    control.messagePosts === 1 &&
      control.workQueries.includes(messageRequestId(control, 0)) &&
      document.body.textContent?.includes(seed.teachingText) === true,
  ).toBe(true);
  courseUnitCheckpoint("tutoring-workspace-reconciled");
});

it("Tutoring uncommitted workspace send retries the exact retained attempt only explicitly", async () => {
  const { control } = backend();
  control.sendOutcome = "lose";
  mount("/learn/sessions/session_1");
  await ready("Tutoring session");
  await screen.findByRole("button", { name: "Send" });
  const user = userEvent.setup();
  await user.click(composer());
  await user.keyboard("second question");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("heading", { name: unknownSendHeading });
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  const retry = await screen.findByRole("button", {
    name: "Retry exact attempt",
  });
  control.sendOutcome = "created";
  await user.click(retry);
  await waitFor(() => expect(control.workReads).toBe(4));
  expect(
    control.messagePosts === 2 &&
      control.messageBodies[0] === control.messageBodies[1],
  ).toBe(true);
  courseUnitCheckpoint("tutoring-workspace-retry");
});

it("Tutoring busy workspace send keeps the draft and never replays", async () => {
  const { control, seed } = backend();
  control.sendOutcome = "busy";
  mount("/learn/sessions/session_1");
  await ready("Tutoring session");
  await screen.findByRole("button", { name: "Send" });
  const user = userEvent.setup();
  await user.click(composer());
  await user.keyboard(seed.teachingText);
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("heading", {
    name: "The tutor is busy with other work right now. Your draft stays unchanged. Refresh the current state before sending.",
  });
  expect(
    (composer() as HTMLTextAreaElement).value === seed.teachingText &&
      control.messagePosts === 1,
  ).toBe(true);
  courseUnitCheckpoint("tutoring-workspace-busy");
});

it("Tutoring workspace reload during an unsettled send loses the draft and never replays", async () => {
  const { control } = backend();
  let release = () => {};
  control.holdSend = new Promise<void>((resolve) => {
    release = resolve;
  });
  const view = mount("/learn/sessions/session_1");
  await ready("Tutoring session");
  await screen.findByRole("button", { name: "Send" });
  const user = userEvent.setup();
  await user.click(composer());
  await user.keyboard("unsettled question");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(control.messagePosts).toBe(1));
  // The page goes away mid-flight: no outcome claim survives, no replay.
  view.unmount();
  await act(async () => release());
  mount("/learn/sessions/session_1");
  await ready("Tutoring session");
  await screen.findByRole("button", { name: "Send" });
  expect(
    control.messagePosts === 1 &&
      (composer() as HTMLTextAreaElement).value === "" &&
      screen.queryByRole("heading", { name: unknownSendHeading }) === null,
  ).toBe(true);
  courseUnitCheckpoint("tutoring-workspace-reload");
});

it("Tutoring workspace finishes read-only when the send reports the session completed", async () => {
  const { control, seed } = backend();
  control.sendOutcome = "invalid-state";
  mount("/learn/sessions/session_1");
  await ready("Tutoring session");
  await screen.findByRole("button", { name: "Send" });
  const user = userEvent.setup();
  await user.click(composer());
  await user.keyboard("last question");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await within(main()).findByText("This tutoring session is finished.");
  expect(
    screen.queryByRole("button", { name: "Send" }) === null &&
      control.messagePosts === 1 &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-workspace-finished");
});
