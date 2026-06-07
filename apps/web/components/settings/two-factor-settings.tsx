'use client';

import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { TwoFactorSetup } from '@/components/auth/two-factor-setup';
import { TwoFactorForm } from '@/components/auth/two-factor-form';
import { BackupCodesDisplay } from '@/components/auth/backup-codes-display';
import { disableTwoFactor } from '@/lib/auth/two-factor';
import { cn } from '@/lib/utils';

export function TwoFactorSettings() {
  const [showEnable, setShowEnable] = useState(false);
  const [verifyingTOTP, setVerifyingTOTP] = useState(false);
  const [showingCodes, setShowingCodes] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [twoFactorEnabled] = useState(false);
  const [backupCodesRemaining] = useState(0);

  const handleEnableDone = () => {
    setShowEnable(false);
    setSuccess('Two-factor authentication is now enabled.');
  };

  const handleDisable = async () => {
    setError('');
    setSuccess('');
    setVerifyingTOTP(true);
  };

  const handleDisableVerify = async (password: string) => {
    try {
      const result = await disableTwoFactor(password);
      if (result && 'error' in result) {
        setError((result as Record<string, unknown>).error as string ?? 'Failed to disable 2FA');
      } else {
        setSuccess('Two-factor authentication has been disabled.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disable 2FA');
    } finally {
      setVerifyingTOTP(false);
    }
  };

  const handleRegenerateCodes = () => {
    setError('');
    setSuccess('');
    setShowingCodes(true);
  };

  if (showEnable) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <div className="border-b border-[var(--color-border)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEnable(false)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-[120ms]"
            >
              Back
            </button>
          </div>
        </div>
        <div className="p-5">
          <TwoFactorSetup onDone={handleEnableDone} />
        </div>
      </div>
    );
  }

  if (showingCodes && twoFactorEnabled) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <div className="border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 className="text-[13.5px] font-semibold text-[var(--color-text)]">Backup codes</h2>
        </div>
        <div className="p-5">
          <BackupCodesDisplay codes={[]} />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowingCodes(false)}
            className="mt-4"
          >
            Close
          </Button>
        </div>
      </div>
    );
  }

  if (verifyingTOTP) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <div className="border-b border-[var(--color-border)] px-5 py-3.5">
          <h2 className="text-[13.5px] font-semibold text-[var(--color-text)]">Verify to disable 2FA</h2>
        </div>
        <div className="p-5">
          <TwoFactorForm onSuccess={() => setVerifyingTOTP(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
      <div className="border-b border-[var(--color-border)] px-5 py-3.5">
        <h2 className="text-[13.5px] font-semibold text-[var(--color-text)]">
          Two-factor authentication
        </h2>
        <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
          Add an extra layer of security to your account.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[var(--color-text)]">
              Status
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium',
                twoFactorEnabled
                  ? 'border border-[var(--color-success)]/24 bg-[var(--color-success-soft)] text-[var(--color-success)]'
                  : 'border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]',
              )}
            >
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {twoFactorEnabled ? (
          <div className="space-y-3">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2">
              <p className="text-[12px] text-[var(--color-text-muted)]">
                You have {backupCodesRemaining} backup codes remaining.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={handleRegenerateCodes}>
                Regenerate backup codes
              </Button>
              <Button variant="danger" size="sm" onClick={handleDisable}>
                Disable 2FA
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="primary" size="sm" onClick={() => setShowEnable(true)}>
            Enable two-factor authentication
          </Button>
        )}

        {error && (
          <div className="rounded-md border border-[var(--color-danger)]/24 bg-[var(--color-danger)]/8 px-3 py-2 text-[12px] text-[var(--color-danger)]">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-[var(--color-success)]/24 bg-[var(--color-success-soft)] px-3 py-2 text-[12px] text-[var(--color-success)]">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
