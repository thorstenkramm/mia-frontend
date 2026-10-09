import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { materialBackend } from "./materialFixtures";
import { atBrowserZoom, protectedJourney } from "./routeFixtures";
import {
  routeHygieneCheckpoint,
  routeSecretFixture,
} from "./routeSecretHygiene";

test.use({ trace: "off", video: "off", screenshot: "off" });
const list = "/prepare/courses/course_1/materials";
const files = `${list}/material_1/files`;
test(
  "material lazy loading failure stays neutral with a localized safe exit",
  protectedJourney(async (page) => {
    const control = await materialBackend(page);
    await page.route(/\/assets\/PrepareMaterialRoute-[^/]+\.js$/u, (route) =>
      route.abort(),
    );
    await page.goto(files);
    await ready(page, "Course access unavailable");
    expect(
      control.reads === 0 &&
        control.fileReads === 0 &&
        (await page.locator("#material-picker").count()) === 0,
    ).toBe(true);
    await page.locator('main a[href="/"]').click();
    await ready(page, "Home");
  }),
);
async function ready(page: Page, name: string) {
  await expect
    .poll(async () => (await page.title()) === `${name} | MIA`)
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
async function select(page: Page, count = 1) {
  const fixture = routeSecretFixture(page);
  await page.locator("#material-picker").setInputFiles(
    Array.from({ length: count }, () => ({
      name: `${fixture.courseName}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from(fixture.teachingText),
    })),
  );
}
async function has(page: Page, text: string) {
  return page
    .locator("main")
    .textContent()
    .then((value) => value?.includes(text) === true);
}
async function reflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test(
  "material deletion new attempt retires rejection and stopped late success stays unknown",
  protectedJourney(async (page) => {
    const control = await materialBackend(page);
    control.persisted = true;
    control.files = ["file_1"];
    control.deleteOutcome = "not-acceptable";
    await page.goto(files);
    await ready(page, "Course material files");
    const remove = page.getByRole("button", {
      name: "Delete this persisted file",
      exact: true,
    });
    await remove.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete this persisted file", exact: true })
      .click();
    await expect
      .poll(() => has(page, "This operation was not accepted."))
      .toBe(true);
    const live = page.locator('[aria-live="assertive"]');
    await expect
      .poll(() =>
        live
          .textContent()
          .then(
            (value) =>
              value?.startsWith("This operation was not accepted.") === true,
          ),
      )
      .toBe(true);
    expect(control.deletes === 1 && control.files.length === 1).toBe(true);
    await routeHygieneCheckpoint(page, "material-delete-prior-rejected");
    let release: () => void = () => undefined;
    control.deleteRelease = new Promise<void>((resolve) => {
      release = resolve;
    });
    control.deleteOutcome = "success";
    try {
      await remove.click();
      expect(
        !(await has(page, "This operation was not accepted")) &&
          (await page
            .getByRole("button", { name: "Technical details", exact: true })
            .count()) === 0 &&
          control.deletes === 1,
      ).toBe(true);
      await routeHygieneCheckpoint(page, "material-delete-new-chosen");
      await page
        .getByRole("dialog")
        .getByRole("button", {
          name: "Delete this persisted file",
          exact: true,
        })
        .click();
      await expect.poll(() => control.deletes === 2).toBe(true);
      await page
        .getByRole("button", { name: "Stop waiting", exact: true })
        .click();
      const unknownOnly = async () =>
        (await has(page, "File deletion is unconfirmed.")) &&
        !(await has(page, "This operation was not accepted")) &&
        !(await has(page, "The selected persisted file was deleted.")) &&
        (await live
          .textContent()
          .then(
            (value) =>
              value?.startsWith("File deletion is unconfirmed.") === true &&
              !value.includes(routeSecretFixture(page).rawError),
          )) &&
        (await page.locator('[aria-live="polite"]').textContent()) === "" &&
        (await remove.count()) === 1 &&
        control.deletes === 2;
      await expect.poll(unknownOnly).toBe(true);
      await routeHygieneCheckpoint(page, "material-delete-new-stopped");
      const before = control.admissionLedger.length;
      const response = page.waitForResponse(
        (response) =>
          response.request().method() === "DELETE" && response.status() === 204,
      );
      release();
      await (await response).finished();
      await page.waitForTimeout(100);
      expect(
        (await unknownOnly()) &&
          control.files.length === 0 &&
          control.admissionLedger.length === before &&
          control.deletes === 2,
      ).toBe(true);
      await routeHygieneCheckpoint(page, "material-delete-new-late-success");
    } finally {
      release();
    }
  }),
);

for (const path of ["material", "files"] as const) {
  for (const outcome of ["http", "transport"] as const) {
    test(
      `material confirmed deletion survives ${path} ${outcome} refresh failure`,
      protectedJourney(async (page) => {
        const control = await materialBackend(page);
        control.persisted = true;
        control.files = ["file_1"];
        await page.goto(files);
        await ready(page, "Course material files");
        await page
          .getByRole("button", {
            name: "Delete this persisted file",
            exact: true,
          })
          .click();
        control.readFailure = { path, outcome };
        await page
          .getByRole("dialog")
          .getByRole("button", {
            name: "Delete this persisted file",
            exact: true,
          })
          .click();
        await expect
          .poll(() => has(page, "Could not refresh material and files."))
          .toBe(true);
        const success = page.locator('[aria-live="polite"]');
        await expect
          .poll(() =>
            success
              .textContent()
              .then(
                (value) => value === "The selected persisted file was deleted.",
              ),
          )
          .toBe(true);
        expect(
          control.deletes === 1 &&
            control.files.length === 0 &&
            (await page
              .getByRole("button", {
                name: "Delete this persisted file",
                exact: true,
              })
              .count()) === 0 &&
            !(await has(page, "This operation was not accepted")) &&
            !(await has(page, "File deletion is unconfirmed")) &&
            (await success
              .textContent()
              .then(
                (value) => !value?.includes(routeSecretFixture(page).rawError),
              )),
        ).toBe(true);
        await routeHygieneCheckpoint(
          page,
          `material-deleted-read-failed-${path}-${outcome}`,
        );
        control.readFailure = null;
        await page
          .getByRole("button", {
            name: "Reconcile material and complete file list",
            exact: true,
          })
          .click();
        await expect
          .poll(() => has(page, "Could not refresh material and files."))
          .toBe(false);
        expect(
          control.deletes === 1 &&
            (await page
              .getByRole("button", {
                name: "Delete this persisted file",
                exact: true,
              })
              .count()) === 0 &&
            (await success
              .textContent()
              .then(
                (value) => value === "The selected persisted file was deleted.",
              )),
        ).toBe(true);
        await routeHygieneCheckpoint(
          page,
          `material-deleted-read-recovered-${path}-${outcome}`,
        );
      }),
    );
  }
}

test(
  "material CSRF rejection fences the queue until explicit ordered recovery",
  protectedJourney(async (page) => {
    const control = await materialBackend(page);
    control.persisted = true;
    control.uploadOutcome = "csrf";
    await page.goto(files);
    await ready(page, "Course material files");
    await select(page, 2);
    const before = control.admissionLedger.length;
    await page
      .getByRole("button", { name: "Queue selected files", exact: true })
      .click();
    await expect.poll(() => page.locator("#material-picker").count()).toBe(0);
    expect(
      control.uploads === 1 &&
        control.files.length === 0 &&
        control.admissionLedger.length === before &&
        (await page
          .getByRole("button", { name: "Remove local row", exact: true })
          .count()) === 0,
    ).toBe(true);
    await page.evaluate(() => {
      for (const name of ["focus", "online", "pageshow"])
        window.dispatchEvent(new Event(name));
    });
    await page.waitForTimeout(100);
    expect(
      control.uploads === 1 && control.admissionLedger.length === before,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "material-csrf-cleared");
    control.uploadOutcome = "success";
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await ready(page, "Course material files");
    expect(
      control.admissionLedger.slice(before).join() ===
        "session,capabilities,course,material,files" &&
        control.uploads === 1 &&
        (await page
          .getByRole("button", { name: "Remove local row", exact: true })
          .count()) === 0,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "material-csrf-recovered");
    await select(page);
    await page
      .getByRole("button", { name: "Queue selected files", exact: true })
      .click();
    await expect
      .poll(() => control.uploads === 2 && control.files.length === 1)
      .toBe(true);
  }),
);

for (const operation of ["create", "delete"] as const) {
  for (const outcome of ["unknown", "rejected"] as const) {
    test(
      `material ${operation} ${outcome} live feedback is truthful deduplicated and retired`,
      protectedJourney(async (page) => {
        const control = await materialBackend(page);
        const fixture = routeSecretFixture(page);
        control.persisted = operation === "delete";
        if (operation === "create") {
          control.createOutcome = outcome === "unknown" ? "lose" : "reject";
          await page.goto(`${list}/new`);
          await ready(page, "Create course material");
          await page.locator("#material-name").fill(fixture.courseName);
        } else {
          control.files = ["file_1"];
          control.deleteOutcome = outcome === "unknown" ? "lose" : "reject";
          await page.goto(files);
          await ready(page, "Course material files");
          await page
            .getByRole("button", {
              name: "Delete this persisted file",
              exact: true,
            })
            .click();
        }
        const prefix =
          outcome === "rejected"
            ? "This operation was not accepted."
            : operation === "create"
              ? "Creation is unconfirmed."
              : "File deletion is unconfirmed.";
        await page.evaluate((prefix) => {
          const region = document.querySelector('[aria-live="assertive"]');
          if (!(region instanceof HTMLElement))
            throw new Error("Missing live region.");
          let count = 0;
          region.dataset.materialFeedbackCount = "0";
          const observer = new MutationObserver(() => {
            if (region.textContent?.startsWith(prefix))
              region.dataset.materialFeedbackCount = String(++count);
          });
          observer.observe(region, {
            childList: true,
            characterData: true,
            subtree: true,
          });
        }, prefix);
        if (operation === "create")
          await page
            .getByRole("button", {
              name: "Create course material",
              exact: true,
            })
            .click();
        else
          await page
            .getByRole("dialog")
            .getByRole("button", {
              name: "Delete this persisted file",
              exact: true,
            })
            .click();
        const live = page.locator('[aria-live="assertive"]');
        await expect
          .poll(() =>
            live
              .textContent()
              .then((text) => text?.startsWith(prefix) === true),
          )
          .toBe(true);
        expect(
          (await live.getAttribute("data-material-feedback-count")) === "1" &&
            (await live
              .textContent()
              .then((text) => !text?.includes(fixture.rawError))),
        ).toBe(true);
        if (outcome === "unknown")
          expect(
            !(await has(page, "This operation was not accepted.")) &&
              !(await has(page, "The selected persisted file was deleted.")),
          ).toBe(true);
        expect(
          operation === "create"
            ? control.creates === 1 &&
                control.persisted === (outcome === "unknown")
            : control.deletes === 1 &&
                (await page
                  .getByRole("button", {
                    name: "Delete this persisted file",
                    exact: true,
                  })
                  .count()) === 1,
        ).toBe(true);
        await routeHygieneCheckpoint(
          page,
          `material-${operation}-feedback-${outcome}`,
        );
        if (outcome === "rejected") {
          await page
            .getByRole("button", { name: "Technical details", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Technical details", exact: true })
            .click();
        }
        expect(
          (await live.getAttribute("data-material-feedback-count")) === "1",
        ).toBe(true);
        if (operation === "create" && outcome === "unknown") {
          await page
            .getByRole("button", {
              name: "Abandon unconfirmed creation and return to list",
              exact: true,
            })
            .click();
          await ready(page, "Course materials");
        } else {
          await page.evaluate(() =>
            window.dispatchEvent(new Event("pagehide")),
          );
          await expect
            .poll(() =>
              page
                .getByRole("button", { name: "Refresh", exact: true })
                .count(),
            )
            .toBe(1);
        }
        expect(
          await live
            .textContent()
            .then(
              (text) =>
                !text?.includes(prefix) && !text?.includes(fixture.rawError),
            ),
        ).toBe(true);
        await routeHygieneCheckpoint(
          page,
          `material-${operation}-retired-${outcome}`,
        );
      }),
    );
  }
}

test(
  "material name errors are associated corrective and cleared before valid dispatch",
  protectedJourney(async (page) => {
    const control = await materialBackend(page);
    await page.goto(`${list}/new`);
    await ready(page, "Create course material");
    const input = page.locator("#material-name");
    expect(
      (await input.getAttribute("required")) !== null &&
        (await input.getAttribute("aria-invalid")) === "false",
    ).toBe(true);
    for (const value of [
      "",
      "   ",
      `${routeSecretFixture(page).courseName}${"😀".repeat(201)}`,
    ]) {
      await input.fill(value);
      await page
        .getByRole("button", { name: "Create course material", exact: true })
        .click();
      const reason =
        value.trim() === ""
          ? "Enter a material name."
          : "Use at most 200 characters and 800 UTF-8 bytes after trimming.";
      await expect
        .poll(
          async () =>
            control.creates === 0 &&
            (await input.getAttribute("aria-invalid")) === "true" &&
            (await input
              .getAttribute("aria-describedby")
              .then((value) =>
                value?.split(" ").includes("material-name-error"),
              )) &&
            (await input.evaluate((node) => document.activeElement === node)) &&
            (await page.locator("#material-name-error").textContent()) ===
              reason,
        )
        .toBe(true);
    }
    await routeHygieneCheckpoint(page, "material-validation-long");
    await input.fill(routeSecretFixture(page).courseName);
    expect(
      (await input.getAttribute("aria-invalid")) === "false" &&
        (await page.locator("#material-name-error").count()) === 0 &&
        (await input.getAttribute("aria-describedby")) === "material-name-help",
    ).toBe(true);
    await routeHygieneCheckpoint(page, "material-validation-corrected");
    await page
      .getByRole("button", { name: "Create course material", exact: true })
      .click();
    await ready(page, "Course material files");
    expect(control.creates === 1 && control.validCreate).toBe(true);
  }),
);

test(
  "material connected native picker serializes persisted review and exact removal",
  protectedJourney(async (page) => {
    const control = await materialBackend(page);
    await page.goto("/prepare/courses/course_1");
    await ready(page, "Course preparation");
    await page.locator(`main a[href="${list}"]`).click();
    await ready(page, "Course materials");
    await page.locator(`main a[href="${list}/new"]`).click();
    await ready(page, "Create course material");
    await page
      .locator("#material-name")
      .fill(routeSecretFixture(page).courseName);
    await routeHygieneCheckpoint(page, "material-create-input");
    await page
      .getByRole("button", { name: "Create course material", exact: true })
      .click();
    await ready(page, "Course material files");
    await select(page, 2);
    await expect
      .poll(
        async () =>
          (await page
            .getByRole("button", { name: "Remove local row", exact: true })
            .count()) === 2,
      )
      .toBe(true);
    await routeHygieneCheckpoint(page, "material-selected");
    await page
      .getByRole("button", { name: "Queue selected files", exact: true })
      .click();
    await expect
      .poll(() => control.uploads === 2 && control.fileReads >= 3)
      .toBe(true);
    await expect
      .poll(() =>
        page
          .getByRole("button", {
            name: "Delete this persisted file",
            exact: true,
          })
          .count(),
      )
      .toBe(2);
    expect(
      control.validCreate && control.validMultipart && control.forbidden === 0,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "material-persisted");
    await page
      .getByRole("button", {
        name: "Accept authoritative file list",
        exact: true,
      })
      .click();
    await expect
      .poll(() =>
        has(
          page,
          "Current material and complete file list accepted for this page.",
        ),
      )
      .toBe(true);
    await page
      .getByRole("button", { name: "Delete this persisted file", exact: true })
      .first()
      .click();
    await expect.poll(() => page.getByRole("dialog").count()).toBe(1);
    expect(
      await page
        .getByRole("button", { name: "Cancel", exact: true })
        .evaluate((node) => document.activeElement === node),
    ).toBe(true);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete this persisted file", exact: true })
      .click();
    await expect
      .poll(() => control.deletes === 1 && control.files.length === 1)
      .toBe(true);
    await page.reload();
    await ready(page, "Course material files");
    await expect
      .poll(
        async () =>
          (await page
            .getByRole("button", { name: "Remove local row", exact: true })
            .count()) === 0 &&
          (await page
            .getByRole("button", {
              name: "Delete this persisted file",
              exact: true,
            })
            .count()) === 1,
      )
      .toBe(true);
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.length === 0,
    ).toBe(true);
    await page.goto(list);
    await ready(page, "Course materials");
    expect(
      (await page.locator('main a[href*="private_1"]').count()) === 0,
    ).toBe(true);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect
      .poll(async () =>
        page
          .locator("main h2")
          .evaluate((node) => document.activeElement === node),
      )
      .toBe(true);
    expect(
      (await page
        .getByRole("button", { name: "Previous", exact: true })
        .count()) === 1 && control.validCreate,
    ).toBe(true);
  }),
);

test(
  "material unknown creation and removal retain truth without automatic unsafe replay",
  protectedJourney(async (page) => {
    const control = await materialBackend(page);
    control.createOutcome = "lose";
    await page.goto(`${list}/new`);
    await ready(page, "Create course material");
    await page
      .locator("#material-name")
      .fill(routeSecretFixture(page).courseName);
    await page
      .getByRole("button", { name: "Create course material", exact: true })
      .click();
    await expect
      .poll(() =>
        page
          .getByRole("button", {
            name: "Abandon unconfirmed creation and return to list",
            exact: true,
          })
          .count(),
      )
      .toBe(1);
    await page
      .getByRole("button", { name: "Create course material", exact: true })
      .click({ force: true });
    expect(control.creates === 1 && control.persisted).toBe(true);
    await routeHygieneCheckpoint(page, "material-create-unknown");
    await page
      .getByRole("button", {
        name: "Abandon unconfirmed creation and return to list",
        exact: true,
      })
      .click();
    await ready(page, "Course materials");
    await page.goto(files);
    await ready(page, "Course material files");
    await select(page);
    await page
      .getByRole("button", { name: "Queue selected files", exact: true })
      .click();
    await expect
      .poll(() =>
        page
          .getByRole("button", {
            name: "Delete this persisted file",
            exact: true,
          })
          .count(),
      )
      .toBe(1);
    control.deleteOutcome = "lose";
    await page
      .getByRole("button", { name: "Delete this persisted file", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete this persisted file", exact: true })
      .click();
    await expect
      .poll(() => has(page, "File deletion is unconfirmed."))
      .toBe(true);
    expect(
      control.deletes === 1 &&
        control.files.length === 0 &&
        (await page
          .getByRole("button", {
            name: "Delete this persisted file",
            exact: true,
          })
          .count()) === 1,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "material-delete-unknown");
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
            name: "Delete this persisted file",
            exact: true,
          })
          .count(),
      )
      .toBe(0);
    expect(
      control.deletes === 1 && control.uploads === 1 && control.forbidden === 0,
    ).toBe(true);
  }),
);

test(
  "material lost upload pauses duplicate sources and reconciles without correlation or replay",
  protectedJourney(async (page) => {
    const control = await materialBackend(page);
    control.persisted = true;
    control.uploadOutcome = "lose";
    await page.goto(files);
    await ready(page, "Course material files");
    await select(page, 2);
    await page
      .getByRole("button", { name: "Queue selected files", exact: true })
      .click();
    await expect.poll(() => has(page, "Upload outcome unknown")).toBe(true);
    expect(control.uploads === 1 && control.files.length === 1).toBe(true);
    await routeHygieneCheckpoint(page, "material-unknown");
    await page
      .getByRole("button", {
        name: "Reconcile material and complete file list",
        exact: true,
      })
      .click();
    await expect
      .poll(() =>
        page
          .getByRole("button", { name: "Abandon unknown attempt", exact: true })
          .count(),
      )
      .toBe(1);
    expect(
      (await page
        .getByRole("button", {
          name: "Delete this persisted file",
          exact: true,
        })
        .count()) === 1 && control.uploads === 1,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "material-reconciled");
    await page
      .getByRole("button", { name: "Remove local row", exact: true })
      .click();
    await page.getByRole("checkbox").check();
    control.uploadOutcome = "success";
    await page
      .getByRole("button", { name: "Upload as a new file", exact: true })
      .click();
    await expect
      .poll(() => control.uploads === 2 && control.files.length === 2)
      .toBe(true);
    expect(control.forbidden === 0 && control.validMultipart).toBe(true);
  }),
);

test(
  "material denial lifecycle and private scope destroy controls before dependent work",
  protectedJourney(async (page) => {
    const control = await materialBackend(page);
    control.persisted = true;
    control.scope = "student-private";
    await page.goto(files);
    await ready(page, "Course access unavailable");
    expect(
      control.fileReads === 0 &&
        (await page.locator("#material-picker").count()) === 0,
    ).toBe(true);
    control.scope = "course-wide";
    await page.goto(files);
    await ready(page, "Course material files");
    await select(page);
    await page
      .getByRole("link", { name: "Course material", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Stay on this page", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          await page
            .locator("#material-picker")
            .evaluate((node) => document.activeElement === node),
      )
      .toBe(true);
    const before = control.course.base.ledger.length;
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    await expect.poll(() => page.locator("#material-picker").count()).toBe(0);
    expect(
      control.course.base.ledger.length === before && control.uploads === 0,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "material-cleared");
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await ready(page, "Course material files");
    expect(
      (await page
        .getByRole("button", { name: "Remove local row", exact: true })
        .count()) === 0,
    ).toBe(true);
    control.uploadOutcome = "hidden";
    await select(page);
    await page
      .getByRole("button", { name: "Queue selected files", exact: true })
      .click();
    await ready(page, "Course access unavailable");
    expect(
      (await page.locator("#material-picker").count()) === 0 &&
        control.uploads === 1,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "material-error");
  }),
);

test(
  "material keyboard review handles 200 rows mixed formats and explicit row fallback",
  protectedJourney(async (page) => {
    const control = await materialBackend(page);
    control.persisted = true;
    await page.goto(files);
    await ready(page, "Course material files");
    await select(page, 200);
    expect(
      (await page
        .getByRole("button", { name: "Remove local row", exact: true })
        .count()) === 200,
    ).toBe(true);
    await page
      .getByRole("button", { name: "Remove local row", exact: true })
      .first()
      .focus();
    await page.keyboard.press("Enter");
    expect(
      await page
        .locator('[aria-labelledby="local-file-2"]')
        .evaluate((node) => document.activeElement === node),
    ).toBe(true);
    await page.locator("#material-picker").setInputFiles([
      {
        name: "synthetic.png",
        mimeType: "image/png",
        buffer: Buffer.from("synthetic"),
      },
      {
        name: "synthetic.md",
        mimeType: "text/markdown",
        buffer: Buffer.from("synthetic"),
      },
    ]);
    expect(
      (await page
        .getByRole("button", { name: "Remove local row", exact: true })
        .count()) === 201 && control.uploads === 0,
    ).toBe(true);
    await expect
      .poll(() =>
        page
          .locator('[aria-live="assertive"]')
          .textContent()
          .then(
            (value) =>
              value?.includes("synthetic.png") === true &&
              value.includes("synthetic.md"),
          ),
      )
      .toBe(true);
    await routeHygieneCheckpoint(page, "material-many");
  }),
);

test(
  "material all locales and text modes preserve native queue reflow and stable controls",
  protectedJourney(async (page) => {
    test.setTimeout(120000);
    const control = await materialBackend(page);
    control.persisted = true;
    for (const locale of [
      "en-US",
      "de-DE",
      "fr-FR",
      "es-ES",
      "es-AR",
      "pt-PT",
      "pt-BR",
    ]) {
      const value: unknown = JSON.parse(
        readFileSync(
          new URL(
            `../src/platform/i18n/catalogs/${locale}.json`,
            import.meta.url,
          ),
          "utf8",
        ),
      );
      if (
        typeof value !== "object" ||
        value === null ||
        !("materials.files" in value) ||
        typeof value["materials.files"] !== "string"
      )
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
        for (const [destination, key] of [
          [`${list}/new`, "materials.create"],
          [list, "materials.heading"],
          [`${list}/material_1`, "materials.detail"],
        ]) {
          if (destination === undefined || key === undefined || !(key in value))
            throw new Error("Missing localized surface label.");
          const label: unknown = Reflect.get(value, key);
          if (typeof label !== "string")
            throw new Error("Invalid localized surface label.");
          await page.goto(destination);
          await ready(page, label);
          if (destination.endsWith("/new")) {
            await page.locator('main form button[type="submit"]').click();
            await expect
              .poll(() =>
                page.locator("#material-name").getAttribute("aria-invalid"),
              )
              .toBe("true");
            const corrective: unknown = Reflect.get(
              value,
              "materials.nameRequired",
            );
            expect(
              typeof corrective === "string" &&
                (await page.locator("#material-name-error").textContent()) ===
                  corrective &&
                control.creates === 0,
            ).toBe(true);
          }
          await reflow(page);
        }
        await page.goto(files);
        await ready(page, value["materials.files"]);
        await select(page);
        await reflow(page);
        expect(
          (await page.locator("html").getAttribute("lang")) === locale &&
            (await page.getByRole("button").count()) > 0 &&
            (await page
              .locator("html")
              .evaluate((node) => getComputedStyle(node).fontSize)) ===
              { standard: "16px", large: "18px", "extra-large": "20px" }[size],
        ).toBe(true);
        await page.evaluate(() => {
          for (const node of document.querySelectorAll("main *")) {
            if (node instanceof HTMLElement) {
              node.style.setProperty("line-height", "1.5", "important");
              node.style.setProperty("letter-spacing", ".12em", "important");
              node.style.setProperty("word-spacing", ".16em", "important");
              if (node.tagName === "P")
                node.style.setProperty("margin-bottom", "2em", "important");
            }
          }
        });
        await reflow(page);
        await page.emulateMedia({
          forcedColors: "active",
          reducedMotion: "reduce",
        });
        await reflow(page);
        const box = await page.locator("#material-picker").boundingBox();
        expect(box !== null && box.height >= 24 && box.width >= 24).toBe(true);
        await page.emulateMedia({ forcedColors: "none" });
      }
    }
    expect(control.uploads === 0 && control.forbidden === 0).toBe(true);
  }),
);

test(
  "material connected process remains usable at real 200 percent browser zoom",
  protectedJourney(async () => {
    await atBrowserZoom(2, async (zoomed) => {
      const control = await materialBackend(zoomed);
      control.persisted = true;
      for (const [destination, label] of [
        [`${list}/new`, "Create course material"],
        [list, "Course materials"],
        [`${list}/material_1`, "Course material"],
      ]) {
        if (destination === undefined || label === undefined)
          throw new Error("Missing zoom surface.");
        await zoomed.goto(`http://127.0.0.1:4173${destination}`);
        await ready(zoomed, label);
        await reflow(zoomed);
        expect(
          (await new AxeBuilder({ page: zoomed }).analyze()).violations
            .length === 0,
        ).toBe(true);
      }
      await zoomed.goto(`http://127.0.0.1:4173${files}`);
      await ready(zoomed, "Course material files");
      await select(zoomed);
      expect((await zoomed.evaluate(() => innerWidth)) === 640).toBe(true);
      await reflow(zoomed);
      await zoomed
        .getByRole("button", { name: "Queue selected files", exact: true })
        .click();
      await expect
        .poll(() => control.uploads === 1 && control.files.length === 1)
        .toBe(true);
      await reflow(zoomed);
    });
  }),
);
