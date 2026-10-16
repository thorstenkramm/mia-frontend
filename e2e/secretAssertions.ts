import { expect } from "@playwright/test";

// Compare a retained secret without handing either value to the matcher, so a
// failure prints only the label and a boolean; the entered value is not needed in the message.
export function expectRetainedSecret(
  actual: string,
  expected: string,
  label: string,
): void {
  expect(actual === expected, `${label} retains the exact entered value`).toBe(
    true,
  );
}
