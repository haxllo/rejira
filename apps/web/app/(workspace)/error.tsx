'use client';

import { PageErrorFallback } from '@/components/error-boundary/page-error-fallback';

interface WorkspaceErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function WorkspaceError({ error, reset }: WorkspaceErrorProps) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <PageErrorFallback
        error={error}
        reset={reset}
      />
    </div>
  );
}
