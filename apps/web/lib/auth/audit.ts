// Phase 3 — Stream 3G: Auth event audit logging.
//
// Emits structured events for sign-in, sign-out, password change, etc.
// 3K wires these to PostHog/Sentry.

interface AuditEvent {
  type: string;
  userId?: string;
  ip?: string;
  timestamp: number;
  metadata?: Record<string, string>;
}

const handlers: Array<(e: AuditEvent) => void> = [];

export function onAuditEvent(handler: (e: AuditEvent) => void) {
  handlers.push(handler);
}

export function emitAudit(
  type: string,
  userId?: string,
  metadata?: Record<string, string>,
) {
  const event: AuditEvent = {
    type,
    userId,
    timestamp: Date.now(),
    metadata,
  };
  handlers.forEach((h) => h(event));
}

export { type AuditEvent };
