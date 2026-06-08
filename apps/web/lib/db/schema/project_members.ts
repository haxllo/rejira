import { pgTable, bigint, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';
import { users } from './users';

export const projectMembers = pgTable('project_members', {
  projectId: bigint('project_id', { mode: 'bigint' }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: bigint('user_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => [
  uniqueIndex('project_members_project_user_idx').on(table.projectId, table.userId),
  index('project_members_user_id_idx').on(table.userId),
  index('project_members_project_id_idx').on(table.projectId),
]);
