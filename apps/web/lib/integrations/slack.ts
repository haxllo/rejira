import 'server-only';

import { db } from '@/lib/db';
import { workspaceSecurityPolicy } from '@/lib/db/schema/workspace-security-policy';
import { eq } from 'drizzle-orm';
import { issues } from '@/lib/db/schema/issues';

export async function sendSlackDM(
  workspaceId: string,
  userSlackId: string,
  message: string
): Promise<boolean> {
  try {
    const [policy] = await db
      .select({ token: workspaceSecurityPolicy.slackBotToken })
      .from(workspaceSecurityPolicy)
      .where(eq(workspaceSecurityPolicy.workspaceId, workspaceId))
      .limit(1);

    if (!policy?.token) return false;

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${policy.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: userSlackId,
        text: message,
        unfurl_links: false,
      }),
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
  assigneeSlackIds: string[]
): Promise<void> {
  if (assigneeSlackIds.length === 0) return;

  const [issue] = await db
    .select({ key: issues.key, title: issues.title })
    .from(issues)
    .where(eq(issues.externalId, issueId))
    .limit(1);

  if (!issue) return;

  const message = `🔔 You've been assigned *${issue.key}: ${issue.title}*\n<${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/issue/${issueId}|View in Rejira>`;

  await Promise.allSettled(
    assigneeSlackIds.map((slackId) => sendSlackDM(workspaceId, slackId, message))
  );
}
