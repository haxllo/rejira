import * as schema from './schema';
import type { statusKeyEnum, priorityKeyEnum, cycleStatusEnum } from './schema/enums';

export { schema };
export { schema as s };
import type { issues } from './schema/issues';
import type { projects } from './schema/projects';
import type { cycles } from './schema/cycles';
import type { labels } from './schema/labels';
import type { comments } from './schema/comments';
import type { notifications } from './schema/notifications';
import type { savedViews } from './schema/saved_views';
import type { memberships } from './schema/memberships';
import type { activities } from './schema/activities';
import type { workspaces } from './schema/workspaces';
import type { users } from './schema/users';
import type { invitations } from './schema/invitations';
import type { attachments } from './schema/attachments';

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Cycle = typeof cycles.$inferSelect;
export type NewCycle = typeof cycles.$inferInsert;

export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type SavedView = typeof savedViews.$inferSelect;
export type NewSavedView = typeof savedViews.$inferInsert;

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export type StatusKey = (typeof statusKeyEnum.enumValues)[number];
export type PriorityKey = (typeof priorityKeyEnum.enumValues)[number];
export type CycleStatus = (typeof cycleStatusEnum.enumValues)[number];
