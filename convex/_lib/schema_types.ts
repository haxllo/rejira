// Phase 2 — Stream 2B: Derived TypeScript types for the schema.
//
// Convex's auto-generated `convex/_generated/dataModel.d.ts` gives us
// `Doc<"issues">`, `Id<"issues">`, etc. — those are the source of truth.
// This file re-exports the validator types (StatusKey, PriorityKey, etc.)
// as TypeScript types for use throughout the app and the seed script.
//
// File name is `schema_types.ts` (not `schema-types.ts`) because Convex's
// path validator disallows dashes in file names within `convex/`.

import { Infer } from "convex/values";
import {
  statusKey,
  priorityKey,
  role,
  userStatus,
  cycleStatus,
  notificationType,
  activityVerb,
} from "../schema";

export type StatusKey = Infer<typeof statusKey>;
export type PriorityKey = Infer<typeof priorityKey>;
export type Role = Infer<typeof role>;
export type UserStatus = Infer<typeof userStatus>;
export type CycleStatus = Infer<typeof cycleStatus>;
export type NotificationType = Infer<typeof notificationType>;
export type ActivityVerb = Infer<typeof activityVerb>;

// Stable constant arrays — useful for iteration in the UI (cycle all 6 statuses, etc.)
export const STATUS_KEYS: StatusKey[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
];

export const PRIORITY_KEYS: PriorityKey[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
];

export const ROLES: Role[] = ["owner", "admin", "member", "guest"];
