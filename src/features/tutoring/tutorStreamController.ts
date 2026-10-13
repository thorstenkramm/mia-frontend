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
  readonly retry:
    "none" | "waiting" | "ready" | "opening" | "paused" | "exhausted";
  readonly retryAttempt: number;
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
  retry: "none",
  retryAttempt: 0,
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
  private availabilityTimer: ReturnType<typeof setTimeout> | null = null;
  private retryAttempt = 0;
  private retryState: StreamView["retry"] = "none";
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
    this.connect(responseId, onTerminal, factory);
  }

  // An initial loss makes the first opening available after one second.
  // Neither this timer nor later timers construct an EventSource.
  private waitForAttempt() {
    if (this.retryAttempt >= 3) {
      this.setRetry("exhausted");
      return;
    }
    this.clearAvailability();
    this.setRetry("waiting");
    this.availabilityTimer = setTimeout(() => {
      this.availabilityTimer = null;
      if (this.retryState === "waiting") this.setRetry("ready");
    }, [1000, 2000, 4000][this.retryAttempt]);
  }
  // Try now may consume a pending delay; access checks happen outside the
  // controller. It can never open by itself.
  tryNow(): boolean {
    if (this.retryState !== "waiting" && this.retryState !== "ready")
      return false;
    this.clearAvailability();
    this.retryAttempt++;
    this.setRetry("opening");
    return true;
  }
  reopen(
    responseId: string,
    onTerminal: (id: string, epoch: number) => void,
    factory: (url: string) => Source = (url) => new EventSource(url),
  ): boolean {
    if (this.retryState !== "opening") return false;
    this.fence();
    this.connect(responseId, onTerminal, factory);
    return true;
  }
  checkFailed() {
    if (this.retryState === "opening") this.waitForAttempt();
  }
  stopWaiting() {
    if (this.retryState === "none" || this.retryState === "exhausted") return;
    this.clearAvailability();
    this.fence();
    this.setRetry("paused");
  }
  // A lifecycle shield is neither a user Stop waiting nor a new opening.
  // Close immediately without destroying the page-local reconnect bound.
  suspend() {
    this.clearAvailability();
    this.fence();
    this.accumulated = "";
    this.currentState = null;
    this.deferredFailure = null;
    this.publish({
      ...this.view,
      kind: "Disconnected",
      content: "",
      state: null,
      paused: false,
    });
    if (this.retryState !== "opening" && this.retryState !== "exhausted")
      this.setRetry("paused");
  }
  resumeRetries() {
    if (this.retryState === "paused") this.waitForAttempt();
  }
  newBound() {
    if (this.retryState !== "exhausted") return;
    this.retryAttempt = 0;
    this.waitForAttempt();
  }
  private setRetry(next: StreamView["retry"]) {
    this.retryState = next;
    if (!this.view.paused)
      this.publish({
        ...this.view,
        retry: next,
        retryAttempt: this.retryAttempt,
      });
  }
  private clearAvailability() {
    if (this.availabilityTimer !== null) clearTimeout(this.availabilityTimer);
    this.availabilityTimer = null;
  }
  private connect(
    responseId: string,
    onTerminal: (id: string, epoch: number) => void,
    factory: (url: string) => Source,
  ) {
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
      retry: this.retryState,
      retryAttempt: this.retryAttempt,
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
      this.retryAttempt = 0;
      this.clearAvailability();
      this.retryState = "none";
      const terminal = this.terminal(result.state);
      if (!this.view.paused)
        this.publish({
          ...this.view,
          kind: terminal ? "Terminal known" : "Snapshot installed",
          state: result.state,
          content: this.accumulated,
          retry: "none",
          retryAttempt: 0,
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
      retry: this.retryState,
      retryAttempt: this.retryAttempt,
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
    this.waitForAttempt();
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
    this.clearAvailability();
    this.fence();
    this.retryAttempt = 0;
    this.retryState = "none";
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
