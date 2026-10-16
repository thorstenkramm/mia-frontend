import { defineConfig } from "@playwright/test";
import { routeHygieneCases } from "./scripts/route-secret-hygiene-cases";

// Execute the actual route tests, not parallel fixed canaries. A separate
// config keeps deliberately expected failures outside the normal suite.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";
const outputDir = process.env.MIA_ROUTE_HYGIENE_OUTPUT;
const batch = process.env.MIA_ROUTE_HYGIENE_BATCH;
const selected = routeHygieneCases.find(
  (item) => item.id === process.env.MIA_ROUTE_HYGIENE_CASE,
);
if (!outputDir || (!selected && !batch))
  throw new Error("Route-hygiene case and output directory are required.");
const ids = batch
  ? Object.keys(JSON.parse(batch) as Record<string, unknown>)
  : [selected?.id];
const chosen = ids.map((id) =>
  routeHygieneCases.find((item) => item.id === id),
);
if (chosen.some((item) => !item))
  throw new Error("Unknown route-hygiene batch case.");
const escaped = chosen.map((item) =>
  item?.title.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"),
);
export default defineConfig({
  testDir: "./e2e",
  testMatch: [
    "scaffold.spec.ts",
    "learnCourses.spec.ts",
    "routeNavigation.spec.ts",
    "routeRecovery.spec.ts",
    "invitationAdministration.spec.ts",
    "courseAdministration.spec.ts",
    "coursePreparation.spec.ts",
    "courseActivation.spec.ts",
    "materialPreparation.spec.ts",
    "studentProvisioning.spec.ts",
    "tutoringSessions.spec.ts",
    "completeTutoringJourney.spec.ts",
  ],
  grep: new RegExp(`(?:${escaped.join("|")})$`, "u"),
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
  ...(process.env.MIA_HYGIENE_PREVIEW_4173 === "1"
    ? {}
    : {
        webServer: {
          command:
            "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
          url: "http://127.0.0.1:4173",
          reuseExistingServer: false,
        },
      }),
});
