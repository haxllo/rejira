export type DbErrorCode = 'FORBIDDEN' | 'CONFLICT' | 'FOREIGN_KEY' | 'TIMEOUT' | 'NOT_FOUND' | 'INTERNAL';

export class DbError extends Error {
  code: DbErrorCode;
  status: number;
  cause?: unknown;

  constructor(message: string, options: { code: DbErrorCode; status: number; cause?: unknown }) {
    super(message);
    this.name = 'DbError';
    this.code = options.code;
    this.status = options.status;
    this.cause = options.cause;
  }
}

const SQLSTATE_MAP: Record<string, { code: DbErrorCode; status: number; message: string }> = {
  '42501': { code: 'FORBIDDEN', status: 403, message: "You don't have permission to do that" },
  '23505': { code: 'CONFLICT', status: 409, message: 'That value is already taken' },
  '23503': { code: 'FOREIGN_KEY', status: 409, message: 'Cannot complete — referenced elsewhere' },
  '57014': { code: 'TIMEOUT', status: 408, message: 'The request took too long — try again' },
  'PGRST116': { code: 'NOT_FOUND', status: 404, message: 'Not found' },
};

function extractSqlState(err: unknown): string | null {
  if (!err || typeof err !== 'object') return null;
  const obj = err as Record<string, unknown>;
  if (typeof obj.code === 'string') return obj.code;
  if (typeof obj.cause === 'object' && obj.cause !== null) {
    const cause = obj.cause as Record<string, unknown>;
    if (typeof cause.code === 'string') return cause.code;
  }
  return null;
}

export function mapDrizzleError(err: unknown): DbError {
  if (err instanceof DbError) return err;
  const sqlState = extractSqlState(err);
  if (sqlState && SQLSTATE_MAP[sqlState]) {
    const mapping = SQLSTATE_MAP[sqlState];
    return new DbError(mapping.message, { code: mapping.code, status: mapping.status, cause: err });
  }
  return new DbError('Something went wrong', { code: 'INTERNAL', status: 500, cause: err });
}
