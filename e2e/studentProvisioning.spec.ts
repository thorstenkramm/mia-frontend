import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { studentBackend, fillStudent } from "./studentFixtures";
import { protectedJourney, atBrowserZoom } from "./routeFixtures";
import {
  routeHygieneCheckpoint,
  routeSecretFixture,
} from "./routeSecretHygiene";

test.use({ trace: "off", video: "off", screenshot: "off" });
const hub = "/prepare/courses/course_1",
  list = `${hub}/students`;
async function mounted(page: Page, label: string) {
  await expect
    .poll(() =>
      page
        .locator("h1")
        .textContent()
        .then((text) => text === label),
    )
    .toBe(true);
  expect(
    (await page.title()) === `${label} | MIA` &&
      (await page.locator("main").count()) === 1 &&
      (await page.locator("h1").count()) === 1,
  ).toBe(true);
}
async function scan(page: Page) {
  const ids = (await new AxeBuilder({ page }).analyze()).violations.map(
    (item) => item.id,
  );
  expect(ids).toEqual([]);
}
async function geometry(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.locator("main a, main button").evaluateAll((nodes) =>
      nodes
        .filter((node) => node.getClientRects().length > 0)
        .every((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width >= 24 && rect.height >= 24;
        }),
    ),
  ).toBe(true);
}
async function secretAbsent(page: Page) {
  const marker = routeSecretFixture(page).password;
  expect(
    await page.evaluate(
      (value) =>
        !document.body.textContent?.includes(value) &&
        ![...document.querySelectorAll("input")].some((input) =>
          input.value.includes(value),
        ) &&
        !location.href.includes(value) &&
        !document.title.includes(value) &&
        !JSON.stringify(history.state).includes(value) &&
        !JSON.stringify(localStorage).includes(value) &&
        !JSON.stringify(sessionStorage).includes(value),
      marker,
    ),
  ).toBe(true);
  expect(!(await page.locator("body").ariaSnapshot()).includes(marker)).toBe(
    true,
  );
}
async function submit(page: Page) {
  await page
    .getByRole("button", { name: "Create student", exact: true })
    .click();
}

test(
  "student temporary password enabled unfocused boundaries meet contrast in normal and invalid states",
  protectedJourney(async (page) => {
    const control = await studentBackend(page);
    await page.goto(`${list}/new`);
    await mounted(page, "Create student");
    await fillStudent(page);
    for (const invalid of [false, true]) {
      if (invalid) {
        await page.locator("#new-password").fill("");
        await submit(page);
      }
      await page.locator("h1").focus();
      expect(
        await page.evaluate((invalid) => {
          const context = document.createElement("canvas").getContext("2d");
          if (context === null)
            throw new Error("Missing color conversion context.");
          const rgba = (color: string) => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            return context.getImageData(0, 0, 1, 1).data;
          };
          const luminance = (color: string) =>
            Array.from(rgba(color))
              .slice(0, 3)
              .reduce((sum, value, index) => {
                const channel = value / 255;
                return (
                  sum +
                  (index === 0 ? 0.2126 : index === 1 ? 0.7152 : 0.0722) *
                    (channel <= 0.04045
                      ? channel / 12.92
                      : ((channel + 0.055) / 1.055) ** 2.4)
                );
              }, 0);
          return ["new-password", "password-confirmation"].every((id) => {
            const input = document.getElementById(id);
            if (!(input instanceof HTMLInputElement)) return false;
            const style = getComputedStyle(input);
            let adjacent = input.parentElement;
            while (
              adjacent !== null &&
              rgba(getComputedStyle(adjacent).backgroundColor)[3] === 0
            )
              adjacent = adjacent.parentElement;
            if (adjacent === null) return false;
            const boundary = luminance(style.outlineColor);
            return (
              !input.readOnly &&
              !input.disabled &&
              input !== document.activeElement &&
              input.getAttribute("aria-invalid") === String(invalid) &&
              parseFloat(style.outlineWidth) >= 1 &&
              [
                style.backgroundColor,
                getComputedStyle(adjacent).backgroundColor,
              ].every((color) => {
                const background = luminance(color);
                return (
                  (Math.max(boundary, background) + 0.05) /
                    (Math.min(boundary, background) + 0.05) >=
                  3
                );
              })
            );
          });
        }, invalid),
      ).toBe(true);
      await routeHygieneCheckpoint(
        page,
        invalid ? "student-boundary-invalid" : "student-boundary-normal",
      );
    }
    expect(control.posts === 0).toBe(true);
  }),
);

for (const scenario of [
  "profiles",
  "language",
  "username-profiles",
  "all-fields",
])
  test(
    `student local ${scenario} errors have linked DOM order and precise corrective focus`,
    protectedJourney(async (page) => {
      const control = await studentBackend(page);
      await page.goto(`${list}/new`);
      await mounted(page, "Create student");
      await fillStudent(page);
      const profiles =
        scenario === "language"
          ? ["language"]
          : ["language", "country", "time_zone"];
      for (const name of profiles)
        await page.locator(`#student-${name}`).selectOption("");
      const targets = profiles.map((name) => `student-${name}`);
      if (scenario === "username-profiles" || scenario === "all-fields") {
        await page.locator("#student-username").fill("!");
        targets.unshift("student-username");
      }
      if (scenario === "all-fields") {
        await page.locator("#new-password").fill("");
        targets.splice(1, 0, "new-password", "password-confirmation");
      }
      await submit(page);
      expect(
        await page.evaluate((targets) => {
          const summary = document.querySelector(
            '[aria-labelledby="password-change-summary-heading"]',
          );
          return (
            Array.from(document.querySelectorAll('[aria-invalid="true"]'))
              .map((node) => node.id)
              .join() === targets.join() &&
            targets.every((id) => {
              const input = document.getElementById(id);
              const error = document.getElementById(`${id}-error`);
              return (
                input
                  ?.getAttribute("aria-describedby")
                  ?.split(" ")
                  .includes(`${id}-error`) &&
                (error?.textContent?.length ?? 0) > 0
              );
            }) &&
            (targets.length === 1
              ? summary === null && document.activeElement?.id === targets[0]
              : document.activeElement === summary &&
                summary === document.querySelector("form")?.firstElementChild &&
                Array.from(summary?.querySelectorAll("a") ?? [])
                  .map((node) => node.getAttribute("href"))
                  .join() === targets.map((id) => `#${id}`).join())
          );
        }, targets),
      ).toBe(true);
      for (const id of targets.length > 1 ? targets : []) {
        await page.locator(`[href="#${id}"]`).focus();
        await page.keyboard.press("Enter");
        expect(
          await page.evaluate(
            (id) => document.activeElement?.id === id && location.hash === "",
            id,
          ),
        ).toBe(true);
      }
      expect(control.posts === 0).toBe(true);
      await routeHygieneCheckpoint(page, "student-field-errors");
      await scan(page);
    }),
  );

test(
  "student password paste preserves exact Unicode spaces and clipboard has no automatic handoff",
  protectedJourney(async (page) => {
    const control = await studentBackend(page);
    await page
      .context()
      .grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`${list}/new`);
    await mounted(page, "Create student");
    await fillStudent(page);
    try {
      const value = ` ${routeSecretFixture(page).password} 密 `;
      await page.evaluate(
        async (text) => navigator.clipboard.writeText(text),
        value,
      );
      for (const id of ["new-password", "password-confirmation"]) {
        const input = page.locator(`#${id}`);
        await input.fill("");
        await input.focus();
        await page.keyboard.press(
          process.platform === "darwin" ? "Meta+V" : "Control+V",
        );
        expect((await input.inputValue()) === value).toBe(true);
      }
      await routeHygieneCheckpoint(page, "student-pasted");
      await submit(page);
      await mounted(page, "Student membership");
      expect(
        control.valid &&
          control.posts === 1 &&
          (await page.evaluate(
            async (text) => (await navigator.clipboard.readText()) === text,
            value,
          )),
      ).toBe(true);
      await secretAbsent(page);
    } finally {
      await page.evaluate(async () => navigator.clipboard.writeText(""));
    }
  }),
);

for (const loss of ["csrf", "expired", "restricted", "denied"])
  test(
    `student ${loss} clears credential surface and never retries unsafe creation`,
    protectedJourney(async (page) => {
      const control = await studentBackend(page);
      await page.goto(`${list}/new`);
      await mounted(page, "Create student");
      await fillStudent(page);
      control.outcome = loss;
      control.denial = loss === "denied";
      await submit(page);
      await expect.poll(() => page.locator("#new-password").count()).toBe(0);
      await secretAbsent(page);
      expect(control.posts === 1 && control.membershipReads === 0).toBe(true);
      await routeHygieneCheckpoint(page, "student-security");
    }),
  );

test(
  "student stage and independent capability gates never discover course or roster",
  protectedJourney(async (page) => {
    const control = await studentBackend(page);
    for (const stage of ["anonymous", "mfa", "password-change"]) {
      control.course.base.stage = stage;
      await page.goto(`${list}/new`);
      await expect
        .poll(() =>
          page
            .locator("h1")
            .textContent()
            .then(
              (value) =>
                value !== "Checking access" && value !== "Create student",
            ),
        )
        .toBe(true);
      expect(
        control.course.detailReads.length === 0 &&
          control.rosterReads === 0 &&
          (await page.locator("#student-username").count()) === 0,
      ).toBe(true);
    }
    control.course.base.stage = "authenticated";
    for (const capability of [
      "accounts.administer",
      "students.manage",
      "learning.participate",
      "mentoring.fulfill",
    ]) {
      control.course.grants = new Set([capability]);
      await page.goto(`${list}/new`);
      await mounted(page, "Home");
      expect(
        control.course.detailReads.length === 0 &&
          control.rosterReads === 0 &&
          control.posts === 0,
      ).toBe(true);
    }
  }),
);

test(
  "student preflight deactivation sends nothing and inactive POST destroys credentials",
  protectedJourney(async (page) => {
    const control = await studentBackend(page);
    await page.goto(`${list}/new`);
    await mounted(page, "Create student");
    await fillStudent(page);
    control.course.courseState = "inactive";
    await submit(page);
    await expect.poll(() => page.locator("#new-password").count()).toBe(0);
    await secretAbsent(page);
    expect(control.posts === 0).toBe(true);
    control.course.courseState = "active";
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page.locator("#student-username").waitFor();
    await fillStudent(page);
    control.outcome = "inactive";
    await submit(page);
    await expect.poll(() => page.locator("#new-password").count()).toBe(0);
    await secretAbsent(page);
    expect(control.posts === 1).toBe(true);
    await routeHygieneCheckpoint(page, "student-inactive");
  }),
);

test(
  "student connected active nonaccepting hub creates once and reads minimal membership and roster",
  protectedJourney(async (page) => {
    const control = await studentBackend(page);
    await page.goto(hub);
    await mounted(page, "Course preparation");
    await page
      .getByRole("link", { name: "Create student", exact: true })
      .click();
    await mounted(page, "Create student");
    expect(
      await page
        .locator("h1")
        .evaluate((node) => node === document.activeElement),
    ).toBe(true);
    await fillStudent(page);
    await page
      .getByRole("button", { name: "Show temporary password", exact: true })
      .click();
    expect(
      (await page.locator("#new-password").getAttribute("type")) === "text",
    ).toBe(true);
    await page
      .getByRole("button", { name: "Hide temporary password", exact: true })
      .click();
    await scan(page);
    await routeHygieneCheckpoint(page, "student-input");
    await submit(page);
    await mounted(page, "Student membership");
    expect(
      control.posts === 1 &&
        control.valid &&
        page.url().endsWith(`${list}/student_1`) &&
        control.membershipReads === 1 &&
        control.forbiddenReads === 0,
    ).toBe(true);
    await secretAbsent(page);
    await scan(page);
    await routeHygieneCheckpoint(page, "student-success");
    await page
      .getByRole("link", { name: "Course students", exact: true })
      .click();
    await mounted(page, "Course students");
    await expect
      .poll(
        async () =>
          (await page.locator("tbody tr").count()) === 1 &&
          control.rosterReads === 1,
      )
      .toBe(true);
    await page.reload();
    await mounted(page, "Course students");
    await page.goBack();
    await mounted(page, "Student membership");
    await page.goForward();
    await mounted(page, "Course students");
    expect(control.posts === 1 && control.forbiddenReads === 0).toBe(true);
  }),
);

for (const outcome of ["conflict", "invalid"])
  test(
    `student ${outcome} preserves native correction and raw disclosure remains inert`,
    protectedJourney(async (page) => {
      const control = await studentBackend(page);
      control.outcome = outcome;
      await page.goto(`${list}/new`);
      await mounted(page, "Create student");
      await fillStudent(page);
      await submit(page);
      await expect
        .poll(() =>
          page
            .locator("#new-password")
            .getAttribute("readonly")
            .then((value) => value === null),
        )
        .toBe(true);
      expect(
        (await page.locator("#new-password").inputValue()).includes(
          routeSecretFixture(page).password,
        ) && control.posts === 1,
      ).toBe(true);
      await page
        .getByRole("button", { name: "Technical details", exact: true })
        .click();
      expect(
        (await page.locator("main pre").textContent())?.includes(
          routeSecretFixture(page).rawError,
        ) === true &&
          (await page.locator("main pre a, main pre script").count()) === 0,
      ).toBe(true);
      await routeHygieneCheckpoint(page, "student-rejected");
      await scan(page);
    }),
  );
for (const outcome of ["lose", "malformed", "server"])
  test(
    `student ${outcome} drops credentials and explicit bounded reconciliation never confirms attempt`,
    protectedJourney(async (page) => {
      const control = await studentBackend(page);
      control.outcome = outcome;
      await page.goto(`${list}/new`);
      await mounted(page, "Create student");
      await fillStudent(page);
      await submit(page);
      await expect.poll(() => page.locator("#new-password").count()).toBe(0);
      await secretAbsent(page);
      expect(
        control.posts === 1 &&
          control.rosterReads === 0 &&
          (await page.getByRole("button", { name: /Abandon/ }).count()) === 0,
      ).toBe(true);
      await routeHygieneCheckpoint(page, "student-unknown");
      control.readFail = true;
      await page.getByRole("button", { name: "Refresh", exact: true }).click();
      await expect.poll(() => control.rosterReads).toBe(1);
      expect(
        (await page.getByRole("button", { name: /Abandon/ }).count()) === 0,
      ).toBe(true);
      control.readFail = false;
      await page.getByRole("button", { name: "Refresh", exact: true }).click();
      await expect
        .poll(() => page.getByRole("button", { name: /Abandon/ }).count())
        .toBe(1);
      expect(control.offsets.join() === "0" && control.posts === 1).toBe(true);
      await routeHygieneCheckpoint(page, "student-reconciled");
      await page.getByRole("button", { name: /Abandon/ }).click();
      expect(
        (await page.locator("#new-password").inputValue()) === "" &&
          (await page.locator("#student-username").inputValue()) === "",
      ).toBe(true);
    }),
  );
test(
  "student stopped dispatch destroys native controls and fences late definitive response",
  protectedJourney(async (page) => {
    const control = await studentBackend(page);
    let release = () => {};
    control.release = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.goto(`${list}/new`);
    await mounted(page, "Create student");
    await fillStudent(page);
    await page.locator("form").evaluate((form) => {
      if (!(form instanceof HTMLFormElement)) throw new Error("Missing form.");
      form.requestSubmit();
      form.requestSubmit();
    });
    await page
      .getByRole("button", { name: "Stop waiting", exact: true })
      .click();
    await expect.poll(() => page.locator("#new-password").count()).toBe(0);
    await secretAbsent(page);
    await routeHygieneCheckpoint(page, "student-stopped");
    release();
    await expect.poll(() => control.persisted).toBe(true);
    await expect
      .poll(() =>
        page.getByRole("button", { name: "Refresh", exact: true }).isEnabled(),
      )
      .toBe(true);
    expect(
      control.posts === 1 &&
        control.membershipReads === 0 &&
        page.url().endsWith("/new"),
    ).toBe(true);
    await routeHygieneCheckpoint(page, "student-late");
  }),
);
test(
  "student lifecycle and scope loss destroy credentials without automatic discovery",
  protectedJourney(async (page) => {
    const control = await studentBackend(page);
    await page.goto(`${list}/new`);
    await mounted(page, "Create student");
    await fillStudent(page);
    const reads = control.course.detailReads.length;
    await page.evaluate(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
      window.dispatchEvent(new Event("online"));
      window.dispatchEvent(new Event("focus"));
    });
    await expect.poll(() => page.locator("#new-password").count()).toBe(0);
    await secretAbsent(page);
    expect(
      control.course.detailReads.length === reads && control.posts === 0,
    ).toBe(true);
    await routeHygieneCheckpoint(page, "student-cleared");
    control.course.scopeIds = [];
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await mounted(page, "Home");
    expect(control.course.detailReads.length === reads).toBe(true);
  }),
);
test(
  "student dirty keyboard departure keeps safe focus then discards credential controls",
  protectedJourney(async (page) => {
    await studentBackend(page);
    await page.goto(`${list}/new`);
    await mounted(page, "Create student");
    await fillStudent(page);
    await page.getByRole("link", { name: "Cancel", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => page.getByRole("dialog").count()).toBe(1);
    expect(
      await page
        .getByRole("button", { name: "Stay on this page" })
        .evaluate((node) => node === document.activeElement),
    ).toBe(true);
    await routeHygieneCheckpoint(page, "student-stay");
    await page.keyboard.press("Escape");
    await expect
      .poll(() =>
        page
          .locator("#student-username")
          .evaluate((node) => node === document.activeElement),
      )
      .toBe(true);
    await page.getByRole("link", { name: "Cancel", exact: true }).click();
    await page.getByRole("button", { name: "Discard and leave" }).click();
    await mounted(page, "Course students");
    await secretAbsent(page);
    await routeHygieneCheckpoint(page, "student-discard");
  }),
);
test(
  "student inactive roster pages remain authorized while creation and unsupported actions stay absent",
  protectedJourney(async (page) => {
    const control = await studentBackend(page);
    control.course.courseState = "inactive";
    control.many = true;
    await page.goto(list);
    await mounted(page, "Course students");
    await expect
      .poll(
        async () =>
          (await page
            .getByRole("link", { name: "Create student", exact: true })
            .count()) === 0 && (await page.locator("tbody tr").count()) === 25,
      )
      .toBe(true);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect.poll(() => page.locator("tbody tr").count()).toBe(1);
    expect(
      (await page
        .locator("main h2")
        .evaluate((node) => node === document.activeElement)) &&
        control.offsets.join() === "0,25" &&
        control.forbiddenReads === 0,
    ).toBe(true);
    await scan(page);
    await page.goto(`${list}/new`);
    await mounted(page, "Course access unavailable");
    expect(
      control.posts === 0 &&
        (await page.locator("#new-password").count()) === 0,
    ).toBe(true);
  }),
);
test(
  "student denied membership clears identity with a fixed neutral presentation",
  protectedJourney(async (page) => {
    const control = await studentBackend(page);
    control.denial = true;
    await page.goto(`${list}/student_1`);
    await mounted(page, "Course access unavailable");
    expect(
      !(await page.locator("main").textContent())?.includes(
        routeSecretFixture(page).supervisorUsername,
      ) && control.forbiddenReads === 0,
    ).toBe(true);
    await scan(page);
  }),
);
test(
  "student all seven locales and text modes preserve form roster membership reflow and semantics",
  protectedJourney(async (page) => {
    test.setTimeout(120_000);
    const control = await studentBackend(page);
    control.persisted = true;
    await page.emulateMedia({
      forcedColors: "active",
      reducedMotion: "reduce",
    });
    for (const locale of [
      "en-US",
      "de-DE",
      "es-ES",
      "es-AR",
      "fr-FR",
      "pt-PT",
      "pt-BR",
    ]) {
      const catalog: Record<string, string> = JSON.parse(
        readFileSync(`src/platform/i18n/catalogs/${locale}.json`, "utf8"),
      );
      for (const mode of ["standard", "large", "extra-large"]) {
        await page.setViewportSize({ width: 320, height: 900 });
        await page.addInitScript(
          ({ locale, mode }) => {
            localStorage.setItem("mia.interface.locale", locale);
            localStorage.setItem("mia.interface.text-size", mode);
          },
          { locale, mode },
        );
        for (const [suffix, key] of [
          ["/new", "students.create"],
          ["", "students.list"],
          ["/student_1", "students.membership"],
        ]) {
          await page.goto(`${list}${suffix}`);
          await mounted(page, catalog[key ?? ""] ?? "");
          await page
            .locator(
              suffix === "/new"
                ? "#student-username"
                : suffix === ""
                  ? "main table"
                  : "main dl",
            )
            .waitFor();
          expect(
            (await page.locator("html").getAttribute("lang")) === locale,
          ).toBe(true);
          if (suffix === "/new") {
            await page.locator("form").evaluate((node) => {
              if (node instanceof HTMLFormElement) node.requestSubmit();
            });
            expect(
              await page.evaluate(
                (labels) => {
                  const summary = document.querySelector(
                    '[aria-labelledby="password-change-summary-heading"]',
                  );
                  return (
                    document.activeElement === summary &&
                    labels.every(
                      ([id, label]) =>
                        document.getElementById(`${id}-error`)?.textContent ===
                        label,
                    )
                  );
                },
                [
                  ["student-username", catalog["students.username.invalid"]],
                  ["student-language", catalog["students.language.missing"]],
                  ["student-country", catalog["students.country.missing"]],
                  ["student-time_zone", catalog["students.timeZone.missing"]],
                ],
              ),
            ).toBe(true);
          }
          await geometry(page);
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
          await geometry(page);
        }
      }
    }
  }),
);
for (const mode of ["standard", "large", "extra-large"])
  test(`student complete process at real 200 percent browser zoom ${mode}`, async () => {
    await atBrowserZoom(2, async (page) => {
      const control = await studentBackend(page);
      await page.addInitScript(
        (size) => localStorage.setItem("mia.interface.text-size", size),
        mode,
      );
      await page.goto(`${list}/new`);
      await mounted(page, "Create student");
      await fillStudent(page);
      await geometry(page);
      await routeHygieneCheckpoint(page, "student-input");
      await submit(page);
      await mounted(page, "Student membership");
      await geometry(page);
      await secretAbsent(page);
      expect(control.posts === 1).toBe(true);
      await page
        .getByRole("link", { name: "Course students", exact: true })
        .click();
      await mounted(page, "Course students");
      await geometry(page);
    });
  });
