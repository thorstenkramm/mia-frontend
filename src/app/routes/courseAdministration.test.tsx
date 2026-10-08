import {
  act,
  configure,
  getConfig,
  render,
  screen,
  waitFor,
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

const originalError = getConfig().getElementError;
let releaseHistory = () => {};
beforeAll(() =>
  configure({
    getElementError: () =>
      new Error("Course element assertion failed (content omitted)."),
  }),
);
afterAll(() => configure({ getElementError: originalError }));
beforeEach(() => {
  releaseHistory = holdGuardedHistoryTraversals(window);
});
afterEach(() => {
  releaseHistory();
});
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
const json = (data: JsonBodyType, status = 200) =>
  HttpResponse.json(data, {
    status,
    headers: { "Content-Type": "application/vnd.api+json" },
  });
function backend() {
  const fixture = courseUnitFixture();
  document.cookie = `mia_csrf=${fixture.csrf}; Path=/; SameSite=Strict`;
  const state = {
    grants: new Set([
      "courses.create",
      "course_records.manage",
      "course_supervisors.manage",
      "accounts.administer",
      "courses.supervise",
    ]),
    global: true,
    ids: [] as string[],
    candidateReads: 0,
    coursesReads: 0,
    detailReads: [] as string[],
    posts: 0,
    bodyValid: false,
    denied: false,
    selectedInvalid: false,
    lose: false,
    release: null as Promise<void> | null,
    persisted: false,
  };
  const course = (id = "course_1") => ({
    type: "courses",
    id,
    attributes: {
      name: fixture.name,
      state: "inactive",
      created_at: "2026-10-08T10:00:00.000000Z",
    },
    relationships: { supervisors: { data: [{ type: "users", id: "s1" }] } },
  });
  const failure = () =>
    json(
      {
        errors: [
          {
            status: "403",
            code: "user_administration_unauthorized",
            detail: fixture.rawError,
          },
        ],
      },
      403,
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
              available: state.grants.has(action),
              scope: {
                global:
                  state.global &&
                  state.grants.has(action) &&
                  action !== "courses.supervise",
                course_ids: action === "courses.supervise" ? state.ids : [],
                student_ids: [],
                course_students: [],
                own_resource: false,
              },
            })),
          },
        },
      }),
    ),
    http.get("/api/v1/users", ({ request }) => {
      state.candidateReads++;
      if (state.denied) return failure();
      const offset = Number(
        new URL(request.url).searchParams.get("page[offset]"),
      );
      const link = (number: number) =>
        `/api/v1/users?filter[role]=supervisor&filter[state]=active&page[limit]=25&page[offset]=${number}`;
      return json({
        data: [
          {
            type: "administration-accounts",
            id: offset === 0 ? "s1" : "s2",
            attributes: {
              username: fixture.username,
              account_class: "staff",
              account_state: "active",
              permanent_roles: ["supervisor"],
            },
          },
        ],
        meta: { has_more: offset === 0 },
        links: offset === 0 ? { next: link(25) } : { prev: link(0) },
      });
    }),
    http.get("/api/v1/courses", () => {
      state.coursesReads++;
      return json({
        data: state.persisted ? [course()] : [],
        meta: { has_more: false },
      });
    }),
    http.get("/api/v1/courses/:id", ({ params }) => {
      const id = String(params.id);
      state.detailReads.push(id);
      return json({ data: course(id) });
    }),
    http.post("/api/v1/courses", async ({ request }) => {
      state.posts++;
      state.bodyValid =
        JSON.stringify(await request.json()) ===
          JSON.stringify({
            data: {
              type: "courses",
              attributes: { name: fixture.name },
              relationships: {
                supervisors: { data: [{ type: "users", id: "s1" }] },
              },
            },
          }) && request.headers.get("X-CSRF-Token") === fixture.csrf;
      if (state.release) await state.release;
      if (state.selectedInvalid)
        return json(
          {
            errors: [
              {
                status: "422",
                code: "course_supervisor_invalid",
                detail: fixture.rawError,
              },
            ],
          },
          422,
        );
      state.persisted = true;
      return state.lose ? HttpResponse.error() : json({ data: course() }, 201);
    }),
  );
  return { state, fixture };
}
function mount(path = "/admin/courses/new") {
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
async function fill(name: string) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText("Course name (required)"), name);
  await user.click(screen.getAllByRole("checkbox")[0] as HTMLElement);
  return user;
}
function supervisorInvalid(expected: boolean, message: string) {
  const group = screen.getByRole("group", {
    name: "Supervisors (at least one required)",
  });
  for (const control of [
    group,
    ...group.querySelectorAll('input[type="checkbox"]'),
  ]) {
    expect((control.getAttribute("aria-invalid") === "true") === expected).toBe(
      true,
    );
    const description = (control.getAttribute("aria-describedby") ?? "")
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent ?? "")
      .join(" ");
    expect(description.includes(message) === expected).toBe(true);
  }
}

it("course form validates locally then redirects only after definitive creation", async () => {
  const { state, fixture } = backend();
  mount();
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Create course" }),
  );
  expect(state.posts === 0).toBe(true);
  expect(document.activeElement?.tagName === "H2").toBe(true);
  await user.type(
    screen.getByLabelText("Course name (required)"),
    fixture.name,
  );
  await user.click(screen.getByRole("button", { name: "Create course" }));
  supervisorInvalid(true, "Select at least one supervisor.");
  expect(state.posts === 0).toBe(true);
  courseUnitCheckpoint("route-invalid");
  await user.click(screen.getAllByRole("checkbox")[0] as HTMLElement);
  supervisorInvalid(false, "Select at least one supervisor.");
  courseUnitCheckpoint("route-draft");
  await user.click(screen.getByRole("button", { name: "Create course" }));
  await screen.findByRole("heading", {
    level: 1,
    name: "Course administration",
  });
  expect(
    state.posts === 1 && state.bodyValid && state.detailReads.length === 1,
  ).toBe(true);
  await waitFor(() =>
    expect(screen.getByRole("main").textContent?.includes(fixture.name)).toBe(
      true,
    ),
  );
  courseUnitCheckpoint("route-persisted");
});

it("course selector denial tears down selected draft and retains collapsed raw disclosure", async () => {
  const { state, fixture } = backend();
  mount();
  const user = await fill(fixture.name);
  courseUnitCheckpoint("route-draft");
  state.denied = true;
  await user.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByRole("heading", {
    level: 1,
    name: "Course access unavailable",
  });
  expect(
    document.querySelector("form") === null &&
      document.querySelector("input[type=checkbox]") === null &&
      !document.body.textContent?.includes(fixture.username),
  ).toBe(true);
  expect(document.querySelector("pre") === null).toBe(true);
  await user.click(screen.getByRole("button", { name: "Technical details" }));
  expect(
    document.querySelector("pre")?.textContent?.includes(fixture.rawError),
  ).toBe(true);
  courseUnitCheckpoint("route-error");
});

it("course unknown response is not success and cannot replay on review", async () => {
  const { state, fixture } = backend();
  state.lose = true;
  mount();
  const user = await fill(fixture.name);
  courseUnitCheckpoint("route-draft");
  await user.click(screen.getByRole("button", { name: "Create course" }));
  await screen.findByRole("heading", { name: "Save outcome unknown" });
  expect(
    state.posts === 1 && document.querySelector("#course-name") === null,
  ).toBe(true);
  await user.click(screen.getByRole("link", { name: "Review courses" }));
  await screen.findByRole("heading", { level: 1, name: "Courses" });
  await waitFor(() =>
    expect(
      state.posts === 1 &&
        state.coursesReads === 1 &&
        screen.getByRole("main").textContent?.includes(fixture.name),
    ).toBe(true),
  );
  courseUnitCheckpoint("route-persisted");
});

it("course stale supervisor rejection preserves correction without identity inference", async () => {
  const { state, fixture } = backend();
  state.selectedInvalid = true;
  mount();
  const user = await fill(fixture.name);
  await user.click(screen.getByRole("button", { name: "Create course" }));
  await screen.findAllByText(
    "The supervisor set could not be assigned. Review your selection and try a corrected set.",
  );
  expect(
    (screen.getByLabelText("Course name (required)") as HTMLInputElement)
      .value === fixture.name &&
      state.posts === 1 &&
      state.detailReads.length === 0,
  ).toBe(true);
  supervisorInvalid(
    true,
    "The supervisor set could not be assigned. Review your selection and try a corrected set.",
  );
  courseUnitCheckpoint("route-error");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(state.candidateReads === 2).toBe(true));
  await user.click(screen.getAllByRole("checkbox")[0] as HTMLElement);
  supervisorInvalid(
    false,
    "The supervisor set could not be assigned. Review your selection and try a corrected set.",
  );
  expect(state.posts === 1 && state.detailReads.length === 0).toBe(true);
  courseUnitCheckpoint("route-corrected");
});

it("course selection spans pages and dirty Stay does not reauthorize", async () => {
  const { state, fixture } = backend();
  mount();
  const user = await fill(fixture.name);
  await user.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() => expect(state.candidateReads === 2).toBe(true));
  await user.click(screen.getByRole("button", { name: "Previous" }));
  await waitFor(() => expect(state.candidateReads === 3).toBe(true));
  expect((screen.getAllByRole("checkbox")[0] as HTMLInputElement).checked).toBe(
    true,
  );
  await user.click(screen.getByRole("link", { name: "Back to courses" }));
  await screen.findByRole("dialog");
  await user.click(screen.getByRole("button", { name: "Stay on this page" }));
  expect(
    state.candidateReads === 3 &&
      (screen.getByLabelText("Course name (required)") as HTMLInputElement)
        .value === fixture.name,
  ).toBe(true);
  courseUnitCheckpoint("route-draft");
});

it("course privacy shield overrides an open dirty dialog without extra requests", async () => {
  const { state, fixture } = backend();
  mount();
  const user = await fill(fixture.name);
  await user.click(screen.getByRole("link", { name: "Back to courses" }));
  await screen.findByRole("dialog");
  await act(async () => window.dispatchEvent(new Event("pagehide")));
  expect(
    document.querySelector("#course-name") === null &&
      screen.queryByRole("dialog") === null &&
      !document.body.textContent?.includes(fixture.username),
  ).toBe(true);
  expect(state.candidateReads === 1 && state.posts === 0).toBe(true);
  courseUnitCheckpoint("route-cleared");
});

it("course Prepare batches known IDs and never reads visible-course union", async () => {
  const { state } = backend();
  state.ids = Array.from({ length: 26 }, (_, i) => `assigned_${i}`);
  mount("/prepare/courses");
  await screen.findByRole("heading", { level: 1, name: "Prepare courses" });
  expect(
    state.detailReads.length === 25 &&
      state.detailReads.every((id) => state.ids.includes(id)) &&
      state.coursesReads === 0 &&
      state.candidateReads === 0,
  ).toBe(true);
  courseUnitCheckpoint("route-batch");
  await userEvent
    .setup()
    .click(
      await screen.findByRole("button", { name: "Show more assigned courses" }),
    );
  await waitFor(() => expect(state.detailReads.length === 26).toBe(true));
  expect(state.coursesReads === 0).toBe(true);
});

it("course account and non-global capability gates withhold collection requests", async () => {
  const { state } = backend();
  state.grants.delete("accounts.administer");
  const view = mount();
  await screen.findByRole("heading", { level: 1, name: "Create course" });
  expect(state.candidateReads === 0 && state.posts === 0).toBe(true);
  courseUnitCheckpoint("route-prerequisite");
  view.unmount();
  state.global = false;
  mount("/admin/courses");
  await screen.findByRole("heading", { level: 1, name: "Home" });
  expect(state.coursesReads === 0 && state.detailReads.length === 0).toBe(true);
});
