import 'server-only';

let client: { capture: (event: { distinctId: string; event: string; properties?: Record<string, unknown> }) => void } | null = null;

export function initPostHog(): void {
  if (client || !process.env.POSTHOG_API_KEY) {
    return;
  }

  try {
    const { PostHog } = require('posthog-node') as {
      PostHog: new (apiKey: string, options: Record<string, unknown>) => {
        capture: (event: { distinctId: string; event: string; properties?: Record<string, unknown> }) => void;
      };
    };
    client = new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 10,
      flushInterval: 5000,
    });
    console.log('[observability] PostHog initialized');
  } catch {
    console.log('[observability] PostHog API key configured (SDK not yet installed)');
  }
}

export function trackEvent(
  event: string,
  distinctId: string,
  properties?: Record<string, unknown>,
): void {
  try {
    if (client) {
      client.capture({ distinctId, event, properties });
    } else if (process.env.POSTHOG_API_KEY) {
      const { PostHog } = require('posthog-node') as {
        PostHog: new (apiKey: string, options: Record<string, unknown>) => {
          capture: (event: { distinctId: string; event: string; properties?: Record<string, unknown> }) => void;
        };
      };
      const tempClient = new PostHog(process.env.POSTHOG_API_KEY, {
        host: process.env.POSTHOG_HOST || 'https://us.i.posthog.com',
      });
      tempClient.capture({ distinctId, event, properties });
    } else {
      console.log(`[observability] Event: ${event}`, { distinctId, ...(properties || {}) });
    }
  } catch {
    console.log(`[observability] Event: ${event}`, { distinctId, ...(properties || {}) });
  }
}
