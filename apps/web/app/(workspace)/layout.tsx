import { Suspense } from "react";
import { TopBar } from "@/components/shell/top-bar";
import { PrimaryNav } from "@/components/shell/primary-nav";
import { CommandPalette } from "@/components/shell/command-palette";
import { StatusBar } from "@/components/shell/status-bar";
import { ToastHost } from "@/components/shell/toast";
import { IssueDrawer } from "@/components/issue/issue-drawer";
import { Cheatsheet } from "@/components/shell/cheatsheet";
import { CreateIssueDialog } from "@/components/issue/create-issue-dialog";
import { GlobalShortcuts } from "@/components/shell/global-shortcuts";
import { BulkActionBar } from "@/components/views/bulk-action-bar";
import { RouteChangeSelectionReset } from "@/components/shell/route-change-selection-reset";
import { DataSyncProvider } from "@/components/DataSyncProvider";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DataSyncProvider>
      <div className="flex h-dvh flex-col">
        <RouteChangeSelectionReset />
        <GlobalShortcuts />
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <PrimaryNav />
          <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
        </div>
        <Suspense fallback={null}>
          <StatusBar />
        </Suspense>
        <CommandPalette />
        <IssueDrawer />
        <CreateIssueDialog />
        <Cheatsheet />
        <ToastHost />
        <BulkActionBar />
      </div>
    </DataSyncProvider>
  );
}
