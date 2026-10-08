import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { courseBackend, courseRoutes } from "./courseFixtures";
import { invitationBackend } from "./invitationFixtures";
import { readFileSync } from "node:fs";
import { atBrowserZoom, protectedJourney } from "./routeFixtures";
import {
  routeHygieneCheckpoint,
  routeSecretFixture,
} from "./routeSecretHygiene";

test.use({ trace: "off", video: "off", screenshot: "off" });
const create = "/admin/courses/new";
test(
  "course enabled unfocused boundaries and collection landmarks are accessible",
  protectedJourney(async (page) => {
    await courseBackend(page);
    await page.emulateMedia({ colorScheme: "light", forcedColors: "none" });
    await page.goto(create);
    await focusedHeading(page, "Create course");
    await expect
      .poll(async () => page.locator('input[type="checkbox"]').count())
      .toBe(1);
    const boundaries = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Contrast measurement canvas unavailable.");
      const rgba = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return Array.from(context.getImageData(0, 0, 1, 1).data);
      };
      const luminance = (color: string) =>
        rgba(color)
          .slice(0, 3)
          .reduce((sum, channel, index) => {
            const value = channel / 255;
            return (
              sum +
              (index === 0 ? 0.2126 : index === 1 ? 0.7152 : 0.0722) *
                (value <= 0.04045
                  ? value / 12.92
                  : ((value + 0.055) / 1.055) ** 2.4)
            );
          }, 0);
      const ratio = (first: string, second: string) => {
        const a = luminance(first),
          b = luminance(second);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      return ["#course-name", 'input[type="checkbox"]'].map((selector) => {
        const input = document.querySelector(selector);
        if (!(input instanceof HTMLInputElement))
          throw new Error("Contrast measurement control unavailable.");
        const style = getComputedStyle(input);
        const outline = input.type !== "checkbox";
        const color = outline ? style.outlineColor : style.borderTopColor;
        let adjacent = input.parentElement;
        while (
          adjacent &&
          rgba(getComputedStyle(adjacent).backgroundColor)[3] === 0
        )
          adjacent = adjacent.parentElement;
        if (!adjacent)
          throw new Error(
            "Contrast measurement adjacent background unavailable.",
          );
        return {
          enabledUnfocused:
            !input.disabled &&
            !input.readOnly &&
            document.activeElement !== input &&
            (input.type !== "checkbox" || !input.checked) &&
            input.value === (input.type === "checkbox" ? "on" : ""),
          solid:
            (outline ? style.outlineStyle : style.borderTopStyle) === "solid",
          width: parseFloat(
            outline ? style.outlineWidth : style.borderTopWidth,
          ),
          innerRatio: ratio(color, style.backgroundColor),
          outerRatio: ratio(color, getComputedStyle(adjacent).backgroundColor),
        };
      });
    });
    for (const boundary of boundaries) {
      expect(
        boundary.enabledUnfocused &&
          boundary.solid &&
          boundary.width >= 1 &&
          boundary.innerRatio >= 3 &&
          boundary.outerRatio >= 3,
      ).toBe(true);
    }
    console.log(
      "R1 measured normal-color unfocused boundary ratios (inner/outer):",
      boundaries.map((boundary) => [
        boundary.innerRatio.toFixed(3),
        boundary.outerRatio.toFixed(3),
      ]),
    );
    expect(
      await page
        .getByRole("navigation", { name: "Collection pages", exact: true })
        .isVisible(),
    ).toBe(true);
    expect(
      await page
        .getByRole("navigation", { name: "Invitation pages", exact: true })
        .count(),
    ).toBe(0);
    await page.goto("/admin/courses");
    await focusedHeading(page, "Courses");
    await expect
      .poll(async () =>
        page
          .getByRole("navigation", { name: "Collection pages", exact: true })
          .isVisible(),
      )
      .toBe(true);
    expect(
      await page
        .getByRole("navigation", { name: "Invitation pages", exact: true })
        .count(),
    ).toBe(0);
    await invitationBackend(page);
    // Its default terminal page has no pagination landmark. Supply a contracted
    // continuation link to exercise the existing invitation pagination owner.
    await page.route(/\/api\/v1\/invitations\?/, (route) =>
      route.fulfill({
        contentType: "application/vnd.api+json",
        body: JSON.stringify({
          data: [],
          meta: { has_more: true },
          links: { next: "/api/v1/invitations?page[limit]=25&page[offset]=25" },
        }),
      }),
    );
    await page.goto("/admin/invitations");
    await focusedHeading(page, "Invitations");
    await expect
      .poll(async () =>
        page
          .getByRole("navigation", { name: "Invitation pages", exact: true })
          .isVisible(),
      )
      .toBe(true);
    expect(
      await page
        .getByRole("navigation", { name: "Collection pages", exact: true })
        .count(),
    ).toBe(0);
  }),
);
const locales = [
  "en-US",
  "de-DE",
  "es-ES",
  "es-AR",
  "fr-FR",
  "pt-PT",
  "pt-BR",
] as const;
function localizedLabels(locale: string) {
  // Read public copy without loading bundler-only JSON imports in native Node.
  const value: unknown = JSON.parse(
    readFileSync(
      new URL(`../src/platform/i18n/catalogs/${locale}.json`, import.meta.url),
      "utf8",
    ),
  );
  if (
    typeof value !== "object" ||
    value === null ||
    !("courses.unavailableHeading" in value) ||
    typeof value["courses.unavailableHeading"] !== "string" ||
    !("courses.detailHeading" in value) ||
    typeof value["courses.detailHeading"] !== "string" ||
    !("invitations.refresh" in value) ||
    typeof value["invitations.refresh"] !== "string"
  )
    throw new Error("The public localized test labels are missing.");
  return {
    unavailable: value["courses.unavailableHeading"],
    detail: value["courses.detailHeading"],
    refresh: value["invitations.refresh"],
  };
}
// Boolean assertions never attach a locator's protected DOM/error snapshot.
async function focusedHeading(page: Page, name: string, level = 1) {
  await expect
    .poll(async () =>
      page.evaluate(
        ({ name, level }) => {
          const heading = document.activeElement;
          return (
            heading?.tagName === `H${level}` && heading.textContent === name
          );
        },
        { name, level },
      ),
    )
    .toBe(true);
}
async function stayVisible(page: Page) {
  await expect
    .poll(async () =>
      page
        .getByRole("button", { name: "Stay on this page", exact: true })
        .isVisible(),
    )
    .toBe(true);
}
async function fillCourse(page: Page) {
  const fixture = routeSecretFixture(page);
  try {
    await page.locator("#course-name").fill(fixture.courseName);
    await page.locator("input[type=checkbox]").first().check();
  } catch {
    // Playwright fill errors include their operand. Replace this diagnostic at
    // the test boundary, not production transport, rather than exposing input.
    throw new Error(
      "Course input interaction failed (protected operands omitted).",
    );
  }
  expect(
    (await page.locator("#course-name").inputValue()) === fixture.courseName,
  ).toBe(true);
  expect(await page.locator("input[type=checkbox]").first().isChecked()).toBe(
    true,
  );
  expect(
    (await page
      .getByRole("button", { name: "Create course", exact: true })
      .getAttribute("aria-disabled")) === "false",
  ).toBe(true);
  await routeHygieneCheckpoint(page, "course-input");
}
async function contained(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function outsideProtectedContent(page: Page) {
  const fixture = routeSecretFixture(page);
  expect(
    await page.evaluate(
      (markers) =>
        markers.some(
          (marker) =>
            location.href.includes(marker) ||
            JSON.stringify(history.state).includes(marker) ||
            document.title.includes(marker) ||
            Object.values(localStorage).some((value) =>
              String(value).includes(marker),
            ) ||
            Object.values(sessionStorage).some((value) =>
              String(value).includes(marker),
            ) ||
            Array.from(document.querySelectorAll("[aria-live]")).some((node) =>
              node.textContent?.includes(marker),
            ),
        ),
      [fixture.courseName, fixture.supervisorUsername, fixture.csrf],
    ),
  ).toBe(false);
  expect(
    await page.evaluate(
      async () =>
        (await caches.keys()).length === 0 &&
        (await navigator.serviceWorker.getRegistrations()).length === 0,
    ),
  ).toBe(true);
}

test(
  "course hidden detail causes share neutral presentation in every locale",
  protectedJourney(async (page) => {
    const backend = await courseBackend(page);
    await page.goto("/");
    for (const locale of locales) {
      const labels = localizedLabels(locale);
      await page.evaluate(
        (locale) => localStorage.setItem("mia.interface.locale", locale),
        locale,
      );
      backend.denial = true;
      await page.goto("/admin/courses/course_1");
      await focusedHeading(page, labels.unavailable);
      const snapshot = () =>
        page.evaluate(() => ({
          title: document.title,
          path: location.pathname,
          text: document.querySelector("main")?.textContent,
          focus: document.activeElement?.tagName,
          actions: Array.from(
            document.querySelectorAll("main a, main button"),
          ).map((element) => ({
            text: element.textContent,
            href: element.getAttribute("href"),
          })),
        }));
      const unknown = await snapshot();
      backend.denial = false;
      await page.goto("/admin/courses/course_1");
      await focusedHeading(page, labels.detail);
      await expect
        .poll(async () =>
          page.evaluate(
            (marker) =>
              document.querySelector("main")?.textContent?.includes(marker) ===
              true,
            routeSecretFixture(page).courseName,
          ),
        )
        .toBe(true);
      await routeHygieneCheckpoint(page, "course-persisted");
      backend.denial = true;
      await page
        .getByRole("button", {
          name: labels.refresh,
          exact: true,
        })
        .click();
      await focusedHeading(page, labels.unavailable);
      expect(JSON.stringify(await snapshot()) === JSON.stringify(unknown)).toBe(
        true,
      );
      expect(
        await page.evaluate(
          (markers) =>
            markers.some(
              (marker) => document.body.textContent?.includes(marker) === true,
            ),
          [
            routeSecretFixture(page).courseName,
            routeSecretFixture(page).rawError,
          ],
        ),
      ).toBe(false);
    }
  }),
);

test(
  "course creation persists atomically and assigned scope discovers it",
  protectedJourney(async (page) => {
    const backend = await courseBackend(page);
    await page.goto(create);
    await focusedHeading(page, "Create course");
    await page
      .getByRole("button", { name: "Create course", exact: true })
      .click();
    await focusedHeading(page, "Check the course input", 2);
    expect(backend.creates === 0).toBe(true);
    await fillCourse(page);
    await outsideProtectedContent(page);
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.length === 0,
    ).toBe(true);
    await page
      .getByRole("button", { name: "Create course", exact: true })
      .click();
    await focusedHeading(page, "Course administration");
    expect(backend.creates).toBe(1);
    expect(backend.validPayload).toBe(true);
    expect(backend.validQuery).toBe(true);
    await expect
      .poll(async () =>
        page
          .locator("main")
          .textContent()
          .then((text) => text?.includes(routeSecretFixture(page).courseName)),
      )
      .toBe(true);
    await routeHygieneCheckpoint(page, "course-persisted");
    await page.emulateMedia({ media: "print" });
    expect(
      await page.evaluate(
        () =>
          getComputedStyle(document.getElementById("root") ?? document.body)
            .display === "none",
      ),
    ).toBe(true);
    await page.emulateMedia({ media: "screen" });
    await page.reload();
    await focusedHeading(page, "Course administration");
    expect(backend.creates === 1).toBe(true);
    backend.grants = new Set(["courses.supervise"]);
    backend.scopeIds = ["course_1"];
    await page.goto("/prepare/courses");
    await focusedHeading(page, "Prepare courses");
    expect(
      backend.collectionReads === 0 &&
        backend.detailReads.at(-1) === "course_1",
    ).toBe(true);
    // Story 4.2 now owns the assigned hub; no future action routes are exposed.
    await expect
      .poll(() =>
        page.locator("main a[href='/prepare/courses/course_1']").count(),
      )
      .toBe(1);
    expect(
      await page.locator("main a[href^='/prepare/courses/']").count(),
    ).toBe(1);
  }),
);

test(
  "course authority and scope never broaden through role or empty scope",
  protectedJourney(async (page) => {
    const backend = await courseBackend(page);
    backend.grants.delete("accounts.administer");
    await page.goto(create);
    await focusedHeading(page, "Create course");
    expect(backend.candidateReads === 0 && backend.creates === 0).toBe(true);
    expect(
      (await page
        .getByRole("button", { name: "Create course", exact: true })
        .getAttribute("aria-disabled")) === "true",
    ).toBe(true);
    backend.grants = new Set(["courses.supervise"]);
    await page.goto("/prepare/courses");
    await focusedHeading(page, "Prepare courses");
    expect(
      backend.detailReads.length === 0 && backend.collectionReads === 0,
    ).toBe(true);
    backend.scopeIds = Array.from(
      { length: 27 },
      (_, index) => `known_${index}`,
    );
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await focusedHeading(page, "Prepare courses");
    await expect.poll(() => backend.detailReads.length).toBe(25);
    expect(
      backend.detailReads.every((id) => backend.scopeIds.includes(id)),
    ).toBe(true);
    await routeHygieneCheckpoint(page, "course-persisted");
    await page
      .getByRole("button", { name: "Show more assigned courses" })
      .click();
    await expect.poll(() => backend.detailReads.length).toBe(27);
    expect(
      await page
        .getByRole("button", { name: "Show more assigned courses" })
        .count(),
    ).toBe(0);
    expect(
      backend.detailReads.length === 27 && backend.collectionReads === 0,
    ).toBe(true);
  }),
);

test(
  "course hidden selector denial removes draft dialog and labels",
  protectedJourney(async (page) => {
    const backend = await courseBackend(page);
    await page.goto(create);
    await fillCourse(page);
    await page
      .getByRole("link", { name: "Back to courses", exact: true })
      .click();
    await stayVisible(page);
    await page
      .getByRole("button", { name: "Stay on this page", exact: true })
      .click();
    backend.candidateDenial = true;
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await focusedHeading(page, "Course access unavailable");
    expect(
      await page.evaluate(
        (marker) =>
          document.body.textContent?.includes(marker) ||
          document.querySelector("#course-name") !== null ||
          document.querySelector("[role=dialog]") !== null,
        routeSecretFixture(page).supervisorUsername,
      ),
    ).toBe(false);
    expect(await page.locator("main pre").count()).toBe(0);
    await routeHygieneCheckpoint(page, "course-error");
  }),
);

test(
  "course lost response freezes the journey without replay",
  protectedJourney(async (page) => {
    const backend = await courseBackend(page);
    backend.outcome = "lose";
    await page.goto(create);
    await fillCourse(page);
    await page
      .getByRole("button", { name: "Create course", exact: true })
      .click();
    await focusedHeading(page, "Save outcome unknown", 2);
    expect(backend.creates === 1 && backend.persisted).toBe(true);
    expect(await page.locator("#course-name").count()).toBe(0);
    await page
      .getByRole("link", { name: "Review courses", exact: true })
      .click();
    await focusedHeading(page, "Courses");
    await routeHygieneCheckpoint(page, "course-persisted");
    expect(backend.creates === 1).toBe(true);
  }),
);

test(
  "course stopping waiting fences late create success",
  protectedJourney(async (page) => {
    const backend = await courseBackend(page);
    let release = () => {};
    backend.release = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.goto(create);
    await fillCourse(page);
    await page
      .getByRole("button", { name: "Create course", exact: true })
      .click();
    await expect.poll(() => backend.creates).toBe(1);
    await page
      .getByRole("button", { name: "Stop waiting", exact: true })
      .click();
    await focusedHeading(page, "Save outcome unknown", 2);
    release();
    await expect.poll(() => backend.persisted).toBe(true);
    expect(
      new URL(page.url()).pathname === create && backend.creates === 1,
    ).toBe(true);
    expect(await page.locator("#course-name").count()).toBe(0);
  }),
);

test(
  "course dirty navigation and lifecycle security have separate boundaries",
  protectedJourney(async (page) => {
    const backend = await courseBackend(page);
    await page.goto("/admin/courses");
    await page
      .getByRole("link", { name: "Create course", exact: true })
      .click();
    await fillCourse(page);
    const reads = backend.candidateReads;
    await page
      .getByRole("link", { name: "Back to courses", exact: true })
      .click();
    await stayVisible(page);
    await page
      .getByRole("button", { name: "Stay on this page", exact: true })
      .click();
    expect(
      (await page.locator("#course-name").inputValue()) ===
        routeSecretFixture(page).courseName && backend.candidateReads === reads,
    ).toBe(true);
    await page.goBack();
    await stayVisible(page);
    await page
      .getByRole("button", { name: "Stay on this page", exact: true })
      .click();
    const prompt = page.waitForEvent("dialog");
    await page.evaluate(() => {
      window.setTimeout(() => location.reload(), 0);
    });
    const nativePrompt = await prompt;
    expect(nativePrompt.type()).toBe("beforeunload");
    await nativePrompt.dismiss();
    expect(
      (await page.locator("#course-name").inputValue()) ===
        routeSecretFixture(page).courseName,
    ).toBe(true);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Application", exact: true })
      .getByRole("link", { name: "Courses", exact: true })
      .click();
    await stayVisible(page);
    await page
      .getByRole("button", { name: "Stay on this page", exact: true })
      .click();
    expect(backend.candidateReads === reads).toBe(true);
    await contained(page);
    await page
      .getByRole("link", { name: "Back to courses", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Discard and leave", exact: true })
      .click();
    await focusedHeading(page, "Courses");
    await page.goBack();
    await expect
      .poll(async () => page.locator("#course-name").isVisible())
      .toBe(true);
    expect((await page.locator("#course-name").inputValue()) === "").toBe(true);
    await fillCourse(page);
    await page.goForward();
    await stayVisible(page);
    await page
      .getByRole("button", { name: "Stay on this page", exact: true })
      .click();
    const reenteredReads = backend.candidateReads;
    await page
      .getByRole("link", { name: "Back to courses", exact: true })
      .click();
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    expect(await page.locator("#course-name").count()).toBe(0);
    expect(await page.getByRole("dialog").count()).toBe(0);
    expect(
      backend.candidateReads === reenteredReads && backend.creates === 0,
    ).toBe(true);
  }),
);

test(
  "course create reflows in every locale and text mode",
  protectedJourney(async (page) => {
    await courseBackend(page);
    await page.goto("/");
    for (const locale of [
      "en-US",
      "de-DE",
      "es-ES",
      "es-AR",
      "fr-FR",
      "pt-PT",
      "pt-BR",
    ]) {
      for (const mode of ["standard", "large", "extra-large"]) {
        await page.evaluate(
          ({ locale, mode }) => {
            localStorage.setItem("mia.interface.locale", locale);
            localStorage.setItem("mia.interface.text-size", mode);
          },
          { locale, mode },
        );
        await page.setViewportSize({ width: 320, height: 900 });
        await page.goto(create);
        await expect
          .poll(async () => page.locator("#course-name").isVisible())
          .toBe(true);
        expect(
          await page.evaluate(
            ({ locale, mode }) =>
              document.documentElement.lang === locale &&
              document.documentElement.classList.contains(
                mode === "standard"
                  ? "text-base"
                  : mode === "large"
                    ? "text-lg"
                    : "text-xl",
              ),
            { locale, mode },
          ),
        ).toBe(true);
        await page.evaluate(() => {
          for (const element of document.querySelectorAll("main *")) {
            if (!(element instanceof HTMLElement)) continue;
            element.style.setProperty("line-height", "1.5", "important");
            element.style.setProperty("letter-spacing", "0.12em", "important");
            element.style.setProperty("word-spacing", "0.16em", "important");
            if (element.tagName === "P")
              element.style.setProperty("margin-bottom", "2em", "important");
          }
        });
        await contained(page);
        expect(await page.locator("main").count()).toBe(1);
        expect(await page.locator("h1").count()).toBe(1);
      }
    }
  }),
);

test("course connected process remains operable at real 200 percent zoom", async () => {
  for (const mode of ["standard", "large", "extra-large"] as const)
    await atBrowserZoom(2, async (page) => {
      const backend = await courseRoutes(page);
      await page.emulateMedia({
        forcedColors: "active",
        reducedMotion: "reduce",
      });
      await page.goto("http://127.0.0.1:4173/");
      await page.evaluate(
        (mode) => localStorage.setItem("mia.interface.text-size", mode),
        mode,
      );
      await page.goto(`http://127.0.0.1:4173${create}`);
      await fillCourse(page);
      await contained(page);
      await page
        .getByRole("button", { name: "Create course", exact: true })
        .click();
      await focusedHeading(page, "Course administration");
      await routeHygieneCheckpoint(page, "course-persisted");
      await contained(page);
      expect(
        (await new AxeBuilder({ page }).analyze()).violations.length === 0,
      ).toBe(true);
      await page
        .getByRole("link", { name: "Back to courses", exact: true })
        .click();
      await focusedHeading(page, "Courses");
      await routeHygieneCheckpoint(page, "course-persisted");
      await contained(page);
      backend.scopeIds = ["course_1"];
      backend.grants = new Set(["courses.supervise"]);
      await page.goto("http://127.0.0.1:4173/prepare/courses");
      await focusedHeading(page, "Prepare courses");
      await routeHygieneCheckpoint(page, "course-persisted");
      await contained(page);
      expect(
        backend.creates === 1 &&
          backend.collectionReads === 1 &&
          backend.detailReads.every((id) => id === "course_1"),
      ).toBe(true);
    });
});
