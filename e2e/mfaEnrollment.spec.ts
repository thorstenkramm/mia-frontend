import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Secret-bearing journeys: no trace, screenshot, or video, and every secret
// assertion compares inside the page and reports only a boolean. Each test
// closes its page before reporting, so no failure aria snapshot is written.
test.use({ trace: "off", screenshot: "off", video: "off" });

function secretBearing(body: (page: Page) => Promise<void>) {
  return async ({ page }: { page: Page }) => {
    try {
      // Freeze both clock sources, leaving task/animation timers running for
      // React and axe. Runner stalls must not simulate sleep in these journeys.
      // Lifecycle events still shield normally; sessionLifecycle.spec.ts covers
      // advancing clocks, deadlines, watchdog delays, and real BFCache restores.
      await page.clock.setFixedTime(new Date());
      await page.addInitScript(() => {
        const now = performance.now();
        performance.now = () => now;
      });
      await body(page);
    } finally {
      await page.close();
    }
  };
}

const mediaType = "application/vnd.api+json";
const pendingId = "mfe_pending";
const base32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const crockford = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
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

function fixtures() {
  const secret = Array.from(
    randomBytes(32),
    (byte) => base32[byte % base32.length],
  ).join("");
  const codes = Array.from({ length: 10 }, () =>
    Array.from(
      randomBytes(16),
      (byte) => crockford[byte % crockford.length],
    ).join(""),
  );
  return {
    secret,
    uri: `otpauth://totp/MIA%20(127.0.0.1:4173):example.learner?secret=${secret}&issuer=MIA`,
    codes,
    grouped: codes.map((code) => code.replace(/(.{4})(?=.)/gu, "$1-")),
    code: String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0"),
  };
}

type Fixture = ReturnType<typeof fixtures>;

async function mockBackend(page: Page, fixture: Fixture) {
  const state = {
    mfa: {} as { active?: boolean; pending?: boolean },
    requests: [] as string[],
    starts: 0,
    verifies: 0,
  };
  await page.context().addCookies([
    {
      name: "mia_csrf",
      value: crypto.randomUUID(),
      url: "http://127.0.0.1:4173/",
    },
  ]);
  page.on("request", (request) => {
    const url = new URL(request.url());
    state.requests.push(`${url.origin}${url.pathname}`);
  });
  const json = (body: unknown, status = 200) => ({
    status,
    contentType: mediaType,
    body: JSON.stringify(body),
  });
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill(
      json({
        data: {
          type: "auth-sessions",
          id: "account-id",
          attributes: {
            stage: "authenticated",
            idle_expires_at: new Date(Date.now() + 30 * 60_000)
              .toISOString()
              .replace("Z", "000Z"),
            absolute_expires_at: new Date(Date.now() + 12 * 60 * 60_000)
              .toISOString()
              .replace("Z", "000Z"),
          },
        },
      }),
    ),
  );
  await page.route("**/api/v1/users/me/capabilities", (route) =>
    route.fulfill(
      json({
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
    ),
  );
  await page.route("**/api/v1/users/me/mfa", (route) =>
    route.fulfill(
      json({
        data: {
          type: "mfa-states",
          id: "account-id",
          attributes: {
            active_factor: state.mfa.active
              ? { id: "mff_active", method: "totp" }
              : null,
            pending_enrollment: state.mfa.pending
              ? {
                  id: pendingId,
                  method: "totp",
                  expires_at: new Date(Date.now() + 30 * 60_000)
                    .toISOString()
                    .replace("Z", "000Z"),
                  replaces_factor_id: null,
                }
              : null,
            actions: {
              enroll: !state.mfa.active && !state.mfa.pending,
              continue: state.mfa.pending === true,
              cancel: state.mfa.pending === true,
              disable: state.mfa.active === true,
              replace: state.mfa.active === true,
              verify: state.mfa.pending === true,
              sms_resend: false,
            },
          },
        },
      }),
    ),
  );
  await page.route("**/api/v1/users/me/mfa-enrollments", (route) => {
    state.starts++;
    state.mfa = { pending: true };
    return route.fulfill(
      json(
        {
          data: {
            type: "mfa-enrollments",
            id: pendingId,
            attributes: { method: "totp", provisioning_uri: fixture.uri },
          },
        },
        201,
      ),
    );
  });
  await page.route(
    `**/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
    (route) => {
      state.verifies++;
      state.mfa = { active: true };
      return route.fulfill(
        json({
          data: {
            type: "mfa-recovery-codes",
            id: pendingId,
            attributes: { recovery_codes: fixture.codes },
          },
        }),
      );
    },
  );
  return state;
}

// Searches the DOM, title, URL, history state, and both storages in the page.
function pageContains(page: Page, values: readonly string[]) {
  return page.evaluate((needles) => {
    const storage = [localStorage, sessionStorage]
      .flatMap((store) =>
        Array.from({ length: store.length }, (_, index) => {
          const key = store.key(index) ?? "";
          return `${key}${store.getItem(key) ?? ""}`;
        }),
      )
      .join("");
    const haystack = `${new XMLSerializer().serializeToString(document)}${document.title}${location.href}${JSON.stringify(history.state)}${storage}`;
    return needles.some((needle) => haystack.includes(needle));
  }, values);
}

async function reachVerify(page: Page) {
  await page.goto("/profile/security/mfa/enroll");
  await page.locator("main").getByRole("button").first().click();
  await expect(page.locator("main svg[role=img]")).toBeVisible();
}

test(
  "the 320px drawer refuses departure from unacknowledged codes, then leaves with a replaced entry",
  secretBearing(async (page) => {
    const fixture = fixtures();
    await mockBackend(page, fixture);
    await page.setViewportSize({ width: 320, height: 900 });
    // Start from an application entry so Back stays within MIA.
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Home" }),
    ).toBeFocused();
    await reachVerify(page);
    await page
      .getByLabel("Six-digit code from your authenticator app (required)")
      .fill(fixture.code);
    await page.keyboard.press("Enter");
    const codesPath = "/profile/security/mfa/recovery-codes";
    await page.getByRole("button", { name: "Show recovery codes" }).click();
    await expect(page.locator("main ol li")).toHaveCount(10);

    const open = page.getByRole("button", { name: "Open navigation" });
    const drawerHome = page
      .getByRole("dialog", { name: "Application" })
      .getByRole("link", { name: "Home" });
    await open.focus();
    await page.keyboard.press("Enter");
    await drawerHome.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const acknowledgement = page.getByLabel("I have saved my recovery codes");
    await expect(acknowledgement).toBeFocused();
    // Still focused after the drawer's close transition and focus restoration.
    await page.waitForTimeout(400);
    await expect(acknowledgement).toBeFocused();
    expect(new URL(page.url()).pathname).toBe(codesPath);
    await expect(page.locator("main ol li")).toHaveCount(10);

    await page.keyboard.press("Space");
    await open.focus();
    await page.keyboard.press("Enter");
    await drawerHome.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 1, name: "Home" }),
    ).toBeFocused();
    expect(
      await pageContains(page, [...fixture.codes, ...fixture.grouped]),
    ).toBe(false);
    await page.goBack();
    await expect.poll(() => new URL(page.url()).pathname).not.toBe(codesPath);
    await expect(page.locator("main ol li")).toHaveCount(0);
    expect(
      await pageContains(page, [...fixture.codes, ...fixture.grouped]),
    ).toBe(false);
  }),
);

test(
  "keyboard enrollment renders a local QR, shows codes once, prints only codes, and tears them down",
  secretBearing(async (page) => {
    const fixture = fixtures();
    const backend = await mockBackend(page, fixture);
    await page.goto("/");
    await page
      .getByRole("link", { name: "Multi-factor authentication" })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Multi-factor authentication",
      }),
    ).toBeFocused();
    await page.getByRole("link", { name: "Set up authenticator app" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Start setup" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("img", {
        name: "QR code for adding MIA to your authenticator app",
      }),
    ).toBeVisible();
    expect(await page.locator("img, canvas, a[href^='otpauth:']").count()).toBe(
      0,
    );
    expect(
      await page
        .locator("main dd")
        .evaluateAll(
          (cells, secret) => cells.some((cell) => cell.textContent === secret),
          fixture.secret,
        ),
    ).toBe(true);
    expect(
      backend.requests.every((url) => url.startsWith("http://127.0.0.1:4173/")),
    ).toBe(true);

    await page
      .getByLabel("Six-digit code from your authenticator app (required)")
      .fill(fixture.code);
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { level: 1, name: "MFA recovery codes" }),
    ).toBeFocused();
    expect(
      await pageContains(page, [...fixture.codes, ...fixture.grouped]),
    ).toBe(false);
    await page.getByRole("button", { name: "Show recovery codes" }).click();
    await expect(page.locator("main ol li")).toHaveCount(10);
    expect(
      await page
        .locator("main ol li")
        .evaluateAll(
          (items, grouped) =>
            items.map((item) => item.textContent).join("\n") ===
            grouped.join("\n"),
          fixture.grouped,
        ),
    ).toBe(true);

    await page.emulateMedia({ media: "print" });
    await expect(page.locator("#root")).toBeHidden();
    expect(
      await page
        .getByTestId("recovery-code-print")
        .evaluate(
          (view, grouped) =>
            view.querySelector("ol")?.textContent === grouped.join("") &&
            view
              .querySelector("p")
              ?.textContent?.includes("cannot show them again") === true &&
            view.children.length === 2,
          fixture.grouped,
        ),
    ).toBe(true);
    await page.emulateMedia({ media: "screen" });
    await expect(page.getByTestId("recovery-code-print")).toBeHidden();

    await page.getByRole("button", { name: "Done" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByLabel("I have saved my recovery codes"),
    ).toBeFocused();
    await page.keyboard.press("Space");
    await page.getByRole("button", { name: "Done" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Multi-factor authentication is on"),
    ).toBeVisible();
    expect(
      await pageContains(page, [
        fixture.secret,
        fixture.uri,
        ...fixture.codes,
        ...fixture.grouped,
      ]),
    ).toBe(false);
    await page.goBack();
    await expect(page.locator("main ol li")).toHaveCount(0);
    expect(
      await pageContains(page, [
        fixture.secret,
        ...fixture.codes,
        ...fixture.grouped,
      ]),
    ).toBe(false);
    expect({ starts: backend.starts, verifies: backend.verifies }).toEqual({
      starts: 1,
      verifies: 1,
    });
  }),
);

test(
  "a persisted pagehide masks setup until Refresh and Reveal; a non-persisted one destroys it",
  secretBearing(async (page) => {
    const fixture = fixtures();
    const backend = await mockBackend(page, fixture);
    await reachVerify(page);
    await page.evaluate(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      ),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Content hidden" }),
    ).toBeVisible();
    expect(await pageContains(page, [fixture.secret])).toBe(false);
    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(page.getByText("Setup details are hidden")).toBeVisible();
    expect(await pageContains(page, [fixture.secret])).toBe(false);
    await page.getByRole("button", { name: "Show setup details" }).click();
    await expect(page.locator("main svg[role=img]")).toBeVisible();
    expect(await pageContains(page, [fixture.secret])).toBe(true);

    await page.evaluate(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: false }),
      ),
    );
    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(page.getByText(/cannot be shown again/u)).toBeVisible();
    expect(await pageContains(page, [fixture.secret])).toBe(false);
    expect(backend.starts).toBe(1);
  }),
);

for (const locale of [
  "en-US",
  "de-DE",
  "fr-FR",
  "pt-PT",
  "pt-BR",
  "es-ES",
  "es-AR",
]) {
  test(
    `MFA surfaces reflow at 320px and pass axe in ${locale} for every text size`,
    secretBearing(async (page) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: 320, height: 900 });
      for (const textSize of ["standard", "large", "extra-large"]) {
        const fixture = fixtures();
        await page.unrouteAll({ behavior: "ignoreErrors" });
        await mockBackend(page, fixture);
        await page.addInitScript(
          ({ locale, textSize }) => {
            localStorage.setItem("mia.interface.locale", locale);
            localStorage.setItem("mia.interface.text-size", textSize);
          },
          { locale, textSize },
        );
        const check = async () => {
          await expect(page.locator("html")).toHaveAttribute("lang", locale);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
            [],
          );
          for (const control of await page
            .locator("main button, main a")
            .all()) {
            const bounds = await control.boundingBox();
            expect(bounds !== null && bounds.height >= 24).toBe(true);
          }
        };
        await page.goto("/profile/security/mfa");
        await expect(page.locator("main h2").first()).toBeVisible();
        await check();
        await reachVerify(page);
        await check();
        await page.locator("#mfa-enrollment-code").fill(fixture.code);
        await page.locator("main button[type=submit]").click();
        const catalog = JSON.parse(
          readFileSync(
            new URL(
              `../src/platform/i18n/catalogs/${locale}.json`,
              import.meta.url,
            ),
            "utf8",
          ),
        ) as Record<string, string>;
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: catalog["mfa.codes.heading"],
          }),
        ).toBeVisible();
        await expect(
          page.getByRole("heading", {
            level: 1,
            name: catalog["session.shieldHeading"],
          }),
        ).toHaveCount(0);
        await page
          .getByRole("button", {
            name: catalog["mfa.codes.reveal"],
            exact: true,
          })
          .click();
        await expect(page.locator("main ol li")).toHaveCount(10);
        await check();
      }
    }),
  );
}
