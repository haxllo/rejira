export class ServerActionError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, options: { code: string; status: number; details?: unknown }) {
    super(message);
    this.name = 'ServerActionError';
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

async function post<T>(domain: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api/db/${domain}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ServerActionError(
      data.error ?? 'Something went wrong',
      { code: data.code ?? 'INTERNAL', status: res.status, details: data.details },
    );
  }

  return data as T;
}

async function get<T>(domain: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/db/${domain}?${qs}`);

  const data = await res.json();

  if (!res.ok) {
    throw new ServerActionError(
      data.error ?? 'Something went wrong',
      { code: data.code ?? 'INTERNAL', status: res.status, details: data.details },
    );
  }

  return data as T;
}

import type { Issue, StatusKey, PriorityKey, Project, Cycle, Comment, Membership, SavedView, Notification } from '@/lib/db/types';

export interface CreateIssuePayload {
  op: 'create';
  workspaceId: string;
  projectId: number;
  title: string;
  description?: string;
  status?: StatusKey;
  priority?: PriorityKey;
  assigneeIds?: number[];
  labelIds?: number[];
  cycleId?: number;
  dueDate?: string | null;
  estimatePoints?: number | null;
  parentId?: number | null;
}

export async function createIssueAction(input: CreateIssuePayload): Promise<Issue> {
  return post<Issue>('issues', input as unknown as Record<string, unknown>);
}

export interface SetStatusPayload {
  op: 'setStatus';
  workspaceId: string;
  issueId: string;
  status: StatusKey;
}

export async function setStatusAction(input: SetStatusPayload): Promise<Issue> {
  return post<Issue>('issues', input as unknown as Record<string, unknown>);
}

export interface SetPriorityPayload {
  op: 'setPriority';
  workspaceId: string;
  issueId: string;
  priority: PriorityKey;
}

export async function setPriorityAction(input: SetPriorityPayload): Promise<Issue> {
  return post<Issue>('issues', input as unknown as Record<string, unknown>);
}

export interface SetAssigneesPayload {
  op: 'setAssignees';
  workspaceId: string;
  issueId: string;
  assigneeIds: number[];
}

export async function setAssigneesAction(input: SetAssigneesPayload): Promise<Issue> {
  return post<Issue>('issues', input as unknown as Record<string, unknown>);
}

export interface SetLabelsPayload {
  op: 'setLabels';
  workspaceId: string;
  issueId: string;
  labelIds: number[];
}

export async function setLabelsAction(input: SetLabelsPayload): Promise<Issue> {
  return post<Issue>('issues', input as unknown as Record<string, unknown>);
}

export interface SetDueDatePayload {
  op: 'setDueDate';
  workspaceId: string;
  issueId: string;
  dueDate: string | null;
}

export async function setDueDateAction(input: SetDueDatePayload): Promise<Issue> {
  return post<Issue>('issues', input as unknown as Record<string, unknown>);
}

export interface SetEstimatePayload {
  op: 'setEstimate';
  workspaceId: string;
  issueId: string;
  points: number | null;
}

export async function setEstimateAction(input: SetEstimatePayload): Promise<Issue> {
  return post<Issue>('issues', input as unknown as Record<string, unknown>);
}

export interface SetDescriptionPayload {
  op: 'setDescription';
  workspaceId: string;
  issueId: string;
  description: string;
}

export async function setDescriptionAction(input: SetDescriptionPayload): Promise<Issue> {
  return post<Issue>('issues', input as unknown as Record<string, unknown>);
}

export interface SetTitlePayload {
  op: 'setTitle';
  workspaceId: string;
  issueId: string;
  title: string;
}

export async function setTitleAction(input: SetTitlePayload): Promise<Issue> {
  return post<Issue>('issues', input as unknown as Record<string, unknown>);
}

export interface SetProjectPayload {
  op: 'setProject';
  workspaceId: string;
  issueId: string;
  projectId: number;
}

export async function setProjectAction(input: SetProjectPayload): Promise<Issue> {
  return post<Issue>('issues', input as unknown as Record<string, unknown>);
}

export interface ArchiveIssuePayload {
  op: 'archive';
  workspaceId: string;
  issueId: string;
}

export async function archiveIssueAction(input: ArchiveIssuePayload): Promise<Issue> {
  return post<Issue>('issues', input as unknown as Record<string, unknown>);
}

export interface UnarchiveIssuePayload {
  op: 'unarchive';
  workspaceId: string;
  issueId: string;
}

export async function unarchiveIssueAction(input: UnarchiveIssuePayload): Promise<Issue> {
  return post<Issue>('issues', input as unknown as Record<string, unknown>);
}

export interface BulkArchivePayload {
  op: 'bulkArchive';
  workspaceId: string;
  issueIds: string[];
}

export async function bulkArchiveAction(input: BulkArchivePayload): Promise<true> {
  return post<true>('issues', input as unknown as Record<string, unknown>);
}

export interface BulkSetStatusPayload {
  op: 'bulkSetStatus';
  workspaceId: string;
  issueIds: string[];
  status: StatusKey;
}

export async function bulkSetStatusAction(input: BulkSetStatusPayload): Promise<true> {
  return post<true>('issues', input as unknown as Record<string, unknown>);
}

export interface CreateProjectPayload {
  op: 'create';
  workspaceId: string;
  name: string;
  key: string;
  description?: string;
  leadId?: number;
  iconLetter?: string;
  iconColor?: string;
}

export async function createProjectAction(input: CreateProjectPayload): Promise<Project> {
  return post<Project>('projects', input as unknown as Record<string, unknown>);
}

export interface UpdateProjectPayload {
  op: 'update';
  workspaceId: string;
  projectId: string;
  patch: Record<string, unknown>;
}

export async function updateProjectAction(input: UpdateProjectPayload): Promise<Project> {
  return post<Project>('projects', input as unknown as Record<string, unknown>);
}

export interface ArchiveProjectPayload {
  op: 'archive';
  workspaceId: string;
  projectId: string;
}

export async function archiveProjectAction(input: ArchiveProjectPayload): Promise<Project> {
  return post<Project>('projects', input as unknown as Record<string, unknown>);
}

export interface AddProjectMemberPayload {
  op: 'addMember';
  workspaceId: string;
  projectId: string;
  membershipId: number;
  role: 'lead' | 'contributor' | 'viewer';
}

export async function addProjectMemberAction(input: AddProjectMemberPayload): Promise<{ projectId: bigint; userId: bigint }> {
  return post<{ projectId: bigint; userId: bigint }>('projects', input as unknown as Record<string, unknown>);
}

export interface RemoveProjectMemberPayload {
  op: 'removeMember';
  workspaceId: string;
  projectId: string;
  membershipId: number;
}

export async function removeProjectMemberAction(input: RemoveProjectMemberPayload): Promise<true> {
  return post<true>('projects', input as unknown as Record<string, unknown>);
}

export interface CreateCyclePayload {
  op: 'create';
  workspaceId: string;
  projectId: number;
  name: string;
  startsAt?: string | null;
  endsAt?: string | null;
  goal?: string | null;
  number?: number;
}

export async function createCycleAction(input: CreateCyclePayload): Promise<Cycle> {
  return post<Cycle>('cycles', input as unknown as Record<string, unknown>);
}

export interface UpdateCyclePayload {
  op: 'update';
  workspaceId: string;
  cycleId: string;
  patch: Record<string, unknown>;
}

export async function updateCycleAction(input: UpdateCyclePayload): Promise<Cycle> {
  return post<Cycle>('cycles', input as unknown as Record<string, unknown>);
}

export interface CompleteCyclePayload {
  op: 'complete';
  workspaceId: string;
  cycleId: string;
}

export async function completeCycleAction(input: CompleteCyclePayload): Promise<Cycle> {
  return post<Cycle>('cycles', input as unknown as Record<string, unknown>);
}

export interface CreateCommentPayload {
  op: 'create';
  workspaceId: string;
  issueId: number;
  body: string;
  mentions?: string[];
}

export async function createCommentAction(input: CreateCommentPayload): Promise<Comment> {
  return post<Comment>('comments', input as unknown as Record<string, unknown>);
}

export interface UpdateCommentPayload {
  op: 'update';
  workspaceId: string;
  commentId: string;
  body: string;
}

export async function updateCommentAction(input: UpdateCommentPayload): Promise<Comment> {
  return post<Comment>('comments', input as unknown as Record<string, unknown>);
}

export interface DeleteCommentPayload {
  op: 'delete';
  workspaceId: string;
  commentId: string;
}

export async function deleteCommentAction(input: DeleteCommentPayload): Promise<true> {
  return post<true>('comments', input as unknown as Record<string, unknown>);
}

export interface MarkNotificationReadPayload {
  op: 'markRead';
  workspaceId: string;
  notificationId: string;
}

export async function markNotificationReadAction(input: MarkNotificationReadPayload): Promise<Notification> {
  return post<Notification>('notifications', input as unknown as Record<string, unknown>);
}

export interface MarkAllNotificationsReadPayload {
  op: 'markAllRead';
  workspaceId: string;
}

export async function markAllNotificationsReadAction(input: MarkAllNotificationsReadPayload): Promise<{ count: number }> {
  return post<{ count: number }>('notifications', input as unknown as Record<string, unknown>);
}

export interface SnoozeNotificationPayload {
  op: 'snooze';
  workspaceId: string;
  notificationId: string;
  until: string;
}

export async function snoozeNotificationAction(input: SnoozeNotificationPayload): Promise<Notification> {
  return post<Notification>('notifications', input as unknown as Record<string, unknown>);
}

export interface CreateSavedViewPayload {
  op: 'create';
  workspaceId: string;
  ownerId: string;
  name: string;
  filter: Record<string, unknown>;
  sort?: { key: string; dir: 'asc' | 'desc' };
  groupBy?: string;
  starred?: boolean;
}

export async function createSavedViewAction(input: CreateSavedViewPayload): Promise<SavedView> {
  return post<SavedView>('saved-views', input as unknown as Record<string, unknown>);
}

export interface UpdateSavedViewPayload {
  op: 'update';
  workspaceId: string;
  viewId: string;
  patch: Record<string, unknown>;
}

export async function updateSavedViewAction(input: UpdateSavedViewPayload): Promise<SavedView> {
  return post<SavedView>('saved-views', input as unknown as Record<string, unknown>);
}

export interface DeleteSavedViewPayload {
  op: 'delete';
  workspaceId: string;
  viewId: string;
}

export async function deleteSavedViewAction(input: DeleteSavedViewPayload): Promise<true> {
  return post<true>('saved-views', input as unknown as Record<string, unknown>);
}

export interface ToggleStarredPayload {
  op: 'toggleStarred';
  workspaceId: string;
  viewId: string;
  starred: boolean;
}

export async function toggleStarredAction(input: ToggleStarredPayload): Promise<SavedView> {
  return post<SavedView>('saved-views', input as unknown as Record<string, unknown>);
}

export interface ChangeRolePayload {
  op: 'changeRole';
  workspaceId: string;
  membershipId: string;
  newRole: 'owner' | 'admin' | 'member' | 'guest';
}

export async function changeRoleAction(input: ChangeRolePayload): Promise<Membership> {
  return post<Membership>('memberships', input as unknown as Record<string, unknown>);
}

export interface RemoveMemberPayload {
  op: 'removeMember';
  workspaceId: string;
  membershipId: string;
}

export async function removeMemberAction(input: RemoveMemberPayload): Promise<true> {
  return post<true>('memberships', input as unknown as Record<string, unknown>);
}

export function getIssueAction(workspaceId: string, issueId: string): Promise<Issue | null> {
  return get<Issue | null>('issues', { workspaceId, issueId });
}
