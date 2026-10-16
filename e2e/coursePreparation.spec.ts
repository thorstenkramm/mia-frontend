import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { courseBackend, courseRoutes } from "./courseFixtures";
import { presentationLocales } from "./presentationMatrix";
import {
  atBrowserZoom,
  expectInertTechnicalDetails,
  protectedJourney,
} from "./routeFixtures";
import { routeSecretFixture } from "./routeTestFixtures";

test.use({ trace: "off", video: "off", screenshot: "off" });
const hub = "/prepare/courses/course_1";
const goals = `${hub}/learning-goals`;
const field = (page: Page) => page.locator("#teaching-field");
async function ready(page: Page, name: string, unavailable = false) {
  await expect
    .poll(async () => (await page.title()) === `${name} | MIA`)
    .toBe(true);
  await expect
    .poll(async () =>
      page
        .getByRole("heading", {
          level: 1,
          name:
            name === "Course preparation" && !unavailable
              ? routeSecretFixture(page).courseName
              : name,
          exact: true,
        })
        .evaluate((node) => document.activeElement === node),
    )
    .toBe(true);
  expect(
    (await page.locator("main").count()) === 1 &&
      (await page.locator("h1").count()) === 1,
  ).toBe(true);
}
async function hasText(page: Page, value: string) {
  return page
    .locator("main")
    .textContent()
    .then((text) => text?.includes(value) === true);
}
async function reflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const box = await field(page).boundingBox();
  expect(
    box !== null && box.width <= (await page.evaluate(() => innerWidth)),
  ).toBe(true);
}
async function controlContrast(page: Page) {
  return page.evaluate(() => {
    const node = document.querySelector("#teaching-field");
    if (!(
      node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement
    ))
      throw new Error("Missing contrast control.");
    const context = document.createElement("canvas").getContext("2d");
    if (!context) throw new Error("Missing contrast canvas.");
    const lum = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const rgba = context.getImageData(0, 0, 1, 1).data;
      const alpha = (rgba[3] ?? 255) / 255;
      return [...rgba].slice(0, 3).reduce((sum, n, i) => {
        const c = (n * alpha + 255 * (1 - alpha)) / 255;
        return (
          sum +
          (i === 0 ? 0.2126 : i === 1 ? 0.7152 : 0.0722) *
            (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
        );
      }, 0);
    };
    const style = getComputedStyle(node),
      boundary = lum(style.outlineColor);
    const ratio = (background: number) =>
      (Math.max(boundary, background) + 0.05) /
      (Math.min(boundary, background) + 0.05);
    return {
      inside: ratio(lum(style.backgroundColor)),
      outside: ratio(
        lum(
          getComputedStyle(node.parentElement ?? document.body).backgroundColor,
        ),
      ),
      solid: style.outlineStyle === "solid",
      focused: document.activeElement === node,
    };
  });
}
const locales = ["en-US", "de-DE", "es-ES", "es-AR", "fr-FR", "pt-PT", "pt-BR"];
function catalog(locale: string): Record<string, string> {
  const result: unknown = JSON.parse(
    readFileSync(
      new URL(`../src/platform/i18n/catalogs/${locale}.json`, import.meta.url),
      "utf8",
    ),
  );
  if (typeof result !== "object" || result === null)
    throw new Error("Invalid test catalog.");
  const entries = Object.entries(result);
  if (
    !entries.every(
      (item): item is [string, string] => typeof item[1] === "string",
    )
  )
    throw new Error("Invalid test catalog entry.");
  return Object.fromEntries(entries);
}

test(
  "preparation connected fields persist independently without invented readiness",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    control.scopeIds = ["course_1"];
    const fixture = routeSecretFixture(page);
    await page.goto("/prepare/courses");
    await ready(page, "Prepare courses");
    await page.locator('main a[href="/prepare/courses/course_1"]').click();
    await ready(page, "Course preparation");
    const fields = [
      ["details", "Course details", "description"],
      ["curriculum", "Curriculum", "curriculum"],
      ["learning-goals", "Learning goals", "learning_goals"],
      ["ai-instructions", "AI instructions", "ai_tutor_instructions"],
      ["language", "Course language", "language"],
    ];
    for (const [slug, heading, attribute] of fields) {
      await page.locator(`main dl a[href="${hub}/${slug}"]`).click();
      await ready(page, heading ?? "");
      const value =
        attribute === "language" ? "ja" : `${fixture.teachingText}\n${slug}`;
      control.expectedPatch = { [attribute ?? ""]: value };
      await field(page).fill(value);
      await page.getByText("Exact plain-text preview", { exact: true }).click();
      expect(
        await page
          .locator("details[open] pre")
          .textContent()
          .then((text) => text === value),
      ).toBe(true);
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect
        .poll(() =>
          hasText(page, "Changes saved. The confirmed values are shown."),
        )
        .toBe(true);
      expect(
        control.patchValid && control.teaching[attribute ?? ""] === value,
      ).toBe(true);
      await page.reload();
      await ready(page, heading ?? "");
      await expect
        .poll(async () => (await field(page).inputValue()) === value)
        .toBe(true);
      await page
        .getByRole("link", { name: "Course preparation", exact: true })
        .click();
      await ready(page, "Course preparation");
    }
    expect(
      control.patches === 5 &&
        control.collectionReads === 0 &&
        control.candidateReads === 0,
    ).toBe(true);
    await expect
      .poll(() => hasText(page, "4 items block activation"))
      .toBe(true);
    expect(
      (await page
        .locator(
          'main a[href*="activate"], main a[href*="supervisors"], main a[href*="brief"], main a[href*="assignments"]',
        )
        .count()) === 0,
    ).toBe(true);
    expect(
      (await page.locator(`main a[href="${hub}/materials"]`).count()) === 2 &&
        (await page
          .getByRole("link", {
            name: "Choose material to review its brief",
            exact: true,
          })
          .count()) === 0,
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.length === 0,
    ).toBe(true);
  }),
);

test(
  "preparation scope gates prevent reads and changed assignments tear down drafts",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    await page.goto(goals);
    await ready(page, "Home");
    expect(control.detailReads.length === 0 && control.patches === 0).toBe(
      true,
    );
    control.scopeIds = ["course_1"];
    await page.goto(goals);
    await ready(page, "Learning goals");
    await field(page).waitFor();
    const normal = await controlContrast(page);
    expect(
      normal.inside >= 3 &&
        normal.outside >= 3 &&
        normal.solid &&
        !normal.focused,
    ).toBe(true);
    console.log(
      "Preparation normal outline contrast:",
      normal.inside.toFixed(3),
      normal.outside.toFixed(3),
    );
    await field(page).fill(routeSecretFixture(page).teachingText);
    await page
      .getByRole("link", { name: "Course preparation", exact: true })
      .click();
    await expect.poll(() => page.getByRole("dialog").count()).toBe(1);
    const before = control.detailReads.length;
    await page.evaluate(() => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("online"));
      window.dispatchEvent(new Event("pageshow"));
    });
    await expect
      .poll(() =>
        page.getByRole("button", { name: "Refresh", exact: true }).count(),
      )
      .toBe(1);
    expect(
      (await page.getByRole("dialog").count()) === 0 &&
        (await field(page).count()) === 0 &&
        control.detailReads.length === before,
    ).toBe(true);
    control.scopeIds = [];
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await ready(page, "Home");
    expect(control.detailReads.length === before && control.patches === 0).toBe(
      true,
    );
  }),
);

test(
  "preparation authoritative readiness and safe blocker links remain distinct",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    control.scopeIds = ["course_1"];
    for (const [state, text] of [
      ["inactive_incomplete", "4 items block activation"],
      ["inactive_activatable", "Ready to activate"],
      ["active_accepting", "Active — open for new tutoring sessions"],
      [
        "active_not_accepting",
        "Active, but new tutoring sessions are unavailable",
      ],
    ] as const) {
      control.readiness = state;
      control.courseState = state.startsWith("active_") ? "active" : "inactive";
      control.activatedAt =
        control.courseState === "active" ? "2026-10-09T12:00:00.000000Z" : null;
      // Only the explicitly eligible first activation has the readiness entry.
      control.activationEligible = state === "inactive_activatable";
      control.activationBlockers =
        state === "inactive_activatable"
          ? []
          : control.courseState === "active"
            ? ["course_already_active"]
            : ["assigned_supervisor_required"];
      control.blockers =
        state === "inactive_activatable" || state === "active_accepting"
          ? []
          : [
              { id: "learning_goals", link: "https://example.test" },
              { id: "language", link: "/api/v1/courses/other" },
              {
                id: "qualifying_material",
                link: "/api/v1/courses/course_1/materials",
              },
              { id: "supervisor_presence", link: null },
            ];
      await page.goto(hub);
      await ready(page, "Course preparation");
      await expect.poll(() => hasText(page, text)).toBe(true);
      const materialBlocked = control.blockers.some(
        (blocker) => blocker.id === "qualifying_material",
      );
      expect(
        (await page.locator("main dl a").count()) === 5 &&
          (await page.locator(`main a[href="${hub}/materials"]`).count()) ===
            (materialBlocked ? 2 : 1) &&
          (await page
            .locator(
              'main a[href*="activate"], main a[href*="supervisors"], main a[href*="assignments"], main a[href*="brief"], main a[href^="/api/"], main a[href^="https:"]',
            )
            .count()) === 0,
      ).toBe(true);
    }
    expect(control.patches === 0 && control.collectionReads === 0).toBe(true);
    control.readiness = "inactive_activatable";
    control.courseState = "inactive";
    control.activatedAt = "2026-10-08T10:00:00.000000Z";
    control.deactivatedAt = "2026-10-09T10:00:00.000000Z";
    control.activationEligible = true;
    control.activationBlockers = [];
    control.blockers = [];
    await page.goto(hub);
    await ready(page, "Course preparation");
    await expect
      .poll(() =>
        hasText(page, "Activating it again is not available on this page."),
      )
      .toBe(true);
    expect((await page.locator('main a[href*="activate"]').count()) === 0).toBe(
      true,
    );
    control.readUnavailable = true;
    await page.goto(hub);
    await ready(page, "Course preparation", true);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Readiness could not be checked",
      }),
    ).toBeVisible();
    expect(!(await hasText(page, routeSecretFixture(page).courseName))).toBe(
      true,
    );
    await expectInertTechnicalDetails(page, routeSecretFixture(page).rawError);
  }),
);

test(
  "hub saved content and blockers reflow in every locale and text mode",
  protectedJourney(async (page) => {
    test.setTimeout(120_000);
    const control = await courseBackend(page);
    control.scopeIds = ["course_1"];
    control.teaching.language = "en";
    control.teaching.learning_goals = routeSecretFixture(page).teachingText;
    control.blockers = [
      {
        id: "supervisor_presence",
        link: "/api/v1/courses/course_1/supervisors",
      },
      { id: "qualifying_material", link: "/api/v1/courses/course_1/materials" },
    ];
    control.activationBlockers = control.blockers.map((blocker) => blocker.id);
    await page.goto("/");
    for (const locale of locales)
      for (const mode of ["standard", "large", "extra-large"]) {
        await page.evaluate(
          ({ locale, mode }) => {
            localStorage.setItem("mia.interface.locale", locale);
            localStorage.setItem("mia.interface.text-size", mode);
          },
          { locale, mode },
        );
        await page.setViewportSize({ width: 320, height: 900 });
        await page.goto(hub);
        expect(
          await page
            .locator("h1 bdi")
            .evaluate(
              (node, expected) => node.textContent === expected,
              routeSecretFixture(page).courseName,
            ),
        ).toBe(true);
        const labels = catalog(locale);
        await expect(
          page.getByRole("heading", {
            name: labels["preparation.setup.heading"],
            level: 2,
          }),
        ).toBeVisible();
        expect(await hasText(page, `(en)`)).toBe(true);
        expect(
          await page.evaluate(
            (expected) =>
              document.documentElement.scrollWidth <= innerWidth &&
              document.documentElement.lang === expected,
            locale,
          ),
        ).toBe(true);
        expect(
          (await page
            .locator('main a[href*="supervisors"], main a[href^="/api/"]')
            .count()) === 0,
        ).toBe(true);
      }
    await page.setViewportSize({ width: 390, height: 900 });
    await page.reload();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      control.collectionReads === 0 &&
        control.candidateReads === 0 &&
        control.detailReads.every((path) => path === "course_1"),
    ).toBe(true);
  }),
);

test(
  "hub keeps long saved details and language tag readable at narrow widths",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    control.scopeIds = ["course_1"];
    const fixture = routeSecretFixture(page);
    control.name = `${fixture.courseName} `.repeat(8);
    control.teaching.description = fixture.teachingText.repeat(8);
    control.teaching.language = "zh-Hant-TW";
    await page.goto("/");
    for (const mode of ["standard", "large", "extra-large"]) {
      await page.evaluate(
        (value) => localStorage.setItem("mia.interface.text-size", value),
        mode,
      );
      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto(hub);
      await expect(
        page.getByRole("heading", { level: 2, name: "Course setup" }),
      ).toBeVisible();
      for (const [slug, saved] of [
        ["language", "zh-Hant-TW"],
        ["details", control.teaching.description],
      ] as const) {
        const value = page.locator(
          `main dl > div:has(a[href="${hub}/${slug}"]) dd > span > span:first-child`,
        );
        expect(
          await value.evaluate((node, expected) => {
            if (!(node instanceof HTMLElement)) return false;
            const description = node.closest("dd");
            if (!description || !node.textContent?.includes(expected))
              return false;
            const walker = document.createTreeWalker(
              node,
              NodeFilter.SHOW_TEXT,
            );
            let last: Text | null = null;
            while (walker.nextNode()) {
              if (
                walker.currentNode instanceof Text &&
                walker.currentNode.textContent?.trim()
              )
                last = walker.currentNode;
            }
            if (!last) return false;
            const range = document.createRange();
            range.setStart(last, last.length - 1);
            range.setEnd(last, last.length);
            const glyph = range.getBoundingClientRect();
            const box = description.getBoundingClientRect();
            return (
              getComputedStyle(node).webkitLineClamp === "none" &&
              glyph.height > 0 &&
              glyph.bottom <= box.bottom + 1 &&
              glyph.right <= box.right + 1 &&
              description.scrollWidth <= description.clientWidth + 1 &&
              document.documentElement.scrollWidth <= innerWidth
            );
          }, saved ?? ""),
        ).toBe(true);
      }
    }
    expect(control.detailReads.every((id) => id === "course_1")).toBe(true);
  }),
);

test("hub remains operable at real 400 percent zoom", async () => {
  await atBrowserZoom(4, async (page) => {
    const control = await courseRoutes(page);
    control.scopeIds = ["course_1"];
    await page.goto(hub);
    expect(
      await page
        .locator("h1 bdi")
        .evaluate(
          (node, expected) => node.textContent === expected,
          routeSecretFixture(page).courseName,
        ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("link", { name: /Course students/u }),
    ).toBeVisible();
    expect(control.collectionReads === 0).toBe(true);
  });
});

test(
  "preparation hidden save denial removes preview and reveals only inert technical error",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    control.scopeIds = ["course_1"];
    const fixture = routeSecretFixture(page);
    await page.goto(goals);
    await ready(page, "Learning goals");
    await field(page).fill(fixture.teachingText);
    await page.getByText("Exact plain-text preview", { exact: true }).click();
    control.denial = true;
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await ready(page, "Course access unavailable");
    expect(
      (await field(page).count()) === 0 &&
        !(await hasText(page, fixture.courseName)) &&
        !(await hasText(page, fixture.teachingText)) &&
        !(await hasText(page, fixture.rawError)),
    ).toBe(true);
    expect(
      (await page
        .getByRole("button", { name: "Technical details", exact: true })
        .getAttribute("aria-expanded")) === "false",
    ).toBe(true);
    await expectInertTechnicalDetails(page, fixture.rawError);
  }),
);

test(
  "preparation unknown PATCH reconciles current values without unsafe replay",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    control.scopeIds = ["course_1"];
    const fixture = routeSecretFixture(page);
    for (const outcome of ["lose", "malformed", "server-error"] as const) {
      const before = control.patches;
      control.teaching.learning_goals = null;
      control.patchOutcome = outcome;
      control.expectedPatch = { learning_goals: fixture.teachingText };
      await page.goto(goals);
      await ready(page, "Learning goals");
      await field(page).fill(fixture.teachingText);
      await page
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
      await expect
        .poll(() => hasText(page, "Save outcome unknown."))
        .toBe(true);
      await expect
        .poll(() => field(page).getAttribute("readonly"))
        .not.toBe(null);
      expect(
        control.patches === before + 1 &&
          !(await hasText(page, "Changes saved.")),
      ).toBe(true);
      control.teaching.learning_goals = null;
      await page
        .getByRole("button", { name: "Check current course", exact: true })
        .click();
      await expect
        .poll(() =>
          page
            .getByRole("heading", { name: "Current persisted value" })
            .count(),
        )
        .toBe(1);
      expect(
        (await field(page).inputValue()) === fixture.teachingText &&
          control.patches === before + 1,
      ).toBe(true);
      control.teaching.learning_goals = fixture.teachingText;
      await page
        .getByRole("button", { name: "Check current course", exact: true })
        .click();
      await expect.poll(() => field(page).getAttribute("readonly")).toBe(null);
      expect(
        control.patches === before + 1 &&
          !(await hasText(page, "Changes saved.")),
      ).toBe(true);
    }
  }),
);

test(
  "preparation Stop waiting fences late success and dirty history guards navigation",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    control.scopeIds = ["course_1"];
    const fixture = routeSecretFixture(page);
    await page.goto(hub);
    await ready(page, "Course preparation");
    await page.locator(`main dl a[href="${goals}"]`).click();
    await ready(page, "Learning goals");
    await field(page).fill(fixture.teachingText);
    await page.goBack();
    await expect.poll(() => page.getByRole("dialog").count()).toBe(1);
    await page
      .getByRole("button", { name: "Stay on this page", exact: true })
      .click();
    expect((await field(page).inputValue()) === fixture.teachingText).toBe(
      true,
    );
    let release = () => {};
    control.patchRelease = new Promise<void>((resolve) => {
      release = resolve;
    });
    control.expectedPatch = { learning_goals: fixture.teachingText };
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Stop waiting", exact: true })
      .click();
    release();
    await expect
      .poll(() => control.teaching.learning_goals === fixture.teachingText)
      .toBe(true);
    expect(
      !(await hasText(page, "Changes saved.")) && control.patches === 1,
    ).toBe(true);
    await page
      .getByRole("button", { name: "Check current course", exact: true })
      .click();
    await expect.poll(() => field(page).getAttribute("readonly")).toBe(null);
    await field(page).fill(fixture.teachingText + " ");
    const persisted = fixture.teachingText + " persisted";
    control.teaching.learning_goals = persisted;
    await page
      .getByRole("button", { name: "Check current course", exact: true })
      .click();
    const currentSection = page
      .getByRole("heading", { name: "Current persisted value", exact: true })
      .locator("..");
    await expect
      .poll(
        async () =>
          (await currentSection.locator("pre").textContent()) === persisted,
      )
      .toBe(true);
    expect(
      (await field(page).inputValue()) === fixture.teachingText + " " &&
        control.patches === 1,
    ).toBe(true);
    const reads = control.detailReads.length;
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await page
      .getByRole("button", { name: "Stay on this page", exact: true })
      .click();
    expect(
      control.detailReads.length === reads &&
        (await field(page).inputValue()) === fixture.teachingText + " ",
    ).toBe(true);
    await page
      .getByRole("link", { name: "Course preparation", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Discard and leave", exact: true })
      .click();
    await ready(page, "Course preparation");
  }),
);

test(
  "preparation stopped operations retain applicable hidden denial teardown",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    control.scopeIds = ["course_1"];
    const fixture = routeSecretFixture(page);
    for (const operation of ["PATCH", "GET"]) {
      control.denial = false;
      await page.goto(goals);
      await ready(page, "Learning goals");
      await field(page).fill(fixture.teachingText);
      await page.getByText("Exact plain-text preview", { exact: true }).click();
      let release = () => {};
      const barrier = new Promise<void>((resolve) => {
        release = resolve;
      });
      const reads = control.detailReads.length,
        patches = control.patches;
      if (operation === "PATCH") {
        control.patchRelease = barrier;
        control.expectedPatch = { learning_goals: fixture.teachingText };
      } else control.readRelease = barrier;
      await page
        .getByRole("button", {
          name: operation === "PATCH" ? "Save changes" : "Check current course",
          exact: true,
        })
        .click();
      await expect
        .poll(() =>
          operation === "PATCH"
            ? control.patches === patches + 1
            : control.detailReads.length === reads + 1,
        )
        .toBe(true);
      await page
        .getByRole("button", { name: "Stop waiting", exact: true })
        .click();
      if (operation === "GET") {
        await page
          .getByRole("link", { name: "Course preparation", exact: true })
          .click();
        await expect.poll(() => page.getByRole("dialog").count()).toBe(1);
      }
      control.denial = true;
      release();
      await ready(page, "Course access unavailable");
      expect(
        (await field(page).count()) === 0 &&
          !(await hasText(page, fixture.courseName)) &&
          !(await hasText(page, fixture.teachingText)) &&
          !(await hasText(page, fixture.rawError)) &&
          (await page.getByRole("dialog").count()) === 0 &&
          (await page
            .getByRole("button", { name: "Technical details", exact: true })
            .getAttribute("aria-expanded")) === "false",
      ).toBe(true);
      await page
        .getByRole("button", { name: "Technical details", exact: true })
        .click();
      expect(
        await page
          .locator("pre")
          .textContent()
          .then((text) => text?.includes(fixture.rawError) === true),
      ).toBe(true);
      expect(
        control.patches === patches + (operation === "PATCH" ? 1 : 0) &&
          control.detailReads.length === reads + (operation === "GET" ? 1 : 0),
      ).toBe(true);
      control.readRelease = null;
      control.patchRelease = null;
    }
  }),
);

test(
  "preparation pending dirty reads guard hub Home Back unload and yield to security",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    control.scopeIds = ["course_1"];
    const fixture = routeSecretFixture(page);
    for (const destination of ["hub", "Home", "Back"]) {
      await page.goto(hub);
      await ready(page, "Course preparation");
      await page.locator(`main dl a[href="${goals}"]`).click();
      await ready(page, "Learning goals");
      await field(page).fill(fixture.teachingText);
      let release = () => {};
      control.readRelease = new Promise<void>((resolve) => {
        release = resolve;
      });
      const reads = control.detailReads.length;
      await page
        .getByRole("button", { name: "Check current course", exact: true })
        .click();
      await expect
        .poll(() => control.detailReads.length === reads + 1)
        .toBe(true);
      expect(
        await page.evaluate(() => {
          const event = new Event("beforeunload", { cancelable: true });
          window.dispatchEvent(event);
          return event.defaultPrevented;
        }),
      ).toBe(true);
      if (destination === "hub") {
        let nativePrompt = false;
        // Use a document-initiated reload: protocol reload can bypass unload.
        await Promise.all([
          page
            .waitForEvent("dialog", { timeout: 5000 })
            .then(async (dialog) => {
              nativePrompt = dialog.type() === "beforeunload";
              await dialog.dismiss();
            }),
          page.evaluate(() => window.location.reload()),
        ]);
        expect(
          nativePrompt &&
            (await field(page).inputValue()) === fixture.teachingText,
        ).toBe(true);
      }
      const leave = async () => {
        if (destination === "Back") await page.goBack();
        else
          await page
            .getByRole("link", {
              name: destination === "hub" ? "Course preparation" : "Home",
              exact: true,
            })
            .click();
      };
      await leave();
      await expect.poll(() => page.getByRole("dialog").count()).toBe(1);
      await page
        .getByRole("button", { name: "Stay on this page", exact: true })
        .click();
      expect(
        (await field(page).inputValue()) === fixture.teachingText &&
          control.detailReads.length === reads + 1,
      ).toBe(true);
      await leave();
      await expect.poll(() => page.getByRole("dialog").count()).toBe(1);
      if (destination === "Back") {
        await page.evaluate(() => window.dispatchEvent(new Event("focus")));
        await expect
          .poll(() =>
            page.getByRole("button", { name: "Refresh", exact: true }).count(),
          )
          .toBe(1);
        expect(
          (await page.getByRole("dialog").count()) === 0 &&
            (await field(page).count()) === 0 &&
            !(await hasText(page, fixture.teachingText)) &&
            control.detailReads.length === reads + 1,
        ).toBe(true);
        release();
        control.readRelease = null;
        control.scopeIds = [];
        await page
          .getByRole("button", { name: "Refresh", exact: true })
          .click();
        await ready(page, "Home");
        expect(
          control.detailReads.length === reads + 1 && control.patches === 0,
        ).toBe(true);
      } else {
        control.readRelease = null;
        await page
          .getByRole("button", { name: "Discard and leave", exact: true })
          .click();
        await ready(
          page,
          destination === "hub" ? "Course preparation" : "Home",
        );
        release();
        expect(
          !(await hasText(page, fixture.teachingText)) && control.patches === 0,
        ).toBe(true);
      }
    }
  }),
);

test(
  "preparation invalid fields have corrective semantics and measured contrast",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    control.scopeIds = ["course_1"];
    await page.goto(goals);
    await ready(page, "Learning goals");
    await field(page).fill(
      routeSecretFixture(page).teachingText + "😀".repeat(16001),
    );
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect
      .poll(() => field(page).getAttribute("aria-invalid"))
      .toBe("true");
    expect(
      control.patches === 0 &&
        (await field(page).evaluate(
          (node) =>
            document.activeElement === node &&
            node
              .getAttribute("aria-describedby")
              ?.includes("teaching-error") === true,
        )),
    ).toBe(true);
    await page.locator("h1").focus();
    const ratios = await controlContrast(page);
    expect(
      ratios.inside >= 3 &&
        ratios.outside >= 3 &&
        ratios.solid &&
        !ratios.focused,
    ).toBe(true);
    console.log(
      "Preparation invalid unfocused outline contrast:",
      ratios.inside.toFixed(3),
      ratios.outside.toFixed(3),
    );
    await field(page).fill(routeSecretFixture(page).teachingText);
    const focused = await controlContrast(page);
    expect(
      focused.inside >= 3 &&
        focused.outside >= 3 &&
        focused.focused &&
        focused.solid,
    ).toBe(true);
    console.log(
      "Preparation focused outline contrast:",
      focused.inside.toFixed(3),
      focused.outside.toFixed(3),
    );
    expect((await field(page).getAttribute("aria-invalid")) === "false").toBe(
      true,
    );
    control.patchOutcome = "reject";
    control.expectedPatch = {
      learning_goals: routeSecretFixture(page).teachingText,
    };
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect
      .poll(() => field(page).getAttribute("aria-invalid"))
      .toBe("true");
    const scan = await new AxeBuilder({ page }).analyze();
    expect(scan.violations.length === 0).toBe(true);
  }),
);

test(
  "preparation mobile departure preserves focus then security clears delayed save",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    control.scopeIds = ["course_1"];
    const fixture = routeSecretFixture(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(goals);
    await ready(page, "Learning goals");
    await field(page).fill(fixture.teachingText);
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Home", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Stay on this page", exact: true })
      .click();
    await expect
      .poll(() =>
        field(page).evaluate((node) => document.activeElement === node),
      )
      .toBe(true);
    expect((await field(page).inputValue()) === fixture.teachingText).toBe(
      true,
    );
    let release = () => {};
    control.patchRelease = new Promise<void>((resolve) => {
      release = resolve;
    });
    control.expectedPatch = { learning_goals: fixture.teachingText };
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect.poll(() => control.patches).toBe(1);
    const reads = control.detailReads.length;
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect.poll(() => field(page).count()).toBe(0);
    release();
    await expect
      .poll(() => control.teaching.learning_goals === fixture.teachingText)
      .toBe(true);
    expect(
      !(await hasText(page, fixture.teachingText)) &&
        !(await hasText(page, "Changes saved.")) &&
        control.detailReads.length === reads,
    ).toBe(true);
    await page.emulateMedia({ media: "print" });
    expect(
      await page.evaluate(
        () =>
          getComputedStyle(document.getElementById("root") ?? document.body)
            .display === "none",
      ),
    ).toBe(true);
  }),
);

test(
  "preparation reflows across all locales text modes spacing and forced colors",
  protectedJourney(async (page) => {
    test.setTimeout(120_000);
    const control = await courseBackend(page);
    control.scopeIds = ["course_1"];
    await page.goto("/");
    for (const locale of presentationLocales(locales, "course"))
      for (const mode of ["standard", "large", "extra-large"]) {
        const labels = catalog(locale);
        await page.evaluate(
          ({ locale, mode }) => {
            localStorage.setItem("mia.interface.locale", locale);
            localStorage.setItem("mia.interface.text-size", mode);
          },
          { locale, mode },
        );
        await page.setViewportSize({ width: 320, height: 900 });
        for (const [slug, key] of [
          ["details", "details"],
          ["curriculum", "curriculum"],
          ["learning-goals", "goals"],
          ["ai-instructions", "instructions"],
          ["language", "language"],
        ] as const) {
          await page.goto(`${hub}/${slug}`);
          await ready(page, labels[`preparation.${key}`] ?? "");
          await field(page).fill(routeSecretFixture(page).teachingText);
          await reflow(page);
          expect(
            await page.evaluate(
              ({ locale, mode }) =>
                document.documentElement.lang === locale &&
                getComputedStyle(document.documentElement).fontSize ===
                  (mode === "standard"
                    ? "16px"
                    : mode === "large"
                      ? "18px"
                      : "20px"),
              { locale, mode },
            ),
          ).toBe(true);
          await page.evaluate(() => {
            for (const element of document.querySelectorAll<HTMLElement>("*")) {
              element.style.setProperty("line-height", "1.5", "important");
              element.style.setProperty("letter-spacing", ".12em", "important");
              element.style.setProperty("word-spacing", ".16em", "important");
              if (element.tagName === "P")
                element.style.setProperty("margin-bottom", "2em", "important");
            }
          });
          await reflow(page);
        }
      }
    await page.emulateMedia({
      forcedColors: "active",
      reducedMotion: "reduce",
    });
    await reflow(page);
    expect(control.patches === 0).toBe(true);
  }),
);

test("preparation connected process remains usable at real 200 percent zoom", async () => {
  await atBrowserZoom(2, async (page) => {
    const control = await courseRoutes(page);
    control.scopeIds = ["course_1"];
    const fixture = routeSecretFixture(page);
    await page.goto("http://127.0.0.1:4173/");
    for (const mode of ["standard", "large", "extra-large"]) {
      await page.evaluate(
        (mode) => localStorage.setItem("mia.interface.text-size", mode),
        mode,
      );
      for (const [slug, heading, attribute] of [
        ["details", "Course details", "description"],
        ["curriculum", "Curriculum", "curriculum"],
        ["learning-goals", "Learning goals", "learning_goals"],
        ["ai-instructions", "AI instructions", "ai_tutor_instructions"],
        ["language", "Course language", "language"],
      ] as const) {
        await page.goto(`http://127.0.0.1:4173${hub}/${slug}`);
        await ready(page, heading);
        const value =
          attribute === "language"
            ? mode === "large"
              ? "ja"
              : "en-GB"
            : `${fixture.teachingText} ${mode}`;
        control.expectedPatch = { [attribute]: value };
        await field(page).fill(value);
        await reflow(page);
        await page
          .getByRole("button", { name: "Save changes", exact: true })
          .click();
        await expect.poll(() => hasText(page, "Changes saved.")).toBe(true);
        await page
          .getByRole("link", { name: "Course preparation", exact: true })
          .click();
        await ready(page, "Course preparation");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
    }
  });
});
