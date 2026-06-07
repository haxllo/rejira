import 'server-only';

import { trackEvent } from './posthog';

export interface AuthEvent {
  event: string;
  userId: string;
  ipHash?: string;
  uaHash?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

const AUTH_EVENTS = [
  'sign_in_success',
  'sign_in_failed',
  'sign_up',
  'sign_out',
  'password_changed',
  'email_changed',
  '2fa_enabled',
  '2fa_disabled',
  'account_deleted',
  'account_restored',
  'passkey_enrolled',
  'passkey_removed',
] as const;

export type AuthEventType = (typeof AUTH_EVENTS)[number];

export function trackAuthEvent(event: AuthEvent): void {
  const props: Record<string, unknown> = {
    timestamp: event.timestamp || Date.now(),
    ...(event.metadata || {}),
  };

  if (event.ipHash) props.ipHash = event.ipHash;
  if (event.uaHash) props.uaHash = event.uaHash;

  try {
    trackEvent(event.event, event.userId, props);
  } catch {
    console.log(`[observability] Auth event: ${event.event}`, {
      userId: event.userId,
      ...props,
    });
  }
}
