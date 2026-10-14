import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { installTestOriginLocks } from "./originLocks";
import { server } from "./server";
import { catalogStore } from "../src/platform/i18n/catalogLoader";
import { locales } from "../src/platform/i18n/locales";

// Test-only fixture priming: production never requests the other six locales.
beforeAll(async () => {
  await Promise.all(locales.map((locale) => catalogStore.load(locale)));
});
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
let restoreOriginLocks: (() => void) | undefined;
beforeEach(() => {
  // Auth fixtures begin here; deadlines must not decay with the developer's clock.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-27T10:00:00.000Z"));
  restoreOriginLocks = installTestOriginLocks();
});
afterEach(() => {
  vi.useRealTimers();
  restoreOriginLocks?.();
  restoreOriginLocks = undefined;
  server.resetHandlers();
});
afterAll(() => server.close());
