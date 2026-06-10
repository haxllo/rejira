'use client';

import { AlertCircleIcon, RefreshCwIcon } from '@/components/icons';

interface PageErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
}

export function PageErrorFallback({ error, reset, title, message }: PageErrorFallbackProps) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    import('@/lib/observability/sentry').then(({ captureError }) => {
      captureError(error, { digest: error.digest });
    });
  }

  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4 px-6">
      <div className="grid size-12 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-1)] text-[var(--color-danger)]">
        <AlertCircleIcon size={18} />
      </div>
      <div className="text-center">
        <h2 className="text-[14px] font-semibold text-[var(--color-text)]">
          {title ?? 'Something went wrong'}
        </h2>
        <p className="mt-1 max-w-sm text-[12.5px] text-[var(--color-text-muted)]">
          {message ?? 'An unexpected error occurred. We\'ve been notified and are looking into it.'}
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-2)]"
      >
        <RefreshCwIcon size={12} />
        Try again
      </button>
      {process.env.NODE_ENV !== 'production' && error.digest && (
        <p className="text-[10px] text-[var(--color-text-faint)] font-mono">
          Error digest: {error.digest}
        </p>
      )}
    </div>
  );
}
