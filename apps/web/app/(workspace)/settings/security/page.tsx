'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon } from '@/components/icons';

export default function WorkspaceSecurityPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState('');

  const [require2faAdmins, setRequire2faAdmins] = React.useState(false);
  const [require2faMembers, setRequire2faMembers] = React.useState(false);
  const [allowedDomains, setAllowedDomains] = React.useState('');
  const [sessionMaxAge, setSessionMaxAge] = React.useState(7);
  const [disablePassword, setDisablePassword] = React.useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSaved(false);

    try {
      const res = await fetch('/api/workspace-security-policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          require_2fa_for_admins: require2faAdmins,
          require_2fa_for_members: require2faMembers,
          allowed_email_domains: allowedDomains
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean),
          session_max_age_days: sessionMaxAge,
          disable_password_signin: disablePassword,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save policy');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-1 text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-[120ms]"
        >
          <ChevronLeftIcon size={12} />
          Settings
        </Link>

        <h1 className="mb-2 text-[20px] font-semibold tracking-tight text-[var(--color-text)]">
          Workspace Security
        </h1>
        <p className="mb-8 text-[13px] text-[var(--color-text-muted)]">
          Configure security policies for all members of this workspace.
        </p>

        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-400">
              {error}
            </div>
          )}
          {saved && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-[13px] text-green-400">
              Security policy saved.
            </div>
          )}

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
            <h2 className="mb-4 text-[14px] font-medium text-[var(--color-text)]">
              Authentication
            </h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-[13px] font-medium text-[var(--color-text)]">
                    Require 2FA for admins
                  </span>
                  <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                    All workspace admins and owners must have two-factor authentication enabled.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={require2faAdmins}
                  onChange={(e) => setRequire2faAdmins(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-border)]"
                />
              </label>

              <label className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-[13px] font-medium text-[var(--color-text)]">
                    Require 2FA for members
                  </span>
                  <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                    All workspace members must have two-factor authentication enabled.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={require2faMembers}
                  onChange={(e) => setRequire2faMembers(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-border)]"
                />
              </label>

              <label className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-[13px] font-medium text-[var(--color-text)]">
                    Disable password sign-in
                  </span>
                  <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                    Require OAuth, magic link, or passkey to sign in. Password-based sign-in is disabled.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-border)]"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
            <h2 className="mb-4 text-[14px] font-medium text-[var(--color-text)]">
              Access Control
            </h2>

            <div className="space-y-4">
              <label className="block">
                <span className="text-[13px] font-medium text-[var(--color-text)]">
                  Allowed email domains
                </span>
                <p className="mt-0.5 mb-2 text-[12px] text-[var(--color-text-muted)]">
                  Comma-separated list. Leave empty to allow all domains.
                </p>
                <input
                  type="text"
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                  placeholder="acme.com, example.dev"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-5">
            <h2 className="mb-4 text-[14px] font-medium text-[var(--color-text)]">
              Session
            </h2>

            <label className="block">
              <span className="text-[13px] font-medium text-[var(--color-text)]">
                Session max age (days)
              </span>
              <p className="mt-0.5 mb-2 text-[12px] text-[var(--color-text-muted)]">
                Users will be signed out after this many days. Default is 7.
              </p>
              <input
                type="number"
                value={sessionMaxAge}
                onChange={(e) => setSessionMaxAge(Number(e.target.value))}
                min={1}
                max={365}
                className="w-full max-w-[120px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-[13px] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-[13px] font-medium text-white transition-colors duration-[120ms] hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save policy'}
          </button>
        </form>
      </div>
    </div>
  );
}
