import { setupServer } from "msw/node";

// Feature tests add contract handlers here instead of replacing fetch in individual suites.
export const server = setupServer();
