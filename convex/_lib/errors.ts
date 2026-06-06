// Phase 2 — Stream 2D: Convex error helpers.
//
// Centralised ConvexError factories so messages and codes are consistent
// across queries and mutations. The Phase 4 RBAC layer will use these for
// every denial path.

import { ConvexError } from "convex/values";

export function notFound(entity: string, id?: string): ConvexError<string> {
  return new ConvexError(
    id ? `${entity} not found: ${id}` : `${entity} not found`,
  );
}

export function forbidden(reason: string): ConvexError<string> {
  return new ConvexError(`Forbidden: ${reason}`);
}

export function archived(entity: string): ConvexError<string> {
  return new ConvexError(`${entity} is archived`);
}

export function validation(message: string): ConvexError<string> {
  return new ConvexError(`Invalid input: ${message}`);
}

export function unauthenticated(): ConvexError<string> {
  return new ConvexError("Not authenticated");
}

export function emailNotVerified(): ConvexError<string> {
  return new ConvexError("Email not verified");
}

export function rateLimited(retryAfterSec?: number): ConvexError<string> {
  return new ConvexError(
    retryAfterSec
      ? `Too many requests — retry in ${retryAfterSec}s`
      : "Too many requests",
  );
}

export function invalidToken(reason: string): ConvexError<string> {
  return new ConvexError(`Invalid token: ${reason}`);
}

export function tokenExpired(): ConvexError<string> {
  return new ConvexError("Token expired");
}

export function accountDeleted(): ConvexError<string> {
  return new ConvexError("Account scheduled for deletion");
}
