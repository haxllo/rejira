// Phase 3 — Stream 3A: Public auth re-exports.
//
// Every consumer imports from this file so internal re-orgs don't
// cascade through the codebase.

export * from "./types";
export { authClient, signIn, signUp, signOut, useSession, getSession } from "./client";
export type { AuthClient } from "./client";
export { signIn as signInEmail, signUp as signUpEmail } from "./email";
