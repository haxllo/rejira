"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { SearchIcon, SparklesIcon, BellIcon, HelpCircleIcon } from "@/components/icons";
import { Kbd } from "@/components/primitives/kbd";
import { Avatar } from "@/components/primitives/avatar";
import { useUI } from "@/lib/state/ui";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useRealtimeMemberships } from "@/hooks/useRealtimeMemberships";
import { WorkspaceSwitcher } from "@/components/team/workspace-switcher";
import { cn } from "@/lib/utils";

export function TopBar() {
  const router = useRouter();
  const path = usePathname();
  const setCommandOpen = useUI((s) => s.setCommandOpen);
  const me = useCurrentUser();
  const { id: workspaceId } = useWorkspace();
  useRealtimeMemberships(workspaceId ?? '');

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-[var(--color-border)]",
        "bg-[var(--color-bg)]/85 backdrop-blur-md",
      )}
    >
      {/* Brand + workspace switcher */}
      <WorkspaceSwitcher />

      {/* Search / command */}
      <button
        onClick={() => setCommandOpen(true)}
        className={cn(
          "ml-1 flex h-8 flex-1 max-w-[520px] items-center gap-2.5 rounded-md border border-[var(--color-border)]",
          "bg-[var(--color-surface-1)] px-3 text-left text-[12.5px] text-[var(--color-text-subtle)]",
          "hover:bg-[var(--color-surface-2)] hover:border-[var(--color-border-strong)] transition-colors",
        )}
      >
        <SearchIcon size={14} className="text-[var(--color-text-faint)]" />
        <span className="hidden sm:inline flex-1">Search issues, projects, views…</span>
        <span className="sm:hidden flex-1">Search…</span>
        <Kbd keys={["⌘", "K"]} />
      </button>

      <div className="ml-auto flex items-center gap-1 pr-3">
        <TopBarAction icon={<SparklesIcon size={15} />} label="AI" />
        <TopBarAction icon={<BellIcon size={15} />} label="Inbox" onClick={() => router.push("/inbox")} active={path?.startsWith("/inbox")} />
        <TopBarAction icon={<HelpCircleIcon size={15} />} label="Help" />
        <div className="mx-1.5 h-5 w-px bg-[var(--color-border)]" />
        <button
          className="flex size-7 items-center justify-center rounded-md hover:bg-[var(--color-hover)]"
          aria-label="Account"
        >
          <Avatar name={me?.name ?? 'User'} size="sm" />
        </button>
      </div>
    </header>
  );
}

function TopBarAction({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors",
        "hover:bg-[var(--color-hover)] hover:text-[var(--color-text)]",
        active && "bg-[var(--color-surface-2)] text-[var(--color-text)]",
      )}
    >
      {icon}
    </button>
  );
}
