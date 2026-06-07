'use client';

import { useRouter } from 'next/navigation';
import { WorkspaceSetupWizard } from '@/components/onboarding/workspace-setup-wizard';
import { useWorkspaceList } from '@/hooks/useWorkspaceList';
import { Button } from '@/components/primitives/button';

export default function OnboardingPage() {
  const router = useRouter();
  const { workspaces, isLoading } = useWorkspaceList();

  const handleComplete = () => {
    router.push('/inbox');
  };

  const handleSkipToWorkspace = () => {
    router.push('/inbox');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="text-[13px] text-[var(--color-text-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      {workspaces.length > 0 && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-1)] px-6 py-3">
          <div className="mx-auto flex max-w-lg items-center justify-between">
            <span className="text-[12px] text-[var(--color-text-muted)]">
              You already have {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}.
            </span>
            <Button variant="ghost" size="sm" onClick={handleSkipToWorkspace}>
              Skip to workspace
            </Button>
          </div>
        </div>
      )}

      <WorkspaceSetupWizard onComplete={handleComplete} />
    </div>
  );
}
