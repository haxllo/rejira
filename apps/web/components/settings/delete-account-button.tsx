'use client';

import { useState } from 'react';
import { useSession, signOut } from '@/lib/auth/client';
import { Button } from '@/components/primitives/button';
import { cn } from '@/lib/utils';

export function DeleteAccountButton() {
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const userEmail = (user?.email as string) ?? '';

  const [showModal, setShowModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emailMatches = confirmEmail === userEmail;

  const handleDelete = async () => {
    if (!emailMatches) {
      setError('Email address does not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail }),
      });

      if (!res.ok) throw new Error('Failed to delete account');

      await signOut();
      window.location.href = '/?deleted=true';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-lg border border-[var(--color-danger)]/20 bg-[var(--color-surface-1)]">
        <div className="border-b border-[var(--color-danger)]/12 px-5 py-3.5">
          <h2 className="text-[13.5px] font-semibold text-[var(--color-danger)]">Delete account</h2>
          <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
            Permanently delete your account and all associated data.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-[12px] text-[var(--color-text-muted)]">
            Your account will be deactivated for 30 days. You can restore it by signing in
            during that period. After 30 days, your data will be permanently deleted.
          </p>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowModal(true)}
          >
            Delete account
          </Button>
        </div>
      </div>

      {showModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] p-6 shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
            <h3 className="text-[16px] font-semibold text-[var(--color-text)]">
              Delete your account
            </h3>
            <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
              This action is not immediate. Your account will be deactivated for 30 days.
              You can restore it by signing in.
            </p>

            <div className="mt-4 rounded-md border border-[var(--color-danger)]/24 bg-[var(--color-danger)]/8 px-3 py-2 text-[12px] text-[var(--color-danger)]">
              All your data across all workspaces will be permanently deleted after 30 days.
            </div>

            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-[12px] font-medium text-[var(--color-text)]">
                Type your email to confirm
              </span>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={userEmail}
                autoComplete="email"
                className={cn(
                  'h-9 rounded-md border bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-text)] outline-none transition-colors duration-[120ms]',
                  confirmEmail && !emailMatches
                    ? 'border-[var(--color-danger)]/40'
                    : 'border-[var(--color-border)] focus:border-[var(--color-border-strong)]',
                )}
              />
            </label>

            {error && (
              <div className="mt-3 rounded-md border border-[var(--color-danger)]/24 bg-[var(--color-danger)]/8 px-3 py-2 text-[12px] text-[var(--color-danger)]">
                {error}
              </div>
            )}

            <div className="mt-6 flex gap-2 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowModal(false);
                  setConfirmEmail('');
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={loading || !emailMatches}
              >
                {loading ? 'Deleting...' : 'I understand, delete my account'}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
