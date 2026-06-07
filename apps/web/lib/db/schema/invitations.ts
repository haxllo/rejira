import { pgTable, bigint, text, timestamp, uniqueIndex, index, bigserial } from 'drizzle-orm/pg-core';
import { roleKeyEnum } from './enums';
import { workspaces } from './workspaces';
import { users } from './users';

export const invitations = pgTable('invitations', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  externalId: text('external_id').notNull().unique(),
  workspaceId: bigint('workspace_id', { mode: 'bigint' }).notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: roleKeyEnum('role').notNull().default('member'),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  invitedBy: bigint('invited_by', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('invitations_workspace_email_idx').on(table.workspaceId, table.email),
  index('invitations_workspace_id_idx').on(table.workspaceId),
  index('invitations_email_idx').on(table.email),
  index('invitations_token_hash_idx').on(table.tokenHash),
]);
