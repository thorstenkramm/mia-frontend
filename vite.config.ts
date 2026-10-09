import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createBuildIdentifier } from "./scripts/build-identifier.ts";
import { compactMessageCatalogs } from "./scripts/message-catalogs.ts";

const packageFile = fileURLToPath(new URL("./package.json", import.meta.url));
const packageVersion = JSON.parse(readFileSync(packageFile, "utf8")).version;
const buildIdentifier = createBuildIdentifier(
  packageVersion,
  process.env.BUILD_REVISION,
);

export default defineConfig({
  plugins: [react(), tailwindcss(), compactMessageCatalogs()],
  define: {
    __MIA_BUILD_ID__: JSON.stringify(buildIdentifier),
  },
  build: {
    manifest: true,
  },
});
