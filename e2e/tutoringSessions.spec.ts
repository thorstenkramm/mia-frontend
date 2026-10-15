import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { tutoringBackend } from "./tutoringFixtures";
import { atBrowserZoom, protectedJourney } from "./routeFixtures";
import {
  routeHygieneCheckpoint,
  routeSecretFixture,
} from "./routeSecretHygiene";

test.use({ trace: "off", video: "off", screenshot: "off" });
const start = "/learn/start",
  material = `${start}/course_1/material`,
  intent = `${start}/course_1/intent`,
  recovery = "/learn/session",
  workspace = "/learn/sessions/session_1";
const finishPath = `${workspace}/finish`;
const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const unknownHeading =
  "The start outcome is unknown. The session may have been created. Reconcile checks the current state; this attempt is never repeated automatically.";
const unknownSendHeading =
  "The message outcome is unknown. The message may have been sent. Reconcile checks the current state; this attempt is never repeated automatically.";
async function ready(page: Page, title: string) {
  await expect
    .poll(async () => (await page.title()) === `${title} | MIA`)
    .toBe(true);
  await expect
    .poll(async () =>
      page.locator("h1").evaluate((node) => document.activeElement === node),
    )
    .toBe(true);
  expect(
    (await page.locator("main").count()) === 1 &&
      (await page.locator("h1").count()) === 1,
  ).toBe(true);
}
// The 6.2 start chain: the material choice hands one opaque selection to the
// intent route, where the composed free text starts the session.
async function composeIntent(page: Page, content: string) {
  await page.getByLabel("Your message to the tutor").fill(content);
  await page.getByRole("button", { name: "Start session" }).click();
}
async function minimized(page: Page) {
  const fixture = routeSecretFixture(page);
  expect(
    await page.evaluate(
      async (markers) => {
        const exposed = [
          document.body.innerHTML,
          document.title,
          location.href,
          JSON.stringify(history.state),
          JSON.stringify(Object.entries(localStorage)),
          JSON.stringify(Object.entries(sessionStorage)),
          JSON.stringify("caches" in window ? await caches.keys() : []),
        ].join();
        return markers.every((marker) => !exposed.includes(marker));
      },
      [fixture.rawError],
    ),
  ).toBe(true);
  const tree = await page.locator("main").ariaSnapshot();
  expect(!tree.includes(fixture.rawError)).toBe(true);
}
async function noScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

// A browser-local controllable EventSource. No provider/network SSE and no
// protected content in test names, traces, screenshots or console output.
declare global {
  interface Window {
    __miaTutorSse?: {
      send: (name: string, payload: unknown) => void;
      fail: () => void;
      closed: () => boolean;
      count: () => number;
    };
  }
}
async function controllableStream(page: Page) {
  await page.addInitScript(() => {
    const sources: FixtureSource[] = [];
    class FixtureSource extends EventTarget {
      onerror: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      closed = false;
      constructor(url: string) {
        super();
        if (!url.startsWith("/api/v1/tutor-responses/"))
          throw new Error("Unexpected stream endpoint.");
        sources.push(this);
      }
      close() {
        this.closed = true;
      }
    }
    Object.defineProperty(window, "EventSource", { value: FixtureSource });
    window.__miaTutorSse = {
      send(name, payload) {
        sources
          .at(-1)
          ?.dispatchEvent(
            new MessageEvent(name, { data: JSON.stringify(payload) }),
          );
      },
      fail() {
        sources.at(-1)?.onerror?.(new Event("error"));
      },
      closed: () => sources.at(-1)?.closed ?? false,
      count: () => sources.length,
    };
  });
}
async function emitStream(page: Page, name: string, payload: unknown) {
  await page.evaluate(
    ({ name, payload }) => window.__miaTutorSse?.send(name, payload),
    { name, payload },
  );
}

const currentAttempt = '[aria-labelledby="tutoring-current-work-response_gen"]';
test(
  "tutoring lifecycle return keeps a page-local draft and reconnects only after explicit Try now",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    await controllableStream(page);
    control.activeSession = true;
    control.workState = "generating";
    control.workGenerating = true;
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect
      .poll(() => page.evaluate(() => window.__miaTutorSse?.count()))
      .toBe(1);
    await emitStream(page, "snapshot", {
      state: "generating",
      content: fixture.teachingText,
    });
    await page
      .getByLabel("Your message to the tutor")
      .fill("synthetic unsent draft");
    const reads = control.workReads;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(
      page.getByRole("button", { name: "Refresh", exact: true }),
    ).toBeVisible();
    expect(
      control.workReads === reads &&
        (await page.evaluate(() => window.__miaTutorSse?.closed())),
    ).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-lifecycle");
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await ready(page, "Tutoring session");
    expect(
      (await page.getByLabel("Your message to the tutor").inputValue()) ===
        "synthetic unsent draft",
    ).toBe(true);
    expect(
      control.workReads > reads &&
        (await page.evaluate(() => window.__miaTutorSse?.count())) === 1,
    ).toBe(true);
    await page.getByRole("button", { name: "Try now" }).click();
    await expect
      .poll(() => page.evaluate(() => window.__miaTutorSse?.count()))
      .toBe(2);
    await page.getByRole("button", { name: "Stop waiting" }).click();
    await expect
      .poll(() => page.evaluate(() => window.__miaTutorSse?.closed()))
      .toBe(true);
    await page.getByRole("button", { name: "Resume retries" }).click();
    expect(await page.evaluate(() => window.__miaTutorSse?.count())).toBe(2);
    await page.getByRole("button", { name: "Try now" }).click();
    await expect
      .poll(() => page.evaluate(() => window.__miaTutorSse?.count()))
      .toBe(3);
    await emitStream(page, "snapshot", {
      state: "generating",
      content: "fresh",
    });
    await expect(page.locator(currentAttempt)).toContainText("fresh");
    expect(
      (await page.locator(currentAttempt).textContent())?.includes(
        fixture.teachingText,
      ),
    ).toBe(false);
    await minimized(page);
  }),
);
test(
  "tutoring addressed denial destroys retained draft while a failed check keeps it covered",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    await controllableStream(page);
    control.activeSession = true;
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await page
      .getByLabel("Your message to the tutor")
      .fill(fixture.teachingText);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(
      page.getByRole("button", { name: "Refresh", exact: true }),
    ).toBeVisible();
    control.denySession = 503;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(
      page.getByText(
        "The tutoring check could not be completed. This is not an empty result.",
      ),
    ).toBeVisible();
    control.denySession = 0;
    await page.getByRole("button", { name: "Check again" }).click();
    await ready(page, "Tutoring session");
    expect(
      (await page.getByLabel("Your message to the tutor").inputValue()) ===
        fixture.teachingText,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-resource-recoverable");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(
      page.getByRole("button", { name: "Refresh", exact: true }),
    ).toBeVisible();
    control.denySession = 404;
    const workReads = control.workReads;
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await ready(page, "Tutoring access unavailable");
    expect(
      control.workReads === workReads &&
        !(await page.locator("main").textContent())?.includes(
          fixture.teachingText,
        ),
    ).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-resource-denied");
  }),
);
test(
  "tutoring Stop accepts only definitive interrupted truth and keeps the targeted article",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    await controllableStream(page);
    control.activeSession = true;
    control.workState = "generating";
    control.workGenerating = true;
    control.workQueued = true;
    control.workState = "generating_and_queued";
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect(
      page.getByRole("button", {
        name: "Stop response · Response queued · Attempt 1",
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Stop response · Response in progress · Attempt 1",
      })
      .click();
    await expect.poll(() => control.stopPosts).toBe(1);
    await expect(page.locator(currentAttempt)).toContainText(
      "Response interrupted",
    );
    expect(control.forbidden).toBe(0);
    await routeHygieneCheckpoint(page, "tutoring-stop");
  }),
);

test(
  "tutoring Stop conflict requires an explicit fresh reconciliation",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    await controllableStream(page);
    control.activeSession = true;
    control.workState = "generating";
    control.workGenerating = true;
    control.stopOutcome = "conflict";
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await page.getByRole("button", { name: "Stop response" }).click();
    await expect(
      page
        .locator("main p")
        .getByText("The response action was not accepted. Check current work."),
    ).toBeVisible();
    expect(control.stopPosts).toBe(1);
    control.workGenerating = false;
    control.workState = "idle";
    control.terminalContent = routeSecretFixture(page).teachingText;
    await page
      .getByRole("button", { name: "Refresh", exact: true })
      .first()
      .click();
    await expect
      .poll(async () =>
        (await page.locator(currentAttempt).textContent())?.includes(
          routeSecretFixture(page).teachingText,
        ),
      )
      .toBe(true);
    await expect(page.locator(currentAttempt)).not.toContainText(
      "Response in progress",
    );
    expect(control.stopPosts).toBe(1);
    await routeHygieneCheckpoint(page, "tutoring-stop-conflict");
  }),
);

test(
  "tutoring lost Stop stays unknown until targeted current work proves outcome",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    await controllableStream(page);
    control.activeSession = true;
    control.workState = "generating";
    control.workGenerating = true;
    control.stopOutcome = "lose";
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await page.getByRole("button", { name: "Stop response" }).click();
    await expect(
      page
        .locator("main p")
        .getByText(
          "Stop outcome unknown. Check the saved response before acting again.",
        ),
    ).toBeVisible();
    expect(control.stopPosts).toBe(1);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(
      page.getByRole("button", { name: "Refresh", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await ready(page, "Tutoring session");
    await expect(
      page
        .locator("main p")
        .getByText(
          "Stop outcome unknown. Check the saved response before acting again.",
        ),
    ).toBeVisible();
    expect(control.stopPosts).toBe(1);
    await page
      .getByRole("button", { name: "Refresh", exact: true })
      .first()
      .click();
    await expect(page.locator(currentAttempt)).toContainText(
      "Response interrupted",
    );
    expect(control.stopPosts).toBe(1);
    await routeHygieneCheckpoint(page, "tutoring-stop-loss");
  }),
);

for (const outcome of ["created", "replay", "conflict", "lose"] as const) {
  test(
    `tutoring explicit linked retry ${outcome} preserves the earlier attempt without automatic POST replay`,
    protectedJourney(async (page) => {
      const control = await tutoringBackend(page);
      await controllableStream(page);
      control.activeSession = true;
      control.stopped = true;
      control.retryOutcome = outcome;
      if (outcome === "created") control.failRetryFollowUp = true;
      if (outcome === "replay") control.retryTerminalBeforeFollowUp = true;
      await page.goto(workspace);
      await ready(page, "Tutoring session");
      await page
        .getByRole("button", { name: "Retry exact attempt", exact: true })
        .click();
      await expect.poll(() => control.retryPosts).toBe(1);
      if (outcome === "created" || outcome === "replay") {
        await expect(
          page.locator(
            '[aria-labelledby="tutoring-current-work-response_retry"]',
          ),
        ).toBeVisible();
        await expect(page.locator(currentAttempt)).toContainText(
          "Response interrupted",
        );
        if (outcome === "created") {
          await expect(
            page
              .locator("main p")
              .getByText(
                "The tutoring check could not be completed. This is not an empty result.",
              ),
          ).toBeVisible();
          await expect(
            page.getByRole("button", { name: "Send", exact: true }),
          ).toBeDisabled();
          await page
            .getByRole("button", { name: "Refresh", exact: true })
            .first()
            .click();
          await expect(
            page
              .locator("main p")
              .getByText(
                "The tutoring check could not be completed. This is not an empty result.",
              ),
          ).toHaveCount(0);
          expect(control.retryPosts).toBe(1);
        }
        if (outcome === "replay") {
          await expect(
            page.locator(
              '[aria-labelledby="tutoring-current-work-response_retry"]',
            ),
          ).not.toContainText("Response queued");
          expect(
            (
              await page
                .locator(
                  '[aria-labelledby="tutoring-current-work-response_retry"]',
                )
                .textContent()
            )?.includes(routeSecretFixture(page).teachingText),
          ).toBe(true);
        }
      } else if (outcome === "conflict") {
        await expect(
          page
            .locator("main p")
            .getByText(
              "The response action was not accepted. Check current work.",
            ),
        ).toBeVisible();
      } else {
        await expect(
          page
            .locator("main p")
            .getByText(
              "Retry outcome unknown. Check current work; only an explicit exact re-retry sends again.",
            ),
        ).toBeVisible();
        const unknownPosts = control.retryPosts;
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await expect(
          page.getByRole("button", { name: "Refresh", exact: true }),
        ).toBeVisible();
        expect(control.retryPosts).toBe(unknownPosts);
        await page
          .getByRole("button", { name: "Refresh", exact: true })
          .click();
        await ready(page, "Tutoring session");
        await expect(
          page
            .locator("main p")
            .getByText(
              "Retry outcome unknown. Check current work; only an explicit exact re-retry sends again.",
            ),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Refresh", exact: true })
          .first()
          .click();
        await expect(
          page
            .locator("main p")
            .getByText(
              "Retry outcome unknown. Check current work; only an explicit exact re-retry sends again.",
            ),
        ).toBeVisible();
        expect(control.retryPosts).toBe(1);
        control.retryOutcome = "replay";
        await page
          .getByRole("button", { name: "Retry exact attempt", exact: true })
          .click();
        await expect.poll(() => control.retryPosts).toBe(2);
        expect(
          control.retryRequestIds[0] === control.retryRequestIds[1] &&
            requestIdPattern.test(control.retryRequestIds[0] ?? ""),
        ).toBe(true);
      }
      expect(control.forbidden).toBe(0);
      await routeHygieneCheckpoint(page, `tutoring-retry-${outcome}`);
    }),
  );
}
test(
  "tutoring two tabs reconcile stale Stop without retrying the destructive request",
  protectedJourney(async (page) => {
    const first = await tutoringBackend(page);
    await controllableStream(page);
    first.activeSession = true;
    first.workState = "generating";
    first.workGenerating = true;
    const secondPage = await page.context().newPage();
    try {
      const second = await tutoringBackend(secondPage);
      await controllableStream(secondPage);
      second.activeSession = true;
      second.workState = "generating";
      second.workGenerating = true;
      await page.goto(workspace);
      await secondPage.goto(workspace);
      await ready(page, "Tutoring session");
      await ready(secondPage, "Tutoring session");
      await page.getByRole("button", { name: "Stop response" }).click();
      await expect(page.locator(currentAttempt)).toContainText(
        "Response interrupted",
      );
      second.stopOutcome = "conflict";
      await secondPage.getByRole("button", { name: "Stop response" }).click();
      await expect(
        secondPage
          .locator("main p")
          .getByText(
            "The response action was not accepted. Check current work.",
          ),
      ).toBeVisible();
      second.stopped = true;
      second.workGenerating = false;
      second.workState = "idle";
      await secondPage
        .getByRole("button", { name: "Refresh", exact: true })
        .first()
        .click();
      await expect(secondPage.locator(currentAttempt)).toContainText(
        "Response interrupted",
      );
      expect(
        first.stopPosts === 1 &&
          second.stopPosts === 1 &&
          second.forbidden === 0,
      ).toBe(true);
      // Both tabs now see retry eligibility. The first tab receives a linked
      // response; the second receives the server's stale-work conflict. No
      // client replays either request or infers which tab owns the outcome.
      await page.getByRole("button", { name: "Retry exact attempt" }).click();
      await expect.poll(() => first.retryPosts).toBe(1);
      await expect(
        page.locator(
          '[aria-labelledby="tutoring-current-work-response_retry"]',
        ),
      ).toBeVisible();
      second.retryOutcome = "conflict";
      await secondPage
        .getByRole("button", { name: "Retry exact attempt" })
        .click();
      await expect(
        secondPage
          .locator("main p")
          .getByText(
            "The response action was not accepted. Check current work.",
          ),
      ).toBeVisible();
      second.retryCommitted = true;
      await secondPage
        .getByRole("button", { name: "Refresh", exact: true })
        .first()
        .click();
      await expect(
        secondPage.locator(
          '[aria-labelledby="tutoring-current-work-response_retry"]',
        ),
      ).toBeVisible();
      expect(
        first.retryPosts === 1 &&
          second.retryPosts === 1 &&
          second.forbidden === 0,
      ).toBe(true);
    } finally {
      await secondPage.close();
    }
    await routeHygieneCheckpoint(page, "tutoring-two-tab");
  }),
);
test(
  "tutoring queued Stop fences an older terminal work read without losing its targeted article",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    await controllableStream(page);
    control.activeSession = true;
    control.workState = "generating_and_queued";
    control.workGenerating = true;
    control.workQueued = true;
    const terminalContent = `${fixture.teachingText} persisted terminal`;
    control.terminalContent = terminalContent;
    control.snapshotTerminalBeforeHold = true;
    let release = () => {};
    control.holdTerminal = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await page.goto(workspace);
      await ready(page, "Tutoring session");
      await expect
        .poll(() => page.evaluate(() => window.__miaTutorSse?.count()))
        .toBe(1);
      await emitStream(page, "snapshot", {
        state: "generating",
        content: fixture.teachingText,
      });
      await emitStream(page, "completed", { state: "completed" });
      await expect
        .poll(() => control.responseQueries.includes("response_gen"))
        .toBe(true);
      await page
        .getByRole("button", {
          name: "Stop response · Response queued · Attempt 1",
        })
        .click();
      await expect(
        page.locator('[aria-labelledby="tutoring-current-work-response_q"]'),
      ).toContainText("Response interrupted");
      expect(control.stopPosts).toBe(1);
      expect(
        (
          await page
            .locator('[aria-labelledby="tutoring-current-work-response_gen"]')
            .allTextContents()
        ).some((text) => text.includes(terminalContent)),
      ).toBe(false);
      release();
      await expect.poll(() => control.workReads).toBeGreaterThanOrEqual(2);
      await expect
        .poll(
          async () =>
            (
              await page
                .locator(
                  '[aria-labelledby="tutoring-current-work-response_gen"]',
                )
                .textContent()
            )?.includes(terminalContent) === true,
        )
        .toBe(true);
      await expect(
        page.locator('[aria-labelledby="tutoring-current-work-response_gen"]'),
      ).not.toContainText("Response in progress");
      await expect(
        page.locator('[aria-labelledby="tutoring-current-work-response_q"]'),
      ).toContainText("Response interrupted");
      await expect(
        page.getByRole("button", {
          name: "Stop response · Response queued · Attempt 1",
        }),
      ).toHaveCount(0);
      await routeHygieneCheckpoint(page, "tutoring-stop-terminal-race");
    } finally {
      release();
    }
  }),
);
async function liveText(page: Page) {
  return (await page.locator("[aria-live]").allTextContents()).join(" ");
}

test(
  "tutoring initial generating snapshots stay silent; queued to generating speaks only once",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    await controllableStream(page);
    control.activeSession = true;
    control.workGenerating = true;
    control.workState = "generating";
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect
      .poll(() => page.evaluate(() => window.__miaTutorSse?.count()))
      .toBe(1);
    await emitStream(page, "snapshot", {
      state: "generating",
      content: `${fixture.teachingText} updated`,
    });
    await emitStream(page, "snapshot", {
      state: "generating",
      content: `${fixture.teachingText} updated`,
    });
    await expect(page.locator(currentAttempt)).toContainText("updated");
    expect((await liveText(page)).includes("Response in progress")).toBe(false);
    expect(control.streamReads === 0 && control.forbidden === 0).toBe(true);
  }),
);

test(
  "tutoring queued to generating transition speaks once without speaking deltas",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    await controllableStream(page);
    control.activeSession = true;
    control.workState = "queued";
    control.workQueued = true;
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect
      .poll(() => page.evaluate(() => window.__miaTutorSse?.count()))
      .toBe(1);
    await emitStream(page, "snapshot", { state: "queued" });
    await emitStream(page, "started", { state: "generating" });
    await expect.poll(() => liveText(page)).toContain("Response in progress");
    await emitStream(page, "delta", { text: "one" });
    await emitStream(page, "snapshot", { state: "generating", content: "one" });
    expect((await liveText(page)).match(/Response in progress/gu)?.length).toBe(
      1,
    );
    expect(control.streamReads === 0 && control.forbidden === 0).toBe(true);
  }),
);

test(
  "tutoring reader away preserves earlier focus selection and scroll until unseen action is activated",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    await controllableStream(page);
    control.activeSession = true;
    control.workState = "generating";
    control.workGenerating = true;
    control.longTurn = true;
    await page.setViewportSize({ width: 950, height: 320 });
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect
      .poll(() => page.evaluate(() => window.__miaTutorSse?.count()))
      .toBe(1);
    await emitStream(page, "snapshot", {
      state: "generating",
      content: fixture.teachingText,
    });
    const previous = page.locator("main article").first().locator("p").first();
    const node = await previous.elementHandle();
    if (node === null) throw new Error("Earlier transcript node missing.");
    await previous.evaluate((element) => {
      if (!(element instanceof HTMLElement) || element.firstChild === null)
        return;
      element.tabIndex = -1;
      element.focus({ preventScroll: true });
      const range = document.createRange();
      range.setStart(element.firstChild, 0);
      range.setEnd(element.firstChild, 2);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      window.scrollTo(0, 0);
    });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await emitStream(page, "delta", { text: " additional tutor content" });
    await expect(
      page.getByRole("button", { name: "New tutor content" }),
    ).toBeVisible();
    expect(
      await node.evaluate((element) => {
        const selection = window.getSelection();
        return (
          element.isConnected &&
          document.activeElement === element &&
          selection?.anchorNode === element.firstChild &&
          selection.toString().length === 2 &&
          window.scrollY === 0
        );
      }),
    ).toBe(true);
    await page.getByRole("button", { name: "New tutor content" }).click();
    await expect(
      page.getByRole("button", { name: "New tutor content" }),
    ).toHaveCount(0);
    expect(
      await page
        .locator("#tutoring-current-work-response_gen")
        .evaluate((element) => document.activeElement === element),
    ).toBe(true);
    await noScroll(page);
  }),
);

test(
  "tutoring pause buffers transport loss without changing transcript or live region until Resume",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    await controllableStream(page);
    control.activeSession = true;
    control.workState = "generating";
    control.workGenerating = true;
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect
      .poll(() => page.evaluate(() => window.__miaTutorSse?.count()))
      .toBe(1);
    await emitStream(page, "snapshot", {
      state: "generating",
      content: fixture.teachingText,
    });
    await page
      .getByRole("button", { name: "Pause transcript updates" })
      .click();
    const frozen = await page
      .locator(currentAttempt)
      .evaluate((element) => element.outerHTML);
    await emitStream(page, "delta", { text: " buffered" });
    await page.evaluate(() => window.__miaTutorSse?.fail());
    await expect
      .poll(() => page.evaluate(() => window.__miaTutorSse?.closed()))
      .toBe(true);
    await page.waitForTimeout(150);
    expect(
      await page
        .locator(currentAttempt)
        .evaluate((element, before) => element.outerHTML === before, frozen),
    ).toBe(true);
    expect((await liveText(page)).includes("Connection lost.")).toBe(false);
    expect(await page.evaluate(() => window.__miaTutorSse?.count())).toBe(1);
    await page
      .getByRole("button", { name: "Resume transcript updates" })
      .click();
    await expect(
      page.getByRole("button", { name: "Refresh", exact: true }),
    ).toBeVisible();
    await expect(page.locator(currentAttempt)).toHaveCount(0);
    expect(control.streamReads === 0 && control.forbidden === 0).toBe(true);
  }),
);

test(
  "tutoring terminal remains unconfirmed and silent until persisted targeted truth arrives",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    await controllableStream(page);
    control.activeSession = true;
    control.workGenerating = true;
    control.workState = "generating";
    control.terminalContent = `**${fixture.teachingText}**`;
    let release = () => {};
    control.holdTerminal = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect
      .poll(() => page.evaluate(() => window.__miaTutorSse?.count()))
      .toBe(1);
    await emitStream(page, "snapshot", {
      state: "generating",
      content: fixture.teachingText,
    });
    await emitStream(page, "completed", { state: "completed" });
    await expect
      .poll(
        () =>
          control.responseQueries.filter((id) => id === "response_gen").length,
      )
      .toBe(1);
    await expect(page.locator(currentAttempt)).toContainText(
      "Checking saved response",
    );
    await expect(
      page.locator("#tutoring-current-work-response_gen"),
    ).toContainText("Response in progress");
    expect((await liveText(page)).includes("Tutor response complete.")).toBe(
      false,
    );
    expect(await page.evaluate(() => window.__miaTutorSse?.closed())).toBe(
      true,
    );
    release();
    await expect
      .poll(() => liveText(page))
      .toContain("Tutor response complete.");
    await expect(
      page.locator("#tutoring-current-work-response_gen"),
    ).not.toContainText("Response in progress");
    await emitStream(page, "completed", { state: "completed" });
    expect(
      (await liveText(page)).match(/Tutor response complete\./gu)?.length,
    ).toBe(1);
    expect(
      control.responseQueries.filter((id) => id === "response_gen").length,
    ).toBe(1);
  }),
);

test(
  "tutoring failed terminal read never claims completion",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    await controllableStream(page);
    control.activeSession = true;
    control.workGenerating = true;
    control.workState = "generating";
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect
      .poll(() => page.evaluate(() => window.__miaTutorSse?.count()))
      .toBe(1);
    const reads = control.workReads;
    await emitStream(page, "snapshot", { state: "generating" });
    await emitStream(page, "completed", { state: "completed" });
    await expect.poll(() => control.workReads).toBe(reads + 1);
    await expect(page.locator(currentAttempt)).toContainText(
      "Saved response unconfirmed.",
    );
    await expect(
      page.locator("#tutoring-current-work-response_gen"),
    ).toContainText("Response in progress");
    expect((await liveText(page)).includes("Tutor response complete.")).toBe(
      false,
    );
    expect(control.streamReads === 0 && control.forbidden === 0).toBe(true);
  }),
);

test(
  "tutoring persisted outcome overrides a differing SSE terminal claim",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    await controllableStream(page);
    control.activeSession = true;
    control.workGenerating = true;
    control.workState = "generating";
    control.terminalState = "failed";
    control.terminalContent = "";
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect
      .poll(() => page.evaluate(() => window.__miaTutorSse?.count()))
      .toBe(1);
    await emitStream(page, "snapshot", { state: "generating" });
    await emitStream(page, "completed", { state: "completed" });
    await expect
      .poll(
        () =>
          control.responseQueries.filter((id) => id === "response_gen").length,
      )
      .toBe(1);
    await expect(
      page.locator("#tutoring-current-work-response_gen"),
    ).toContainText("Response failed");
    await expect.poll(() => liveText(page)).toContain("Response failed");
    expect((await liveText(page)).includes("Tutor response complete.")).toBe(
      false,
    );
    expect(control.forbidden === 0).toBe(true);
  }),
);

test(
  "tutoring native stream reconciles its terminal response without reopening or speaking content",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    control.activeSession = true;
    control.workState = "generating";
    control.workGenerating = true;
    control.streamEvents = [
      {
        name: "snapshot",
        data: { state: "generating", content: fixture.teachingText },
      },
      { name: "delta", data: { text: " in progress" } },
      { name: "completed", data: { state: "completed" } },
    ];
    control.terminalContent = `**${fixture.teachingText}**`;
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect
      .poll(
        () =>
          control.responseQueries.filter((id) => id === "response_gen").length,
      )
      .toBe(1);
    await expect
      .poll(async () =>
        page
          .locator(
            '[aria-labelledby="tutoring-current-work-response_gen"] strong',
          )
          .count(),
      )
      .toBe(1);
    expect(control.streamReads === 1 && control.forbidden === 0).toBe(true);
    await expect(
      page.getByRole("button", { name: "View final response" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "View final response" }).click();
    expect(
      await page
        .locator("#tutoring-current-work-response_gen")
        .evaluate((element) => document.activeElement === element),
    ).toBe(true);
    await noScroll(page);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(axe.violations.length === 0).toBe(true);
  }),
);

test(
  "tutoring transport loss closes the stream once and retains focus without automatic recovery",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    control.activeSession = true;
    control.workState = "generating";
    control.workGenerating = true;
    await page.goto(workspace);
    // 6.4: transport loss only marks revalidation needed — the neutral
    // privacy cover replaces the workspace without any automatic request.
    // Wait for the settled cover; racing the brief workspace mount made this
    // probe flaky.
    const cover = page.getByRole("heading", {
      level: 1,
      name: "Content hidden",
    });
    await expect(cover).toBeVisible();
    await expect(cover).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Refresh", exact: true }),
    ).toBeVisible();
    await expect(page.locator(currentAttempt)).toHaveCount(0);
    await page.waitForTimeout(200);
    expect(
      control.streamReads === 1 &&
        control.responseQueries.every((id) => id === null) &&
        control.forbidden === 0,
    ).toBe(true);
    await noScroll(page);
  }),
);

test(
  "tutoring start chooses course and material once and reload resumes through recovery",
  protectedJourney(async (page) => {
    await controllableStream(page);
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    await page.goto(start);
    await ready(page, "Start a tutoring session");
    // BCG-002: discovery precedes the course list; no start before it.
    expect(
      control.discoveryReads === 1 &&
        control.starts === 0 &&
        control.forbidden === 0,
    ).toBe(true);
    await page.locator(`main a[href="${material}"]`).first().click();
    await ready(page, "Choose material");
    const radios = page.locator("main input[type=radio]");
    await expect(radios).toHaveCount(2);
    await expect(radios.first()).toBeChecked();
    await radios.nth(1).check();
    await page.getByRole("link", { name: "Continue" }).click();
    await ready(page, "Choose how to begin");
    await composeIntent(page, fixture.teachingText);
    await ready(page, "Tutoring session");
    // One request-ID-bound creation, then exactly one first message send.
    await expect
      .poll(async () => (await page.locator("main article").count()) === 2)
      .toBe(true);
    expect(
      control.starts === 1 &&
        control.messagePosts === 1 &&
        requestIdPattern.test(control.requestIds[0] ?? "") &&
        requestIdPattern.test(control.messageRequestIds[0] ?? "") &&
        control.requestIds[0] !== control.messageRequestIds[0] &&
        control.materialsSent.join() === "material_1" &&
        control.forbidden === 0,
    ).toBe(true);
    // The persistent FFR-613 notice and the escaped persisted transcript.
    expect(
      (await page.locator("main").textContent())?.includes(
        "MIA's tutor is AI-powered.",
      ) === true,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-content");
    // Reload reconstructs the workspace from authoritative reads only.
    await page.reload();
    await ready(page, "Tutoring session");
    await expect
      .poll(
        () =>
          control.sessionReads === 2 &&
          control.workReads === 2 &&
          control.turnReads === 2,
      )
      .toBe(true);
    // The created session is active now: the recovery route discovers it and
    // replaces itself with the workspace.
    control.activeSession = true;
    await page.goto(recovery);
    await ready(page, "Tutoring session");
    expect(page.url().endsWith(workspace)).toBe(true);
    await minimized(page);
  }),
);

test(
  "tutoring active-session conflict discovers once and never dispatches a second start",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    control.outcome = "conflict-active";
    await page.goto(intent);
    await ready(page, "Choose how to begin");
    await composeIntent(page, "a first question");
    await expect(
      page.getByRole("link", { name: "Continue session" }),
    ).toBeVisible();
    const discoveries = control.discoveryReads;
    expect(
      control.starts === 1 &&
        control.messagePosts === 0 &&
        page.url().endsWith(intent) &&
        control.forbidden === 0,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-course");
    // The composed draft never dispatched; leaving confirms its discard.
    await page.getByRole("link", { name: "Continue session" }).click();
    await page.getByRole("button", { name: "Discard and leave" }).click();
    await ready(page, "Tutoring session");
    expect(control.starts === 1 && control.discoveryReads === discoveries).toBe(
      true,
    );
    await minimized(page);
  }),
);

test(
  "tutoring lost start response reconciles through discovery and a fresh sign-in rediscovers the session",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    control.outcome = "lose";
    control.createOnPost = true;
    await page.goto(intent);
    await ready(page, "Choose how to begin");
    await composeIntent(page, "a first question");
    await expect(
      page.getByRole("heading", { name: unknownHeading }),
    ).toBeVisible();
    // No replay: the lost start stays the only dispatch until reconciliation.
    expect(
      control.starts === 1 &&
        control.messagePosts === 0 &&
        page.url().endsWith(intent),
    ).toBe(true);
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect(
      page.getByRole("link", { name: "Continue session" }),
    ).toBeVisible();
    expect(control.starts === 1).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-course");
    // A later fresh load (another device) discovers the same session.
    await page.reload();
    await page.goto(recovery);
    await ready(page, "Tutoring session");
    expect(page.url().endsWith(workspace) && control.starts === 1).toBe(true);
    await minimized(page);
  }),
);

test(
  "tutoring reconciled unknown retries only the exact retained request identity",
  protectedJourney(async (page) => {
    await controllableStream(page);
    const control = await tutoringBackend(page);
    control.outcome = "lose";
    await page.goto(intent);
    await ready(page, "Choose how to begin");
    await composeIntent(page, "a first question");
    await expect(
      page.getByRole("heading", { name: unknownHeading }),
    ).toBeVisible();
    expect(control.starts === 1).toBe(true);
    // Reconciliation finds no active session; only then the exact retry exists.
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    const retry = page.getByRole("button", { name: "Retry exact attempt" });
    await expect(retry).toBeVisible();
    control.outcome = "created";
    await retry.click();
    await ready(page, "Tutoring session");
    await expect
      .poll(async () => (await page.locator("main article").count()) === 2)
      .toBe(true);
    expect(
      control.starts === 2 &&
        control.requestIds.length === 2 &&
        control.requestIds[0] === control.requestIds[1] &&
        control.messagePosts === 1 &&
        control.materialsSent.join() === "," &&
        control.forbidden === 0,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-content");
    await minimized(page);
  }),
);

test(
  "tutoring hidden causes share the fixed neutral presentation without start affordances",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    let expected: string | null = null;
    for (const [cause, route] of [
      ["discovery", start],
      ["course", material],
      ["session", workspace],
    ] as const) {
      control.denyDiscovery = cause === "discovery" ? 429 : 0;
      control.denyCourse = cause === "course" ? 404 : 0;
      control.denySession = cause === "session" ? 404 : 0;
      await page.goto(route);
      await ready(page, "Tutoring access unavailable");
      const primary = await page.locator("main").evaluate((node) =>
        JSON.stringify({
          headings: Array.from(node.querySelectorAll("h1,h2")).map(
            (heading) => heading.textContent,
          ),
          copy: Array.from(node.querySelectorAll("p")).map(
            (p) => p.textContent,
          ),
          links: Array.from(node.querySelectorAll("a")).map((a) => [
            a.getAttribute("href"),
            a.textContent,
          ]),
          buttons: Array.from(node.querySelectorAll("button"))
            .filter((button) => button.textContent !== "Technical details")
            .map((button) => button.textContent),
          focus: document.activeElement?.tagName,
          title: document.title,
        }),
      );
      expected ??= primary;
      expect(primary === expected && page.url().endsWith(route)).toBe(true);
    }
    const fixture = routeSecretFixture(page);
    const text = await page.locator("main").textContent();
    expect(
      control.starts === 0 &&
        control.materialReads === 0 &&
        control.turnReads === 0 &&
        control.forbidden === 0 &&
        !text?.includes(fixture.courseName) &&
        !text?.includes(fixture.teachingText) &&
        !text?.includes(fixture.rawError),
    ).toBe(true);
    await routeHygieneCheckpoint(page, "learn-hidden");
  }),
);

test(
  "tutoring completed session renders only persisted read-only turns and can begin another permitted session",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    control.sessionState = "completed";
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect(
      page.getByText("This tutoring session is finished."),
    ).toBeVisible();
    expect(
      control.turnReads === 1 &&
        control.workReads === 0 &&
        control.starts === 0 &&
        (await page.locator("main article").count()) === 1 &&
        (await page.getByLabel("Your message to the tutor").count()) === 0 &&
        (await page.locator(`main a[href="/learn/start"]`).count()) === 1 &&
        (await page.locator(`main a[href="/learn/courses"]`).count()) === 1,
    ).toBe(true);
    await minimized(page);
    await routeHygieneCheckpoint(page, "tutoring-finished");
  }),
);

test(
  "tutoring Finish confirms once after ordered prevalidation then reads persisted transcript without new messages",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await page.getByRole("link", { name: "Finish session" }).click();
    await ready(page, "Finish tutoring session");
    expect(page.url().endsWith(finishPath)).toBe(true);
    await page.getByRole("button", { name: "Review Finish" }).click();
    await expect(
      page.getByRole("button", { name: "Confirm Finish" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Confirm Finish" }).click();
    await ready(page, "Tutoring session");
    await expect(
      page.getByText("This tutoring session is finished."),
    ).toBeVisible();
    expect(
      control.finishPosts === 1 &&
        control.turnReads >= 2 &&
        control.messagePosts === 0 &&
        control.workReads >= 2 &&
        (await page.getByLabel("Your message to the tutor").count()) === 0 &&
        (await page.locator("main article").count()) === 1 &&
        !page.url().includes("/learn/history/"),
    ).toBe(true);
    expect(
      (await page.locator("main").textContent())?.includes(
        fixture.teachingText,
      ),
    ).toBe(true);
    await minimized(page);
    await routeHygieneCheckpoint(page, "tutoring-finish-success");
    await page
      .locator("main")
      .getByRole("link", { name: "Start a tutoring session" })
      .click();
    await ready(page, "Start a tutoring session");
    expect(control.discoveryReads > 0 && control.starts === 0).toBe(true);
  }),
);

test(
  "tutoring dual-capability non-owner completed session denies before transcript GET with the fixed unknown surface",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    control.supervisesCourse = true;
    control.sessionState = "completed";
    control.studentOwner = "another-student";
    await page.goto(workspace);
    await ready(page, "Tutoring access unavailable");
    const surface = async () => ({
      title: await page.title(),
      heading: await page.getByRole("heading", { level: 1 }).textContent(),
      links: await page
        .locator("main a")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
      focus: await page.evaluate(() => document.activeElement?.tagName),
    });
    const nonOwner = await surface();
    expect(
      control.sessionReads === 1 &&
        control.turnReads === 0 &&
        control.workReads === 0 &&
        control.finishPosts === 0 &&
        (await page.locator("main article").count()) === 0,
    ).toBe(true);
    control.studentOwner = "account-id";
    control.denySession = 404;
    await page.reload();
    await ready(page, "Tutoring access unavailable");
    expect(
      JSON.stringify(await surface()) === JSON.stringify(nonOwner) &&
        control.sessionReads === 2 &&
        control.turnReads === 0 &&
        control.workReads === 0,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-finish-owner");
  }),
);

test(
  "tutoring Finish stays unavailable for denied or generating work without a completion POST",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    control.finishEligible = false;
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect(
      page.getByRole("button", { name: "Finish session" }),
    ).toBeDisabled();
    await page.goto(finishPath);
    await ready(page, "Finish tutoring session");
    await expect(
      page.getByRole("button", { name: "Review Finish" }),
    ).toBeDisabled();
    control.finishEligible = undefined;
    control.workState = "generating";
    control.workGenerating = true;
    await page.reload();
    await ready(page, "Finish tutoring session");
    await expect(
      page.getByRole("button", { name: "Review Finish" }),
    ).toBeDisabled();
    expect(control.finishPosts === 0).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-finish-ineligible");
  }),
);

test(
  "tutoring lost Finish response stays unknown until explicit completed-session read without replay",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    control.finishOutcome = "lose";
    control.finishCommitsOnLoss = true;
    await page.goto(finishPath);
    await ready(page, "Finish tutoring session");
    await page.getByRole("button", { name: "Review Finish" }).click();
    await expect(
      page.getByRole("button", { name: "Confirm Finish" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Confirm Finish" }).click();
    await expect(
      page.getByRole("dialog").getByText(/finish outcome is unknown/u),
    ).toBeVisible();
    expect(control.finishPosts === 1 && control.turnReads === 0).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-finish-unknown");
    await page.getByRole("button", { name: "Refresh" }).click();
    await ready(page, "Tutoring session");
    expect(control.finishPosts === 1 && control.turnReads === 1).toBe(true);
    await minimized(page);
  }),
);

test(
  "tutoring Stop waiting on Finish never claims success or replays the late POST",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    let release = () => {};
    control.holdFinish = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await page.goto(finishPath);
      await ready(page, "Finish tutoring session");
      await page.getByRole("button", { name: "Review Finish" }).click();
      await expect(
        page.getByRole("button", { name: "Confirm Finish" }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "Confirm Finish" }).click();
      await expect.poll(() => control.finishPosts).toBe(1);
      await page.getByRole("button", { name: "Stop waiting" }).click();
      await expect(
        page.getByRole("dialog").getByText(/finish outcome is unknown/u),
      ).toBeVisible();
      release();
      await expect(
        page.getByRole("dialog").getByText(/finish outcome is unknown/u),
      ).toBeVisible();
      expect(control.finishPosts === 1 && control.turnReads === 0).toBe(true);
      await routeHygieneCheckpoint(page, "tutoring-finish-stopped");
      await page.getByRole("button", { name: "Refresh" }).click();
      await ready(page, "Tutoring session");
      expect(control.finishPosts === 1 && control.turnReads === 1).toBe(true);
    } finally {
      release();
    }
  }),
);

test(
  "tutoring unknown Finish stays interlocked after workspace return while the first POST is held",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    control.finishOutcome = "lose";
    let release = () => {};
    control.holdFinish = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await page.goto(finishPath);
      await ready(page, "Finish tutoring session");
      await page.getByRole("button", { name: "Review Finish" }).click();
      await expect(
        page.getByRole("button", { name: "Confirm Finish" }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "Confirm Finish" }).click();
      await expect.poll(() => control.finishPosts).toBe(1);
      await page.getByRole("button", { name: "Stop waiting" }).click();
      await page.getByRole("button", { name: "Cancel" }).click();
      await page
        .locator("main")
        .getByRole("link", { name: "Tutoring session" })
        .click();
      await ready(page, "Tutoring session");
      await expect(
        page.getByRole("button", { name: "Finish session" }),
      ).toBeDisabled();
      await expect(
        page
          .locator("main")
          .getByRole("link", { name: "Check Finish outcome" }),
      ).toBeVisible();
      expect(
        control.finishPosts === 1 &&
          control.workReads >= 2 &&
          control.turnReads >= 1,
      ).toBe(true);
      await page
        .locator("main")
        .getByRole("link", { name: "Back to Home" })
        .click();
      expect(new URL(page.url()).pathname === "/").toBe(true);
      await page.goBack();
      await expect(
        page.getByRole("heading", { level: 1, name: "Tutoring session" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Finish session" }),
      ).toBeDisabled();
      expect(control.finishPosts === 1).toBe(true);
      await page
        .locator("main")
        .getByRole("link", { name: "Check Finish outcome" })
        .click();
      await ready(page, "Finish tutoring session");
      await expect(
        page.getByRole("button", { name: "Review Finish" }),
      ).toBeDisabled();
      await page
        .locator("main")
        .getByRole("button", { name: "Refresh" })
        .click();
      await expect(
        page.locator("main").getByText(/finish outcome is unknown/u),
      ).toBeVisible();
      expect(control.finishPosts === 1).toBe(true);
      release();
      await expect(
        page.locator("main").getByText(/finish outcome is unknown/u),
      ).toBeVisible();
      expect(control.finishPosts === 1).toBe(true);
      await routeHygieneCheckpoint(page, "tutoring-finish-return");
    } finally {
      release();
    }
  }),
);

test(
  "tutoring lost uncommitted Finish stays reconcile-only after failed then eligible Refresh",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    control.finishOutcome = "lose";
    await page.goto(finishPath);
    await ready(page, "Finish tutoring session");
    await page.getByRole("button", { name: "Review Finish" }).click();
    await expect(
      page.getByRole("button", { name: "Confirm Finish" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Confirm Finish" }).click();
    await expect(
      page.getByRole("dialog").getByText(/finish outcome is unknown/u),
    ).toBeVisible();
    expect(control.finishPosts === 1).toBe(true);

    control.denySession = 503;
    const failedRead = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname ===
          "/api/v1/tutoring-sessions/session_1" &&
        response.status() === 503,
    );
    await page.getByRole("button", { name: "Refresh" }).click();
    await failedRead;
    await expect(
      page.getByRole("dialog").getByText(/finish outcome is unknown/u),
    ).toBeVisible();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("button", { name: "Technical details" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirm Finish" }),
    ).toBeDisabled();
    expect(control.finishPosts === 1).toBe(true);

    control.denySession = 0;
    const eligibleRead = page.waitForResponse(
      (response) =>
        response.request().method() === "GET" &&
        new URL(response.url()).pathname ===
          "/api/v1/tutoring-sessions/session_1/current-work",
    );
    await page.getByRole("button", { name: "Refresh" }).click();
    await eligibleRead;
    await expect(
      page.getByRole("dialog").getByText(/finish outcome is unknown/u),
    ).toBeVisible();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("button", { name: "Technical details" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Confirm Finish" }),
    ).toBeDisabled();
    expect(control.finishPosts === 1 && control.workReads >= 2).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-finish-failed-check");
  }),
);

test(
  "tutoring late definitive Finish rejection clears unknown for a freshly confirmed attempt",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    control.finishOutcome = "busy";
    let release = () => {};
    control.holdFinish = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await page.goto(finishPath);
      await ready(page, "Finish tutoring session");
      await page.getByRole("button", { name: "Review Finish" }).click();
      await expect(
        page.getByRole("button", { name: "Confirm Finish" }),
      ).toBeEnabled();
      await page.getByRole("button", { name: "Confirm Finish" }).click();
      await expect.poll(() => control.finishPosts).toBe(1);
      await page.getByRole("button", { name: "Stop waiting" }).click();
      await expect(
        page.getByRole("button", { name: "Confirm Finish" }),
      ).toBeDisabled();
      const definitive = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          new URL(response.url()).pathname ===
            "/api/v1/tutoring-sessions/session_1/completion" &&
          response.status() === 409,
      );
      release();
      await definitive;
      control.workGenerating = false;
      control.workState = "idle";
      control.finishOutcome = "success";
      const eligibleRead = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          new URL(response.url()).pathname ===
            "/api/v1/tutoring-sessions/session_1/current-work",
      );
      await page.getByRole("button", { name: "Refresh" }).click();
      await eligibleRead;
      await expect(
        page.getByRole("button", { name: "Confirm Finish" }),
      ).toBeEnabled();
      expect(control.finishPosts === 1).toBe(true);
      await page.getByRole("button", { name: "Confirm Finish" }).click();
      await ready(page, "Tutoring session");
      expect(control.finishPosts === 2 && control.turnReads === 1).toBe(true);
      await routeHygieneCheckpoint(page, "tutoring-finish-resolved");
    } finally {
      release();
    }
  }),
);

test(
  "tutoring Finish race reads new authoritative work after a stale eligibility conflict",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    await page.goto(finishPath);
    await ready(page, "Finish tutoring session");
    await page.getByRole("button", { name: "Review Finish" }).click();
    await expect(
      page.getByRole("button", { name: "Confirm Finish" }),
    ).toBeEnabled();
    control.finishOutcome = "busy";
    const reads = control.workReads;
    await page.getByRole("button", { name: "Confirm Finish" }).click();
    await expect(
      page.getByRole("dialog").getByText(/work changed/u),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirm Finish" }),
    ).toBeDisabled();
    expect(
      control.finishPosts === 1 &&
        control.workReads > reads &&
        control.turnReads === 0,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-finish-race");
  }),
);

test(
  "tutoring Finish dialog and completed transcript retain keyboard access and reflow at 320 pixels",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    await page.setViewportSize({ width: 320, height: 900 });
    for (const size of ["standard", "large", "extra-large"]) {
      await page.addInitScript(
        (value) => localStorage.setItem("mia.interface.text-size", value),
        size,
      );
      await page.goto(finishPath);
      await ready(page, "Finish tutoring session");
      await noScroll(page);
      await page.getByRole("button", { name: "Review Finish" }).click();
      await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
      await expect(
        page.getByRole("button", { name: "Confirm Finish" }),
      ).toBeEnabled();
      await noScroll(page);
      const dialogAxe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(dialogAxe.violations.length === 0).toBe(true);
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    control.sessionState = "completed";
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect(page.locator("main article")).toHaveCount(1);
    await noScroll(page);
    const completedAxe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(completedAxe.violations.length === 0).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-finish-access");
  }),
);

test("tutoring completed transcript preserves semantics at actual 200 percent zoom in forced colors", async () => {
  await atBrowserZoom(2, async (page) => {
    const control = await tutoringBackend(page);
    control.sessionState = "completed";
    await page.emulateMedia({
      forcedColors: "active",
      reducedMotion: "reduce",
    });
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect(page.locator("main article")).toHaveCount(1);
    await noScroll(page);
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(axe.violations.length === 0 && control.workReads === 0).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-finish-zoom");
  });
});

test(
  "tutoring workspace queues one message during an answer and keeps the draft when the queue is full",
  protectedJourney(async (page) => {
    await controllableStream(page);
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    control.workState = "generating";
    control.workGenerating = true;
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    const queue = page.getByRole("button", { name: "Queue message" });
    await expect(queue).toBeVisible();
    const composer = page.getByLabel("Your message to the tutor");
    await composer.fill(fixture.teachingText);
    await queue.click();
    // Definitive 201: exactly one immediate current-work follow-up read (D4),
    // then the one distinct queued article keyed by the response ID.
    await expect.poll(() => control.workReads === 2).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Response queued" }),
    ).toBeVisible();
    expect(
      control.messagePosts === 1 &&
        requestIdPattern.test(control.messageRequestIds[0] ?? "") &&
        control.workQueries.join() === "," &&
        control.forbidden === 0,
    ).toBe(true);
    // The queue is now full: the draft stays, the submission is disabled, and
    // nothing else dispatches.
    await composer.fill("a follow-up question");
    const submit = page.locator("main button[type=submit]");
    await expect(submit).toHaveAttribute("aria-disabled", "true");
    await submit.click({ force: true });
    expect(
      control.messagePosts === 1 &&
        (await composer.inputValue()) === "a follow-up question",
    ).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-content");
    await minimized(page);
  }),
);

test(
  "tutoring lost workspace send reconciles through the current work read and retries only the exact attempt",
  protectedJourney(async (page) => {
    await controllableStream(page);
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    control.sendOutcome = "lose";
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    const composer = page.getByLabel("Your message to the tutor");
    await composer.fill(fixture.teachingText);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(
      page.getByRole("heading", { name: unknownSendHeading }),
    ).toBeVisible();
    expect(control.messagePosts === 1 && control.starts === 0).toBe(true);
    // Reconcile is the current-work read with the retained request ID; the
    // well-formed unknown ID answers reconciled_message null (not committed).
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    const retry = page.getByRole("button", { name: "Retry exact attempt" });
    await expect(retry).toBeVisible();
    expect(control.workQueries.at(-1) === control.messageRequestIds[0]).toBe(
      true,
    );
    control.sendOutcome = "created";
    await retry.click();
    await expect.poll(() => control.messagePosts === 2).toBe(true);
    // The exact retained identity is resent; nothing else was dispatched.
    expect(
      control.messageRequestIds.length === 2 &&
        control.messageRequestIds[0] === control.messageRequestIds[1] &&
        control.starts === 0 &&
        control.forbidden === 0,
    ).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Response queued" }),
    ).toBeVisible();
    await routeHygieneCheckpoint(page, "tutoring-content");
    await minimized(page);
  }),
);

test(
  "tutoring busy workspace send keeps the draft and recovers only through explicit Refresh",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    const fixture = routeSecretFixture(page);
    control.sendOutcome = "busy";
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    const composer = page.getByLabel("Your message to the tutor");
    await composer.fill(fixture.teachingText);
    await page.getByRole("button", { name: "Send" }).click();
    await expect(
      page.getByRole("heading", {
        name: "The tutor is busy with other work right now. Your draft stays unchanged. Refresh the current state before sending.",
      }),
    ).toBeVisible();
    // Slot lost: the draft is retained verbatim; nothing replays.
    expect(
      control.messagePosts === 1 &&
        (await composer.inputValue()) === fixture.teachingText,
    ).toBe(true);
    control.sendOutcome = "created";
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect.poll(() => control.workReads === 2).toBe(true);
    expect(control.messagePosts === 1 && control.forbidden === 0).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-content");
    await minimized(page);
  }),
);

test(
  "tutoring reload during an unsettled send loses the draft and never replays",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    // The response never arrives within this page lifetime.
    control.holdSend = new Promise<void>(() => {});
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    const composer = page.getByLabel("Your message to the tutor");
    await composer.fill("a question in flight");
    await page.getByRole("button", { name: "Send" }).click();
    await expect.poll(() => control.messagePosts === 1).toBe(true);
    // Reload mid-flight: machine 2 Reloaded unknown — no outcome claim, no
    // restored draft, and never an automatic replay.
    await page.reload();
    await ready(page, "Tutoring session");
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
    expect(
      (await composer.inputValue()) === "" &&
        control.messagePosts === 1 &&
        control.starts === 0 &&
        control.forbidden === 0 &&
        (await page
          .getByRole("heading", { name: unknownSendHeading })
          .count()) === 0,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-content");
    await minimized(page);
  }),
);

test(
  "tutoring start recovery and workspace reflow in all seven locales and text modes at 320 pixels",
  protectedJourney(async (page) => {
    test.setTimeout(180_000);
    const control = await tutoringBackend(page);
    await controllableStream(page);
    control.sessionState = "active";
    await page.setViewportSize({ width: 320, height: 900 });
    for (const locale of [
      "de-DE",
      "en-US",
      "es-AR",
      "es-ES",
      "fr-FR",
      "pt-BR",
      "pt-PT",
    ]) {
      for (const size of ["standard", "large", "extra-large"]) {
        await page.addInitScript(
          ([language, textSize]) => {
            localStorage.setItem("mia.interface.locale", language);
            localStorage.setItem("mia.interface.text-size", textSize);
          },
          [locale, size],
        );
        for (const route of [start, recovery, intent, workspace]) {
          control.activeSession = route === workspace;
          control.workState = route === workspace ? "generating" : "idle";
          control.workGenerating = route === workspace;
          await page.goto(route);
          await expect
            .poll(async () => (await page.locator("main h1").count()) === 1)
            .toBe(true);
          expect(
            (await page.locator("html").getAttribute("lang")) === locale,
          ).toBe(true);
          expect(
            (await page
              .locator("html")
              .evaluate((node) => getComputedStyle(node).fontSize)) ===
              (size === "standard"
                ? "16px"
                : size === "large"
                  ? "18px"
                  : "20px"),
          ).toBe(true);
          await noScroll(page);
          await minimized(page);
          if (route === workspace) {
            await expect
              .poll(() => page.locator("main button").count())
              .toBeGreaterThan(2);
          }
        }
      }
    }
    expect(control.forbidden === 0 && control.starts === 0).toBe(true);
    // The workspace transcript read settles before the content checkpoint.
    await expect
      .poll(async () => (await page.locator("main article").count()) >= 1)
      .toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-content");
  }),
);

test("tutoring surfaces preserve keyboard structure and pass axe at actual 200 percent zoom in every text mode", async () => {
  test.setTimeout(180_000);
  for (const size of ["standard", "large", "extra-large"]) {
    await atBrowserZoom(2, async (page) => {
      const control = await tutoringBackend(page);
      await controllableStream(page);
      await page.addInitScript(
        (textSize) => localStorage.setItem("mia.interface.text-size", textSize),
        size,
      );
      await page.emulateMedia({
        forcedColors: "active",
        reducedMotion: "reduce",
      });
      for (const route of [start, recovery, intent, workspace]) {
        await page.goto(route);
        await expect
          .poll(async () => (await page.locator("main h1").count()) === 1)
          .toBe(true);
        await noScroll(page);
        await minimized(page);
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(axe.violations.length === 0).toBe(true);
      }
      // Keyboard: the workspace Home exit focuses and activates.
      control.activeSession = true;
      control.workState = "generating";
      control.workGenerating = true;
      await page.goto(workspace);
      await expect
        .poll(async () => (await page.locator("main article").count()) >= 2)
        .toBe(true);
      await noScroll(page);
      const stop = page.getByRole("button", { name: "Stop response" });
      await stop.focus();
      await expect(stop).toBeFocused();
      await expect(stop).toBeInViewport();
      await page.locator("main a[href='/']").focus();
      await page.keyboard.press("Enter");
      await ready(page, "Home");
    });
  }
});
