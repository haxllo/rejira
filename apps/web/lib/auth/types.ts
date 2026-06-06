// Phase 3 — Stream 3A: Auth session and user types.
//
// Mirrors the Better Auth `user` document shape so components that read
// `useSession()` have proper TypeScript support without importing the
// Convex data model on the client.

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: number;
  updatedAt: number;
  handle: string | null;
  avatarColor: string | null;
  status: string | null;
  defaultWorkspaceId: string | null;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: number;
  ipAddress: string | null;
  userAgent: string | null;
}
