import { expect, test } from "@playwright/test";

test("renders the public scaffold and build identifier", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("MIA scaffold | MIA");
  await expect(
    page.getByRole("heading", { level: 1, name: "MIA scaffold" }),
  ).toBeVisible();
  await expect(page.getByTestId("build-identifier")).toHaveText(
    /Build \d+\.\d+\.\d+\+/,
  );
});

test("moves focus to main content from the skip link", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});
