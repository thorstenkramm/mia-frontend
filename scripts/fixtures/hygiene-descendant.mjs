import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const [directory, mode] = process.argv.slice(2);
if (mode === "term-resistant") {
  process.on("SIGTERM", () => undefined);
  process.on("SIGINT", () => undefined);
}
await writeFile(join(directory, "descendant.pid"), String(process.pid));
setInterval(() => undefined, 1000);
