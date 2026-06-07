'use client';

import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { validatePassword, PASSWORD_MIN_LENGTH } from '@/lib/auth/password-policy';
import { resetPassword } from '@/lib/auth/client';
import { cn } from '@/lib/utils';

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: 'Enter a password', color: 'var(--color-text-faint)' };

  const checks = [
    password.length >= PASSWORD_MIN_LENGTH,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const passed = checks.filter(Boolean).length;

  if (passed <= 2) return { score: 1, label: 'Weak', color: 'var(--color-danger)' };
  if (passed === 3) return { score: 2, label: 'Fair', color: 'oklch(0.72 0.18 60)' };
  if (passed === 4) return { score: 3, label: 'Good', color: 'oklch(0.68 0.16 140)' };
  return { score: 4, label: 'Strong', color: 'var(--color-success)' };
}

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const strength = getStrength(newPassword);
  const validationError = newPassword ? validatePassword(newPassword) : null;
  const passwordsMatch = !confirmPassword || newPassword === confirmPassword;
  const canSubmit = currentPassword && newPassword && !validationError && passwordsMatch && !loading;

  const handleChangePassword = async () => {
    setError('');
    setSuccess(false);

    if (!currentPassword || !newPassword) {
      setError('Please fill in all required fields');
      return;
    }

    if (!passwordsMatch) {
      setError('New passwords do not match');
      return;
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword({ newPassword });

      if (result && 'error' in result) {
        const err = result as Record<string, unknown>;
        setError((err.error as Record<string, string>)?.message ?? 'Failed to change password');
      } else {
        setSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        if (signOutOthers) {
          const { authClient } = await import('@/lib/auth/client');
          const revoke = (authClient as unknown as Record<string, CallableFunction>).revokeOtherSessions;
          if (revoke) {
            try { await revoke(); } catch { /* session revocation is best-effort */ }
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
      <div className="border-b border-[var(--color-border)] px-5 py-3.5">
        <h2 className="text-[13.5px] font-semibold text-[var(--color-text)]">Change password</h2>
        <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
          Your new password must be at least {PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, and a number.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--color-text)]">Current password</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-text)] outline-none transition-colors duration-[120ms] focus:border-[var(--color-border-strong)]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--color-text)]">New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-text)] outline-none transition-colors duration-[120ms] focus:border-[var(--color-border-strong)]"
          />
          {newPassword && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                  <div
                    className="h-full rounded-full transition-all duration-[220ms]"
                    style={{
                      width: `${(strength.score / 4) * 100}%`,
                      background: strength.color,
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: strength.color }}
                >
                  {strength.label}
                </span>
              </div>
              {validationError && (
                <p className="text-[11px] text-[var(--color-danger)]">{validationError}</p>
              )}
            </div>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--color-text)]">Confirm new password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            className={cn(
              'h-9 rounded-md border bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-text)] outline-none transition-colors duration-[120ms]',
              confirmPassword && !passwordsMatch
                ? 'border-[var(--color-danger)]/40'
                : 'border-[var(--color-border)] focus:border-[var(--color-border-strong)]',
            )}
          />
          {confirmPassword && !passwordsMatch && (
            <p className="text-[11px] text-[var(--color-danger)]">Passwords do not match</p>
          )}
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={signOutOthers}
            onChange={(e) => setSignOutOthers(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent)] bg-[var(--color-bg)] cursor-pointer"
          />
          <span className="text-[12px] text-[var(--color-text-muted)]">
            Sign out of all other devices
          </span>
        </label>

        {error && (
          <div className="rounded-md border border-[var(--color-danger)]/24 bg-[var(--color-danger)]/8 px-3 py-2 text-[12px] text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-[var(--color-success)]/24 bg-[var(--color-success-soft)] px-3 py-2 text-[12px] text-[var(--color-success)]">
            Password changed successfully.
          </div>
        )}

        <Button
          variant="primary"
          size="sm"
          onClick={handleChangePassword}
          disabled={!canSubmit}
        >
          {loading ? 'Changing...' : 'Change password'}
        </Button>
      </div>
    </div>
  );
}
