// Phase 2 — Stream 2C: Demo session placeholder.
//
// This file exists for one reason: to make the `ME_ID = "u_aria"` constant
// discoverable as a Phase 2 placeholder. Phase 3 (Better Auth) will delete
// this file and replace every `ME_ID` reference with `useSession().userId`.
//
// Until then, the seed script writes a `memberships` row for `u_aria` with
// role `owner` so the demo workspace is queryable as "my workspace".

export const ME_EXTERNAL_ID = "u_aria" as const;
export const ME_ROLE: "owner" = "owner" as const;
