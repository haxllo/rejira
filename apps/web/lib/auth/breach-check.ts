import 'server-only';

import { createHash } from 'node:crypto';

const CACHE = new Map<string, { suffixes: Set<string>; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function sha1(input: string): string {
  return createHash('sha1').update(input).digest('hex').toUpperCase();
}

async function fetchRange(prefix: string): Promise<Set<string>> {
  const cached = CACHE.get(prefix);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.suffixes;
  }

  const headers: Record<string, string> = {
    'Add-Padding': 'true',
  };

  if (process.env.HIBP_API_KEY) {
    headers['hibp-api-key'] = process.env.HIBP_API_KEY;
  }

  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers,
  });

  if (!response.ok) {
    console.error(`[breach-check] HIBP API error: ${response.status}`);
    return new Set();
  }

  const text = await response.text();
  const suffixes = new Set<string>();

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [suffix] = trimmed.split(':');
    if (suffix) suffixes.add(suffix);
  }

  CACHE.set(prefix, { suffixes, timestamp: Date.now() });

  if (CACHE.size > 1000) {
    const oldest = [...CACHE.entries()]
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0];
    if (oldest) CACHE.delete(oldest[0]);
  }

  return suffixes;
}

export async function checkBreach(password: string): Promise<boolean> {
  if (!password || password.length < 1) return false;

  const hash = sha1(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const suffixes = await fetchRange(prefix);
    return suffixes.has(suffix);
  } catch {
    console.error('[breach-check] Failed to check HIBP API');
    return false;
  }
}
