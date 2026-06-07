// Phase 3 — Refined auth layout matching the app's design system.
import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';

export const metadata: Metadata = {
  title: { default: 'Sign In — Rejira', template: '%s — Rejira' },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell>
      {children}
    </AuthShell>
  );
}
