import { pgTable, bigint, text, jsonb, timestamp, index, bigserial } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';
import { activityVerbEnum } from './enums';

export const activities = pgTable('activities', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  externalId: text('external_id').notNull().unique(),
  workspaceId: text('workspaceId').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  actorId: bigint('actor_id', { mode: 'bigint' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  verb: activityVerbEnum('verb').notNull(),
  objectType: text('object_type').notNull(),
  objectId: bigint('object_id', { mode: 'bigint' }).notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('activities_workspace_created_idx').on(table.workspaceId, table.createdAt.desc()),
  index('activities_workspace_object_idx').on(table.workspaceId, table.objectType, table.objectId),
  index('activities_actor_id_idx').on(table.actorId),
]);
