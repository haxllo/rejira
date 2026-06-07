'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from '@/lib/auth/client';
import { SessionLoadingSkeleton } from './session-loading-skeleton';

interface RequireAuthProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireAuth({ children, fallback }: RequireAuthProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isPending && !session) {
      const signInUrl = new URL('/sign-in', window.location.origin);
      signInUrl.searchParams.set('next', pathname ?? '/');
      router.replace(signInUrl.toString());
    }
  }, [isPending, session, router, pathname]);

  if (isPending) {
    return fallback != null ? <>{fallback}</> : <SessionLoadingSkeleton />;
  }

  if (!session) {
    return fallback != null ? <>{fallback}</> : <SessionLoadingSkeleton />;
  }

  return <>{children}</>;
}
