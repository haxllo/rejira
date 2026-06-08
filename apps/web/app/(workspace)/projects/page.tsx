import Link from 'next/link';
import { ViewHeader } from '@/components/views/view-header';
import { getProjects, getIssuesForActiveWorkspace } from '@/lib/db/rsc';
import type { Project } from '@/lib/db/types';

export default async function ProjectsIndexPage() {
  const projects = await getProjects();
  const allIssues = await getIssuesForActiveWorkspace({ includeArchived: true, limit: 500 });

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Projects"
        description={`${projects.length} projects in this workspace`}
        count={projects.length}
      />
      <div className="flex-1 overflow-y-auto p-6">
        {projects.length === 0 ? (
          <div className="rounded border border-dashed border-[var(--color-border)] p-12 text-center text-[12.5px] text-[var(--color-text-faint)]">
            No projects yet
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const open = allIssues.filter((i) => i.projectId === p.id && i.status !== 'done' && i.status !== 'cancelled').length;
              return (
                <li key={p.externalId}>
                  <Link
                    href={`/projects/${p.key.toLowerCase()}`}
                    className="group flex h-full flex-col gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 transition-colors hover:border-[var(--color-border-strong)]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="grid size-6 place-items-center rounded text-[12px] font-bold text-[oklch(0.16_0.005_250)]"
                        style={{ background: p.iconColor ?? 'var(--color-accent)' }}
                      >
                        {(p.iconLetter ?? p.name.slice(0, 1)).toUpperCase()}
                      </span>
                      <span className="text-[14px] font-semibold text-[var(--color-text)]">{p.name}</span>
                      <span className="ml-auto font-mono text-[10.5px] text-[var(--color-text-faint)]">{p.key}</span>
                    </div>
                    {p.description && (
                      <p className="text-[12px] text-[var(--color-text-muted)]">{p.description}</p>
                    )}
                    <div className="mt-auto flex items-center gap-2 text-[11px] text-[var(--color-text-faint)]">
                      <span className="font-mono">{open}</span>
                      <span>open</span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
