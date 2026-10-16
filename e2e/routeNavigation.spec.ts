import { expect, test } from "@playwright/test";
import {
  focusedHeading,
  protectedJourney,
  routeBackend,
} from "./routeFixtures";
import { routeSecretFixture } from "./routeTestFixtures";

test.use({ trace: "off", screenshot: "off", video: "off" });
const mfa = "/profile/security/mfa";

test(
  "direct, reload and client history freshly establish ordered admission",
  protectedJourney(async (page) => {
    const state = await routeBackend(page);
    await page.goto(mfa);
    await focusedHeading(page, "Multi-factor authentication");
    expect(state.ledger).toEqual(["session", "capabilities", "resource"]);
    await page.reload();
    await focusedHeading(page, "Multi-factor authentication");
    expect(state.ledger.slice(-3)).toEqual([
      "session",
      "capabilities",
      "resource",
    ]);
    await page.getByRole("link", { name: "Back to Home" }).click();
    await focusedHeading(page, "Home");
    await page.goBack();
    await focusedHeading(page, "Multi-factor authentication");
    expect(state.ledger.slice(-3)).toEqual([
      "session",
      "capabilities",
      "resource",
    ]);
    await page.goForward();
    await focusedHeading(page, "Home");
    expect(state.ledger.slice(-2)).toEqual(["session", "capabilities"]);
    expect(state.starts + state.verifies).toBe(0);
  }),
);

test(
  "delayed navigation with scope revoked never loads a protected chunk",
  protectedJourney(async (page) => {
    const state = await routeBackend(page);
    const chunks: string[] = [];
    page.on("request", (request) => {
      if (/\/assets\/MfaOverviewRoute-/u.test(new URL(request.url()).pathname))
        chunks.push("overview");
    });
    await page.goto("/");
    await focusedHeading(page, "Home");
    let release: () => void = () => {};
    state.releaseSession = new Promise<void>((resolve) => {
      release = resolve;
    });
    state.own = false;
    await page
      .getByRole("link", { name: "Multi-factor authentication" })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Checking access" }),
    ).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(page).toHaveTitle("MIA");
    expect(chunks).toEqual([]);
    expect(state.ledger).toEqual(["session", "capabilities", "session"]);
    release();
    await focusedHeading(page, "Home");
    expect(chunks).toEqual([]);
    expect(state.ledger).toEqual([
      "session",
      "capabilities",
      "session",
      "capabilities",
    ]);
  }),
);

test(
  "same-path history identity announces only after title and before heading focus",
  protectedJourney(async (page) => {
    const state = await routeBackend(page);
    await page.goto(mfa);
    await focusedHeading(page, "Multi-factor authentication");
    expect(await page.locator('[aria-live="polite"]').textContent()).toBe("");
    await page.evaluate(() => {
      const observed: boolean[] = [];
      Object.defineProperty(window, "routeSequenceEvidence", {
        value: observed,
      });
      document.addEventListener("focusin", (event) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.tagName === "H1" &&
          event.target.textContent === "Multi-factor authentication"
        )
          observed.push(
            document.title === "Multi-factor authentication | MIA" &&
              document.querySelector('[aria-live="polite"]')?.textContent ===
                "Multi-factor authentication",
          );
      });
      history.pushState(
        { key: crypto.randomUUID(), idx: 1 },
        "",
        location.pathname,
      );
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await expect.poll(() => state.ledger.length).toBe(6);
    await focusedHeading(page, "Multi-factor authentication");
    expect(
      await page.evaluate(() => Reflect.get(window, "routeSequenceEvidence")),
    ).toEqual([true]);
  }),
);

test(
  "verify and codes Reload reconstruct only authoritative metadata, never mutation payloads",
  protectedJourney(async (page) => {
    const state = await routeBackend(page);
    state.mfa = { pending: { id: "mfe_pending" } };
    await page.goto(`${mfa}/verify`);
    await focusedHeading(page, "Verify multi-factor authentication");
    await expect(page.locator("img")).toHaveCount(0);
    await page.reload();
    await focusedHeading(page, "Verify multi-factor authentication");
    await expect(page.locator("img")).toHaveCount(0);
    state.mfa = { active: "totp" };
    await page.goto(`${mfa}/recovery-codes`);
    await focusedHeading(page, "MFA recovery codes");
    await expect(
      page.getByRole("button", { name: "Show recovery codes" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Back to multi-factor authentication" }),
    ).toBeVisible();
    expect(state.starts + state.verifies).toBe(0);
  }),
);

test(
  "invitation parents retain the allowed link flow, clear form values and discard the token on exit",
  protectedJourney(async (page) => {
    const state = await routeBackend(page);
    state.stage = "anonymous";
    await page.route("**/api/v1/invitation-previews", (route) => {
      state.previews++;
      return route.fulfill({
        contentType: "application/vnd.api+json",
        body: JSON.stringify({
          data: {
            type: "invitation-previews",
            id: "preview",
            attributes: { platform: "mia", role: "supervisor" },
          },
        }),
      });
    });
    const fixture = routeSecretFixture(page);
    await page.goto(`/invitation#token=${fixture.invitationToken}`);
    await page.getByRole("link", { name: "Accept invitation" }).click();
    const password = page.getByLabel("New password (required)", {
      exact: true,
    });
    await password.fill(fixture.password);
    await page.getByRole("link", { name: "Back to invitation" }).click();
    await page.getByRole("link", { name: "Accept invitation" }).click();
    expect((await password.inputValue()) === "").toBe(true);
    await page.getByRole("link", { name: "Back to invitation" }).click();
    await page.getByRole("link", { name: "Back to sign-in" }).click();
    await focusedHeading(page, "Sign in to MIA");
    expect(
      await page.evaluate(() => location.hash === "" && location.search === ""),
    ).toBe(true);
    await page.goBack();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "This invitation link is invalid or no longer usable",
      }),
    ).toBeVisible();
    expect(state.acceptances).toBe(0);
  }),
);
