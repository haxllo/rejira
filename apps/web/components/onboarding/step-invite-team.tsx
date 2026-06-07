'use client';

import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { XIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface InviteEntry {
  email: string;
  role: string;
}

interface StepInviteTeamProps {
  initialInvites?: InviteEntry[];
  onBack: () => void;
  onSkip: () => void;
  onContinue: (invites: InviteEntry[]) => void;
}

const ROLES = ['member', 'admin'] as const;

export function StepInviteTeam({
  initialInvites = [],
  onBack,
  onSkip,
  onContinue,
}: StepInviteTeamProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('member');
  const [invites, setInvites] = useState<InviteEntry[]>(initialInvites);

  const handleAdd = () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) return;

    if (invites.some((inv) => inv.email === trimmed)) return;

    setInvites((prev) => [...prev, { email: trimmed, role }]);
    setEmail('');
  };

  const handleRemove = (emailToRemove: string) => {
    setInvites((prev) => prev.filter((inv) => inv.email !== emailToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex flex-col">
      <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-text)]">
        Invite your team
      </h2>
      <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
        Add teammates by email to collaborate on projects.
      </p>

      <div className="mt-8 space-y-4">
        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--color-text)]">
              Email address
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="colleague@example.com"
              autoFocus
              className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-[13px] text-[var(--color-text)] outline-none transition-colors duration-[120ms] focus:border-[var(--color-border-strong)]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-[var(--color-text)]">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-2 text-[13px] text-[var(--color-text)] outline-none transition-colors duration-[120ms] focus:border-[var(--color-border-strong)] cursor-pointer"
            >
              {ROLES.map((r) => (
                <option key={r} value={r} className="capitalize">
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <Button
            variant="secondary"
            size="md"
            onClick={handleAdd}
            disabled={!email.trim() || !email.includes('@')}
          >
            Add
          </Button>
        </div>

        {invites.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {invites.map((inv) => (
              <span
                key={inv.email}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[12px]',
                )}
              >
                <span className="text-[var(--color-text)]">{inv.email}</span>
                <span className="text-[11px] text-[var(--color-text-faint)] capitalize">
                  {inv.role}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(inv.email)}
                  className="text-[var(--color-text-faint)] hover:text-[var(--color-text)] transition-colors duration-[120ms]"
                  aria-label={`Remove ${inv.email}`}
                >
                  <XIcon size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        <p className="text-[12px] text-[var(--color-text-faint)]">
          You can invite teammates anytime from workspace settings.
        </p>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip for now
          </Button>
          <Button variant="primary" size="md" onClick={() => onContinue(invites)}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
