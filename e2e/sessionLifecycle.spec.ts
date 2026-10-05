import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({ trace: "off", screenshot: "off", video: "off" });

test("clock-driven warning preserves focus and expiry shields without network work", async ({
  page,
}) => {
  const host = await lifecycleServer();
  try {
    await page.clock.install({ time: new Date() });
    await page.goto(host.url);
    await expect(
      page.getByRole("heading", { name: "Home", exact: true }),
    ).toBeFocused();
    await page.clock.runFor(25 * 60_000);
    await expect(
      page.getByRole("heading", { name: "Your sign-in is nearing expiry." }),
    ).toBeVisible();
    await expect(page.locator('[aria-live="polite"]')).toHaveText(
      "Your sign-in is nearing expiry.",
    );
    await expect(page.locator('[aria-live="assertive"]')).toBeEmpty();
    await expect(
      page.getByRole("heading", { name: "Home", exact: true }),
    ).toBeFocused();
    expect({ reads: host.fixture.reads, posts: host.fixture.posts }).toEqual({
      reads: 1,
      posts: 0,
    });
    await page.clock.runFor(5 * 60_000);
    await expect(
      page.getByRole("heading", { name: "Content hidden" }),
    ).toBeFocused();
    await expect(page.locator('[aria-live="assertive"]')).toContainText(
      "sign-in deadline has been reached",
    );
    expect({ reads: host.fixture.reads, posts: host.fixture.posts }).toEqual({
      reads: 1,
      posts: 0,
    });
  } finally {
    await page.goto("about:blank");
    await host.close();
  }
});

for (const zoom of [2, 4]) {
  test(`lifecycle surfaces at actual ${zoom * 100}% browser zoom across locales and text modes`, async () => {
    test.setTimeout(120_000);
    const extension = fileURLToPath(
      new URL("./fixtures/browser-zoom-extension", import.meta.url),
    );
    const directory = await mkdtemp(join(tmpdir(), "mia-lifecycle-zoom-"));
    const context = await chromium.launchPersistentContext(directory, {
      channel: "chromium",
      headless: true,
      viewport: null,
      args: [
        "--window-size=1280,900",
        `--disable-extensions-except=${extension}`,
        `--load-extension=${extension}`,
      ],
    });
    const host = await lifecycleServer();
    host.fixture.idle = Date.now() + 4 * 60_000;
    try {
      const page = await context.newPage();
      let [worker] = context.serviceWorkers();
      worker ??= await context.waitForEvent("serviceworker");
      await page.goto(host.url);
      const actual = await worker.evaluate<number>(`(async () => {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        await chrome.tabs.setZoom(tab.id, ${zoom});
        return chrome.tabs.getZoom(tab.id);
      })()`);
      expect(actual).toBeCloseTo(zoom, 10);
      for (const locale of [
        "en-US",
        "de-DE",
        "fr-FR",
        "pt-PT",
        "pt-BR",
        "es-ES",
        "es-AR",
      ]) {
        for (const textSize of ["standard", "large", "extra-large"]) {
          await page.evaluate(
            ({ locale, textSize }) => {
              localStorage.setItem("mia.interface.locale", locale);
              localStorage.setItem("mia.interface.text-size", textSize);
            },
            { locale, textSize },
          );
          await page.reload();
          await expect(page.locator("main h2")).toBeVisible();
          const check = async () => {
            expect(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth,
              ),
            ).toBe(true);
            await expect(page.locator("h1")).toBeFocused();
            await page.keyboard.press("Tab");
            await expect(page.locator("main button").first()).toBeFocused();
            expect(
              await page
                .locator("main button")
                .first()
                .evaluate((element) => {
                  const bounds = element.getBoundingClientRect();
                  return (
                    bounds.bottom > 0 &&
                    bounds.top < window.innerHeight &&
                    bounds.left >= 0 &&
                    bounds.right <= window.innerWidth
                  );
                }),
            ).toBe(true);
          };
          await check();
          await page.evaluate(() => window.dispatchEvent(new Event("online")));
          await expect(page.locator("main h2")).toHaveCount(0);
          await check();
        }
      }
    } finally {
      await context.close();
      await host.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
}

for (const locale of [
  "en-US",
  "de-DE",
  "fr-FR",
  "pt-PT",
  "pt-BR",
  "es-ES",
  "es-AR",
]) {
  for (const textSize of ["standard", "large", "extra-large"]) {
    test(`lifecycle keyboard and 320px reflow in ${locale}, ${textSize}`, async ({
      page,
    }) => {
      const host = await lifecycleServer();
      host.fixture.idle = Date.now() + 4 * 60_000;
      host.fixture.failContinue = true;
      await page.setViewportSize({ width: 320, height: 900 });
      await page.emulateMedia({
        reducedMotion: "reduce",
        forcedColors: "active",
      });
      await page.addInitScript(
        ({ locale, textSize }) => {
          localStorage.setItem("mia.interface.locale", locale);
          localStorage.setItem("mia.interface.text-size", textSize);
        },
        { locale, textSize },
      );
      try {
        await page.goto(host.url);
        await expect(page.locator("main h2")).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("h1")).toBeFocused();
        const check = async () => {
          await page.locator("body").evaluate((body) => {
            for (const element of body.querySelectorAll<HTMLElement>("*")) {
              element.style.setProperty("line-height", "1.5", "important");
              element.style.setProperty(
                "letter-spacing",
                "0.12em",
                "important",
              );
              element.style.setProperty("word-spacing", "0.16em", "important");
              if (element instanceof HTMLParagraphElement)
                element.style.setProperty(
                  "margin-block-end",
                  "2em",
                  "important",
                );
            }
          });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
            [],
          );
          for (const button of await page.locator("main button").all()) {
            const bounds = await button.boundingBox();
            expect(
              bounds !== null && bounds.width >= 24 && bounds.height >= 24,
            ).toBe(true);
          }
        };
        await check();
        await page.keyboard.press("Tab");
        await expect(page.locator("main button").first()).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.locator("main h2")).toHaveCount(0);
        await expect(page.locator("h1")).toBeFocused();
        await check();
        expect(host.fixture.posts).toBe(1);
      } finally {
        await page.goto("about:blank");
        await host.close();
      }
    });
  }
}

// A real same-origin HTTP fixture is necessary here: request interception and
// Chromium's default automation BFCache-disabling argument cannot prove restore.
async function lifecycleServer() {
  const absolute = Date.now() + 12 * 60 * 60_000;
  const fixture = {
    reads: 0,
    capabilities: 0,
    posts: 0,
    idle: Date.now() + 30 * 60_000,
    failContinue: false,
    anonymous: false,
    previews: 0,
    continueGate: Promise.resolve(),
    recoveryGate: Promise.resolve(),
    continuedIdle: null as number | null,
  };
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
  const server = createServer((request, response) => {
    void (async () => {
      const path = request.url ?? "/";
      if (path === "/away") {
        response.setHeader("Content-Type", "text/html");
        response.end(
          "<!doctype html><title>Neutral destination</title><p>Neutral destination</p>",
        );
        return;
      }
      if (path.startsWith("/api/")) {
        response.setHeader("Content-Type", "application/vnd.api+json");
        response.setHeader("Cache-Control", "no-store");
        if (path === "/api/v1/invitation-previews") {
          fixture.previews++;
          response.end(
            JSON.stringify({
              data: {
                type: "invitation-previews",
                id: "preview",
                attributes: { platform: "mia", role: "mentor" },
              },
            }),
          );
          return;
        }
        if (path === "/api/v1/users/me/capabilities") {
          fixture.capabilities++;
          response.end(
            JSON.stringify({
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
          );
          return;
        }
        if (path === "/api/v1/auth/session") {
          fixture.reads++;
          await fixture.recoveryGate;
        } else if (path === "/api/v1/auth/session-continuations") {
          fixture.posts++;
          await fixture.continueGate;
          if (fixture.failContinue) {
            response.statusCode = 503;
            response.end(
              JSON.stringify({
                errors: [{ code: "unavailable", status: "503" }],
              }),
            );
            return;
          }
          fixture.idle = fixture.continuedIdle ?? Date.now() + 30 * 60_000;
        } else {
          response.statusCode = 404;
          response.end();
          return;
        }
        const instant = (value: number) =>
          new Date(value).toISOString().replace("Z", "000Z");
        response.setHeader(
          "Set-Cookie",
          `mia_csrf=${crypto.randomUUID()}; Path=/; SameSite=Strict`,
        );
        response.end(
          JSON.stringify(
            fixture.anonymous
              ? { data: null, meta: { stage: "anonymous" } }
              : {
                  data: {
                    type: "auth-sessions",
                    id: "account-id",
                    attributes: {
                      stage: "authenticated",
                      idle_expires_at: instant(fixture.idle),
                      absolute_expires_at: instant(absolute),
                    },
                  },
                },
          ),
        );
        return;
      }
      const upstream = await fetch(`http://127.0.0.1:4173${path}`);
      response.setHeader(
        "Content-Type",
        upstream.headers.get("Content-Type") ?? "text/html",
      );
      response.end(Buffer.from(await upstream.arrayBuffer()));
    })().catch(() => {
      response.statusCode = 500;
      response.end();
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string")
    throw new Error("Missing fixture address");
  return {
    fixture,
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

for (const surface of [
  "home",
  "login",
  "password-reset",
  "invitation",
] as const) {
  test(`actual BFCache capture and restoration shield ${surface} before the first restored frame`, async () => {
    const host = await lifecycleServer();
    host.fixture.anonymous = surface !== "home";
    const browser = await chromium.launch({
      channel: "chromium",
      ignoreDefaultArgs: ["--disable-back-forward-cache"],
    });
    const page = await browser.newPage();
    const diagnostics = await page.context().newCDPSession(page);
    const notRestored: unknown[] = [];
    await diagnostics.send("Page.enable");
    diagnostics.on("Page.backForwardCacheNotUsed", (event) => {
      notRestored.push(event.notRestoredExplanations);
    });
    try {
      if (surface === "password-reset" || surface === "invitation") {
        await page.goto(`${host.url}/away`);
        // Generate the bearer inside the browser; no secret enters a test step,
        // locator, assertion message, trace, screenshot, or retained evidence.
        await page.evaluate((path) => {
          window.location.href = `${path}#token=${crypto.randomUUID()}`;
        }, `${host.url}/${surface}`);
        if (surface === "invitation")
          await page.getByRole("link", { name: "Accept invitation" }).click();
      } else await page.goto(host.url);
      if (surface === "home")
        await expect(
          page.getByRole("heading", { name: "Home", exact: true }),
        ).toBeVisible();
      else {
        await expect(
          page.locator('input[type="password"]').first(),
        ).toBeVisible();
        const populated = await page.evaluate(() => {
          const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )?.set;
          if (!setter) return false;
          const fields = [
            ...document.querySelectorAll<HTMLInputElement>(
              'input[type="password"], input[autocomplete="username"]',
            ),
          ];
          for (const field of fields) {
            setter.call(field, crypto.randomUUID());
            field.dispatchEvent(new Event("input", { bubbles: true }));
          }
          return (
            fields.length > 0 && fields.every((field) => field.value.length > 0)
          );
        });
        expect(populated).toBe(true);
        await page
          .getByRole("button", { name: /Show.*password/ })
          .first()
          .click();
        expect(
          await page.evaluate(() =>
            [
              ...document.querySelectorAll<HTMLInputElement>(
                'input[type="text"]',
              ),
            ].some((field) => field.value.length > 0),
          ),
        ).toBe(true);
      }
      await page.evaluate(() => {
        const evidence = {
          capturedNeutral: false,
          restored: false,
          firstFrameNeutral: false,
        };
        Object.defineProperty(window, "lifecycleEvidence", { value: evidence });
        const neutral = () =>
          document.title === "MIA" &&
          document.querySelector("h1")?.textContent === "Content hidden" &&
          document.querySelectorAll("input").length === 0 &&
          location.hash === "";
        window.addEventListener("pagehide", () => {
          evidence.capturedNeutral = neutral();
        });
        window.addEventListener("pageshow", (event) => {
          evidence.restored = event.persisted;
          requestAnimationFrame(() => {
            evidence.firstFrameNeutral = neutral();
          });
        });
      });
      await page.goto(`${host.url}/away`);
      await page.goBack({ waitUntil: "commit" });
      expect(notRestored).toEqual([]);
      await expect
        .poll(() =>
          page.evaluate(() => Reflect.get(window, "lifecycleEvidence")),
        )
        .toEqual({
          capturedNeutral: true,
          restored: true,
          firstFrameNeutral: true,
        });
      expect({
        reads: host.fixture.reads,
        capabilities: host.fixture.capabilities,
        posts: host.fixture.posts,
      }).toEqual({
        reads: 1,
        capabilities: surface === "home" ? 1 : 0,
        posts: 0,
      });
      await page.getByRole("button", { name: "Refresh", exact: true }).click();
      if (surface === "home")
        await expect(
          page.getByRole("heading", { name: "Home", exact: true }),
        ).toBeVisible();
      else if (surface === "login") {
        await expect(page.locator('input[type="password"]')).toBeVisible();
        expect(
          await page.evaluate(() =>
            [
              ...document.querySelectorAll<HTMLInputElement>(
                'input[type="password"], input[autocomplete="username"]',
              ),
            ].every((field) => field.value === ""),
          ),
        ).toBe(true);
      } else {
        await expect(page.locator("input")).toHaveCount(0);
        await expect(page.locator("h1")).toContainText(
          surface === "invitation" ? "invitation" : "link",
        );
        expect(host.fixture.previews).toBe(surface === "invitation" ? 1 : 0);
      }
      expect({
        reads: host.fixture.reads,
        capabilities: host.fixture.capabilities,
      }).toEqual({ reads: 2, capabilities: surface === "home" ? 2 : 0 });
    } finally {
      await browser.close();
      await host.close();
    }
  });
}

test("keyboard continuation preserves pending focus, announces success, and restores the Home heading", async ({
  page,
}) => {
  const host = await lifecycleServer();
  const gate = Promise.withResolvers<void>();
  host.fixture.idle = Date.now() + 4 * 60_000;
  host.fixture.continueGate = gate.promise;
  try {
    await page.goto(host.url);
    const button = page.getByRole("button", {
      name: "Continue working",
      exact: true,
    });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Stop waiting" }),
    ).toBeVisible();
    await page.keyboard.press("Enter");
    gate.resolve();
    await expect(
      page.getByRole("heading", { name: "Home", exact: true }),
    ).toBeFocused();
    await expect(button).toHaveCount(0);
    await expect(page.locator('[aria-live="polite"]')).toHaveText(
      "Continue working succeeded.",
    );
    expect({ posts: host.fixture.posts, reads: host.fixture.reads }).toEqual({
      posts: 1,
      reads: 1,
    });
  } finally {
    gate.resolve();
    await page.goto("about:blank");
    await host.close();
  }
});

test("keyboard Stop waiting fences continuation and recovery without claiming cancellation", async ({
  page,
}) => {
  const host = await lifecycleServer();
  const continuation = Promise.withResolvers<void>();
  const recovery = Promise.withResolvers<void>();
  host.fixture.idle = Date.now() + 4 * 60_000;
  host.fixture.continueGate = continuation.promise;
  try {
    await page.goto(host.url);
    await page
      .getByRole("button", { name: "Continue working", exact: true })
      .click();
    await expect.poll(() => host.fixture.posts).toBe(1);
    await page.getByRole("button", { name: "Stop waiting" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('[aria-live="polite"]')).toContainText(
      "cannot confirm whether Continue working succeeded",
    );
    continuation.resolve();
    await expect(
      page.getByRole("heading", { name: "Content hidden" }),
    ).toBeFocused();
    host.fixture.recoveryGate = recovery.promise;
    const refresh = page.getByRole("button", { name: "Refresh", exact: true });
    await refresh.focus();
    await page.keyboard.press("Enter");
    await expect(refresh).toHaveAttribute("aria-disabled", "true");
    await expect(refresh).toBeFocused();
    await expect.poll(() => host.fixture.reads).toBe(2);
    await page.getByRole("button", { name: "Stop waiting" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('[aria-live="polite"]')).toContainText(
      "You stopped waiting",
    );
    recovery.resolve();
    await expect(
      page.getByRole("heading", { name: "Content hidden" }),
    ).toBeVisible();
    expect(host.fixture.posts).toBe(1);
  } finally {
    continuation.resolve();
    recovery.resolve();
    await page.goto("about:blank");
    await host.close();
  }
});

test("a proven not-sent continuation retains the warning and offers an explicit keyboard retry", async ({
  page,
}) => {
  const host = await lifecycleServer();
  host.fixture.idle = Date.now() + 4 * 60_000;
  try {
    await page.goto(host.url);
    await expect(
      page.getByRole("heading", { name: "Home", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      document.cookie = "mia_csrf=; Max-Age=0; Path=/";
    });
    await page
      .getByRole("button", { name: "Continue working", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    const retry = page.getByRole("button", {
      name: "Retry Continue working",
      exact: true,
    });
    await expect(retry).toBeFocused();
    await expect(page.locator('[aria-live="polite"]')).toContainText(
      "was not sent",
    );
    await expect(
      page.getByRole("heading", { name: "Home", exact: true }),
    ).toBeVisible();
    expect(host.fixture.posts).toBe(0);
    await page.evaluate(() => {
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    });
    await page.keyboard.press("Enter");
    await expect(page.locator('[aria-live="polite"]')).toHaveText(
      "Continue working succeeded.",
    );
    expect(host.fixture.posts).toBe(1);
  } finally {
    await page.goto("about:blank");
    await host.close();
  }
});

test("a corrected already-reached continuation deadline urgently shields rather than announcing success", async ({
  page,
}) => {
  const host = await lifecycleServer();
  host.fixture.idle = Date.now() + 4 * 60_000;
  host.fixture.continuedIdle = Date.now() - 1000;
  try {
    await page.goto(host.url);
    await page
      .getByRole("button", { name: "Continue working", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Content hidden" }),
    ).toBeFocused();
    await expect(page.locator('[aria-live="assertive"]')).toContainText(
      "sign-in deadline has been reached",
    );
    await expect(page.locator('[aria-live="polite"]')).toBeEmpty();
    expect({ posts: host.fixture.posts, reads: host.fixture.reads }).toEqual({
      posts: 1,
      reads: 1,
    });
  } finally {
    await page.goto("about:blank");
    await host.close();
  }
});

test("warning is non-modal, keyboard continuation is single-shot, and an unknown outcome shields", async ({
  page,
}) => {
  const host = await lifecycleServer();
  host.fixture.idle = Date.now() + 4 * 60_000;
  host.fixture.failContinue = true;
  try {
    await page.goto(host.url);
    const heading = page.getByRole("heading", { name: "Home", exact: true });
    await expect(heading).toBeFocused();
    await expect(
      page.getByRole("heading", { name: "Your sign-in is nearing expiry." }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue working" }).focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Content hidden" }),
    ).toBeFocused();
    await expect(heading).toHaveCount(0);
    expect({ reads: host.fixture.reads, posts: host.fixture.posts }).toEqual({
      reads: 1,
      posts: 1,
    });
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
      window.dispatchEvent(new Event("focus"));
    });
    expect({ reads: host.fixture.reads, posts: host.fixture.posts }).toEqual({
      reads: 1,
      posts: 1,
    });
  } finally {
    await page.goto("about:blank");
    await host.close();
  }
});
