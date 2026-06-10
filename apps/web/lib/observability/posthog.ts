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

export function trackIssueEvent(
  event: 'issue_created' | 'issue_updated' | 'issue_commented' | 'issue_deleted',
  distinctId: string,
  properties: {
    issueId: string;
    workspaceId?: string;
    projectId?: string;
    status?: string;
    priority?: string;
    assigneeIds?: string[];
  },
): void {
  trackEvent(event, distinctId, {
    ...properties,
    $set: { lastSeen: new Date().toISOString() },
  });
}

export function trackWorkspaceEvent(
  event: 'workspace_created' | 'workspace_joined' | 'workspace_invite_sent',
  distinctId: string,
  properties: { workspaceId: string; workspaceName?: string; role?: string },
): void {
  trackEvent(event, distinctId, properties);
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
