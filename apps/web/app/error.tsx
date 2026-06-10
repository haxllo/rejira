'use client';

import { PageErrorFallback } from '@/components/error-boundary/page-error-fallback';

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <PageErrorFallback error={error} reset={reset} />
    </div>
  );
}
