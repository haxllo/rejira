import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { workspaceSecurityPolicy } from '@/lib/db/schema/workspace-security-policy';
import { issues } from '@/lib/db/schema/issues';
import { eq } from 'drizzle-orm';
import { verifyGitHubWebhook, extractIssueKeys } from '@/lib/integrations/github';

interface GitHubPRPayload {
  action: string;
  pull_request: {
    html_url: string;
    title: string;
    body: string | null;
    number: number;
  };
  repository: { full_name: string };
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256') ?? '';
  const event = request.headers.get('x-github-event') ?? '';
  const workspaceId = request.nextUrl.searchParams.get('workspace_id');

  if (event !== 'pull_request') {
    return NextResponse.json({ ok: true });
  }

  try {
    const payload: GitHubPRPayload = JSON.parse(body);
    const issueKeys = extractIssueKeys(
      `${payload.pull_request.title} ${payload.pull_request.body ?? ''}`
    );

    if (!workspaceId) {
      return NextResponse.json({ ok: true, matched: 0, note: 'no workspace_id' });
    }

    const matched: string[] = [];

    for (const key of issueKeys) {
      const [issue] = await db
        .select({ id: issues.id, externalId: issues.externalId })
        .from(issues)
        .where(eq(issues.key, key))
        .limit(1);

      if (issue) {
        matched.push(key);
      }
    }

    return NextResponse.json({
      ok: true,
      matched,
      pr: payload.pull_request.number,
      repo: payload.repository.full_name,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
