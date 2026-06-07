'use client';

import { useState, useEffect, useCallback } from 'react';
import { RoleSelect } from './role-select';
import type { WorkspaceRole, MembershipWithUser } from '@/lib/auth/workspace-types';

interface WorkspaceMembersTableProps {
  workspaceId: string;
  currentUserId?: string;
}

export function WorkspaceMembersTable({ workspaceId }: WorkspaceMembersTableProps) {
  const [members, setMembers] = useState<MembershipWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'role' | 'joined'>('name');
  const [error, setError] = useState('');

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const { getMembers } = await import('@/lib/auth/invites');
      const result = await getMembers(workspaceId);
      setMembers(result);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const handleRoleChange = async (membershipId: string, newRole: WorkspaceRole) => {
    try {
      const { changeMemberRole } = await import('@/lib/auth/invites');
      await changeMemberRole(membershipId, newRole, '');
      await loadMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    }
  };

  const handleRemove = async (membershipId: string) => {
    if (!window.confirm('Remove this member from the workspace?')) return;
    try {
      const { removeMember } = await import('@/lib/auth/invites');
      await removeMember(membershipId, '');
      await loadMembers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const userName = m.user?.name?.toLowerCase() ?? '';
    const userEmail = m.user?.email?.toLowerCase() ?? '';
    return userName.includes(q) || userEmail.includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === 'name')
      return (a.user?.name ?? '').localeCompare(b.user?.name ?? '');
    if (sortKey === 'role')
      return a.role.localeCompare(b.role);
    if (sortKey === 'joined')
      return (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0);
    return 0;
  });

  if (loading) return <div style={{ color: 'var(--color-text-subtle)', fontSize: 13, padding: 16 }}>Loading members...</div>;

  return (
    <div>
      {error && <div style={{ color: 'hsl(0 80% 70%)', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email..."
        style={{
          width: '100%',
          maxWidth: 320,
          height: 32,
          padding: '0 10px',
          marginBottom: 12,
          borderRadius: 6,
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          color: 'var(--color-fg)',
          fontSize: 13,
        }}
      />

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
            <th
              onClick={() => setSortKey('name')}
              style={{ textAlign: 'left', padding: '8px 12px', cursor: 'pointer', color: 'var(--color-text-subtle)', fontWeight: 500 }}
            >
              Member {sortKey === 'name' ? '▾' : ''}
            </th>
            <th
              onClick={() => setSortKey('role')}
              style={{ textAlign: 'left', padding: '8px 12px', cursor: 'pointer', color: 'var(--color-text-subtle)', fontWeight: 500 }}
            >
              Role {sortKey === 'role' ? '▾' : ''}
            </th>
            <th
              onClick={() => setSortKey('joined')}
              style={{ textAlign: 'left', padding: '8px 12px', cursor: 'pointer', color: 'var(--color-text-subtle)', fontWeight: 500 }}
            >
              Joined {sortKey === 'joined' ? '▾' : ''}
            </th>
            <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--color-text-subtle)', fontWeight: 500 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => (
            <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '8px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: m.user?.avatarColor ?? 'var(--color-surface-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--color-fg)',
                    }}
                  >
                    {(m.user?.name ?? '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{m.user?.name ?? 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-subtle)' }}>{m.user?.email ?? ''}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '8px 12px' }}>
                {m.role === 'owner' ? (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--color-accent)', color: 'var(--color-accent-fg)', fontWeight: 600 }}>
                    Owner
                  </span>
                ) : (
                  <RoleSelect
                    value={m.role}
                    onChange={(v) => handleRoleChange(String(m.id), v as WorkspaceRole)}
                    excludeOwner
                    currentRole={m.role as WorkspaceRole}
                  />
                )}
              </td>
              <td style={{ padding: '8px 12px', color: 'var(--color-text-subtle)', fontSize: 12 }}>
                {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '-'}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                {m.role !== 'owner' && (
                  <button
                    onClick={() => handleRemove(String(m.id))}
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
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sorted.length === 0 && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: 13 }}>
          {search ? 'No members match your search' : 'No members found'}
        </div>
      )}
    </div>
  );
}
