export type SearchMode = 'hybrid' | 'bm25' | 'semantic';

export interface SearchResult {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  projectKey: string;
  projectName: string;
  assigneeName: string | null;
  matchType: 'bm25' | 'semantic' | 'hybrid';
  score: number;
  matchHighlights: string[];
}

export interface SearchQuery {
  text: string;
  mode: SearchMode;
  workspaceId: string;
  limit?: number;
  offset?: number;
  filters?: {
    projectId?: string;
    status?: string[];
    assigneeId?: string[];
    label?: string[];
    cycleId?: string[];
  };
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  queryTimeMs: number;
}
