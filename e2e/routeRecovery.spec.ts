import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  focusedHeading,
  protectedJourney,
  routeBackend,
  atBrowserZoom,
} from "./routeFixtures";
import {
  routeHygieneCheckpoint,
  routeSecretFixture,
} from "./routeSecretHygiene";

test.use({ trace: "off", screenshot: "off", video: "off" });
const mfa = "/profile/security/mfa";

test(
  "rejected logout chunk retains failure guidance and explicit Retry without protected reveal",
  protectedJourney(async (page) => {
    const state = await routeBackend(page);
    state.logoutFails = true;
    let chunks = 0;
    await page.route("**/assets/LogoutEntryRoute-*.js", (route) => {
      chunks++;
      return route.abort("failed");
    });
    await page.goto("/");
    await focusedHeading(page, "Home");
    await page
      .getByRole("navigation", { name: "Application" })
      .getByRole("button", { name: "Sign out" })
      .click();
    await focusedHeading(page, "Sign-out not confirmed");
    expect(chunks).toBe(1);
    await expect(
      page.getByText(
        "Protected content has been hidden locally, but this browser may still hold a valid sign-in cookie.",
      ),
    ).toBeVisible();
    await expect(
      page.getByText(
        "On a shared device, close the entire browser if MIA cannot confirm sign-out.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reload page" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("link", { name: "Home", exact: true }),
    ).toHaveCount(0);
    await page.waitForTimeout(100); // Observe the forbidden automatic-dispatch interval with both clocks fixed.
    expect(state.stage).toBe("authenticated");
    expect(state.logouts).toBe(1);
    expect(state.ledger).toEqual(["session", "capabilities"]);
    await routeHygieneCheckpoint(page, "logout-unconfirmed");
    state.logoutFails = false;
    await page.getByRole("button", { name: "Retry logout" }).click();
    await focusedHeading(page, "Sign in to MIA");
    expect(state.logouts).toBe(2);
    expect(state.ledger).toEqual([
      "session",
      "capabilities",
      "session",
      "session",
    ]);
  }),
);

test(
  "rejected production chunk leaves a usable eager frame and explicit document Reload",
  protectedJourney(async (page) => {
    const state = await routeBackend(page);
    let fail = true;
    await page.route("**/assets/MfaOverviewRoute-*.js", (route) =>
      fail ? route.abort("failed") : route.continue(),
    );
    await page.goto(mfa);
    await focusedHeading(page, "Multi-factor authentication");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "This page could not be loaded",
      }),
    ).toBeVisible();
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    fail = false;
    await page.getByRole("button", { name: "Reload page" }).click();
    await expect(
      page.getByRole("link", { name: "Set up authenticator app" }),
    ).toBeVisible();
    expect(state.starts + state.verifies).toBe(0);
    expect(state.ledger).toEqual([
      "session",
      "capabilities",
      "resource",
      "session",
      "capabilities",
      "resource",
    ]);
  }),
);

for (const failure of ["session", "capabilities", "resource"]) {
  test(
    `failed ${failure} read keeps neutral recovery and explicit Check again`,
    protectedJourney(async (page) => {
      const state = await routeBackend(page);
      state.failure = failure;
      await page.goto(mfa);
      await focusedHeading(page, "Unable to check access");
      await expect(page.getByRole("navigation")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Check again" }),
      ).toBeVisible();
      await routeHygieneCheckpoint(page, "read-failure");
      state.failure = "";
      await page.getByRole("button", { name: "Check again" }).click();
      await focusedHeading(page, "Multi-factor authentication");
      expect(state.starts + state.verifies).toBe(0);
    }),
  );
}

test(
  "unavailable codes chunk refuses parent and omits Reload while eager Sign out works",
  protectedJourney(async (page) => {
    const state = await routeBackend(page);
    await page.route("**/assets/MfaRecoveryCodesRoute-*.js", (route) =>
      route.abort("failed"),
    );
    await page.goto(`${mfa}/enroll`);
    await page.getByRole("button", { name: "Start setup" }).click();
    await page
      .getByLabel("Six-digit code from your authenticator app (required)")
      .fill(routeSecretFixture(page).mfaCode);
    await routeHygieneCheckpoint(page, "totp-input");
    await page.getByRole("button", { name: "Verify code" }).click();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "This page could not be loaded",
      }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Reload page" })).toHaveCount(
      0,
    );
    await page
      .getByRole("link", { name: "Back to multi-factor authentication" })
      .click();
    expect(new URL(page.url()).pathname).toBe(`${mfa}/recovery-codes`);
    await expect(page.locator('[aria-live="assertive"]')).toHaveText(
      "Confirm that you saved your recovery codes first.",
    );
    expect(state.verifies).toBe(1);
    await routeHygieneCheckpoint(page, "codes-held");
    await page
      .getByRole("navigation", { name: "Application" })
      .getByRole("button", { name: "Sign out" })
      .click();
    await focusedHeading(page, "Sign in to MIA");
    expect(state.starts).toBe(1);
    expect(state.verifies).toBe(1);
  }),
);

for (const textSize of ["standard", "large", "extra-large"]) {
  test(
    `recovery reflows at 320 CSS pixels and zoom equivalent with ${textSize} text`,
    protectedJourney(async (page) => {
      await routeBackend(page);
      await page.addInitScript(
        (size) => localStorage.setItem("mia.interface.text-size", size),
        textSize,
      );
      await page.emulateMedia({
        reducedMotion: "reduce",
        forcedColors: "active",
      });
      await page.route("**/assets/MfaOverviewRoute-*.js", (route) =>
        route.abort("failed"),
      );
      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto(mfa);
      await expect(
        page.getByRole("button", { name: "Reload page" }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.getByRole("link", { name: "Skip to main content" }).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("main")).toBeFocused();
      await page.locator("body").evaluate((body) => {
        for (const element of body.querySelectorAll<HTMLElement>("*")) {
          element.style.setProperty("line-height", "1.5", "important");
          element.style.setProperty("letter-spacing", "0.12em", "important");
          element.style.setProperty("word-spacing", "0.16em", "important");
          if (element instanceof HTMLParagraphElement)
            element.style.setProperty("margin-block-end", "2em", "important");
        }
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.setViewportSize({ width: 640, height: 450 }); // 1280 / 200% equivalent, not native browser zoom evidence.
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }),
  );
}

test(
  "a codes-route read failure retains default-deny recovery with independent Sign out",
  protectedJourney(async (page) => {
    const state = await routeBackend(page);
    await page.goto(`${mfa}/enroll`);
    await page.getByRole("button", { name: "Start setup" }).click();
    await page
      .getByLabel("Six-digit code from your authenticator app (required)")
      .fill(routeSecretFixture(page).mfaCode);
    await routeHygieneCheckpoint(page, "totp-input");
    state.failure = "resource";
    await page.getByRole("button", { name: "Verify code" }).click();
    await focusedHeading(page, "Unable to check access");
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reload page" })).toHaveCount(
      0,
    );
    await page.getByRole("link", { name: "Back to Home" }).click();
    expect(new URL(page.url()).pathname).toBe(`${mfa}/recovery-codes`);
    expect(state.verifies).toBe(1);
    await routeHygieneCheckpoint(page, "codes-held");
    await page.getByRole("button", { name: "Sign out" }).click();
    await focusedHeading(page, "Sign in to MIA");
    expect(state.verifies).toBe(1);
  }),
);

for (const locale of [
  "de-DE",
  "en-US",
  "es-AR",
  "es-ES",
  "fr-FR",
  "pt-BR",
  "pt-PT",
]) {
  test(
    `localized recovery retains operable controls and no page scroll in ${locale}`,
    protectedJourney(async (page) => {
      await routeBackend(page);
      await page.addInitScript(
        (value) => localStorage.setItem("mia.interface.locale", value),
        locale,
      );
      await page.route("**/assets/MfaOverviewRoute-*.js", (route) =>
        route.abort("failed"),
      );
      await page.setViewportSize({ width: 320, height: 900 });
      await page.goto("/");
      await expect(page.getByRole("main")).toBeVisible();
      for (const size of ["standard", "large", "extra-large"]) {
        await page.evaluate(
          (value) => localStorage.setItem("mia.interface.text-size", value),
          size,
        );
        await page.goto(mfa);
        await expect(page.locator("main h2")).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
      }
    }),
  );
}

for (const factor of [2, 4] as const) {
  test(`route recovery remains operable at actual ${factor * 100}% browser zoom in all text modes`, async () => {
    await atBrowserZoom(factor, async (page) => {
      await page.route("**/assets/MfaOverviewRoute-*.js", (route) =>
        route.abort("failed"),
      );
      for (const size of ["standard", "large", "extra-large"]) {
        await page.evaluate(
          (value) => localStorage.setItem("mia.interface.text-size", value),
          size,
        );
        await page.goto(`http://127.0.0.1:4173${mfa}`);
        await expect(
          page.getByRole("button", { name: "Reload page" }),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        const exit = page.getByRole("link", { name: "Back to Home" });
        await exit.focus();
        await page.keyboard.press("Enter");
        await focusedHeading(page, "Home");
      }
    });
  });
}
