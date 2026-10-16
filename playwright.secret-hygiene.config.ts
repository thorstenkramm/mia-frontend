import { defineConfig } from "@playwright/test";
import { hygieneOrigin } from "./scripts/secret-hygiene-evidence";

// A failed test otherwise writes an aria snapshot of the page to
// error-context.md, which would carry any secret the page still shows.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

const outputDir = process.env.MIA_SECRET_HYGIENE_OUTPUT;
if (outputDir === undefined) {
  throw new Error("Secret-hygiene output directory is required.");
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "secret-hygiene.failure.ts",
  outputDir,
  reporter: [["line"], ["json", { outputFile: `${outputDir}/report.json` }]],
  use: {
    baseURL: hygieneOrigin,
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  ...(process.env.MIA_HYGIENE_PREVIEW_4174 === "1"
    ? {}
    : {
        webServer: {
          command: `npm run preview -- --host 127.0.0.1 --port ${new URL(hygieneOrigin).port} --strictPort`,
          url: hygieneOrigin,
          reuseExistingServer: false,
        },
      }),
});
