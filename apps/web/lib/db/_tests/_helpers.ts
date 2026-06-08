import { vi } from 'vitest';

export const mockExecute = vi.fn();
export const mockTransaction = vi.fn();
export const mockRequireAuth = vi.fn();
export const mockTrackEvent = vi.fn();
export const mockInsert = vi.fn();
export const mockUpdate = vi.fn();
export const mockDelete = vi.fn();
export const mockSelect = vi.fn();

export function makeMockTx() {
  return {
    execute: mockExecute,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect,
  };
}

export function resetAllMocks(): void {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ id: 'u_aria', externalId: 'u_aria' });
  mockExecute.mockResolvedValue(undefined);
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(makeMockTx()));
  mockInsert.mockReturnValue({
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1n }]),
    onConflictDoNothing: vi.fn().mockReturnThis(),
  });
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 1n }]),
  });
  mockDelete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  });
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([{ status: 'backlog' }]),
    orderBy: vi.fn().mockReturnThis(),
  });
  mockTrackEvent.mockReturnValue(undefined);
}
