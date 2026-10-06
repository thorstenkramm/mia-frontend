// One validated TOTP provisioning value. The URI and secret are credentials:
// they never leave the route-local enrollment owner (see mfaEnrollment.ts).
export type TotpProvisioning = {
  readonly uri: string;
  readonly issuer: "MIA";
  // The decoded label exactly as the authenticator receives it.
  readonly account: string;
  readonly secret: string;
  readonly algorithm: "SHA1";
  readonly digits: 6;
  readonly period: 30;
};

const maximumUriBytes = 1024;

// The grammar the backend emits (owner decision 2026-10-05):
// `otpauth://totp/MIA%20(<host[:port]>):<username>?secret=<32 base32>&issuer=MIA`,
// optionally followed by the fixed `algorithm`, `digits`, and `period` policy.
// The label's host and username are validated, never reconstructed.
const provisioningPattern =
  /^otpauth:\/\/totp\/MIA%20\(((?:[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?|\[[0-9A-Fa-f:.]{2,45}\])(?::[0-9]{1,5})?)\):([A-Za-z0-9][A-Za-z0-9._-]{1,30}[A-Za-z0-9])\?secret=([A-Z2-7]{32})&issuer=MIA(?:&algorithm=SHA1)?(?:&digits=6)?(?:&period=30)?$/u;

export function parseTotpProvisioningUri(uri: string): TotpProvisioning | null {
  if (new TextEncoder().encode(uri).byteLength > maximumUriBytes) return null;
  const match = provisioningPattern.exec(uri);
  if (match === null) return null;
  const [, host, username, secret] = match;
  if (host === undefined || username === undefined || secret === undefined)
    return null;
  const port = /:([0-9]+)$/u.exec(host)?.[1];
  if (port !== undefined && Number(port) > 65_535) return null;
  return {
    uri,
    issuer: "MIA",
    account: `MIA (${host}):${username}`,
    secret,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  };
}
