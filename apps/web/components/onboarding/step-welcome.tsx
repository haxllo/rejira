'use client';

import { useSession } from '@/lib/auth/client';
import { Button } from '@/components/primitives/button';

export function StepWelcome({ onContinue }: { onContinue: () => void }) {
  const { data: session } = useSession();
  const user = session?.user as Record<string, unknown> | undefined;
  const displayName = (user?.name as string) ?? (user?.email as string)?.split('@')[0] ?? 'there';

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--color-accent)] text-[24px] font-bold text-[var(--color-accent-fg)] shadow-[var(--shadow-1)]">
        R
      </div>

      <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-text)]">
        Welcome to rejira
      </h1>

      <p className="mt-3 text-[14px] text-[var(--color-text-muted)] leading-relaxed">
        Linear-grade speed for your Jira workspace.
      </p>

      <p className="mt-6 text-[16px] font-medium text-[var(--color-text)]">
        Hi {displayName}!
      </p>

      <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
        Let&apos;s set up your workspace in just a few steps.
      </p>

      <div className="mt-10">
        <Button variant="primary" size="lg" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
