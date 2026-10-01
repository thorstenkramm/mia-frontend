import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Locator, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import { expectRetainedSecret } from "./secretAssertions";

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
const mfaLabels = {
  "en-US": ["Six-digit code (required)", "Recovery code (required)"],
  "de-DE": [
    "Sechsstelliger Code (erforderlich)",
    "Wiederherstellungscode (erforderlich)",
  ],
  "fr-FR": [
    "Code à six chiffres (obligatoire)",
    "Code de récupération (obligatoire)",
  ],
  "pt-PT": [
    "Código de seis dígitos (obrigatório)",
    "Código de recuperação (obrigatório)",
  ],
  "pt-BR": [
    "Código de seis dígitos (obrigatório)",
    "Código de recuperação (obrigatório)",
  ],
  "es-ES": [
    "Código de seis dígitos (obligatorio)",
    "Código de recuperación (obligatorio)",
  ],
  "es-AR": [
    "Código de seis dígitos (obligatorio)",
    "Código de recuperación (obligatorio)",
  ],
} satisfies Record<(typeof locales)[number], readonly [string, string]>;

const appUrl = "http://127.0.0.1:4173/";
const mediaType = "application/vnd.api+json";

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function mfaCodeFixture(): string {
  return `0${String(Math.floor(Math.random() * 100_000)).padStart(5, "0")}`;
}

function recoveryCodeFixture(): string {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

test.use({ trace: "off", screenshot: "off", video: "off" });

test.describe("password sign-in", () => {
  test("successful login produces the epoch that tears down another page's credentials without discovery", async ({
    page,
    context,
  }) => {
    const receiver = await context.newPage();
    await mockSession(page);
    await mockSession(receiver);
    await context.addCookies([
      { name: "mia_csrf", value: crypto.randomUUID(), url: appUrl },
    ]);
    let receiverReads = 0;
    receiver.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/v1/auth/session")
        receiverReads++;
    });
    await page.route("**/api/v1/auth/login", async (route) =>
      route.fulfill({
        status: 200,
        contentType: mediaType,
        body: JSON.stringify({
          data: {
            type: "auth-sessions",
            id: "account-id",
            attributes: {
              stage: "password-change",
              idle_expires_at: "2026-09-30T10:30:00.000000Z",
              absolute_expires_at: "2026-09-30T10:30:00.000000Z",
            },
          },
        }),
      }),
    );
    await page.goto("/");
    await receiver.goto("/");
    await receiver.locator("#username").fill("example");
    await receiver.locator("#password").fill(crypto.randomUUID());
    const oldControl = await receiver.locator("#password").elementHandle();
    await page.locator("#username").fill("example");
    await page.locator("#password").fill(crypto.randomUUID());
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/password-change$/u);
    await expect(
      receiver.getByRole("button", { name: "Check sign-in status" }),
    ).toBeFocused();
    expect(await oldControl?.evaluate((element) => element.isConnected)).toBe(
      false,
    );
    expect(
      (await receiver.locator("#password").inputValue()).length === 0,
    ).toBe(true);
    expect(
      (await receiver.locator("#username").inputValue()).length === 0,
    ).toBe(true);
    await expect(
      receiver.getByRole("button", { name: "Sign in", exact: true }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(receiverReads).toBe(1);
    await oldControl?.dispose();
    await receiver.close();
  });
  test("a security epoch destroys entered credentials and enables only an explicit safe recheck", async ({
    page,
  }) => {
    await mockSession(page);
    let reads = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/v1/auth/session") reads++;
    });
    await page.goto("/");
    await page.locator("#username").fill("example");
    await page.locator("#password").fill(crypto.randomUUID());
    await page.evaluate(() => {
      const channel = new BroadcastChannel("mia-security-v1");
      channel.postMessage({
        version: 1,
        kind: "security-epoch",
        eventNonce: crypto.randomUUID(),
      });
      channel.close();
    });
    await expect(
      page.getByRole("button", { name: "Check sign-in status" }),
    ).toBeVisible();
    expect((await page.locator("#password").inputValue()).length === 0).toBe(
      true,
    );
    expect((await page.locator("#username").inputValue()).length === 0).toBe(
      true,
    );
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toHaveAttribute("aria-disabled", "true");
    expect(reads).toBe(1);
    await page.getByRole("button", { name: "Check sign-in status" }).click();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toHaveAttribute("aria-disabled", "false");
    expect(reads).toBe(2);
  });
  test("keyboard submission retains exact input on throttling and isolates the next restricted stage", async ({
    page,
    context,
  }) => {
    await mockSession(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const csrf = crypto.randomUUID();
    await context.addCookies([{ name: "mia_csrf", value: csrf, url: appUrl }]);
    let posts = 0;
    let correctWire = false;
    let reads = 0;
    let protectedRequests = 0;
    let protectedChunks = 0;
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path === "/api/v1/auth/session") reads++;
      if (
        path.startsWith("/api/") &&
        !["/api/v1/auth/session", "/api/v1/auth/login"].includes(path)
      )
        protectedRequests++;
      if (path.includes("HomeEntryRoute")) protectedChunks++;
    });
    const username = "Example.User";
    const password = ` ${crypto.randomUUID()} é `;
    await page.route("**/api/v1/auth/login", async (route) => {
      posts++;
      const expectedBody = JSON.stringify({
        data: {
          type: "login-attempts",
          attributes: { username, password },
        },
      });
      const requestBody = route.request().postData();
      correctWire =
        requestBody !== null &&
        fingerprint(requestBody) === fingerprint(expectedBody) &&
        route.request().headers()["x-csrf-token"] === csrf &&
        !route.request().headers()["x-request-id"];
      if (posts === 1) {
        await route.fulfill({
          status: 429,
          headers: { "Retry-After": "60" },
          body: "<p>Throttled</p>",
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: mediaType,
          body: JSON.stringify({
            data: {
              type: "auth-sessions",
              id: "account-id",
              attributes: {
                stage: "mfa",
                mfa_challenge_id: "challenge-id",
                idle_expires_at: "2026-09-30T10:30:00.000000Z",
                absolute_expires_at: "2026-09-30T10:30:00.000000Z",
              },
            },
          }),
        });
      }
    });
    await page.goto("/");
    await pasteInto(page, page.locator("#username"), username);
    await pasteInto(page, page.locator("#password"), password);
    await expect(page.locator("#username")).toHaveAttribute(
      "autocomplete",
      "username",
    );
    await expect(page.locator("#password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    await page
      .locator("#password")
      .evaluate((input: HTMLInputElement) => input.setSelectionRange(1, 5));
    await page.keyboard.press("Tab");
    await page.keyboard.press("Space");
    await expect(
      page.getByRole("button", { name: "Hide password" }),
    ).toBeFocused();
    expect(
      await page
        .locator("#password")
        .evaluate(
          (input: HTMLInputElement) =>
            input.selectionStart === 1 && input.selectionEnd === 5,
        ),
    ).toBe(true);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("alert")).toContainText("60 seconds");
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeFocused();
    expect((await page.locator("#password").inputValue()) === password).toBe(
      true,
    );
    expect(correctWire).toBe(true);
    await expect(
      page.getByRole("button", { name: "Technical details" }),
    ).toHaveAttribute("aria-expanded", "false");
    await page.getByRole("button", { name: "Technical details" }).click();
    for (const textSize of textSizes) {
      await page.setViewportSize({ width: 320, height: 900 });
      await page.locator(`#text-size-${textSize}`).check();
      await expectNoPageOverflow(page);
      await expectFocusedAndUnobscured(
        page,
        page.getByRole("button", { name: "Sign in", exact: true }),
      );
    }
    await expectNoWcagViolations(page);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/mfa$/u);
    await expect(
      page.getByRole("button", { name: "Sign out", exact: true }),
    ).toBeVisible();
    expect(await page.locator("#password").count()).toBe(0);
    expect(protectedChunks).toBe(0);
    await expect(page).toHaveTitle("Verify sign-in | MIA");
    expect(await page.getByRole("navigation").count()).toBe(0);
    expect(
      await page.getByRole("heading", { name: "Home", exact: true }).count(),
    ).toBe(0);
    expect(
      await page
        .getByText("Access checks are complete.", { exact: true })
        .count(),
    ).toBe(0);
    expect(
      await page.evaluate(async () => ({
        cacheEntries: (await caches.keys()).length,
        sessionEntries: sessionStorage.length,
        unexpectedLocalEntries: Object.keys(localStorage).filter(
          (key) => !key.includes("text-size") && !key.includes("locale"),
        ).length,
        protectedResources: performance
          .getEntriesByType("resource")
          .filter(
            (entry) =>
              entry.name.includes("HomeEntryRoute") ||
              (new URL(entry.name).pathname.startsWith("/api/") &&
                !["/api/v1/auth/session", "/api/v1/auth/login"].includes(
                  new URL(entry.name).pathname,
                )),
          ).length,
      })),
    ).toEqual({
      cacheEntries: 0,
      sessionEntries: 0,
      unexpectedLocalEntries: 0,
      protectedResources: 0,
    });
    expect({ reads, posts, protectedRequests }).toEqual({
      reads: 1,
      posts: 2,
      protectedRequests: 0,
    });
  });

  test("a logout barrier waits for an admitted login and requires explicit late-transition reconciliation", async ({
    page,
    context,
  }) => {
    await mockSession(page);
    await context.addCookies([
      { name: "mia_csrf", value: crypto.randomUUID(), url: appUrl },
    ]);
    const peer = await context.newPage();
    await mockSession(peer, "mfa");
    let release: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let posts = 0;
    let logouts = 0;
    let peerReads = 0;
    peer.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/v1/auth/session")
        peerReads++;
    });
    await page.route("**/api/v1/auth/login", async (route) => {
      posts++;
      await pending;
      await route.fulfill({
        status: 200,
        contentType: mediaType,
        body: JSON.stringify({
          data: {
            type: "auth-sessions",
            id: "account-id",
            attributes: {
              stage: "password-change",
              idle_expires_at: "2026-09-30T10:30:00.000000Z",
              absolute_expires_at: "2026-09-30T10:30:00.000000Z",
            },
          },
        }),
      });
    });
    await peer.route("**/api/v1/auth/logout", async (route) => {
      logouts++;
      await route.fulfill({ status: 204 });
    });
    await page.goto("/");
    await peer.goto("/");
    await page.locator("#username").fill("example");
    await page.locator("#password").fill(crypto.randomUUID());
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect.poll(() => posts).toBe(1);
    await peer.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/logout$/u);
    expect(logouts).toBe(0);
    release?.();
    await expect.poll(() => logouts).toBe(1);
    await expect(
      peer.getByRole("button", { name: "Refresh sign-out status" }),
    ).toBeVisible();
    expect(peerReads).toBe(1);
    expect(await page.locator("#password").count()).toBe(0);
    expect(await page.getByRole("navigation").count()).toBe(0);
    await peer.close();
  });
});

test.describe("MFA sign-in", () => {
  test("submits one method-neutral six-digit challenge and isolates password change", async ({
    page,
    context,
  }) => {
    await mockSession(page, "mfa");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const csrf = crypto.randomUUID();
    const code = mfaCodeFixture();
    await context.addCookies([{ name: "mia_csrf", value: csrf, url: appUrl }]);
    let posts = 0;
    let exactWire = false;
    let protectedRequests = 0;
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path.startsWith("/api/") && !path.startsWith("/api/v1/auth/"))
        protectedRequests++;
    });
    await page.route(
      "**/api/v1/auth/mfa-challenges/challenge-id/verifications",
      async (route) => {
        posts++;
        exactWire =
          route.request().headers()["x-csrf-token"] === csrf &&
          fingerprint(route.request().postData() ?? "") ===
            fingerprint(
              JSON.stringify({
                data: {
                  type: "mfa-verifications",
                  attributes: { code },
                },
              }),
            );
        await route.fulfill({
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
        });
      },
    );
    await page.goto("/auth/mfa");
    await expect(
      page.getByRole("heading", { name: "Verify sign-in" }),
    ).toBeFocused();
    await expect(page.getByText(/resend/iu)).toHaveCount(0);
    await expect(page.getByRole("navigation")).toHaveCount(0);
    const input = page.getByLabel("Six-digit code (required)");
    await expect(input).toHaveAttribute("autocomplete", "one-time-code");
    await pasteInto(page, input, code);
    await input.press("Enter");
    await expect(page).toHaveURL(/\/auth\/password-change$/u);
    expect({ exactWire, posts, protectedRequests }).toEqual({
      exactWire: true,
      posts: 1,
      protectedRequests: 0,
    });
  });

  test("normalizes one recovery code and enters the authenticated capability gate", async ({
    page,
    context,
  }) => {
    await mockSession(page, "mfa");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await mockCapabilities(page, 100);
    await context.addCookies([
      { name: "mia_csrf", value: crypto.randomUUID(), url: appUrl },
    ]);
    const wire = recoveryCodeFixture();
    const displayed = wire.toLowerCase().replace(/(.{4})(?=.)/gu, "$1- ");
    let posts = 0;
    let normalized = false;
    await page.route(
      "**/api/v1/auth/mfa-challenges/challenge-id/recovery-code-consumptions",
      async (route) => {
        posts++;
        normalized =
          fingerprint(route.request().postData() ?? "") ===
          fingerprint(
            JSON.stringify({
              data: {
                type: "mfa-recovery-code-consumptions",
                attributes: { code: wire },
              },
            }),
          );
        await route.fulfill({
          status: 200,
          contentType: mediaType,
          body: JSON.stringify({
            data: {
              type: "auth-sessions",
              id: "account-id",
              attributes: {
                stage: "authenticated",
                idle_expires_at: "2026-10-01T10:30:00.000000Z",
                absolute_expires_at: "2026-10-01T22:00:00.000000Z",
              },
            },
          }),
        });
      },
    );
    await page.goto("/auth/mfa/recovery");
    await pasteInto(
      page,
      page.getByLabel("Recovery code (required)"),
      displayed,
    );
    expect(
      await page.evaluate(async () => {
        const secrets = Array.from(
          document.querySelectorAll<HTMLInputElement>("input[name=code]"),
          (input) => input.value,
        ).filter(Boolean);
        const persisted = JSON.stringify({
          href: location.href,
          history: history.state,
          local: Object.entries(localStorage),
          session: Object.entries(sessionStorage),
          caches: "caches" in window ? await caches.keys() : [],
        });
        return secrets.every((secret) => !persisted.includes(secret));
      }),
    ).toBe(true);
    await page.getByLabel("Recovery code (required)").press("Enter");
    await expect(
      page.getByRole("heading", { name: "Checking access" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Home" })).toBeFocused();
    expect({ normalized, posts }).toEqual({ normalized: true, posts: 1 });
  });

  test("reconciles response loss without replay and remains usable at 320 CSS pixels", async ({
    page,
    context,
  }) => {
    let reads = 0;
    await page.route("**/api/v1/auth/session", async (route) => {
      reads++;
      await route.fulfill({
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
      });
    });
    await context.addCookies([
      { name: "mia_csrf", value: crypto.randomUUID(), url: appUrl },
    ]);
    let posts = 0;
    await page.route(
      "**/api/v1/auth/mfa-challenges/challenge-id/verifications",
      async (route) => {
        posts++;
        await route.abort("connectionfailed");
      },
    );
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/auth/mfa");
    await page.getByLabel("Six-digit code (required)").fill(mfaCodeFixture());
    await page.getByRole("button", { name: "Verify code" }).click();
    await expect(page.getByText(/still requires verification/iu)).toBeVisible();
    expect({ posts, reads }).toEqual({ posts: 1, reads: 2 });
    await applyWcagTextSpacing(page);
    for (const textSize of textSizes) {
      await page.evaluate((nextTextSize) => {
        document.documentElement.classList.remove(
          "text-base",
          "text-lg",
          "text-xl",
        );
        document.documentElement.classList.add(
          nextTextSize === "standard"
            ? "text-base"
            : nextTextSize === "large"
              ? "text-lg"
              : "text-xl",
        );
      }, textSize);
      const input = page.getByLabel("Six-digit code (required)");
      await expectMinimumPointerTarget(input);
      await expectMinimumPointerTarget(
        page.getByRole("button", { name: "Verify code" }),
      );
      await expectFocusedAndUnobscured(page, input);
      await expectNoPageOverflow(page);
    }
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map(({ id }) => id)).toEqual([]);
  });

  test("both localized MFA routes reflow in every text mode at 320 CSS pixels", async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 320, height: 900 });
    await mockSession(page, "mfa");
    await page.goto("/auth/mfa");

    for (const [routeIndex, path] of [
      [0, "/auth/mfa"],
      [1, "/auth/mfa/recovery"],
    ] as const) {
      for (const locale of locales) {
        for (const textSize of textSizes) {
          await page.evaluate(
            ([nextLocale, nextTextSize]) => {
              localStorage.setItem("mia.interface.locale", nextLocale);
              localStorage.setItem("mia.interface.text-size", nextTextSize);
            },
            [locale, textSize] as const,
          );
          await page.goto(path);
          await applyWcagTextSpacing(page);
          await expect(page.locator("html")).toHaveAttribute("lang", locale);
          const input = page.getByLabel(mfaLabels[locale][routeIndex]);
          await expect(input).toBeVisible();
          await input.focus();
          await expectFocusedAndUnobscured(page, input);
          for (const control of [
            input,
            page.locator("button[type=submit]"),
            page.locator("button[type=button]").first(),
            page.locator("button[type=button]").last(),
          ])
            await expectMinimumPointerTarget(control);
          await expectNoPageOverflow(page);
        }
      }
    }
    await expectNoWcagViolations(page);
  });

  test("clears an expired-flow announcement on copy feedback and anonymous logout", async ({
    context,
    page,
  }) => {
    let signedOut = false;
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await context.addCookies([
      { name: "mia_csrf", value: crypto.randomUUID(), url: appUrl },
    ]);
    await page.route("**/api/v1/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: mediaType,
        body: JSON.stringify(
          signedOut
            ? { data: null, meta: { stage: "anonymous" } }
            : {
                data: {
                  type: "auth-sessions",
                  id: "account-id",
                  attributes: {
                    stage: "mfa",
                    mfa_challenge_id: "challenge-id",
                    idle_expires_at: "2026-10-01T10:30:00.000000Z",
                    absolute_expires_at: "2026-10-01T22:00:00.000000Z",
                  },
                },
              },
        ),
      });
    });
    await page.route(
      "**/api/v1/auth/mfa-challenges/challenge-id/verifications",
      async (route) => {
        await route.fulfill({
          status: 422,
          contentType: mediaType,
          body: JSON.stringify({
            errors: [{ status: "422", code: "auth_mfa_challenge_expired" }],
          }),
        });
      },
    );
    await page.route("**/api/v1/auth/logout", async (route) => {
      signedOut = true;
      await route.fulfill({ status: 204 });
    });
    const politeRegion = page.locator("[aria-live]").first();
    const assertiveRegion = page.locator("[aria-live]").last();
    await page.goto("/auth/mfa");

    await page.locator("#mfa-code").fill(mfaCodeFixture());
    await page.locator("#mfa-code").press("Enter");
    await expect(assertiveRegion).toContainText("no longer valid");
    await page.getByRole("button", { name: "Technical details" }).click();
    await page.getByRole("button", { name: "Copy technical details" }).click();
    await expect(politeRegion).toContainText("Technical details copied.");
    await expect(assertiveRegion).toBeEmpty();

    await page.reload();
    await page.locator("#mfa-code").fill(mfaCodeFixture());
    await page.locator("#mfa-code").press("Enter");
    await expect(assertiveRegion).toContainText("no longer valid");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/u);
    await expect(assertiveRegion).toBeEmpty();
    await page.locator("#interface-language").selectOption("de-DE");
    await expect(politeRegion).toContainText(
      "Die Oberflächensprache wurde geändert.",
    );
    await expect(assertiveRegion).toBeEmpty();
  });
});
test.describe("required password replacement", () => {
  function sessionBody(stage: "password-change" | "authenticated") {
    return JSON.stringify({
      data: {
        type: "auth-sessions",
        id: "account-id",
        attributes: {
          stage,
          idle_expires_at: "2026-10-01T10:30:00.000000Z",
          absolute_expires_at: "2026-10-01T22:00:00.000000Z",
        },
      },
    });
  }

  test("keyboard and paste replacement sends exact bytes once and reaches Home through capabilities", async ({
    page,
    context,
  }) => {
    await mockSession(page, "password-change");
    await mockCapabilities(page, 100);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const csrf = crypto.randomUUID();
    await context.addCookies([{ name: "mia_csrf", value: csrf, url: appUrl }]);
    const password = ` ${crypto.randomUUID()} é `;
    let posts = 0;
    let exactWire = false;
    let protectedBeforeSuccess = 0;
    let replaced = false;
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (
        !replaced &&
        path.startsWith("/api/") &&
        !path.startsWith("/api/v1/auth/")
      )
        protectedBeforeSuccess++;
    });
    await page.route("**/api/v1/auth/password-changes", async (route) => {
      posts++;
      exactWire =
        route.request().headers()["x-csrf-token"] === csrf &&
        fingerprint(route.request().postData() ?? "") ===
          fingerprint(
            JSON.stringify({
              data: {
                type: "password-changes",
                attributes: { password, password_confirmation: password },
              },
            }),
          );
      replaced = true;
      await route.fulfill({
        status: 200,
        contentType: mediaType,
        body: sessionBody("authenticated"),
      });
    });
    await page.goto("/auth/password-change");
    await expect(
      page.getByRole("heading", { level: 1, name: "Choose a new password" }),
    ).toBeFocused();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    const newPassword = page.getByLabel("New password (required)", {
      exact: true,
    });
    const confirm = page.getByLabel("Confirm new password (required)", {
      exact: true,
    });
    await expect(newPassword).toHaveAttribute("autocomplete", "new-password");
    await expect(confirm).toHaveAttribute("autocomplete", "new-password");
    await pasteInto(page, newPassword, password);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Show new password" }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(confirm).toBeFocused();
    await pasteInto(page, confirm, password);
    expect(
      await page.evaluate(async () => {
        const secrets = Array.from(
          document.querySelectorAll<HTMLInputElement>("input[type=password]"),
          (input) => input.value,
        ).filter(Boolean);
        const persisted = JSON.stringify({
          href: location.href,
          history: history.state,
          local: Object.entries(localStorage),
          session: Object.entries(sessionStorage),
          caches: "caches" in window ? await caches.keys() : [],
          title: document.title,
        });
        return (
          secrets.length === 2 &&
          secrets.every((secret) => !persisted.includes(secret))
        );
      }),
    ).toBe(true);
    await confirm.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Checking access" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Home" })).toBeFocused();
    await expect(page).toHaveURL(/\/$/u);
    expect({ exactWire, posts, protectedBeforeSuccess }).toEqual({
      exactWire: true,
      posts: 1,
      protectedBeforeSuccess: 0,
    });
  });

  test("local rule failures send nothing; server rejection and response loss never replay at 320 CSS pixels", async ({
    page,
    context,
  }) => {
    let reads = 0;
    let outcome: "reject" | "lose" = "reject";
    await page.route("**/api/v1/auth/session", async (route) => {
      reads++;
      await route.fulfill({
        status: 200,
        contentType: mediaType,
        body: sessionBody("password-change"),
      });
    });
    await context.addCookies([
      { name: "mia_csrf", value: crypto.randomUUID(), url: appUrl },
    ]);
    let posts = 0;
    await page.route("**/api/v1/auth/password-changes", async (route) => {
      posts++;
      if (outcome === "lose") {
        await route.abort("connectionfailed");
        return;
      }
      await route.fulfill({
        status: 422,
        contentType: mediaType,
        body: JSON.stringify({
          errors: [{ status: "422", code: "auth_invalid_password" }],
        }),
      });
    });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/auth/password-change");
    const newPassword = page.locator("#new-password");
    const confirm = page.locator("#password-confirmation");
    await newPassword.fill("short");
    await confirm.fill("other");
    await confirm.press("Enter");
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Correct these problems before saving your new password:",
      }),
    ).toBeVisible();
    await expect(newPassword).toHaveAttribute("aria-invalid", "true");
    await expect(confirm).toHaveAttribute("aria-invalid", "true");
    const assertive = page.locator('[aria-live="assertive"]');
    await expect(assertive).toHaveText(
      /^Correct these problems before saving your new password: The new password is too short\./u,
    );
    await expect(
      page.locator("main [aria-live], main [role=alert]"),
    ).toHaveCount(0);
    expect(posts).toBe(0);
    await expectNoPageOverflow(page);
    await expectNoWcagViolations(page);

    const password = crypto.randomUUID();
    await newPassword.fill(password);
    await confirm.fill(password);
    const save = page.getByRole("button", { name: "Save new password" });
    await save.click();
    await expect(assertive).toHaveText(
      "That password was not accepted. Choose a different password that meets the rules above.",
    );
    await expect(save).toBeFocused();
    expectRetainedSecret(
      await newPassword.inputValue(),
      password,
      "New password field",
    );
    expect(posts).toBe(1);

    outcome = "lose";
    await page.getByRole("button", { name: "Save new password" }).click();
    const unconfirmed =
      "The outcome was not confirmed. This browser still requires a new password.";
    await expect(page.locator("#password-change-status")).toHaveText(
      unconfirmed,
    );
    await expect(assertive).toHaveText(unconfirmed);
    expect({ posts, reads }).toEqual({ posts: 2, reads: 2 });
    await applyWcagTextSpacing(page);
    for (const textSize of textSizes) {
      await page.evaluate((nextTextSize) => {
        document.documentElement.classList.remove(
          "text-base",
          "text-lg",
          "text-xl",
        );
        document.documentElement.classList.add(
          nextTextSize === "standard"
            ? "text-base"
            : nextTextSize === "large"
              ? "text-lg"
              : "text-xl",
        );
      }, textSize);
      for (const control of [
        newPassword,
        confirm,
        page.getByRole("button", { name: "Save new password" }),
        page.getByRole("button", { name: "Show new password" }),
        page.getByRole("button", { name: "Show password confirmation" }),
        page.getByRole("button", { name: "Sign out" }),
      ])
        await expectMinimumPointerTarget(control);
      // A text-size change reflows the already focused control; refocus it the
      // way keyboard navigation would so the browser reveals it.
      await confirm.blur();
      await expectFocusedAndUnobscured(page, confirm);
      await expectNoPageOverflow(page);
    }
    await expectNoWcagViolations(page);
  });

  test("the localized replacement route reflows in every locale and text mode at 320 CSS pixels", async ({
    page,
  }) => {
    test.slow();
    await page.setViewportSize({ width: 320, height: 900 });
    await mockSession(page, "password-change");
    await page.goto("/auth/password-change");
    for (const locale of locales) {
      for (const textSize of textSizes) {
        await page.evaluate(
          ([nextLocale, nextTextSize]) => {
            localStorage.setItem("mia.interface.locale", nextLocale);
            localStorage.setItem("mia.interface.text-size", nextTextSize);
          },
          [locale, textSize] as const,
        );
        await page.goto("/auth/password-change");
        await applyWcagTextSpacing(page);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        const newPassword = page.locator("#new-password");
        await newPassword.fill("short");
        await page.locator("#password-confirmation").fill("other");
        await page.locator("button[type=submit]").click();
        await expect(newPassword).toHaveAttribute("aria-invalid", "true");
        await expectFocusedAndUnobscured(page, newPassword);
        for (const control of [
          newPassword,
          page.locator("#password-confirmation"),
          page.locator("button[type=submit]"),
          ...(await page.locator("button[type=button]").all()),
        ])
          await expectMinimumPointerTarget(control);
        await expectNoPageOverflow(page);
      }
    }
    await expectNoWcagViolations(page);
  });
});

for (const zoomFactor of [2, 4] as const) {
  test(`password replacement reflows at actual ${zoomFactor * 100}% browser zoom`, async () => {
    const { context, userDataDirectory } = await launchBrowserZoomContext();
    try {
      const page = await context.newPage();
      await mockSession(page, "password-change");
      await page.goto(appUrl);
      await setActualBrowserZoom(page, zoomFactor);
      expect(await page.evaluate(() => window.innerWidth)).toBe(
        1280 / zoomFactor,
      );
      for (const textSize of textSizes) {
        await page.evaluate((nextTextSize) => {
          localStorage.setItem("mia.interface.locale", "en-US");
          localStorage.setItem("mia.interface.text-size", nextTextSize);
        }, textSize);
        await page.goto("/auth/password-change");
        await applyWcagTextSpacing(page);
        const newPassword = page.locator("#new-password");
        await newPassword.fill("short");
        await page.locator("#password-confirmation").fill("other");
        await page.locator("button[type=submit]").click();
        const summary = page.getByRole("heading", {
          level: 2,
          name: "Correct these problems before saving your new password:",
        });
        await expect(summary).toBeVisible();
        await expectFocusedAndUnobscured(page, newPassword);
        for (const control of [
          newPassword,
          page.locator("#password-confirmation"),
          page.locator("button[type=submit]"),
          ...(await page.locator("button[type=button]").all()),
        ])
          await expectMinimumPointerTarget(control);
        await expectNoPageOverflow(page);
      }
      await expectNoWcagViolations(page);
    } finally {
      await context.close();
      await rm(userDataDirectory, { force: true, recursive: true });
    }
  });
}

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

async function mockCapabilities(page: Page, delayMs = 0): Promise<void> {
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
    if (delayMs > 0)
      await new Promise((resolve) => setTimeout(resolve, delayMs));
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

async function pasteInto(
  page: Page,
  control: Locator,
  value: string,
): Promise<void> {
  await control.focus();
  await page.evaluate(
    async (clipboardValue) => navigator.clipboard.writeText(clipboardValue),
    value,
  );
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+V" : "Control+V",
  );
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
      let sessionReads = 0;
      let loginPosts = 0;
      if (zoomFactor === 2) {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await context.addCookies([
          { name: "mia_csrf", value: crypto.randomUUID(), url: appUrl },
        ]);
        await page.emulateMedia({ forcedColors: "active" });
        await page.route("**/api/v1/auth/session", async (route) => {
          sessionReads++;
          await route.fulfill(
            sessionReads === 1
              ? {
                  status: 200,
                  contentType: mediaType,
                  body: JSON.stringify({
                    data: null,
                    meta: { stage: "anonymous" },
                  }),
                }
              : { status: 500, contentType: mediaType, body: "unavailable" },
          );
        });
        await page.route("**/api/v1/auth/login", async (route) => {
          loginPosts++;
          if (loginPosts === 1)
            await route.fulfill({ status: 401, body: "rejected" });
          else await route.abort("failed");
        });
      } else await mockSession(page);
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

      if (zoomFactor === 2) {
        await pasteInto(page, page.locator("#username"), "example");
        await pasteInto(page, page.locator("#password"), crypto.randomUUID());
        await page
          .getByRole("button", { name: "Sign in", exact: true })
          .click();
        await expect(page.getByRole("alert")).toBeVisible();
        for (const textSize of textSizes) {
          await page.locator(`#text-size-${textSize}`).check();
          for (const control of [
            page.locator("#username"),
            page.locator("#password"),
            page.getByRole("button", { name: "Show password" }),
            page.getByRole("button", { name: "Sign in", exact: true }),
            page.getByRole("button", { name: "Technical details" }),
          ]) {
            await expectMinimumPointerTarget(control);
            await expectFocusedAndUnobscured(page, control);
            expect(
              await control.evaluate(
                (element) => getComputedStyle(element).forcedColorAdjust,
              ),
            ).toBe("auto");
          }
          await expectNoPageOverflow(page);
        }
        await page
          .getByRole("button", { name: "Sign in", exact: true })
          .click();
        const recheck = page.getByRole("button", {
          name: "Check sign-in status",
        });
        await expect(recheck).toBeFocused();
        for (const textSize of textSizes) {
          await page.locator(`#text-size-${textSize}`).check();
          await expectMinimumPointerTarget(recheck);
          await expectFocusedAndUnobscured(page, recheck);
          expect(
            await recheck.evaluate(
              (element) => getComputedStyle(element).forcedColorAdjust,
            ),
          ).toBe("auto");
          await expectNoPageOverflow(page);
        }
        expect(
          await page.evaluate(
            () => window.matchMedia("(forced-colors: active)").matches,
          ),
        ).toBe(true);
      }

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

for (const zoomFactor of [2, 4] as const) {
  test(`both MFA routes and recovery states reflow at actual ${zoomFactor * 100}% browser zoom`, async () => {
    const { context, userDataDirectory } = await launchBrowserZoomContext();
    try {
      const page = await context.newPage();
      let outcome: "none" | "expired" | "reconciliation-failed" = "none";
      let failDiscovery = false;
      await context.addCookies([
        { name: "mia_csrf", value: crypto.randomUUID(), url: appUrl },
      ]);
      await page.route("**/api/v1/auth/session", async (route) => {
        if (failDiscovery) {
          await route.abort("connectionfailed");
          return;
        }
        await route.fulfill({
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
                absolute_expires_at: "2026-10-01T22:00:00.000000Z",
              },
            },
          }),
        });
      });
      await page.route("**/api/v1/auth/mfa-challenges/**", async (route) => {
        if (outcome === "expired") {
          await route.fulfill({
            status: 422,
            contentType: mediaType,
            body: JSON.stringify({
              errors: [{ status: "422", code: "auth_mfa_challenge_expired" }],
            }),
          });
          return;
        }
        if (outcome === "reconciliation-failed") {
          failDiscovery = true;
          await route.abort("connectionfailed");
          return;
        }
        await route.abort("blockedbyclient");
      });
      await page.goto(appUrl);
      await setActualBrowserZoom(page, zoomFactor);
      const metrics = await page.evaluate(() => ({
        cssZoom: getComputedStyle(document.documentElement).zoom,
        devicePixelRatio: window.devicePixelRatio,
        innerWidth: window.innerWidth,
      }));
      expect(metrics.cssZoom).toBe("1");
      expect(metrics.devicePixelRatio).toBeCloseTo(zoomFactor, 2);
      expect(metrics.innerWidth).toBe(1280 / zoomFactor);

      for (const path of ["/auth/mfa", "/auth/mfa/recovery"] as const) {
        for (const textSize of textSizes) {
          await page.evaluate((nextTextSize) => {
            localStorage.setItem("mia.interface.locale", "en-US");
            localStorage.setItem("mia.interface.text-size", nextTextSize);
          }, textSize);
          await page.goto(path);
          await applyWcagTextSpacing(page);
          const input = page.locator("#mfa-code");
          await input.focus();
          await expectFocusedAndUnobscured(page, input);
          for (const control of [
            input,
            page.locator("button[type=submit]"),
            page.locator("button[type=button]").first(),
            page.locator("button[type=button]").last(),
          ])
            await expectMinimumPointerTarget(control);
          await expectNoPageOverflow(page);
        }
      }

      if (zoomFactor === 2) {
        outcome = "expired";
        for (const path of ["/auth/mfa", "/auth/mfa/recovery"] as const) {
          await page.goto(path);
          const input = page.locator("#mfa-code");
          await pasteInto(
            page,
            input,
            path.endsWith("recovery")
              ? recoveryCodeFixture()
              : mfaCodeFixture(),
          );
          await input.press("Enter");
          const heading = page.getByRole("heading", {
            level: 1,
            name: "Start sign-in again",
          });
          await expect(heading).toBeFocused();
          const assertiveRegion = page
            .locator("[aria-live]")
            .filter({ hasText: "no longer valid" });
          await expect(assertiveRegion).toHaveAttribute(
            "aria-live",
            "assertive",
          );
          await expect(page.locator("#mfa-code")).toHaveCount(0);
          await expectFocusedAndUnobscured(page, heading);
          await expectMinimumPointerTarget(
            page.getByRole("button", { name: "Sign out" }),
          );
          await expectNoPageOverflow(page);
        }
      } else {
        outcome = "reconciliation-failed";
        await page.goto("/auth/mfa");
        const input = page.locator("#mfa-code");
        await pasteInto(page, input, mfaCodeFixture());
        await input.press("Enter");
        const recheck = page.getByRole("button", {
          name: "Check sign-in status",
        });
        await expect(recheck).toBeFocused();
        await expectMinimumPointerTarget(recheck);
        await expectFocusedAndUnobscured(page, recheck);
        await expectNoPageOverflow(page);
      }
      await expectNoWcagViolations(page);
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
