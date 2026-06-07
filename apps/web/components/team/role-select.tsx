'use client';

import type { WorkspaceRole } from '@/lib/auth/workspace-types';

const roles: { value: WorkspaceRole; label: string; description: string }[] = [
  { value: 'owner', label: 'Owner', description: 'Full control over workspace and billing' },
  { value: 'admin', label: 'Admin', description: 'Manage members, projects, and settings' },
  { value: 'member', label: 'Member', description: 'Create and manage issues' },
  { value: 'guest', label: 'Guest', description: 'View and comment on assigned issues' },
];

interface RoleSelectProps {
  value: string;
  onChange: (role: string) => void;
  disabled?: boolean;
  excludeOwner?: boolean;
  currentRole?: WorkspaceRole;
}

export function RoleSelect({ value, onChange, disabled, excludeOwner, currentRole }: RoleSelectProps) {
  const availableRoles = excludeOwner ? roles.filter((r) => r.value !== 'owner') : roles;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      title={roles.find((r) => r.value === value)?.description}
      style={{
        height: 36,
        padding: '0 8px',
        borderRadius: 6,
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
        color: 'var(--color-fg)',
        fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {availableRoles.map((r) => (
        <option
          key={r.value}
          value={r.value}
          disabled={disabled || (currentRole !== 'owner' && r.value === 'owner')}
        >
          {r.label}
        </option>
      ))}
    </select>
  );
}
