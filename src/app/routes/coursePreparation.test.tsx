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
import { http, HttpResponse, type JsonBodyType } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { server } from "../../../test/server";
import {
  courseUnitCheckpoint,
  courseUnitFixture,
} from "../../../scripts/secret-hygiene-evidence";
import { authenticatedSessionResponse } from "../../../test/mfaFixtures";
import { App } from "../App";
import { AnnouncementProvider } from "../../platform/announcer/AnnouncementRegion";
import { MiaIntlProvider } from "../../platform/i18n/MiaIntlProvider";
import { InvitationLink } from "../../platform/session/invitationLink";
import { PasswordResetLink } from "../../platform/session/passwordResetLink";
import { holdGuardedHistoryTraversals } from "../../platform/ui/routeDeparture";
import { authenticatedRoute } from "./entryRoutes";
import { toCourseId } from "../../platform/api/entry";
import {
  teachingTextInvalid,
  courseTextCounts,
} from "../../features/courses/courseTeachingFields";

const originalError = getConfig().getElementError;
let releaseHistory = () => {};
beforeAll(() =>
  configure({
    getElementError: () =>
      new Error("Preparation element assertion failed (content omitted)."),
  }),
);
afterAll(() => configure({ getElementError: originalError }));
beforeEach(() => {
  releaseHistory = holdGuardedHistoryTraversals(window);
});
afterEach(() => releaseHistory());
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
const json = (body: JsonBodyType, status = 200) =>
  HttpResponse.json(body, {
    status,
    headers: { "Content-Type": "application/vnd.api+json" },
  });
function backend() {
  const fixture = courseUnitFixture();
  document.cookie = `mia_csrf=${fixture.csrf}; Path=/; SameSite=Strict`;
  const state = {
    ids: ["course_1"],
    grant: true,
    reads: 0,
    sends: 0,
    valid: false,
    fields: {
      description: null,
      curriculum: null,
      learning_goals: null,
      ai_tutor_instructions: null,
      language: null,
    } as Record<string, string | null>,
    field: "learning_goals",
    value: fixture.teachingText,
    denied: false,
    reject: false,
    lose: false,
    release: null as Promise<void> | null,
    readFail: false,
    readRelease: null as Promise<void> | null,
  };
  const resource = () => ({
    type: "courses",
    id: "course_1",
    attributes: {
      name: fixture.name,
      state: "inactive",
      created_at: "2026-10-08T10:00:00.000000Z",
      ...state.fields,
      readiness: {
        state: "inactive_incomplete",
        blockers: [
          { id: "learning_goals", link: "/api/v1/courses/course_1" },
          {
            id: "qualifying_material",
            link: "/api/v1/courses/course_1/materials",
          },
        ],
      },
    },
    relationships: { supervisors: { data: [{ type: "users", id: "s1" }] } },
  });
  const fail = (status: number, code: string) =>
    json(
      { errors: [{ status: String(status), code, detail: fixture.rawError }] },
      status,
    );
  server.use(
    http.get("/api/v1/auth/session", () => authenticatedSessionResponse()),
    http.get("/api/v1/users/me/capabilities", () =>
      json({
        data: {
          type: "account-capabilities",
          id: "account-id",
          attributes: {
            capabilities: actions.map((action) => ({
              action,
              available: action === "courses.supervise" && state.grant,
              scope: {
                global: false,
                own_resource: false,
                course_ids: action === "courses.supervise" ? state.ids : [],
                student_ids: [],
                course_students: [],
              },
            })),
          },
        },
      }),
    ),
    http.get("/api/v1/courses/course_1", async () => {
      state.reads++;
      if (state.readRelease) await state.readRelease;
      return state.denied
        ? fail(404, "course_not_found")
        : state.readFail
          ? fail(503, "course_readiness_unavailable")
          : json({ data: resource() });
    }),
    http.patch("/api/v1/courses/course_1", async ({ request }) => {
      state.sends++;
      state.valid =
        JSON.stringify(await request.json()) ===
          JSON.stringify({
            data: {
              type: "courses",
              id: "course_1",
              attributes: {
                [state.field]: state.value === "" ? null : state.value,
              },
            },
          }) && request.headers.get("X-CSRF-Token") === fixture.csrf;
      if (state.release) await state.release;
      if (state.denied) return fail(404, "course_not_found");
      if (state.reject) return fail(422, "course_invalid");
      state.fields[state.field] =
        state.value === "" ? null : state.value.trim();
      return state.lose ? HttpResponse.error() : json({ data: resource() });
    }),
  );
  return { fixture, state };
}
function mount(path = "/prepare/courses/course_1/learning-goals") {
  window.history.replaceState(null, "", path);
  return render(
    <AnnouncementProvider>
      <MiaIntlProvider initialLocale="en-US">
        <App
          initialTextSize="standard"
          passwordResetLink={new PasswordResetLink(null)}
          invitationLink={new InvitationLink(null)}
        />
      </MiaIntlProvider>
    </AnnouncementProvider>,
  );
}
async function input() {
  await screen.findByRole("heading", { level: 1, name: "Learning goals" });
  return screen.findByLabelText("Learning goals");
}
async function replace(value: string) {
  const user = userEvent.setup();
  const field = await input();
  await user.clear(field);
  await user.type(field, value);
  return user;
}
function mainIncludes(text: string) {
  return document.querySelector("main")?.textContent?.includes(text) === true;
}

it("preparation gates assigned identities before any dependent course request", async () => {
  const { state } = backend();
  state.ids = [];
  mount();
  await screen.findByRole("heading", { level: 1, name: "Home" });
  expect(
    state.reads === 0 &&
      state.sends === 0 &&
      screen.queryByLabelText("Learning goals") === null,
  ).toBe(true);
  const access = {
    ownProfileView: false,
    invitationAdministration: false,
    courseRecords: true,
    courseCreate: true,
    supervisorAssignments: true,
    courseSupervision: true,
    supervisedCourseIds: [toCourseId("opaque/identity")],
  };
  expect(
    authenticatedRoute(
      "/prepare/courses/opaque%2Fidentity/learning-goals",
      access,
    ).path === "/prepare/courses/opaque%2Fidentity/learning-goals",
  ).toBe(true);
  for (const path of [
    "/prepare/courses/course_1",
    "/prepare/courses/opaque%2Fidentity/activate",
    "/prepare/courses/opaque%2Fidentity/",
    "/prepare/courses/%/details",
  ])
    expect(authenticatedRoute(path, access).key === "home").toBe(true);
  courseUnitCheckpoint("preparation-gate");
});

it("preparation validates Unicode bounds then installs persisted distinct teaching values", async () => {
  const { fixture, state } = backend();
  mount();
  const user = await replace(fixture.teachingText);
  courseUnitCheckpoint("preparation-input");
  expect(
    teachingTextInvalid("description", "😀".repeat(4001)) &&
      !teachingTextInvalid("description", "😀".repeat(4000)) &&
      courseTextCounts("😀").points === 1 &&
      courseTextCounts("😀").bytes === 4,
  ).toBe(true);
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(mainIncludes("Changes saved. The confirmed values are shown.")).toBe(
      true,
    ),
  );
  expect(
    state.sends === 1 &&
      state.valid &&
      state.fields.learning_goals === fixture.teachingText &&
      state.fields.ai_tutor_instructions === null,
  ).toBe(true);
  courseUnitCheckpoint("preparation-persisted");
  await user.click(screen.getByRole("link", { name: "Course preparation" }));
  await screen.findByRole("heading", { level: 1, name: "Course preparation" });
  await waitFor(() =>
    expect(mainIncludes("Inactive — preparation is incomplete")).toBe(true),
  );
  await waitFor(() =>
    expect(
      screen.queryAllByRole("link", { name: "AI instructions" }).length > 0,
    ).toBe(true),
  );
  expect(
    Array.from(document.querySelectorAll("main a")).every(
      (node) =>
        !/(activate|supervisors|brief)/u.test(node.getAttribute("href") ?? ""),
    ),
  ).toBe(true);
  expect(
    within(screen.getByRole("navigation", { name: "Course preparation" }))
      .getByRole("link", { name: "Course materials" })
      .getAttribute("href") === "/prepare/courses/course_1/materials" &&
      screen
        .getByRole("link", {
          name: "Choose material to review its brief",
        })
        .getAttribute("href") === "/prepare/courses/course_1/materials" &&
      document.querySelectorAll(
        'main dl a[href="/prepare/courses/course_1/materials"]',
      ).length === 1,
  ).toBe(true);
  await user.click(
    screen.getAllByRole("link", { name: "AI instructions" })[0] as HTMLElement,
  );
  await screen.findByRole("heading", { level: 1, name: "AI instructions" });
  expect(
    ((await screen.findByLabelText("AI instructions")) as HTMLTextAreaElement)
      .value === "",
  ).toBe(true);
});

it("preparation backend validation retains correction and clears invalid associations", async () => {
  const { fixture, state } = backend();
  state.reject = true;
  mount();
  const user = await replace(fixture.teachingText);
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(
      screen.getByLabelText("Learning goals").getAttribute("aria-invalid") ===
        "true",
    ).toBe(true),
  );
  const field = screen.getByLabelText("Learning goals");
  expect(
    field.getAttribute("aria-describedby")?.includes("teaching-error") ===
      true &&
      document.activeElement === field &&
      (field as HTMLTextAreaElement).value === fixture.teachingText,
  ).toBe(true);
  courseUnitCheckpoint("preparation-error");
  await user.type(field, " ");
  expect(
    field.getAttribute("aria-invalid") === "false" &&
      !mainIncludes(
        "The change was not accepted. Check this field and its requirements, then save again.",
      ),
  ).toBe(true);
  state.reject = false;
  state.value += " ";
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(state.sends === 2).toBe(true));
});

it("preparation unknown save reconciles matching or differing values without replay", async () => {
  const { fixture, state } = backend();
  state.lose = true;
  mount();
  const user = await replace(fixture.teachingText);
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Learning goals") as HTMLTextAreaElement).readOnly,
    ).toBe(true),
  );
  courseUnitCheckpoint("preparation-unknown");
  state.fields.learning_goals = null;
  await user.click(
    screen.getByRole("button", { name: "Check current course" }),
  );
  await screen.findByRole("heading", { name: "Current persisted value" });
  expect(
    (screen.getByLabelText("Learning goals") as HTMLTextAreaElement).value ===
      fixture.teachingText && state.sends === 1,
  ).toBe(true);
  state.fields.learning_goals = fixture.teachingText;
  await user.click(
    screen.getByRole("button", { name: "Check current course" }),
  );
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Learning goals") as HTMLTextAreaElement)
        .readOnly === false,
    ).toBe(true),
  );
  expect(
    state.sends === 1 &&
      !mainIncludes("Changes saved. The confirmed values are shown."),
  ).toBe(true);
  courseUnitCheckpoint("preparation-reconciled");
});

it("preparation hidden PATCH denial unmounts draft preview and keeps collapsed disclosure", async () => {
  const { fixture, state } = backend();
  mount();
  const user = await replace(fixture.teachingText);
  await user.click(
    screen.getByText("Exact plain-text preview", { selector: "summary" }),
  );
  state.denied = true;
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByRole("heading", {
    level: 1,
    name: "Course access unavailable",
  });
  expect(
    screen.queryByLabelText("Learning goals") === null &&
      !document.body.textContent?.includes(fixture.teachingText) &&
      !document.body.textContent?.includes(fixture.name) &&
      !document.body.textContent?.includes(fixture.rawError),
  ).toBe(true);
  await user.click(screen.getByRole("button", { name: "Technical details" }));
  expect(
    document.querySelector("pre")?.textContent?.includes(fixture.rawError) ===
      true,
  ).toBe(true);
  courseUnitCheckpoint("preparation-hidden");
});

it("preparation dirty dialog loses input on lifecycle security override without requests", async () => {
  const { fixture, state } = backend();
  mount();
  const user = await replace(fixture.teachingText);
  await user.click(screen.getByRole("link", { name: "Course preparation" }));
  await screen.findByRole("dialog");
  const reads = state.reads;
  act(() => window.dispatchEvent(new Event("focus")));
  await screen.findByRole("button", { name: "Refresh" });
  expect(
    screen.queryByRole("dialog") === null &&
      screen.queryByLabelText("Learning goals") === null &&
      !document.body.textContent?.includes(fixture.teachingText) &&
      state.reads === reads,
  ).toBe(true);
  state.ids = [];
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await screen.findByRole("heading", { level: 1, name: "Home" });
  expect(state.reads === reads && state.sends === 0).toBe(true);
  courseUnitCheckpoint("preparation-cleared");
});

it("preparation Stop waiting fences late save success and a newer read preserves draft", async () => {
  const { fixture, state } = backend();
  let release = () => {};
  state.release = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount();
  const user = await replace(fixture.teachingText);
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await user.click(await screen.findByRole("button", { name: "Stop waiting" }));
  await act(async () => release());
  await waitFor(() =>
    expect(state.fields.learning_goals === fixture.teachingText).toBe(true),
  );
  expect(
    !mainIncludes("Changes saved. The confirmed values are shown.") &&
      state.sends === 1,
  ).toBe(true);
  await user.click(
    screen.getByRole("button", { name: "Check current course" }),
  );
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Learning goals") as HTMLTextAreaElement)
        .readOnly === false,
    ).toBe(true),
  );
  await user.type(screen.getByLabelText("Learning goals"), " ");
  const persisted = fixture.teachingText + " persisted";
  state.fields.learning_goals = persisted;
  await user.click(
    screen.getByRole("button", { name: "Check current course" }),
  );
  await waitFor(() =>
    expect(
      mainIncludes(
        "Newer persisted values are shown. Local edits were not replaced; review before saving.",
      ),
    ).toBe(true),
  );
  expect(
    (screen.getByLabelText("Learning goals") as HTMLTextAreaElement).value ===
      fixture.teachingText + " " &&
      screen
        .getByRole("heading", { name: "Current persisted value" })
        .parentElement?.querySelector("pre")?.textContent === persisted &&
      state.sends === 1,
  ).toBe(true);
  courseUnitCheckpoint("preparation-newer");
});

it("preparation security departure fences an in-flight save before protected completion", async () => {
  const { fixture, state } = backend();
  let release = () => {};
  state.release = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount();
  const user = await replace(fixture.teachingText);
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByRole("button", { name: "Stop waiting" });
  await waitFor(() => expect(state.sends === 1).toBe(true));
  const reads = state.reads;
  act(() => window.dispatchEvent(new Event("focus")));
  await screen.findByRole("button", { name: "Refresh" });
  await act(async () => release());
  await waitFor(() =>
    expect(state.fields.learning_goals === fixture.teachingText).toBe(true),
  );
  expect(
    screen.queryByLabelText("Learning goals") === null &&
      !mainIncludes(fixture.teachingText) &&
      !document.body.textContent?.includes("Changes saved.") &&
      state.reads === reads &&
      state.sends === 1,
  ).toBe(true);
  courseUnitCheckpoint("preparation-late-cleared");
});

for (const operation of ["PATCH", "GET"] as const) {
  it(`preparation stopped ${operation} denial still destroys current protected input`, async () => {
    const { fixture, state } = backend();
    mount();
    const user = await replace(fixture.teachingText);
    await user.click(
      screen.getByText("Exact plain-text preview", { selector: "summary" }),
    );
    let release = () => {};
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    if (operation === "PATCH") state.release = barrier;
    else state.readRelease = barrier;
    const reads = state.reads;
    await user.click(
      screen.getByRole("button", {
        name: operation === "PATCH" ? "Save changes" : "Check current course",
      }),
    );
    await waitFor(() =>
      expect(
        operation === "PATCH" ? state.sends === 1 : state.reads === reads + 1,
      ).toBe(true),
    );
    await user.click(
      await screen.findByRole("button", { name: "Stop waiting" }),
    );
    if (operation === "GET") {
      await user.click(
        screen.getByRole("link", { name: "Course preparation" }),
      );
      await screen.findByRole("dialog");
    }
    courseUnitCheckpoint(`preparation-stopped-${operation}`);
    state.denied = true;
    await act(async () => release());
    await screen.findByRole("heading", {
      level: 1,
      name: "Course access unavailable",
    });
    expect(
      screen.queryByLabelText("Learning goals") === null &&
        screen.queryByRole("dialog") === null &&
        !document.body.textContent?.includes(fixture.teachingText) &&
        !document.body.textContent?.includes(fixture.name) &&
        !document.body.textContent?.includes(fixture.rawError) &&
        screen
          .getByRole("button", { name: "Technical details" })
          .getAttribute("aria-expanded") === "false",
    ).toBe(true);
    await user.click(screen.getByRole("button", { name: "Technical details" }));
    expect(
      document.querySelector("pre")?.textContent?.includes(fixture.rawError) ===
        true,
    ).toBe(true);
    expect(
      state.sends === (operation === "PATCH" ? 1 : 0) &&
        state.reads === reads + (operation === "GET" ? 1 : 0),
    ).toBe(true);
    courseUnitCheckpoint(`preparation-stopped-hidden-${operation}`);
  });
}

it("preparation stopped denial remains applicable after a newer same-resource check", async () => {
  const { fixture, state } = backend();
  let release = () => {};
  state.release = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount();
  const user = await replace(fixture.teachingText);
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(state.sends === 1).toBe(true));
  await user.click(await screen.findByRole("button", { name: "Stop waiting" }));
  state.fields.learning_goals = fixture.teachingText;
  await user.click(
    screen.getByRole("button", { name: "Check current course" }),
  );
  await waitFor(() =>
    expect(
      mainIncludes("The current course matches the submitted value."),
    ).toBe(true),
  );
  state.denied = true;
  await act(async () => {
    release();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  await screen.findByRole("heading", {
    level: 1,
    name: "Course access unavailable",
  });
  expect(
    screen.queryByLabelText("Learning goals") === null &&
      !document.body.textContent?.includes(fixture.teachingText) &&
      !document.body.textContent?.includes(fixture.name) &&
      !mainIncludes("Changes saved.") &&
      state.sends === 1,
  ).toBe(true);
  courseUnitCheckpoint("preparation-same-resource-denial");
});

it("preparation pending dirty read guards departure and fences departed denial", async () => {
  const { fixture, state } = backend();
  mount();
  const user = await replace(fixture.teachingText);
  let release = () => {};
  state.readRelease = new Promise<void>((resolve) => {
    release = resolve;
  });
  const reads = state.reads;
  await user.click(
    screen.getByRole("button", { name: "Check current course" }),
  );
  await waitFor(() => expect(state.reads === reads + 1).toBe(true));
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  await user.click(screen.getByRole("link", { name: "Course preparation" }));
  await screen.findByRole("dialog");
  await user.click(screen.getByRole("button", { name: "Stay on this page" }));
  expect(
    (screen.getByLabelText("Learning goals") as HTMLTextAreaElement).value ===
      fixture.teachingText && state.reads === reads + 1,
  ).toBe(true);
  courseUnitCheckpoint("preparation-read-stay");
  await user.click(screen.getByRole("link", { name: "Home" }));
  await screen.findByRole("dialog");
  await user.click(screen.getByRole("button", { name: "Discard and leave" }));
  await screen.findByRole("heading", { level: 1, name: "Home" });
  state.denied = true;
  await act(async () => {
    release();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
  expect(
    screen.queryByRole("heading", { name: "Course access unavailable" }) ===
      null && !document.body.textContent?.includes(fixture.teachingText),
  ).toBe(true);
  courseUnitCheckpoint("preparation-read-discard");
});
