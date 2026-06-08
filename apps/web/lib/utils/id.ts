import { nanoid } from 'nanoid';

export function createId(prefix?: string): string {
  return prefix ? `${prefix}_${nanoid(16)}` : nanoid(20);
}
