'use client';

import { useState } from 'react';
import { WorkspaceInvitesTable } from '@/components/team/workspace-invites-table';
import { WorkspaceInviteForm } from '@/components/team/workspace-invite-form';
import { useWorkspace } from '@/hooks/useWorkspace';
import type { MembershipWithUser } from '@/lib/db/rsc';

export function MembersTabs({ initialMemberships }: { initialMemberships: MembershipWithUser[] }) {
  const workspace = useWorkspace();
  const [tab, setTab] = useState<'members' | 'invites'>('members');

  return (
    <div style={{ padding: '24px 32px', maxWidth: 900 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: 'var(--color-text)' }}>
        Members
      </h1>
      <p style={{ fontSize: 13, color: 'var(--color-text-subtle)', marginBottom: 24 }}>
        Manage workspace members, roles, and invitations.
      </p>

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setTab('members')}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            border: 'none',
            borderBottom: tab === 'members' ? '2px solid var(--color-accent)' : '2px solid transparent',
            background: 'none',
            color: tab === 'members' ? 'var(--color-text)' : 'var(--color-text-subtle)',
            cursor: 'pointer',
          }}
        >
          Members <span style={{ marginLeft: 4, fontFamily: 'monospace', fontSize: 11 }}>{initialMemberships.length}</span>
        </button>
        <button
          onClick={() => setTab('invites')}
          style={{
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 500,
            border: 'none',
            borderBottom: tab === 'invites' ? '2px solid var(--color-accent)' : '2px solid transparent',
            background: 'none',
            color: tab === 'invites' ? 'var(--color-text)' : 'var(--color-text-subtle)',
            cursor: 'pointer',
          }}
        >
          Pending Invites
        </button>
      </div>

      {tab === 'members' ? (
        <MembersReadOnlyView memberships={initialMemberships} />
      ) : (
        <div>
          <div style={{ marginBottom: 24, padding: 16, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface-1)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--color-text)' }}>Invite Members</h3>
            <WorkspaceInviteForm workspaceId={workspace.id} />
          </div>
          <WorkspaceInvitesTable workspaceId={workspace.id} />
        </div>
      )}
    </div>
  );
}

function MembersReadOnlyView({
  memberships,
}: {
  memberships: MembershipWithUser[];
}) {
  if (memberships.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: 13 }}>
        No members found
      </div>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-subtle)', fontWeight: 500 }}>
            Member
          </th>
          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-subtle)', fontWeight: 500 }}>
            Role
          </th>
          <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--color-text-subtle)', fontWeight: 500 }}>
            Joined
          </th>
        </tr>
      </thead>
      <tbody>
        {memberships.map((m) => (
          <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td style={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: m.userAvatarColor ?? 'var(--color-surface-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--color-fg)',
                  }}
                >
                  {(m.userName ?? '?')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>{m.userName ?? 'Unknown'}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>
                    {m.userEmail ?? ''}
                  </div>
                </div>
              </div>
            </td>
            <td style={{ padding: '8px 12px' }}>
              <span
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: m.role === 'owner' ? 'var(--color-accent)' : 'var(--color-surface-2)',
                  color: m.role === 'owner' ? 'var(--color-accent-fg)' : 'var(--color-text)',
                  fontWeight: m.role === 'owner' ? 600 : 500,
                  textTransform: 'capitalize',
                }}
              >
                {m.role}
              </span>
            </td>
            <td style={{ padding: '8px 12px', color: 'var(--color-text-subtle)', fontSize: 12 }}>
              {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '-'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
