import {
  configure,
  getConfig,
  render,
  screen,
  waitFor,
  act,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from "vitest";
import { server } from "../../../test/server";
import { authenticatedSessionResponse } from "../../../test/mfaFixtures";
import {
  courseUnitFixture,
  courseUnitCheckpoint,
} from "../../../scripts/secret-hygiene-evidence";
import { App } from "../App";
import { AnnouncementProvider } from "../../platform/announcer/AnnouncementRegion";
import { MiaIntlProvider } from "../../platform/i18n/MiaIntlProvider";
import { InvitationLink } from "../../platform/session/invitationLink";
import { PasswordResetLink } from "../../platform/session/passwordResetLink";
import { holdGuardedHistoryTraversals } from "../../platform/ui/routeDeparture";

const originalError = getConfig().getElementError;
let releaseHistory: () => void = () => undefined;
beforeAll(() =>
  configure({
    getElementError: () =>
      new Error("Material element assertion failed (content omitted)."),
  }),
);
afterAll(() => configure({ getElementError: originalError }));
beforeEach(() => {
  releaseHistory = holdGuardedHistoryTraversals(window);
});
afterEach(() => releaseHistory());
function backend() {
  const fixture = courseUnitFixture();
  document.cookie = `mia_csrf=${fixture.csrf}; Path=/; SameSite=Strict`;
  const state = {
    grant: true,
    scope: ["course_1"],
    materialScope: "course-wide",
    sends: 0,
    fileReads: 0,
    lose: false,
    reject: false,
    created: false,
    fileVisible: false,
    deletes: 0,
    readFailure: null as {
      path: "material" | "files";
      outcome: "http" | "transport";
    } | null,
    deleteOutcome: "success" as "success" | "unknown" | "rejected",
  };
  const json = (body: unknown, status = 200) =>
    new HttpResponse(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/vnd.api+json" },
    });
  const material = () => ({
    type: "materials",
    id: "material_1",
    attributes: {
      name: fixture.name,
      kind: "worksheet",
      format: "pdf",
      scope: state.materialScope,
      state: "draft",
      approved: false,
      brief: null,
      brief_source: null,
      brief_updated_at: null,
      approved_at: null,
      failure_code: null,
      created_at: "2026-10-09T10:00:00.000000Z",
      updated_at: null,
    },
    relationships: { course: { data: { type: "courses", id: "course_1" } } },
  });
  server.use(
    http.get("/api/v1/auth/session", () => authenticatedSessionResponse()),
    http.get("/api/v1/users/me/capabilities", () =>
      json({
        data: {
          type: "account-capabilities",
          id: "account-id",
          attributes: {
            capabilities: [
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
            ].map((action) => ({
              action,
              available: action === "courses.supervise" && state.grant,
              scope: {
                global: false,
                own_resource: false,
                course_ids: action === "courses.supervise" ? state.scope : [],
                student_ids: [],
                course_students: [],
              },
            })),
          },
        },
      }),
    ),
    http.get("/api/v1/courses/course_1", () =>
      json({
        data: {
          type: "courses",
          id: "course_1",
          attributes: {
            name: fixture.name,
            state: "inactive",
            created_at: "2026-10-08T10:00:00.000000Z",
            description: null,
            curriculum: null,
            learning_goals: null,
            ai_tutor_instructions: null,
            language: null,
            activated_at: null,
            deactivated_at: null,
            readiness: {
              state: "inactive_incomplete",
              blockers: [],
              activation: {
                eligible: false,
                blockers: ["qualifying_material"],
                consequences: ["activate_course"],
              },
            },
          },
          relationships: {
            supervisors: { data: [{ type: "users", id: "supervisor_1" }] },
          },
        },
      }),
    ),
    http.get("/api/v1/courses/course_1/materials", () =>
      json({ data: [material()], meta: { has_more: false } }),
    ),
    http.post("/api/v1/courses/course_1/materials", () => {
      state.sends++;
      if (state.reject)
        return json(
          { errors: [{ code: "material_invalid", detail: fixture.rawError }] },
          422,
        );
      state.created = true;
      return state.lose
        ? HttpResponse.error()
        : json({ data: material() }, 201);
    }),
    http.get("/api/v1/materials/material_1", () => {
      if (state.readFailure?.path === "material")
        return state.readFailure.outcome === "transport"
          ? HttpResponse.error()
          : json(
              {
                errors: [{ code: "internal_error", detail: fixture.rawError }],
              },
              500,
            );
      return json({ data: material() });
    }),
    http.get("/api/v1/materials/material_1/files", () => {
      state.fileReads++;
      if (state.readFailure?.path === "files")
        return state.readFailure.outcome === "transport"
          ? HttpResponse.error()
          : json(
              {
                errors: [{ code: "internal_error", detail: fixture.rawError }],
              },
              500,
            );
      return json({
        data: state.fileVisible
          ? [
              {
                type: "material-files",
                id: "file_1",
                attributes: {
                  original_filename: `${fixture.name}.pdf`,
                  media_type: "application/pdf",
                  size_bytes: 10,
                  page_count: 1,
                  state: "draft",
                  failure_code: null,
                },
                relationships: {
                  material: { data: { type: "materials", id: "material_1" } },
                },
              },
            ]
          : [],
      });
    }),
    http.delete("/api/v1/material-files/file_1", () => {
      state.deletes++;
      if (state.deleteOutcome === "rejected")
        return json(
          { errors: [{ code: "material_invalid", detail: fixture.rawError }] },
          422,
        );
      state.fileVisible = false;
      return state.deleteOutcome === "unknown"
        ? HttpResponse.error()
        : new HttpResponse(null, { status: 204 });
    }),
  );
  return { fixture, state };
}
function mount(path: string, locale: "en-US" | "de-DE" = "en-US") {
  window.history.replaceState({ idx: 0 }, "", path);
  const invitationLink = new InvitationLink(null);
  const passwordResetLink = new PasswordResetLink(null);
  const tree = () => (
    <AnnouncementProvider>
      <MiaIntlProvider initialLocale={locale}>
        <App
          initialTextSize="standard"
          invitationLink={invitationLink}
          passwordResetLink={passwordResetLink}
        />
      </MiaIntlProvider>
    </AnnouncementProvider>
  );
  const view = render(tree());
  return { ...view, repaint: () => view.rerender(tree()) };
}
function observeSpeech() {
  const region = Array.from(document.querySelectorAll("[aria-live]")).find(
    (node) => node.getAttribute("aria-live") === "assertive",
  );
  if (region === undefined) throw new Error("Missing announcement owner.");
  const messages: string[] = [];
  const observer = new MutationObserver(() => {
    if (region.textContent) messages.push(region.textContent);
  });
  observer.observe(region, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  return {
    messages,
    current: () => region.textContent ?? "",
    close: () => observer.disconnect(),
  };
}

it("material deletion new attempt retires rejection and stopped late success stays unknown", async () => {
  const { fixture, state } = backend();
  state.fileVisible = true;
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  server.use(
    http.delete("/api/v1/material-files/file_1", async () => {
      state.deletes++;
      if (state.deletes === 1)
        return new HttpResponse(
          JSON.stringify({
            errors: [{ code: "not_acceptable", detail: fixture.rawError }],
          }),
          {
            status: 406,
            headers: { "Content-Type": "application/vnd.api+json" },
          },
        );
      await held;
      state.fileVisible = false;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  mount("/prepare/courses/course_1/materials/material_1/files");
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: "Delete this persisted file" }),
  );
  const speech = observeSpeech();
  try {
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete this persisted file",
      }),
    );
    await within(screen.getByRole("main")).findByText(
      /^This operation was not accepted\./u,
    );
    await waitFor(() =>
      expect(
        speech.current().startsWith("This operation was not accepted."),
      ).toBe(true),
    );
    expect(state.deletes === 1 && state.fileVisible).toBe(true);
    courseUnitCheckpoint("material-delete-prior-rejected");
    await user.click(
      screen.getByRole("button", { name: "Delete this persisted file" }),
    );
    expect(
      !document
        .querySelector("main")
        ?.textContent?.includes("This operation was not accepted") &&
        screen.queryByRole("button", { name: "Technical details" }) === null &&
        state.deletes === 1,
    ).toBe(true);
    courseUnitCheckpoint("material-delete-new-chosen");
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Delete this persisted file",
      }),
    );
    await waitFor(() => expect(state.deletes === 2).toBe(true));
    await user.click(screen.getByRole("button", { name: "Stop waiting" }));
    const unknownOnly = () =>
      document
        .querySelector("main")
        ?.textContent?.includes("File deletion is unconfirmed.") === true &&
      !document
        .querySelector("main")
        ?.textContent?.includes("This operation was not accepted") &&
      !document
        .querySelector("main")
        ?.textContent?.includes("The selected persisted file was deleted.") &&
      speech.current().startsWith("File deletion is unconfirmed.") &&
      !speech.current().includes(fixture.rawError) &&
      screen.getAllByRole("button", { name: "Delete this persisted file" })
        .length === 1 &&
      state.deletes === 2;
    await waitFor(() => expect(unknownOnly()).toBe(true));
    courseUnitCheckpoint("material-delete-new-stopped");
    const reads = state.fileReads;
    await act(async () => {
      release();
      await held;
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await waitFor(() => expect(!state.fileVisible).toBe(true));
    expect(unknownOnly() && state.fileReads === reads).toBe(true);
    expect(
      speech.messages.filter((message) =>
        message.startsWith("File deletion is unconfirmed."),
      ).length === 1,
    ).toBe(true);
    courseUnitCheckpoint("material-delete-new-late-success");
  } finally {
    release();
    speech.close();
  }
});

for (const path of ["material", "files"] as const) {
  for (const outcome of ["http", "transport"] as const) {
    it(`material confirmed deletion retains success after ${path} ${outcome} refresh failure`, async () => {
      const { fixture, state } = backend();
      state.fileVisible = true;
      mount("/prepare/courses/course_1/materials/material_1/files");
      const user = userEvent.setup();
      await user.click(
        await screen.findByRole("button", {
          name: "Delete this persisted file",
        }),
      );
      state.readFailure = { path, outcome };
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Delete this persisted file",
        }),
      );
      await screen.findByText(
        "Could not refresh material and files. Any confirmed changes remain confirmed. Reconcile to read the current state again.",
      );
      const success = () =>
        Array.from(document.querySelectorAll("[aria-live]")).find(
          (node) => node.getAttribute("aria-live") === "polite",
        )?.textContent;
      await waitFor(() =>
        expect(success() === "The selected persisted file was deleted.").toBe(
          true,
        ),
      );
      expect(
        state.deletes === 1 &&
          !state.fileVisible &&
          screen.queryAllByRole("button", {
            name: "Delete this persisted file",
          }).length === 0 &&
          !document
            .querySelector("main")
            ?.textContent?.includes("This operation was not accepted") &&
          !success()?.includes(fixture.rawError),
      ).toBe(true);
      courseUnitCheckpoint(`material-deleted-read-failed-${path}-${outcome}`);
      state.readFailure = null;
      await user.click(
        screen.getByRole("button", {
          name: "Reconcile material and complete file list",
        }),
      );
      await waitFor(() =>
        expect(
          !document
            .querySelector("main")
            ?.textContent?.includes("Could not refresh material and files."),
        ).toBe(true),
      );
      expect(
        state.deletes === 1 &&
          screen.queryAllByRole("button", {
            name: "Delete this persisted file",
          }).length === 0 &&
          success() === "The selected persisted file was deleted.",
      ).toBe(true);
      courseUnitCheckpoint(
        `material-deleted-read-recovered-${path}-${outcome}`,
      );
    });
  }
}

it.each(["unknown", "rejected"] as const)(
  "material create %s feedback announces once without contradictory outcome or raw body",
  async (outcome) => {
    const { fixture, state } = backend();
    state.lose = outcome === "unknown";
    state.reject = outcome === "rejected";
    const locale = outcome === "rejected" ? "de-DE" : "en-US";
    const view = mount("/prepare/courses/course_1/materials/new", locale);
    const user = userEvent.setup();
    await user.type(
      await screen.findByLabelText(
        locale === "de-DE" ? "Materialname" : "Material name",
      ),
      fixture.name,
    );
    const speech = observeSpeech();
    try {
      await user.click(
        screen.getByRole("button", {
          name:
            locale === "de-DE"
              ? "Kursmaterial erstellen"
              : "Create course material",
        }),
      );
      const expected =
        outcome === "unknown"
          ? "Creation is unconfirmed."
          : "Die Aktion wurde nicht angenommen.";
      await waitFor(() =>
        expect(speech.current().startsWith(expected)).toBe(true),
      );
      expect(
        state.sends === 1 &&
          state.created === (outcome === "unknown") &&
          speech.messages.filter((message) => message.startsWith(expected))
            .length === 1 &&
          !speech.current().includes(fixture.rawError),
      ).toBe(true);
      if (outcome === "unknown")
        expect(
          document
            .querySelector("main")
            ?.textContent?.includes("This operation was not accepted.") ===
            false,
        ).toBe(true);
      courseUnitCheckpoint(`material-create-feedback-${outcome}`);
      view.repaint();
      await act(async () => {
        await Promise.resolve();
      });
      expect(
        speech.messages.filter((message) => message.startsWith(expected))
          .length === 1,
      ).toBe(true);
      if (outcome === "unknown") {
        await user.click(
          screen.getByRole("button", {
            name: "Abandon unconfirmed creation and return to list",
          }),
        );
        await screen.findByRole("heading", {
          level: 1,
          name: "Course materials",
        });
      } else await act(async () => window.dispatchEvent(new Event("pagehide")));
      expect(
        !speech.current().includes(expected) &&
          !speech.current().includes(fixture.rawError),
      ).toBe(true);
      courseUnitCheckpoint(`material-create-retired-${outcome}`);
    } finally {
      speech.close();
    }
  },
);

it.each(["unknown", "rejected"] as const)(
  "material deletion %s feedback announces once and retires on security loss",
  async (outcome) => {
    const { fixture, state } = backend();
    state.fileVisible = true;
    state.deleteOutcome = outcome;
    const view = mount("/prepare/courses/course_1/materials/material_1/files");
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Delete this persisted file" }),
    );
    const speech = observeSpeech();
    try {
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "Delete this persisted file",
        }),
      );
      const expected =
        outcome === "unknown"
          ? "File deletion is unconfirmed."
          : "This operation was not accepted.";
      await waitFor(() =>
        expect(speech.current().startsWith(expected)).toBe(true),
      );
      expect(
        state.deletes === 1 &&
          state.fileVisible === (outcome === "rejected") &&
          screen.getAllByRole("button", { name: "Delete this persisted file" })
            .length === 1 &&
          speech.messages.filter((message) => message.startsWith(expected))
            .length === 1 &&
          !speech.current().includes(fixture.rawError),
      ).toBe(true);
      if (outcome === "unknown")
        expect(
          document
            .querySelector("main")
            ?.textContent?.includes("This operation was not accepted.") ===
            false,
        ).toBe(true);
      expect(
        document
          .querySelector("main")
          ?.textContent?.includes(
            "The selected persisted file was deleted.",
          ) === false,
      ).toBe(true);
      courseUnitCheckpoint(`material-delete-feedback-${outcome}`);
      view.repaint();
      await act(async () => {
        await Promise.resolve();
      });
      expect(
        speech.messages.filter((message) => message.startsWith(expected))
          .length === 1,
      ).toBe(true);
      await act(async () => window.dispatchEvent(new Event("pagehide")));
      expect(
        !speech.current().includes(expected) &&
          !speech.current().includes(fixture.rawError),
      ).toBe(true);
      courseUnitCheckpoint(`material-delete-retired-${outcome}`);
    } finally {
      speech.close();
    }
  },
);

it("material name validation exposes required corrective text focus and correction without dispatch", async () => {
  const { fixture, state } = backend();
  mount("/prepare/courses/course_1/materials/new");
  const user = userEvent.setup();
  const input = await screen.findByLabelText("Material name");
  expect(
    input.hasAttribute("required") &&
      input.getAttribute("aria-invalid") === "false",
  ).toBe(true);
  for (const value of ["", "   ", `${fixture.name}${"😀".repeat(201)}`]) {
    fireEvent.change(input, { target: { value } });
    await user.click(
      screen.getByRole("button", { name: "Create course material" }),
    );
    const reason =
      value.trim() === ""
        ? "Enter a material name."
        : "Use at most 200 characters and 800 UTF-8 bytes after trimming.";
    expect(
      state.sends === 0 &&
        document.activeElement === input &&
        input.getAttribute("aria-invalid") === "true" &&
        input
          .getAttribute("aria-describedby")
          ?.split(" ")
          .includes("material-name-error") &&
        document.getElementById("material-name-error")?.textContent === reason,
    ).toBe(true);
  }
  courseUnitCheckpoint("material-validation-long");
  fireEvent.change(input, { target: { value: fixture.name } });
  expect(
    input.getAttribute("aria-invalid") === "false" &&
      document.getElementById("material-name-error") === null &&
      input.getAttribute("aria-describedby") === "material-name-help",
  ).toBe(true);
  courseUnitCheckpoint("material-validation-corrected");
  await user.click(
    screen.getByRole("button", { name: "Create course material" }),
  );
  await screen.findByLabelText("Select source files");
  expect(state.sends === 1).toBe(true);
});
it("material routes gate private dependent files before protected mount", async () => {
  const { state } = backend();
  state.materialScope = "student-private";
  mount("/prepare/courses/course_1/materials/material_1/files");
  await waitFor(() =>
    expect(
      screen.queryByRole("heading", {
        level: 1,
        name: "Course access unavailable",
      }) !== null,
    ).toBe(true),
  );
  expect(
    state.fileReads === 0 &&
      screen.queryByLabelText("Select source files") === null,
  ).toBe(true);
  courseUnitCheckpoint("material-admission");
});
it("material native selection preserves duplicate rows and dirty Stay then discards on departure", async () => {
  const { fixture } = backend();
  const user = userEvent.setup();
  mount("/prepare/courses/course_1/materials/material_1/files");
  const input = await screen.findByLabelText("Select source files");
  const file = new File([fixture.teachingText], `${fixture.name}.pdf`, {
    type: "application/pdf",
  });
  await user.upload(input, [file, file]);
  expect(
    screen.getAllByRole("button", { name: "Remove local row" }).length === 2,
  ).toBe(true);
  courseUnitCheckpoint("material-input");
  await user.click(screen.getByRole("link", { name: "Course material" }));
  await user.click(screen.getByRole("button", { name: "Stay on this page" }));
  expect(document.activeElement === input).toBe(true);
  await user.click(screen.getByRole("link", { name: "Course material" }));
  await user.click(screen.getByRole("button", { name: "Discard and leave" }));
  await waitFor(() =>
    expect(screen.queryByLabelText("Select source files") === null).toBe(true),
  );
  courseUnitCheckpoint("material-departed");
});
it("material unconfirmed creation freezes repeat dispatch and permits explicit abandonment", async () => {
  const { fixture, state } = backend();
  state.lose = true;
  const user = userEvent.setup();
  mount("/prepare/courses/course_1/materials/new");
  await user.type(await screen.findByLabelText("Material name"), fixture.name);
  await user.click(
    screen.getByRole("button", { name: "Create course material" }),
  );
  await screen.findByRole("button", {
    name: "Abandon unconfirmed creation and return to list",
  });
  expect(
    state.sends === 1 &&
      screen
        .getByRole("button", { name: "Create course material" })
        .getAttribute("aria-disabled") === "true",
  ).toBe(true);
  courseUnitCheckpoint("material-create-unknown");
});
