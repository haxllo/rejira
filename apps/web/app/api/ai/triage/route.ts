import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { getActiveWorkspaceId } from '@/lib/auth/workspace-helpers';
import { createWorkspaceAIClient } from '@/lib/ai/client';

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const workspaceId = await getActiveWorkspaceId();

    const { issueTitle, issueDescription } = await request.json();

    if (!issueTitle?.trim()) {
      return NextResponse.json({ error: 'Issue title is required' }, { status: 400 });
    }

    const client = await createWorkspaceAIClient(workspaceId);
    if (!client) {
      return NextResponse.json(
        { error: 'No AI key configured. Add an AI provider key in workspace settings.' },
        { status: 400 }
      );
    }

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a Jira-like issue triage assistant. Suggest: priority (none/low/medium/high/urgent), assignee (suggest a name or "Unassigned"), labels (array of 1-3 label strings), project suggestion (string), and a brief explanation. Return as JSON.',
        },
        {
          role: 'user',
          content: `Title: ${issueTitle}\nDescription: ${issueDescription || '(none)'}`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'No suggestions generated' }, { status: 502 });
    }

    const suggestions = JSON.parse(content);

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    if (error instanceof Response) throw error;

    if (error?.status === 429) {
      return NextResponse.json({ error: 'AI is rate-limited. Wait a moment.' }, { status: 429 });
    }

    return NextResponse.json(
      { error: 'AI triage failed. Try again.' },
      { status: 502 }
    );
  }
}
