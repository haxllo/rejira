'use client';

import { useState } from 'react';
import { useSession } from '@/lib/auth/client';
import { Button } from '@/components/primitives/button';

export function EmailForm() {
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const currentEmail = (user?.email as string) ?? '';

  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChangeEmail = async () => {
    setError('');
    setSuccess(false);

    if (!newEmail.trim()) {
      setError('Please enter a new email address');
      return;
    }

    if (newEmail.trim() === currentEmail) {
      setError('New email is the same as your current email');
      return;
    }

    setLoading(true);

    try {
      const { authClient } = await import('@/lib/auth/client');
      const changeEmail = (authClient as unknown as Record<string, CallableFunction>).changeEmail;
      if (changeEmail) {
        await changeEmail({ newEmail: newEmail.trim() });
      }
      setSuccess(true);
      setNewEmail('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
      <div className="border-b border-[var(--color-border)] px-5 py-3.5">
        <h2 className="text-[13.5px] font-semibold text-[var(--color-text)]">Email</h2>
        <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
          The email address associated with your account.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--color-text)]">Current email</span>
          <input
            type="email"
            value={currentEmail}
            disabled
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-[13px] text-[var(--color-text-muted)] outline-none cursor-not-allowed"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--color-text)]">New email</span>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@example.com"
            autoComplete="email"
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-text)] outline-none transition-colors duration-[120ms] focus:border-[var(--color-border-strong)]"
          />
          <p className="text-[11px] text-[var(--color-text-faint)]">
            You&apos;ll need to verify both your old and new email addresses.
          </p>
        </label>

        {error && (
          <div className="rounded-md border border-[var(--color-danger)]/24 bg-[var(--color-danger)]/8 px-3 py-2 text-[12px] text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-[var(--color-success)]/24 bg-[var(--color-success-soft)] px-3 py-2 text-[12px] text-[var(--color-success)]">
            Check your old email and new email for verification links.
          </div>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={handleChangeEmail}
          disabled={loading || !newEmail.trim() || newEmail.trim() === currentEmail}
        >
          {loading ? 'Sending...' : 'Change email'}
        </Button>
      </div>
    </div>
  );
}
