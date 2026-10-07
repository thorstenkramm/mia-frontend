import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  etagB,
  invitationBackend,
  invitationRecord,
  invitationRoutes,
} from "./invitationFixtures";
import {
  atBrowserZoom,
  focusedHeading,
  protectedJourney,
} from "./routeFixtures";
import {
  routeHygieneCheckpoint,
  routeSecretFixture,
} from "./routeSecretHygiene";

// Invitee addresses, CSRF values and raw error bodies are per-run synthetic
// markers. Artifacts stay off; assertions compare them as booleans only.
test.use({ trace: "off", screenshot: "off", video: "off" });

const list = "/admin/invitations";
const create = "/admin/invitations/new";
const field = "Supervisor’s email address";

async function noPageScroll(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

async function noAxeViolations(page: Page) {
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

// The address never reaches the URL, history state, title, or live regions.
async function addressOutsideContent(page: Page): Promise<boolean> {
  return page.evaluate(
    (marker) =>
      location.href.includes(marker) ||
      JSON.stringify(history.state ?? null).includes(marker) ||
      document.title.includes(marker) ||
      Array.from(document.querySelectorAll("[aria-live]")).some(
        (region) => region.textContent?.includes(marker) === true,
      ),
    routeSecretFixture(page).email,
  );
}

// Focus not obscured; with `keyboard`, the focus indicator is drawn too.
async function visibleFocus(page: Page, keyboard = false) {
  const exposure = await page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement)) return null;
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2,
    );
    return {
      inViewport:
        box.top >= 0 &&
        box.left >= 0 &&
        box.bottom <= innerHeight &&
        box.right <= innerWidth,
      onTop: hit !== null && element.contains(hit),
      outline: getComputedStyle(element).outlineStyle !== "none",
    };
  });
  expect(exposure).toMatchObject({ inViewport: true, onTop: true });
  if (keyboard) expect(exposure?.outline).toBe(true);
}

test(
  "administrator invites a supervisor with one dispatch and reaches its persisted detail",
  protectedJourney(async (page) => {
    const state = await invitationBackend(page);
    await page.goto("/");
    await focusedHeading(page, "Home");
    await page
      .getByRole("navigation", { name: "Application" })
      .getByRole("link", { name: "Invitations" })
      .click();
    await focusedHeading(page, "Invitations");
    await expect(
      page.getByText("No invitations", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Invite a supervisor" })
      .first()
      .click();
    await focusedHeading(page, "Invite a supervisor");
    await page.getByLabel(field).fill(routeSecretFixture(page).email);
    await routeHygieneCheckpoint(page, "invitation-email");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Invitation created" }),
    ).toBeFocused();
    expect(state.dispatches.create).toBe(1);
    expect(state.createdSupervisorForFixtureAddress).toEqual([true]);
    await expect(page.getByText("Delivery queued")).toBeVisible();
    expect(await addressOutsideContent(page)).toBe(false);
    await page.getByRole("link", { name: "View invitation" }).click();
    await focusedHeading(page, "Invitation details");
    await expect(page).toHaveURL(/\/admin\/invitations\/inv_1$/u);
    await expect(page.getByText("Pending", { exact: true })).toBeVisible();
    await routeHygieneCheckpoint(page, "invitation-detail");
    expect(await addressOutsideContent(page)).toBe(false);
    await page.reload();
    await focusedHeading(page, "Invitation details");
    expect(state.dispatches.create).toBe(1);
    expect(state.ledger.at(-1)).toBe("read");
  }),
);

test(
  "dirty create form asks Stay or Discard for shell, browser Back and Reload departures",
  protectedJourney(async (page) => {
    await invitationBackend(page);
    await page.goto(list);
    await focusedHeading(page, "Invitations");
    await page
      .getByRole("link", { name: "Invite a supervisor" })
      .first()
      .click();
    await focusedHeading(page, "Invite a supervisor");
    const input = page.getByLabel(field);
    await input.fill(routeSecretFixture(page).email);
    await routeHygieneCheckpoint(page, "invitation-email");

    await page
      .getByRole("navigation", { name: "Application" })
      .getByRole("link", { name: "Home" })
      .click();
    // The modal root is a zero-size positioning wrapper; its panel is visible.
    const dialog = page.getByRole("dialog", {
      name: "Discard this invitation?",
    });
    const stay = dialog.getByRole("button", { name: "Stay on this page" });
    await expect(stay).toBeVisible();
    await expect(stay).toBeFocused();
    await noAxeViolations(page);
    await dialog.getByRole("button", { name: "Stay on this page" }).click();
    await expect(input).toBeFocused();
    await visibleFocus(page);
    expect((await input.inputValue()) === routeSecretFixture(page).email).toBe(
      true,
    );

    // Same-document Back is held and asked before the router leaves.
    await page.goBack();
    await expect(stay).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${create}$`, "u"));
    await dialog.getByRole("button", { name: "Stay on this page" }).click();
    await expect(input).toBeFocused();

    // Reload asks the browser's native prompt; dismissing it keeps the page.
    const prompt = page.waitForEvent("dialog");
    void page.evaluate(() => location.reload()).catch(() => undefined);
    const shown = await prompt;
    expect(shown.type()).toBe("beforeunload");
    await shown.dismiss();
    await expect(input).toBeVisible();
    expect((await input.inputValue()) === routeSecretFixture(page).email).toBe(
      true,
    );

    await page.goBack();
    await dialog.getByRole("button", { name: "Discard and leave" }).click();
    await focusedHeading(page, "Invitations");
    await expect(page).toHaveURL(new RegExp(`${list}$`, "u"));
  }),
);

test(
  "unknown create, resend and revoke outcomes never replay and reconcile on request",
  protectedJourney(async (page) => {
    const state = await invitationBackend(page);
    state.invitations.push(invitationRecord(page, { id: "inv_p" }));
    state.createOutcome = "fail";
    await page.goto(create);
    await focusedHeading(page, "Invite a supervisor");
    await page.getByLabel(field).fill(routeSecretFixture(page).email);
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Invitation not confirmed" }),
    ).toBeFocused();
    await routeHygieneCheckpoint(page, "invitation-error");
    await page.getByRole("link", { name: "Review invitations" }).click();
    await focusedHeading(page, "Invitations");
    expect(state.dispatches.create).toBe(1);

    state.resendOutcome = "lose";
    await page.goto("/admin/invitations/inv_p/resend");
    await focusedHeading(page, "Resend invitation");
    await page.getByRole("button", { name: "Resend invitation" }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Resend not confirmed" }),
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Resend invitation" }),
    ).toHaveCount(0);
    const reads = state.ledger.filter((entry) => entry === "read").length;
    await page.getByRole("button", { name: "Check current state" }).click();
    await expect(
      page.getByText(/does not confirm whether the earlier resend happened/u),
    ).toBeVisible();
    expect(state.ledger.filter((entry) => entry === "read")).toHaveLength(
      reads + 1,
    );
    expect(state.dispatches.resend).toBe(1);

    state.deleteOutcome = "lose";
    await page.goto("/admin/invitations/inv_p/revoke");
    await focusedHeading(page, "Revoke invitation");
    await page.getByRole("button", { name: "Revoke invitation" }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Revocation not confirmed" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Check current state" }).click();
    await expect(
      page.getByText(/does not confirm whether the earlier attempt revoked/u),
    ).toBeVisible();
    await expect(page.getByText("Invitation revoked")).toHaveCount(0);
    expect(state.dispatches.delete).toBe(1);
    await page.reload();
    await focusedHeading(page, "Revoke invitation");
    expect(state.dispatches).toEqual({ create: 1, resend: 1, delete: 1 });
  }),
);

test(
  "mobile dirty confirmation names its consequence and security closure cancels deferred departure",
  protectedJourney(async (page) => {
    const state = await invitationBackend(page);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(create);
    await focusedHeading(page, "Invite a supervisor");
    const input = page.getByLabel(field);
    await input.fill(routeSecretFixture(page).email);
    await page.getByRole("button", { name: "Open navigation" }).click();
    const drawer = page.getByRole("dialog", { name: "Application" });
    await drawer.getByRole("link", { name: "Home", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: "Discard this invitation?",
    });
    const stay = dialog.getByRole("button", { name: "Stay on this page" });
    await expect(stay).toBeFocused();
    await expect(drawer).toHaveCount(0);
    await expect(dialog).toHaveAccessibleDescription(
      "The email address you entered has not been sent. If you leave this page, it is discarded.",
    );
    await routeHygieneCheckpoint(page, "invitation-email");
    // Containment in both directions, then Escape restores the input.
    for (const key of ["Tab", "Tab", "Shift+Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);
      expect(
        await dialog.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(input).toBeFocused();
    expect((await input.inputValue()) === routeSecretFixture(page).email).toBe(
      true,
    );
    await page.getByRole("button", { name: "Open navigation" }).click();
    await drawer.getByRole("link", { name: "Home", exact: true }).click();
    await expect(stay).toBeFocused();
    await stay.click();
    await expect(input).toBeFocused();
    // Shield synchronously as the drawer begins closing, before its delayed
    // callback. This is the real mobile link and CSS transition, not a host mock.
    await page.getByRole("button", { name: "Open navigation" }).click();
    await drawer
      .getByRole("link", { name: "Home", exact: true })
      .evaluate((link) => {
        (link as HTMLElement).click();
        window.dispatchEvent(new Event("focus"));
      });
    await expect(input).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Refresh", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(400); // Exceeds the drawer's 300ms closure only.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`${create}$`, "u"));
    expect(state.dispatches).toEqual({ create: 0, resend: 0, delete: 0 });
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await focusedHeading(page, "Invite a supervisor");
    expect(await input.inputValue()).toBe("");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }),
);

test(
  "dirty Forward stays without requests or discards exactly one traversal",
  protectedJourney(async (page) => {
    const state = await invitationBackend(page);
    await page.goto(list);
    await focusedHeading(page, "Invitations");
    await page
      .getByRole("link", { name: "Invite a supervisor" })
      .first()
      .click();
    await focusedHeading(page, "Invite a supervisor");
    await page
      .getByRole("navigation", { name: "Application" })
      .getByRole("link", { name: "Home", exact: true })
      .click();
    await focusedHeading(page, "Home");
    await page.goBack();
    await focusedHeading(page, "Invite a supervisor");
    const input = page.getByLabel(field);
    expect(await input.inputValue()).toBe("");
    await input.fill(routeSecretFixture(page).email);
    await routeHygieneCheckpoint(page, "invitation-email");
    let requests = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/")) requests++;
    });
    await page.goForward();
    const dialog = page.getByRole("dialog", {
      name: "Discard this invitation?",
    });
    const stay = dialog.getByRole("button", { name: "Stay on this page" });
    await expect(stay).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`${create}$`, "u"));
    expect(requests).toBe(0);
    await stay.click();
    await expect(input).toBeFocused();
    expect((await input.inputValue()) === routeSecretFixture(page).email).toBe(
      true,
    );
    expect(requests).toBe(0);
    await page.goForward();
    await dialog.getByRole("button", { name: "Discard and leave" }).click();
    await focusedHeading(page, "Home");
    await expect(page).toHaveURL(/\/$/u);
    expect(requests).toBe(2); // One destination admission: session + capability.
    expect(state.dispatches).toEqual({ create: 0, resend: 0, delete: 0 });
    await page.goBack();
    await focusedHeading(page, "Invite a supervisor");
    expect(await input.inputValue()).toBe("");
  }),
);

test(
  "revoke binds the reviewed ETag and sends nothing after a concurrent change",
  protectedJourney(async (page) => {
    const state = await invitationBackend(page);
    state.invitations.push(
      invitationRecord(page, { id: "inv_a" }),
      invitationRecord(page, { id: "inv_b" }),
    );
    await page.goto("/admin/invitations/inv_a/revoke");
    await focusedHeading(page, "Revoke invitation");
    // The target becomes faulty between review and the final confirmation.
    const changed = state.invitations.find((record) => record.id === "inv_a")!;
    changed.status = "faulty";
    changed.deliveryState = "failed";
    changed.deliveryCode = "invitation_delivery_rejected";
    changed.etag = etagB;
    await page.getByRole("button", { name: "Revoke invitation" }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "This invitation changed" }),
    ).toBeFocused();
    expect(state.dispatches.delete).toBe(0);
    await expect(
      page.getByRole("button", { name: "Revoke invitation" }),
    ).toHaveCount(0);

    await page.goto("/admin/invitations/inv_b/revoke");
    await focusedHeading(page, "Revoke invitation");
    await page.getByRole("button", { name: "Revoke invitation" }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Invitation revoked" }),
    ).toBeFocused();
    expect(state.dispatches.delete).toBe(1);
    expect(state.reviewedPreconditions).toEqual([true]);
    await page.getByRole("link", { name: "View invitation" }).click();
    await focusedHeading(page, "Invitation details");
    await expect(page.getByText("Revoked", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Revoke invitation" }),
    ).toHaveCount(0);
  }),
);

test(
  "invitation surfaces pass axe with visible keyboard focus",
  protectedJourney(async (page) => {
    const state = await invitationBackend(page);
    state.invitations.push(
      invitationRecord(page, { id: "inv_q" }),
      invitationRecord(page, {
        id: "inv_a",
        deliveryState: "ambiguous",
        deliveryCode: "invitation_delivery_timeout",
        attempted: true,
      }),
      invitationRecord(page, {
        id: "inv_f",
        status: "faulty",
        deliveryState: "failed",
        deliveryCode: "invitation_delivery_rejected",
        attempted: true,
      }),
    );
    await page.goto("/");
    await focusedHeading(page, "Home");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(
      page
        .getByRole("navigation", { name: "Application" })
        .getByRole("link", { name: "Invitations" }),
    ).toBeFocused();
    await visibleFocus(page, true);
    await page.keyboard.press("Enter");
    await focusedHeading(page, "Invitations");
    await expect(
      page.getByRole("table", { name: "Invitations" }),
    ).toBeVisible();
    await noAxeViolations(page);
    await page
      .getByRole("link", { name: "Invite a supervisor" })
      .first()
      .focus();
    await visibleFocus(page);

    await page.goto("/admin/invitations/inv_a");
    await focusedHeading(page, "Invitation details");
    await expect(page.getByText("Delivery unconfirmed")).toBeVisible();
    await noAxeViolations(page);
    await page.getByRole("button", { name: "Refresh" }).focus();
    await visibleFocus(page);

    await page.goto(create);
    await focusedHeading(page, "Invite a supervisor");
    await page.getByRole("button", { name: "Send invitation" }).click();
    await expect(page.getByLabel(field)).toBeFocused();
    await expect(page.getByLabel(field)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await noAxeViolations(page);

    await page.goto("/admin/invitations/inv_missing");
    await focusedHeading(page, "Not available");
    await noAxeViolations(page);
  }),
);

for (const size of ["standard", "large", "extra-large"] as const) {
  test(
    `invitation surfaces reflow at 320 CSS pixels with ${size} text`,
    protectedJourney(async (page) => {
      const state = await invitationBackend(page);
      state.invitations.push(
        invitationRecord(page, {
          id: "inv_a",
          deliveryState: "ambiguous",
          deliveryCode: "invitation_delivery_ambiguous",
          attempted: true,
        }),
      );
      await page.addInitScript(
        (value) => localStorage.setItem("mia.interface.text-size", value),
        size,
      );
      await page.setViewportSize({ width: 320, height: 900 });
      for (const [path, heading] of [
        [list, "Invitations"],
        ["/admin/invitations/inv_a", "Invitation details"],
        ["/admin/invitations/inv_a/resend", "Resend invitation"],
        ["/admin/invitations/inv_a/revoke", "Revoke invitation"],
        [create, "Invite a supervisor"],
      ] as const) {
        await page.goto(path);
        await focusedHeading(page, heading);
        await noPageScroll(page);
      }
      // The table scrolls inside its own labelled, focusable region.
      await page.goto(list);
      await focusedHeading(page, "Invitations");
      const region = page.getByRole("region", { name: "Invitations" });
      await region.focus();
      await visibleFocus(page);
      await noPageScroll(page);
    }),
  );
}

test(
  "invitation surfaces stay operable without page scroll in every launch locale",
  protectedJourney(async (page) => {
    const state = await invitationBackend(page);
    state.invitations.push(invitationRecord(page, { id: "inv_a" }));
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/");
    for (const locale of [
      "de-DE",
      "en-US",
      "es-AR",
      "es-ES",
      "fr-FR",
      "pt-BR",
      "pt-PT",
    ]) {
      await page.evaluate(
        (value) => localStorage.setItem("mia.interface.locale", value),
        locale,
      );
      for (const [path, content] of [
        [list, "main table"],
        ["/admin/invitations/inv_a", "main dl"],
        [create, "#invitation-email"],
      ] as const) {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("main h1")).toBeFocused();
        await expect(page.locator(content)).toBeVisible();
        await noPageScroll(page);
      }
      await expect(page.locator("#invitation-email")).toBeVisible();
      await noAxeViolations(page);
    }
  }),
);

test("invitation management remains operable at actual 200% browser zoom", async () => {
  await atBrowserZoom(2, async (page) => {
    const state = await invitationRoutes(page);
    state.invitations.push(invitationRecord(page, { id: "inv_a" }));
    for (const size of ["standard", "large", "extra-large"]) {
      await page.evaluate(
        (value) => localStorage.setItem("mia.interface.text-size", value),
        size,
      );
      await page.goto(`http://127.0.0.1:4173/admin/invitations/inv_a`);
      await focusedHeading(page, "Invitation details");
      await noPageScroll(page);
      const resend = page.getByRole("link", { name: "Resend invitation" });
      await resend.focus();
      await visibleFocus(page);
      await page.keyboard.press("Enter");
      await focusedHeading(page, "Resend invitation");
      await noPageScroll(page);
    }
    expect(state.dispatches).toEqual({ create: 0, resend: 0, delete: 0 });
  });
});
