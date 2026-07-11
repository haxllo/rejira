'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn, sendVerificationEmail } from '@/lib/auth/client';
import { RefreshCwIcon, ShieldCheckIcon } from '@/components/icons';

type ResendState = 'idle' | 'sending' | 'sent' | 'error';

export function SignInFormSplit() {
  const params = useSearchParams();
  const verifiedFlag = params.get('verified') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resend, setResend] = useState<ResendState>('idle');
  const [resendMessage, setResendMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setUnverified(false);
    setResend('idle');
    setResendMessage('');
    setLoading(true);
    try {
      const res = await signIn.email({ email, password, callbackURL: '/inbox' });
      if (res && 'error' in res && res.error) {
        const message = res.error.message ?? res.error.statusText ?? 'Sign in failed';
        setError(message);
        if (looksLikeUnverified(message)) {
          setUnverified(true);
        }
      } else {
        setDone(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Sign in failed. Check console.');
      if (looksLikeUnverified(msg)) setUnverified(true);
      console.error('[sign-in]', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) return;
    setResend('sending');
    setResendMessage('');
    try {
      const res = await sendVerificationEmail({
        email,
        callbackURL: '/verify-email',
      });
      if (res.error) {
        setResend('error');
        setResendMessage(res.error.message ?? res.error.statusText ?? 'Failed to send verification email.');
        return;
      }
      setResend('sent');
      setResendMessage('Verification email sent. Check your inbox.');
    } catch (err: unknown) {
      setResend('error');
      setResendMessage(err instanceof Error ? err.message : 'Failed to send verification email.');
    }
  }

  if (done) {
    return (
      <div className="auth-split-success text-center" role="status" aria-live="polite">
        Signed in. Redirecting to your inbox…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-split-fields" noValidate>
      {verifiedFlag && (
        <div className="auth-split-banner" role="status" aria-live="polite">
          <ShieldCheckIcon size={14} />
          <span>Email verified. You can sign in now.</span>
        </div>
      )}
      {error && <div className="auth-split-error" role="alert">{error}</div>}
      {unverified && (
        <div className="auth-split-banner" role="status">
          <div className="flex flex-col gap-2 w-full">
            <span>Your email isn&apos;t verified yet.</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resend === 'sending' || resend === 'sent' || !email}
              className="self-start inline-flex items-center gap-1.5 text-[12px] font-semibold text-[rgba(0,0,0,0.7)] underline-offset-2 hover:underline disabled:opacity-50"
            >
              <RefreshCwIcon size={12} />
              {resend === 'sending'
                ? 'Sending…'
                : resend === 'sent'
                  ? 'Verification email sent'
                  : 'Resend verification email'}
            </button>
            {resendMessage && (
              <span className="text-[12px] opacity-80">{resendMessage}</span>
            )}
          </div>
        </div>
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        autoComplete="email"
        className="auth-split-input"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
        required
        autoComplete="current-password"
        className="auth-split-input"
      />
      <button
        type="submit"
        className="auth-split-submit"
        disabled={loading}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

function looksLikeUnverified(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('email not verified') || m.includes('verify your email') || m.includes('unverified');
}
