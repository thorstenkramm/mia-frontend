import { describe, expect, it } from "vitest";
import {
  provisioningUriFixture,
  totpSecretFixture,
} from "../../../test/mfaFixtures";
import { expectSameSecret } from "../../../test/secretAssertions";
import { parseTotpProvisioningUri } from "./totpProvisioning";

describe("TOTP provisioning URI grammar", () => {
  it.each([
    ["a hostname", "mia.example.test", ""],
    ["a loopback port", "localhost:9900", ""],
    ["a bracketed IPv6 loopback", "[::1]:9900", ""],
    [
      "the fixed optional policy",
      "mia.example.test",
      "&algorithm=SHA1&digits=6&period=30",
    ],
    ["one optional policy field", "mia.example.test", "&period=30"],
  ])("accepts the emitted form with %s", (_label, host, suffix) => {
    const secret = totpSecretFixture();
    const uri = provisioningUriFixture(secret, host, "example.learner", suffix);
    const parsed = parseTotpProvisioningUri(uri);
    expect(parsed).not.toBeNull();
    expectSameSecret(parsed?.secret, secret, "Parsed secret");
    expectSameSecret(parsed?.uri, uri, "Validated URI");
    expect(parsed?.issuer).toBe("MIA");
    expect(parsed?.account).toBe(`MIA (${host}):example.learner`);
    expect([parsed?.algorithm, parsed?.digits, parsed?.period]).toEqual([
      "SHA1",
      6,
      30,
    ]);
  });

  const rejected: ReadonlyArray<readonly [string, (secret: string) => string]> =
    [
      [
        "another scheme",
        (s) => provisioningUriFixture(s).replace("otpauth:", "https:"),
      ],
      [
        "the hotp type",
        (s) => provisioningUriFixture(s).replace("//totp/", "//hotp/"),
      ],
      ["a lowercase secret", (s) => provisioningUriFixture(s.toLowerCase())],
      ["a padded secret", (s) => provisioningUriFixture(`${s.slice(0, 31)}=`)],
      ["a short secret", (s) => provisioningUriFixture(s.slice(0, 31))],
      ["a long secret", (s) => provisioningUriFixture(`${s}A`)],
      [
        "another issuer",
        (s) => provisioningUriFixture(s).replace("issuer=MIA", "issuer=Other"),
      ],
      [
        "a reordered query",
        (s) =>
          `otpauth://totp/MIA%20(mia.example.test):example.learner?issuer=MIA&secret=${s}`,
      ],
      [
        "a duplicate parameter",
        (s) => provisioningUriFixture(s, undefined, undefined, `&secret=${s}`),
      ],
      [
        "an unknown parameter",
        (s) => provisioningUriFixture(s, undefined, undefined, "&image=x"),
      ],
      [
        "another algorithm",
        (s) =>
          provisioningUriFixture(s, undefined, undefined, "&algorithm=SHA256"),
      ],
      [
        "other digits",
        (s) => provisioningUriFixture(s, undefined, undefined, "&digits=8"),
      ],
      [
        "another period",
        (s) => provisioningUriFixture(s, undefined, undefined, "&period=60"),
      ],
      [
        "reordered policy fields",
        (s) =>
          provisioningUriFixture(
            s,
            undefined,
            undefined,
            "&period=30&digits=6",
          ),
      ],
      ["a fragment", (s) => `${provisioningUriFixture(s)}#x`],
      [
        "user information",
        (s) => provisioningUriFixture(s).replace("//totp/", "//user@totp/"),
      ],
      [
        "an extra path segment",
        (s) => provisioningUriFixture(s).replace("?secret", "/extra?secret"),
      ],
      [
        "a label without the issuer prefix",
        (s) => `otpauth://totp/example.learner?secret=${s}&issuer=MIA`,
      ],
      [
        "a raw space in the label",
        (s) => provisioningUriFixture(s).replace("%20", " "),
      ],
      [
        "an invalid username",
        (s) => provisioningUriFixture(s, undefined, "-learner"),
      ],
      [
        "an encoded username",
        (s) => provisioningUriFixture(s, undefined, "example%2Elearner"),
      ],
      [
        "an out-of-range port",
        (s) => provisioningUriFixture(s, "localhost:99999"),
      ],
      [
        "an oversized URI",
        (s) =>
          provisioningUriFixture(
            s,
            `${"a".repeat(240)}.${"b".repeat(240)}.${"c".repeat(240)}.${"d".repeat(240)}`,
          ),
      ],
    ];
  it.each(rejected)("rejects %s", (_label, build) => {
    expect(parseTotpProvisioningUri(build(totpSecretFixture()))).toBeNull();
  });
});
