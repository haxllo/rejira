'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspaceList } from '@/hooks/useWorkspaceList';
import { useMembership } from '@/hooks/useMembership';
import { CreateWorkspaceModal } from './create-workspace-modal';

export function WorkspaceSwitcher() {
  const { workspaces, activeWorkspace, isLoading } = useWorkspaceList();
  const { role } = useMembership();
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const handleSwitch = useCallback(
    (slug: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set('w', slug);
      window.location.href = url.toString();
    },
    [],
  );

  const roleBadge = role ? (
    <span style={{
      fontSize: 10,
      padding: '1px 6px',
      borderRadius: 3,
      background: 'var(--color-surface-2)',
      color: 'var(--color-text-subtle)',
      fontWeight: 500,
      textTransform: 'capitalize',
    }}>
      {role}
    </span>
  ) : null;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px' }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--color-surface-2)' }} />
        <div style={{ width: 60, height: 12, borderRadius: 3, background: 'var(--color-surface-2)' }} />
      </div>
    );
  }

  return (
    <>
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            height: 48,
            padding: '0 16px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-text)',
            outline: 'none',
          }}
        >
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: `oklch(0.82 0.18 ${activeWorkspace?.name?.length ?? 1 * 30 % 360})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            color: 'oklch(0.16 0.005 250)',
          }}>
            {activeWorkspace?.name?.[0]?.toUpperCase() ?? 'R'}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>rejira</span>
            <span style={{ fontSize: 12, color: 'var(--color-text-subtle)' }}>
              / {activeWorkspace?.name ?? 'Select workspace'}
            </span>
          </div>
        </button>

        {open && (
          <>
            <div
              style={{
                position: 'absolute',
                left: 16,
                top: 48,
                zIndex: 50,
                width: 240,
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-1)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '6px 0' }}>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      handleSwitch(ws.slug);
                      setOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '8px 14px',
                      background: ws.isActive ? 'var(--color-surface-2)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-text)',
                      fontSize: 13,
                      textAlign: 'left',
                    }}
                  >
                    <span style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      background: 'var(--color-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--color-accent-fg)',
                    }}>
                      {ws.name[0]?.toUpperCase()}
                    </span>
                    <span style={{ flex: 1 }}>{ws.name}</span>
                    {ws.isActive && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-subtle)' }}>Active</span>
                    )}
                  </button>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', padding: '4px 0' }}>
                <button
                  onClick={() => {
                    setCreateModalOpen(true);
                    setOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 14px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--color-text-subtle)',
                    fontSize: 13,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                  Create workspace
                </button>
              </div>
            </div>

            <div
              style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              onClick={() => setOpen(false)}
            />
          </>
        )}
      </div>

      {createModalOpen && (
        <CreateWorkspaceModal
          onClose={() => setCreateModalOpen(false)}
          onCreated={(slug) => {
            setCreateModalOpen(false);
            handleSwitch(slug);
          }}
        />
      )}
    </>
  );
}
