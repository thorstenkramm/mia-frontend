import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { courseBackend, courseRoutes } from "./courseFixtures";
import { materialBackend } from "./materialFixtures";
import { atBrowserZoom, protectedJourney } from "./routeFixtures";
import {
  routeHygieneCheckpoint,
  routeSecretFixture,
} from "./routeSecretHygiene";

test.use({ trace: "off", video: "off", screenshot: "off" });
const hub = "/prepare/courses/course_1";
const unknown =
  "Activation outcome unknown. Refresh to check the current course; this does not confirm what happened to this attempt.";
function eligible(control: Awaited<ReturnType<typeof courseRoutes>>) {
  control.scopeIds = ["course_1"];
  control.courseState = "inactive";
  control.activatedAt = null;
  control.deactivatedAt = null;
  control.readiness = "inactive_activatable";
  control.activationEligible = true;
  control.activationBlockers = [];
  control.blockers = [];
}
const contains = (page: Page, text: string) =>
  page
    .locator("main")
    .textContent()
    .then((value) => value?.includes(text) === true);
async function mounted(page: Page, label: string) {
  await expect
    .poll(() =>
      page
        .locator("h1")
        .textContent()
        .then((value) => value === label),
    )
    .toBe(true);
  expect(
    (await page.title()) === `${label} | MIA` &&
      (await page.locator("main").count()) === 1 &&
      (await page.locator("h1").count()) === 1,
  ).toBe(true);
}
async function layout(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.locator("main a, main button").evaluateAll((nodes) =>
      nodes.every((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width >= 24 && rect.height >= 24;
      }),
    ),
  ).toBe(true);
}
async function scan(page: Page) {
  expect(
    (await new AxeBuilder({ page }).analyze()).violations.length === 0,
  ).toBe(true);
}

test(
  "activation definitive response announces once and newer nonaccepting hub truth remains authoritative",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    eligible(control);
    control.activationReadiness = "active_not_accepting";
    await page.goto(`${hub}/activate`);
    await mounted(page, "Activate course");
    await page.evaluate(() => {
      for (const region of document.querySelectorAll("[aria-live]")) {
        region.setAttribute("data-confirmed-count", "0");
        new MutationObserver((records) => {
          for (const record of records)
            for (const node of record.addedNodes)
              if (node.textContent === "Course activation confirmed.")
                region.setAttribute(
                  "data-confirmed-count",
                  String(
                    Number(region.getAttribute("data-confirmed-count")) + 1,
                  ),
                );
        }).observe(region, { childList: true, subtree: true });
      }
    });
    await page.getByRole("button", { name: "Confirm activation" }).click();
    await mounted(page, "Course preparation");
    await expect
      .poll(() =>
        contains(
          page,
          "Active — not accepting new tutoring sessions; existing sessions may finish",
        ),
      )
      .toBe(true);
    await expect
      .poll(() =>
        page
          .locator("[aria-live]")
          .evaluateAll((nodes) =>
            nodes.reduce(
              (total, node) =>
                total + Number(node.getAttribute("data-confirmed-count")),
              0,
            ),
          ),
      )
      .toBe(1);
    await scan(page);
    expect(control.activations === 1 && control.activationValid).toBe(true);
  }),
);

test(
  "activation definitive success survives failed hub read without guessing current acceptance",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    eligible(control);
    await page.goto(`${hub}/activate`);
    await mounted(page, "Activate course");
    const dispatch = page.waitForRequest((request) =>
      new URL(request.url()).pathname.endsWith("/activations"),
    );
    const click = page
      .getByRole("button", { name: "Confirm activation" })
      .click();
    await dispatch;
    control.readUnavailable = true;
    await click;
    await mounted(page, "Course access unavailable");
    expect(
      control.activations === 1 &&
        control.courseState === "active" &&
        !(await contains(page, "Active — accepting new tutoring sessions")),
    ).toBe(true);
    control.readUnavailable = false;
    await page
      .getByRole("button", { name: "Check again", exact: true })
      .click();
    await mounted(page, "Course preparation");
    await expect
      .poll(() => contains(page, "Active — accepting new tutoring sessions"))
      .toBe(true);
    expect(control.activations === 1).toBe(true);
  }),
);

test(
  "activation connected approval readiness and keyboard confirmation end at authoritative hub",
  protectedJourney(async (page) => {
    const material = await materialBackend(page, { lifecycle: true });
    const control = material.course;
    material.persisted = true;
    material.makeReady();
    await page.goto(`${hub}/materials/material_1/approval`);
    await mounted(page, "Material approval");
    await page.locator('main input[type="checkbox"]').check();
    await page
      .getByRole("button", { name: "Approve material", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Approve material", exact: true })
      .click();
    await expect
      .poll(() => material.approved && material.approvals === 1)
      .toBe(true);
    // Readiness is controlled separately by the fake server; approval alone does
    // not grant activation in the client or this fixture.
    eligible(control);
    await page
      .getByRole("link", { name: "Course preparation", exact: true })
      .click();
    await mounted(page, "Course preparation");
    await page
      .getByRole("link", { name: "Course readiness", exact: true })
      .click();
    await mounted(page, "Course readiness");
    await scan(page);
    await page
      .getByRole("link", { name: "Activate course", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await mounted(page, "Activate course");
    expect(
      await page
        .locator("h1")
        .evaluate((node) => node === document.activeElement),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Confirm activation", exact: true })
      .focus();
    await scan(page);
    await routeHygieneCheckpoint(page, "activation-review");
    await page.keyboard.press("Enter");
    await mounted(page, "Course preparation");
    await expect
      .poll(() => contains(page, "Active — accepting new tutoring sessions"))
      .toBe(true);
    expect(
      control.activations === 1 &&
        control.activationValid &&
        control.collectionReads === 0 &&
        control.candidateReads === 0 &&
        (await page
          .locator('main a[href*="deactivate"], main a[href*="delete"]')
          .count()) === 0,
    ).toBe(true);
    expect(
      (await page
        .locator(
          `main a[href="${hub}/students"], main a[href="${hub}/students/new"]`,
        )
        .count()) === 2,
    ).toBe(true);
    await scan(page);
    await routeHygieneCheckpoint(page, "activation-hub");
  }),
);

test(
  "activation blocked readiness links resolve only implemented same-course prerequisites",
  protectedJourney(async (page) => {
    const material = await materialBackend(page);
    const control = material.course;
    control.scopeIds = ["course_1"];
    control.blockers.push({
      id: "supervisor_presence",
      link: "/api/v1/courses/course_1/supervisors",
    });
    await page.goto(`${hub}/readiness`);
    await mounted(page, "Course readiness");
    await expect.poll(() => page.locator("main dl a").count()).toBe(4);
    expect(
      (await page
        .locator('main a[href*="activate"], main a[href*="supervisors"]')
        .count()) === 0 &&
        (await contains(
          page,
          "An administrator must resolve supervisor assignment.",
        )),
    ).toBe(true);
    await scan(page);
    for (const [slug, label] of [
      ["learning-goals", "Learning goals"],
      ["ai-instructions", "AI instructions"],
      ["language", "Course language"],
      ["materials", "Course materials"],
    ]) {
      await page.locator(`main dl a[href="${hub}/${slug}"]`).click();
      await mounted(page, label ?? "");
      await page.goto(`${hub}/readiness`);
      await mounted(page, "Course readiness");
    }
    for (const link of [
      null,
      "/api/v1/courses/other/materials",
      "javascript:void(0)",
      "/api/v1/courses/course_1/materials?x=1",
    ]) {
      control.blockers = [{ id: "qualifying_material", link }];
      await page.reload();
      await mounted(page, "Course readiness");
      await expect.poll(() => page.locator("main dl").count()).toBe(1);
      expect((await page.locator("main dl a").count()) === 0).toBe(true);
    }
    await page.goto(`${hub}/activate`);
    await mounted(page, "Activate course");
    expect(
      (await page
        .getByRole("button", { name: "Confirm activation" })
        .getAttribute("aria-disabled")) === "true" && control.activations === 0,
    ).toBe(true);
  }),
);

for (const state of ["active_not_accepting", "previously-active"] as const)
  test(
    `activation ${state} never becomes reactivation or viewer session eligibility`,
    protectedJourney(async (page) => {
      const control = await courseBackend(page);
      eligible(control);
      control.activatedAt = "2026-10-08T12:00:00.000000Z";
      if (state === "active_not_accepting") {
        control.courseState = "active";
        control.readiness = state;
        control.activationEligible = false;
        control.activationBlockers = [
          "course_already_active",
          "qualifying_material",
        ];
        control.blockers = [
          {
            id: "qualifying_material",
            link: "/api/v1/courses/course_1/materials",
          },
        ];
      } else control.deactivatedAt = "2026-10-09T10:00:00.000000Z";
      await page.goto(`${hub}/activate`);
      await mounted(page, "Activate course");
      expect(
        (await page
          .getByRole("button", { name: "Confirm activation" })
          .getAttribute("aria-disabled")) === "true",
      ).toBe(true);
      await scan(page);
      await page
        .getByRole("link", { name: "Course preparation", exact: true })
        .click();
      await mounted(page, "Course preparation");
      await expect.poll(() => page.locator("main dl").count()).toBe(1);
      expect(
        control.activations === 0 &&
          (await page.locator('main a[href*="activate"]').count()) === 0 &&
          (state === "active_not_accepting"
            ? await contains(
                page,
                "Active — not accepting new tutoring sessions",
              )
            : await contains(page, "Reactivation is not available")),
      ).toBe(true);
    }),
  );

for (const outcome of [
  "conflict",
  "lose",
  "malformed",
  "server-error",
] as const)
  test(
    `activation ${outcome} requires explicit reconciliation without success or replay`,
    protectedJourney(async (page) => {
      const control = await courseBackend(page);
      eligible(control);
      control.activationOutcome = outcome;
      await page.goto(`${hub}/activate`);
      await mounted(page, "Activate course");
      await page.getByRole("button", { name: "Confirm activation" }).click();
      await expect
        .poll(() =>
          contains(
            page,
            outcome === "conflict" ? "Activation was not accepted." : unknown,
          ),
        )
        .toBe(true);
      expect(
        await page
          .locator("main h2")
          .last()
          .evaluate((node) => node === document.activeElement),
      ).toBe(true);
      await routeHygieneCheckpoint(page, "activation-outcome");
      await scan(page);
      await page.getByRole("button", { name: "Refresh", exact: true }).click();
      await expect.poll(() => control.detailReads.length === 3).toBe(true);
      expect(
        control.activations === 1 &&
          page.url().endsWith("/activate") &&
          !(await page.locator("body").textContent())?.includes(
            "Course activation confirmed.",
          ),
      ).toBe(true);
      if (outcome === "server-error") {
        await page
          .getByRole("button", { name: "Abandon unknown attempt" })
          .click();
        expect(
          (await page
            .getByRole("button", { name: "Confirm activation" })
            .getAttribute("aria-disabled")) === "true",
        ).toBe(true);
        await page
          .getByRole("button", { name: "Refresh", exact: true })
          .click();
        await expect
          .poll(() =>
            page
              .getByRole("button", { name: "Confirm activation" })
              .getAttribute("aria-disabled"),
          )
          .toBe("false");
      }
      await routeHygieneCheckpoint(page, "activation-reconciled");
    }),
  );

test(
  "activation stopped pending response and lifecycle teardown fence late navigation",
  protectedJourney(async (page) => {
    const control = await courseBackend(page);
    eligible(control);
    let release = () => {};
    control.activationRelease = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.goto(`${hub}/activate`);
    await mounted(page, "Activate course");
    await page.getByRole("button", { name: "Confirm activation" }).click();
    await expect.poll(() => control.activations === 1).toBe(true);
    await page.locator("form").evaluate((form) => {
      if (form instanceof HTMLFormElement) {
        form.requestSubmit();
        form.requestSubmit();
      }
    });
    await page.getByRole("button", { name: "Stop waiting" }).click();
    await expect.poll(() => contains(page, unknown)).toBe(true);
    await routeHygieneCheckpoint(page, "activation-stopped");
    release();
    await expect.poll(() => control.courseState === "active").toBe(true);
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect
      .poll(() => contains(page, "Active — accepting new tutoring sessions"))
      .toBe(true);
    expect(
      control.activations === 1 &&
        page.url().endsWith("/activate") &&
        (await contains(page, unknown)),
    ).toBe(true);
    const reads = control.detailReads.length;
    await page.evaluate(() => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("online"));
    });
    await expect
      .poll(() =>
        page.getByRole("button", { name: "Refresh", exact: true }).count(),
      )
      .toBe(1);
    expect(
      control.detailReads.length === reads &&
        !(await contains(page, routeSecretFixture(page).courseName)),
    ).toBe(true);
    await routeHygieneCheckpoint(page, "activation-cleared");
  }),
);

for (const locale of [
  "en-US",
  "de-DE",
  "es-ES",
  "es-AR",
  "fr-FR",
  "pt-PT",
  "pt-BR",
])
  for (const mode of ["standard", "large", "extra-large"])
    test(
      `activation readiness confirmation ${locale} ${mode} reflow at 320`,
      protectedJourney(async (page) => {
        const control = await courseBackend(page);
        eligible(control);
        control.name += " RTL العربية " + "long".repeat(80);
        await page.setViewportSize({ width: 320, height: 900 });
        const catalog: unknown = JSON.parse(
          readFileSync(
            new URL(
              `../src/platform/i18n/catalogs/${locale}.json`,
              import.meta.url,
            ),
            "utf8",
          ),
        );
        if (
          typeof catalog !== "object" ||
          catalog === null ||
          !("activation.heading" in catalog) ||
          typeof catalog["activation.heading"] !== "string" ||
          !("activation.readiness" in catalog) ||
          typeof catalog["activation.readiness"] !== "string"
        )
          throw new Error("Missing localized activation labels.");
        await page.goto("/login");
        await page.evaluate(
          ({ locale, mode }) => {
            localStorage.setItem("mia.interface.locale", locale);
            localStorage.setItem("mia.interface.text-size", mode);
          },
          { locale, mode },
        );
        for (const [surface, label] of [
          ["readiness", catalog["activation.readiness"]],
          ["activate", catalog["activation.heading"]],
        ]) {
          await page.goto(`${hub}/${surface}`);
          await mounted(page, label ?? "");
          await expect.poll(() => page.locator("main dl").count()).toBe(1);
          expect(
            (await page.locator("html").getAttribute("lang")) === locale,
          ).toBe(true);
          await layout(page);
          await scan(page);
        }
      }),
    );

for (const factor of [2, 4] as const)
  for (const mode of ["standard", "large", "extra-large"])
    test(`activation both surfaces browser zoom ${factor * 100} ${mode}`, async () =>
      atBrowserZoom(factor, async (page) => {
        const control = await courseRoutes(page);
        eligible(control);
        await page.evaluate(
          (mode) => localStorage.setItem("mia.interface.text-size", mode),
          mode,
        );
        for (const [surface, label] of [
          ["readiness", "Course readiness"],
          ["activate", "Activate course"],
        ]) {
          await page.goto(`http://127.0.0.1:4173${hub}/${surface}`);
          await mounted(page, label ?? "");
          await expect.poll(() => page.locator("main dl").count()).toBe(1);
          await layout(page);
          await page.evaluate(() => {
            for (const node of document.querySelectorAll("main *")) {
              if (!(node instanceof HTMLElement)) continue;
              node.style.setProperty("line-height", "1.5", "important");
              node.style.setProperty("letter-spacing", ".12em", "important");
              node.style.setProperty("word-spacing", ".16em", "important");
              if (node.tagName === "P")
                node.style.setProperty("margin-bottom", "2em", "important");
            }
          });
          await layout(page);
          await page.emulateMedia({
            forcedColors: "active",
            reducedMotion: "reduce",
          });
          await layout(page);
        }
      }));
