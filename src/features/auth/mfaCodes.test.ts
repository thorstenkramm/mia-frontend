import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isSixDigitMfaCode, normalizeRecoveryCode } from "./mfaCodes";

const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function recoveryFixture(): string {
  return Array.from(
    randomBytes(16),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

describe("MFA code input normalization", () => {
  it("accepts exactly six digits while preserving leading zeroes", () => {
    const value = `0${String(randomBytes(3).readUIntBE(0, 3) % 100000).padStart(5, "0")}`;
    expect(isSixDigitMfaCode(value)).toBe(true);
    expect(isSixDigitMfaCode(`${value}0`)).toBe(false);
    expect(isSixDigitMfaCode(value.slice(1))).toBe(false);
  });

  it("normalizes recovery display separators and ASCII case only", () => {
    const wire = recoveryFixture();
    const displayed = wire.toLowerCase().replace(/(.{4})(?=.)/gu, "$1- ");
    const normalized = normalizeRecoveryCode(displayed);
    expect(normalized === null ? null : fingerprint(normalized)).toBe(
      fingerprint(wire),
    );
  });

  it.each(["I", "L", "O", "U", "é", "_"])(
    "rejects unsupported recovery input class %# without alias mapping",
    (invalid) => {
      const wire = recoveryFixture();
      expect(normalizeRecoveryCode(`${invalid}${wire.slice(1)}`)).toBeNull();
    },
  );
});
