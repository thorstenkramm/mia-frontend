import { describe, expect, it } from "vitest";
import { checkReplacementPassword } from "./passwordRules";

describe("replacement password rules", () => {
  it.each([
    ["11 code points", "a".repeat(11), "too-short"],
    ["12 code points", "a".repeat(12), null],
    ["128 code points", "a".repeat(128), null],
    ["129 code points", "a".repeat(129), "too-long"],
    // Twelve astral emoji are 24 UTF-16 units but only twelve code points.
    ["12 astral code points", "😀".repeat(12), null],
    ["11 astral code points", "😀".repeat(11), "too-short"],
    ["128 four-byte code points (512 bytes)", "😀".repeat(128), null],
    ["129 four-byte code points", "😀".repeat(129), "too-long"],
    ["empty", "", "too-short"],
  ] as const)("checks %s", (_label, password, expected) => {
    expect(checkReplacementPassword(password, password)).toEqual(
      expected === null ? null : { password: expected, confirmation: null },
    );
  });

  it("counts surrounding spaces and never trims", () => {
    expect(
      checkReplacementPassword(`  ${"a".repeat(10)}`, `  ${"a".repeat(10)}`),
    ).toBeNull();
    expect(
      checkReplacementPassword(` ${"a".repeat(12)}`, `${"a".repeat(12)}`),
    ).toEqual({ password: null, confirmation: "mismatch" });
  });

  it("requires an exact, unnormalized confirmation", () => {
    const composed = `${"a".repeat(11)}\u00e9`;
    const decomposed = `${"a".repeat(11)}e\u0301`;
    expect(checkReplacementPassword(composed, decomposed)).toEqual({
      password: null,
      confirmation: "mismatch",
    });
  });

  it("reports both failed rules together", () => {
    expect(checkReplacementPassword("short", "other")).toEqual({
      password: "too-short",
      confirmation: "mismatch",
    });
  });
});
