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
import { courseUnitFixture } from "../../../test/courseUnitFixture";
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
      new Error("Activation assertion failed (content omitted)."),
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
    headers: {
      "Content-Type": "application/vnd.api+json",
      "Cache-Control": "no-store",
    },
  });
function backend() {
  const fixture = courseUnitFixture();
  document.cookie = `mia_csrf=${fixture.csrf}; Path=/; SameSite=Strict`;
  const control = {
    ids: ["course_1"],
    grant: true,
    reads: 0,
    posts: 0,
    valid: false,
    name: fixture.name,
    state: "inactive",
    activated: null as string | null,
    deactivated: null as string | null,
    readiness: "inactive_activatable",
    eligible: true,
    blockers: [] as { id: string; link: string | null }[],
    actionBlockers: [] as string[],
    outcome: "success",
    acceptance: "active_accepting",
    denied: false,
    readFail: false,
    readRelease: null as Promise<void> | null,
    postRelease: null as Promise<void> | null,
    csrf: fixture.csrf,
    teaching: null as string | null,
  };
  const resource = () => ({
    type: "courses",
    id: "course_1",
    attributes: {
      name: control.name,
      state: control.state,
      created_at: "2026-10-09T10:00:00.000000Z",
      activated_at: control.activated,
      deactivated_at: control.deactivated,
      description: null,
      curriculum: null,
      learning_goals: control.teaching,
      ai_tutor_instructions: null,
      language: null,
      readiness: {
        state: control.readiness,
        blockers: control.blockers,
        activation: {
          eligible: control.eligible,
          blockers: control.actionBlockers,
          consequences: ["activate_course"],
        },
        new_session: {
          eligible: false,
          blockers: ["course_membership_required"],
          consequences: ["start_tutoring_session"],
        },
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
              available: action === "courses.supervise" && control.grant,
              scope: {
                global: false,
                own_resource: false,
                course_ids: action === "courses.supervise" ? control.ids : [],
                student_ids: [],
                course_students: [],
              },
            })),
          },
        },
      }),
    ),
    http.get("/api/v1/courses/course_1", async () => {
      control.reads++;
      if (control.readRelease) await control.readRelease;
      return control.denied
        ? fail(404, "course_not_found")
        : control.readFail
          ? fail(503, "course_readiness_unavailable")
          : json({ data: resource() });
    }),
    http.post("/api/v1/courses/course_1/activations", async ({ request }) => {
      control.posts++;
      control.valid =
        (await request.text()) === "" &&
        request.headers.get("X-CSRF-Token") === control.csrf &&
        !request.headers.has("Content-Type") &&
        !request.headers.has("If-Match");
      if (control.postRelease) await control.postRelease;
      if (control.denied) return fail(404, "course_not_found");
      if (control.outcome === "conflict")
        return fail(409, "course_activation_unavailable");
      if (control.outcome === "already")
        return fail(409, "course_invalid_state");
      if (control.outcome === "csrf") return fail(403, "csrf_invalid");
      if (control.outcome === "expired") return fail(401, "unauthorized");
      if (control.outcome === "restricted")
        return fail(403, "auth_password_change_required");
      if (control.outcome === "server") return fail(503, "unavailable");
      control.state = "active";
      control.activated = "2026-10-09T12:00:00.000000Z";
      control.readiness = control.acceptance;
      control.eligible = false;
      control.actionBlockers = ["course_already_active"];
      if (control.outcome === "lose") return HttpResponse.error();
      return json(
        control.outcome === "malformed" ? { data: null } : { data: resource() },
      );
    }),
  );
  return { fixture, control };
}
function mount(path = "/prepare/courses/course_1/activate") {
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
const includes = (text: string) =>
  document.querySelector("main")?.textContent?.includes(text) === true;
async function confirm() {
  return screen.findByRole("button", { name: "Confirm activation" });
}
async function submit() {
  const user = userEvent.setup();
  await user.click(await confirm());
  return user;
}

it("activation checks current facts with native disabled confirmation and Cancel available", async () => {
  const { control } = backend();
  mount();
  await confirm();
  let release = () => {};
  control.readRelease = new Promise<void>((resolve) => {
    release = resolve;
  });
  await submit();
  await waitFor(() => expect(control.reads === 2).toBe(true));
  expect(((await confirm()) as HTMLButtonElement).disabled).toBe(true);
  expect(
    document
      .querySelector("main form")
      ?.textContent?.includes("Checking current course before activation…"),
  ).toBe(true);
  expect(screen.getByRole("link", { name: "Cancel" })).toBeTruthy();
  expect(
    screen
      .getByRole("heading", { level: 2, name: `Activate ${control.name}` })
      .getAttribute("tabindex"),
  ).toBe("-1");
  release();
  await screen.findByRole("heading", { level: 1, name: control.name });
});

it("activation in flight changes label, disables submit and offers Stop waiting", async () => {
  const { control } = backend();
  let release = () => {};
  control.postRelease = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount();
  await submit();
  await waitFor(() => expect(control.posts === 1).toBe(true));
  expect(
    (screen.getByRole("button", { name: "Activating…" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.getByText("Waiting for activation…")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Stop waiting" })).toBeTruthy();
  expect(screen.queryByRole("link", { name: "Cancel" })).toBeNull();
  release();
  await screen.findByRole("heading", { level: 1, name: control.name });
});

for (const path of ["readiness", "activate"])
  it(`activation ${path} requires exact assigned scope before course discovery`, async () => {
    const { control } = backend();
    control.ids = [];
    mount(`/prepare/courses/course_1/${path}`);
    await screen.findByRole("heading", { level: 1, name: "Home" });
    expect(control.reads === 0 && control.posts === 0).toBe(true);
  });

it("readiness unavailable admission hides course identity and offers explicit retry", async () => {
  const { control, fixture } = backend();
  control.readFail = true;
  mount("/prepare/courses/course_1/readiness");
  await screen.findByRole("heading", { level: 1, name: "Course readiness" });
  await screen.findByRole("heading", {
    name: "Readiness could not be checked",
  });
  expect(
    !document.querySelector("main")?.textContent?.includes(fixture.name) &&
      control.reads === 1,
  ).toBe(true);
  control.readFail = false;
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Check again" }));
  await screen.findByRole("heading", { name: "Ready for activation" });
  expect(control.reads === 2).toBe(true);
});

it("readiness offers only implemented trusted blocker destinations and no local eligibility guess", async () => {
  const { control } = backend();
  control.readiness = "inactive_incomplete";
  control.eligible = false;
  control.actionBlockers = ["language"];
  control.blockers = [
    { id: "learning_goals", link: "/api/v1/courses/course_1" },
    { id: "ai_tutor_instructions", link: "/api/v1/courses/course_1" },
    { id: "language", link: "https://example.test" },
    { id: "supervisor_presence", link: "/api/v1/courses/course_1/supervisors" },
    {
      id: "qualifying_material",
      link: "/api/v1/courses/course_1/materials?x=1",
    },
  ];
  mount("/prepare/courses/course_1/readiness");
  await screen.findByRole("heading", { level: 1, name: "Course readiness" });
  await waitFor(() =>
    expect(
      document.querySelectorAll("#course-blockers-heading + div a").length ===
        2 &&
        screen.queryByRole("link", { name: "Continue to activation" }) ===
          null &&
        includes("An administrator must resolve supervisor assignment."),
    ).toBe(true),
  );
  expect(
    screen.getByRole("heading", { name: "Activation unavailable" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("heading", { name: "How course readiness works" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("heading", { name: "AI instructions" }) !== null,
  ).toBe(true);
  const user = userEvent.setup();
  control.blockers = [];
  control.actionBlockers = ["assigned_supervisor_required"];
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await screen.findByRole("heading", { level: 1, name: "Course readiness" });
  await waitFor(() =>
    expect(
      screen.queryByRole("link", { name: "Continue to activation" }) === null &&
        includes("Activation unavailable"),
    ).toBe(true),
  );
});

it("readiness counts display blockers only and shows action-only blockers without links", async () => {
  const { control } = backend();
  control.readiness = "inactive_incomplete";
  control.eligible = false;
  control.actionBlockers = ["language"];
  mount("/prepare/courses/course_1/readiness");
  await screen.findByRole("heading", { name: "Activation unavailable" });
  expect(
    screen.getByText(
      "MIA reports 0 unmet prerequisites for this course. Resolve them, then check again here.",
    ),
  ).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Course language" })).toBeTruthy();
  expect(
    document.querySelectorAll(
      'section[aria-labelledby="course-blockers-heading"] a',
    ).length,
  ).toBe(0);
});

it("eligible readiness links to activation only after admitted first activation", async () => {
  const { control } = backend();
  mount("/prepare/courses/course_1/readiness");
  await screen.findByRole("heading", { name: "Ready for activation" });
  expect(
    screen
      .getByRole("link", { name: "Continue to activation" })
      .getAttribute("href"),
  ).toBe("/prepare/courses/course_1/activate");
  expect(control.reads === 1 && control.posts === 0).toBe(true);
});

for (const acceptance of ["active_accepting", "active_not_accepting"])
  it(`activation definitive ${acceptance} installs only returned truth then re-admits hub`, async () => {
    const { control } = backend();
    control.acceptance = acceptance;
    mount();
    const button = await confirm();
    const user = userEvent.setup();
    const csrf = courseUnitFixture().csrf;
    control.csrf = csrf;
    document.cookie = `mia_csrf=${csrf}; Path=/; SameSite=Strict`;
    await user.click(button);
    await screen.findByRole("heading", {
      level: 1,
      name: control.name,
    });
    await waitFor(() =>
      expect(
        control.posts === 1 &&
          control.valid &&
          control.reads >= 3 &&
          includes(
            acceptance === "active_accepting"
              ? "Active — open for new tutoring sessions"
              : "Active, but new tutoring sessions are unavailable",
          ) &&
          document.querySelector(
            'main a[href="/prepare/courses/course_1/students"]',
          ) !== null &&
          document.querySelector(
            'main a[href="/prepare/courses/course_1/students/new"]',
          ) === null &&
          !document.querySelector(
            'main a[href*="deactivate"], main a[href*="delete"]',
          ),
      ).toBe(true),
    );
  });

for (const change of ["name", "teaching", "eligibility", "lifecycle"])
  it(`activation changed ${change} facts invalidate review before dispatch`, async () => {
    const { control } = backend();
    mount();
    await confirm();
    if (change === "name") control.name += " changed";
    if (change === "teaching") control.teaching = "changed";
    if (change === "eligibility") {
      control.eligible = false;
      control.readiness = "inactive_incomplete";
      control.blockers = [
        {
          id: "qualifying_material",
          link: "/api/v1/courses/course_1/materials",
        },
      ];
      control.actionBlockers = ["assigned_supervisor_required"];
    }
    if (change === "lifecycle") {
      control.activated = "2026-10-08T12:00:00.000000Z";
      control.deactivated = "2026-10-09T10:00:00.000000Z";
    }
    await submit();
    await screen.findByRole("heading", {
      name:
        change === "name" || change === "teaching"
          ? "Course facts changed"
          : "Activation is unavailable",
    });
    expect(control.posts === 0 && control.reads === 2).toBe(true);
    if (change === "name")
      expect(screen.getAllByText("Changed").length).toBe(1);
    if (change === "teaching") expect(screen.queryByText("Changed")).toBeNull();
    if (change === "name" || change === "teaching") {
      await submit();
      await screen.findByRole("heading", {
        level: 1,
        name: control.name,
      });
      expect(control.posts === 1).toBe(true);
    } else
      expect(
        screen.queryByRole("button", { name: "Confirm activation" }),
      ).toBeNull();
  });

for (const outcome of ["conflict", "already", "lose", "malformed", "server"])
  it(`activation ${outcome} never claims success or automatically repeats`, async () => {
    const { control } = backend();
    control.outcome = outcome;
    mount();
    const user = await submit();
    const unknown = !["conflict", "already"].includes(outcome);
    await screen.findByRole("heading", {
      name: unknown
        ? "Activation outcome unknown"
        : "Activation was not accepted",
    });
    expect(
      screen.queryByRole("button", { name: "Confirm activation" }),
    ).toBeNull();
    if (!unknown) {
      expect(screen.getByText("Technical details")).toBeTruthy();
      expect(
        screen.getByText(
          "The course is still inactive. Refresh current readiness before confirming again.",
        ),
      ).toBeTruthy();
    }
    if (unknown) {
      await user.click(screen.getByRole("button", { name: "Refresh course" }));
      await waitFor(() => expect(control.reads === 3).toBe(true));
    } else
      expect(
        screen.getByRole("link", { name: "Review current readiness" }),
      ).toBeTruthy();
    expect(
      control.posts === 1 &&
        window.location.pathname.endsWith("activate") &&
        !document.body.textContent?.includes("Course activation confirmed."),
    ).toBe(true);
    if (unknown && control.state === "inactive") {
      await user.click(
        await screen.findByRole("button", { name: "Abandon unknown attempt" }),
      );
      expect(
        await screen.findByRole("heading", {
          name: "The unknown attempt was abandoned locally, not cancelled on the server. Review current readiness before a new attempt.",
        }),
      ).toBeTruthy();
      await waitFor(() =>
        expect(
          (
            screen.getByRole("button", {
              name: "Confirm activation",
            }) as HTMLButtonElement
          ).disabled === false,
        ).toBe(true),
      );
    }
  });

for (const phase of ["post"])
  it(`activation stopped ${phase} fences late completion and preserves applicable denial`, async () => {
    const { control, fixture } = backend();
    mount();
    await confirm();
    let release = () => {};
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    if (phase === "preflight") control.readRelease = barrier;
    else control.postRelease = barrier;
    const user = await submit();
    await waitFor(() =>
      expect(phase === "post" ? control.posts === 1 : control.reads === 2).toBe(
        true,
      ),
    );
    await user.click(screen.getByRole("button", { name: "Stop waiting" }));
    control.denied = true;
    await act(async () => release());
    await screen.findByRole("heading", {
      level: 1,
      name: "Course access unavailable",
    });
    expect(
      !document.body.textContent?.includes(fixture.name) &&
        !document.body.textContent?.includes(fixture.rawError) &&
        control.posts === (phase === "post" ? 1 : 0),
    ).toBe(true);
  });

it("activation Stop waiting keeps late success unknown and reconciliation never attributes it", async () => {
  const { control } = backend();
  let release = () => {};
  control.postRelease = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount();
  const user = await submit();
  await waitFor(() => expect(control.posts === 1).toBe(true));
  await user.click(screen.getByRole("button", { name: "Stop waiting" }));
  await act(async () => release());
  await waitFor(() => expect(control.state === "active").toBe(true));
  await user.click(screen.getByRole("button", { name: "Refresh course" }));
  await waitFor(() =>
    expect(includes("Activation outcome unknown")).toBe(true),
  );
  expect(
    control.posts === 1 &&
      window.location.pathname.endsWith("activate") &&
      screen.queryByRole("button", { name: "Confirm activation" }) === null &&
      !document.body.textContent?.includes("Course activation confirmed."),
  ).toBe(true);
});

for (const loss of ["csrf", "expired", "restricted", "lifecycle"])
  it(`activation ${loss} teardown fences protected completion without replay`, async () => {
    const { control, fixture } = backend();
    mount();
    await confirm();
    let release = () => {};
    control.postRelease = new Promise<void>((resolve) => {
      release = resolve;
    });
    control.outcome = loss;
    await submit();
    await waitFor(() => expect(control.posts === 1).toBe(true));
    const reads = control.reads;
    if (loss === "lifecycle")
      act(() => window.dispatchEvent(new Event("focus")));
    await act(async () => release());
    await screen.findByRole("button", { name: "Refresh" });
    expect(
      !document.body.textContent?.includes(fixture.name) &&
        !document.body.textContent?.includes("Course activation confirmed.") &&
        control.posts === 1 &&
        control.reads === reads,
    ).toBe(true);
  });

it("activation preflight failure requires a new readiness review before another attempt", async () => {
  const { control } = backend();
  mount();
  await confirm();
  control.readFail = true;
  const user = await submit();
  await screen.findByRole("heading", {
    name: "Current course values could not be confirmed. This is not an empty result.",
  });
  expect(
    control.posts === 0 &&
      screen.queryByRole("button", { name: "Confirm activation" }) === null,
  ).toBe(true);
  control.readFail = false;
  await user.click(
    screen.getByRole("link", { name: "Review current readiness" }),
  );
  await screen.findByRole("heading", { level: 1, name: "Course readiness" });
  expect(control.posts).toBe(0);
});

it("activation duplicate native submissions cannot queue another unsafe dispatch", async () => {
  const { control } = backend();
  let release = () => {};
  control.postRelease = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount();
  await submit();
  await waitFor(() => expect(control.posts === 1).toBe(true));
  act(() => {
    const form = document.querySelector("main form");
    if (!(form instanceof HTMLFormElement))
      throw new Error("Missing native form.");
    form.requestSubmit();
    form.requestSubmit();
  });
  await act(async () => release());
  await screen.findByRole("heading", { level: 1, name: control.name });
  expect(control.posts === 1).toBe(true);
});

it("activation stopped preflight cannot dispatch after a late eligible read", async () => {
  const { control } = backend();
  mount();
  await confirm();
  let release = () => {};
  control.readRelease = new Promise<void>((resolve) => {
    release = resolve;
  });
  const user = await submit();
  await waitFor(() => expect(control.reads === 2).toBe(true));
  await user.click(screen.getByRole("link", { name: "Cancel" }));
  await user.click(
    await screen.findByRole("button", { name: "Discard and leave" }),
  );
  await act(async () => release());
  expect(
    control.posts === 0 && window.location.pathname.endsWith("readiness"),
  ).toBe(true);
});

it("activation preflight lifecycle shield prevents future unsafe dispatch and scope recovery prevents discovery", async () => {
  const { control, fixture } = backend();
  mount();
  await confirm();
  let release = () => {};
  control.readRelease = new Promise<void>((resolve) => {
    release = resolve;
  });
  const user = await submit();
  await waitFor(() => expect(control.reads === 2).toBe(true));
  act(() => window.dispatchEvent(new Event("focus")));
  await act(async () => release());
  expect(
    control.posts === 0 && !document.body.textContent?.includes(fixture.name),
  ).toBe(true);
  control.ids = [];
  await user.click(await screen.findByRole("button", { name: "Refresh" }));
  await screen.findByRole("heading", { level: 1, name: "Home" });
  expect(control.reads === 2 && control.posts === 0).toBe(true);
});

it("activation unknown departure asks before dropping attempt and security loss overrides the dialog", async () => {
  const { control, fixture } = backend();
  control.outcome = "lose";
  mount();
  const user = await submit();
  await screen.findByRole("heading", {
    name: "Activation outcome unknown",
  });
  await user.click(screen.getByRole("link", { name: control.name }));
  await screen.findByRole("dialog");
  await user.click(screen.getByRole("button", { name: "Stay on this page" }));
  expect(
    window.location.pathname.endsWith("activate") && control.posts === 1,
  ).toBe(true);
  await user.click(screen.getByRole("link", { name: control.name }));
  await screen.findByRole("dialog");
  act(() => window.dispatchEvent(new Event("focus")));
  await screen.findByRole("button", { name: "Refresh" });
  expect(
    screen.queryByRole("dialog") === null &&
      !document.body.textContent?.includes(fixture.name) &&
      control.posts === 1,
  ).toBe(true);
});

it("activation direct previously activated course stays unavailable even with server eligibility", async () => {
  const { control } = backend();
  control.activated = "2026-10-08T12:00:00.000000Z";
  control.deactivated = "2026-10-09T10:00:00.000000Z";
  mount();
  await screen.findByRole("heading", { name: "Activation is unavailable" });
  expect(
    control.posts === 0 &&
      control.reads === 1 &&
      includes("This course was active before."),
  ).toBe(true);
  const user = userEvent.setup();
  await user.click(
    screen.getByRole("link", { name: "Go to course readiness" }),
  );
  await screen.findByRole("heading", { level: 1, name: "Course readiness" });
  expect(control.posts === 0).toBe(true);
});
