import { pgTable, bigint, text, timestamp, index, bigserial } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { issues } from './issues';
import { users } from './users';

export const comments = pgTable('comments', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  externalId: text('external_id').notNull().unique(),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  issueId: bigint('issue_id', { mode: 'bigint' }).notNull().references(() => issues.id, { onDelete: 'cascade' }),
  authorId: bigint('author_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('comments_workspace_issue_idx').on(table.workspaceId, table.issueId),
  index('comments_workspace_issue_created_idx').on(table.workspaceId, table.issueId, table.createdAt.desc()),
]);
