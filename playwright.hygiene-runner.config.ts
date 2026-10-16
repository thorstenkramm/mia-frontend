import { defineConfig } from "@playwright/test";

// Reporter-only harness: no browser fixture, application, or preview server.
export default defineConfig({
  testDir: "./scripts/fixtures",
  testMatch: "hygiene-reporter.spec.ts",
  workers: 1,
  retries: 0,
  reporter: "json",
});
