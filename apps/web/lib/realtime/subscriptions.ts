import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './client';

type TableName =
  | 'issues'
  | 'comments'
  | 'notifications'
  | 'memberships'
  | 'cycles'
  | 'projects'
  | 'saved_views';

export function subscribeToTable({
  table,
  filterColumn,
  filterValue,
  onChange,
}: {
  table: TableName;
  filterColumn: string;
  filterValue: string;
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}): { unsubscribe: () => void } {
  try {
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`${table}:${filterColumn}=${filterValue}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `${filterColumn}=eq.${filterValue}`,
        },
        onChange as (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  } catch (error) {
    console.warn(`[realtime] subscription to ${table} failed:`, error);
    return { unsubscribe: () => {} };
  }
}

export function subscribeToIssues(
  workspaceId: string,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
): { unsubscribe: () => void } {
  return subscribeToTable({ table: 'issues', filterColumn: 'workspaceId', filterValue: workspaceId, onChange });
}

export function subscribeToComments(
  issueId: string,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
): { unsubscribe: () => void } {
  return subscribeToTable({ table: 'comments', filterColumn: 'issue_id', filterValue: issueId, onChange });
}

export function subscribeToNotifications(
  userId: string,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
): { unsubscribe: () => void } {
  return subscribeToTable({ table: 'notifications', filterColumn: 'user_id', filterValue: userId, onChange });
}

export function subscribeToMemberships(
  workspaceId: string,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
): { unsubscribe: () => void } {
  return subscribeToTable({ table: 'memberships', filterColumn: 'workspaceId', filterValue: workspaceId, onChange });
}

export function subscribeToCycles(
  workspaceId: string,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
): { unsubscribe: () => void } {
  return subscribeToTable({ table: 'cycles', filterColumn: 'workspaceId', filterValue: workspaceId, onChange });
}

export function subscribeToProjects(
  workspaceId: string,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
): { unsubscribe: () => void } {
  return subscribeToTable({ table: 'projects', filterColumn: 'workspaceId', filterValue: workspaceId, onChange });
}

export function subscribeToSavedViews(
  workspaceId: string,
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
): { unsubscribe: () => void } {
  return subscribeToTable({ table: 'saved_views', filterColumn: 'workspaceId', filterValue: workspaceId, onChange });
}
