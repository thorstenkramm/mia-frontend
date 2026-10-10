import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { learnBackend } from "./learnFixtures";
import { atBrowserZoom, protectedJourney } from "./routeFixtures";
import {
  routeHygieneCheckpoint,
  routeSecretFixture,
} from "./routeSecretHygiene";

test.use({ trace: "off", video: "off", screenshot: "off" });
const list = "/learn/courses",
  detail = `${list}/course_1`,
  materials = `${detail}/materials`;
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
      [fixture.teachingText, fixture.rawError],
    ),
  ).toBe(true);
  const tree = await page.locator("main").ariaSnapshot();
  expect(
    !tree.includes(fixture.teachingText) && !tree.includes(fixture.rawError),
  ).toBe(true);
}
async function noScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test(
  "Learn mixed-role discovery shows only joined active courses and metadata without downloads",
  protectedJourney(async (page) => {
    const control = await learnBackend(page);
    await page.goto(list);
    await ready(page, "Courses");
    await expect
      .poll(async () => (await page.locator("main tbody tr").count()) === 1)
      .toBe(true);
    expect(
      control.courseReads === 1 &&
        control.materialReads === 0 &&
        control.forbidden === 0,
    ).toBe(true);
    await page.locator(`main a[href="${detail}"]`).click();
    await ready(page, "Course");
    await expect
      .poll(async () => (await page.locator("main tbody tr").count()) === 2)
      .toBe(true);
    expect(
      (await page
        .getByRole("link", { name: /Download|Start tutoring/u })
        .count()) === 0 &&
        (await page.locator('main a[href^="https:"]').count()) === 0 &&
        control.forbidden === 0,
    ).toBe(true);
    await minimized(page);
    await routeHygieneCheckpoint(page, "learn-metadata");
    await page.reload();
    await ready(page, "Course");
    await expect.poll(() => control.materialReads === 2).toBe(true);
    await minimized(page);
  }),
);

test(
  "Learn hidden causes retain neutral primary copy focus exits and no stale course identity",
  protectedJourney(async (page) => {
    const control = await learnBackend(page);
    let expected: string | null = null;
    for (const cause of ["scope", "inactive", "404", "403", "429"]) {
      control.ids = cause === "scope" ? [] : ["course_1"];
      control.active = cause !== "inactive";
      control.deny = ["404", "403", "429"].includes(cause) ? Number(cause) : 0;
      await page.goto(detail);
      await ready(page, "Course access unavailable");
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
          path: location.pathname,
        }),
      );
      expected ??= primary;
      expect(
        primary === expected &&
          control.materialReads === 0 &&
          !(await page.locator("main").textContent())?.includes(
            routeSecretFixture(page).courseName,
          ),
      ).toBe(true);
    }
    expect(control.courseReads === 4).toBe(true);
    await routeHygieneCheckpoint(page, "learn-hidden");
  }),
);

test(
  "Learn delayed course response is fenced by lifecycle and changed membership is rediscovered on Refresh",
  protectedJourney(async (page) => {
    const control = await learnBackend(page);
    let release = () => {};
    control.holdCourse = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await page.goto(detail);
      await expect.poll(() => control.courseReads).toBe(1);
      expect(
        control.materialReads === 0 && (await page.title()) === "MIA",
      ).toBe(true);
      await page.evaluate(() =>
        window.dispatchEvent(
          new PageTransitionEvent("pagehide", { persisted: true }),
        ),
      );
      release();
      await page.evaluate(() =>
        window.dispatchEvent(
          new PageTransitionEvent("pageshow", { persisted: true }),
        ),
      );
      await expect(
        page.getByRole("button", { name: "Refresh", exact: true }),
      ).toBeVisible();
      expect(
        control.capabilities === 1 &&
          control.courseReads === 1 &&
          control.materialReads === 0,
      ).toBe(true);
      control.ids = [];
      control.holdCourse = null;
      await page.getByRole("button", { name: "Refresh", exact: true }).click();
      await ready(page, "Course access unavailable");
      expect(
        control.courseReads === 1 &&
          control.materialReads === 0 &&
          control.capabilities === 2,
      ).toBe(true);
      await routeHygieneCheckpoint(page, "learn-hidden");
    } finally {
      release();
    }
  }),
);

test(
  "Learn bounded joined batches and filtered-empty material pages require explicit continuation",
  protectedJourney(async (page) => {
    const control = await learnBackend(page);
    control.ids = Array.from({ length: 26 }, (_, index) => `c${index}`);
    control.many = true;
    await page.goto(list);
    await ready(page, "Courses");
    await expect.poll(() => control.courseReads).toBe(25);
    await page
      .getByRole("button", { name: "Check more joined courses" })
      .click();
    await expect.poll(() => control.courseReads).toBe(26);
    await expect
      .poll(async () => (await page.locator("main tbody tr").count()) === 1)
      .toBe(true);
    expect(
      (await page
        .getByRole("button", { name: "Check more joined courses" })
        .count()) === 0,
    ).toBe(true);
    control.ids = ["course_1"];
    control.many = false;
    control.filteredEmpty = true;
    await page.goto(materials);
    await ready(page, "Course materials");
    await expect(
      page.getByRole("button", { name: "Next", exact: true }),
    ).toBeEnabled();
    expect(control.offsets.join() === "0").toBe(true);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect
      .poll(async () => (await page.locator("main tbody tr").count()) === 1)
      .toBe(true);
    expect(
      control.offsets.join() === "0,25" &&
        (await page
          .locator("main h2[tabindex]")
          .evaluate((node) => document.activeElement === node)),
    ).toBe(true);
    await minimized(page);
    await routeHygieneCheckpoint(page, "learn-metadata");
    control.materialDeny = true;
    await page.getByRole("button", { name: "Previous", exact: true }).click();
    await ready(page, "Course access unavailable");
    await page
      .getByRole("button", { name: "Technical details", exact: true })
      .click();
    expect(
      !(await page.locator("main").textContent())?.includes(
        routeSecretFixture(page).courseName,
      ),
    ).toBe(true);
    await routeHygieneCheckpoint(page, "learn-error");
  }),
);

test(
  "Learn surfaces reflow in all seven locales and text modes with metadata kept inert",
  protectedJourney(async (page) => {
    test.setTimeout(120_000);
    await learnBackend(page);
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
        for (const route of [list, detail, materials]) {
          await page.goto(route);
          await expect
            .poll(async () => (await page.locator("main tbody tr").count()) > 0)
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
    await routeHygieneCheckpoint(page, "learn-metadata");
  }),
);

test("Learn surfaces preserve keyboard structure spacing and actual 200 percent zoom in every text mode", async () => {
  test.setTimeout(120_000);
  for (const size of ["standard", "large", "extra-large"]) {
    await atBrowserZoom(2, async (page) => {
      await learnBackend(page);
      await page.addInitScript(
        (textSize) => localStorage.setItem("mia.interface.text-size", textSize),
        size,
      );
      await page.emulateMedia({
        forcedColors: "active",
        reducedMotion: "reduce",
      });
      const spacingUrl = "http://127.0.0.1:4173/test-learn-spacing.css";
      await page.route(spacingUrl, (route) =>
        route.fulfill({
          contentType: "text/css",
          body: "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-block-end: 2em !important; }",
        }),
      );
      for (const route of [list, detail, materials]) {
        await page.goto(route);
        await expect
          .poll(async () => (await page.locator("main tbody tr").count()) > 0)
          .toBe(true);
        await page.addStyleTag({ url: spacingUrl });
        expect(
          (await page
            .locator("html")
            .evaluate((node) => getComputedStyle(node).fontSize)) ===
            (size === "standard" ? "16px" : size === "large" ? "18px" : "20px"),
        ).toBe(true);
        expect(
          await page.locator("h1").evaluate((node) => {
            const style = getComputedStyle(node);
            return (
              Math.abs(
                parseFloat(style.letterSpacing) / parseFloat(style.fontSize) -
                  0.12,
              ) < 0.01
            );
          }),
        ).toBe(true);
        await noScroll(page);
        await minimized(page);
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(axe.violations.length === 0).toBe(true);
      }
      await page.locator("main a[href='/']").focus();
      await page.keyboard.press("Enter");
      await ready(page, "Home");
    });
  }
});
