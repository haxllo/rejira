import { Suspense } from 'react';
import { TopBar } from '@/components/shell/top-bar';
import { PrimaryNav } from '@/components/shell/primary-nav';
import { CommandPalette } from '@/components/shell/command-palette';
import { StatusBar } from '@/components/shell/status-bar';
import { ToastHost } from '@/components/shell/toast';
import { IssueDrawer } from '@/components/issue/issue-drawer';
import { Cheatsheet } from '@/components/shell/cheatsheet';
import { CreateIssueDialog } from '@/components/issue/create-issue-dialog';
import { GlobalShortcuts } from '@/components/shell/global-shortcuts';
import { BulkActionBar } from '@/components/views/bulk-action-bar';
import { RouteChangeSelectionReset } from '@/components/shell/route-change-selection-reset';
import { RequireAuth } from '@/components/auth/require-auth';
import { getUsers, getLabels, getIssuesForActiveWorkspace, getProjects } from '@/lib/db/rsc';
import { WorkspaceDataHydrator } from '@/components/workspace/data-hydrator';
import { WorkspaceRealtimeProvider } from '@/lib/realtime/workspace-provider';

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [users, labels, issues, projects] = await Promise.all([
    getUsers(),
    getLabels(),
    getIssuesForActiveWorkspace({ limit: 500 }),
    getProjects(),
  ]);
  return (
    <RequireAuth>
      <WorkspaceDataHydrator users={users} labels={labels} projects={projects} issues={issues} />
      <WorkspaceRealtimeProvider>
      <div className="flex h-dvh flex-col">
        <RouteChangeSelectionReset />
        <GlobalShortcuts />
        <Suspense fallback={<div className="h-12 border-b border-[var(--color-border)]" />}>
          <TopBar />
        </Suspense>
        <div className="flex min-h-0 flex-1">
          <PrimaryNav />
          <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
        </div>
        <Suspense fallback={null}>
          <StatusBar />
        </Suspense>
        <CommandPalette />
        <IssueDrawer issues={issues} />
        <CreateIssueDialog />
        <Cheatsheet />
        <ToastHost />
        <BulkActionBar />
      </div>
      </WorkspaceRealtimeProvider>
    </RequireAuth>
  );
}
