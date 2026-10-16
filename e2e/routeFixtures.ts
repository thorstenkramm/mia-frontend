import { chromium, expect, type Page, type Route } from "@playwright/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  enrollmentResponse,
  mfaStateResponse,
  ownProfileCapabilities,
  recoveryCodesResponse,
  type MfaStateFixture,
} from "../test/mfaFixtures";
import {
  releaseRouteFixture,
  routeFailureFixture,
  routeProvisioningFixture,
  routeSecretFixture,
} from "./routeTestFixtures";

export async function respond(route: Route, response: Response) {
  await route.fulfill({
    status: response.status,
    contentType: "application/vnd.api+json",
    body: await response.text(),
  });
}

// All ledgers carry operation names only. No request bodies, headers, URLs,
// exceptions, or fixture values enter assertions or artifacts.
export async function routeBackend(page: Page) {
  const fixture = routeSecretFixture(page);
  await page.clock.setFixedTime(new Date());
  await page.addInitScript(() => {
    const now = performance.now();
    performance.now = () => now;
  });
  await page.context().addCookies([
    {
      name: "mia_csrf",
      value: fixture.csrf,
      url: "http://127.0.0.1:4173/",
    },
  ]);
  const control = {
    stage: "authenticated",
    own: true,
    failure: "",
    ledger: [] as string[],
    mfa: {} as MfaStateFixture,
    starts: 0,
    verifies: 0,
    previews: 0,
    acceptances: 0,
    logouts: 0,
    logoutFails: false,
    releaseSession: null as null | Promise<void>,
  };
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/invitation-acceptances") control.acceptances++;
    if (path === "/api/v1/auth/logout") control.logouts++;
  });
  const instant = (offset: number) =>
    new Date(Date.now() + offset).toISOString().replace("Z", "000Z");
  await page.route("**/api/v1/auth/session", async (route) => {
    control.ledger.push("session");
    if (control.releaseSession) await control.releaseSession;
    if (control.failure === "session")
      return respond(route, routeFailureFixture(page));
    return route.fulfill({
      contentType: "application/vnd.api+json",
      body: JSON.stringify(
        control.stage === "anonymous"
          ? { data: null, meta: { stage: "anonymous" } }
          : {
              data: {
                type: "auth-sessions",
                id: "account-id",
                attributes: {
                  stage: control.stage,
                  idle_expires_at: instant(30 * 60_000),
                  absolute_expires_at: instant(12 * 60 * 60_000),
                },
              },
            },
      ),
    });
  });
  await page.route("**/api/v1/users/me/capabilities", (route) => {
    control.ledger.push("capabilities");
    return respond(
      route,
      control.failure === "capabilities"
        ? routeFailureFixture(page)
        : ownProfileCapabilities("account-id", control.own),
    );
  });
  await page.route("**/api/v1/users/me/mfa", (route) => {
    control.ledger.push("resource");
    return respond(
      route,
      control.failure === "resource"
        ? routeFailureFixture(page)
        : mfaStateResponse(control.mfa),
    );
  });
  await page.route("**/api/v1/users/me/mfa-enrollments", (route) => {
    control.starts++;
    control.mfa = { pending: { id: "mfe_pending" } };
    return respond(
      route,
      enrollmentResponse("mfe_pending", routeProvisioningFixture(page)),
    );
  });
  await page.route(
    "**/api/v1/users/me/mfa-enrollments/mfe_pending/verifications",
    (route) => {
      control.verifies++;
      control.mfa = { active: "totp" };
      return respond(
        route,
        recoveryCodesResponse("mfe_pending", fixture.codes),
      );
    },
  );
  await page.route("**/api/v1/auth/logout", (route) => {
    if (control.logoutFails) return respond(route, routeFailureFixture(page));
    control.stage = "anonymous";
    return route.fulfill({ status: 204 });
  });
  return control;
}

export async function focusedHeading(page: Page, name: string) {
  await expect(page.getByRole("heading", { level: 1, name })).toBeFocused();
}

// The raw response body is shown only after a deliberate disclosure; it must
// remain text rather than creating a link or executable content.
export async function expectInertTechnicalDetails(page: Page, body: string) {
  const disclosure = page.getByRole("button", {
    name: "Technical details",
    exact: true,
  });
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("main pre")).toHaveCount(0);
  await disclosure.click();
  await expect(page.locator("main pre")).toContainText(body);
  await expect(
    page.locator("main pre a, main pre script, main pre style"),
  ).toHaveCount(0);
}

export function protectedJourney(body: (page: Page) => Promise<void>) {
  return async ({ page }: { page: Page }) => {
    try {
      await body(page);
    } finally {
      await page.close();
      releaseRouteFixture(page);
    }
  };
}

// Reuse the existing local test-only zoom extension, not application zoom
// interception or CSS counter-scaling. This isolated harness leaves scaffold's
// existing manual/process tests untouched.
export async function atBrowserZoom(
  factor: 2 | 4,
  body: (page: Page) => Promise<void>,
) {
  const directory = await mkdtemp(join(tmpdir(), "mia-route-zoom-"));
  const extension = fileURLToPath(
    new URL("./fixtures/browser-zoom-extension", import.meta.url),
  );
  const context = await chromium.launchPersistentContext(directory, {
    args: [
      "--window-size=1280,900",
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
    channel: "chromium",
    headless: true,
    viewport: null,
  });
  try {
    const page = await context.newPage();
    await routeBackend(page);
    await page.goto("http://127.0.0.1:4173/login");
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"));
    const applied = await worker.evaluate<number>(`(async () => {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab?.id === undefined) throw new Error("No active zoom test tab.");
      await chrome.tabs.setZoom(tab.id, ${factor});
      return chrome.tabs.getZoom(tab.id);
    })()`);
    expect(applied).toBeCloseTo(factor, 10);
    expect(await page.evaluate(() => innerWidth)).toBe(1280 / factor);
    await body(page);
    releaseRouteFixture(page);
  } finally {
    await context.close();
    await rm(directory, { recursive: true, force: true });
  }
}
