import 'server-only';

import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';

export interface ResendBouncePayload {
  type: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
  };
}

const bounceCount = new Map<string, { count: number; lastBounce: number }>();
const BOUNCE_THRESHOLD = 5;
const BOUNCE_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function handleBounce(payload: ResendBouncePayload): Promise<void> {
  const email = payload.data.to[0];
  if (!email) return;

  const now = Date.now();
  const record = bounceCount.get(email) || { count: 0, lastBounce: 0 };

  if (now - record.lastBounce > BOUNCE_WINDOW_MS) {
    record.count = 1;
  } else {
    record.count++;
  }
  record.lastBounce = now;
  bounceCount.set(email, record);

  try {
    await db.update(users)
      .set({ status: 'bounced' })
      .where(eq(users.email, email));
  } catch {
    console.error(`[bounce-handler] Failed to update user status for ${email}`);
  }

  if (record.count >= BOUNCE_THRESHOLD) {
    console.warn(`[bounce-handler] Email ${email} has ${record.count} bounces in 24h — consider manual review`);
  }
}
