import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { installTestOriginLocks } from "./originLocks";
import { server } from "./server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
let restoreOriginLocks: (() => void) | undefined;
beforeEach(() => {
  restoreOriginLocks = installTestOriginLocks();
});
afterEach(() => {
  restoreOriginLocks?.();
  restoreOriginLocks = undefined;
  server.resetHandlers();
});
afterAll(() => server.close());
