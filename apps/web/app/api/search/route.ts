import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { getActiveWorkspaceId } from '@/lib/auth/workspace-helpers';
import { searchIssuesHybrid, searchIssuesBM25, searchIssuesSemantic } from '@/lib/db/queries/search';
import type { SearchMode } from '@/lib/search/types';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const workspaceId = await getActiveWorkspaceId();

    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text') ?? '';
    const mode = (searchParams.get('mode') ?? 'hybrid') as SearchMode;
    const limit = parseInt(searchParams.get('limit') ?? '20', 10);

    const query = { text, mode, workspaceId, limit };

    let result;
    switch (mode) {
      case 'bm25':
        result = await searchIssuesBM25(query);
        break;
      case 'semantic':
        result = await searchIssuesSemantic(query);
        break;
      default:
        result = await searchIssuesHybrid(query);
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) throw error;
    return NextResponse.json(
      { error: 'Search failed', results: [], total: 0, queryTimeMs: 0 },
      { status: 500 }
    );
  }
}
