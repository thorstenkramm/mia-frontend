import { test } from "@playwright/test";
import { writeFileSync } from "node:fs";

test("controlled", () => {
  throw new Error("ControlledRouteHygieneFailure:case:point\n");
});
test("passes", () => {});
test.skip("skipped", () => {});
test("wrong", () => {
  throw new Error("Wrong checkpoint");
});
test("intermediate-report", () => {
  let marker = process.env.MIA_SYNTHETIC_MARKER;
  if (!marker || !process.env.MIA_SYNTHETIC_FINAL)
    throw new Error("Missing synthetic fixture.");
  try {
    throw new Error(marker);
  } finally {
    marker = undefined;
    delete process.env.MIA_SYNTHETIC_MARKER;
    writeFileSync(process.env.MIA_SYNTHETIC_FINAL, "cleared");
  }
});
