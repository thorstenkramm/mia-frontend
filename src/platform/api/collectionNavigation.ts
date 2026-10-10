import { z } from "zod";
import { ApiProtocolError } from "./client";

export const collectionPageLimit = 25;
const maximumOffset = 10_000;
const pageLinks = ["prev", "next"] as const;

// The one bounded collection envelope: fixed page limit, the has_more flag
// and optional server-supplied navigation links. Each caller supplies its row
// schema; unknown fields stay stripped by the row schema itself.
export function collectionDocument<Row extends z.ZodType>(row: Row) {
  return z.object({
    errors: z.never().optional(),
    data: z.array(row).max(collectionPageLimit),
    meta: z.object({ has_more: z.boolean() }),
    links: z
      .object({
        next: z.string().exactOptional(),
        prev: z.string().exactOptional(),
      })
      .exactOptional(),
  });
}

// Navigation is supplied by the server, never synthesized from page size.
// Each collection supplies its own exact path and fixed filter contract.
export function collectionQuery(
  offset: number,
  filters: Readonly<Record<string, string>> = {},
): string {
  if (!Number.isInteger(offset) || offset < 0 || offset > maximumOffset)
    throw new ApiProtocolError();
  return new URLSearchParams({
    ...filters,
    "page[limit]": String(collectionPageLimit),
    "page[offset]": String(offset),
  }).toString();
}

export function collectionNavigation(
  path: string,
  offset: number,
  hasMore: boolean,
  links: { readonly prev?: string; readonly next?: string } | undefined,
  filters: Readonly<Record<string, string>> = {},
): { previousOffset: number | null; nextOffset: number | null } {
  const expected = new URLSearchParams(collectionQuery(offset, filters));
  const values = pageLinks.map((direction) => {
    const link = links?.[direction];
    if (link === undefined) return null;
    if (!link.startsWith("/") || link.startsWith("//") || link.includes("\\"))
      throw new ApiProtocolError();
    const url = new URL(link, window.location.origin);
    const value = url.searchParams.get("page[offset]");
    if (
      url.origin !== window.location.origin ||
      url.pathname !== path ||
      url.hash !== "" ||
      [...url.searchParams.keys()].sort().join("&") !==
        [...expected.keys()].sort().join("&") ||
      [...expected].some(
        ([key, expectedValue]) =>
          key !== "page[offset]" && url.searchParams.get(key) !== expectedValue,
      ) ||
      value === null ||
      !/^(0|[1-9]\d*)$/u.test(value)
    )
      throw new ApiProtocolError();
    const number = Number(value);
    if (
      number > maximumOffset ||
      (direction === "prev" ? number >= offset : number <= offset || !hasMore)
    )
      throw new ApiProtocolError();
    return number;
  });
  return { previousOffset: values[0] ?? null, nextOffset: values[1] ?? null };
}
