import { pgTable, bigint, text, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { issues } from './issues';
import { users } from './users';
import { workspaces } from './workspaces';

export const issueAssignees = pgTable('issue_assignees', {
  issueId: bigint('issue_id', { mode: 'bigint' }).notNull().references(() => issues.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
}, (table) => [
  uniqueIndex('issue_assignees_issue_user_idx').on(table.issueId, table.userId),
  index('issue_assignees_user_workspace_idx').on(table.userId, table.workspaceId),
  index('issue_assignees_issue_id_idx').on(table.issueId),
  index('issue_assignees_workspace_id_idx').on(table.workspaceId),
]);
