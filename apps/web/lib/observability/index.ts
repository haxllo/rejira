// Phase 3 — Stream 3K: Observability. Stubs for Sentry + PostHog.

export function initSentry() {
  if (process.env.SENTRY_DSN) {
    // 3K: import("@sentry/nextjs") and initialize
    console.log("[observability] Sentry configured");
  }
}

export function initPostHog() {
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    // 3K: import("posthog-js") and initialize
    console.log("[observability] PostHog configured");
  }
}

export function trackEvent(name: string, props?: Record<string, any>) {
  // 3K: posthog.capture(name, props)
  console.log(`[observability] Event: ${name}`, props);
}

export function captureError(error: Error, context?: Record<string, any>) {
  console.error(`[observability] Error: ${error.message}`, context);
}
