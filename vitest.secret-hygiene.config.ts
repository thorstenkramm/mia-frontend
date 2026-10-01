import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Only for scripts/check-secret-hygiene.mjs: controlled token-bearing failures.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["test/secret-hygiene.failure.ts"],
    globals: true,
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
});
