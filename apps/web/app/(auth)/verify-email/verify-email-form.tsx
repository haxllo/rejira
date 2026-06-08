'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { LoaderIcon, RefreshCwIcon, ShieldCheckIcon, CircleAlertIcon, ArrowLeftIcon } from '@/components/icons';
import { verifyEmail, sendVerificationEmail } from '@/lib/auth/client';

type Status = 'verifying' | 'success' | 'error';
type ResendStatus = 'idle' | 'sending' | 'sent' | 'error';

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [error, setError] = useState<string>(token ? '' : 'No verification token found in the link.');
  const [resendEmail, setResendEmail] = useState<string>(params.get('email') ?? '');
  const [resendStatus, setResendStatus] = useState<ResendStatus>('idle');
  const [resendMessage, setResendMessage] = useState<string>('');
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token || status !== 'verifying') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await verifyEmail({ query: { token } });
        if (cancelled) return;
        if (res.error) {
          setStatus('error');
          setError(res.error.message ?? res.error.statusText ?? 'This link is invalid or has expired.');
          return;
        }
        setStatus('success');
        redirectTimerRef.current = setTimeout(() => {
          router.push('/sign-in?verified=1');
        }, 1800);
      } catch (err: unknown) {
        if (cancelled) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      }
    })();
    return () => {
      cancelled = true;
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, [token, status, router]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail) return;
    setResendStatus('sending');
    setResendMessage('');
    try {
      const res = await sendVerificationEmail({
        email: resendEmail,
        callbackURL: '/verify-email',
      });
      if (res.error) {
        setResendStatus('error');
        setResendMessage(res.error.message ?? res.error.statusText ?? 'Failed to send verification email.');
        return;
      }
      setResendStatus('sent');
      setResendMessage('Check your inbox for a new verification link.');
    } catch (err: unknown) {
      setResendStatus('error');
      setResendMessage(err instanceof Error ? err.message : 'Failed to send verification email.');
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === 'verifying' && (
        <motion.div
          key="verifying"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="auth-state"
          role="status"
          aria-live="polite"
        >
          <div className="auth-state-icon auth-state-icon--neutral">
            <LoaderIcon size={20} className="auth-spinner" />
          </div>
          <h2 className="auth-state-title">Verifying your email</h2>
          <p className="auth-state-description">Hang on while we confirm your link is valid.</p>
        </motion.div>
      )}

      {status === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="auth-state"
          role="status"
          aria-live="polite"
        >
          <div className="auth-state-icon auth-state-icon--success">
            <ShieldCheckIcon size={20} />
          </div>
          <h2 className="auth-state-title">Email verified</h2>
          <p className="auth-state-description">You&apos;re all set. Redirecting you to sign in&hellip;</p>
          <a href="/sign-in?verified=1" className="auth-button auth-button-secondary mt-4">
            Sign in now
          </a>
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div
          key="error"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="auth-state"
        >
          <div className="auth-state-icon auth-state-icon--danger">
            <CircleAlertIcon size={20} />
          </div>
          <h2 className="auth-state-title">We couldn&apos;t verify that link</h2>
          <p className="auth-state-description">{error}</p>

          <form onSubmit={handleResend} className="auth-form mt-2 w-full">
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="aria@acme.dev"
                required
                autoComplete="email"
                disabled={resendStatus === 'sending' || resendStatus === 'sent'}
              />
            </label>
            <button
              type="submit"
              className="auth-button"
              disabled={resendStatus === 'sending' || resendStatus === 'sent' || !resendEmail}
            >
              <RefreshCwIcon size={14} />
              {resendStatus === 'sending'
                ? 'Sending…'
                : resendStatus === 'sent'
                  ? 'Verification email sent'
                  : 'Resend verification email'}
            </button>
            {resendMessage && (
              <div
                className={resendStatus === 'error' ? 'auth-error' : 'auth-success'}
                role="status"
                aria-live="polite"
              >
                {resendMessage}
              </div>
            )}
          </form>

          <p className="auth-footer mt-2">
            <a href="/sign-in" className="auth-link inline-flex items-center gap-1">
              <ArrowLeftIcon size={12} />
              Back to sign in
            </a>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function VerifyEmailForm() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailFallback() {
  return (
    <div className="auth-state" role="status" aria-live="polite">
      <div className="auth-state-icon auth-state-icon--neutral">
        <LoaderIcon size={20} className="auth-spinner" />
      </div>
      <h2 className="auth-state-title">Loading verification</h2>
      <p className="auth-state-description">Just a moment…</p>
    </div>
  );
}
