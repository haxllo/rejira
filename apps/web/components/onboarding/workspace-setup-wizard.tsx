'use client';

import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { StepWelcome } from './step-welcome';
import { StepCreateWorkspace } from './step-create-workspace';
import { StepInviteTeam } from './step-invite-team';
import { StepCreateProject } from './step-create-project';
import { StepDone } from './step-done';

export interface WizardState {
  step: number;
  workspace: { name: string; slug: string } | null;
  invitations: { email: string; role: string }[];
  project: { name: string; key: string } | null;
}

const TOTAL_STEPS = 5;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 24 : -24, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir < 0 ? 24 : -24, opacity: 0 }),
};

const slideTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
};

export function WorkspaceSetupWizard({ onComplete }: { onComplete?: () => void }) {
  const [direction, setDirection] = useState(0);
  const [state, setState] = useState<WizardState>({
    step: 1,
    workspace: null,
    invitations: [],
    project: null,
  });

  const goNext = useCallback(() => {
    setDirection(1);
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, TOTAL_STEPS) }));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  }, []);

  const updateState = useCallback(
    (patch: Partial<WizardState>) => setState((prev) => ({ ...prev, ...patch })),
    [],
  );

  const handleDone = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center px-6 py-12">
      <div className="mb-10 flex items-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 w-8 rounded-full transition-colors duration-[220ms]',
              i + 1 < state.step
                ? 'bg-[var(--color-accent)]'
                : i + 1 === state.step
                  ? 'bg-[var(--color-text)]'
                  : 'bg-[var(--color-surface-2)]',
            )}
          />
        ))}
      </div>

      <div className="w-full overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={state.step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
          >
            {state.step === 1 && <StepWelcome onContinue={goNext} />}

            {state.step === 2 && (
              <StepCreateWorkspace
                initialName={state.workspace?.name ?? ''}
                initialSlug={state.workspace?.slug ?? ''}
                onBack={goBack}
                onContinue={(name, slug) => {
                  updateState({ workspace: { name, slug } });
                  goNext();
                }}
              />
            )}

            {state.step === 3 && (
              <StepInviteTeam
                initialInvites={state.invitations}
                onBack={goBack}
                onSkip={goNext}
                onContinue={(invites) => {
                  updateState({ invitations: invites });
                  goNext();
                }}
              />
            )}

            {state.step === 4 && (
              <StepCreateProject
                initialName={state.project?.name ?? ''}
                initialKey={state.project?.key ?? ''}
                onBack={goBack}
                onSkip={goNext}
                onContinue={(name, key) => {
                  updateState({ project: { name, key } });
                  goNext();
                }}
              />
            )}

            {state.step === 5 && (
              <StepDone
                state={state}
                onGoToWorkspace={handleDone}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
