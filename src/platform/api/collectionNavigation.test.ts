import { describe, expect, it } from "vitest";
import { ApiProtocolError } from "./client";
import { collectionNavigation, collectionQuery } from "./collectionNavigation";

describe("contracted collection navigation", () => {
  const path = "/api/v1/users";
  const filters = { "filter[role]": "supervisor", "filter[state]": "active" };
  it("follows only server-linked offsets with exact fixed filters", () => {
    const links = {
      prev: `${path}?${collectionQuery(0, filters)}`,
      next: `${path}?${collectionQuery(50, filters)}`,
    };
    expect(collectionNavigation(path, 25, true, links, filters)).toEqual({
      previousOffset: 0,
      nextOffset: 50,
    });
    expect(
      collectionNavigation(path, 0, true, undefined, filters).nextOffset,
    ).toBeNull();
  });
  it.each([
    "https://example.test/api/v1/users?page[limit]=25&page[offset]=25",
    "//example.test/api/v1/users",
    "/api/v1/users?page[limit]=25&page[offset]=25",
    "/api/v1/users?filter[role]=supervisor&filter[state]=active&page[limit]=25&page[offset]=025",
    "/api/v1/users?filter[role]=supervisor&filter[state]=active&page[limit]=25&page[offset]=10001",
    "/api/v1/users?filter[role]=supervisor&filter[state]=active&page[limit]=25&page[offset]=25#x",
    "/api/v1/users?filter[role]=supervisor&filter[role]=supervisor&filter[state]=active&page[limit]=25&page[offset]=25",
    "/api/v1/users?filter[role]=student&filter[state]=active&page[limit]=25&page[offset]=25",
  ])("rejects noncontracted navigation %s", (next) => {
    expect(() =>
      collectionNavigation(path, 0, true, { next }, filters),
    ).toThrow(ApiProtocolError);
  });
  it("rejects direction, has-more and request offset violations", () => {
    const next = `${path}?${collectionQuery(25, filters)}`;
    expect(() =>
      collectionNavigation(path, 0, false, { next }, filters),
    ).toThrow(ApiProtocolError);
    expect(() =>
      collectionNavigation(path, 25, true, { next }, filters),
    ).toThrow(ApiProtocolError);
    expect(() => collectionQuery(-1)).toThrow(ApiProtocolError);
  });
});
