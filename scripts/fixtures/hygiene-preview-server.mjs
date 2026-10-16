import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const args = process.argv.slice(2);
const port = Number(args[args.indexOf("--port") + 1]);
if (![4173, 4174].includes(port)) process.exit(2);
const readinessDirectory = process.env.MIA_SYNTHETIC_READINESS_DIRECTORY;
if (readinessDirectory)
  process.on("SIGTERM", () => {
    writeFileSync(join(readinessDirectory, `preview-${port}.term`), "1");
  });
createServer(async (request, response) => {
  const asset = JSON.parse(await readFile("dist/.vite/manifest.json", "utf8"))[
    "index.html"
  ].file;
  const isAsset = request.url === `/${asset}`;
  if (readinessDirectory && isAsset && port === 4173) {
    await writeFile(join(readinessDirectory, "asset-requested"), "1");
    await new Promise((resolve) => setTimeout(resolve, 200));
    await writeFile(join(readinessDirectory, "asset-served"), "1");
  }
  const body =
    process.env.MIA_SYNTHETIC_BAD_BUILD === (isAsset ? "asset" : "index")
      ? "<html>unrelated</html>"
      : await readFile(join("dist", isAsset ? asset : "index.html"));
  response.writeHead(200, {
    "Content-Type": isAsset ? "text/javascript" : "text/html",
  });
  response.end(body);
}).listen(port, "127.0.0.1", async () => {
  if (readinessDirectory)
    await writeFile(
      join(readinessDirectory, `preview-${port}.pid`),
      String(process.pid),
    );
  console.log(`Local: http://127.0.0.1:${port}/`);
});
