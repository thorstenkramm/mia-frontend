import { randomBytes, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  provisioningUriFixture,
  recoveryCodesFixture,
  totpSecretFixture,
} from "../test/mfaFixtures";
import { routeHygieneCases } from "../scripts/route-secret-hygiene-cases";

type Fixture = {
  readonly csrf: string;
  readonly invitationToken: string;
  readonly password: string;
  readonly mfaCode: string;
  readonly totpSecret: string;
  readonly codes: readonly string[];
  readonly rawError: string;
  // A synthetic invitee address: protected personal data, never a test name.
  readonly email: string;
  readonly courseName: string;
  readonly supervisorUsername: string;
  readonly teachingText: string;
};
const fixtures = new WeakMap<Page, Fixture>();

function currentCase() {
  const item = routeHygieneCases.find(
    (candidate) => candidate.title === test.info().title,
  );
  if (!item)
    throw new Error(
      "The actual route test is missing from the hygiene inventory.",
    );
  return item;
}

export function routeSecretFixture(page: Page): Fixture {
  const held = fixtures.get(page);
  if (held) return held;
  const seed = process.env.MIA_ROUTE_HYGIENE_FIXTURE;
  let fixture: Fixture;
  if (seed === undefined) {
    fixture = {
      csrf: randomUUID(),
      invitationToken: randomUUID(),
      password: `fixture-${randomBytes(24).toString("hex")}`,
      mfaCode: String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(
        6,
        "0",
      ),
      totpSecret: totpSecretFixture(),
      codes: recoveryCodesFixture(),
      rawError: `fixture-body-${randomBytes(24).toString("hex")}`,
      email: `invitee-${randomBytes(12).toString("hex")}@example.test`,
      courseName: `درس course-${randomUUID()}`,
      supervisorUsername: `supervisor.${randomUUID().slice(0, 12)}`,
      teachingText: `تعليم teaching-${randomUUID()}`,
    };
  } else {
    const value: unknown = JSON.parse(seed);
    if (
      typeof value !== "object" ||
      value === null ||
      !("csrf" in value) ||
      typeof value.csrf !== "string" ||
      !("invitationToken" in value) ||
      typeof value.invitationToken !== "string" ||
      !("password" in value) ||
      typeof value.password !== "string" ||
      !("mfaCode" in value) ||
      typeof value.mfaCode !== "string" ||
      !("totpSecret" in value) ||
      typeof value.totpSecret !== "string" ||
      !("rawError" in value) ||
      typeof value.rawError !== "string" ||
      !("email" in value) ||
      typeof value.email !== "string" ||
      !("codes" in value) ||
      !("courseName" in value) ||
      typeof value.courseName !== "string" ||
      !("supervisorUsername" in value) ||
      typeof value.supervisorUsername !== "string" ||
      !("teachingText" in value) ||
      typeof value.teachingText !== "string" ||
      !Array.isArray(value.codes) ||
      value.codes.length !== 10 ||
      !value.codes.every((code: unknown) => typeof code === "string")
    )
      throw new Error("Invalid route-hygiene fixture envelope.");
    fixture = {
      csrf: value.csrf,
      invitationToken: value.invitationToken,
      password: value.password,
      mfaCode: value.mfaCode,
      totpSecret: value.totpSecret,
      rawError: value.rawError,
      email: value.email,
      codes: value.codes,
      courseName: value.courseName,
      supervisorUsername: value.supervisorUsername,
      teachingText: value.teachingText,
    };
  }
  fixtures.set(page, fixture);
  return fixture;
}

export function routeProvisioningFixture(page: Page): string {
  return provisioningUriFixture(
    routeSecretFixture(page).totpSecret,
    "127.0.0.1:4173",
  );
}

export function routeFailureFixture(page: Page): Response {
  return new Response(
    JSON.stringify({
      errors: [
        {
          status: "503",
          code: "unavailable",
          detail: routeSecretFixture(page).rawError,
        },
      ],
    }),
    { status: 503, headers: { "Content-Type": "application/vnd.api+json" } },
  );
}

export function injectRouteEarlyFailure(): void {
  if (process.env.MIA_ROUTE_HYGIENE_EARLY === "1")
    throw new Error(
      "ControlledRouteHygieneEarlyFailure: no secret checkpoint reached.",
    );
}

export async function routeHygieneCheckpoint(
  page: Page,
  point: string,
): Promise<void> {
  if (process.env.MIA_ROUTE_HYGIENE_POINT !== point) return;
  const item = currentCase();
  if (
    process.env.MIA_ROUTE_HYGIENE_CASE !== item.id ||
    !item.checkpoints.some((checkpoint) => checkpoint === point)
  )
    throw new Error("Unexpected route-hygiene test/checkpoint selection.");
  const fixture = routeSecretFixture(page);
  // Confirm exposure with boolean assertions only. No marker enters a matcher,
  // checkpoint, test name, exception or report. Cookie-only tests use public
  // settled-state assertions in their original bodies before `complete`.
  if (point === "learn-metadata") {
    const text = await page.locator("main").textContent();
    expect(
      text?.includes(fixture.courseName) === true &&
        !text.includes(fixture.teachingText) &&
        !text.includes(fixture.rawError),
    ).toBe(true);
  } else if (point === "tutoring-content") {
    const text = await page.locator("main").textContent();
    expect(
      text?.includes(fixture.teachingText) === true &&
        !text.includes(fixture.rawError),
    ).toBe(true);
  } else if (point === "tutoring-course") {
    const text = await page.locator("main").textContent();
    expect(
      text?.includes(fixture.courseName) === true &&
        !text.includes(fixture.rawError),
    ).toBe(true);
  } else if (point === "learn-hidden") {
    expect(
      (await page.locator("main").textContent())?.includes(
        fixture.courseName,
      ) === false && (await page.locator("main table").count()) === 0,
    ).toBe(true);
  } else if (point === "learn-error") {
    expect(
      await page
        .locator("main pre")
        .evaluateAll(
          (nodes, marker) =>
            nodes.some(
              (node) =>
                node.getClientRects().length > 0 &&
                node.textContent?.includes(marker) === true,
            ),
          fixture.rawError,
        ),
    ).toBe(true);
  } else if (point === "student-entry-provision-input") {
    for (const selector of ["#new-password", "#password-confirmation"])
      expect(
        (await page.locator(selector).inputValue()).includes(fixture.password),
      ).toBe(true);
  } else if (
    point === "student-entry-login-input" ||
    point === "student-entry-later-login-input"
  ) {
    expect(
      (await page.locator("#password").inputValue()).includes(fixture.password),
    ).toBe(true);
  } else if (point === "student-entry-replacement-input") {
    for (const selector of ["#new-password", "#password-confirmation"])
      expect(
        (await page.locator(selector).inputValue()).includes(fixture.password),
      ).toBe(true);
    expect(
      (await page.locator("#new-password").getAttribute("type")) === "text",
    ).toBe(true);
  } else if (
    point === "material-create-input" ||
    point === "material-create-unknown"
  ) {
    expect(
      (await page.locator("#material-name").inputValue()) ===
        fixture.courseName,
    ).toBe(true);
  } else if (
    [
      "material-selected",
      "material-persisted",
      "material-unknown",
      "material-reconciled",
      "material-many",
      "material-delete-unknown",
    ].includes(point)
  ) {
    expect(
      await page
        .locator("main")
        .textContent()
        .then((text) => text?.includes(fixture.courseName) === true),
    ).toBe(true);
  } else if (point === "material-cleared") {
    expect((await page.locator("#material-picker").count()) === 0).toBe(true);
  } else if (point === "preparation-input" || point === "preparation-unknown") {
    expect(
      (await page.locator("#teaching-field").inputValue()).includes(
        fixture.teachingText,
      ),
    ).toBe(true);
  } else if (point === "preparation-persisted") {
    await expect
      .poll(() =>
        page.evaluate(
          (marker) =>
            document.querySelector("main")?.textContent?.includes(marker) ===
            true,
          fixture.courseName,
        ),
      )
      .toBe(true);
  } else if (point === "course-input") {
    expect(
      (await page.locator("#course-name").inputValue()) === fixture.courseName,
    ).toBe(true);
  } else if (point === "course-persisted") {
    await expect
      .poll(async () =>
        page.evaluate(
          (marker) =>
            document.querySelector("main")?.textContent?.includes(marker) ===
            true,
          fixture.courseName,
        ),
      )
      .toBe(true);
  } else if (
    point === "course-error" ||
    point === "preparation-error" ||
    point === "material-error"
  ) {
    await page
      .getByRole("button", { name: "Technical details", exact: true })
      .click();
    expect(
      await page
        .locator("main pre")
        .evaluateAll(
          (nodes, marker) =>
            nodes.some(
              (node) =>
                node.getClientRects().length > 0 &&
                node.textContent?.includes(marker) === true,
            ),
          fixture.rawError,
        ),
    ).toBe(true);
  } else if (point === "onboarding-acceptance-input") {
    for (const selector of ["#new-password", "#password-confirmation"])
      expect(
        (await page.locator(selector).inputValue()) === fixture.password,
      ).toBe(true);
  } else if (point === "onboarding-login-input") {
    expect(
      (await page.locator("#password").inputValue()) === fixture.password,
    ).toBe(true);
  } else if (point === "onboarding-mfa-input") {
    expect(
      (await page.locator("#mfa-code").inputValue()) === fixture.mfaCode,
    ).toBe(true);
  } else if (point === "invitation-form") {
    expect(
      (await page
        .getByLabel("New password (required)", { exact: true })
        .inputValue()) === fixture.password,
    ).toBe(true);
  } else if (point === "totp-input") {
    expect(
      (await page
        .getByLabel("Six-digit code from your authenticator app (required)")
        .inputValue()) === fixture.mfaCode,
    ).toBe(true);
    expect(
      await page.evaluate(
        (marker) => document.body.textContent?.includes(marker) === true,
        fixture.totpSecret,
      ),
    ).toBe(true);
  } else if (point === "invitation-email") {
    expect(
      (await page
        .getByLabel("Supervisor’s email address", { exact: true })
        .inputValue()) === fixture.email,
    ).toBe(true);
  } else if (point === "invitation-detail") {
    expect(
      await page.evaluate(
        (marker) =>
          document.querySelector("main")?.textContent?.includes(marker) ===
          true,
        fixture.email,
      ),
    ).toBe(true);
  } else if (
    point === "read-failure" ||
    point === "onboarding-gate-error" ||
    point === "student-entry-gate-error" ||
    point === "invitation-error" ||
    point === "logout-unconfirmed" ||
    (point === "codes-held" && item.id === "recovery-codes-read")
  ) {
    await page
      .getByRole("button", { name: "Technical details", exact: true })
      .click();
    expect(
      await page
        .locator("main pre")
        .textContent()
        .then((text) => text?.includes(fixture.rawError) === true),
    ).toBe(true);
  }
  const directory = process.env.MIA_ROUTE_HYGIENE_EVIDENCE;
  if (!directory)
    throw new Error("Route-hygiene checkpoint directory is required.");
  const id = `${item.id}:${point}`;
  writeFileSync(join(directory, "checkpoint"), id, { flag: "wx" });
  // Deliberately exercise the original matcher/report formatting while the
  // secret-bearing surface is live. The actual journey's finally closes it.
  try {
    expect(false, "Intentional route-test hygiene assertion").toBe(true);
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    error.message = `ControlledRouteHygieneFailure:${id}\n${error.message}`;
    throw error;
  }
  throw new Error("The intentional route-hygiene assertion did not fail.");
}

export function releaseRouteFixture(page: Page): void {
  fixtures.delete(page);
}
