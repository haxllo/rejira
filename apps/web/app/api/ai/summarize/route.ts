import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { getActiveWorkspaceId } from '@/lib/auth/workspace-helpers';
import { createWorkspaceAIClient } from '@/lib/ai/client';
import { checkAIBudget, recordAICost } from '@/lib/ai/cost';
import { db } from '@/lib/db/client';
import { issues } from '@/lib/db/schema/issues';
import { comments } from '@/lib/db/schema/comments';
import { eq, and, isNull, desc } from 'drizzle-orm';

function formatIssueForPrompt(issue: { title: string; description: string | null }, commentBodies: string[]): string {
  let text = `Title: ${issue.title}\nDescription: ${issue.description || '(none)'}`;
  if (commentBodies.length > 0) {
    text += `\n\nComments:\n${commentBodies.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
  }
  if (text.length > 4000 * 4) {
    text = text.slice(0, 4000 * 4) + '...[truncated]';
  }
  return text;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const workspaceId = await getActiveWorkspaceId();

    const { issueId } = await request.json();
    if (!issueId) {
      return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 });
    }

    const budget = await checkAIBudget(workspaceId);
    if (!budget.withinBudget) {
      return NextResponse.json(
        { error: 'Monthly AI budget exceeded', spent: budget.spent, budget: budget.budget },
        { status: 429 }
      );
    }

    const [issue] = await db
      .select()
      .from(issues)
      .where(and(eq(issues.externalId, issueId), eq(issues.workspaceId, workspaceId)))
      .limit(1);

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    const commentRows = await db
      .select({ body: comments.body })
      .from(comments)
      .where(and(eq(comments.issueId, issue.id), isNull(comments.archivedAt)))
      .orderBy(desc(comments.createdAt))
      .limit(20);

    const client = await createWorkspaceAIClient(workspaceId);
    if (!client) {
      return NextResponse.json(
        { error: 'No AI key configured. Add an AI provider key in workspace settings.' },
        { status: 400 }
      );
    }

    const promptText = formatIssueForPrompt(
      { title: issue.title, description: issue.description },
      commentRows.map((c) => c.body)
    );

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Summarize this issue in 3-5 concise bullet points. Focus on: what the issue is about, current status, key discussion points from comments, and next steps if any. Return as JSON: { summary: string[] }.',
        },
        { role: 'user', content: promptText },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'Could not generate summary' }, { status: 502 });
    }

    const parsed = JSON.parse(content);
    const summary: string[] = parsed.summary ?? [];

    recordAICost(workspaceId, 'gpt-4o-mini', completion.usage?.total_tokens ?? 0).catch(() => {});

    return NextResponse.json({ summary });
  } catch (error: any) {
    if (error instanceof Response) throw error;

    if (error?.status === 429) {
      return NextResponse.json({ error: 'AI is rate-limited. Wait a moment.' }, { status: 429 });
    }

    return NextResponse.json(
      { error: 'Summarization failed. Try again.' },
      { status: 502 }
    );
  }
}
