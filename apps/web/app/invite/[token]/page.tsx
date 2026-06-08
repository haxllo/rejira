'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth/client';
import { acceptInviteAction } from '@/lib/auth/server-actions';

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const token = params?.token as string;

  const [status, setStatus] = useState<'loading' | 'success' | 'expired' | 'invalid' | 'needs-auth'>('loading');
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionLoading) return;

    if (!session?.user) {
      setStatus('needs-auth');
      return;
    }

    async function accept() {
      try {
        const result = await acceptInviteAction(token);
        setWorkspaceName((result as Record<string, unknown>).workspaceName as string || 'the workspace');
        setStatus('success');
        setTimeout(() => {
          router.push('/');
        }, 2000);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (msg.toLowerCase().includes('expired')) {
          setStatus('expired');
        } else {
          setStatus('invalid');
          setError(msg);
        }
      }
    }

    accept();
  }, [token, session, sessionLoading, router]);

  return (
    <div style={{
      maxWidth: 480,
      margin: '80px auto',
      textAlign: 'center',
      padding: 40,
      background: 'var(--color-surface-1)',
      borderRadius: 12,
      border: '1px solid var(--color-border)',
    }}>
      {status === 'loading' && (
        <div>
          <p style={{ fontSize: 16, color: 'var(--color-text)' }}>Accepting invitation...</p>
          <p style={{ color: 'var(--color-text-subtle)', fontSize: 13, marginTop: 12 }}>
            Verifying your invitation token...
          </p>
        </div>
      )}

      {status === 'needs-auth' && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: 'var(--color-text)' }}>
            Sign in to accept
          </h2>
          <p style={{ color: 'var(--color-text-subtle)', fontSize: 13, marginBottom: 24 }}>
            You need to sign in or create an account to accept this invitation.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a
              href={`/sign-in?callbackUrl=/invite/${token}`}
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: 'var(--color-accent)',
                color: 'var(--color-accent-fg)',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Sign In
            </a>
            <a
              href={`/sign-up?callbackUrl=/invite/${token}`}
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text)',
                borderRadius: 6,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: 'none',
                border: '1px solid var(--color-border)',
              }}
            >
              Sign Up
            </a>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'hsl(140 60% 70%)' }}>
            You&apos;re in!
          </h2>
          <p style={{ color: 'var(--color-text)', fontSize: 14 }}>
            You&apos;ve joined {workspaceName || 'the workspace'}.
          </p>
          <p style={{ color: 'var(--color-text-subtle)', fontSize: 13, marginTop: 8 }}>
            Redirecting to your workspace...
          </p>
        </div>
      )}

      {status === 'expired' && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'hsl(0 80% 70%)' }}>
            Invitation expired
          </h2>
          <p style={{ color: 'var(--color-text-subtle)', fontSize: 13 }}>
            This invitation has expired. Ask the workspace owner to send a new one.
          </p>
        </div>
      )}

      {status === 'invalid' && (
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'hsl(0 80% 70%)' }}>
            Invalid invitation
          </h2>
          <p style={{ color: 'var(--color-text-subtle)', fontSize: 13 }}>
            This invitation is no longer valid.
          </p>
          {error && (
            <p style={{ color: 'var(--color-text-subtle)', fontSize: 11, marginTop: 8, wordBreak: 'break-all' }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
