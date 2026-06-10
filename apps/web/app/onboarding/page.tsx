'use client';

import { useRouter } from 'next/navigation';
import { WorkspaceSetupWizard } from '@/components/onboarding/workspace-setup-wizard';
import { useWorkspaceList } from '@/hooks/useWorkspaceList';
import { Button } from '@/components/primitives/button';
import { getSession } from '@/lib/auth/client';
import { createWorkspaceAction } from '@/lib/auth/server-actions';

export default function OnboardingPage() {
  const router = useRouter();
  const { workspaces, isLoading } = useWorkspaceList();

  const handleComplete = async () => {
    // If the user somehow has no workspace yet (e.g. they signed up
    // before auto-creation was added), create a default one now so
    // the redirect to /inbox doesn't trigger another redirect loop.
    if (workspaces.length === 0) {
      try {
        const { data: sessionData } = await getSession();
        const userId = (sessionData?.user as Record<string, unknown> | undefined)?.id as string | undefined;
        if (userId) {
          const slugSuffix = userId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
          await createWorkspaceAction(userId, 'My Workspace', `my-workspace-${slugSuffix}`);
        }
      } catch (err) {
        console.error('[onboarding] Failed to create default workspace', err);
      }
    }
    router.push('/inbox');
  };

  const handleSkipToWorkspace = () => {
    if (confirm('Navigating away will discard your current setup. Proceed?')) {
      router.push('/inbox');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-48 animate-pulse rounded-md bg-[var(--color-surface-2)]" />
          <div className="h-4 w-32 animate-pulse rounded-md bg-[var(--color-surface-2)]" />
        </div>
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
