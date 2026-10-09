import {
  act,
  cleanup,
  configure,
  getConfig,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";
import { startTransition } from "react";
import { ApiHttpError, ApiTransportError } from "../../platform/api/client";
import { toCourseId, toMaterialId } from "../../platform/api/entry";
import type { Material } from "../../platform/api/materials";
import type { MaterialBrief } from "../../platform/api/materialBrief";
import { AnnouncementProvider } from "../../platform/announcer/AnnouncementRegion";
import { MiaIntlProvider } from "../../platform/i18n/MiaIntlProvider";
import { holdGuardedHistoryTraversals } from "../../platform/ui/routeDeparture";
import { useMaterialLifecycle } from "./useMaterialLifecycle";
import { MaterialBriefFields } from "./MaterialBriefFields";
import { MaterialLifecycleFeedback } from "./MaterialProcessingRoute";
import {
  courseUnitFixture,
  courseUnitCheckpoint,
} from "../../../scripts/secret-hygiene-evidence";

let saved: Material;
let sends = 0,
  unavailable = 0,
  reads = 0;
let outcome: "success" | "unknown" | "reject" | "hidden" = "success";
let release: (() => void) | null = null;
let waiting: Promise<void> | null = null;
let readinessFailure = false;
let readinessDenial: ApiHttpError | null = null;
let readinessState = "inactive_incomplete";
let readinessWaiting: Promise<void> | null = null;
let readinessReads = 0;
let readinessSettled = 0;
let teardown: () => void = () => undefined;
const transfer = {
  registerRouteTeardown: (hide: () => void) => {
    teardown = hide;
    return () => undefined;
  },
};
const actions = {
  readAuthenticated: async <T,>(read: (signal: AbortSignal) => Promise<T>) => {
    try {
      return {
        kind: "completed" as const,
        value: await read(new AbortController().signal),
      };
    } catch (failure) {
      return { kind: "failed" as const, failure };
    }
  },
  runAuthenticatedMutation: async <T,>(
    request: { send: ((csrf: string) => Promise<T>) | null },
    current: () => boolean,
  ) => {
    if (!current() || request.send === null)
      return { kind: "superseded" as const };
    const send = request.send;
    request.send = null;
    try {
      return {
        kind: "completed" as const,
        value: await send("synthetic-non-secret"),
      };
    } catch (failure) {
      return {
        kind:
          failure instanceof ApiHttpError
            ? ("rejected" as const)
            : ("unknown" as const),
        failure,
      };
    }
  },
};
async function mutate(brief: MaterialBrief | null, approval: boolean | null) {
  sends++;
  if (waiting) await waiting;
  if (outcome === "hidden")
    throw new ApiHttpError({ status: 404, body: "" }, null);
  if (outcome === "reject")
    throw new ApiHttpError({ status: 409, body: "" }, "material_invalid_state");
  const changed =
    brief !== null && JSON.stringify(brief) !== JSON.stringify(saved.brief);
  saved = {
    ...saved,
    ...(brief === null ? {} : { brief }),
    approved: approval ?? (changed ? false : saved.approved),
    updated_at: "2026-10-09T10:01:00.000000Z",
  };
  if (outcome === "unknown") throw new ApiTransportError(null);
  return saved;
}
vi.mock("../../platform/data/EntryDataProvider", () => ({
  useSessionActions: () => actions,
  useMaterialUpload: () => transfer,
}));
vi.mock("../../platform/api/materials", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../platform/api/materials")>()),
  getMaterial: async () => {
    reads++;
    return saved;
  },
  updateMaterialBrief: async (
    _course: string,
    _id: string,
    brief: MaterialBrief,
  ) => mutate(brief, null),
  approveMaterial: async () => mutate(null, true),
  revokeMaterialApproval: async () => mutate(null, false),
}));
vi.mock("../../platform/api/courses", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../platform/api/courses")>()),
  getCoursePreparation: async () => {
    readinessReads++;
    const state = readinessState;
    if (readinessWaiting) await readinessWaiting;
    readinessSettled++;
    if (readinessDenial) throw readinessDenial;
    if (readinessFailure) throw new ApiTransportError(null);
    return { readiness: { state, blockers: [] } };
  },
}));
let stopHistory: () => void = () => undefined;
const originalError = getConfig().getElementError;
beforeAll(() =>
  configure({
    getElementError: () =>
      new Error("Material lifecycle assertion failed (content omitted)."),
  }),
);
afterAll(() => configure({ getElementError: originalError }));
beforeEach(() => {
  const fixture = courseUnitFixture();
  const id = toMaterialId("material_1");
  if (id === null) throw new Error("Invalid fixture identity.");
  saved = {
    id,
    courseId: toCourseId("course_1"),
    name: fixture.name,
    scope: "course-wide",
    kind: "worksheet",
    format: "pdf",
    state: "ready",
    approved: true,
    brief: {
      version: 1,
      summary: fixture.teachingText,
      subjects: [fixture.name],
      learning_goals: null,
      sections: null,
      warnings: null,
      educational_level: null,
    },
    brief_source: "generated",
    brief_updated_at: null,
    approved_at: null,
    failure_code: null,
    created_at: "2026-10-09T10:00:00.000000Z",
    updated_at: null,
  };
  sends = 0;
  reads = 0;
  unavailable = 0;
  outcome = "success";
  waiting = null;
  release = null;
  readinessFailure = false;
  readinessDenial = null;
  readinessState = "inactive_incomplete";
  readinessWaiting = null;
  readinessReads = 0;
  readinessSettled = 0;
  stopHistory = holdGuardedHistoryTraversals(window);
});
afterEach(() => {
  cleanup();
  stopHistory();
});
let latest: ReturnType<typeof useMaterialLifecycle>;
function Harness({
  initial,
  mode = "brief",
  fields = false,
}: {
  initial: Material;
  mode?: "brief" | "approval" | "revoke";
  fields?: boolean;
}) {
  const model = useMaterialLifecycle(initial, mode, () => unavailable++);
  latest = model;
  if (model.material === null) return null;
  return (
    <>
      <form action={model.action}>
        {fields && model.draft ? (
          <MaterialBriefFields
            brief={model.draft}
            change={model.change}
            invalid={model.invalid}
            control={model.control}
          />
        ) : (
          <textarea
            aria-label="Summary"
            value={model.draft?.summary ?? ""}
            disabled={model.locked}
            onChange={(event) =>
              model.draft &&
              model.change({ ...model.draft, summary: event.target.value })
            }
          />
        )}
        <button disabled={model.locked} type="submit">
          Save
        </button>
      </form>
      {fields ? <MaterialLifecycleFeedback model={model} /> : null}
      <p>{model.material.approved ? "Approved" : "Unapproved"}</p>
      <p>{model.state.kind}</p>
      <button onClick={model.stop}>Stop</button>
      <button
        disabled={model.refreshLocked}
        onClick={() => void model.reconcile()}
      >
        Refresh
      </button>
    </>
  );
}
function mount(mode: "brief" | "approval" | "revoke" = "brief") {
  return render(
    <AnnouncementProvider>
      <MiaIntlProvider initialLocale="en-US">
        <Harness initial={saved} mode={mode} />
      </MiaIntlProvider>
    </AnnouncementProvider>,
  );
}
it("mounted brief fields give corrective named errors focus and recovery without invalid PATCH", async () => {
  saved = {
    ...saved,
    brief: saved.brief
      ? {
          ...saved.brief,
          sections: [
            {
              sequence: 1,
              label: null,
              title: "",
              description: "",
              search_terms: null,
            },
          ],
          warnings: [],
        }
      : null,
  };
  const view = render(
    <AnnouncementProvider>
      <MiaIntlProvider initialLocale="en-US">
        <Harness initial={saved} fields />
      </MiaIntlProvider>
    </AnnouncementProvider>,
  );
  fireEvent.change(view.getByLabelText("Summary"), { target: { value: "" } });
  fireEvent.click(
    view.getByRole("button", { name: "Delete this persisted file" }),
  );
  await waitFor(() =>
    expect(document.activeElement?.id).toBe("brief-subjects-add"),
  );
  fireEvent.click(view.getByText("Add item — Warnings"));
  fireEvent.change(view.getByLabelText("Warnings"), {
    target: { value: "x".repeat(501) },
  });
  fireEvent.click(view.getByText("Save"));
  await waitFor(() =>
    expect(!latest.pending && latest.invalid.length === 5).toBe(true),
  );
  expect(sends).toBe(0);
  expect(document.activeElement?.id).toBe("brief-validation");
  courseUnitCheckpoint("brief-validation-invalid");
  const summary = view.getByRole("link", {
    name: "Summary: Required. Enter at least one character.",
  });
  expect(
    view.getByLabelText("Summary").getAttribute("aria-required") === "true" &&
      view
        .getByLabelText("Summary")
        .getAttribute("aria-describedby")
        ?.includes("brief-summary-error"),
  ).toBe(true);
  fireEvent.click(
    view.getByRole("link", { name: "Subjects: Add at least 1 item(s)." }),
  );
  const subjects = view.getByRole("group", { name: "Subjects" });
  expect(
    document.activeElement === subjects &&
      subjects.getAttribute("aria-invalid") === "true" &&
      subjects.getAttribute("aria-describedby") === "brief-subjects-error" &&
      document.getElementById("brief-subjects-error")?.textContent ===
        "Subjects: Add at least 1 item(s).",
  ).toBe(true);
  expect(
    view.getByRole("link", {
      name: "Warnings — 1: Shorten to at most 500 characters.",
    }) !== null,
  ).toBe(true);
  fireEvent.click(
    view.getByRole("link", {
      name: "Sections — 1 — Section title: Required. Enter at least one character.",
    }),
  );
  expect(
    document.activeElement?.id === "brief-sections.0.title" &&
      document.querySelector("details")?.open,
  ).toBe(true);
  fireEvent.click(summary);
  expect(document.activeElement?.id === "brief-summary").toBe(true);
  fireEvent.change(view.getByLabelText("Summary"), {
    target: { value: courseUnitFixture().teachingText },
  });
  fireEvent.click(view.getByText("Add item — Subjects"));
  fireEvent.change(view.getByLabelText("Subjects"), {
    target: { value: courseUnitFixture().name },
  });
  expect(subjects.getAttribute("aria-invalid") === null).toBe(true);
  for (const label of ["Section title", "Section description", "Warnings"])
    fireEvent.change(view.getByLabelText(label), {
      target: { value: courseUnitFixture().teachingText },
    });
  fireEvent.click(view.getByText("Save"));
  await waitFor(() =>
    expect(!latest.pending && sends === 1 && latest.invalid.length === 0).toBe(
      true,
    ),
  );
  courseUnitCheckpoint("brief-validation-recovered");
});
it("successive saves invalidate readiness and successful Refresh replaces failure and fences older reads", async () => {
  readinessState = "active_accepting";
  const view = mount();
  fireEvent.click(view.getByText("Save"));
  await waitFor(() =>
    expect(
      !latest.pending &&
        latest.readinessMessage?.id === "preparation.accepting",
    ).toBe(true),
  );
  readinessFailure = true;
  fireEvent.change(view.getByLabelText("Summary"), {
    target: { value: `${courseUnitFixture().teachingText}-changed` },
  });
  fireEvent.click(view.getByText("Save"));
  await waitFor(() =>
    expect(!latest.pending && latest.readinessFailed).toBe(true),
  );
  expect(
    latest.material?.approved === false &&
      latest.readinessMessage === null &&
      sends === 2,
  ).toBe(true);
  readinessFailure = false;
  readinessState = "active_not_accepting";
  await act(() => latest.reconcile());
  expect(
    latest.readinessMessage?.id === "preparation.blocked" &&
      !latest.readinessFailed &&
      latest.error === null,
  ).toBe(true);
  readinessState = "active_accepting";
  let finish: () => void = () => undefined;
  readinessWaiting = new Promise<void>((resolve) => {
    finish = resolve;
  });
  fireEvent.click(view.getByText("Save"));
  await waitFor(() => expect(readinessReads === 4).toBe(true));
  readinessWaiting = null;
  readinessState = "active_not_accepting";
  await act(() => latest.reconcile());
  await act(async () => {
    finish();
  });
  await waitFor(() => expect(!latest.pending).toBe(true));
  expect(
    latest.readinessMessage?.id === "preparation.blocked" &&
      !latest.readinessFailed &&
      sends === 3,
  ).toBe(true);
  courseUnitCheckpoint("brief-readiness-reconciled");
  readinessWaiting = new Promise<void>((resolve) => {
    finish = resolve;
  });
  fireEvent.click(view.getByText("Save"));
  await waitFor(() => expect(readinessReads === 6).toBe(true));
  act(teardown);
  await act(async () => {
    finish();
  });
  expect(latest.material === null && latest.readinessMessage === null).toBe(
    true,
  );
  courseUnitCheckpoint("brief-readiness-teardown");
});
for (const disposition of ["stop", "teardown"] as const)
  for (const status of [200, 404, 403] as const)
    it(`dependent readiness after definitive save ${disposition} fences ordinary results but handles applicable status ${status}`, async () => {
      readinessState = "active_accepting";
      const view = mount();
      fireEvent.click(view.getByText("Save"));
      await waitFor(() =>
        expect(!latest.pending && latest.readinessMessage !== null).toBe(true),
      );
      let finish: () => void = () => undefined;
      readinessWaiting = new Promise<void>((resolve) => {
        finish = resolve;
      });
      fireEvent.change(view.getByLabelText("Summary"), {
        target: { value: `${courseUnitFixture().teachingText}-changed` },
      });
      fireEvent.click(view.getByText("Save"));
      await waitFor(() =>
        expect(
          readinessReads === 2 && latest.state.kind === "Save accepted",
        ).toBe(true),
      );
      expect(
        latest.material?.approved === false &&
          latest.draft !== null &&
          latest.readinessMessage === null &&
          latest.pending,
      ).toBe(true);
      if (disposition === "stop") fireEvent.click(view.getByText("Stop"));
      else act(teardown);
      courseUnitCheckpoint(`brief-dependent-${disposition}-${status}-retired`);
      if (status !== 200)
        readinessDenial = new ApiHttpError(
          { status, body: "" },
          status === 403 ? "course_unauthorized" : "course_not_found",
        );
      await act(async () => finish());
      await waitFor(() => expect(readinessSettled === 2).toBe(true));
      const hidden = disposition === "stop" && status !== 200;
      expect(unavailable).toBe(hidden ? 1 : 0);
      expect(
        latest.readinessMessage === null &&
          !latest.readinessFailed &&
          latest.error === null &&
          sends === 2,
      ).toBe(true);
      if (hidden || disposition === "teardown")
        expect(
          latest.material === null &&
            latest.draft === null &&
            view.container.querySelector("textarea") === null &&
            latest.feedback === null,
        ).toBe(true);
      else
        expect(
          latest.material?.approved === false &&
            latest.draft !== null &&
            latest.state.kind === "Save accepted",
        ).toBe(true);
      courseUnitCheckpoint(`brief-dependent-${disposition}-${status}-settled`);
    });
it("changed approved brief revokes only from returned truth and normalized no-op stays approved", async () => {
  const view = mount();
  fireEvent.click(view.getByText("Save"));
  await waitFor(() =>
    expect(
      !latest.pending &&
        latest.state.kind === "Save accepted" &&
        latest.material?.approved,
    ).toBe(true),
  );
  expect(latest.feedback?.includes("revoked") === false).toBe(true);
  courseUnitCheckpoint("brief-saved");
  fireEvent.change(view.getByLabelText("Summary"), {
    target: { value: `${courseUnitFixture().teachingText}-changed` },
  });
  fireEvent.click(view.getByText("Save"));
  await waitFor(() =>
    expect(
      latest.material?.approved === false &&
        latest.feedback?.includes("revoked"),
    ).toBe(true),
  );
  courseUnitCheckpoint("brief-revoked");
  const revoked = latest.feedback;
  await act(() => latest.reconcile());
  expect(sends === 2 && latest.feedback !== revoked).toBe(true);
});
it("lost save freezes submitted input and Refresh matches values without an execution claim", async () => {
  outcome = "unknown";
  const view = mount();
  const value = `${courseUnitFixture().teachingText}-changed`;
  fireEvent.change(view.getByLabelText("Summary"), { target: { value } });
  fireEvent.click(view.getByText("Save"));
  await waitFor(() =>
    expect(latest.state.kind === "Save outcome unknown" && latest.locked).toBe(
      true,
    ),
  );
  expect(
    latest.material?.approved === true && latest.draft?.summary === value,
  ).toBe(true);
  courseUnitCheckpoint("brief-unknown");
  await act(() => latest.reconcile());
  expect(
    latest.state.kind === "Read matches submit" &&
      latest.draft?.summary === value &&
      latest.material?.approved === false &&
      sends === 1,
  ).toBe(true);
  courseUnitCheckpoint("brief-reconciled");
});
it("different current read preserves dirty input and requires deliberate discard", async () => {
  const view = mount();
  const draft = `${courseUnitFixture().teachingText}-draft`,
    current = `${courseUnitFixture().teachingText}-current`;
  fireEvent.change(view.getByLabelText("Summary"), {
    target: { value: draft },
  });
  saved = {
    ...saved,
    brief: saved.brief ? { ...saved.brief, summary: current } : null,
  };
  await act(() => latest.reconcile());
  expect(
    latest.draft?.summary === draft &&
      latest.material?.brief?.summary === current &&
      latest.dirty,
  ).toBe(true);
  act(() => latest.useCurrent());
  expect(latest.draft?.summary === current && !latest.dirty).toBe(true);
});
for (const late of ["success", "hidden"] as const)
  it(`stopped save preserves ambiguity on late ${late} while current denial clears content`, async () => {
    outcome = late;
    waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const view = mount();
    fireEvent.change(view.getByLabelText("Summary"), {
      target: { value: `${courseUnitFixture().teachingText}-changed` },
    });
    fireEvent.click(view.getByText("Save"));
    await waitFor(() => expect(sends === 1).toBe(true));
    fireEvent.click(view.getByText("Stop"));
    expect(
      latest.state.kind === "Save outcome unknown" && !latest.refreshLocked,
    ).toBe(true);
    if (release === null) throw new Error("Missing fixture completion.");
    await act(async () => {
      release?.();
      await waiting;
    });
    await waitFor(() =>
      expect(
        late === "hidden"
          ? unavailable === 1 && latest.material === null
          : latest.state.kind === "Save outcome unknown" &&
              latest.material?.approved === true,
      ).toBe(true),
    );
  });
it("scope teardown drops drafts and errors immediately and fences a pending response", async () => {
  waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  const view = mount();
  fireEvent.change(view.getByLabelText("Summary"), {
    target: { value: `${courseUnitFixture().teachingText}-changed` },
  });
  fireEvent.click(view.getByText("Save"));
  await waitFor(() => expect(sends === 1).toBe(true));
  courseUnitCheckpoint("brief-pending");
  act(teardown);
  expect(
    latest.material === null &&
      latest.draft === null &&
      view.container.querySelector("textarea") === null,
  ).toBe(true);
  courseUnitCheckpoint("brief-teardown");
  await act(async () => {
    release?.();
    await waiting;
  });
  expect(latest.material === null).toBe(true);
});
it("approval rechecks saved brief and invalidates acknowledgement before a changed-state dispatch", async () => {
  saved = { ...saved, approved: false };
  mount("approval");
  act(() => {
    latest.setAck(true);
    latest.confirm();
  });
  saved = {
    ...saved,
    brief: saved.brief
      ? { ...saved.brief, summary: `${courseUnitFixture().teachingText}-newer` }
      : null,
  };
  await act(async () => {
    startTransition(() => latest.action());
  });
  await waitFor(() =>
    expect(
      latest.state.kind === "State changed" &&
        !latest.acknowledged &&
        sends === 0 &&
        reads === 1,
    ).toBe(true),
  );
});
it("confirmed material mutation survives dependent readiness failure", async () => {
  const view = mount();
  readinessFailure = true;
  fireEvent.change(view.getByLabelText("Summary"), {
    target: { value: `${courseUnitFixture().teachingText}-changed` },
  });
  fireEvent.click(view.getByText("Save"));
  await waitFor(() =>
    expect(
      latest.state.kind === "Save accepted" &&
        latest.readinessFailed &&
        latest.material?.approved === false &&
        sends === 1,
    ).toBe(true),
  );
});
it("material rejected correction preserves draft and approval without success or replay", async () => {
  outcome = "reject";
  const view = mount();
  const value = `${courseUnitFixture().teachingText}-rejected`;
  fireEvent.change(view.getByLabelText("Summary"), { target: { value } });
  fireEvent.click(view.getByText("Save"));
  await waitFor(() =>
    expect(!latest.pending && latest.state.kind === "Rejected").toBe(true),
  );
  expect(
    latest.material?.approved === true &&
      latest.draft?.summary === value &&
      latest.dirty &&
      sends === 1 &&
      latest.feedback?.includes("saved") === false,
  ).toBe(true);
});
it("material invalid complete brief associates errors and never dispatches", async () => {
  const view = mount();
  fireEvent.change(view.getByLabelText("Summary"), { target: { value: "" } });
  fireEvent.click(view.getByText("Save"));
  await waitFor(() =>
    expect(
      !latest.pending &&
        latest.invalid.some((error) => error.field === "summary"),
    ).toBe(true),
  );
  expect(
    sends === 0 &&
      latest.material?.approved === true &&
      latest.draft?.summary === "",
  ).toBe(true);
});
for (const mode of ["approval", "revoke"] as const)
  for (const failure of ["reject", "unknown"] as const)
    it(`material ${mode} ${failure} preserves displayed truth until explicit reconciliation`, async () => {
      saved = { ...saved, approved: mode === "revoke" };
      mount(mode);
      outcome = failure;
      act(() => {
        latest.setAck(true);
        latest.confirm();
      });
      await act(async () => {
        startTransition(() => latest.action());
      });
      await waitFor(() =>
        expect(
          !latest.pending &&
            latest.state.kind ===
              (failure === "unknown" ? "Save outcome unknown" : "Rejected"),
        ).toBe(true),
      );
      expect(
        latest.material?.approved === (mode === "revoke") && sends === 1,
      ).toBe(true);
      if (failure === "unknown") {
        await act(() => latest.reconcile());
        expect(
          latest.material?.approved === (mode === "approval") &&
            sends === 1 &&
            latest.state.kind === "State changed",
        ).toBe(true);
      }
    });
