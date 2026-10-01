const recoveryWirePattern = /^[0-9A-HJKMNP-TV-Z]{16}$/u;

export function isSixDigitMfaCode(value: string): boolean {
  return /^[0-9]{6}$/u.test(value);
}

export function normalizeRecoveryCode(value: string): string | null {
  const normalized = value
    .replace(/[-\s]/gu, "")
    .replace(/[a-z]/gu, (letter) => letter.toUpperCase());
  return recoveryWirePattern.test(normalized) ? normalized : null;
}
