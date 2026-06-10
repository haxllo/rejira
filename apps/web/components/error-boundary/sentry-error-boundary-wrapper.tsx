'use client';

import * as Sentry from '@sentry/nextjs';
import { PageErrorFallback } from './page-error-fallback';

interface SentryErrorBoundaryWrapperProps {
  children: React.ReactNode;
}

export function SentryErrorBoundaryWrapper({ children }: SentryErrorBoundaryWrapperProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <PageErrorFallback
          error={error as Error & { digest?: string }}
          reset={resetError}
          title="Unexpected error"
          message="An error occurred in this section. Try again or contact support."
        />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
