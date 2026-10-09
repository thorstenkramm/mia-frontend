import { http, HttpResponse } from "msw";
import { expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { server } from "../../../test/server";
import {
  courseUnitCheckpoint,
  courseUnitFixture,
} from "../../../scripts/secret-hygiene-evidence";
import {
  ApiHttpError,
  ApiProtocolError,
  ApiTransportError,
  jsonApiMediaType,
} from "../../platform/api/client";
import { toCourseId, toMaterialId } from "../../platform/api/entry";
import { listMaterialFiles, type Material } from "../../platform/api/materials";
import {
  MaterialUpload,
  type UploadAttempt,
} from "../../platform/transfer/materialUpload";
import { SessionController } from "../../platform/session/sessionController";
import { MaterialUploadQueue } from "./useMaterialUploadQueue";

async function queueFixture(
  stopCompletes = true,
  initialState: Material["state"] = "draft",
) {
  const fixture = courseUnitFixture();
  const id = toMaterialId("material_1");
  if (id === null) throw new Error("Invalid synthetic identity.");
  const material: Material = {
    id,
    courseId: toCourseId("course_1"),
    name: fixture.name,
    scope: "course-wide",
    kind: "worksheet",
    format: "pdf",
    state: initialState,
    approved: false,
    brief: null,
    brief_source: null,
    brief_updated_at: null,
    approved_at: null,
    failure_code: null,
    created_at: "2026-10-09T10:00:00.000000Z",
    updated_at: null,
  };
  let state: Material["state"] = initialState;
  let includeFile = true;
  let readRelease: Promise<void> | null = null;
  let reads = 0,
    deletes = 0,
    deleteStatus = 204;
  let finalizations = 0;
  let finalizeOutcome: "success" | "unknown" | "hidden" = "success";
  let finalizeRelease: Promise<void> | null = null;
  const json = (body: unknown, status = 200) =>
    new HttpResponse(JSON.stringify(body), {
      status,
      headers: { "Content-Type": jsonApiMediaType },
    });
  server.use(
    http.post("/api/v1/materials/material_1/finalizations", async () => {
      finalizations++;
      if (finalizeRelease) await finalizeRelease;
      if (finalizeOutcome === "hidden")
        return json({ errors: [{ code: "material_not_found" }] }, 404);
      state = "processing";
      if (finalizeOutcome === "unknown") return HttpResponse.error();
      return json({
        data: {
          type: "materials",
          id,
          attributes: { ...material, state },
          relationships: {
            course: { data: { type: "courses", id: material.courseId } },
          },
        },
      });
    }),
    http.get("/api/v1/materials/material_1", async () => {
      reads++;
      if (readRelease) await readRelease;
      return json({
        data: {
          type: "materials",
          id,
          attributes: { ...material, state },
          relationships: {
            course: { data: { type: "courses", id: material.courseId } },
          },
        },
      });
    }),
    http.get("/api/v1/materials/material_1/files", () =>
      json({
        data: includeFile
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
                  material: { data: { type: "materials", id } },
                },
              },
            ]
          : [],
      }),
    ),
    http.delete("/api/v1/material-files/file_1", () => {
      deletes++;
      if (deleteStatus === 204 && initialState === "failed") {
        state = "draft";
        includeFile = false;
      }
      return deleteStatus === 204
        ? new HttpResponse(null, { status: 204 })
        : json(
            { errors: [{ code: "unavailable", detail: fixture.rawError }] },
            deleteStatus,
          );
    }),
  );
  const files = await listMaterialFiles(id, new AbortController().signal);
  const actions: ConstructorParameters<typeof MaterialUploadQueue>[2] = {
    readAuthenticated: async (read) => {
      try {
        return {
          kind: "completed",
          value: await read(new AbortController().signal),
        };
      } catch (error) {
        return {
          kind: "failed",
          failure:
            error instanceof ApiHttpError ? error : new ApiProtocolError(),
        };
      }
    },
    runAuthenticatedMutation: async (request, current) => {
      if (!current() || request.send === null) return { kind: "superseded" };
      const send = request.send;
      request.send = null;
      try {
        return { kind: "completed", value: await send(fixture.csrf) };
      } catch (error) {
        if (error instanceof ApiHttpError && error.disclosure.status < 500)
          return { kind: "rejected", failure: error };
        return {
          kind: "unknown",
          failure:
            error instanceof ApiHttpError ? error : new ApiTransportError(null),
        };
      }
    },
  };
  const transfer = new MaterialUpload(new SessionController());
  const pending: {
    readonly resolve: (value: Awaited<UploadAttempt["result"]>) => void;
  }[] = [];
  vi.spyOn(transfer, "upload").mockImplementation(
    (_id, _file, current, progress) => {
      const result = new Promise<Awaited<UploadAttempt["result"]>>(
        (resolve) => {
          pending.push({ resolve });
          if (current())
            progress({ kind: "Uploading", loaded: 0, total: null });
        },
      );
      return {
        result,
        stopWaiting: () =>
          stopCompletes &&
          pending.at(-1)?.resolve({
            kind: "unknown",
            failure: new ApiTransportError(null),
          }),
      };
    },
  );
  let unavailable = 0;
  const queue = new MaterialUploadQueue(
    material,
    files,
    actions,
    transfer,
    () => unavailable++,
  );
  return {
    fixture,
    files,
    pending,
    queue,
    counts: () => ({ reads, deletes, unavailable, finalizations }),
    setFinalizeOutcome: (outcome: typeof finalizeOutcome) => {
      finalizeOutcome = outcome;
    },
    setFinalizeRelease: (value: Promise<void>) => {
      finalizeRelease = value;
    },
    setState: (next: Material["state"]) => {
      state = next;
    },
    setReadRelease: (value: Promise<void>) => {
      readRelease = value;
    },
    setDeleteStatus: (next: number) => {
      deleteStatus = next;
    },
  };
}
it("material failed source removal returns to draft only after the authoritative read", async () => {
  const { queue, counts, files, fixture, setReadRelease } = await queueFixture(
    true,
    "failed",
  );
  let release: () => void = () => undefined;
  setReadRelease(
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  const file = files[0];
  if (!file) throw new Error("Missing fixture source.");
  queue.select([
    new File([fixture.teachingText], "replacement.pdf", {
      type: "application/pdf",
    }),
  ]);
  expect(queue.getSnapshot()?.rows.length === 0).toBe(true);
  queue.chooseRemoval(file.id);
  const run = queue.deleteChosen();
  await waitFor(() =>
    expect(counts().deletes === 1 && counts().reads === 1).toBe(true),
  );
  expect(
    queue.getSnapshot()?.material.state === "failed" &&
      queue.getSnapshot()?.files.length === 0,
  ).toBe(true);
  release();
  await run;
  expect(
    queue.getSnapshot()?.material.state === "draft" &&
      queue.getSnapshot()?.files.length === 0,
  ).toBe(true);
  queue.select([
    new File([fixture.teachingText], "replacement.pdf", {
      type: "application/pdf",
    }),
  ]);
  expect(queue.getSnapshot()?.rows.length === 1).toBe(true);
  queue.destroy();
});
it("material failed processing may be deliberately re-finalized from fresh reviewed sources", async () => {
  const { queue, counts } = await queueFixture(true, "failed");
  queue.accept();
  await queue.reviewFinalization();
  expect(queue.getSnapshot()?.finalization === "Confirming").toBe(true);
  await queue.finalize(() => undefined);
  expect(
    counts().finalizations === 1 &&
      queue.getSnapshot()?.material.state === "processing",
  ).toBe(true);
  queue.destroy();
});
it("material changed preflight file identities invalidate acceptance before dispatch", async () => {
  const { queue, counts } = await queueFixture();
  queue.accept();
  server.use(
    http.get(
      "/api/v1/materials/material_1/files",
      () =>
        new HttpResponse(JSON.stringify({ data: [] }), {
          headers: { "Content-Type": jsonApiMediaType },
        }),
    ),
  );
  await queue.reviewFinalization();
  await queue.finalize(() => undefined);
  expect(
    queue.getSnapshot()?.finalization === "Changed" &&
      queue.getSnapshot()?.review.kind === "User review" &&
      !queue.canFinalize() &&
      counts().finalizations === 0,
  ).toBe(true);
  queue.destroy();
});
it("finalization requires current reviewed file sequence and freezes every queue edit until definitive response", async () => {
  const { queue, counts, fixture } = await queueFixture();
  expect(queue.canFinalize()).toBe(false);
  queue.accept();
  expect(queue.canFinalize()).toBe(true);
  await queue.reviewFinalization();
  expect(queue.getSnapshot()?.finalization === "Confirming").toBe(true);
  queue.select([
    new File([fixture.teachingText], "source.pdf", { type: "application/pdf" }),
  ]);
  expect(queue.getSnapshot()?.rows.length === 0).toBe(true);
  let confirmed = 0;
  const run = queue.finalize(() => confirmed++);
  await queue.finalize(() => confirmed++);
  await run;
  expect(
    counts().finalizations === 1 &&
      confirmed === 1 &&
      queue.getSnapshot()?.material.state === "processing" &&
      !queue.canFinalize(),
  ).toBe(true);
  queue.destroy();
});
it("finalization preflight changed state invalidates review without dispatch", async () => {
  const { queue, setState, counts } = await queueFixture();
  queue.accept();
  setState("processing");
  await queue.reviewFinalization();
  expect(
    queue.getSnapshot()?.finalization === "Changed" &&
      queue.getSnapshot()?.review.kind === "User review" &&
      counts().finalizations === 0,
  ).toBe(true);
  queue.destroy();
});
it("unknown finalization uses explicit Refresh and never attributes observed processing to the attempt", async () => {
  const { queue, setFinalizeOutcome, counts } = await queueFixture();
  queue.accept();
  await queue.reviewFinalization();
  setFinalizeOutcome("unknown");
  let confirmed = 0;
  await queue.finalize(() => confirmed++);
  expect(
    queue.getSnapshot()?.finalization === "Outcome unknown" &&
      queue.getSnapshot()?.material.state === "draft" &&
      confirmed === 0,
  ).toBe(true);
  await queue.reconcile();
  expect(
    queue.getSnapshot()?.material.state === "processing" &&
      queue.getSnapshot()?.review.kind !== "List accepted" &&
      counts().finalizations === 1 &&
      confirmed === 0,
  ).toBe(true);
  queue.destroy();
});
for (const outcome of ["success", "hidden"] as const)
  it(`stopped finalization fences late ${outcome} but preserves current denial`, async () => {
    const { queue, setFinalizeRelease, setFinalizeOutcome, counts } =
      await queueFixture();
    let release: () => void = () => undefined;
    setFinalizeRelease(
      new Promise<void>((resolve) => {
        release = resolve;
      }),
    );
    setFinalizeOutcome(outcome);
    queue.accept();
    await queue.reviewFinalization();
    let confirmed = 0;
    const run = queue.finalize(() => confirmed++);
    await waitFor(() => expect(counts().finalizations === 1).toBe(true));
    queue.stopFinalizationWaiting();
    release();
    await run;
    expect(
      confirmed === 0 &&
        (outcome === "hidden"
          ? counts().unavailable === 1 && queue.getSnapshot() === null
          : queue.getSnapshot()?.finalization === "Outcome unknown"),
    ).toBe(true);
    queue.destroy();
  });
it("material queue serializes duplicate sources and pauses unknown until explicit reconciliation", async () => {
  const { fixture, queue, pending, counts, files } = await queueFixture();
  const file = new File([fixture.teachingText], `${fixture.name}.pdf`, {
    type: "application/pdf",
  });
  queue.select([file, file]);
  courseUnitCheckpoint("material-queued");
  const run = queue.start();
  expect(
    pending.length === 1 &&
      queue.getSnapshot()?.rows[1]?.state.kind === "Queued",
  ).toBe(true);
  pending[0]?.resolve({
    kind: "unknown",
    failure: new ApiTransportError(null),
  });
  await run;
  expect(
    queue.getSnapshot()?.queue === "Queue paused" &&
      counts().reads === 0 &&
      pending.length === 1,
  ).toBe(true);
  courseUnitCheckpoint("material-unconfirmed");
  await queue.start();
  expect(pending.length).toBe(1);
  await queue.reconcile();
  expect(
    queue.getSnapshot()?.rows[0]?.state.kind === "Unknown abandonable" &&
      queue.getSnapshot()?.files[0]?.id === files[0]?.id &&
      pending.length === 1,
  ).toBe(true);
  courseUnitCheckpoint("material-reconciled");
  queue.abandon(1);
  queue.remove(2);
  queue.accept();
  expect(queue.getSnapshot()?.review.kind).toBe("List accepted");
  queue.select([file]);
  expect(queue.getSnapshot()?.review.kind === "List accepted").toBe(false);
  queue.destroy();
  expect(queue.getSnapshot() === null).toBe(true);
  courseUnitCheckpoint("material-cleared");
});
it("material queue supports 200 keyboard rows and rejects each mixed-format source without losing saved draft", async () => {
  const { fixture, queue } = await queueFixture();
  const file = new File([fixture.teachingText], `${fixture.name}.pdf`, {
    type: "application/pdf",
  });
  const rejected: number[] = [];
  queue.configure((events) =>
    rejected.push(
      ...events
        .filter((event) => event.kind === "Rejected")
        .map((event) => event.id),
    ),
  );
  queue.select([
    ...Array.from({ length: 200 }, () => file),
    new File([], "synthetic.png", { type: "image/png" }),
    new File([], "synthetic.md", { type: "text/markdown" }),
  ]);
  expect(
    queue.getSnapshot()?.rows.length === 202 &&
      new Set(queue.getSnapshot()?.rows.map((row) => row.id)).size === 202 &&
      rejected.length === 2 &&
      queue.getSnapshot()?.material.name === fixture.name,
  ).toBe(true);
  queue.remove(1);
  expect(queue.getSnapshot()?.rows[0]?.position === 2).toBe(true);
  courseUnitCheckpoint("material-many");
  queue.destroy();
});
it("material queue requires deliberate duplicate-risk acceptance and freezes authoritative processing", async () => {
  const { fixture, queue, pending, setState } = await queueFixture();
  queue.select([new File([fixture.teachingText], `${fixture.name}.pdf`)]);
  const run = queue.start();
  queue.stopWaiting();
  await run;
  await queue.reconcile();
  queue.abandon(1, true, false);
  expect(pending.length).toBe(1);
  queue.abandon(1, true, true);
  await waitFor(() => expect(pending.length).toBe(2));
  setState("processing");
  pending[1]?.resolve({
    kind: "rejected",
    failure: new ApiHttpError({ status: 409, body: "{}" }),
  });
  await waitFor(() =>
    expect(queue.getSnapshot()?.queue).toBe("Frozen elsewhere"),
  );
  queue.select([new File([], "synthetic.pdf")]);
  expect(queue.getSnapshot()?.rows.length).toBe(1);
  courseUnitCheckpoint("material-frozen");
  queue.destroy();
});
it("material file removal keeps persisted rows until exact definitive success and never replays unknown", async () => {
  const { queue, files, setDeleteStatus, counts } = await queueFixture();
  const file = files[0];
  if (file === undefined) throw new Error("Missing synthetic file.");
  queue.chooseRemoval(file.id);
  setDeleteStatus(503);
  await queue.deleteChosen();
  expect(
    queue.getSnapshot()?.files.length === 1 &&
      queue.getSnapshot()?.deletion.kind === "Outcome unknown" &&
      counts().deletes === 1,
  ).toBe(true);
  courseUnitCheckpoint("material-delete-unknown");
  await queue.deleteChosen();
  expect(counts().deletes).toBe(1);
  await queue.reconcile();
  queue.chooseRemoval(file.id);
  setDeleteStatus(204);
  await queue.deleteChosen();
  expect(
    counts().deletes === 2 && queue.getSnapshot()?.deletion.kind === "Idle",
  ).toBe(true);
  queue.destroy();
});

it.each([204, 404])(
  "material new deletion retires feedback and fences stopped late status %s",
  async (status) => {
    const { fixture, queue, files, setDeleteStatus, counts } =
      await queueFixture();
    const file = files[0];
    if (file === undefined) throw new Error("Missing synthetic file.");
    setDeleteStatus(406);
    queue.chooseRemoval(file.id);
    await queue.deleteChosen();
    expect(
      queue.getSnapshot()?.error?.kind === "rejected" && counts().deletes === 1,
    ).toBe(true);
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.delete("/api/v1/material-files/file_1", async () => {
        await held;
        return status === 204
          ? new HttpResponse(null, { status: 204 })
          : new HttpResponse(
              JSON.stringify({
                errors: [
                  { code: "material_not_found", detail: fixture.rawError },
                ],
              }),
              {
                status,
                headers: { "Content-Type": jsonApiMediaType },
              },
            );
      }),
    );
    queue.chooseRemoval(file.id);
    expect(
      queue.getSnapshot()?.error === null &&
        queue.getSnapshot()?.deletion.kind === "Remove chosen row",
    ).toBe(true);
    courseUnitCheckpoint(`material-delete-retired-start-${status}`);
    const announcements: string[] = [];
    queue.configure(
      () => undefined,
      (state) => announcements.push(state),
    );
    const confirmed = vi.fn();
    const run = queue.deleteChosen(confirmed);
    expect(
      queue.getSnapshot()?.error === null &&
        queue.getSnapshot()?.deletion.kind === "Submitting",
    ).toBe(true);
    queue.stopRemovalWaiting();
    expect(
      queue.getSnapshot()?.error === null &&
        queue.getSnapshot()?.deletion.kind === "Outcome unknown",
    ).toBe(true);
    release();
    await run;
    expect(
      !confirmed.mock.calls.length &&
        counts().reads === 0 &&
        announcements.join() === "Submitting,Outcome unknown" &&
        (status === 204
          ? queue.getSnapshot()?.deletion.kind === "Outcome unknown" &&
            queue.getSnapshot()?.files.length === 1 &&
            queue.getSnapshot()?.error === null
          : queue.getSnapshot() === null && counts().unavailable === 1),
    ).toBe(true);
    courseUnitCheckpoint(`material-delete-retired-late-${status}`);
    queue.destroy();
  },
);

it("material stopped wait retains a current hidden denial and destroys every queue reference", async () => {
  const { fixture, queue, pending, counts } = await queueFixture(false);
  queue.select([new File([fixture.teachingText], `${fixture.name}.pdf`)]);
  const run = queue.start();
  queue.stopWaiting();
  pending[0]?.resolve({
    kind: "rejected",
    failure: new ApiHttpError({ status: 404, body: "{}" }),
  });
  await run;
  expect(
    queue.getSnapshot() === null &&
      counts().unavailable === 1 &&
      counts().reads === 0,
  ).toBe(true);
  courseUnitCheckpoint("material-stopped-denial");
});
