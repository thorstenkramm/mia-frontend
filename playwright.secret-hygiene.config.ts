import { defineConfig } from "@playwright/test";

const outputDir = process.env.MIA_SECRET_HYGIENE_OUTPUT;
if (outputDir === undefined) {
  throw new Error("Secret-hygiene output directory is required.");
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "secret-hygiene.failure.ts",
  outputDir,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
  },
});
