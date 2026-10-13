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
