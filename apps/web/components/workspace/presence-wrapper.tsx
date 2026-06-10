'use client';

import { PresenceProvider } from '@/lib/realtime/presence';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useUser } from '@/hooks/useUser';

export function PresenceWrapper({ children }: { children: React.ReactNode }) {
  const { id: workspaceId } = useWorkspace();
  const { user } = useUser();

  if (!workspaceId || !user?.id) {
    return <>{children}</>;
  }

  return (
    <PresenceProvider
      workspaceId={workspaceId}
      userId={user.id}
      userName={user.name ?? 'Unknown'}
      userAvatar={user.image ?? undefined}
    >
      {children}
    </PresenceProvider>
  );
}
