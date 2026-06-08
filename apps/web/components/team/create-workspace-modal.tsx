'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth/client';
import { createWorkspaceAction } from '@/lib/auth/server-actions';

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onCreated: (slug: string) => void;
}

export function CreateWorkspaceModal({ onClose, onCreated }: CreateWorkspaceModalProps) {
  const { data: session } = useSession();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateSlug = (n: string) =>
    n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const isValidSlug = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length >= 3 && s.length <= 32;

  const handleCreate = async () => {
    setError('');
    if (!name.trim()) {
      setError('Workspace name is required');
      return;
    }
    if (!isValidSlug(slug)) {
      setError('Slug must be 3-32 characters, lowercase letters, numbers, and hyphens only');
      return;
    }

    setLoading(true);
    try {
      const result = await createWorkspaceAction(session?.user?.id ?? '', name.trim(), slug);
      onCreated(result.slug);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 101,
          width: 400,
          padding: 24,
          borderRadius: 12,
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: 'var(--color-text)' }}>
          Create Workspace
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-subtle)' }}>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Workspace"
              autoFocus
              style={{
                height: 40,
                padding: '0 12px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                color: 'var(--color-fg)',
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-subtle)' }}>
              Slug {!isValidSlug(slug) && slug ? <span style={{ color: 'hsl(0 80% 70%)' }}>invalid</span> : null}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span style={{
                height: 40,
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                border: '1px solid var(--color-border)',
                borderRight: 'none',
                borderRadius: '6px 0 0 6px',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text-subtle)',
                fontSize: 13,
              }}>
                rejira.app/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-workspace"
                style={{
                  flex: 1,
                  height: 40,
                  padding: '0 12px',
                  borderRadius: '0 6px 6px 0',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-fg)',
                  fontSize: 14,
                }}
              />
            </div>
          </label>

          {error && (
            <div style={{ color: 'hsl(0 80% 70%)', fontSize: 13 }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim() || !isValidSlug(slug)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: loading || !name.trim() || !isValidSlug(slug) ? 'var(--color-surface-2)' : 'var(--color-accent)',
                color: loading || !name.trim() || !isValidSlug(slug) ? 'var(--color-text-subtle)' : 'var(--color-accent-fg)',
                fontSize: 13,
                fontWeight: 600,
                cursor: loading || !name.trim() || !isValidSlug(slug) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
