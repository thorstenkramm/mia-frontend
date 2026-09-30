import { expect, test } from "@playwright/test";

const mediaType = "application/vnd.api+json";

test.use({ screenshot: "off", trace: "off", video: "off" });

test("controlled secret-bearing failure", async ({ page, context }) => {
  const username = process.env.MIA_SECRET_HYGIENE_USERNAME;
  const password = process.env.MIA_SECRET_HYGIENE_PASSWORD;
  const rawError = process.env.MIA_SECRET_HYGIENE_RAW_ERROR;
  if (
    username === undefined ||
    password === undefined ||
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
  await page.route("**/api/v1/auth/login", async (route) =>
    route.fulfill({ status: 401, contentType: mediaType, body: rawError }),
  );
  await page.goto("/");
  await page.locator("#username").fill(username);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Show password" }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("button", { name: "Technical details" }).click();
  await page.locator("pre").waitFor({ state: "visible" });
  await page.close();

  // Deliberately fail without a locator, snapshot, fixture value, or DOM dump.
  expect(false).toBe(true);
});
