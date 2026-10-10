// Local pre-dispatch checks for the required password replacement. The server
// remains the final authority, including its common-password check.

export type ReplacementPasswordProblems = {
  readonly password: "too-short" | "too-long" | null;
  readonly confirmation: "mismatch" | null;
};

const minimumCodePoints = 12;
const maximumCodePoints = 128;
const maximumUtf8Bytes = 512;

export function checkReplacementPassword(
  password: string,
  confirmation: string,
): ReplacementPasswordProblems | null {
  // The string iterator yields Unicode code points; nothing is trimmed or normalized.
  const codePoints = [...password].length;
  const utf8Bytes = new TextEncoder().encode(password).length;
  const passwordProblem =
    codePoints < minimumCodePoints
      ? "too-short"
      : codePoints > maximumCodePoints || utf8Bytes > maximumUtf8Bytes
        ? "too-long"
        : null;
  const confirmationProblem = confirmation === password ? null : "mismatch";
  return passwordProblem === null && confirmationProblem === null
    ? null
    : { password: passwordProblem, confirmation: confirmationProblem };
}
