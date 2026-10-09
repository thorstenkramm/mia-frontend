import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { useIntl } from "react-intl";
import {
  getMaterial,
  isHiddenMaterialFailure,
  listMaterialFiles,
  matchesMaterialFormat,
  deleteMaterialFile,
  type Material,
  type MaterialFile,
  type MaterialFileId,
} from "../../platform/api/materials";
import type { EntryApiFailure } from "../../platform/api/entry";
import {
  useMaterialUpload,
  useSessionActions,
} from "../../platform/data/EntryDataProvider";
import type {
  MaterialUpload,
  UploadAttempt,
} from "../../platform/transfer/materialUpload";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import { materialLabels } from "./MaterialRouteProps";

type RowState =
  | { readonly kind: "Selected" | "Queued" }
  | {
      readonly kind: "Uploading";
      readonly loaded: number;
      readonly total: number | null;
    }
  | { readonly kind: "Verifying" }
  | { readonly kind: "Uploaded"; readonly serverFile: MaterialFile }
  | {
      readonly kind: "Rejected";
      readonly error: EntryApiFailure | null;
      readonly mismatch: boolean;
    }
  | {
      readonly kind: "Outcome unknown" | "Unknown abandonable";
      readonly error: EntryApiFailure | null;
    };
export type UploadRow = {
  readonly id: number;
  readonly name: string;
  readonly size: number;
  readonly mediaType: string;
  readonly position: number;
  readonly state: RowState;
};
type ReviewState =
  | { readonly kind: "User review" | "List reviewable" }
  | { readonly kind: "List accepted"; readonly sequence: number };
type DeletionState =
  | { readonly kind: "Idle" }
  | {
      readonly kind: "Remove chosen row" | "Submitting" | "Outcome unknown";
      readonly file: MaterialFile;
    };
type DeletionAnnouncement =
  "Submitting" | "Outcome unknown" | "Rejected" | "Deleted";
type QueueSnapshot = {
  readonly material: Material;
  readonly files: readonly MaterialFile[];
  readonly rows: readonly UploadRow[];
  readonly review: ReviewState;
  readonly deletion: DeletionState;
  readonly read: "Idle" | "Reading";
  readonly queue: "Selected" | "Queued" | "Queue paused" | "Frozen elsewhere";
  readonly error: {
    readonly kind: "rejected" | "unknown" | "read";
    readonly failure: EntryApiFailure;
  } | null;
  readonly checkedAt: number;
};
type SessionActions = Pick<
  ReturnType<typeof useSessionActions>,
  "readAuthenticated" | "runAuthenticatedMutation"
>;
type AnnounceEvent = {
  readonly id: number;
  readonly name: string;
  readonly kind: RowState["kind"] | "Cancelled";
};

// Machine 10 page-memory owner. It never correlates a local attempt with list metadata.
export class MaterialUploadQueue {
  private data: QueueSnapshot | null = null;
  private get snapshot(): QueueSnapshot {
    if (this.data === null)
      throw new Error("The upload route has been released.");
    return this.data;
  }
  private set snapshot(value: QueueSnapshot) {
    this.data = value;
  }
  private readonly listeners = new Set<() => void>();
  private readonly handles = new Map<number, File>();
  private active: {
    readonly id: number;
    readonly attempt: UploadAttempt;
  } | null = null;
  private live = true;
  private generation = 0;
  private sequence = 1;
  private rowId = 0;
  private pumping = false;
  private deletionSequence = 0;
  private announce: (events: readonly AnnounceEvent[]) => void = () =>
    undefined;
  private announceDeletion: (state: DeletionAnnouncement) => void = () =>
    undefined;
  constructor(
    material: Material,
    files: readonly MaterialFile[],
    private readonly actions: SessionActions,
    private readonly transfer: MaterialUpload,
    private readonly unavailable: (error: EntryApiFailure | null) => void,
  ) {
    this.activate(material, files);
  }
  activate(material: Material, files: readonly MaterialFile[]): void {
    if (this.data !== null) return;
    this.live = true;
    this.snapshot = {
      material,
      files,
      rows: [],
      review: { kind: "List reviewable" },
      deletion: { kind: "Idle" },
      read: "Idle",
      queue: material.state === "draft" ? "Selected" : "Frozen elsewhere",
      error: null,
      checkedAt: Date.now(),
    };
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.data;
  configure(
    announce: (events: readonly AnnounceEvent[]) => void,
    announceDeletion: (state: DeletionAnnouncement) => void = () => undefined,
  ): void {
    this.announce = announce;
    this.announceDeletion = announceDeletion;
  }
  destroy(): void {
    this.live = false;
    this.generation++;
    this.active?.attempt.stopWaiting();
    this.active = null;
    this.handles.clear();
    this.announce = () => undefined;
    this.announceDeletion = () => undefined;
    this.data = null;
    for (const listener of this.listeners) listener();
  }
  private publish(next: QueueSnapshot): void {
    if (!this.live) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
  private invalidate(): ReviewState {
    return { kind: "User review" };
  }
  private hideIfDenied(failure: EntryApiFailure): boolean {
    if (!isHiddenMaterialFailure(failure)) return false;
    this.unavailable(failure);
    this.destroy();
    return true;
  }
  private async reconcileConflict(failure: EntryApiFailure): Promise<void> {
    if (failure.kind !== "http" || failure.disclosure.status !== 409) return;
    this.publish({ ...this.snapshot, queue: "Frozen elsewhere" });
    await this.reconcile(false);
    if (this.live)
      this.publish({
        ...this.snapshot,
        queue: "Frozen elsewhere",
        error: this.snapshot.error ?? { kind: "rejected", failure },
      });
  }
  private changeRow(id: number, state: RowState): void {
    if (!this.live) return;
    const row = this.snapshot.rows.find((candidate) => candidate.id === id);
    if (!this.live || row === undefined) return;
    this.publish({
      ...this.snapshot,
      rows: this.snapshot.rows.map((candidate) =>
        candidate.id === id ? { ...candidate, state } : candidate,
      ),
    });
    if (row.state.kind !== state.kind)
      this.announce([{ id, name: row.name, kind: state.kind }]);
  }
  select(files: readonly File[]): void {
    if (!this.live) return;
    if (
      this.snapshot.material.state !== "draft" ||
      this.snapshot.queue === "Frozen elsewhere" ||
      this.snapshot.deletion.kind !== "Idle" ||
      this.snapshot.read === "Reading"
    )
      return;
    const format = this.snapshot.material.format;
    if (format === "link") return;
    const rows = files.map((file) => {
      const id = ++this.rowId;
      const valid = matchesMaterialFormat(file, format);
      if (valid) this.handles.set(id, file);
      return {
        id,
        name: file.name,
        size: file.size,
        mediaType: file.type,
        position: id,
        state: valid
          ? { kind: "Selected" }
          : { kind: "Rejected", error: null, mismatch: true },
      } satisfies UploadRow;
    });
    this.publish({
      ...this.snapshot,
      rows: [...this.snapshot.rows, ...rows],
      review: this.invalidate(),
    });
    const rejected = rows.filter((row) => row.state.kind === "Rejected");
    if (rejected.length)
      this.announce(
        rejected.map((row) => ({
          id: row.id,
          name: row.name,
          kind: "Rejected",
        })),
      );
  }
  remove(id: number): void {
    if (!this.live) return;
    const row = this.snapshot.rows.find((candidate) => candidate.id === id);
    if (
      row === undefined ||
      !["Selected", "Queued", "Rejected", "Uploaded"].includes(row.state.kind)
    )
      return;
    this.handles.delete(id);
    if (this.active?.id === id) this.active.attempt.stopWaiting();
    this.publish({
      ...this.snapshot,
      rows: this.snapshot.rows.filter((candidate) => candidate.id !== id),
      review: this.invalidate(),
    });
    if (row.state.kind === "Selected" || row.state.kind === "Queued")
      this.announce([{ id, name: row.name, kind: "Cancelled" }]);
  }
  async start(): Promise<void> {
    if (
      !this.live ||
      this.pumping ||
      this.snapshot.queue === "Queue paused" ||
      this.snapshot.queue === "Frozen elsewhere" ||
      this.snapshot.read === "Reading" ||
      this.snapshot.deletion.kind !== "Idle"
    )
      return;
    const selected = this.snapshot.rows.filter(
      (row) => row.state.kind === "Selected",
    );
    this.publish({
      ...this.snapshot,
      queue: "Queued",
      review: this.invalidate(),
      rows: this.snapshot.rows.map((row) =>
        row.state.kind === "Selected"
          ? { ...row, state: { kind: "Queued" } }
          : row,
      ),
    });
    if (selected.length)
      this.announce(
        selected.map((row) => ({ id: row.id, name: row.name, kind: "Queued" })),
      );
    this.pumping = true;
    const generation = this.generation;
    try {
      while (
        this.live &&
        generation === this.generation &&
        this.snapshot.queue === "Queued"
      ) {
        const rowId = this.snapshot.rows.find(
          (candidate) => candidate.state.kind === "Queued",
        )?.id;
        if (rowId === undefined) break;
        let file: File | undefined = this.handles.get(rowId);
        if (file === undefined)
          throw new Error("A queued source must have a page-local handle.");
        const attempt = this.transfer.upload(
          this.snapshot.material.id,
          file,
          () =>
            this.live &&
            generation === this.generation &&
            this.snapshot.queue === "Queued" &&
            this.snapshot.rows.some((candidate) => candidate.id === rowId),
          (progress) => this.changeRow(rowId, progress),
        );
        file = undefined;
        this.active = { id: rowId, attempt };
        const result = await attempt.result;
        this.active = null;
        if (!this.live || generation !== this.generation) return;
        if (
          (result.kind === "rejected" || result.kind === "unknown") &&
          this.hideIfDenied(result.failure)
        ) {
          return;
        }
        if (
          this.snapshot.rows.find((candidate) => candidate.id === rowId)?.state
            .kind === "Outcome unknown"
        )
          return;
        switch (result.kind) {
          case "completed":
            this.handles.delete(rowId);
            this.changeRow(rowId, {
              kind: "Uploaded",
              serverFile: result.value,
            });
            await this.reconcile(false);
            break;
          case "rejected":
          case "not-sent":
            this.handles.delete(rowId);
            this.changeRow(rowId, {
              kind: "Rejected",
              error: result.failure,
              mismatch: false,
            });
            await this.reconcileConflict(result.failure);
            break;
          case "unknown":
            this.changeRow(rowId, {
              kind: "Outcome unknown",
              error: result.failure,
            });
            this.publish({
              ...this.snapshot,
              queue: "Queue paused",
              review: this.invalidate(),
            });
            return;
          case "superseded":
            if (!this.snapshot.rows.some((candidate) => candidate.id === rowId))
              break;
            this.destroy();
            return;
        }
      }
      if (this.live && this.snapshot.queue === "Queued")
        this.publish({
          ...this.snapshot,
          queue: "Selected",
          review: { kind: "List reviewable" },
        });
    } finally {
      this.pumping = false;
    }
  }
  stopWaiting(): void {
    if (this.active === null) return;
    const { id, attempt } = this.active;
    this.changeRow(id, { kind: "Outcome unknown", error: null });
    this.publish({
      ...this.snapshot,
      queue: "Queue paused",
      review: this.invalidate(),
    });
    attempt.stopWaiting();
  }
  async reconcile(explicit = true): Promise<void> {
    if (
      !this.live ||
      this.snapshot.read === "Reading" ||
      (explicit && this.active !== null)
    )
      return;
    const generation = this.generation;
    this.publish({
      ...this.snapshot,
      read: "Reading",
      review: this.invalidate(),
      error: null,
    });
    const { courseId, id } = this.snapshot.material;
    const result = await this.actions.readAuthenticated(async (signal) => {
      const material = await getMaterial(courseId, id, signal);
      if (material.scope !== "course-wide") return { material, files: null };
      return { material, files: await listMaterialFiles(material.id, signal) };
    });
    if (!this.live || generation !== this.generation) return;
    if (result.kind === "failed") {
      if (this.hideIfDenied(result.failure)) return;
      this.publish({
        ...this.snapshot,
        read: "Idle",
        queue: "Queue paused",
        error: { kind: "read", failure: result.failure },
      });
    } else if (result.kind === "completed") {
      this.sequence++;
      if (result.value.files === null) {
        this.unavailable(null);
        this.destroy();
        return;
      }
      const rows = this.snapshot.rows.map((row) =>
        explicit &&
        (row.state.kind === "Outcome unknown" ||
          row.state.kind === "Unknown abandonable")
          ? {
              ...row,
              state: {
                kind: "Unknown abandonable",
                error: row.state.error,
              } as const,
            }
          : row,
      );
      const unknown = rows.some(
        (row) =>
          row.state.kind === "Outcome unknown" ||
          row.state.kind === "Unknown abandonable",
      );
      this.publish({
        ...this.snapshot,
        ...result.value,
        rows,
        read: "Idle",
        deletion: explicit ? { kind: "Idle" } : this.snapshot.deletion,
        checkedAt: Date.now(),
        review: { kind: unknown ? "User review" : "List reviewable" },
        queue:
          result.value.material.state !== "draft"
            ? "Frozen elsewhere"
            : unknown
              ? "Queue paused"
              : this.pumping
                ? "Queued"
                : "Selected",
      });
    } else this.destroy();
  }
  abandon(id: number, asNew = false, riskAccepted = false): void {
    if (!this.live) return;
    const row = this.snapshot.rows.find((candidate) => candidate.id === id);
    if (
      row?.state.kind !== "Unknown abandonable" ||
      this.snapshot.read !== "Idle" ||
      (asNew && !riskAccepted)
    )
      return;
    const file = this.handles.get(id);
    if (
      asNew &&
      (file === undefined || this.snapshot.material.state !== "draft")
    )
      return;
    this.handles.delete(id);
    this.publish({
      ...this.snapshot,
      rows: this.snapshot.rows.filter((candidate) => candidate.id !== id),
      review: this.invalidate(),
    });
    if (
      !this.snapshot.rows.some((candidate) =>
        ["Outcome unknown", "Unknown abandonable"].includes(
          candidate.state.kind,
        ),
      )
    )
      this.publish({
        ...this.snapshot,
        queue:
          this.snapshot.material.state === "draft"
            ? "Selected"
            : "Frozen elsewhere",
        review: { kind: "List reviewable" },
      });
    if (asNew && file !== undefined) {
      this.select([file]);
      void this.start();
    }
  }
  accept(): void {
    if (!this.live) return;
    if (
      this.snapshot.error !== null ||
      this.snapshot.queue === "Queue paused" ||
      this.snapshot.read !== "Idle" ||
      this.snapshot.deletion.kind !== "Idle" ||
      this.snapshot.rows.some(
        (row) => !["Uploaded", "Rejected"].includes(row.state.kind),
      )
    )
      return;
    this.publish({
      ...this.snapshot,
      review: { kind: "List accepted", sequence: this.sequence },
    });
  }
  chooseRemoval(id: MaterialFileId): void {
    if (!this.live) return;
    if (
      this.snapshot.material.state !== "draft" ||
      this.snapshot.queue === "Frozen elsewhere" ||
      this.active !== null ||
      this.snapshot.read !== "Idle" ||
      this.snapshot.deletion.kind !== "Idle"
    )
      return;
    const file = this.snapshot.files.find((candidate) => candidate.id === id);
    if (file !== undefined)
      this.publish({
        ...this.snapshot,
        deletion: { kind: "Remove chosen row", file },
        review: this.invalidate(),
        // Mutation feedback belongs to the previous attempt; read failures remain separate.
        error:
          this.snapshot.error?.kind === "read" ? this.snapshot.error : null,
      });
  }
  cancelRemoval(): void {
    if (!this.live) return;
    if (this.snapshot.deletion.kind === "Remove chosen row")
      this.publish({ ...this.snapshot, deletion: { kind: "Idle" } });
  }
  async deleteChosen(onConfirmed: () => void = () => undefined): Promise<void> {
    if (!this.live) return;
    if (this.snapshot.deletion.kind !== "Remove chosen row") return;
    const file = this.snapshot.deletion.file;
    const generation = this.generation;
    const deletionSequence = ++this.deletionSequence;
    this.publish({
      ...this.snapshot,
      deletion: { kind: "Submitting", file },
      error: this.snapshot.error?.kind === "read" ? this.snapshot.error : null,
    });
    this.announceDeletion("Submitting");
    const result = await this.actions.runAuthenticatedMutation(
      { send: (csrf) => deleteMaterialFile(file.id, csrf) },
      () =>
        this.live &&
        generation === this.generation &&
        this.snapshot.material.state === "draft",
    );
    if (!this.live || generation !== this.generation) return;
    if (
      (result.kind === "rejected" || result.kind === "unknown") &&
      this.hideIfDenied(result.failure)
    ) {
      return;
    }
    if (deletionSequence !== this.deletionSequence) return;
    if (result.kind === "completed") {
      this.publish({
        ...this.snapshot,
        files: this.snapshot.files.filter(
          (candidate) => candidate.id !== file.id,
        ),
        deletion: { kind: "Idle" },
      });
      await this.reconcile(false);
      if (this.live) {
        this.announceDeletion("Deleted");
        onConfirmed();
      }
    } else if (result.kind === "unknown") {
      this.publish({
        ...this.snapshot,
        deletion: { kind: "Outcome unknown", file },
        error: { kind: "unknown", failure: result.failure },
      });
      this.announceDeletion("Outcome unknown");
    } else if (result.kind === "rejected" || result.kind === "not-sent") {
      this.publish({
        ...this.snapshot,
        deletion: { kind: "Idle" },
        error: { kind: "rejected", failure: result.failure },
      });
      this.announceDeletion("Rejected");
      await this.reconcileConflict(result.failure);
    } else this.destroy();
  }
  stopRemovalWaiting(): void {
    if (!this.live || this.snapshot.deletion.kind !== "Submitting") return;
    this.deletionSequence++;
    this.publish({
      ...this.snapshot,
      deletion: { ...this.snapshot.deletion, kind: "Outcome unknown" },
      error: this.snapshot.error?.kind === "read" ? this.snapshot.error : null,
    });
    this.announceDeletion("Outcome unknown");
  }
}

export function useMaterialUploadQueue(
  material: Material,
  files: readonly MaterialFile[],
  unavailable: (error: EntryApiFailure | null) => void,
) {
  const actions = useSessionActions();
  const transfer = useMaterialUpload();
  const intl = useIntl();
  const { announce, clear } = useAnnouncer();
  const urgentLedger = useRef(new Map<string, AnnounceEvent>());
  const [queue] = useState(
    () =>
      new MaterialUploadQueue(material, files, actions, transfer, unavailable),
  );
  useLayoutEffect(() => {
    queue.configure(
      (events) => {
        const urgent = events.filter(
          (event) =>
            event.kind === "Rejected" || event.kind === "Outcome unknown",
        );
        for (const event of urgent)
          urgentLedger.current.set(`${event.id}:${event.kind}`, event);
        const selected = urgentLedger.current.size
          ? [...urgentLedger.current.values()]
          : events.slice(-1);
        const keys = [...urgentLedger.current.keys()];
        announce(
          selected
            .map((event) =>
              intl.formatMessage(messages.materialAnnouncement, {
                name: event.name,
                state: intl.formatMessage(
                  event.kind === "Cancelled"
                    ? messages.materialCancelled
                    : materialLabels[event.kind],
                ),
              }),
            )
            .join("; "),
          urgentLedger.current.size ? "urgent" : "polite",
          () => {
            for (const key of keys) urgentLedger.current.delete(key);
          },
        );
      },
      (state) => {
        const descriptor = {
          Submitting: messages.materialDeleting,
          "Outcome unknown": messages.materialDeleteUnknown,
          Rejected: messages.materialError,
          Deleted: messages.materialDeleted,
        }[state];
        announce(
          intl.formatMessage(descriptor),
          state === "Submitting" || state === "Deleted" ? "polite" : "urgent",
        );
      },
    );
  }, [queue, intl, announce]);
  useLayoutEffect(() => {
    queue.activate(material, files);
    const ledger = urgentLedger.current;
    const hide = () => {
      queue.destroy();
      ledger.clear();
      clear();
    };
    const unregister = transfer.registerRouteTeardown(hide);
    window.addEventListener("pagehide", hide);
    return () => {
      window.removeEventListener("pagehide", hide);
      unregister();
      hide();
    };
  }, [queue, material, files, transfer, clear]);
  const state = useSyncExternalStore(queue.subscribe, queue.getSnapshot);
  return { queue, state };
}
