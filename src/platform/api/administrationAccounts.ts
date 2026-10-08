import { z } from "zod";
import type { operations } from "./generated";
import { ApiProtocolError, jsonApiMediaType, readJsonApi } from "./client";
import { resourceId, toAccountId, type AccountId } from "./entry";
import { collectionNavigation, collectionQuery } from "./collectionNavigation";

type AccountCollection =
  operations["listAdministrationAccounts"]["responses"][200]["content"][typeof jsonApiMediaType];
const schema = z.object({
  errors: z.never().optional(),
  data: z
    .array(
      z.object({
        type: z.literal("administration-accounts"),
        id: resourceId,
        attributes: z
          .object({
            username: z.string(),
            account_class: z.enum(["staff", "student_only"]),
            account_state: z.enum(["active", "banned"]),
            permanent_roles: z.array(
              z.enum(["administrator", "supervisor", "mentor", "student"]),
            ),
          })
          .strict(),
      }),
    )
    .max(25),
  meta: z.object({ has_more: z.boolean() }),
  links: z
    .object({
      prev: z.string().exactOptional(),
      next: z.string().exactOptional(),
    })
    .exactOptional(),
}) satisfies z.ZodType<AccountCollection>;

// Candidate discovery only. No account-detail or assignment-eligibility claim.
export type SupervisorCandidate = {
  readonly id: AccountId;
  readonly username: string;
};
export type SupervisorCandidatePage = {
  readonly candidates: readonly SupervisorCandidate[];
  readonly offset: number;
  readonly previousOffset: number | null;
  readonly nextOffset: number | null;
  readonly hasMore: boolean;
};
const path = "/api/v1/users";
const filters = {
  "filter[role]": "supervisor",
  "filter[state]": "active",
} as const;

export async function listSupervisorCandidates(
  offset: number,
  signal: AbortSignal,
): Promise<SupervisorCandidatePage> {
  const document = await readJsonApi({
    path: `${path}?${collectionQuery(offset, filters)}`,
    schema,
    initiator: "user",
    signal,
  });
  if (
    new Set(document.data.map((account) => account.id)).size !==
      document.data.length ||
    document.data.some(
      (account) =>
        account.attributes.account_state !== "active" ||
        !account.attributes.permanent_roles.includes("supervisor"),
    )
  )
    throw new ApiProtocolError();
  return {
    candidates: document.data.map((account) => ({
      id: toAccountId(account.id),
      username: account.attributes.username,
    })),
    offset,
    hasMore: document.meta.has_more,
    ...collectionNavigation(
      path,
      offset,
      document.meta.has_more,
      document.links,
      filters,
    ),
  };
}
