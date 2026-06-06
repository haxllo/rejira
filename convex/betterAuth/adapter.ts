// Phase 3 — Stream 3A: Better Auth adapter API re-exports.
//
// `createApi` produces the Convex query/mutation functions that
// the Better Auth component calls under the hood to read/write
// the auth tables. The component wires these up via the
// `authComponent.adapter(ctx)` call in `auth.ts`.
//
// We don't call these functions directly; they're an internal
// implementation detail. But they MUST be exported from the
// component directory for the component to function.

import { createApi } from "@convex-dev/better-auth";
import { createAuthOptions } from "./auth";
import schema from "./schema";

export const {
  create,
  findOne,
  findMany,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
} = createApi(schema, createAuthOptions);
