import { expect, test } from "@playwright/test";
import { expectRetainedSecret } from "./secretAssertions";

const mediaType = "application/vnd.api+json";

test.use({ screenshot: "off", trace: "off", video: "off" });

test("controlled secret-bearing failure", async ({ page, context }) => {
  const username = process.env.MIA_SECRET_HYGIENE_USERNAME;
  const password = process.env.MIA_SECRET_HYGIENE_PASSWORD;
  const rawError = process.env.MIA_SECRET_HYGIENE_RAW_ERROR;
  const mfaCode = process.env.MIA_SECRET_HYGIENE_MFA_CODE;
  const recoveryCode = process.env.MIA_SECRET_HYGIENE_RECOVERY_CODE;
  const replacementPassword =
    process.env.MIA_SECRET_HYGIENE_REPLACEMENT_PASSWORD;
  if (
    username === undefined ||
    password === undefined ||
    rawError === undefined ||
    mfaCode === undefined ||
    recoveryCode === undefined ||
    replacementPassword === undefined
  )
    throw new Error("Controlled fixture markers are required.");

  await context.addCookies([
    {
      name: "mia_csrf",
      value: crypto.randomUUID(),
      url: "http://127.0.0.1:4173/",
    },
  ]);
  await page.route("**/api/v1/auth/session", async (route) =>
    route.fulfill({
      status: 200,
      contentType: mediaType,
      body: JSON.stringify({ data: null, meta: { stage: "anonymous" } }),
    }),
  );
  await page.route("**/api/v1/auth/login", async (route) =>
    route.fulfill({
      status: 200,
      contentType: mediaType,
      body: JSON.stringify({
        data: {
          type: "auth-sessions",
          id: "account-id",
          attributes: {
            stage: "mfa",
            mfa_challenge_id: "challenge-id",
            idle_expires_at: "2026-10-01T10:30:00.000000Z",
            absolute_expires_at: "2026-10-01T10:30:00.000000Z",
          },
        },
      }),
    }),
  );
  await page.route(
    "**/api/v1/auth/mfa-challenges/challenge-id/recovery-code-consumptions",
    async (route) =>
      route.fulfill({
        status: 200,
        contentType: mediaType,
        body: JSON.stringify({
          data: {
            type: "auth-sessions",
            id: "account-id",
            attributes: {
              stage: "password-change",
              idle_expires_at: "2026-10-01T10:30:00.000000Z",
              absolute_expires_at: "2026-10-01T10:30:00.000000Z",
            },
          },
        }),
      }),
  );
  await page.route("**/api/v1/auth/password-changes", async (route) =>
    route.fulfill({ status: 422, contentType: mediaType, body: rawError }),
  );
  await page.goto("/");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Show password" }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Six-digit code (required)").fill(mfaCode);
  await page
    .getByRole("button", { name: "Use a recovery code instead" })
    .click();
  await page.getByLabel("Recovery code (required)").fill(recoveryCode);
  await page.getByRole("button", { name: "Use recovery code" }).click();
  await page.locator("#new-password").fill(replacementPassword);
  await page.locator("#password-confirmation").fill(replacementPassword);
  await page.getByRole("button", { name: "Show new password" }).click();
  await page
    .getByRole("button", { name: "Show password confirmation" })
    .click();
  await page.getByRole("button", { name: "Save new password" }).click();
  await page.getByRole("button", { name: "Technical details" }).click();
  await page.locator("pre").waitFor({ state: "visible" });
  await page.close();

  // Deliberately fail without a locator, snapshot, fixture value, or DOM dump.
  expect(false).toBe(true);
});

test("controlled retained-secret assertion failure", async ({ page }) => {
  const replacementPassword =
    process.env.MIA_SECRET_HYGIENE_REPLACEMENT_PASSWORD;
  if (replacementPassword === undefined)
    throw new Error("Controlled fixture markers are required.");
  await page.route("**/api/v1/auth/session", async (route) =>
    route.fulfill({
      status: 200,
      contentType: mediaType,
      body: JSON.stringify({
        data: {
          type: "auth-sessions",
          id: "account-id",
          attributes: {
            stage: "password-change",
            idle_expires_at: "2026-10-01T10:30:00.000000Z",
            absolute_expires_at: "2026-10-01T10:30:00.000000Z",
          },
        },
      }),
    }),
  );
  await page.goto("/auth/password-change");
  // Simulate a preservation regression: the field holds a different value that
  // still contains the marker, so either side leaking would be detected.
  await page.locator("#new-password").fill(`${replacementPassword}-regressed`);
  const retained = await page.locator("#new-password").inputValue();
  await page.close();

  expectRetainedSecret(retained, replacementPassword, "New password field");
});

test("controlled reset-token failure", async ({ page, context }) => {
  const resetToken = process.env.MIA_SECRET_HYGIENE_RESET_TOKEN;
  const resetPassword = process.env.MIA_SECRET_HYGIENE_RESET_PASSWORD;
  const rawError = process.env.MIA_SECRET_HYGIENE_RAW_ERROR;
  if (
    resetToken === undefined ||
    resetPassword === undefined ||
    rawError === undefined
  )
    throw new Error("Controlled fixture markers are required.");

  await context.addCookies([
    {
      name: "mia_csrf",
      value: crypto.randomUUID(),
      url: "http://127.0.0.1:4173/",
    },
  ]);
  await page.route("**/api/v1/auth/session", async (route) =>
    route.fulfill({
      status: 200,
      contentType: mediaType,
      body: JSON.stringify({ data: null, meta: { stage: "anonymous" } }),
    }),
  );
  await page.route("**/api/v1/auth/password-resets", async (route) =>
    route.fulfill({ status: 422, contentType: mediaType, body: rawError }),
  );
  await page.goto(`/password-reset#token=${resetToken}`);
  await page.locator("#new-password").fill(resetPassword);
  await page.locator("#password-confirmation").fill(resetPassword);
  await page.getByRole("button", { name: "Show new password" }).click();
  await page.getByRole("button", { name: "Change password" }).click();
  await page.getByRole("button", { name: "Technical details" }).click();
  await page.locator("pre").waitFor({ state: "visible" });
  await page.close();

  // Deliberately fail without a locator, snapshot, fixture value, or DOM dump.
  expect(false).toBe(true);
});
