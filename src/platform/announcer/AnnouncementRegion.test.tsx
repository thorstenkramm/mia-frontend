import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLayoutEffect, useState } from "react";
import { describe, expect, it } from "vitest";
import { AnnouncementProvider, useAnnouncer } from "./AnnouncementRegion";

function OwnedAnnouncement({
  label,
  message,
  priority = "polite",
}: {
  readonly label: string;
  readonly message: string;
  readonly priority?: "auth" | "urgent" | "polite";
}) {
  const { announce } = useAnnouncer();
  return (
    <button type="button" onClick={() => announce(message, priority)}>
      {label}
    </button>
  );
}

function ArbitrationTrigger() {
  const { announce } = useAnnouncer();
  return (
    <>
      <button
        type="button"
        onClick={() => {
          announce("Urgent failure", "urgent");
          announce("Later polite transition", "polite");
        }}
      >
        Compete
      </button>
      <button
        type="button"
        onClick={() => {
          announce("Urgent failure", "urgent");
          announce("Authentication changed", "auth");
          announce("Later polite transition", "polite");
        }}
      >
        Compete with auth
      </button>
    </>
  );
}

function OwnerLifecycleHarness() {
  const [showFirst, setShowFirst] = useState(true);
  const [showSecond, setShowSecond] = useState(true);
  return (
    <>
      {showFirst ? (
        <OwnedAnnouncement
          label="Announce first"
          message="First owner"
          priority="urgent"
        />
      ) : null}
      {showSecond ? (
        <OwnedAnnouncement label="Announce second" message="Second owner" />
      ) : null}
      <button type="button" onClick={() => setShowFirst(false)}>
        Remove first
      </button>
      <button type="button" onClick={() => setShowSecond(false)}>
        Remove second
      </button>
    </>
  );
}

type Announce = (
  message: string,
  priority?: "auth" | "urgent" | "polite",
) => void;

function CapturedOwner({
  capture,
}: {
  readonly capture: (value: Announce) => void;
}) {
  const { announce } = useAnnouncer();
  useLayoutEffect(() => capture(announce), [announce, capture]);
  return null;
}

function RetiredOwnerHarness({
  capture,
  showRetiredOwner,
}: {
  readonly capture: (value: Announce) => void;
  readonly showRetiredOwner: boolean;
}) {
  return (
    <>
      {showRetiredOwner ? (
        <CapturedOwner key="retired" capture={capture} />
      ) : null}
      <OwnedAnnouncement
        key="current"
        label="Announce current"
        message="Current owner"
      />
    </>
  );
}

function liveRegion(priority: "polite" | "assertive"): HTMLElement {
  const region = Array.from(
    document.querySelectorAll<HTMLElement>("[aria-live]"),
  ).find((candidate) => candidate.getAttribute("aria-live") === priority);
  if (region === undefined) throw new Error(`Missing ${priority} live region.`);
  return region;
}

describe("announcement ownership and arbitration", () => {
  it("prioritizes an urgent event over a competing later polite event", async () => {
    const user = userEvent.setup();
    render(
      <AnnouncementProvider>
        <ArbitrationTrigger />
      </AnnouncementProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Compete" }));

    await waitFor(() =>
      expect(liveRegion("assertive")).toHaveTextContent("Urgent failure"),
    );
    expect(liveRegion("polite")).toBeEmptyDOMElement();
    expect(document.body).not.toHaveTextContent("Later polite transition");
  });

  it("prioritizes authentication loss over urgent and polite events", async () => {
    const user = userEvent.setup();
    render(
      <AnnouncementProvider>
        <ArbitrationTrigger />
      </AnnouncementProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Compete with auth" }));

    await waitFor(() =>
      expect(liveRegion("assertive")).toHaveTextContent(
        "Authentication changed",
      ),
    );
    expect(liveRegion("polite")).toBeEmptyDOMElement();
    expect(document.body).not.toHaveTextContent("Urgent failure");
    expect(document.body).not.toHaveTextContent("Later polite transition");
  });

  it("clears only the unmounted owner's message", async () => {
    const user = userEvent.setup();
    render(
      <AnnouncementProvider>
        <OwnerLifecycleHarness />
      </AnnouncementProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Announce first" }));
    await waitFor(() =>
      expect(liveRegion("assertive")).toHaveTextContent("First owner"),
    );
    await user.click(screen.getByRole("button", { name: "Announce second" }));
    await waitFor(() =>
      expect(liveRegion("polite")).toHaveTextContent("Second owner"),
    );

    await user.click(screen.getByRole("button", { name: "Remove first" }));
    expect(liveRegion("polite")).toHaveTextContent("Second owner");
    await user.click(screen.getByRole("button", { name: "Remove second" }));
    expect(liveRegion("polite")).toBeEmptyDOMElement();
  });

  it("rejects a retained announcement callback after its owner unmounts", async () => {
    const user = userEvent.setup();
    let retiredAnnounce: Announce | undefined;
    const capture = (announce: Announce) => {
      retiredAnnounce = announce;
    };
    const view = render(
      <AnnouncementProvider>
        <RetiredOwnerHarness capture={capture} showRetiredOwner />
      </AnnouncementProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Announce current" }));
    await waitFor(() =>
      expect(liveRegion("polite")).toHaveTextContent("Current owner"),
    );

    view.rerender(
      <AnnouncementProvider>
        <RetiredOwnerHarness capture={capture} showRetiredOwner={false} />
      </AnnouncementProvider>,
    );
    if (retiredAnnounce === undefined)
      throw new Error("Expected the retired owner's announcement callback.");
    retiredAnnounce("Late retired feedback", "urgent");

    await waitFor(() =>
      expect(liveRegion("polite")).toHaveTextContent("Current owner"),
    );
    expect(liveRegion("assertive")).toBeEmptyDOMElement();
    expect(document.body).not.toHaveTextContent("Late retired feedback");
  });
});
