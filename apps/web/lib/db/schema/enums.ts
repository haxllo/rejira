import { pgEnum } from 'drizzle-orm/pg-core';

export const statusKeyEnum = pgEnum('status_key', [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
]);

export const priorityKeyEnum = pgEnum('priority_key', [
  'urgent',
  'high',
  'medium',
  'low',
  'none',
]);

export const cycleStatusEnum = pgEnum('cycle_status', [
  'planned',
  'active',
  'completed',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'issue_assigned',
  'issue_mentioned',
  'issue_commented',
  'issue_status_changed',
  'cycle_started',
  'cycle_ended',
]);

export const activityVerbEnum = pgEnum('activity_verb', [
  'created',
  'updated',
  'deleted',
  'archived',
  'restored',
  'assigned',
  'unassigned',
  'commented',
  'status_changed',
  'priority_changed',
]);

export const auditEventEnum = pgEnum('audit_event', [
  'auth_signin',
  'auth_signup',
  'auth_signout',
  'auth_failed',
  'password_reset',
  'email_verified',
  'two_factor_enabled',
  'two_factor_disabled',
  'workspace_created',
  'workspace_archived',
  'member_added',
  'member_removed',
  'role_changed',
  'data_export_requested',
  'account_deleted',
]);
