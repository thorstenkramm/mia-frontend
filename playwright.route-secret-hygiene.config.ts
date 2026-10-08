import { defineConfig } from "@playwright/test";
import { routeHygieneCases } from "./scripts/route-secret-hygiene-cases";

// Execute the actual route tests, not parallel fixed canaries. A separate
// config keeps deliberately expected failures outside the normal suite.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";
const outputDir = process.env.MIA_ROUTE_HYGIENE_OUTPUT;
const selected = routeHygieneCases.find(
  (item) => item.id === process.env.MIA_ROUTE_HYGIENE_CASE,
);
if (!outputDir || !selected)
  throw new Error("Route-hygiene case and output directory are required.");
const escaped = selected.title.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
export default defineConfig({
  testDir: "./e2e",
  testMatch: [
    "scaffold.spec.ts",
    "routeNavigation.spec.ts",
    "routeRecovery.spec.ts",
    "invitationAdministration.spec.ts",
    "courseAdministration.spec.ts",
  ],
  grep: new RegExp(`${escaped}$`, "u"),
  retries: 0,
  workers: 1,
  outputDir,
  reporter: [["line"], ["json", { outputFile: `${outputDir}/report.json` }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "off",
    video: "off",
    screenshot: "off",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
