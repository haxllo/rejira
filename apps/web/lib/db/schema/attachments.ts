import { pgTable, bigint, text, integer, timestamp, index, bigserial } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { issues } from './issues';
import { users } from './users';

export const attachments = pgTable('attachments', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  externalId: text('external_id').notNull().unique(),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  issueId: bigint('issue_id', { mode: 'bigint' }).references(() => issues.id, { onDelete: 'cascade' }),
  uploaderId: bigint('uploader_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('attachments_workspace_issue_idx').on(table.workspaceId, table.issueId),
  index('attachments_uploader_id_idx').on(table.uploaderId),
  index('attachments_workspace_id_idx').on(table.workspaceId),
]);
