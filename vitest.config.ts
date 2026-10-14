import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { localeRecoveryCopy } from "./scripts/message-catalogs.ts";

export default defineConfig({
  plugins: [react(), localeRecoveryCopy()],
  define: {
    __MIA_BUILD_ID__: JSON.stringify("0.1.0+test"),
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    globals: true,
    setupFiles: [fileURLToPath(new URL("./test/setup.ts", import.meta.url))],
  },
});
