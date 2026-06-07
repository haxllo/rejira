'use client';

import { Button } from '@/components/primitives/button';
import { CheckIcon } from '@/components/icons';
import type { WizardState } from './workspace-setup-wizard';

interface StepDoneProps {
  state: WizardState;
  onGoToWorkspace: () => void;
}

export function StepDone({ state, onGoToWorkspace }: StepDoneProps) {
  const summaryItems: string[] = [];

  if (state.workspace) {
    summaryItems.push(`Workspace "${state.workspace.name}" created`);
  }

  if (state.invitations.length > 0) {
    summaryItems.push(`${state.invitations.length} team member${state.invitations.length !== 1 ? 's' : ''} invited`);
  }

  if (state.project) {
    summaryItems.push(`Project "${state.project.name}" (${state.project.key}) created`);
  }

  if (summaryItems.length === 0) {
    summaryItems.push('Your workspace is ready');
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]">
        <CheckIcon size={28} />
      </div>

      <h2 className="text-[22px] font-semibold tracking-tight text-[var(--color-text)]">
        You&apos;re all set!
      </h2>
      <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
        Your workspace is ready. Here&apos;s what we did:
      </p>

      <div className="mt-6 w-full space-y-2">
        {summaryItems.map((item) => (
          <div
            key={item}
            className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3 text-left"
          >
            <CheckIcon size={14} className="shrink-0 text-[var(--color-success)]" />
            <span className="text-[13px] text-[var(--color-text)]">{item}</span>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Button variant="primary" size="lg" onClick={onGoToWorkspace}>
          Go to your workspace
        </Button>
      </div>
    </div>
  );
}
