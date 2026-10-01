import { expect } from "vitest";

// Compare or search for a secret without handing it to the matcher, so a
// failure prints only the label and a boolean (testing.md secret hygiene).
export function expectSameSecret(
  actual: string | null | undefined,
  expected: string,
  label: string,
): void {
  expect(actual === expected, `${label} carries the exact secret`).toBe(true);
}

export function expectSecretAbsent(
  haystack: string,
  secret: string,
  label: string,
): void {
  expect(haystack.includes(secret), `${label} contains the secret`).toBe(false);
}

export function expectFragmentRemoved(fragment: string, label: string): void {
  expect(fragment === "", `${label} was removed`).toBe(true);
}
