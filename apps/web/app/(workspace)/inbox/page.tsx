import { getNotifications } from "@/lib/db/rsc";
import { db } from "@/lib/db/client";
import { users, issues } from "@/lib/db/schema";
import { InboxStream } from "@/components/inbox/inbox-stream";
import { inArray } from "drizzle-orm";

export const dynamic = "force-dynamic";

type InboxFilter = "all" | "unread" | "mentions";

interface InboxPageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const { filter: rawFilter } = await searchParams;
  const filter: InboxFilter =
    rawFilter === "unread" || rawFilter === "mentions" ? rawFilter : "all";

  const unreadOnly = filter === "unread";
  const notifications = await getNotifications({ unreadOnly, limit: 100 });

  const actorIds = Array.from(
    new Set(
      notifications
        .map((n) => n.userId)
        .filter((id): id is bigint => typeof id === "bigint"),
    ),
  );

  const issueIds = Array.from(
    new Set(
      notifications
        .map((n) => n.issueId)
        .filter((id): id is bigint => typeof id === "bigint"),
    ),
  );

  const actorNames: Record<string, string> = {};
  if (actorIds.length > 0) {
    const rows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, actorIds));
    for (const r of rows) actorNames[String(r.id)] = r.name;
  }

  const issueMeta: Record<string, { key: string; title: string; externalId: string }> = {};
  if (issueIds.length > 0) {
    const rows = await db
      .select({
        id: issues.id,
        externalId: issues.externalId,
        key: issues.key,
        title: issues.title,
      })
      .from(issues)
      .where(inArray(issues.id, issueIds));
    for (const r of rows) {
      issueMeta[String(r.id)] = { key: r.key, title: r.title, externalId: r.externalId };
    }
  }

  return (
    <InboxStream
      initialNotifications={notifications}
      actorNames={actorNames}
      issueMeta={issueMeta}
    />
  );
}
