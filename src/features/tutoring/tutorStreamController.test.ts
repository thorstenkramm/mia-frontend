import { afterEach, expect, it, vi } from "vitest";
import { TutorStreamController } from "./tutorStreamController";

class FakeSource extends EventTarget {
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  closed = false;
  close() {
    this.closed = true;
  }
  emit(name: string, data: unknown) {
    this.dispatchEvent(new MessageEvent(name, { data: JSON.stringify(data) }));
  }
  raw(name: string, data: string) {
    this.dispatchEvent(new MessageEvent(name, { data }));
  }
  loss() {
    this.onerror?.(new Event("error"));
  }
}
function setup() {
  const source = new FakeSource();
  const controller = new TutorStreamController();
  const terminal = vi.fn();
  controller.open("response_1", terminal, () => source);
  return { source, controller, terminal };
}
afterEach(() => {
  vi.useRealTimers();
});

it("replaces snapshot atomically, applies equal deltas and fences late terminal events", () => {
  const { source, controller, terminal } = setup();
  source.emit("snapshot", { state: "generating", content: "first" });
  source.emit("snapshot", { state: "generating", content: "replacement" });
  vi.useFakeTimers();
  source.emit("delta", { text: "x" });
  source.emit("delta", { text: "x" });
  vi.advanceTimersByTime(100);
  expect(controller.getSnapshot().content).toBe("replacementxx");
  source.emit("completed", { state: "completed" });
  expect(source.closed && terminal.mock.calls.length === 1).toBe(true);
  source.emit("delta", { text: "late" });
  expect(controller.getSnapshot().content).toBe("replacementxx");
});

it("fences malformed contracted events and delta before snapshot, without native reconnect", () => {
  for (const send of [
    (s: FakeSource) => s.raw("snapshot", "{"),
    (s: FakeSource) => s.emit("delta", { text: "before" }),
    (s: FakeSource) => {
      s.emit("snapshot", { state: "queued" });
      s.emit("delta", { text: "before start" });
    },
    (s: FakeSource) => {
      s.emit("snapshot", { state: "generating" });
      s.emit("started", { state: "generating" });
    },
    (s: FakeSource) => {
      s.emit("snapshot", { state: "generating" });
      s.emit("snapshot", { state: "queued" });
    },
  ]) {
    const { source, controller } = setup();
    send(source);
    expect(
      source.closed && controller.getSnapshot().kind === "Protocol error",
    ).toBe(true);
  }
  const { source, controller } = setup();
  source.emit("snapshot", { state: "generating" });
  source.loss();
  expect(
    source.closed && controller.getSnapshot().kind === "Transport lost",
  ).toBe(true);
  source.emit("delta", { text: "late" });
  expect(controller.getSnapshot().content).toBe("");
});

it("never applies unknown named events and freezes presentation without stopping the stream", () => {
  const { source, controller } = setup();
  source.emit("snapshot", { state: "generating", content: "seen" });
  source.emit("unknown-event", { text: "not applied" });
  expect(controller.getSnapshot().content).toBe("seen");
  controller.pause();
  source.emit("delta", { text: " buffered" });
  expect(controller.getSnapshot().content).toBe("seen");
  expect(source.closed).toBe(false);
  source.emit("completed", { state: "completed" });
  expect(source.closed && controller.getSnapshot().state === "generating").toBe(
    true,
  );
  controller.resume();
  expect(controller.getSnapshot().content).toBe("seen buffered");
  expect(controller.getSnapshot().state).toBe("completed");
  controller.close();
  expect(
    source.closed && controller.getSnapshot().kind === "Disconnected",
  ).toBe(true);
});

it.each(["loss", "invalid"] as const)(
  "fences %s while paused without publishing failure until Resume",
  (failure) => {
    const { source, controller } = setup();
    source.emit("snapshot", { state: "generating", content: "seen" });
    controller.pause();
    const paused = controller.getSnapshot();
    const listener = vi.fn();
    controller.subscribe(listener);
    source.emit("delta", { text: " buffered" });
    if (failure === "loss") source.loss();
    else source.raw("delta", "{");
    expect(source.closed).toBe(true);
    expect(controller.getSnapshot()).toBe(paused);
    expect(listener).not.toHaveBeenCalled();
    controller.resume();
    expect(controller.getSnapshot().kind).toBe(
      failure === "loss" ? "Transport lost" : "Protocol error",
    );
    expect(controller.getSnapshot().content).toBe("seen buffered");
  },
);

it("keeps exactly three user-activated replacement openings with snapshot-only reset", () => {
  vi.useFakeTimers();
  const controller = new TutorStreamController();
  const sources: FakeSource[] = [];
  const factory = () => {
    const source = new FakeSource();
    sources.push(source);
    return source;
  };
  const terminal = vi.fn();
  controller.open("response_1", terminal, factory);
  sources[0]?.loss();
  expect(controller.getSnapshot().retry).toBe("waiting");
  vi.advanceTimersByTime(1000);
  expect(controller.getSnapshot().retry).toBe("ready");
  expect(sources).toHaveLength(1);
  expect(
    controller.tryNow() && controller.reopen("response_1", terminal, factory),
  ).toBe(true);
  sources[1]?.loss();
  expect(controller.getSnapshot().retryAttempt).toBe(1);
  // Early Try now consumes the scheduled 2-second attempt without timer-driven opening.
  expect(
    controller.tryNow() && controller.reopen("response_1", terminal, factory),
  ).toBe(true);
  vi.advanceTimersByTime(2000);
  expect(sources).toHaveLength(3);
  sources[2]?.loss();
  expect(controller.getSnapshot().retryAttempt).toBe(2);
  vi.advanceTimersByTime(4000);
  expect(sources).toHaveLength(3);
  expect(
    controller.tryNow() && controller.reopen("response_1", terminal, factory),
  ).toBe(true);
  sources[3]?.loss();
  expect(controller.getSnapshot().retry).toBe("exhausted");
  vi.advanceTimersByTime(10000);
  expect(sources).toHaveLength(4);
  expect(controller.tryNow()).toBe(false);
  controller.newBound();
  expect(controller.getSnapshot().retry).toBe("waiting");
  expect(
    controller.tryNow() && controller.reopen("response_1", terminal, factory),
  ).toBe(true);
  sources[4]?.emit("snapshot", { state: "generating", content: "fresh" });
  expect(controller.getSnapshot().retryAttempt).toBe(0);
  expect(controller.getSnapshot().content).toBe("fresh");
  expect(sources.slice(0, 4).every((source) => source.closed)).toBe(true);
  controller.close();
});

it("pauses a consumed opening without refund or automatic replacement", () => {
  vi.useFakeTimers();
  const { source, controller, terminal } = setup();
  source.loss();
  expect(controller.tryNow()).toBe(true);
  const replacement = new FakeSource();
  expect(controller.reopen("response_1", terminal, () => replacement)).toBe(
    true,
  );
  controller.stopWaiting();
  expect(
    replacement.closed && controller.getSnapshot().retry === "paused",
  ).toBe(true);
  expect(controller.getSnapshot().retryAttempt).toBe(1);
  vi.advanceTimersByTime(10000);
  expect(controller.getSnapshot().retry).toBe("paused");
  controller.resumeRetries();
  vi.advanceTimersByTime(1999);
  expect(controller.getSnapshot().retry).toBe("waiting");
  vi.advanceTimersByTime(1);
  expect(controller.getSnapshot().retry).toBe("ready");
  controller.close();
});

it("lifecycle suspension fences the sole opening and preserves its consumed bound", () => {
  vi.useFakeTimers();
  const { source, controller, terminal } = setup();
  source.emit("snapshot", { state: "generating", content: "first" });
  source.loss();
  expect(controller.tryNow()).toBe(true);
  const replacement = new FakeSource();
  expect(controller.reopen("response_1", terminal, () => replacement)).toBe(
    true,
  );
  controller.suspend();
  expect(
    replacement.closed &&
      controller.getSnapshot().retry === "opening" &&
      controller.getSnapshot().content === "" &&
      controller.getSnapshot().retryAttempt === 1,
  ).toBe(true);
  vi.advanceTimersByTime(10000);
  expect(controller.getSnapshot().retry).toBe("opening");
  controller.stopWaiting();
  controller.resumeRetries();
  expect(controller.tryNow()).toBe(true);
  expect(controller.getSnapshot().retryAttempt).toBe(2);
  controller.close();
});
