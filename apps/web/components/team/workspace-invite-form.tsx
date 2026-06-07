'use client';

import { useState } from 'react';
import { RoleSelect } from './role-select';
import type { WorkspaceRole } from '@/lib/auth/workspace-types';

interface WorkspaceInviteFormProps {
  workspaceId: string;
  onInviteSent?: () => void;
}

export function WorkspaceInviteForm({ workspaceId, onInviteSent }: WorkspaceInviteFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<WorkspaceRole>('member');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState('');

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { inviteMember, bulkInvite } = await import('@/lib/auth/invites');

      if (bulkMode) {
        const emails = bulkEmails
          .split(/[\n,]/)
          .map((e) => e.trim())
          .filter(Boolean);
        if (emails.length === 0) {
          setError('Enter at least one email address');
          setLoading(false);
          return;
        }
        await bulkInvite(workspaceId, '', emails, role);
        setDone([...emails]);
        setBulkEmails('');
      } else {
        if (!email) {
          setError('Email is required');
          setLoading(false);
          return;
        }
        await inviteMember(workspaceId, '', { email: email.trim(), role });
        setDone([email]);
        setEmail('');
      }
      onInviteSent?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send invite';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {bulkMode ? (
            <textarea
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              placeholder="colleague@company.com&#10;another@company.com"
              rows={3}
              style={{
                flex: 1,
                minWidth: 250,
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-fg)',
                fontSize: 13,
                resize: 'vertical',
              }}
            />
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-subtle)' }}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                required={!bulkMode}
                style={{
                  height: 36,
                  padding: '0 10px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-fg)',
                  fontSize: 13,
                }}
              />
            </label>
          )}
          <RoleSelect value={role} onChange={(v) => setRole(v as WorkspaceRole)} excludeOwner />
          <button
            type="submit"
            disabled={loading}
            style={{
              height: 36,
              padding: '0 16px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--color-accent)',
              color: 'var(--color-accent-fg)',
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Sending...' : done.length > 0 ? `Sent to ${done.length}` : 'Send Invite'}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setBulkMode(!bulkMode)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-subtle)',
            fontSize: 12,
            cursor: 'pointer',
            alignSelf: 'flex-start',
            padding: 0,
          }}
        >
          {bulkMode ? 'Single invite' : 'Bulk invite'}
        </button>
        {error && <div style={{ color: 'hsl(0 80% 70%)', fontSize: 13 }}>{error}</div>}
        {done.length > 0 && !loading && (
          <div style={{ color: 'hsl(140 60% 70%)', fontSize: 13 }}>
            Invitation sent to {done.length > 1 ? `${done.length} people` : done[0]}
          </div>
        )}
      </form>
    </div>
  );
}
