import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { server } from "../../../test/server";
import { courseUnitFixture } from "../../../test/courseUnitFixture";
import { ApiHttpError, ApiProtocolError, jsonApiMediaType } from "./client";
import { listSupervisorCandidates } from "./administrationAccounts";

it("shortlists a minimized candidate page without claiming assignment eligibility", async () => {
  const fixture = courseUnitFixture();
  let queryValid = false;
  let reads = 0;
  server.use(
    http.get("/api/v1/users", ({ request }) => {
      reads++;
      const query = new URL(request.url).searchParams;
      queryValid =
        query.size === 4 &&
        query.get("filter[role]") === "supervisor" &&
        query.get("filter[state]") === "active" &&
        query.get("page[limit]") === "25" &&
        query.get("page[offset]") === "0";
      return HttpResponse.json(
        {
          data: [
            {
              type: "administration-accounts",
              id: "supervisor_1",
              attributes: {
                username: fixture.username,
                account_class: "staff",
                account_state: "active",
                permanent_roles: ["supervisor", "student"],
              },
            },
          ],
          meta: { has_more: false },
        },
        { headers: { "Content-Type": jsonApiMediaType } },
      );
    }),
  );
  const page = await listSupervisorCandidates(0, new AbortController().signal);
  expect(queryValid && reads === 1).toBe(true);
  expect(
    page.candidates[0]?.username === fixture.username &&
      Object.keys(page.candidates[0] ?? {}).join(",") === "id,username",
  ).toBe(true);
});

it("rejects wrong state, missing role, private fields and malformed pagination", async () => {
  const fixture = courseUnitFixture();
  for (const attributes of [
    {
      username: fixture.username,
      account_class: "staff",
      account_state: "banned",
      permanent_roles: ["supervisor"],
    },
    {
      username: fixture.username,
      account_class: "staff",
      account_state: "active",
      permanent_roles: ["student"],
    },
    {
      username: fixture.username,
      account_class: "staff",
      account_state: "active",
      permanent_roles: ["supervisor"],
      email: fixture.rawError,
    },
  ]) {
    server.use(
      http.get("/api/v1/users", () =>
        HttpResponse.json(
          {
            data: [{ type: "administration-accounts", id: "s1", attributes }],
            meta: { has_more: false },
          },
          { headers: { "Content-Type": jsonApiMediaType } },
        ),
      ),
    );
    expect(
      await listSupervisorCandidates(0, new AbortController().signal).then(
        () => false,
        (error: unknown) => error instanceof ApiProtocolError,
      ),
    ).toBe(true);
  }
  server.use(
    http.get("/api/v1/users", () =>
      HttpResponse.json(
        {
          data: [],
          meta: { has_more: true },
          links: { next: "/api/v1/users?page[limit]=25&page[offset]=25" },
        },
        { headers: { "Content-Type": jsonApiMediaType } },
      ),
    ),
  );
  expect(
    await listSupervisorCandidates(0, new AbortController().signal).then(
      () => false,
      (error: unknown) => error instanceof ApiProtocolError,
    ),
  ).toBe(true);
});

it("candidate absence and failed checks remain distinct", async () => {
  const fixture = courseUnitFixture();
  server.use(
    http.get("/api/v1/users", () =>
      HttpResponse.json(
        { data: [], meta: { has_more: false } },
        { headers: { "Content-Type": jsonApiMediaType } },
      ),
    ),
  );
  const page = await listSupervisorCandidates(0, new AbortController().signal);
  expect(
    page.candidates.length === 0 && !page.hasMore && page.nextOffset === null,
  ).toBe(true);
  server.use(
    http.get("/api/v1/users", () =>
      HttpResponse.json(
        {
          errors: [
            { status: "503", code: "unavailable", detail: fixture.rawError },
          ],
        },
        { status: 503, headers: { "Content-Type": jsonApiMediaType } },
      ),
    ),
  );
  expect(
    await listSupervisorCandidates(0, new AbortController().signal).then(
      () => false,
      (error: unknown) => error instanceof ApiHttpError,
    ),
  ).toBe(true);
});
