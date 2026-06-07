'use client';

import { useState } from 'react';
import { WorkspaceMembersTable } from '@/components/team/workspace-members-table';
import { WorkspaceInvitesTable } from '@/components/team/workspace-invites-table';
import { WorkspaceInviteForm } from '@/components/team/workspace-invite-form';
import { useWorkspace } from '@/hooks/useWorkspace';

export default function MembersPage() {
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
          Members
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
        <WorkspaceMembersTable workspaceId={workspace.id} />
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
