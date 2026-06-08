import { pgTable, bigint, text, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { cycles } from './cycles';
import { issues } from './issues';
import { workspaces } from './workspaces';

export const cycleIssues = pgTable('cycle_issues', {
  cycleId: bigint('cycle_id', { mode: 'bigint' }).notNull().references(() => cycles.id, { onDelete: 'cascade' }),
  issueId: bigint('issue_id', { mode: 'bigint' }).notNull().references(() => issues.id, { onDelete: 'cascade' }),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
}, (table) => [
  uniqueIndex('cycle_issues_cycle_issue_idx').on(table.cycleId, table.issueId),
  index('cycle_issues_cycle_id_idx').on(table.cycleId),
  index('cycle_issues_issue_id_idx').on(table.issueId),
  index('cycle_issues_workspace_id_idx').on(table.workspaceId),
]);
