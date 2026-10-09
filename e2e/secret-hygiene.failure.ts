import { expect, test } from "@playwright/test";
import { expectRetainedSecret } from "./secretAssertions";
import { materialBackend } from "./materialFixtures";
import {
  browserCases,
  controlledFailure,
  injectEarlyFailure,
  hygieneOrigin,
} from "../scripts/secret-hygiene-evidence";

const mediaType = "application/vnd.api+json";
const later = (minutes: number) =>
  new Date(Date.now() + minutes * 60_000).toISOString().replace("Z", "000Z");

test.use({ screenshot: "off", trace: "off", video: "off" });
test.beforeEach(({ page }, info) => {
  void page;
  injectEarlyFailure(info.title);
});

for (const id of browserCases.slice(5))
  test(id, async ({ page }) => {
    const marker = process.env.MIA_SECRET_HYGIENE_RAW_ERROR;
    if (marker === undefined)
      throw new Error("Controlled material marker required.");
    const backend = await materialBackend(page, { lifecycle: true });
    backend.makeReady();
    if (backend.brief) backend.brief.summary = marker;
    let release: () => void = () => undefined;
    try {
      if (id === "browser-material-processing") {
        backend.state = "processing";
        backend.files = ["file_1"];
        await page.goto(
          "/prepare/courses/course_1/materials/material_1/processing",
        );
        await expect
          .poll(() =>
            page
              .locator("h1")
              .textContent()
              .then((text) => text === "Course material processing"),
          )
          .toBe(true);
      } else {
        await page.goto("/prepare/courses/course_1/materials/material_1/brief");
        await expect
          .poll(() =>
            page
              .locator("#brief-summary")
              .count()
              .then((count) => count === 1),
          )
          .toBe(true);
        expect(
          (await page.locator("#brief-summary").inputValue()) === marker,
        ).toBe(true);
        if (
          id === "browser-material-pending" ||
          id === "browser-material-teardown"
        )
          backend.lifecycleRelease = new Promise<void>((resolve) => {
            release = resolve;
          });
        if (id === "browser-material-unknown")
          backend.lifecycleOutcome = "lose";
        if (id === "browser-material-rejected")
          backend.lifecycleOutcome = "reject";
        if (id !== "browser-material-preview") {
          await page.locator("#brief-summary").fill(`${marker}-changed`);
          await page
            .getByRole("button", { name: "Save complete brief", exact: true })
            .click();
          await expect.poll(() => backend.saves === 1).toBe(true);
          if (id === "browser-material-unknown")
            await expect
              .poll(() =>
                page
                  .locator("main")
                  .textContent()
                  .then((text) => text?.includes("Outcome unknown.") === true),
              )
              .toBe(true);
          if (id === "browser-material-rejected")
            await expect
              .poll(() =>
                page
                  .locator("main")
                  .textContent()
                  .then(
                    (text) =>
                      text?.includes("This operation was not accepted.") ===
                      true,
                  ),
              )
              .toBe(true);
          if (id === "browser-material-teardown") {
            await page.evaluate(() =>
              window.dispatchEvent(
                new PageTransitionEvent("pagehide", { persisted: true }),
              ),
            );
            await expect
              .poll(() =>
                page
                  .locator("#brief-summary")
                  .count()
                  .then((count) => count === 0),
              )
              .toBe(true);
          }
        }
      }
      await page.close();
      controlledFailure(id, () => expect(false).toBe(true));
    } finally {
      release();
      await page.close();
    }
  });

test(browserCases[0], async ({ page, context }) => {
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
      url: hygieneOrigin,
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
            idle_expires_at: later(30),
            absolute_expires_at: later(720),
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
              idle_expires_at: later(30),
              absolute_expires_at: later(720),
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
  controlledFailure(browserCases[0], () => expect(false).toBe(true));
});

test(browserCases[1], async ({ page }) => {
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
            idle_expires_at: later(30),
            absolute_expires_at: later(720),
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

  controlledFailure(browserCases[1], () =>
    expectRetainedSecret(retained, replacementPassword, "New password field"),
  );
});

test(browserCases[2], async ({ page, context }) => {
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
      url: hygieneOrigin,
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
  controlledFailure(browserCases[2], () => expect(false).toBe(true));
});

test(browserCases[3], async ({ page, context }) => {
  const invitationToken = process.env.MIA_SECRET_HYGIENE_INVITATION_TOKEN;
  const invitationPassword = process.env.MIA_SECRET_HYGIENE_INVITATION_PASSWORD;
  const rawError = process.env.MIA_SECRET_HYGIENE_RAW_ERROR;
  if (
    invitationToken === undefined ||
    invitationPassword === undefined ||
    rawError === undefined
  )
    throw new Error("Controlled fixture markers are required.");

  await context.addCookies([
    {
      name: "mia_csrf",
      value: crypto.randomUUID(),
      url: hygieneOrigin,
    },
  ]);
  await page.route("**/api/v1/auth/session", async (route) =>
    route.fulfill({
      status: 200,
      contentType: mediaType,
      body: JSON.stringify({ data: null, meta: { stage: "anonymous" } }),
    }),
  );
  await page.route("**/api/v1/invitation-previews", async (route) =>
    route.fulfill({
      status: 200,
      contentType: mediaType,
      body: JSON.stringify({
        data: {
          type: "invitation-previews",
          id: "preview",
          attributes: { platform: "mia", role: "mentor" },
        },
      }),
    }),
  );
  await page.route("**/api/v1/invitation-acceptances", async (route) =>
    route.fulfill({ status: 409, contentType: mediaType, body: rawError }),
  );
  await page.goto(`/invitation#token=${invitationToken}`);
  await page.getByRole("link", { name: "Accept invitation" }).click();
  await page.locator("#username").fill("example.mentor");
  await page.locator("#new-password").fill(invitationPassword);
  await page.locator("#password-confirmation").fill(invitationPassword);
  await page.getByRole("button", { name: "Show new password" }).click();
  await page.locator("#country").selectOption("DE");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("button", { name: "Technical details" }).click();
  await page.locator("pre").waitFor({ state: "visible" });
  await page.close();

  // Deliberately fail without a locator, snapshot, fixture value, or DOM dump.
  controlledFailure(browserCases[3], () => expect(false).toBe(true));
});

test(browserCases[4], async ({ page, context }) => {
  const uri = process.env.MIA_SECRET_HYGIENE_TOTP_URI;
  const codeSet = process.env.MIA_SECRET_HYGIENE_RECOVERY_CODE_SET;
  const mfaCode = process.env.MIA_SECRET_HYGIENE_MFA_CODE;
  const rawError = process.env.MIA_SECRET_HYGIENE_RAW_ERROR;
  if (
    uri === undefined ||
    codeSet === undefined ||
    mfaCode === undefined ||
    rawError === undefined
  )
    throw new Error("Controlled fixture markers are required.");
  const actions = [
    "profile.view",
    "profile.edit",
    "accounts.administer",
    "audit.view",
    "jobs.view",
    "courses.create",
    "course_records.manage",
    "course_supervisors.manage",
    "courses.supervise",
    "students.manage",
    "students.ban",
    "students.unban",
    "learning.participate",
    "mentoring.fulfill",
  ];
  let pending = false;
  let active = false;

  await context.addCookies([
    {
      name: "mia_csrf",
      value: crypto.randomUUID(),
      url: hygieneOrigin,
    },
  ]);
  await page.route("**/api/v1/auth/session", async (route) =>
    route.fulfill({
      status: 200,
      contentType: mediaType,
      body: JSON.stringify({
        data: {
          type: "auth-sessions",
          id: "account-id",
          attributes: {
            stage: "authenticated",
            idle_expires_at: later(30),
            absolute_expires_at: later(720),
          },
        },
      }),
    }),
  );
  await page.route("**/api/v1/users/me/capabilities", async (route) =>
    route.fulfill({
      status: 200,
      contentType: mediaType,
      body: JSON.stringify({
        data: {
          type: "account-capabilities",
          id: "account-id",
          attributes: {
            capabilities: actions.map((action) => ({
              action,
              available: action === "profile.view",
              scope: {
                global: false,
                course_ids: [],
                student_ids: [],
                course_students: [],
                own_resource: action === "profile.view",
              },
            })),
          },
        },
      }),
    }),
  );
  await page.route("**/api/v1/users/me/mfa", async (route) =>
    route.fulfill({
      status: 200,
      contentType: mediaType,
      body: JSON.stringify({
        data: {
          type: "mfa-states",
          id: "account-id",
          attributes: {
            active_factor: active ? { id: "mff_active", method: "totp" } : null,
            pending_enrollment: pending
              ? {
                  id: "mfe_pending",
                  method: "totp",
                  expires_at: later(30),
                  replaces_factor_id: null,
                }
              : null,
            actions: {
              enroll: !pending && !active,
              continue: pending,
              cancel: pending,
              disable: active,
              replace: active,
              verify: pending,
              sms_resend: false,
            },
          },
        },
      }),
    }),
  );
  await page.route("**/api/v1/users/me/mfa-enrollments", async (route) => {
    pending = true;
    return route.fulfill({
      status: 201,
      contentType: mediaType,
      body: JSON.stringify({
        data: {
          type: "mfa-enrollments",
          id: "mfe_pending",
          attributes: { method: "totp", provisioning_uri: uri },
        },
      }),
    });
  });
  let verifications = 0;
  await page.route(
    "**/api/v1/users/me/mfa-enrollments/mfe_pending/verifications",
    async (route) => {
      verifications++;
      if (verifications === 1)
        return route.fulfill({
          status: 422,
          contentType: mediaType,
          body: rawError,
        });
      pending = false;
      active = true;
      return route.fulfill({
        status: 200,
        contentType: mediaType,
        body: JSON.stringify({
          data: {
            type: "mfa-recovery-codes",
            id: "mfe_pending",
            attributes: { recovery_codes: codeSet.split(",") },
          },
        }),
      });
    },
  );
  await page.goto("/profile/security/mfa/enroll");
  await page.getByRole("button", { name: "Start setup" }).click();
  await page.locator("main svg[role=img]").waitFor({ state: "visible" });
  const field = page.getByLabel(
    "Six-digit code from your authenticator app (required)",
  );
  await field.fill(mfaCode);
  await page.getByRole("button", { name: "Verify code" }).click();
  await page.getByRole("button", { name: "Technical details" }).first().click();
  await page.locator("pre").first().waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Verify code" }).click();
  await page.getByRole("button", { name: "Show recovery codes" }).click();
  await page.locator("main ol li").first().waitFor({ state: "visible" });
  await page.close();

  // Deliberately fail without a locator, snapshot, fixture value, or DOM dump.
  controlledFailure(browserCases[4], () => expect(false).toBe(true));
});
