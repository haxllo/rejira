import 'server-only';

import crypto from 'crypto';
import { db } from '@/lib/db';
import { outboundWebhooks, webhookLogs } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const WEBHOOK_EVENTS = [
  'issue.created',
  'issue.updated',
  'issue.status_changed',
  'issue.commented',
  'member.added',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

export { WEBHOOK_EVENTS };

export async function deliverWebhook(
  workspaceId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const hooks = await db
    .select()
    .from(outboundWebhooks)
    .where(
      and(
        eq(outboundWebhooks.workspaceId, workspaceId),
        eq(outboundWebhooks.enabled, true)
      )
    );

  if (hooks.length === 0) return;

  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });

  for (const hook of hooks) {
    if (!hook.events.includes(event) && !hook.events.includes('*')) continue;

    const sig = crypto
      .createHmac('sha256', hook.signingSecret)
      .update(body)
      .digest('hex');

    const start = Date.now();
    let status = 0;
    let responseText = '';

    for (let attempt = 0; attempt <= hook.retryCount; attempt++) {
      try {
        const res = await fetch(hook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `sha256=${sig}`,
            'X-Webhook-Event': event,
            'X-Webhook-Delivery': crypto.randomUUID(),
          },
          body,
          signal: AbortSignal.timeout(10000),
        });
        status = res.status;
        responseText = await res.text().catch(() => '');
        if (res.ok) break;
      } catch {
        status = 0;
        responseText = 'Delivery failed';
      }

      if (attempt < hook.retryCount) {
        await new Promise((r) => setTimeout(r, [1000, 5000, 30000][attempt] ?? 30000));
      }
    }

    await db.insert(webhookLogs).values({
      webhookId: hook.id,
      workspaceId,
      event,
      status,
      response: responseText.slice(0, 1000),
      durationMs: Date.now() - start,
    } as any);
  }
}
