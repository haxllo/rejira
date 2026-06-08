'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn, sendVerificationEmail } from '@/lib/auth/client';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { RefreshCwIcon, ShieldCheckIcon } from '@/components/icons';

type ResendState = 'idle' | 'sending' | 'sent' | 'error';

export function SignInForm() {
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
      <div className="auth-success text-center py-4">
        <p className="mb-2">Signed in!</p>
        <a href="/inbox" className="auth-link">Go to inbox →</a>
      </div>
    );
  }

  return (
    <>
      {verifiedFlag && (
        <div className="auth-verified-banner" role="status" aria-live="polite">
          <ShieldCheckIcon size={14} />
          <span>Email verified. You can sign in now.</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="auth-form">
        {error && <div className="auth-error">{error}</div>}
        {unverified && (
          <div className="auth-warning">
            <p>Your email isn&apos;t verified yet.</p>
            <button
              type="button"
              className="auth-resend-button"
              onClick={handleResend}
              disabled={resend === 'sending' || resend === 'sent' || !email}
            >
              <RefreshCwIcon size={12} />
              {resend === 'sending'
                ? 'Sending…'
                : resend === 'sent'
                  ? 'Verification email sent'
                  : 'Resend verification email'}
            </button>
            {resendMessage && (
              <p className={resend === 'error' ? 'auth-error mt-2' : 'auth-success mt-2'}>
                {resendMessage}
              </p>
            )}
          </div>
        )}
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="aria@acme.dev"
            required
            autoComplete="email"
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 12 characters"
            required
            minLength={12}
            autoComplete="current-password"
          />
        </label>
        <div className="auth-field-row">
          <a href="/forgot-password" className="auth-link">Forgot password?</a>
        </div>
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <OAuthButtons />
    </>
  );
}

function looksLikeUnverified(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('email not verified') || m.includes('verify your email') || m.includes('unverified');
}
