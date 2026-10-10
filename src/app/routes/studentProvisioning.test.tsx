import {
  act,
  configure,
  getConfig,
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Fragment, StrictMode } from "react";
import { http, HttpResponse } from "msw";
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
      new Error("Student assertion failed (content omitted)."),
  }),
);
afterAll(() => configure({ getElementError: originalError }));
beforeEach(() => {
  releaseHistory = holdGuardedHistoryTraversals(window);
});
afterEach(() => releaseHistory());
const hub = "/prepare/courses/course_1",
  list = `${hub}/students`;
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
const json = (body: unknown, status = 200) =>
  new HttpResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/vnd.api+json",
      "Cache-Control": "no-store",
    },
  });
function backend() {
  const seed = courseUnitFixture();
  const password = ` ${seed.teachingText} 密 `;
  document.cookie = `mia_csrf=${seed.csrf}; Path=/; SameSite=Strict`;
  const control = {
    ids: ["course_1"],
    grant: "courses.supervise",
    state: "active",
    posts: 0,
    courseReads: 0,
    settledCourseReads: 0,
    rosterReads: 0,
    membershipReads: 0,
    valid: false,
    persisted: false,
    outcome: "success",
    denied: false,
    readFail: false,
    postRelease: null as Promise<void> | null,
    readRelease: null as Promise<void> | null,
    pages: [] as number[],
    ledger: [] as string[],
  };
  const membership = {
    type: "course-students",
    id: "membership_1",
    attributes: {
      username: seed.username,
      joined_at: "2026-10-10T10:00:00.000000Z",
    },
    relationships: {
      course: { data: { type: "courses", id: "course_1" } },
      student: { data: { type: "users", id: "student_1" } },
    },
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
    http.get("/api/v1/users/me/capabilities", () => {
      control.ledger.push("capabilities");
      return json({
        data: {
          type: "account-capabilities",
          id: "account-id",
          attributes: {
            capabilities: actions.map((action) => ({
              action,
              available: action === control.grant,
              scope: {
                global: action === "accounts.administer",
                own_resource: false,
                course_ids: action === "courses.supervise" ? control.ids : [],
                student_ids: [],
                course_students: [],
              },
            })),
          },
        },
      });
    }),
    http.get("/api/v1/courses/course_1", async () => {
      control.ledger.push("course");
      control.courseReads++;
      if (control.readRelease) await control.readRelease;
      control.settledCourseReads++;
      if (control.denied) return fail(404, "course_not_found");
      if (control.readFail) return fail(503, "course_readiness_unavailable");
      return json({
        data: {
          type: "courses",
          id: "course_1",
          attributes: {
            name: seed.name,
            state: control.state,
            created_at: "2026-10-10T10:00:00.000000Z",
          },
          relationships: {
            supervisors: { data: [{ type: "users", id: "supervisor_1" }] },
          },
        },
      });
    }),
    http.get("/api/v1/courses/course_1/students", ({ request }) => {
      control.ledger.push("roster");
      control.rosterReads++;
      const offset = Number(
        new URL(request.url).searchParams.get("page[offset]"),
      );
      control.pages.push(offset);
      return control.denied
        ? fail(404, "course_not_found")
        : json({
            data: control.persisted ? [membership] : [],
            meta: { has_more: false },
            ...(offset > 0
              ? {
                  links: {
                    prev: "/api/v1/courses/course_1/students?page[limit]=25&page[offset]=0",
                  },
                }
              : {}),
          });
    }),
    http.get("/api/v1/courses/course_1/students/student_1", () => {
      control.ledger.push("membership");
      control.membershipReads++;
      return control.denied
        ? fail(404, "course_student_not_found")
        : json({ data: membership });
    }),
    http.post("/api/v1/courses/course_1/students", async ({ request }) => {
      control.posts++;
      control.valid =
        request.headers.get("X-CSRF-Token") === seed.csrf &&
        JSON.stringify(await request.json()) ===
          JSON.stringify({
            data: {
              type: "course-students",
              attributes: {
                mode: "provision",
                username: seed.username,
                temporary_password: password,
                preferred_language: "de-DE",
                country: "DE",
                time_zone: "Europe/Berlin",
              },
            },
          });
      if (control.postRelease) await control.postRelease;
      if (control.denied) return fail(404, "course_not_found");
      const rejection = {
        conflict: [409, "username_taken"],
        invalid: [422, "course_student_invalid"],
        inactive: [409, "course_invalid_state"],
        csrf: [403, "csrf_invalid"],
        expired: [401, "unauthorized"],
        restricted: [403, "auth_password_change_required"],
        server: [503, "unavailable"],
        bad: [400, "bad_request"],
        large: [413, "too_large"],
        media: [415, "unsupported_media_type"],
      } as const;
      for (const [key, [status, code]] of Object.entries(rejection))
        if (control.outcome === key) return fail(status, code);
      control.persisted = true;
      if (control.outcome === "lose") return HttpResponse.error();
      return json(
        control.outcome === "malformed" ? { data: null } : { data: membership },
        201,
      );
    }),
  );
  return { seed, password, control };
}
function mount(path = `${list}/new`, strict = false) {
  window.history.replaceState(null, "", path);
  const Root = strict ? StrictMode : Fragment;
  return render(
    <Root>
      <AnnouncementProvider>
        <MiaIntlProvider initialLocale="en-US">
          <App
            initialTextSize="standard"
            passwordResetLink={new PasswordResetLink(null)}
            invitationLink={new InvitationLink(null)}
          />
        </MiaIntlProvider>
      </AnnouncementProvider>
    </Root>,
  );
}
async function fill(
  seed: ReturnType<typeof courseUnitFixture>,
  password: string,
) {
  const user = userEvent.setup();
  await user.type(
    await screen.findByLabelText("Username (required)"),
    seed.username,
  );
  for (const id of ["new-password", "password-confirmation"]) {
    const input = document.getElementById(id);
    if (!(input instanceof HTMLInputElement))
      throw new Error("Missing native credential control.");
    fireEvent.change(input, { target: { value: password } });
  }
  await user.selectOptions(select("language"), "de-DE");
  await user.selectOptions(select("country"), "DE");
  await user.selectOptions(select("time_zone"), "Europe/Berlin");
  return user;
}
const has = (text: string) =>
  document.querySelector("main")?.textContent?.includes(text) === true;
function select(name: string) {
  const node = document.querySelector(`#student-${name}`);
  if (!(node instanceof HTMLSelectElement))
    throw new Error("Missing native profile choice.");
  return node;
}
const cleared = (input: HTMLInputElement) =>
  input.value === "" &&
  !input.isConnected &&
  document.querySelector("#new-password") === null;
function passwordControl() {
  const input = document.querySelector("#new-password");
  if (!(input instanceof HTMLInputElement))
    throw new Error("Missing password control.");
  return input;
}

for (const route of ["", "/new", "/student_1"])
  it(`student admission ${route || "roster"} requires exact course scope before dependent reads`, async () => {
    const { control } = backend();
    control.ids = [];
    mount(`${list}${route}`);
    await screen.findByRole("heading", { level: 1, name: "Home" });
    expect(
      control.courseReads === 0 &&
        control.rosterReads === 0 &&
        control.membershipReads === 0,
    ).toBe(true);
    courseUnitCheckpoint("student-gate");
  });
it("student authority never substitutes administrator student or mentor capabilities", async () => {
  const { control } = backend();
  control.grant = "students.manage";
  mount();
  await screen.findByRole("heading", { level: 1, name: "Home" });
  expect(control.courseReads === 0 && control.posts === 0).toBe(true);
  courseUnitCheckpoint("student-authority");
});
it("student definitive creation clears credentials and navigates by student relationship", async () => {
  const { seed, password, control } = backend();
  mount();
  const user = await fill(seed, password);
  const input = passwordControl();
  expect(
    input.autocomplete === "new-password" &&
      input.value === password &&
      document
        .querySelector("#student-language")
        ?.getAttribute("autocomplete") === null,
  ).toBe(true);
  courseUnitCheckpoint("student-input");
  await user.click(screen.getByRole("button", { name: "Create student" }));
  await screen.findByRole("heading", { level: 1, name: "Student membership" });
  expect(
    control.valid &&
      control.posts === 1 &&
      control.membershipReads === 1 &&
      window.location.pathname === `${list}/student_1` &&
      cleared(input) &&
      !JSON.stringify(window.history.state).includes(password) &&
      control.ledger.indexOf("capabilities") <
        control.ledger.indexOf("course") &&
      control.ledger.indexOf("course") < control.ledger.indexOf("membership"),
  ).toBe(true);
  courseUnitCheckpoint("student-success");
});
for (const outcome of ["conflict", "invalid", "bad", "large", "media"])
  it(`student definitive ${outcome} keeps only same mounted native correction`, async () => {
    const { seed, password, control } = backend();
    control.outcome = outcome;
    mount();
    const user = await fill(seed, password);
    const input = passwordControl();
    await user.click(screen.getByRole("button", { name: "Create student" }));
    await waitFor(() =>
      expect(
        control.posts === 1 &&
          input.value === password &&
          input.isConnected &&
          !input.readOnly &&
          document.querySelector("#student-status")?.textContent !== "",
      ).toBe(true),
    );
    expect(
      document.querySelector("main pre") === null &&
        !document.querySelector("[aria-live]")?.textContent?.includes(password),
    ).toBe(true);
    courseUnitCheckpoint("student-rejected");
  });
for (const outcome of ["lose", "malformed", "server"])
  it(`student ambiguous ${outcome} destroys credentials and bounded review never attributes success`, async () => {
    const { seed, password, control } = backend();
    control.outcome = outcome;
    mount();
    const user = await fill(seed, password);
    const input = passwordControl();
    await user.click(screen.getByRole("button", { name: "Create student" }));
    await waitFor(() =>
      expect(cleared(input) && has("Student creation is unconfirmed")).toBe(
        true,
      ),
    );
    expect(
      control.rosterReads === 0 &&
        screen.queryByRole("button", { name: /Abandon/ }) === null,
    ).toBe(true);
    courseUnitCheckpoint("student-unknown");
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByRole("button", {
      name: "Abandon unconfirmed attempt and start a new blank form",
    });
    expect(
      control.posts === 1 &&
        control.rosterReads === 1 &&
        control.pages.join() === "0" &&
        !has("Student creation confirmed."),
    ).toBe(true);
    courseUnitCheckpoint("student-reconciled");
    await user.click(
      screen.getByRole("button", {
        name: "Abandon unconfirmed attempt and start a new blank form",
      }),
    );
    expect(
      passwordControl().value === "" &&
        document.querySelector("#student-username") instanceof
          HTMLInputElement &&
        document.querySelector<HTMLInputElement>("#student-username")?.value ===
          "",
    ).toBe(true);
  });
for (const loss of ["csrf", "expired", "restricted", "denied"])
  it(`student ${loss} overrides native input without replay`, async () => {
    const { seed, password, control } = backend();
    mount();
    const user = await fill(seed, password);
    const input = passwordControl();
    control.outcome = loss;
    control.denied = loss === "denied";
    await user.click(screen.getByRole("button", { name: "Create student" }));
    await waitFor(() => expect(cleared(input)).toBe(true));
    expect(control.posts <= 1 && !has(seed.name)).toBe(true);
    courseUnitCheckpoint("student-security");
  });
it("student stopped post fences late success and duplicate native submits dispatch once", async () => {
  const { seed, password, control } = backend();
  let release = () => {};
  control.postRelease = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount();
  await fill(seed, password);
  const input = passwordControl();
  const form = input.form;
  if (form === null) throw new Error("Missing form.");
  act(() => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await screen.findByRole("button", { name: "Stop waiting" });
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Stop waiting" }));
  expect(cleared(input) && control.posts === 1).toBe(true);
  courseUnitCheckpoint("student-stopped");
  await act(async () => {
    release();
  });
  await waitFor(() =>
    expect(
      control.persisted &&
        has("Student creation is unconfirmed") &&
        control.membershipReads === 0,
    ).toBe(true),
  );
  courseUnitCheckpoint("student-late");
});
it("student stopped response still handles applicable hidden denial", async () => {
  const { seed, password, control } = backend();
  let release = () => {};
  control.postRelease = new Promise<void>((resolve) => {
    release = resolve;
  });
  mount();
  const user = await fill(seed, password);
  const input = passwordControl();
  await user.click(screen.getByRole("button", { name: "Create student" }));
  await user.click(await screen.findByRole("button", { name: "Stop waiting" }));
  control.denied = true;
  await act(async () => release());
  await screen.findByRole("heading", {
    level: 1,
    name: "Course access unavailable",
  });
  expect(cleared(input) && control.posts === 1 && !has(seed.name)).toBe(true);
  courseUnitCheckpoint("student-stopped-denial");
});

it("student inactive preflight and cancelled pending read send no POST", async () => {
  const { seed, password, control } = backend();
  mount();
  const user = await fill(seed, password);
  const input = passwordControl();
  control.state = "inactive";
  await user.click(screen.getByRole("button", { name: "Create student" }));
  await waitFor(() => expect(cleared(input) && control.posts === 0).toBe(true));
  control.state = "active";
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await fill(seed, password);
  let release = () => {};
  control.readRelease = new Promise<void>((resolve) => {
    release = resolve;
  });
  await user.click(screen.getByRole("button", { name: "Create student" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  await act(async () => release());
  expect(
    control.posts === 0 && document.querySelector("#new-password") === null,
  ).toBe(true);
  courseUnitCheckpoint("student-preflight");
});
it("student lifecycle destroys controls synchronously and return makes no authenticated request", async () => {
  const { seed, password, control } = backend();
  mount();
  await fill(seed, password);
  const input = passwordControl();
  const reads = control.courseReads;
  act(() => window.dispatchEvent(new Event("pagehide")));
  expect(input.value === "").toBe(true);
  act(() => {
    window.dispatchEvent(new Event("pageshow"));
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("focus"));
  });
  expect(
    control.courseReads === reads && control.posts === 0 && cleared(input),
  ).toBe(true);
  courseUnitCheckpoint("student-lifecycle");
});
it("student dirty Stay retains focus but Discard destroys both credential controls", async () => {
  const { seed, password } = backend();
  mount();
  const user = await fill(seed, password);
  const input = passwordControl();
  await user.click(
    screen.getAllByRole("link", { name: "Course students" }).at(-1) ??
      screen.getByRole("link", { name: "Cancel" }),
  );
  await screen.findByRole("dialog");
  await user.click(screen.getByRole("button", { name: "Stay on this page" }));
  expect(
    input.value === password &&
      document.activeElement?.id === "student-username",
  ).toBe(true);
  courseUnitCheckpoint("student-stay");
  await user.click(screen.getByRole("link", { name: "Cancel" }));
  await user.click(
    await screen.findByRole("button", { name: "Discard and leave" }),
  );
  await screen.findByRole("heading", { level: 1, name: "Course students" });
  expect(cleared(input)).toBe(true);
  courseUnitCheckpoint("student-discard");
});
it("student local mismatch and missing profile prevent any unsafe dispatch", async () => {
  const { seed, password, control } = backend();
  mount();
  const user = await fill(seed, password);
  const confirmation = document.querySelector<HTMLInputElement>(
    "#password-confirmation",
  );
  if (confirmation === null) throw new Error("Missing confirmation.");
  fireEvent.change(confirmation, { target: { value: `${password}x` } });
  await user.click(screen.getByRole("button", { name: "Create student" }));
  expect(
    control.posts === 0 && confirmation.getAttribute("aria-invalid") === "true",
  ).toBe(true);
  courseUnitCheckpoint("student-validation");
  fireEvent.change(confirmation, { target: { value: password } });
  await user.selectOptions(select("language"), "");
  await user.click(screen.getByRole("button", { name: "Create student" }));
  expect(
    control.posts === 0 &&
      document
        .querySelector("#student-language")
        ?.getAttribute("aria-invalid") === "true",
  ).toBe(true);
});

for (const scenario of [
  "profiles",
  "language",
  "username-profiles",
  "all-fields",
])
  it(`student local ${scenario} corrections link every invalid field in DOM order and focus precisely`, async () => {
    const { seed, password, control } = backend();
    mount();
    const user = await fill(seed, password);
    const input = passwordControl();
    const profileNames =
      scenario === "language"
        ? ["language"]
        : ["language", "country", "time_zone"];
    for (const name of profileNames) await user.selectOptions(select(name), "");
    const targets = profileNames.map((name) => `student-${name}`);
    if (scenario === "username-profiles" || scenario === "all-fields") {
      fireEvent.change(document.getElementById("student-username") ?? input, {
        target: { value: "!" },
      });
      targets.unshift("student-username");
    }
    if (scenario === "all-fields") {
      fireEvent.change(input, { target: { value: "" } });
      targets.splice(1, 0, "new-password", "password-confirmation");
    }
    await user.click(screen.getByRole("button", { name: "Create student" }));
    const summary = document.querySelector(
      '[aria-labelledby="password-change-summary-heading"]',
    );
    const links = Array.from(summary?.querySelectorAll("a") ?? []);
    expect(
      control.posts === 0 &&
        control.courseReads === 1 &&
        targets.every((id) => {
          const field = document.getElementById(id);
          const errors =
            field
              ?.getAttribute("aria-describedby")
              ?.split(" ")
              .filter((name) => name.endsWith("-error")) ?? [];
          return (
            field?.getAttribute("aria-invalid") === "true" &&
            errors.length === 1 &&
            errors.every(
              (name) =>
                (document.getElementById(name)?.textContent?.length ?? 0) > 0,
            )
          );
        }) &&
        Array.from(document.querySelectorAll('[aria-invalid="true"]'))
          .map((node) => node.id)
          .join() === targets.join() &&
        (targets.length === 1
          ? summary === null && document.activeElement?.id === targets[0]
          : document.activeElement === summary &&
            input.form?.firstElementChild === summary &&
            links.map((link) => link.getAttribute("href")).join() ===
              targets.map((id) => `#${id}`).join()),
    ).toBe(true);
    for (const [index, link] of links.entries()) {
      await user.click(link);
      expect(
        document.activeElement?.id === targets[index] &&
          window.location.hash === "",
      ).toBe(true);
    }
    courseUnitCheckpoint("student-field-errors");
    // Corrected values retire every association and summary on resubmission.
    fireEvent.change(document.getElementById("student-username") ?? input, {
      target: { value: seed.username },
    });
    fireEvent.change(input, { target: { value: password } });
    await user.selectOptions(select("language"), "de-DE");
    await user.selectOptions(select("country"), "DE");
    await user.selectOptions(select("time_zone"), "Europe/Berlin");
    control.outcome = "invalid";
    await user.click(screen.getByRole("button", { name: "Create student" }));
    await waitFor(() =>
      expect(control.posts === 1 && !input.readOnly).toBe(true),
    );
    expect(
      document.querySelector('[aria-invalid="true"]') === null &&
        document.getElementById("password-change-summary-heading") === null &&
        input.value === password,
    ).toBe(true);
    courseUnitCheckpoint("student-field-corrected");
  });

it("student StrictMode replay permits one definitive dispatch and credential teardown", async () => {
  const { seed, password, control } = backend();
  mount(`${list}/new`, true);
  const user = await fill(seed, password);
  const input = passwordControl();
  await user.click(screen.getByRole("button", { name: "Create student" }));
  await screen.findByRole("heading", { level: 1, name: "Student membership" });
  expect(
    control.valid &&
      control.posts === 1 &&
      control.membershipReads > 0 &&
      cleared(input),
  ).toBe(true);
  courseUnitCheckpoint("student-strict-success");
});

for (const phase of ["preflight", "post"])
  it(`student StrictMode retired ${phase} callbacks cannot dispatch or navigate after teardown`, async () => {
    const { seed, password, control } = backend();
    const view = mount(`${list}/new`, true);
    const user = await fill(seed, password);
    const input = passwordControl();
    const reads = control.courseReads;
    const settledReads = control.settledCourseReads;
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    if (phase === "preflight") control.readRelease = held;
    else control.postRelease = held;
    await user.click(screen.getByRole("button", { name: "Create student" }));
    if (phase === "post")
      await screen.findByRole("button", { name: "Stop waiting" });
    else
      await waitFor(() => expect(control.courseReads === reads + 1).toBe(true));
    view.unmount();
    expect(cleared(input)).toBe(true);
    courseUnitCheckpoint("student-strict-retired");
    await act(async () => release());
    await waitFor(() =>
      expect(
        phase === "preflight"
          ? control.settledCourseReads === settledReads + 1
          : control.persisted,
      ).toBe(true),
    );
    expect(
      control.posts === (phase === "preflight" ? 0 : 1) &&
        control.membershipReads === 0 &&
        window.location.pathname === `${list}/new` &&
        document.querySelector("#new-password") === null,
    ).toBe(true);
    courseUnitCheckpoint("student-strict-late");
  });
