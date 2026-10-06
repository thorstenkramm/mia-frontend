import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

// Exercise the advertised command, not a second copy of its compiler settings.
// One canary at a time proves that each project independently fails the gate.
for (const directory of ["src", "scripts"]) {
  const filename = `typecheck-canary-${randomUUID()}.ts`;
  const path = join(directory, filename);
  await writeFile(path, 'export const coverageCanary: number = "invalid";\n', {
    flag: "wx",
  });
  try {
    const result = spawnSync("npm", ["run", "typecheck"], {
      encoding: "utf8",
      timeout: 120_000,
    });
    if (
      result.error ||
      result.status === null ||
      result.status === 0 ||
      !result.stdout.includes(`${filename}(1,14): error TS2322`)
    ) {
      throw new Error(
        `Typecheck did not reject the ${directory} coverage canary.`,
      );
    }
    console.log(`Typecheck rejected the ${directory} coverage canary.`);
  } finally {
    await unlink(path);
  }
}
