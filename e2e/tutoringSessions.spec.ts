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
  recovery = "/learn/session",
  workspace = "/learn/sessions/session_1";
const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const unknownHeading =
  "The start outcome is unknown. The session may have been created. Reconcile checks the current state; this attempt is never repeated automatically.";
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

test(
  "tutoring start chooses course and material once and reload resumes through recovery",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
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
    await page.getByRole("button", { name: "Start session" }).click();
    await ready(page, "Tutoring session");
    await expect
      .poll(async () => (await page.locator("main article").count()) === 1)
      .toBe(true);
    expect(
      control.starts === 1 &&
        requestIdPattern.test(control.requestIds[0] ?? "") &&
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
      .poll(() => control.sessionReads === 2 && control.turnReads === 2)
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
    await page.goto(material);
    await ready(page, "Choose material");
    await page.getByRole("button", { name: "Start session" }).click();
    await expect(
      page.getByRole("link", { name: "Continue session" }),
    ).toBeVisible();
    const discoveries = control.discoveryReads;
    expect(
      control.starts === 1 &&
        page.url().endsWith(material) &&
        control.forbidden === 0,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-course");
    await page.getByRole("link", { name: "Continue session" }).click();
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
    await page.goto(material);
    await ready(page, "Choose material");
    await page.getByRole("button", { name: "Start session" }).click();
    await expect(
      page.getByRole("heading", { name: unknownHeading }),
    ).toBeVisible();
    // No replay: the lost start stays the only dispatch until reconciliation.
    expect(control.starts === 1 && page.url().endsWith(material)).toBe(true);
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
    const control = await tutoringBackend(page);
    control.outcome = "lose";
    await page.goto(material);
    await ready(page, "Choose material");
    await page.getByRole("button", { name: "Start session" }).click();
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
      .poll(async () => (await page.locator("main article").count()) === 1)
      .toBe(true);
    expect(
      control.starts === 2 &&
        control.requestIds.length === 2 &&
        control.requestIds[0] === control.requestIds[1] &&
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
  "tutoring completed session shows the fixed finished notice without transcript reads",
  protectedJourney(async (page) => {
    const control = await tutoringBackend(page);
    control.sessionState = "completed";
    await page.goto(workspace);
    await ready(page, "Tutoring session");
    await expect(
      page.getByText("This tutoring session is finished."),
    ).toBeVisible();
    expect(
      control.turnReads === 0 &&
        control.starts === 0 &&
        (await page.locator("main article").count()) === 0 &&
        (await page.locator(`main a[href="/learn/courses"]`).count()) === 1,
    ).toBe(true);
    await minimized(page);
  }),
);

test(
  "tutoring start recovery and workspace reflow in all seven locales and text modes at 320 pixels",
  protectedJourney(async (page) => {
    test.setTimeout(180_000);
    const control = await tutoringBackend(page);
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
        for (const route of [start, recovery, workspace]) {
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
        }
      }
    }
    expect(control.forbidden === 0 && control.starts === 0).toBe(true);
    // The workspace transcript read settles before the content checkpoint.
    await expect
      .poll(async () => (await page.locator("main article").count()) === 1)
      .toBe(true);
    await routeHygieneCheckpoint(page, "tutoring-content");
  }),
);

test("tutoring surfaces preserve keyboard structure and pass axe at actual 200 percent zoom in every text mode", async () => {
  test.setTimeout(180_000);
  for (const size of ["standard", "large", "extra-large"]) {
    await atBrowserZoom(2, async (page) => {
      await tutoringBackend(page);
      await page.addInitScript(
        (textSize) => localStorage.setItem("mia.interface.text-size", textSize),
        size,
      );
      await page.emulateMedia({
        forcedColors: "active",
        reducedMotion: "reduce",
      });
      for (const route of [start, recovery, workspace]) {
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
      await page.goto(workspace);
      await expect
        .poll(async () => (await page.locator("main article").count()) === 1)
        .toBe(true);
      await page.locator("main a[href='/']").focus();
      await page.keyboard.press("Enter");
      await ready(page, "Home");
    });
  }
});
