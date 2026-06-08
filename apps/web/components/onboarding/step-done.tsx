'use client';

import { motion } from 'motion/react';
import { Button } from '@/components/primitives/button';
import { CheckIcon } from '@/components/icons';
import type { WizardState } from './workspace-setup-wizard';

const springEase = { type: 'spring' as const, stiffness: 300, damping: 24 };

interface StepDoneProps {
  state: WizardState;
  onGoToWorkspace: () => void;
}

export function StepDone({ state, onGoToWorkspace }: StepDoneProps) {
  const summaryItems: string[] = [];

  if (state.workspace) {
    summaryItems.push(`Workspace "${state.workspace.name}" will be configured`);
  }

  if (state.invitations.length > 0) {
    summaryItems.push(`${state.invitations.length} team member${state.invitations.length !== 1 ? 's' : ''} will be invited`);
  }

  if (state.project) {
    summaryItems.push(`Project "${state.project.name}" (${state.project.key}) will be created`);
  }

  const hasContent = summaryItems.length > 0;
  if (!hasContent) {
    summaryItems.push('Your workspace is ready to go');
  }

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-soft)] text-[var(--color-success)]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
      >
        <CheckIcon size={28} />
      </motion.div>

      {hasContent ? (
        <>
          <h2 className="text-[22px] font-semibold tracking-tight text-[var(--color-text)]">
            You&apos;re all set!
          </h2>
          <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
            Here&apos;s a summary of your setup:
          </p>
        </>
      ) : (
        <>
          <h2 className="text-[22px] font-semibold tracking-tight text-[var(--color-text)]">
            You skipped setup
          </h2>
          <p className="mt-2 text-[14px] text-[var(--color-text-muted)]">
            You can set up your workspace, invite teammates, and create projects later from the settings.
          </p>
        </>
      )}

      <div className="mt-6 w-full space-y-2">
        {summaryItems.map((item, index) => (
          <motion.div
            key={item}
            initial={{ x: -8, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ ...springEase, delay: 0.15 + index * 0.08 }}
            className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3 text-left"
          >
            <CheckIcon size={14} className="shrink-0 text-[var(--color-success)]" />
            <span className="text-[13px] text-[var(--color-text)]">{item}</span>
          </motion.div>
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
