import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

test.use({ screenshot: "off", trace: "off", video: "off" });
const locales = [
  "en-US",
  "de-DE",
  "fr-FR",
  "pt-PT",
  "pt-BR",
  "es-ES",
  "es-AR",
] as const;
const manifest: Record<string, { file: string; imports?: string[] }> =
  JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8"));

function catalog(locale: string): Record<string, string> {
  return JSON.parse(
    readFileSync(`src/platform/i18n/catalogs/${locale}.json`, "utf8"),
  );
}

function catalogAsset(locale: string): string {
  const entry = manifest[`src/platform/i18n/catalogs/${locale}.json`];
  if (entry === undefined) throw new Error("Missing built locale chunk.");
  return `/${entry.file}`;
}

async function anonymous(page: Page): Promise<void> {
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/vnd.api+json",
      body: JSON.stringify({ data: null, meta: { stage: "anonymous" } }),
    }),
  );
}

for (const locale of locales) {
  test(`cold first content is wholly ${locale} and requests no other catalog`, async ({
    page,
  }) => {
    const requested: string[] = [];
    await anonymous(page);
    await page.addInitScript(
      (chosen) => localStorage.setItem("mia.interface.locale", chosen),
      locale,
    );
    page.on("request", (request) =>
      requested.push(new URL(request.url()).pathname),
    );
    await page.goto("/login");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: catalog(locale)["entry.heading"],
      }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    expect(requested).toContain(catalogAsset(locale));
    for (const other of locales) {
      if (
        other === locale ||
        (locale === "es-AR" && other === "es-ES") ||
        (locale === "pt-BR" && other === "pt-PT")
      )
        continue;
      expect(requested).not.toContain(catalogAsset(other));
    }
    expect(requested.filter((path) => path.endsWith(".json"))).toEqual([]);
  });
}

test("a delayed active catalog leaves no interim English app content or session request", async ({
  page,
}) => {
  let reads = 0;
  await anonymous(page);
  await page.addInitScript(() =>
    localStorage.setItem("mia.interface.locale", "fr-FR"),
  );
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/v1/auth/session") reads++;
  });
  let reached = false;
  let release: () => void = () => {
    throw new Error("Catalog request was not held.");
  };
  await page.route(`**${catalogAsset("fr-FR")}`, async (route) => {
    reached = true;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.continue();
  });
  await page.goto("/login", { waitUntil: "commit" });
  await expect.poll(() => reached).toBe(true);
  await expect(page.locator("#root")).toBeEmpty();
  await expect(page).toHaveTitle("MIA");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr-FR");
  expect(reads).toBe(0);
  release();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: catalog("fr-FR")["entry.heading"],
    }),
  ).toBeVisible();
  expect(reads).toBe(1);
});

test("switch failure retains prior form and locale; explicit asset retry recovers in the browser", async ({
  page,
}) => {
  await anonymous(page);
  await page.addInitScript(() =>
    localStorage.setItem("mia.interface.locale", "en-US"),
  );
  await page.goto("/login");
  await expect(page.locator("#interface-language")).toBeVisible();
  await page.locator("#username").fill("sample");
  let failed = false;
  await page.route(`**${catalogAsset("de-DE")}`, (route) => {
    if (!failed) {
      failed = true;
      return route.abort("failed");
    }
    return route.continue();
  });
  await page.locator("#interface-language").selectOption("de-DE");
  await expect(
    page.locator("#main-content p").getByText("Language: Failed"),
  ).toBeVisible();
  await expect(page.locator("#interface-language")).toHaveValue("en-US");
  await expect(page.locator("#username")).toHaveValue("sample");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  expect(
    await page.evaluate(() => localStorage.getItem("mia.interface.locale")),
  ).toBe("en-US");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "de-DE");
  await expect(page.locator("#interface-language")).toHaveValue("de-DE");
  await expect(page.locator("#username")).toHaveValue("sample");
  await page.locator("#interface-language").selectOption("en-US");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
  await page.locator("#interface-language").selectOption("de-DE");
  await expect(page.locator("html")).toHaveAttribute("lang", "de-DE");
});

for (const outcome of ["success", "failure"] as const) {
  test(`an uncached switch ${outcome} after sign-in cannot alter the MFA locale`, async ({
    page,
    context,
  }) => {
    await anonymous(page);
    await page.clock.setFixedTime(new Date("2026-09-27T10:00:00.000Z"));
    await context.addCookies([
      {
        name: "mia_csrf",
        value: crypto.randomUUID(),
        url: "http://127.0.0.1:4173/",
      },
    ]);
    await page.addInitScript(() =>
      localStorage.setItem("mia.interface.locale", "en-US"),
    );
    await page.route("**/api/v1/auth/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/vnd.api+json",
        body: JSON.stringify({
          data: {
            type: "auth-sessions",
            id: "account-id",
            attributes: {
              stage: "mfa",
              mfa_challenge_id: "challenge-id",
              idle_expires_at: "2026-09-27T10:30:00.000000Z",
              absolute_expires_at: "2026-09-27T22:00:00.000000Z",
            },
          },
        }),
      }),
    );
    let release: () => void = () => {
      throw new Error("Catalog request not held.");
    };
    let held = false;
    await page.route(`**${catalogAsset("de-DE")}`, async (route) => {
      held = true;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      if (outcome === "success") await route.continue();
      else await route.abort("failed");
    });
    await page.goto("/login");
    await page.locator("#interface-language").selectOption("de-DE");
    await expect.poll(() => held).toBe(true);
    await page.locator("#username").fill("example");
    await page.locator("#password").fill(crypto.randomUUID());
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/mfa$/u);
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    const settled = page.waitForEvent(
      outcome === "success" ? "requestfinished" : "requestfailed",
      (request) => new URL(request.url()).pathname === catalogAsset("de-DE"),
    );
    release();
    await settled;
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
    await expect(page.locator("main h1")).toHaveText(
      catalog("en-US")["entry.mfa.heading"],
    );
    expect(
      await page.evaluate(() => localStorage.getItem("mia.interface.locale")),
    ).toBe("en-US");
    const announcements = (
      await page
        .locator('[aria-live="polite"], [aria-live="assertive"]')
        .allTextContents()
    ).join(" ");
    expect(announcements).not.toContain(
      catalog("de-DE")["entry.language.changed"],
    );
    expect(announcements).not.toContain(
      `${catalog("en-US")["entry.language.label"]}: ${catalog("en-US")["materials.failed"]}`,
    );
  });
}

test("failed active catalog never mounts the app or discovers a session; explicit retry recovers", async ({
  page,
}) => {
  let discovered = 0;
  await anonymous(page);
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/v1/auth/session")
      discovered++;
  });
  await page.addInitScript(() =>
    localStorage.setItem("mia.interface.locale", "de-DE"),
  );
  let fail = true;
  await page.route(`**${catalogAsset("de-DE")}`, (route) =>
    fail ? route.abort("failed") : route.continue(),
  );
  await page.goto("/login");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: catalog("de-DE")["route.unavailable"],
    }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "de-DE");
  await expect(page).toHaveTitle("MIA");
  expect(discovered).toBe(0);
  await expect(page.locator("#username")).toHaveCount(0);
  const bypass = page.getByRole("link", {
    name: catalog("de-DE")["entry.skipLink"],
  });
  await page.keyboard.press("Tab");
  await expect(bypass).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  expect(new URL(page.url()).hash).toBe("");
  let retryFails = true;
  await page.route(/\/assets\/de-DE-[^/]+\.json$/u, (route) =>
    retryFails ? route.abort("failed") : route.continue(),
  );
  const retry = page.getByRole("button", {
    name: catalog("de-DE")["entry.invitation.preview.tryAgain"],
  });
  await retry.click();
  await expect(retry).toBeEnabled();
  expect(discovered).toBe(0);
  fail = false;
  retryFails = false;
  await retry.click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: catalog("de-DE")["entry.heading"],
    }),
  ).toBeVisible();
  expect(discovered).toBe(1);
});
