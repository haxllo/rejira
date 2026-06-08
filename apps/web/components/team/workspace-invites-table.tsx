'use client';

import { useState, useEffect, useCallback } from 'react';
import type { WorkspaceInvite } from '@/lib/auth/workspace-types';
import { getInviteStatus } from '@/lib/auth/workspace-types';
import { getPendingInvitesAction, revokeInviteAction, resendInviteAction } from '@/lib/auth/server-actions';

interface WorkspaceInvitesTableProps {
  workspaceId: string;
}

export function WorkspaceInvitesTable({ workspaceId }: WorkspaceInvitesTableProps) {
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getPendingInvitesAction(workspaceId);
      setInvites(result);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  const handleRevoke = async (invitationId: string) => {
    if (!window.confirm('Revoke this invitation?')) return;
    try {
      await revokeInviteAction(invitationId);
      await loadInvites();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invite');
    }
  };

  const handleResend = async (invitationId: string) => {
    try {
      await resendInviteAction(invitationId);
      await loadInvites();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend invite');
    }
  };

  if (loading) return <div style={{ color: 'var(--color-text-subtle)', fontSize: 13, padding: 16 }}>Loading invites...</div>;

  return (
    <div>
      {error && <div style={{ color: 'hsl(0 80% 70%)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {invites.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: 13 }}>
          No pending invitations
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-subtle)', fontWeight: 500 }}>Email</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-subtle)', fontWeight: 500 }}>Role</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-subtle)', fontWeight: 500 }}>Sent</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-subtle)', fontWeight: 500 }}>Status</th>
              <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--color-text-subtle)', fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => {
              const status = getInviteStatus(inv);
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 12px' }}>{inv.email}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
                      {inv.role}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--color-text-subtle)', fontSize: 12 }}>
                    {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>
                    <StatusBadge status={status} />
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    {status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleResend(String(inv.id))}
                          style={{
                            background: 'none',
                            border: '1px solid var(--color-border)',
                            color: 'var(--color-text-subtle)',
                            fontSize: 12,
                            padding: '4px 10px',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleRevoke(String(inv.id))}
                          style={{
                            background: 'none',
                            border: '1px solid hsl(0 60% 40%)',
                            color: 'hsl(0 80% 70%)',
                            fontSize: 12,
                            padding: '4px 10px',
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          Revoke
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'hsl(48 80% 50%)',
    accepted: 'hsl(140 60% 50%)',
    expired: 'hsl(0 50% 50%)',
    revoked: 'hsl(0 50% 50%)',
  };

  return (
    <span style={{
      fontSize: 11,
      padding: '2px 8px',
      borderRadius: 4,
      background: `${colors[status] ?? 'var(--color-surface-2)'}22`,
      color: colors[status] ?? 'var(--color-text)',
      fontWeight: 500,
    }}>
      {status}
    </span>
  );
}
