import { z } from "zod";

// The URL names one already-admitted response. Wire events have no server ID:
// only the current connection epoch may apply, and snapshots replace content.
type Source = {
  addEventListener(name: string, listener: (event: Event) => void): void;
  close(): void;
  onerror: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
};
export type StreamView = {
  readonly kind:
    | "Disconnected"
    | "Awaiting snapshot"
    | "Snapshot installed"
    | "Streaming"
    | "Terminal known"
    | "Transport lost"
    | "Protocol error";
  readonly responseId: string | null;
  readonly content: string;
  readonly state:
    "queued" | "generating" | "completed" | "interrupted" | "failed" | null;
  readonly paused: boolean;
};

const content = z
  .string()
  .refine((value) => new TextEncoder().encode(value).length <= 65536);
const snapshot = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("queued"), content: content.optional() }),
  z.strictObject({
    state: z.literal("generating"),
    content: content.optional(),
  }),
  z.strictObject({
    state: z.literal("completed"),
    content: content.optional(),
  }),
  z.strictObject({
    state: z.literal("interrupted"),
    content: content.optional(),
  }),
  z.strictObject({
    state: z.literal("failed"),
    content: content.optional(),
    code: z.enum([
      "openai_unavailable",
      "provider_failure",
      "server_shutdown",
      "storage_failure",
      "tutor_input_invalid",
      "worker_restarted",
    ]),
  }),
]);
const events = {
  snapshot,
  started: z.strictObject({ state: z.literal("generating") }),
  delta: z.strictObject({ text: content.min(1) }),
  completed: z.strictObject({ state: z.literal("completed") }),
  interrupted: z.strictObject({ state: z.literal("interrupted") }),
  failed: z.strictObject({
    state: z.literal("failed"),
    code: z.enum([
      "openai_unavailable",
      "provider_failure",
      "server_shutdown",
      "storage_failure",
      "tutor_input_invalid",
      "worker_restarted",
    ]),
  }),
};
type EventName = keyof typeof events;
const names = Object.keys(events) as EventName[];
const initial: StreamView = {
  kind: "Disconnected",
  responseId: null,
  content: "",
  state: null,
  paused: false,
};

export class TutorStreamController {
  private view: StreamView = initial;
  private source: Source | null = null;
  private epoch = 0;
  private accumulated = "";
  private currentState: StreamView["state"] = null;
  private deferredFailure: "Transport lost" | "Protocol error" | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPaint = -Infinity;
  private readonly listeners = new Set<() => void>();
  private onTerminal: ((id: string, epoch: number) => void) | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.view;

  open(
    responseId: string,
    onTerminal: (id: string, epoch: number) => void,
    factory: (url: string) => Source = (url) => new EventSource(url),
  ) {
    this.close();
    const epoch = this.epoch;
    this.accumulated = "";
    this.currentState = null;
    this.deferredFailure = null;
    this.onTerminal = onTerminal;
    this.publish({
      kind: "Awaiting snapshot",
      responseId,
      content: "",
      state: null,
      paused: false,
    });
    let source: Source;
    try {
      source = factory(
        `/api/v1/tutor-responses/${encodeURIComponent(responseId)}/events`,
      );
    } catch {
      this.fail("Transport lost", epoch);
      return;
    }
    this.source = source;
    for (const name of names)
      source.addEventListener(name, (event) => {
        if (
          this.epoch !== epoch ||
          this.source !== source ||
          this.view.kind === "Terminal known"
        )
          return;
        if (!(event instanceof MessageEvent)) {
          this.fail("Protocol error", epoch);
          return;
        }
        this.receive(name, event.data, epoch);
      });
    // Native EventSource never delivers unknown named events to our listeners;
    // they cannot be applied (owner ruling 2026-10-12). Unnamed events are
    // observable protocol violations and do fence.
    source.onmessage = () => this.fail("Protocol error", epoch);
    source.onerror = () => this.fail("Transport lost", epoch);
  }

  private receive(name: EventName, raw: unknown, epoch: number) {
    if (typeof raw !== "string") {
      this.fail("Protocol error", epoch);
      return;
    }
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      this.fail("Protocol error", epoch);
      return;
    }
    const parsed = events[name].safeParse(value);
    if (!parsed.success) {
      this.fail("Protocol error", epoch);
      return;
    }
    if (name === "snapshot") {
      const result = snapshot.parse(value);
      if (
        this.currentState !== null &&
        !this.validTransition(this.currentState, result.state)
      ) {
        this.fail("Protocol error", epoch);
        return;
      }
      this.accumulated = result.content ?? "";
      this.currentState = result.state;
      const terminal = this.terminal(result.state);
      if (!this.view.paused)
        this.publish({
          ...this.view,
          kind: terminal ? "Terminal known" : "Snapshot installed",
          state: result.state,
          content: this.accumulated,
        });
      if (terminal) this.finish(epoch);
      return;
    }
    const state = this.currentState;
    if (state === null || this.terminal(state)) {
      this.fail("Protocol error", epoch);
      return;
    }
    if (name === "delta") {
      if (state !== "generating") {
        this.fail("Protocol error", epoch);
        return;
      }
      const delta = events.delta.parse(value).text;
      const next = this.accumulated + delta;
      if (new TextEncoder().encode(next).length > 65536) {
        this.fail("Protocol error", epoch);
        return;
      }
      this.accumulated = next;
      this.paint(epoch);
      return;
    }
    const nextState = name === "started" ? "generating" : name;
    if (
      !this.validTransition(state, nextState) ||
      (name === "started" && state !== "queued")
    ) {
      this.fail("Protocol error", epoch);
      return;
    }
    this.clearPaint();
    this.currentState = nextState;
    if (!this.view.paused)
      this.publish({
        ...this.view,
        kind: this.terminal(nextState) ? "Terminal known" : "Streaming",
        state: nextState,
        content: this.accumulated,
      });
    if (this.terminal(nextState)) this.finish(epoch);
  }

  private terminal(state: NonNullable<StreamView["state"]>) {
    return (
      state === "completed" || state === "interrupted" || state === "failed"
    );
  }
  private validTransition(
    from: NonNullable<StreamView["state"]>,
    to: NonNullable<StreamView["state"]>,
  ) {
    return (
      from === to ||
      (from === "queued" && to === "generating") ||
      ((from === "queued" || from === "generating") && this.terminal(to))
    );
  }
  private paint(epoch: number) {
    if (this.view.paused || this.flushTimer !== null) return;
    const wait = Math.max(0, 100 - (Date.now() - this.lastPaint));
    if (wait === 0) {
      this.lastPaint = Date.now();
      this.publish({
        ...this.view,
        kind: "Streaming",
        content: this.accumulated,
      });
      return;
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      if (this.epoch !== epoch || this.view.paused) return;
      this.lastPaint = Date.now();
      this.publish({
        ...this.view,
        kind: "Streaming",
        content: this.accumulated,
      });
    }, wait);
  }
  pause() {
    if (this.view.paused) return;
    this.clearPaint();
    this.publish({ ...this.view, paused: true });
  }
  resume() {
    if (!this.view.paused) return;
    this.lastPaint = Date.now();
    this.publish({
      ...this.view,
      paused: false,
      content: this.accumulated,
      state: this.currentState,
      kind:
        this.deferredFailure ??
        (this.currentState !== null && this.terminal(this.currentState)
          ? "Terminal known"
          : this.currentState === null
            ? "Awaiting snapshot"
            : "Streaming"),
    });
  }
  private finish(epoch: number) {
    const id = this.view.responseId;
    const callback = this.onTerminal;
    this.fence();
    if (id !== null) callback?.(id, epoch);
  }
  private fail(kind: "Transport lost" | "Protocol error", epoch: number) {
    if (epoch !== this.epoch || this.view.kind === "Terminal known") return;
    this.fence();
    if (this.view.paused) {
      // Fence and close immediately, but do not change the paused transcript
      // or emit a non-privacy stream announcement before explicit Resume.
      this.deferredFailure = kind;
      return;
    }
    this.publish({
      ...this.view,
      kind,
      content: this.view.paused ? this.view.content : this.accumulated,
    });
  }
  private clearPaint() {
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }
  private fence() {
    this.epoch++;
    this.clearPaint();
    this.source?.close();
    this.source = null;
    this.onTerminal = null;
  }
  close() {
    this.fence();
    this.accumulated = "";
    this.currentState = null;
    this.deferredFailure = null;
    this.publish(initial);
  }
  private publish(next: StreamView) {
    this.view = next;
    for (const listener of this.listeners) listener();
  }
}
