import { Avatar } from "@/components/primitives/avatar";
import { relativeTime } from "@/lib/utils/date";
import type { Activity } from "@/lib/db/types";

export type ActivityWithActor = Activity & {
  actorName: string | null;
};

const VERB_LABEL: Record<string, string> = {
  created: "created",
  updated: "updated",
  deleted: "deleted",
  archived: "archived",
  restored: "restored",
  assigned: "assigned",
  unassigned: "unassigned",
  commented: "commented on",
  status_changed: "changed status of",
  priority_changed: "changed priority of",
};

function describe(activity: ActivityWithActor): string {
  const verb = VERB_LABEL[activity.verb] ?? activity.verb.replace(/_/g, " ");
  const metadata = (activity.after ?? activity.before ?? {}) as Record<string, unknown>;
  const objectType = activity.objectType.replace(/s$/, "");
  if (objectType === "issue" && metadata.key) {
    return `${verb} ${String(metadata.key)}${metadata.title ? ` (${metadata.title})` : ""}`;
  }
  if (objectType === "project" && metadata.name) {
    return `${verb} ${String(metadata.name)}`;
  }
  if (objectType === "cycle" && metadata.name) {
    return `${verb} ${String(metadata.name)}`;
  }
  return `${verb} ${objectType} #${activity.objectId}`;
}

export function ActivityFeed({ activities }: { activities: ActivityWithActor[] }) {
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[13px] text-[var(--color-text-muted)]">No activity yet</p>
        <p className="mt-1 text-[11.5px] text-[var(--color-text-faint)]">
          Changes to this project and its issues will appear here.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative ml-2 border-l border-[var(--color-border)] pl-5">
      {activities.map((activity) => {
        const actor = activity.actorName ?? "system";
        return (
          <li
            key={String(activity.id)}
            className="relative pb-5"
          >
            <span className="absolute -left-[27px] top-0.5 grid size-5 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-bg)]">
              <Avatar name={actor} size="xs" />
            </span>
            <div className="flex items-baseline gap-1.5 text-[12.5px] leading-[1.5]">
              <span className="font-medium text-[var(--color-text)]">{actor}</span>
              <span className="text-[var(--color-text-muted)]">{describe(activity)}</span>
            </div>
            <div className="mt-0.5 text-[11px] text-[var(--color-text-faint)]">
              {relativeTime(activity.createdAt.toISOString())}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
