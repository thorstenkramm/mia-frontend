import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { server } from "../../../test/server";
import {
  courseUnitCheckpoint,
  courseUnitFixture,
} from "../../../scripts/secret-hygiene-evidence";
import { ApiTransportError, sendUnsafeRequest } from "./client";

it("preparation unsafe PATCH dispatch is single and cannot inherit read retries", async () => {
  const fixture = courseUnitFixture();
  let attempts = 0,
    valid = false;
  server.use(
    http.patch("/api/v1/courses/course_1", async ({ request }) => {
      attempts++;
      valid =
        request.headers.get("X-CSRF-Token") === fixture.csrf &&
        (await request.text()) === fixture.teachingText;
      return HttpResponse.error();
    }),
  );
  expect(
    await sendUnsafeRequest({
      method: "PATCH",
      path: "/api/v1/courses/course_1",
      csrfToken: fixture.csrf,
      body: fixture.teachingText,
    }).then(
      () => false,
      (error: unknown) => error instanceof ApiTransportError,
    ),
  ).toBe(true);
  expect(attempts === 1 && valid).toBe(true);
  courseUnitCheckpoint("preparation-client");
});
