import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { materialBackend } from "./materialFixtures";
import { protectedJourney } from "./routeFixtures";

test.use({ screenshot: "off", trace: "off", video: "off" });
test(
  "locked Markdown browser boundary is semantic isolated non-fetching and inert for attack content",
  protectedJourney(async (page) => {
    const control = await materialBackend(page, { lifecycle: true });
    control.makeReady();
    let external = 0;
    page.on("request", (request) => {
      if (new URL(request.url()).origin !== "http://127.0.0.1:4173") external++;
    });
    if (control.brief)
      control.brief.summary =
        '# Heading\n\n### Deeper\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n$x^2 + \\frac{1}{2}$\n\n[Reference](https://EXAMPLE.test/path)\n\nhttps://example.test/inert\n\n![image](https://example.test/image)\n\n<svg onload="alert(1)"><script>alert(1)</script></svg>\n\n<math><mi>x</mi></math>\n\n<form id="location"><input name="cookie"></form>\n\n[bad](https://user:secret@example.test/path)\n\n```python\nprint(1)\n```';
    await page.goto("/prepare/courses/course_1/materials/material_1/approval");
    const preview = page.getByRole("region", {
      name: "Saved brief",
      exact: true,
    });
    await expect
      .poll(() =>
        preview
          .locator("math")
          .count()
          .then((count) => count === 1),
      )
      .toBe(true);
    expect(
      (await preview.evaluate(
        (node) =>
          node.querySelector(
            "img,svg,form,input,script,style,iframe,[name],[id],[onclick],[onerror],math [class],math [style]",
          ) === null,
      )) &&
        (await preview.locator("a").count()) === 1 &&
        (await preview.locator("h4").count()) === 1 &&
        (await preview.locator("h5").count()) === 1 &&
        (await preview.locator('th[scope="col"]').count()) === 2 &&
        external === 0,
    ).toBe(true);
    const link = preview.locator("a");
    expect(
      (await link.getAttribute("href")) === "https://example.test/path" &&
        (await link.getAttribute("rel")) === "noopener noreferrer" &&
        (await link.getAttribute("referrerpolicy")) === "no-referrer" &&
        (await link.textContent())?.includes("Opens in a new tab"),
    ).toBe(true);
    await page.route("https://example.test/path", async (route) => {
      expect(route.request().headers()["referer"] === undefined).toBe(true);
      await route.fulfill({
        contentType: "text/html",
        body: "<title>Isolated</title>",
      });
    });
    const popup = page.waitForEvent("popup");
    await link.click();
    const opened = await popup;
    await opened.waitForLoadState();
    expect(await opened.evaluate(() => window.opener === null)).toBe(true);
    await opened.close();
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.length === 0,
    ).toBe(true);
  }),
);
