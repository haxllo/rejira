import 'server-only';

import { trackEvent } from './posthog';
import type { StatusKey } from '@/lib/db/types';

interface IssueCreatedProps {
  userId: string;
  workspaceId: string;
  projectId: number;
  hasAssignee: boolean;
  hasLabel: boolean;
  hasDueDate: boolean;
}

interface StatusChangedProps {
  userId: string;
  workspaceId: string;
  issueId: string;
  from: StatusKey;
  to: StatusKey;
}

interface CommentCreatedProps {
  userId: string;
  workspaceId: string;
  issueId: string;
}

interface ProjectCreatedProps {
  userId: string;
  workspaceId: string;
  projectId: number;
}

interface CycleCreatedProps {
  userId: string;
  workspaceId: string;
  cycleId: number;
  projectId: number;
}

interface ViewSavedProps {
  userId: string;
  workspaceId: string;
  viewId: number;
  isShared: boolean;
}

interface NotificationReadProps {
  userId: string;
  workspaceId: string;
  notificationId: string;
}

interface MemberInvitedProps {
  userId: string;
  workspaceId: string;
  email: string;
}

interface MemberJoinedProps {
  userId: string;
  workspaceId: string;
}

interface MemberRoleChangedProps {
  userId: string;
  workspaceId: string;
  targetUserId: string;
  from: string;
  to: string;
}

function safeCapture(event: string, distinctId: string, properties: Record<string, unknown>): void {
  try {
    trackEvent(event, distinctId, properties);
  } catch {
    // tracking must never throw
  }
}

export function trackIssueCreated(props: IssueCreatedProps): void {
  safeCapture('issue_created', props.userId, {
    workspaceId: props.workspaceId,
    projectId: props.projectId,
    hasAssignee: props.hasAssignee,
    hasLabel: props.hasLabel,
    hasDueDate: props.hasDueDate,
  });
}

export function trackStatusChanged(props: StatusChangedProps): void {
  safeCapture('issue_status_changed', props.userId, {
    workspaceId: props.workspaceId,
    issueId: props.issueId,
    from: props.from,
    to: props.to,
  });
}

export function trackCommentCreated(props: CommentCreatedProps): void {
  safeCapture('comment_created', props.userId, {
    workspaceId: props.workspaceId,
    issueId: props.issueId,
  });
}

export function trackProjectCreated(props: ProjectCreatedProps): void {
  safeCapture('project_created', props.userId, {
    workspaceId: props.workspaceId,
    projectId: props.projectId,
  });
}

export function trackCycleCreated(props: CycleCreatedProps): void {
  safeCapture('cycle_created', props.userId, {
    workspaceId: props.workspaceId,
    cycleId: props.cycleId,
    projectId: props.projectId,
  });
}

export function trackViewSaved(props: ViewSavedProps): void {
  safeCapture('view_saved', props.userId, {
    workspaceId: props.workspaceId,
    viewId: props.viewId,
    isShared: props.isShared,
  });
}

export function trackNotificationRead(props: NotificationReadProps): void {
  safeCapture('notification_read', props.userId, {
    workspaceId: props.workspaceId,
    notificationId: props.notificationId,
  });
}

export function trackMemberInvited(props: MemberInvitedProps): void {
  safeCapture('member_invited', props.userId, {
    workspaceId: props.workspaceId,
    email: props.email,
  });
}

export function trackMemberJoined(props: MemberJoinedProps): void {
  safeCapture('member_joined', props.userId, {
    workspaceId: props.workspaceId,
  });
}

export function trackMemberRoleChanged(props: MemberRoleChangedProps): void {
  safeCapture('member_role_changed', props.userId, {
    workspaceId: props.workspaceId,
    targetUserId: props.targetUserId,
    from: props.from,
    to: props.to,
  });
}
