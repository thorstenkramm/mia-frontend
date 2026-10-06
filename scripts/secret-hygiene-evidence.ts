import { writeFileSync } from "node:fs";
import { join } from "node:path";

// Dedicated preview port keeps this controlled-failure suite isolated.
export const hygieneOrigin = "http://127.0.0.1:4174";

// IDs and checkpoint records are content-free, never fixture-derived.
export const browserCases = [
  "browser-sign-in",
  "browser-retained-secret",
  "browser-reset-token",
  "browser-invitation-token",
  "browser-totp-enrollment",
] as const;
export const unitCases = [
  "unit-reset-comparison",
  "unit-secret-absence",
  "unit-fragment-removal",
  "unit-invitation-token",
  "unit-invitation-password",
  "unit-totp-secret",
  "unit-structural",
] as const;

type CaseId = (typeof browserCases)[number] | (typeof unitCases)[number];

export function injectEarlyFailure(id: string): void {
  if (process.env.MIA_SECRET_HYGIENE_EARLY_FAILURE === id)
    throw new Error("Injected failure before the secret-bearing checkpoint.");
}

export function controlledFailure(id: CaseId, assertion: () => void): never {
  const directory = process.env.MIA_SECRET_HYGIENE_EVIDENCE;
  if (!directory) throw new Error("Hygiene evidence directory is required.");
  writeFileSync(join(directory, `${id}.checkpoint`), id, { flag: "wx" });
  try {
    assertion();
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    // Keep the original assertion (including its report formatting) under test.
    error.message = `ControlledHygieneFailure:${id}\n${error.message}`;
    throw error;
  }
  throw new Error("The deliberate hygiene assertion unexpectedly passed.");
}
