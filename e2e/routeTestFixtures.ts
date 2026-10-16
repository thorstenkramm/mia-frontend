import { randomBytes, randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import {
  provisioningUriFixture,
  recoveryCodesFixture,
  totpSecretFixture,
} from "../test/mfaFixtures";

type Fixture = {
  readonly csrf: string;
  readonly invitationToken: string;
  readonly password: string;
  readonly mfaCode: string;
  readonly totpSecret: string;
  readonly codes: readonly string[];
  readonly rawError: string;
  // A synthetic invitee address: protected personal data, never a test name.
  readonly email: string;
  readonly courseName: string;
  readonly supervisorUsername: string;
  readonly teachingText: string;
};
const fixtures = new WeakMap<Page, Fixture>();

export function routeSecretFixture(page: Page): Fixture {
  const held = fixtures.get(page);
  if (held) return held;
  const fixture: Fixture = {
    csrf: randomUUID(),
    invitationToken: randomUUID(),
    password: `fixture-${randomBytes(24).toString("hex")}`,
    mfaCode: String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0"),
    totpSecret: totpSecretFixture(),
    codes: recoveryCodesFixture(),
    rawError: `fixture-body-${randomBytes(24).toString("hex")}`,
    email: `invitee-${randomBytes(12).toString("hex")}@example.test`,
    courseName: `درس course-${randomUUID()}`,
    supervisorUsername: `supervisor.${randomUUID().slice(0, 12)}`,
    teachingText: `تعليم teaching-${randomUUID()}`,
  };
  fixtures.set(page, fixture);
  return fixture;
}

export function routeProvisioningFixture(page: Page): string {
  return provisioningUriFixture(
    routeSecretFixture(page).totpSecret,
    "127.0.0.1:4173",
  );
}

export function routeFailureFixture(page: Page): Response {
  return new Response(
    JSON.stringify({
      errors: [
        {
          status: "503",
          code: "unavailable",
          detail: routeSecretFixture(page).rawError,
        },
      ],
    }),
    { status: 503, headers: { "Content-Type": "application/vnd.api+json" } },
  );
}

export function releaseRouteFixture(page: Page): void {
  fixtures.delete(page);
}
