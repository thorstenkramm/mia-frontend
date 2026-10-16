import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { routeHygieneCases } from "./route-secret-hygiene-cases.ts";
import { courseUnitCases } from "./secret-hygiene-evidence.ts";

const directory = process.argv[2];
if (!directory)
  throw new Error("Content-free hygiene evidence directory required.");
const route = JSON.parse(await readFile(`${directory}/route.json`, "utf8"));
const unit = JSON.parse(
  await readFile(`${directory}/course-unit.json`, "utf8"),
);
function digest(identities) {
  return createHash("sha256")
    .update(JSON.stringify([...identities].sort()))
    .digest("hex");
}
function compare(expected, records, toId, label) {
  if (!Array.isArray(records)) throw new Error(`${label} evidence missing.`);
  const actual = records.filter((record) => !record.earlyCanary);
  if (
    records.length !== expected.length + 1 ||
    records.filter(
      (record) =>
        record.earlyCanary && record.status === "early-failure-rejected",
    ).length !== 1 ||
    actual.some((record) => record.status !== "pass") ||
    digest(actual.map(toId)) !== digest(expected)
  )
    throw new Error(`${label} evidence-set mismatch.`);
  console.log(
    `${label} evidence set: ${expected.length} independent failures; sha256=${digest(expected)}; one canary.`,
  );
}
compare(
  routeHygieneCases.flatMap((item) =>
    item.checkpoints.map((point) => `${item.id}:${point}`),
  ),
  route.evidence,
  (record) => `${record.case}:${record.checkpoint}`,
  "Route",
);
compare(
  courseUnitCases.flatMap((item) =>
    item.points.map((point) => `${item.file}:${item.title}:${point}`),
  ),
  unit.evidence,
  (record) => `${record.file}:${record.case}:${record.checkpoint}`,
  "Course-unit",
);
