'use client';

import * as serverActions from '@/lib/server-actions';
import { useIssues } from '@/lib/state/issues';
import { apply, recordError } from '@/lib/state/mutations';
import type { Issue, StatusKey, PriorityKey } from '@/lib/db/types';

function getIssue(issueId: string): Issue | undefined {
  return useIssues.getState().issues.find(
    (i) => (i.id ?? i.externalId) === issueId,
  );
}

function statusLabel(status: StatusKey): string {
  const labels: Record<StatusKey, string> = {
    backlog: 'Backlog',
    todo: 'Todo',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
    cancelled: 'Cancelled',
  };
  return labels[status] ?? status;
}

function priorityLabel(priority: PriorityKey): string {
  const labels: Record<PriorityKey, string> = {
    urgent: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    none: 'No Priority',
  };
  return labels[priority] ?? priority;
}

export function useIssuesServerActions() {
  return {
    setStatus: (issueId: string, status: StatusKey, workspaceId: string) => {
      const prior = getIssue(issueId);
      if (!prior) return;
      const snapshot = { ...prior };

      useIssues.getState().setOne({ ...prior, status } as Issue);

      const run = () =>
        serverActions.setStatusAction({ op: 'setStatus', workspaceId, issueId, status });

      apply({
        message: `Moved to ${statusLabel(status)}`,
        affectedIds: [issueId],
        undo: () => useIssues.getState().setOne(snapshot as Issue),
        retry: () => run(),
        run,
      });
    },

    setPriority: (issueId: string, priority: PriorityKey, workspaceId: string) => {
      const prior = getIssue(issueId);
      if (!prior) return;
      const snapshot = { ...prior };

      useIssues.getState().setOne({ ...prior, priority } as Issue);

      const run = () =>
        serverActions.setPriorityAction({ op: 'setPriority', workspaceId, issueId, priority });

      apply({
        message: `Changed priority to ${priorityLabel(priority)}`,
        affectedIds: [issueId],
        undo: () => useIssues.getState().setOne(snapshot as Issue),
        retry: () => run(),
        run,
      });
    },

    setAssignees: (issueId: string, assigneeIds: number[], workspaceId: string) => {
      const prior = getIssue(issueId);
      if (!prior) return;
      const snapshot = { ...prior };

      useIssues.getState().setOne({ ...prior, assigneeIds } as Issue);

      const run = () =>
        serverActions.setAssigneesAction({ op: 'setAssignees', workspaceId, issueId, assigneeIds });

      apply({
        message: 'Updated assignees',
        affectedIds: [issueId],
        undo: () => useIssues.getState().setOne(snapshot as Issue),
        retry: () => run(),
        run,
      });
    },

    setLabels: (issueId: string, labelIds: number[], workspaceId: string) => {
      const prior = getIssue(issueId);
      if (!prior) return;
      const snapshot = { ...prior };

      useIssues.getState().setOne({ ...prior, labelIds } as Issue);

      const run = () =>
        serverActions.setLabelsAction({ op: 'setLabels', workspaceId, issueId, labelIds });

      apply({
        message: 'Updated labels',
        affectedIds: [issueId],
        undo: () => useIssues.getState().setOne(snapshot as Issue),
        retry: () => run(),
        run,
      });
    },

    setDueDate: (issueId: string, dueDate: string | null, workspaceId: string) => {
      const prior = getIssue(issueId);
      if (!prior) return;
      const snapshot = { ...prior };

      useIssues.getState().setOne({ ...prior, dueDate: dueDate ? new Date(dueDate) : null } as Issue);

      const run = () =>
        serverActions.setDueDateAction({ op: 'setDueDate', workspaceId, issueId, dueDate });

      apply({
        message: dueDate ? 'Set due date' : 'Cleared due date',
        affectedIds: [issueId],
        undo: () => useIssues.getState().setOne(snapshot as Issue),
        retry: () => run(),
        run,
      });
    },

    setEstimate: (issueId: string, points: number | null, workspaceId: string) => {
      const prior = getIssue(issueId);
      if (!prior) return;
      const snapshot = { ...prior };

      useIssues.getState().setOne({ ...prior, estimatePoints: points } as Issue);

      const run = () =>
        serverActions.setEstimateAction({ op: 'setEstimate', workspaceId, issueId, points });

      apply({
        message: points != null ? `Set estimate to ${points}` : 'Cleared estimate',
        affectedIds: [issueId],
        undo: () => useIssues.getState().setOne(snapshot as Issue),
        retry: () => run(),
        run,
      });
    },

    setDescription: (issueId: string, description: string, workspaceId: string) => {
      const prior = getIssue(issueId);
      if (!prior) return;
      const snapshot = { ...prior };

      useIssues.getState().setOne({ ...prior, description } as Issue);

      const run = () =>
        serverActions.setDescriptionAction({ op: 'setDescription', workspaceId, issueId, description });

      apply({
        message: 'Updated description',
        affectedIds: [issueId],
        undo: () => useIssues.getState().setOne(snapshot as Issue),
        retry: () => run(),
        run,
      });
    },

    setTitle: (issueId: string, title: string, workspaceId: string) => {
      const prior = getIssue(issueId);
      if (!prior) return;
      const snapshot = { ...prior };

      useIssues.getState().setOne({ ...prior, title } as Issue);

      const run = () =>
        serverActions.setTitleAction({ op: 'setTitle', workspaceId, issueId, title });

      apply({
        message: 'Updated title',
        affectedIds: [issueId],
        undo: () => useIssues.getState().setOne(snapshot as Issue),
        retry: () => run(),
        run,
      });
    },

    setProject: (issueId: string, projectId: number, workspaceId: string) => {
      const prior = getIssue(issueId);
      if (!prior) return;
      const snapshot = { ...prior };

      useIssues.getState().setOne({ ...prior, projectId } as Issue);

      const run = () =>
        serverActions.setProjectAction({ op: 'setProject', workspaceId, issueId, projectId });

      apply({
        message: 'Moved to project',
        affectedIds: [issueId],
        undo: () => useIssues.getState().setOne(snapshot as Issue),
        retry: () => run(),
        run,
      });
    },

    archiveIssue: (issueId: string, workspaceId: string) => {
      const prior = getIssue(issueId);
      if (!prior) return;
      const snapshot = { ...prior };

      useIssues.getState().setOne({ ...prior, archivedAt: new Date() } as Issue);

      const run = () =>
        serverActions.archiveIssueAction({ op: 'archive', workspaceId, issueId });

      apply({
        message: 'Archived',
        affectedIds: [issueId],
        undo: () => useIssues.getState().setOne(snapshot as Issue),
        retry: () => run(),
        run,
      });
    },

    unarchiveIssue: (issueId: string, workspaceId: string) => {
      const prior = getIssue(issueId);
      if (!prior) return;
      const snapshot = { ...prior };

      useIssues.getState().setOne({ ...prior, archivedAt: null } as Issue);

      const run = () =>
        serverActions.unarchiveIssueAction({ op: 'unarchive', workspaceId, issueId });

      apply({
        message: 'Restored',
        affectedIds: [issueId],
        undo: () => useIssues.getState().setOne(snapshot as Issue),
        retry: () => run(),
        run,
      });
    },

    bulkArchive: (issueIds: string[], workspaceId: string) => {
      if (issueIds.length === 0) return;
      const prevIssues = useIssues.getState().issues.filter(
        (i) => issueIds.includes(i.id ?? i.externalId ?? ''),
      );
      const snapshots = new Map(prevIssues.map((i) => [i.id ?? i.externalId ?? '', { ...i }]));

      useIssues.setState((s) => ({
        issues: s.issues.map((i) =>
          issueIds.includes(i.id ?? i.externalId ?? '') ? { ...i, archivedAt: new Date() as unknown } : i,
        ),
      }));

      const run = () =>
        serverActions.bulkArchiveAction({ op: 'bulkArchive', workspaceId, issueIds });

      apply({
        message: `Archived ${issueIds.length}`,
        affectedIds: issueIds,
        undo: () =>
          useIssues.setState((s) => ({
            issues: s.issues.map((i) => {
              const snap = snapshots.get(i.id ?? i.externalId ?? '');
              return snap ? ({ ...snap } as typeof i) : i;
            }),
          })),
        retry: () => run(),
        run,
      });
    },

    bulkSetStatus: (issueIds: string[], status: StatusKey, workspaceId: string) => {
      if (issueIds.length === 0) return;
      const prevIssues = useIssues.getState().issues.filter(
        (i) => issueIds.includes(i.id ?? i.externalId ?? ''),
      );
      const snapshots = new Map(prevIssues.map((i) => [i.id ?? i.externalId ?? '', { ...i }]));

      useIssues.setState((s) => ({
        issues: s.issues.map((i) =>
          issueIds.includes(i.id ?? i.externalId ?? '') ? { ...i, status } : i,
        ),
      }));

      const run = () =>
        serverActions.bulkSetStatusAction({ op: 'bulkSetStatus', workspaceId, issueIds, status });

      apply({
        message: `Moved ${issueIds.length} to ${statusLabel(status)}`,
        affectedIds: issueIds,
        undo: () =>
          useIssues.setState((s) => ({
            issues: s.issues.map((i) => {
              const snap = snapshots.get(i.id ?? i.externalId ?? '');
              return snap ? ({ ...snap } as typeof i) : i;
            }),
          })),
        retry: () => run(),
        run,
      });
    },

    createIssue: (
      input: Omit<Parameters<typeof serverActions.createIssueAction>[0], 'op'>,
    ) => serverActions.createIssueAction({ ...input, op: 'create' }),

    createProject: (
      input: Omit<Parameters<typeof serverActions.createProjectAction>[0], 'op'>,
    ) => serverActions.createProjectAction({ ...input, op: 'create' }),

    updateProject: (
      input: Omit<Parameters<typeof serverActions.updateProjectAction>[0], 'op'>,
    ) => serverActions.updateProjectAction({ ...input, op: 'update' }),

    archiveProject: (
      input: Omit<Parameters<typeof serverActions.archiveProjectAction>[0], 'op'>,
    ) => serverActions.archiveProjectAction({ ...input, op: 'archive' }),

    addProjectMember: (
      input: Omit<Parameters<typeof serverActions.addProjectMemberAction>[0], 'op'>,
    ) => serverActions.addProjectMemberAction({ ...input, op: 'addMember' }),

    removeProjectMember: (
      input: Omit<Parameters<typeof serverActions.removeProjectMemberAction>[0], 'op'>,
    ) => serverActions.removeProjectMemberAction({ ...input, op: 'removeMember' }),

    createCycle: (
      input: Omit<Parameters<typeof serverActions.createCycleAction>[0], 'op'>,
    ) => serverActions.createCycleAction({ ...input, op: 'create' }),

    updateCycle: (
      input: Omit<Parameters<typeof serverActions.updateCycleAction>[0], 'op'>,
    ) => serverActions.updateCycleAction({ ...input, op: 'update' }),

    completeCycle: (
      input: Omit<Parameters<typeof serverActions.completeCycleAction>[0], 'op'>,
    ) => serverActions.completeCycleAction({ ...input, op: 'complete' }),

    createComment: (
      input: Omit<Parameters<typeof serverActions.createCommentAction>[0], 'op'>,
    ) => serverActions.createCommentAction({ ...input, op: 'create' }),

    updateComment: (
      input: Omit<Parameters<typeof serverActions.updateCommentAction>[0], 'op'>,
    ) => serverActions.updateCommentAction({ ...input, op: 'update' }),

    deleteComment: (
      input: Omit<Parameters<typeof serverActions.deleteCommentAction>[0], 'op'>,
    ) => serverActions.deleteCommentAction({ ...input, op: 'delete' }),

    markNotificationRead: (
      input: Omit<Parameters<typeof serverActions.markNotificationReadAction>[0], 'op'>,
    ) => serverActions.markNotificationReadAction({ ...input, op: 'markRead' }),

    markAllNotificationsRead: (
      input: Omit<Parameters<typeof serverActions.markAllNotificationsReadAction>[0], 'op'>,
    ) => serverActions.markAllNotificationsReadAction({ ...input, op: 'markAllRead' }),

    snoozeNotification: (
      input: Omit<Parameters<typeof serverActions.snoozeNotificationAction>[0], 'op'>,
    ) => serverActions.snoozeNotificationAction({ ...input, op: 'snooze' }),

    createSavedView: (
      input: Omit<Parameters<typeof serverActions.createSavedViewAction>[0], 'op'>,
    ) => serverActions.createSavedViewAction({ ...input, op: 'create' }),

    updateSavedView: (
      input: Omit<Parameters<typeof serverActions.updateSavedViewAction>[0], 'op'>,
    ) => serverActions.updateSavedViewAction({ ...input, op: 'update' }),

    deleteSavedView: (
      input: Omit<Parameters<typeof serverActions.deleteSavedViewAction>[0], 'op'>,
    ) => serverActions.deleteSavedViewAction({ ...input, op: 'delete' }),

    toggleStarred: (
      input: Omit<Parameters<typeof serverActions.toggleStarredAction>[0], 'op'>,
    ) => serverActions.toggleStarredAction({ ...input, op: 'toggleStarred' }),

    changeRole: (
      input: Omit<Parameters<typeof serverActions.changeRoleAction>[0], 'op'>,
    ) => serverActions.changeRoleAction({ ...input, op: 'changeRole' }),

    removeMember: (
      input: Omit<Parameters<typeof serverActions.removeMemberAction>[0], 'op'>,
    ) => serverActions.removeMemberAction({ ...input, op: 'removeMember' }),
  };
}
