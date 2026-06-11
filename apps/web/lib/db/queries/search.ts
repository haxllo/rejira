import 'server-only';

import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import type { SearchQuery, SearchResponse } from '@/lib/search/types';

const RRF_K = 60;

interface BM25Row {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  project_key: string;
  project_name: string;
  assignee_name: string | null;
  rank: number;
}

interface SemanticRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  project_key: string;
  project_name: string;
  assignee_name: string | null;
  similarity: number;
}

function computeRRFScore(rank: number, isSemantic: boolean): number {
  const k = isSemantic ? RRF_K : RRF_K;
  return 1 / (k + rank);
}

export async function searchIssuesHybrid(
  query: SearchQuery
): Promise<SearchResponse> {
  const start = Date.now();
  const limit = query.limit ?? 20;

  if (!query.text.trim()) {
    return searchRecentIssues(query.workspaceId, limit, start);
  }

  const bm25Results = await searchBM25Raw(query.workspaceId, query.text, limit);
  const semanticResults = await searchSemanticRaw(query.workspaceId, query.text, limit);

  const merged = mergeResults(bm25Results, semanticResults, limit);

  return {
    results: merged,
    total: merged.length,
    queryTimeMs: Date.now() - start,
  };
}

export async function searchIssuesBM25(
  query: SearchQuery
): Promise<SearchResponse> {
  const start = Date.now();
  const limit = query.limit ?? 20;

  if (!query.text.trim()) {
    return searchRecentIssues(query.workspaceId, limit, start);
  }

  const rows = await searchBM25Raw(query.workspaceId, query.text, limit);

  return {
    results: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      projectKey: r.project_key,
      projectName: r.project_name,
      assigneeName: r.assignee_name,
      matchType: 'bm25' as const,
      score: r.rank,
      matchHighlights: [],
    })),
    total: rows.length,
    queryTimeMs: Date.now() - start,
  };
}

export async function searchIssuesSemantic(
  query: SearchQuery
): Promise<SearchResponse> {
  const start = Date.now();
  const limit = query.limit ?? 20;

  if (!query.text.trim()) {
    return searchRecentIssues(query.workspaceId, limit, start);
  }

  const rows = await searchSemanticRaw(query.workspaceId, query.text, limit);

  return {
    results: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      projectKey: r.project_key,
      projectName: r.project_name,
      assigneeName: r.assignee_name,
      matchType: 'semantic' as const,
      score: r.similarity,
      matchHighlights: [],
    })),
    total: rows.length,
    queryTimeMs: Date.now() - start,
  };
}

async function searchBM25Raw(
  workspaceId: string,
  text: string,
  limit: number
): Promise<BM25Row[]> {
  const rows = await db.execute<BM25Row>(sql`
    SELECT
      i.external_id AS id,
      i.title,
      i.description,
      i.status,
      i.priority,
      p.key AS project_key,
      p.name AS project_name,
      u.name AS assignee_name
    FROM issues i
    LEFT JOIN projects p ON p.id = i.project_id
    LEFT JOIN users u ON u.id = (SELECT unnest(i.assignee_ids) LIMIT 1)
    WHERE i.workspace_id = ${workspaceId}
      AND i.search_vector @@ plainto_tsquery('english', ${text})
    ORDER BY ts_rank(i.search_vector, plainto_tsquery('english', ${text})) DESC
    LIMIT ${limit}
  `);

  return rows.rows as unknown as BM25Row[];
}

async function searchSemanticRaw(
  workspaceId: string,
  text: string,
  limit: number
): Promise<SemanticRow[]> {
  try {
    const { createWorkspaceAIClient } = await import('@/lib/ai/client');
    const { generateEmbedding } = await import('@/lib/ai/embed');

    const client = await createWorkspaceAIClient(workspaceId);
    if (!client) return [];

    const embedding = await generateEmbedding(text, client);
    const embeddingStr = `[${embedding.join(',')}]`;

    const rows = await db.execute<SemanticRow>(sql`
      SELECT
        i.external_id AS id,
        i.title,
        i.description,
        i.status,
        i.priority,
        p.key AS project_key,
        p.name AS project_name,
        u.name AS assignee_name,
        1 - (i.embedding <=> ${sql.raw(embeddingStr)}::vector) AS similarity
      FROM issues i
      LEFT JOIN projects p ON p.id = i.project_id
      LEFT JOIN users u ON u.id = (SELECT unnest(i.assignee_ids) LIMIT 1)
      WHERE i.workspace_id = ${workspaceId}
        AND i.embedding IS NOT NULL
        AND 1 - (i.embedding <=> ${sql.raw(embeddingStr)}::vector) > 0.7
      ORDER BY i.embedding <=> ${sql.raw(embeddingStr)}::vector
      LIMIT ${limit}
    `);

    return rows.rows as unknown as SemanticRow[];
  } catch {
    return [];
  }
}

function mergeResults(
  bm25: BM25Row[],
  semantic: SemanticRow[],
  limit: number
): SearchResponse['results'] {
  const scoreMap = new Map<string, { row: SearchResponse['results'][0]; score: number }>();

  bm25.forEach((row, idx) => {
    const rrfScore = computeRRFScore(idx + 1, false);
    const matchType = semantic.length > 0 ? 'hybrid' as const : 'bm25' as const;
    scoreMap.set(row.id, {
      row: {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        projectKey: row.project_key,
        projectName: row.project_name,
        assigneeName: row.assignee_name,
        matchType,
        score: rrfScore,
        matchHighlights: [],
      },
      score: rrfScore,
    });
  });

  semantic.forEach((row, idx) => {
    const rrfScore = computeRRFScore(idx + 1, true);
    if (scoreMap.has(row.id)) {
      scoreMap.get(row.id)!.score += rrfScore;
      scoreMap.get(row.id)!.row.matchType = 'hybrid';
      scoreMap.get(row.id)!.row.score = scoreMap.get(row.id)!.score;
    } else {
      scoreMap.set(row.id, {
        row: {
          id: row.id,
          title: row.title,
          description: row.description,
          status: row.status,
          priority: row.priority,
          projectKey: row.project_key,
          projectName: row.project_name,
          assigneeName: row.assignee_name,
          matchType: 'semantic' as const,
          score: rrfScore,
          matchHighlights: [],
        },
        score: rrfScore,
      });
    }
  });

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.row);
}

async function searchRecentIssues(
  workspaceId: string,
  limit: number,
  start: number
): Promise<SearchResponse> {
  const rows = await db.execute<BM25Row>(sql`
    SELECT
      i.external_id AS id,
      i.title,
      i.description,
      i.status,
      i.priority,
      p.key AS project_key,
      p.name AS project_name,
      u.name AS assignee_name
    FROM issues i
    LEFT JOIN projects p ON p.id = i.project_id
    LEFT JOIN users u ON u.id = (SELECT unnest(i.assignee_ids) LIMIT 1)
    WHERE i.workspace_id = ${workspaceId}
    ORDER BY i.updated_at DESC
    LIMIT ${limit}
  `);

  const results = (rows.rows as unknown as BM25Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    projectKey: r.project_key,
    projectName: r.project_name,
    assigneeName: r.assignee_name,
    matchType: 'bm25' as const,
    score: 0,
    matchHighlights: [],
  }));

  return {
    results,
    total: results.length,
    queryTimeMs: Date.now() - start,
  };
}
