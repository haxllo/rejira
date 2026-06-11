import 'server-only';

import { db } from '@/lib/db';
import { issues } from '@/lib/db/schema/issues';
import { users } from '@/lib/db/schema/users';
import { workspaceSecurityPolicy } from '@/lib/db/schema/workspace-security-policy';
import { eq, inArray } from 'drizzle-orm';

async function sendSlackMessage(
  botToken: string,
  channel: string,
  text: string
): Promise<boolean> {
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ channel, text, unfurl_links: false }),
    });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function notifyIssueAssigned(
  workspaceId: string,
  issueId: string,
  assigneeIds: number[]
): Promise<void> {
  if (assigneeIds.length === 0) return;

  try {
    const [policy] = await db
      .select({ slackToken: workspaceSecurityPolicy.slackBotToken })
      .from(workspaceSecurityPolicy)
      .where(eq(workspaceSecurityPolicy.workspaceId, workspaceId))
      .limit(1);

    if (!policy?.slackToken) return;

    const [issue] = await db
      .select({ key: issues.key, title: issues.title })
      .from(issues)
      .where(eq(issues.externalId, issueId))
      .limit(1);

    if (!issue) return;

    const assignees = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(inArray(users.id, assigneeIds.map(BigInt)));

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const message = `🔔 You've been assigned *${issue.key}: ${issue.title}*\n${siteUrl}/issue/${issueId}`;

    for (const assignee of assignees) {
      const slackRes = await fetch('https://slack.com/api/users.lookupByEmail', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${policy.slackToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: assignee.email }),
      });
      const slackData = await slackRes.json();
      if (slackData.ok && slackData.user?.id) {
        sendSlackMessage(policy.slackToken, slackData.user.id, message).catch(() => {});
      }
    }
  } catch {
    // Fire-and-forget — do not break the mutation
  }
}
