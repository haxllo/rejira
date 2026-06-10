import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/state/issues', () => {
  const { create } = require('zustand');
  type Issue = Record<string, unknown>;
  return {
    useIssues: create<{
      issues: Issue[];
      setIssues: (issues: Issue[]) => void;
      setOne: (issue: Issue) => void;
      removeOne: (id: string) => void;
      setState: (fn: unknown) => void;
      getState: () => { issues: Issue[]; setOne: (issue: Issue) => void };
    }>((set, get) => ({
      issues: [] as Issue[],
      setIssues: (issues: Issue[]) => set({ issues }),
      setOne: (issue: Issue) =>
        set((s: { issues: Issue[] }) => ({
          issues: s.issues.map((i: Issue) =>
            (i.id ?? i.externalId) === (issue.id ?? issue.externalId) ? issue : i,
          ),
        })),
      removeOne: (id: string) =>
        set((s: { issues: Issue[] }) => ({
          issues: s.issues.filter((i: Issue) => (i.id ?? i.externalId) !== id),
        })),
      setState: (fn: unknown) => set(fn as Parameters<typeof set>[0]),
      getState: () => ({ issues: get().issues, setOne: get().setOne }),
    })),
  };
});

vi.mock('@/lib/server-actions', () => ({
  ServerActionError: class extends Error {
    code: string;
    status: number;
    constructor(message: string, options: { code: string; status: number }) {
      super(message);
      this.code = options.code;
      this.status = options.status;
    }
  },
  setStatusAction: vi.fn(),
  setPriorityAction: vi.fn(),
  bulkSetStatusAction: vi.fn(),
}));

vi.mock('@/lib/state/ui', () => ({
  useUI: {
    getState: vi.fn().mockReturnValue({}),
    setState: vi.fn(),
  },
}));

import { useIssues } from '@/lib/state/issues';

let mutationsModule: typeof import('@/lib/state/mutations');

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  useIssues.setState({ issues: [] });

  const mod = await import('@/lib/state/mutations');
  mutationsModule = mod;
});

describe('cutover-apply', () => {
  describe('apply() with async mutation', () => {
    it('Test 1: apply() with async mutation function awaits and clears pending on success', async () => {
      const { apply, undoStack } = mutationsModule;
      const { setStatusAction } = await import('@/lib/server-actions');

      const mockRun = vi.fn().mockResolvedValue({ id: 'iss_1', status: 'done' });

      const testIssue = { id: 'iss_1', externalId: 'iss_1', title: 'Test', status: 'todo', pending: false };
      useIssues.setState({ issues: [testIssue] });

      apply({
        message: 'Moved to Done',
        affectedIds: ['iss_1'],
        undo: () => {},
        retry: () => {},
        run: mockRun,
      });

      expect(mockRun).toHaveBeenCalled();

      await vi.waitFor(() => {
        const issues = useIssues.getState().issues;
        const issue = issues.find((i: Record<string, unknown>) => i.id === 'iss_1');
        expect(issue?.pending).toBe(false);
      });
    });

    it('Test 2: apply() with a sync (mock) mutation still works', async () => {
      const { apply } = mutationsModule;

      const mockRun = vi.fn().mockResolvedValue(true);

      apply({
        message: 'Sync test',
        affectedIds: [],
        undo: () => {},
        retry: () => {},
        run: mockRun,
      });

      await vi.waitFor(() => {
        expect(mockRun).toHaveBeenCalled();
      });
    });

    it('Test 3: recordError() sets lastError with the given message', () => {
      const { recordError, getLastError, apply } = mutationsModule;

      apply({
        message: 'Test error message',
        affectedIds: ['iss_1'],
        undo: () => {},
        retry: () => {},
        run: vi.fn().mockRejectedValue(new Error('Server error')),
      });

      recordError('Custom error message');

      const err = getLastError();
      expect(err?.message).toBe('Custom error message');
    });

    it('Test 4: retryLast() re-runs the most recent mutation; clears lastError on success', async () => {
      const { apply, retryLast, getLastError } = mutationsModule;

      const mockRun = vi.fn().mockRejectedValueOnce(new Error('Fail')).mockResolvedValueOnce({ id: 'iss_1', status: 'done' });

      apply({
        message: 'Test retry',
        affectedIds: ['iss_1'],
        undo: () => {},
        retry: () => {},
        run: mockRun,
      });

      await vi.waitFor(() => {
        const err = getLastError();
        expect(err).not.toBeNull();
      });

      retryLast();

      await vi.waitFor(() => {
        const err = getLastError();
        expect(err).toBeNull();
        expect(mockRun).toHaveBeenCalledTimes(2);
      });
    });

    it('Test 5: useIssues store exposes setIssues for Server Component re-renders', () => {
      const issues = [
        { id: 'iss_1', externalId: 'iss_1', title: 'Test 1', status: 'todo', pending: false },
        { id: 'iss_2', externalId: 'iss_2', title: 'Test 2', status: 'done', pending: false },
      ];

      useIssues.getState().setIssues(issues as typeof issues);

      expect(useIssues.getState().issues.length).toBe(2);
      expect(useIssues.getState().issues[0].title).toBe('Test 1');
    });

    it('Test 6: useIssues store exposes setPending-like behavior', () => {
      const issues = [
        { id: 'iss_1', externalId: 'iss_1', title: 'Test', status: 'todo', pending: false },
      ];

      useIssues.getState().setIssues(issues as typeof issues);
      expect(useIssues.getState().issues[0].pending).toBe(false);

      useIssues.getState().setOne({ ...issues[0], pending: true } as typeof issues[0]);
      expect(useIssues.getState().issues[0].pending).toBe(true);
    });

    it('Test 7: useIssuesServerActions.setStatus calls setStatusAction and optimistically updates', async () => {
      const { setStatusAction } = await import('@/lib/server-actions');

      const testIssue = { id: 'iss_1', externalId: 'iss_1', title: 'Test', status: 'todo', pending: false, workspaceId: 'ws_test' };
      useIssues.setState({ issues: [testIssue] });

      (setStatusAction as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'iss_1', externalId: 'iss_1', status: 'done', title: 'Test', workspaceId: 'ws_test' });

      const { useIssuesServerActions } = await import('@/hooks/useIssuesServerActions');
      const actions = useIssuesServerActions();
      actions.setStatus('iss_1', 'done', 'ws_test');

      await vi.waitFor(() => {
        expect(setStatusAction).toHaveBeenCalled();
        const issues = useIssues.getState().issues;
        expect(issues[0].status).toBe('done');
      });
    });

    it('Test 8: useIssuesServerActions.setStatus fails -> recordError, pending cleared', async () => {
      const { setStatusAction } = await import('@/lib/server-actions');

      const testIssue = { id: 'iss_1', externalId: 'iss_1', title: 'Test', status: 'todo', pending: false, workspaceId: 'ws_test' };
      useIssues.setState({ issues: [testIssue] });

      (setStatusAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'));

      const { useIssuesServerActions } = await import('@/hooks/useIssuesServerActions');
      const actions = useIssuesServerActions();
      actions.setStatus('iss_1', 'done', 'ws_test');

      await vi.waitFor(() => {
        const err = mutationsModule.getLastError();
        expect(err).not.toBeNull();
        const issues = useIssues.getState().issues;
        expect(issues[0].pending).toBe(false);
      });
    });

    it('Test 9: undo reverts optimistic state but does NOT call server', async () => {
      const { setStatusAction } = await import('@/lib/server-actions');
      const { apply, undoLast } = mutationsModule;

      (setStatusAction as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'iss_1', externalId: 'iss_1', status: 'done' });

      const testIssue = { id: 'iss_1', externalId: 'iss_1', title: 'Test', status: 'todo', pending: false, workspaceId: 'ws_test' };
      useIssues.setState({ issues: [testIssue] });

      const mockUndo = vi.fn();
      const mockRun = vi.fn().mockResolvedValue({ id: 'iss_1', status: 'done' });

      apply({
        message: 'Moved to Done',
        affectedIds: ['iss_1'],
        undo: mockUndo,
        retry: () => {},
        run: mockRun,
      });

      await vi.waitFor(() => {
        expect(mockRun).toHaveBeenCalledTimes(1);
      });

      undoLast();

      expect(mockUndo).toHaveBeenCalledTimes(1);
      expect(mockRun).toHaveBeenCalledTimes(1);
    });

    it('Test 10: after undo, re-apply calls server again', async () => {
      const { apply, undoLast } = mutationsModule;

      const testIssue = { id: 'iss_1', externalId: 'iss_1', title: 'Test', status: 'todo', pending: false, workspaceId: 'ws_test' };
      useIssues.setState({ issues: [testIssue] });

      const mockUndo1 = vi.fn();
      const mockRun1 = vi.fn().mockResolvedValue({ id: 'iss_1', status: 'done' });

      apply({
        message: 'Moved to Done',
        affectedIds: ['iss_1'],
        undo: mockUndo1,
        retry: () => {},
        run: mockRun1,
      });

      await vi.waitFor(() => {
        expect(mockRun1).toHaveBeenCalledTimes(1);
      });

      undoLast();
      expect(mockUndo1).toHaveBeenCalledTimes(1);

      const mockRun2 = vi.fn().mockResolvedValue({ id: 'iss_1', status: 'in_progress' });

      apply({
        message: 'Moved to In Progress',
        affectedIds: ['iss_1'],
        undo: () => {},
        retry: () => {},
        run: mockRun2,
      });

      await vi.waitFor(() => {
        expect(mockRun2).toHaveBeenCalledTimes(1);
      });

      expect(mockRun1).toHaveBeenCalledTimes(1);
      expect(mockRun2).toHaveBeenCalledTimes(1);
    });
  });
});
