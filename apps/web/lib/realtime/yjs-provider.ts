'use client';

import * as Y from 'yjs';
import { SupabaseProvider } from '@supabase-labs/y-supabase';
import { getSupabaseBrowserClient } from './client';

const ROOM_PREFIX = 'issue:description:';

const docCache = new Map<string, { doc: Y.Doc; provider: SupabaseProvider; refCount: number }>();

export function createYjsProvider(
  workspaceId: string,
  issueExternalId: string,
  userInfo: { id: string; name: string; color: string },
): {
  doc: Y.Doc;
  yText: Y.Text;
  provider: SupabaseProvider;
  destroy: () => void;
} {
  const room = `${ROOM_PREFIX}${workspaceId}:${issueExternalId}`;
  const cached = docCache.get(room);

  if (cached) {
    cached.refCount++;
    return {
      doc: cached.doc,
      yText: cached.doc.getText('description'),
      provider: cached.provider,
      destroy: () => {
        cached.refCount--;
        if (cached.refCount <= 0) {
          cached.provider.destroy();
          cached.doc.destroy();
          docCache.delete(room);
        }
      },
    };
  }

  const doc = new Y.Doc();
  const supabase = getSupabaseBrowserClient();
  const provider = new SupabaseProvider(room, doc, supabase, {
    awareness: true,
    persistence: true,
  });

  const awareness = provider.getAwareness();
  if (awareness) {
    awareness.setLocalStateField('user', {
      id: userInfo.id,
      name: userInfo.name,
      color: userInfo.color,
    });

    awareness.on('change', () => {});
  }

  const entry = { doc, provider, refCount: 1 };
  docCache.set(room, entry);

  return {
    doc,
    yText: doc.getText('description'),
    provider,
    destroy: () => {
      entry.refCount--;
      if (entry.refCount <= 0) {
        provider.destroy();
        doc.destroy();
        docCache.delete(room);
      }
    },
  };
}

export function getYjsAwarenessState(issueExternalId: string): Array<{
  id: string;
  name: string;
  color: string;
}> | null {
  for (const [room, cached] of docCache) {
    if (!room.endsWith(`:${issueExternalId}`)) continue;
    const awareness = cached.provider.getAwareness();
    if (!awareness) return null;

    const states: Array<{ id: string; name: string; color: string }> = [];
    for (const [, state] of awareness.getStates()) {
      const user = (state as Record<string, unknown>)?.user as
        | { id: string; name: string; color: string }
        | undefined;
      if (user) states.push(user);
    }
    return states;
  }
  return null;
}
