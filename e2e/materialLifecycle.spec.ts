import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { materialBackend } from "./materialFixtures";
import { atBrowserZoom, protectedJourney } from "./routeFixtures";
import { routeSecretFixture } from "./routeSecretHygiene";

test.use({ screenshot: "off", trace: "off", video: "off" });
const material = "/prepare/courses/course_1/materials/material_1";
async function mounted(page: Page, label: string) {
  await expect
    .poll(
      () =>
        page
          .locator("h1")
          .textContent()
          .then((text) => text === label),
      { message: "Route heading admission" },
    )
    .toBe(true);
  expect(
    (await page.locator("main").count()) === 1 &&
      (await page.title()) === `${label} | MIA`,
  ).toBe(true);
}
const contains = (page: Page, value: string) =>
  page
    .locator("main")
    .textContent()
    .then((text) => text?.includes(value) === true);
async function approve(page: Page) {
  await page.locator('main input[type="checkbox"]').check();
  await page
    .getByRole("button", { name: "Approve material", exact: true })
    .click();
  await expect
    .poll(() =>
      page
        .getByRole("dialog")
        .evaluate(
          (node) =>
            document.activeElement?.textContent === "Cancel" &&
            node.contains(document.activeElement),
        ),
    )
    .toBe(true);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Approve material", exact: true })
    .click();
}
async function observeAnnouncements(page: Page) {
  await page.evaluate(() => {
    for (const region of document.querySelectorAll("[aria-live]")) {
      let processing = 0,
        unknown = 0,
        jobs = 0;
      region.setAttribute("data-processing-count", "0");
      region.setAttribute("data-unknown-count", "0");
      region.setAttribute("data-jobs-count", "0");
      new MutationObserver((records) => {
        for (const record of records)
          for (const node of record.addedNodes) {
            const text = node.textContent ?? "";
            if (text === "Processing")
              region.setAttribute(
                "data-processing-count",
                String(++processing),
              );
            if (text.startsWith("Outcome unknown."))
              region.setAttribute("data-unknown-count", String(++unknown));
            if (text.startsWith("Material processing job:"))
              region.setAttribute("data-jobs-count", String(++jobs));
          }
      }).observe(region, { childList: true, subtree: true });
    }
  });
}
const announcementCount = (page: Page, kind: string) =>
  page
    .locator("[aria-live]")
    .evaluateAll(
      (nodes, kind) =>
        nodes.reduce(
          (sum, node) => sum + Number(node.getAttribute(`data-${kind}-count`)),
          0,
        ),
      kind,
    );
test(
  "material lifecycle connects explicit processing refresh correction deliberate approval and revocation",
  protectedJourney(async (page) => {
    const control = await materialBackend(page, { lifecycle: true });
    control.persisted = true;
    const fixture = routeSecretFixture(page);
    await page.goto(`${material}/files`);
    await mounted(page, "Course material files");
    await page.locator("#material-picker").setInputFiles({
      name: `${fixture.courseName}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(fixture.teachingText),
    });
    await page
      .getByRole("button", { name: "Queue selected files", exact: true })
      .click();
    await expect
      .poll(() => control.uploads === 1 && control.fileReads >= 2)
      .toBe(true);
    await page
      .getByRole("button", {
        name: "Accept authoritative file list",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Finalize and process", exact: true })
      .click();
    await observeAnnouncements(page);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Finalize and process", exact: true })
      .click();
    await mounted(page, "Course material processing");
    await expect.poll(() => announcementCount(page, "processing")).toBe(1);
    await expect
      .poll(
        async () =>
          control.finalizes === 1 &&
          control.jobReads === 1 &&
          (await contains(page, "Technical readiness")) &&
          (await contains(page, "Educational approval")),
      )
      .toBe(true);
    const before = [control.reads, control.jobReads, control.fileReads].join();
    await page.waitForTimeout(150);
    expect(
      [control.reads, control.jobReads, control.fileReads].join() === before,
    ).toBe(true);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => control.jobReads === 2).toBe(true);
    control.makeReady();
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect
      .poll(() =>
        page
          .locator(`a[href="${material}/brief"]`)
          .count()
          .then((count) => count > 0),
      )
      .toBe(true);
    await page.locator(`a[href="${material}/brief"]`).click();
    await mounted(page, "Review material brief");
    await page
      .locator("#brief-summary")
      .fill(`${fixture.teachingText} corrected`);
    await page
      .getByRole("button", { name: "Save complete brief", exact: true })
      .click();
    await expect
      .poll(
        () =>
          control.saves === 1 &&
          contains(page, "Returned material state saved."),
      )
      .toBe(true);
    await page.locator(`a[href="${material}/approval"]`).click();
    await mounted(page, "Material approval");
    await approve(page);
    await expect
      .poll(() => control.approvals === 1 && control.approved)
      .toBe(true);
    await page.locator(`a[href="${material}/brief"]`).click();
    await mounted(page, "Review material brief");
    await page
      .locator("#brief-summary")
      .fill(`${fixture.teachingText} changed again`);
    await page
      .getByRole("button", { name: "Save complete brief", exact: true })
      .click();
    await expect
      .poll(() => control.saves === 2 && !control.approved)
      .toBe(true);
    await expect
      .poll(() => contains(page, "Educational approval revoked."))
      .toBe(true);
    await page.locator(`a[href="${material}/approval"]`).click();
    await mounted(page, "Material approval");
    await approve(page);
    await expect
      .poll(() => control.approvals === 2 && control.approved)
      .toBe(true);
    await page.locator(`a[href="${material}/approval/revoke"]`).click();
    await mounted(page, "Revoke material approval");
    await page
      .getByRole("button", { name: "Revoke material approval", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Revoke material approval", exact: true })
      .click();
    await mounted(page, "Course material");
    expect(
      control.revokes === 1 &&
        !control.approved &&
        control.lifecycleValid &&
        control.forbidden === 0,
    ).toBe(true);
  }),
);
for (const disposition of ["stop", "teardown"] as const)
  test(
    `material delayed finalization ${disposition} never replays a retired transition`,
    protectedJourney(async (page) => {
      const control = await materialBackend(page, { lifecycle: true });
      control.persisted = true;
      control.files = ["file_1"];
      let release: () => void = () => undefined;
      control.lifecycleRelease = new Promise<void>((resolve) => {
        release = resolve;
      });
      try {
        await page.goto(`${material}/files`);
        await mounted(page, "Course material files");
        await observeAnnouncements(page);
        await page
          .getByRole("button", {
            name: "Accept authoritative file list",
            exact: true,
          })
          .click();
        await page
          .getByRole("button", { name: "Finalize and process", exact: true })
          .click();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Finalize and process", exact: true })
          .click();
        await expect.poll(() => control.finalizes).toBe(1);
        if (disposition === "stop") {
          await page
            .getByRole("button", { name: "Stop waiting", exact: true })
            .click();
          await expect.poll(() => announcementCount(page, "unknown")).toBe(1);
        } else
          await page.evaluate(() =>
            window.dispatchEvent(
              new PageTransitionEvent("pagehide", { persisted: true }),
            ),
          );
        release();
        await page.waitForTimeout(150);
        expect(await announcementCount(page, "unknown")).toBe(
          disposition === "stop" ? 1 : 0,
        );
        expect(await announcementCount(page, "processing")).toBe(0);
        expect(
          control.finalizes === 1 &&
            new URL(page.url()).pathname === `${material}/files`,
        ).toBe(true);
      } finally {
        release();
      }
    }),
  );
test(
  "material Refresh announces changed observed jobs but not static entry unchanged reads pagination or teardown",
  protectedJourney(async (page) => {
    const control = await materialBackend(page, { lifecycle: true });
    control.state = "processing";
    await page.goto(`${material}/processing`);
    await mounted(page, "Course material processing");
    expect(
      (await page.locator('[aria-live="polite"]').textContent()) === "",
    ).toBe(true);
    await observeAnnouncements(page);
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect.poll(() => control.jobReads).toBe(2);
    await expect
      .poll(() =>
        page.getByRole("button", { name: "Refresh", exact: true }).isEnabled(),
      )
      .toBe(true);
    expect(await announcementCount(page, "jobs")).toBe(0);
    control.jobState = "running";
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect.poll(() => announcementCount(page, "jobs")).toBe(1);
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect.poll(() => control.jobReads).toBe(4);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => control.jobReads).toBe(5);
    await expect
      .poll(() =>
        page.getByRole("button", { name: "Previous", exact: true }).isEnabled(),
      )
      .toBe(true);
    expect(await announcementCount(page, "jobs")).toBe(1);
    await page.getByRole("button", { name: "Previous", exact: true }).click();
    await expect.poll(() => control.jobReads).toBe(6);
    await expect
      .poll(() =>
        page.getByRole("button", { name: "Refresh", exact: true }).isEnabled(),
      )
      .toBe(true);
    expect(await announcementCount(page, "jobs")).toBe(1);
    control.jobState = "failed";
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await expect.poll(() => announcementCount(page, "jobs")).toBe(2);
    expect(
      (await page.locator('[aria-live="assertive"]').textContent()) ===
        "Material processing job: Failed.",
    ).toBe(true);
    let release: () => void = () => undefined;
    control.jobRelease = new Promise<void>((resolve) => {
      release = resolve;
    });
    control.jobState = "running";
    try {
      await page.getByRole("button", { name: "Refresh", exact: true }).click();
      await expect.poll(() => control.jobReads).toBe(8);
      await page.evaluate(() =>
        window.dispatchEvent(
          new PageTransitionEvent("pagehide", { persisted: true }),
        ),
      );
      release();
      await page.waitForTimeout(150);
      expect(await announcementCount(page, "jobs")).toBe(2);
    } finally {
      release();
    }
  }),
);
for (const outcome of ["lose", "reject", "malformed"] as const)
  test(
    `material finalization ${outcome} never claims processing started or replays`,
    protectedJourney(async (page) => {
      const control = await materialBackend(page, { lifecycle: true });
      control.persisted = true;
      control.files = ["file_1"];
      control.lifecycleOutcome = outcome;
      await page.goto(`${material}/files`);
      await mounted(page, "Course material files");
      await page
        .getByRole("button", {
          name: "Accept authoritative file list",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Finalize and process", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Finalize and process", exact: true })
        .click();
      await expect.poll(() => control.finalizes === 1).toBe(true);
      await expect
        .poll(() =>
          contains(
            page,
            outcome === "reject"
              ? "This operation was not accepted."
              : "Outcome unknown.",
          ),
        )
        .toBe(true);
      expect(new URL(page.url()).pathname === `${material}/files`).toBe(true);
      await page
        .getByRole("button", {
          name: "Reconcile material and complete file list",
          exact: true,
        })
        .click();
      await expect
        .poll(() =>
          page
            .getByRole("button", {
              name: "Accept authoritative file list",
              exact: true,
            })
            .isEnabled(),
        )
        .toBe(true);
      expect(control.finalizes === 1 && control.forbidden === 0).toBe(true);
    }),
  );
test(
  "material stopped save can explicitly reconcile while late response remains fenced",
  protectedJourney(async (page) => {
    const control = await materialBackend(page, { lifecycle: true });
    control.makeReady();
    control.approved = true;
    let release: () => void = () => undefined;
    control.lifecycleRelease = new Promise<void>((resolve) => {
      release = resolve;
    });
    try {
      await page.goto(`${material}/brief`);
      await mounted(page, "Review material brief");
      await page
        .locator("#brief-summary")
        .fill(`${routeSecretFixture(page).teachingText} changed`);
      await page
        .getByRole("button", { name: "Save complete brief", exact: true })
        .click();
      await expect.poll(() => control.saves === 1).toBe(true);
      await page
        .getByRole("button", { name: "Stop waiting", exact: true })
        .click();
      await expect.poll(() => contains(page, "Outcome unknown.")).toBe(true);
      await page.getByRole("button", { name: "Refresh", exact: true }).click();
      await expect
        .poll(() => contains(page, "Current saved brief values differ"))
        .toBe(true);
      release();
      await page.waitForTimeout(150);
      expect(
        control.saves === 1 &&
          !(await contains(page, "Returned material state saved.")) &&
          !(await contains(page, "Educational approval revoked.")),
      ).toBe(true);
    } finally {
      release();
    }
  }),
);
test(
  "empty Subjects collection exposes corrective invalid state and summary focus until corrected",
  protectedJourney(async (page) => {
    const control = await materialBackend(page, { lifecycle: true });
    control.makeReady();
    await page.goto(`${material}/brief`);
    await mounted(page, "Review material brief");
    await page
      .locator("#brief-subjects")
      .getByRole("button", { name: "Delete this persisted file", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save complete brief", exact: true })
      .click();
    await page
      .getByRole("link", {
        name: "Subjects: Add at least 1 item(s).",
        exact: true,
      })
      .click();
    expect(
      await page
        .locator("#brief-subjects")
        .evaluate(
          (node) =>
            document.activeElement === node &&
            node.getAttribute("aria-invalid") === "true" &&
            node.getAttribute("aria-describedby") === "brief-subjects-error" &&
            document.getElementById("brief-subjects-error")?.textContent ===
              "Subjects: Add at least 1 item(s).",
        ),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Add item — Subjects", exact: true })
      .click();
    await page
      .locator("#brief-subjects\\.0")
      .fill(routeSecretFixture(page).courseName);
    expect(
      (await page.locator("#brief-subjects").getAttribute("aria-invalid")) ===
        null && control.saves === 0,
    ).toBe(true);
  }),
);
for (const status of [200, 404, 403])
  test(
    `stopped dependent readiness after saved brief handles applicable course status ${status}`,
    protectedJourney(async (page) => {
      const control = await materialBackend(page, { lifecycle: true });
      control.makeReady();
      await page.goto(`${material}/brief`);
      await mounted(page, "Review material brief");
      let held = 0;
      let release: () => void = () => undefined;
      const waiting = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route("**/api/v1/courses/course_1", async (route) => {
        held++;
        await waiting;
        if (status === 200) return route.fallback();
        return route.fulfill({
          status,
          contentType: "application/vnd.api+json",
          headers: { "Cache-Control": "no-store" },
          body: JSON.stringify({
            errors: [
              {
                status: String(status),
                code:
                  status === 403 ? "course_unauthorized" : "course_not_found",
              },
            ],
          }),
        });
      });
      try {
        await page
          .locator("#brief-summary")
          .fill(`${routeSecretFixture(page).teachingText} changed`);
        await page
          .getByRole("button", { name: "Save complete brief", exact: true })
          .click();
        await expect.poll(() => held === 1 && control.saves === 1).toBe(true);
        await expect
          .poll(() => contains(page, "Supervisor corrected"))
          .toBe(true);
        await page
          .getByRole("button", { name: "Stop waiting", exact: true })
          .click();
        release();
        if (status === 200) {
          await expect
            .poll(() =>
              page
                .getByRole("button", {
                  name: "Save complete brief",
                  exact: true,
                })
                .isEnabled(),
            )
            .toBe(true);
          expect(
            !(await contains(page, "Inactive — preparation is incomplete")),
          ).toBe(true);
        } else {
          await mounted(page, "Course access unavailable");
          expect(
            (await page.locator("textarea").count()) === 0 &&
              !(await contains(page, routeSecretFixture(page).teachingText)) &&
              !(await contains(page, routeSecretFixture(page).courseName)),
          ).toBe(true);
        }
        expect(control.saves).toBe(1);
        expect(held).toBe(1);
        // The fixture also counts the initial /brief document navigation.
        expect(control.forbidden).toBe(1);
      } finally {
        release();
      }
    }),
  );
for (const route of ["processing", "brief", "approval", "approval/revoke"])
  test(
    `material ${route} private entry mounts fixed unavailable without dependent reads`,
    protectedJourney(async (page) => {
      const control = await materialBackend(page, { lifecycle: true });
      control.makeReady();
      control.scope = "student-private";
      await page.goto(`${material}/${route}`);
      await mounted(page, "Course access unavailable");
      expect(
        control.fileReads === 0 &&
          control.jobReads === 0 &&
          control.approvals === 0 &&
          (await page.locator("#brief-summary").count()) === 0 &&
          !(await contains(page, routeSecretFixture(page).teachingText)),
      ).toBe(true);
    }),
  );
test(
  "material brief dirty history Stay and security pagehide clear protected input without automatic reads",
  protectedJourney(async (page) => {
    const control = await materialBackend(page, { lifecycle: true });
    control.makeReady();
    await page.goto(material);
    await mounted(page, "Course material");
    await page.locator(`a[href="${material}/brief"]`).click();
    await mounted(page, "Review material brief");
    await page
      .locator("#brief-summary")
      .fill(`${routeSecretFixture(page).teachingText} dirty`);
    await page.evaluate(() => history.back());
    await expect
      .poll(() =>
        page
          .getByRole("dialog")
          .count()
          .then((count) => count === 1),
      )
      .toBe(true);
    await page
      .getByRole("button", { name: "Stay on this page", exact: true })
      .click();
    expect(
      (await page.locator("#brief-summary").inputValue()).includes("dirty"),
    ).toBe(true);
    const reads = control.reads;
    await page.evaluate(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
    await expect
      .poll(() =>
        page
          .locator("#brief-summary")
          .count()
          .then((count) => count === 0),
      )
      .toBe(true);
    expect(control.reads === reads && control.saves === 0).toBe(true);
  }),
);
test(
  "material lifecycle all locales and text modes reflow with native math spacing forced colors and axe",
  protectedJourney(async (page) => {
    test.setTimeout(120000);
    const control = await materialBackend(page, { lifecycle: true });
    control.makeReady();
    if (control.brief) control.brief.summary += "\n\n$x^2 + \\frac{1}{2}$";
    for (const locale of [
      "en-US",
      "de-DE",
      "fr-FR",
      "pt-PT",
      "pt-BR",
      "es-ES",
      "es-AR",
    ]) {
      const catalog: unknown = JSON.parse(
        readFileSync(
          new URL(
            `../src/platform/i18n/catalogs/${locale}.json`,
            import.meta.url,
          ),
          "utf8",
        ),
      );
      if (typeof catalog !== "object" || catalog === null)
        throw new Error("Invalid test catalog.");
      for (const size of ["standard", "large", "extra-large"]) {
        await page.addInitScript(
          ({ locale, size }) => {
            localStorage.setItem("mia.interface.locale", locale);
            localStorage.setItem("mia.interface.text-size", size);
          },
          { locale, size },
        );
        await page.setViewportSize({ width: 320, height: 900 });
        for (const [route, key] of [
          ["brief", "materials.briefHeading"],
          ["approval", "materials.approvalHeading"],
          ["approval/revoke", "materials.revokeHeading"],
          ["processing", "materials.processingHeading"],
        ]) {
          if (!route || !key) throw new Error("Missing test route.");
          const label: unknown = Reflect.get(catalog, key);
          if (typeof label !== "string")
            throw new Error("Invalid localized test label.");
          await page.goto(`${material}/${route}`);
          await mounted(page, label);
          expect(
            (await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            )) && (await page.locator("html").getAttribute("lang")) === locale,
          ).toBe(true);
        }
        await page.emulateMedia({
          forcedColors: "active",
          reducedMotion: "reduce",
        });
        await page.evaluate(() => {
          for (const node of document.querySelectorAll("main *"))
            if (node instanceof HTMLElement) {
              node.style.setProperty("line-height", "1.5", "important");
              node.style.setProperty("letter-spacing", ".12em", "important");
              node.style.setProperty("word-spacing", ".16em", "important");
              if (node.tagName === "P")
                node.style.setProperty("margin-bottom", "2em", "important");
            }
        });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.emulateMedia({ forcedColors: "none" });
      }
    }
    await page.addInitScript(() =>
      localStorage.setItem("mia.interface.locale", "en-US"),
    );
    await page.goto(`${material}/approval`);
    await mounted(page, "Material approval");
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.length === 0,
    ).toBe(true);
    await page.locator('main input[type="checkbox"]').check();
    await page
      .getByRole("button", { name: "Approve material", exact: true })
      .click();
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.length === 0 &&
        (await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        )),
    ).toBe(true);
  }),
);
test(
  "material lifecycle browser zoom keeps brief approval and processing operable",
  protectedJourney(async () => {
    for (const zoom of [2, 4])
      await atBrowserZoom(zoom, async (page) => {
        const control = await materialBackend(page, { lifecycle: true });
        control.makeReady();
        for (const size of ["standard", "large", "extra-large"]) {
          await page.addInitScript(
            (size) => localStorage.setItem("mia.interface.text-size", size),
            size,
          );
          for (const [route, label] of [
            ["brief", "Review material brief"],
            ["approval", "Material approval"],
            ["approval/revoke", "Revoke material approval"],
            ["processing", "Course material processing"],
          ]) {
            if (!route || !label) throw new Error("Missing zoom route.");
            await page.goto(`http://127.0.0.1:4173${material}/${route}`);
            await mounted(page, label);
            expect(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            ).toBe(true);
          }
        }
      });
  }),
);
