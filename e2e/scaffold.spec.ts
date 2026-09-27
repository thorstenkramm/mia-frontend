import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const locales = [
  "en-US",
  "de-DE",
  "fr-FR",
  "pt-PT",
  "pt-BR",
  "es-ES",
  "es-AR",
] as const;
const textSizes = ["standard", "large", "extra-large"] as const;
const headings = {
  "en-US": "Sign in to MIA",
  "de-DE": "Bei MIA anmelden",
  "fr-FR": "Se connecter à MIA",
  "pt-PT": "Iniciar sessão no MIA",
  "pt-BR": "Entrar no MIA",
  "es-ES": "Iniciar sesión en MIA",
  "es-AR": "Iniciar sesión en MIA",
} satisfies Record<(typeof locales)[number], string>;

const appUrl = "http://127.0.0.1:4173/";
const mediaType = "application/vnd.api+json";
const browserZoomExtension = fileURLToPath(
  new URL("./fixtures/browser-zoom-extension", import.meta.url),
);

async function mockSession(
  page: Page,
  stage:
    "anonymous" | "authenticated" | "mfa" | "password-change" = "anonymous",
): Promise<void> {
  await page.route("**/api/v1/auth/session", async (route) => {
    const body =
      stage === "anonymous"
        ? { data: null, meta: { stage } }
        : {
            data: {
              type: "auth-sessions",
              id: "account-id",
              attributes: {
                stage,
                ...(stage === "mfa"
                  ? { mfa_challenge_id: "challenge-id" }
                  : {}),
                idle_expires_at: "2026-09-27T10:30:00.000000Z",
                absolute_expires_at: "2026-09-27T22:00:00.000000Z",
              },
            },
          };
    await route.fulfill({
      body: JSON.stringify(body),
      headers: { "Content-Type": mediaType },
      status: 200,
    });
  });
}

async function mockCapabilities(page: Page): Promise<void> {
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
  await page.route("**/api/v1/users/me/capabilities", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        data: {
          type: "account-capabilities",
          id: "account-id",
          attributes: {
            capabilities: actions.map((action) => ({
              action,
              available: false,
              scope: {
                global: false,
                course_ids: [],
                student_ids: [],
                course_students: [],
                own_resource: false,
              },
            })),
          },
        },
      }),
      headers: { "Content-Type": mediaType },
      status: 200,
    });
  });
}

async function launchBrowserZoomContext() {
  const userDataDirectory = await mkdtemp(join(tmpdir(), "mia-zoom-"));
  const context = await chromium.launchPersistentContext(userDataDirectory, {
    args: [
      "--window-size=1280,900",
      `--disable-extensions-except=${browserZoomExtension}`,
      `--load-extension=${browserZoomExtension}`,
    ],
    channel: "chromium",
    headless: true,
    viewport: null,
  });
  return { context, userDataDirectory };
}

async function setActualBrowserZoom(
  page: Page,
  zoomFactor: 2 | 4,
): Promise<void> {
  const context = page.context();
  let [serviceWorker] = context.serviceWorkers();
  serviceWorker ??= await context.waitForEvent("serviceworker");
  const appliedZoom = await serviceWorker.evaluate<number>(`(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id === undefined) throw new Error("No active application tab for browser zoom.");
    await chrome.tabs.setZoom(tab.id, ${zoomFactor});
    return chrome.tabs.getZoom(tab.id);
  })()`);
  expect(appliedZoom).toBeCloseTo(zoomFactor, 10);
}

async function applyWcagTextSpacing(page: Page): Promise<void> {
  await page.locator("body").evaluate((body) => {
    for (const element of body.querySelectorAll<HTMLElement>("*")) {
      element.style.setProperty("line-height", "1.5", "important");
      element.style.setProperty("letter-spacing", "0.12em", "important");
      element.style.setProperty("word-spacing", "0.16em", "important");
      if (element instanceof HTMLParagraphElement) {
        element.style.setProperty("margin-block-end", "2em", "important");
      }
    }
  });
}

async function expectNoPageOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
}

async function expectMinimumPointerTarget(control: Locator): Promise<void> {
  const box = await control.boundingBox();
  expect(box, "interactive target must have geometry").not.toBeNull();
  expect(box?.width).toBeGreaterThanOrEqual(24);
  expect(box?.height).toBeGreaterThanOrEqual(24);
}

async function expectNoWcagViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags([
      "wcag2a",
      "wcag2aa",
      "wcag21a",
      "wcag21aa",
      "wcag22a",
      "wcag22aa",
    ])
    .analyze();
  const safeViolationSummary = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodeCount: violation.nodes.length,
  }));
  expect(safeViolationSummary).toEqual([]);
}

async function expectFocusedAndUnobscured(
  page: Page,
  control: Locator,
): Promise<void> {
  await control.focus();
  await expect(control).toBeFocused();
  const geometry = await control.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const topElement = document.elementFromPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
    );
    return {
      bottom: rect.bottom,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      left: rect.left,
      right: rect.right,
      top: rect.top,
      unobscured:
        topElement === element ||
        (topElement !== null && element.contains(topElement)),
    };
  });

  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.innerWidth);
  expect(geometry.top).toBeLessThan(geometry.innerHeight);
  expect(geometry.bottom).toBeGreaterThan(0);
  expect(geometry.unobscured).toBe(true);
}

test.describe("browser locale negotiation", () => {
  test.use({ locale: "pt-BR" });

  test("applies a supported browser locale before anonymous entry renders", async ({
    page,
  }) => {
    await mockSession(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/u);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page).toHaveTitle("Entrar | MIA");
    await expect(
      page.getByRole("heading", { level: 1, name: headings["pt-BR"] }),
    ).toBeVisible();
  });
});

test("renders localized anonymous entry and preserves keyboard focus", async ({
  page,
}) => {
  const apiRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api")) {
      apiRequests.push(request.url());
    }
  });
  await mockSession(page);
  await page.goto("/");

  await expect(page).toHaveTitle("Sign in | MIA");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in to MIA" }),
  ).toBeVisible();
  await expect(
    page
      .getByText("Choose your language and text size before signing in.")
      .locator(".."),
  ).toHaveCSS("max-width", "480px");
  await expect(page.getByTestId("build-identifier")).toHaveText(
    /Build \d+\.\d+\.\d+\+/,
  );
  for (const textSize of textSizes) {
    const box = await page.locator(`#text-size-${textSize}`).boundingBox();
    expect(box, `${textSize} radio target must have geometry`).not.toBeNull();
    expect(box?.width).toBeGreaterThanOrEqual(24);
    expect(box?.height).toBeGreaterThanOrEqual(24);
  }

  await expect(
    page.getByRole("heading", { level: 1, name: "Sign in to MIA" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const selector = page.locator("#interface-language");
  await selector.focus();
  await selector.selectOption("de-DE");
  await expect(selector).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("lang", "de-DE");
  await expect(page).toHaveTitle("Anmelden | MIA");

  await page.locator("#text-size-extra-large").check();
  await expect(page.locator("#text-size-extra-large")).toBeFocused();
  await expect(page.locator("html")).toHaveClass(/text-xl/);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "de-DE");
  await expect(page.locator("#interface-language")).toHaveValue("de-DE");
  await expect(page.locator("#text-size-extra-large")).toBeChecked();
  await expect(page.locator("html")).toHaveClass(/text-xl/);
  expect(apiRequests.map((request) => new URL(request).pathname)).toEqual([
    "/api/v1/auth/session",
    "/api/v1/auth/session",
  ]);
  await expectNoWcagViolations(page);
});

test("all locales and text sizes reflow at 320 CSS pixels with WCAG text spacing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mockSession(page);
  await page.goto("/");
  await applyWcagTextSpacing(page);

  for (const locale of locales) {
    await page.locator("#interface-language").selectOption(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(
      page.getByRole("heading", { level: 1, name: headings[locale] }),
    ).toBeVisible();

    for (const textSize of textSizes) {
      await page.locator(`#text-size-${textSize}`).check();
      await expectNoPageOverflow(page);
      await expect(page.locator("#interface-language")).toBeVisible();
      await expect(page.locator(`#text-size-${textSize}`)).toBeVisible();
    }
  }
});

for (const zoomFactor of [2, 4] as const) {
  test(`all text modes reflow at actual ${zoomFactor * 100}% Chromium browser zoom`, async () => {
    const { context, userDataDirectory } = await launchBrowserZoomContext();

    try {
      const page = await context.newPage();
      await mockSession(page);
      await page.goto(appUrl);
      await setActualBrowserZoom(page, zoomFactor);

      const browserMetrics = await page.evaluate(() => ({
        cssZoom: getComputedStyle(document.documentElement).zoom,
        devicePixelRatio: window.devicePixelRatio,
        innerWidth: window.innerWidth,
        outerWidth: window.outerWidth,
      }));
      expect(browserMetrics.outerWidth).toBe(1280);
      expect(browserMetrics.innerWidth).toBe(1280 / zoomFactor);
      expect(browserMetrics.devicePixelRatio).toBeCloseTo(zoomFactor, 2);
      expect(browserMetrics.cssZoom).toBe("1");

      for (const textSize of textSizes) {
        const radio = page.locator(`#text-size-${textSize}`);
        await radio.check();
        await expect(radio).toBeChecked();
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
          ),
        ).toBe(false);
        await expectFocusedAndUnobscured(
          page,
          page.locator("#interface-language"),
        );
        await expectFocusedAndUnobscured(page, radio);
      }
    } finally {
      await context.close();
      await rm(userDataDirectory, { force: true, recursive: true });
    }
  });
}

test.describe("canonical entry routing", () => {
  test("dispatches MFA without requesting capabilities", async ({ page }) => {
    const capabilityRequests: string[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.endsWith("/capabilities")) {
        capabilityRequests.push(request.url());
      }
    });
    await mockSession(page, "mfa");
    await page.goto("/login");

    await expect(page).toHaveURL(/\/auth\/mfa$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Verify sign-in" }),
    ).toBeFocused();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    expect(capabilityRequests).toEqual([]);
    await expectNoWcagViolations(page);
  });

  test("dispatches password replacement to its canonical restricted route", async ({
    page,
  }) => {
    await mockSession(page, "password-change");
    await page.goto("/");

    await expect(page).toHaveURL(/\/auth\/password-change$/u);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Choose a new password",
      }),
    ).toBeFocused();
    await expect(page.getByRole("navigation")).toHaveCount(0);
  });

  test("privacy-shields restricted logout until an independent anonymous check", async ({
    context,
    page,
  }) => {
    let discoveryCount = 0;
    let logoutCount = 0;
    const csrfToken = crypto.randomUUID();
    await context.addCookies([
      { name: "mia_csrf", value: csrfToken, url: appUrl },
    ]);
    await page.route("**/api/v1/auth/session", async (route) => {
      discoveryCount += 1;
      const body =
        discoveryCount === 1
          ? {
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
            }
          : { data: null, meta: { stage: "anonymous" } };
      await route.fulfill({
        body: JSON.stringify(body),
        headers: { "Content-Type": mediaType },
        status: 200,
      });
    });
    await page.route("**/api/v1/auth/logout", async (route) => {
      logoutCount += 1;
      expect(route.request().headers()["x-csrf-token"] === csrfToken).toBe(
        true,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.fulfill({ status: 204 });
    });
    await page.goto("/");
    await expect(page).toHaveURL(/\/auth\/mfa$/u);

    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/auth\/logout$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Signing out" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Additional verification is required before MIA can continue.",
      ),
    ).toHaveCount(0);
    await expect(page).toHaveURL(/\/login$/u);
    await expect(page.getByText(/Signed out at the last check/u)).toBeVisible();
    await expect(
      page.getByText(
        "Additional verification is required before MIA can continue.",
      ),
    ).toHaveCount(0);
    expect(logoutCount).toBe(1);
    expect(discoveryCount).toBe(2);
  });

  test("keeps the failed-logout disclosure operable with accessibility user settings", async ({
    context,
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.emulateMedia({
      forcedColors: "active",
      reducedMotion: "reduce",
    });
    await context.addCookies([
      { name: "mia_csrf", value: crypto.randomUUID(), url: appUrl },
    ]);
    await mockSession(page, "mfa");
    await page.route("**/api/v1/auth/logout", async (route) => {
      await route.fulfill({
        body: "synthetic unavailable response",
        headers: { "Content-Type": mediaType },
        status: 500,
      });
    });
    await page.goto("/");

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Sign-out not confirmed",
      }),
    ).toBeFocused();
    await applyWcagTextSpacing(page);
    const disclosure = page.getByRole("button", {
      name: "Technical details",
      exact: true,
    });
    await expectMinimumPointerTarget(disclosure);
    await expectMinimumPointerTarget(
      page.getByRole("button", { name: "Retry logout" }),
    );
    await disclosure.click();
    await expect(
      page.getByText("synthetic unavailable response"),
    ).toBeVisible();
    await expectNoPageOverflow(page);
    await expectFocusedAndUnobscured(page, disclosure);
    expect(
      await disclosure.evaluate(
        (element) => getComputedStyle(element).forcedColorAdjust,
      ),
    ).toBe("auto");
    expect(
      await page.evaluate(
        () =>
          window.matchMedia("(forced-colors: active)").matches &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(true);
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expectNoWcagViolations(page);
  });

  test("orders authenticated capability discovery before basic Home mounts", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith("/api/v1/")) {
        requests.push(path);
      }
    });
    await mockSession(page, "authenticated");
    await mockCapabilities(page);
    await page.goto("/login");

    await expect(page).toHaveURL(/\/$/u);
    await expect(
      page.getByRole("heading", { level: 1, name: "Home" }),
    ).toBeFocused();
    expect(requests).toEqual([
      "/api/v1/auth/session",
      "/api/v1/users/me/capabilities",
    ]);
  });

  test("keeps Home suppressed when capability discovery fails", async ({
    page,
  }) => {
    await mockSession(page, "authenticated");
    await page.route("**/api/v1/users/me/capabilities", async (route) => {
      await route.fulfill({
        body: "service unavailable",
        headers: { "Content-Type": mediaType },
        status: 500,
      });
    });
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Unable to check access",
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Home" })).toHaveCount(0);
    await expect(
      page.getByText("Technical details", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("service unavailable")).not.toBeVisible();
    const disclosure = page.getByRole("button", {
      name: "Technical details",
      exact: true,
    });
    await expectMinimumPointerTarget(disclosure);
    await disclosure.click();
    await expect(page.getByText("service unavailable")).toBeVisible();
    await expectNoWcagViolations(page);
  });
});
