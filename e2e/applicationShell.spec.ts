import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { atBrowserZoom } from "./routeFixtures";

// The shell carries no secret, but keep artifacts off like the other auth
// journeys so a failure never records page content.
test.use({ trace: "off", screenshot: "off", video: "off" });

const mediaType = "application/vnd.api+json";
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
const textSizes = ["standard", "large", "extra-large"] as const;

type Backend = { mfaReads: number; logouts: number; anonymous: boolean };

async function mockBackend(page: Page): Promise<Backend> {
  const backend: Backend = { mfaReads: 0, logouts: 0, anonymous: false };
  // Freeze both clock sources so a runner stall cannot look like sleep to the
  // lifecycle watchdog; sessionLifecycle.spec.ts covers moving clocks.
  await page.clock.setFixedTime(new Date());
  await page.addInitScript(() => {
    const now = performance.now();
    performance.now = () => now;
  });
  await page.context().addCookies([
    {
      name: "mia_csrf",
      value: crypto.randomUUID(),
      url: "http://127.0.0.1:4173/",
    },
  ]);
  const json = (body: unknown) => ({
    status: 200,
    contentType: mediaType,
    body: JSON.stringify(body),
  });
  const instant = (offset: number) =>
    new Date(Date.now() + offset).toISOString().replace("Z", "000Z");
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill(
      json(
        backend.anonymous
          ? { data: null, meta: { stage: "anonymous" } }
          : {
              data: {
                type: "auth-sessions",
                id: "account-id",
                attributes: {
                  stage: "authenticated",
                  idle_expires_at: instant(30 * 60_000),
                  absolute_expires_at: instant(12 * 60 * 60_000),
                },
              },
            },
      ),
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
              available: true,
              scope: {
                global: !action.startsWith("profile."),
                course_ids: [],
                student_ids: [],
                course_students: [],
                own_resource: action.startsWith("profile."),
              },
            })),
          },
        },
      }),
    ),
  );
  await page.route("**/api/v1/users/me/mfa", (route) => {
    backend.mfaReads++;
    return route.fulfill(
      json({
        data: {
          type: "mfa-states",
          id: "account-id",
          attributes: {
            active_factor: null,
            pending_enrollment: null,
            actions: {
              enroll: true,
              continue: false,
              cancel: false,
              disable: false,
              replace: false,
              verify: false,
              sms_resend: false,
            },
          },
        },
      }),
    );
  });
  await page.route("**/api/v1/auth/logout", (route) => {
    backend.logouts++;
    backend.anonymous = true;
    return route.fulfill({ status: 204 });
  });
  return backend;
}

function noPageScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
}

async function expectNoAxeViolations(page: Page) {
  // Default axe-core rule set, no exclusions or disabled rules.
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
}

test("desktop shell build identifier follows Sign out in the scrollable sidebar, never main", async ({
  page,
}) => {
  await mockBackend(page);
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Home", level: 1 }),
  ).toBeFocused();
  const navigation = page.getByRole("navigation", { name: "Application" });
  const build = page.locator('header [data-testid="build-identifier"]:visible');
  await expect(build).toHaveCount(1);
  await expect(build).toHaveText(/Build \d+\.\d+\.\d+\+/u);
  await expect(
    page.locator("main [data-testid='build-identifier']"),
  ).toHaveCount(0);
  const signOut = navigation.getByRole("button", { name: "Sign out" });
  expect(
    await signOut.evaluate((node) => {
      const footer = node.closest("nav")?.nextElementSibling;
      return (
        footer?.getAttribute("data-testid") === "build-identifier" &&
        Boolean(
          node.compareDocumentPosition(footer) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        )
      );
    }),
  ).toBe(true);
  await build.scrollIntoViewIfNeeded();
  expect(
    await build.evaluate((node) => {
      const scrollport = node.parentElement?.getBoundingClientRect();
      const text = node.getBoundingClientRect();
      return scrollport !== undefined && text.bottom <= scrollport.bottom;
    }),
  ).toBe(true);
  await expectNoAxeViolations(page);

  await navigation
    .getByRole("link", { name: "Multi-factor authentication" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Multi-factor authentication",
      level: 1,
    }),
  ).toBeFocused();
  await expect(build).toHaveCount(1);
  await expect(
    page.locator("main [data-testid='build-identifier']"),
  ).toHaveCount(0);
});

for (const locale of ["en-US", "pt-BR"] as const) {
  for (const size of textSizes) {
    test(`narrow shell build identifier stays in the drawer at 320px with ${locale} ${size} text`, async ({
      page,
    }) => {
      await mockBackend(page);
      await page.setViewportSize({ width: 320, height: 480 });
      await page.addInitScript(
        ({ locale, size }) => {
          localStorage.setItem("mia.interface.locale", locale);
          localStorage.setItem("mia.interface.text-size", size);
        },
        { locale, size },
      );
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
      await expect(
        page.locator("main [data-testid='build-identifier']"),
      ).toHaveCount(0);
      await expect(
        page.locator('[data-testid="build-identifier"]:visible'),
      ).toHaveCount(0);
      expect(await noPageScroll(page)).toBe(true);
      await page
        .getByRole("button", {
          name: locale === "en-US" ? "Open navigation" : /navegaç/u,
        })
        .click();
      const drawer = page.getByRole("dialog");
      const build = drawer.getByTestId("build-identifier");
      await expect(build).toBeVisible();
      await expect(
        page.locator('[data-testid="build-identifier"]:visible'),
      ).toHaveCount(1);
      await build.scrollIntoViewIfNeeded();
      expect(
        await build.evaluate((node) => {
          const scrollport = node.parentElement?.getBoundingClientRect();
          const text = node.getBoundingClientRect();
          return (
            scrollport !== undefined &&
            text.top >= scrollport.top &&
            text.bottom <= scrollport.bottom &&
            text.right <= scrollport.right
          );
        }),
      ).toBe(true);
      expect(await noPageScroll(page)).toBe(true);
      await expectNoAxeViolations(page);
      await page.keyboard.press("Escape");
      await expect(drawer).toHaveCount(0);
      await expect(
        page.locator('[data-testid="build-identifier"]:visible'),
      ).toHaveCount(0);
    });
  }
}

for (const factor of [2, 4] as const) {
  test(`shell build identifier stays readable at ${factor * 100}% browser zoom`, async () => {
    await atBrowserZoom(factor, async (page) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Home" })).toBeFocused();
      await expect(
        page.locator("main [data-testid='build-identifier']"),
      ).toHaveCount(0);
      await page.getByRole("button", { name: "Open navigation" }).click();
      const build = page.getByRole("dialog").getByTestId("build-identifier");
      await build.scrollIntoViewIfNeeded();
      await expect(build).toBeVisible();
      expect(await noPageScroll(page)).toBe(true);
    });
  });
}

test("desktop shell keyboard order reaches each destination and Sign out", async ({
  page,
}) => {
  const backend = await mockBackend(page);
  await page.goto("/");
  const home = page.getByRole("heading", { level: 1, name: "Home" });
  await expect(home).toBeFocused();
  const navigation = page.getByRole("navigation", { name: "Application" });
  await expect(navigation.getByRole("link", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // This all-capabilities fixture includes the landed 6.1 tutoring start and
  // resume destinations, the 5.2 joined-scope Learn destination, the 4.1
  // course-records and supervision destinations, and 3.1 invitation
  // management.
  await expect(navigation.getByRole("link")).toHaveText([
    "Home",
    "Joined courses",
    "Start a tutoring session",
    "Resume tutoring",
    "Courses",
    "Invitations",
    "Prepare courses",
    "Multi-factor authentication",
  ]);
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeHidden();
  await expectNoAxeViolations(page);

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(navigation.getByRole("link", { name: "Home" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    navigation.getByRole("link", { name: "Joined courses", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    navigation.getByRole("link", { name: "Start a tutoring session" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    navigation.getByRole("link", { name: "Resume tutoring" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    navigation.getByRole("link", { name: "Courses", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    navigation.getByRole("link", { name: "Invitations" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    navigation.getByRole("link", { name: "Prepare courses", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  const mfa = navigation.getByRole("link", {
    name: "Multi-factor authentication",
  });
  await expect(mfa).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    navigation.getByRole("button", { name: "Sign out" }),
  ).toBeFocused();
  expect(backend.mfaReads).toBe(0);

  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Multi-factor authentication",
    }),
  ).toBeFocused();
  await expect(page).toHaveTitle("Multi-factor authentication | MIA");
  await expect(
    page
      .getByRole("navigation", { name: "Application" })
      .getByRole("link", { name: "Multi-factor authentication" }),
  ).toHaveAttribute("aria-current", "page");
  expect(backend.mfaReads).toBe(1);
});

for (const surface of ["shell", "sign-in"] as const) {
  for (const width of [1280, 320]) {
    test(`the ${surface} bypass link is visible and unobscured on focus at ${width}px`, async ({
      page,
    }) => {
      const backend = await mockBackend(page);
      backend.anonymous = surface === "sign-in";
      await page.setViewportSize({ width, height: 800 });
      await page.goto(surface === "shell" ? "/" : "/login");
      // Wait for the settled route heading, not the transient checking one.
      await expect(
        page.getByRole("heading", {
          level: 1,
          name: surface === "shell" ? "Home" : "Sign in to MIA",
        }),
      ).toBeFocused();
      await page.keyboard.press("Tab");
      const bypass = page.getByRole("link", { name: "Skip to main content" });
      await expect(bypass).toBeFocused();
      const exposure = await bypass.evaluate((link) => {
        const box = link.getBoundingClientRect();
        const hit = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        return {
          width: box.width,
          height: box.height,
          onTop: hit !== null && link.contains(hit),
        };
      });
      expect(exposure.width).toBeGreaterThanOrEqual(24);
      expect(exposure.height).toBeGreaterThanOrEqual(24);
      expect(exposure.onTop).toBe(true);
      await page.keyboard.press("Enter");
      await expect(page.locator("main")).toBeFocused();
    });
  }
}

for (const textSize of textSizes) {
  test(`320px shell reflows and its drawer is keyboard operable in ${textSize} text`, async ({
    page,
  }) => {
    const backend = await mockBackend(page);
    await page.setViewportSize({ width: 320, height: 900 });
    await page.addInitScript((size) => {
      localStorage.setItem("mia.interface.text-size", size);
    }, textSize);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "Home" }),
    ).toBeFocused();
    expect(await noPageScroll(page)).toBe(true);
    await expectNoAxeViolations(page);

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const open = page.getByRole("button", { name: "Open navigation" });
    await expect(open).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Sign out" })).toBeFocused();

    await open.focus();
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("dialog", { name: "Application" });
    // The dialog root has no box of its own; its fixed panel holds the nav.
    const drawerNavigation = drawer.getByRole("navigation", {
      name: "Application",
    });
    await expect(drawerNavigation).toBeVisible();
    expect(await noPageScroll(page)).toBe(true);
    await expectNoAxeViolations(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(open).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(drawerNavigation).toBeVisible();
    const mfa = drawer.getByRole("link", {
      name: "Multi-factor authentication",
    });
    await mfa.focus();
    await page.keyboard.press("Enter");
    const heading = page.getByRole("heading", {
      level: 1,
      name: "Multi-factor authentication",
    });
    await expect(heading).toBeFocused();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Focus stays on the route heading after the drawer's own close handling.
    await page.waitForTimeout(400);
    await expect(heading).toBeFocused();
    expect(await noPageScroll(page)).toBe(true);
    expect(backend.mfaReads).toBe(1);
  });
}

test("320px top-bar Sign out reaches the confirmed signed-out surface", async ({
  page,
}) => {
  const backend = await mockBackend(page);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Home" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByText(/Signed out at the last check/u, { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  expect(backend.logouts).toBe(1);
});
