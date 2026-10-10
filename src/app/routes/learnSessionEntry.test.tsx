import {
  act,
  configure,
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
  tutoringSessionDocument,
  tutoringTurn,
  tutoringTurnsPage,
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
    outcome: "created",
    createOnPost: false,
    turns: null as unknown[] | null,
    courseReads: 0,
    discoveryReads: 0,
    materialReads: 0,
    sessionReads: 0,
    turnReads: 0,
    capabilityReads: 0,
    posts: 0,
    postBodies: [] as string[],
    postCsrf: [] as (string | null)[],
    postTypes: [] as (string | null)[],
    holdCapabilities: null as Promise<void> | null,
    holdPost: null as Promise<void> | null,
    ledger: [] as string[],
  };
  const fail = (status: number, code: string) =>
    json(
      { errors: [{ status: String(status), code, detail: seed.rawError }] },
      status,
    );
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
      if (control.createOnPost) control.activeSession = true;
      if (control.outcome === "lose") return HttpResponse.error();
      return json(
        tutoringSessionDocument(seed.rawError),
        control.outcome === "replay" ? 200 : 201,
      );
    }),
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
function mount(location = "/learn/start") {
  window.history.replaceState(null, "", location);
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
async function startMaterial() {
  const view = mount("/learn/start/course_1/material");
  await ready("Choose material");
  // The route component is lazy; wait for its admitted start form.
  await screen.findByRole("button", { name: "Start session" });
  return { user: userEvent.setup(), view };
}
async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Start session" }));
}
const unknownHeading =
  "The start outcome is unknown. The session may have been created. Reconcile checks the current state; this attempt is never repeated automatically.";

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
        document.title === "MIA" &&
        !document.body.textContent?.includes(seed.teachingText),
    ).toBe(true);
    await act(async () => release());
    await ready("Tutoring session");
    await waitFor(() =>
      expect(document.body.textContent?.includes(seed.teachingText)).toBe(true),
    );
    expect(
      control.ledger.join() === "session,capabilities,tutoring-session,turns" &&
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

it("Tutoring material start dispatches one request-ID-bound creation and navigates to the workspace", async () => {
  const { control, seed } = backend();
  const { user } = await startMaterial();
  const radios = screen.getAllByRole("radio");
  const none = radios[0];
  const material = radios[1];
  if (none === undefined || material === undefined)
    throw new Error("Expected the No material option and one material row.");
  expect((none as HTMLInputElement).checked).toBe(true);
  await user.click(material);
  await submit(user);
  await ready("Tutoring session");
  const body = JSON.parse(control.postBodies[0] ?? "{}") as {
    data?: {
      attributes?: Record<string, unknown>;
      relationships?: unknown;
    };
  };
  expect(
    control.posts === 1 &&
      control.postCsrf[0] === seed.csrf &&
      control.postTypes[0] === "application/vnd.api+json" &&
      requestIdPattern.test(
        String(body.data?.attributes?.client_request_id ?? ""),
      ) &&
      Object.keys(body.data?.attributes ?? {}).join() === "client_request_id" &&
      JSON.stringify(body.data?.relationships) ===
        JSON.stringify({
          materials: { data: [{ type: "materials", id: "material_1" }] },
        }),
  ).toBe(true);
  // The workspace shows the persistent FFR-613 notice and the transcript.
  await waitFor(() =>
    expect(
      document.body.textContent?.includes("MIA's tutor is AI-powered."),
    ).toBe(true),
  );
  expect(
    window.location.pathname === "/learn/sessions/session_1" &&
      document.body.textContent?.includes(seed.teachingText) &&
      !document.body.textContent?.includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-created");
});

it("Tutoring start replay 200 without material is the same definitive navigation", async () => {
  const { control } = backend();
  control.outcome = "replay";
  const { user } = await startMaterial();
  await submit(user);
  await ready("Tutoring session");
  const body = JSON.parse(control.postBodies[0] ?? "{}") as {
    data?: { attributes?: Record<string, unknown>; relationships?: unknown };
  };
  expect(
    control.posts === 1 &&
      window.location.pathname === "/learn/sessions/session_1" &&
      requestIdPattern.test(
        String(body.data?.attributes?.client_request_id ?? ""),
      ) &&
      body.data?.relationships === undefined,
  ).toBe(true);
  courseUnitCheckpoint("tutoring-replay");
});

it("Tutoring active-session and request conflicts reconcile through one discovery read without a second start", async () => {
  for (const outcome of ["conflict-active", "conflict-request"]) {
    const { control, seed } = backend();
    control.outcome = outcome;
    const { user, view } = await startMaterial();
    await submit(user);
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
    const { user } = await startMaterial();
    await submit(user);
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
      expect(window.location.pathname.endsWith("/material")).toBe(true);
    }
    expect(
      control.posts === 1 &&
        !document.body.textContent?.includes(seed.rawError),
    ).toBe(true);
    courseUnitCheckpoint("tutoring-rejected");
  });

it("Tutoring lost start response stays unknown and explicit reconcile resumes the discovered session", async () => {
  const { control, seed } = backend();
  control.outcome = "lose";
  control.createOnPost = true;
  const { user } = await startMaterial();
  await submit(user);
  await screen.findByRole("heading", { name: unknownHeading });
  expect(
    control.posts === 1 &&
      window.location.pathname.endsWith("/material") &&
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
  const { user } = await startMaterial();
  await submit(user);
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
  expect(
    control.posts === 2 &&
      control.postBodies.length === 2 &&
      control.postBodies[0] === control.postBodies[1],
  ).toBe(true);
  courseUnitCheckpoint("tutoring-retry");
});

it("Tutoring abandon destroys the retained attempt locally and a later start is a fresh attempt", async () => {
  const { control } = backend();
  control.outcome = "lose";
  const { user } = await startMaterial();
  await submit(user);
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
      control.postBodies[0] !== control.postBodies[1],
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
  const { user } = await startMaterial();
  await submit(user);
  await waitFor(() => expect(control.posts).toBe(1));
  await user.click(screen.getByRole("button", { name: "Stop waiting" }));
  await screen.findByRole("heading", { name: unknownHeading });
  await act(async () => release());
  await waitFor(() => expect(control.activeSession).toBe(true));
  expect(
    control.posts === 1 && window.location.pathname.endsWith("/material"),
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

it("Tutoring hidden causes share one neutral presentation on the material and workspace routes", async () => {
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
  ]) {
    const { control, seed } = backend();
    control.available = cause !== "capability";
    control.ids = cause === "scope" ? [] : ["course_1"];
    control.courseState = cause === "inactive" ? "inactive" : "active";
    control.denyCourse = ["404", "403", "429"].includes(cause)
      ? Number(cause)
      : 0;
    control.denyDiscovery = cause === "discovery-429" ? 429 : 0;
    control.denySession = cause === "session-404" ? 404 : 0;
    const path =
      cause === "session-404"
        ? "/learn/sessions/session_1"
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
        control.posts === 0,
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
  await screen.findByText("This tutoring session is finished.");
  expect(
    control.turnReads === 0 &&
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
