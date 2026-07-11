'use client';

import { useState } from 'react';
import { signUp } from '@/lib/auth/client';

export function SignUpFormSplit() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signUp.email({ name, email, password, callbackURL: '/onboarding' });
      if (res && 'error' in res && res.error) {
        setError(res.error.message ?? res.error.statusText ?? 'Sign up failed');
      } else {
        setDone(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Sign up failed. Check console.');
      console.error('[sign-up]', err);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="auth-split-success" role="status" aria-live="polite">
        Account created. Check your email to verify your address — you&apos;ll be guided through workspace setup next.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-split-fields" noValidate>
      {error && <div className="auth-split-error" role="alert">{error}</div>}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full name"
        required
        autoComplete="name"
        className="auth-split-input"
      />
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
        placeholder="Choose a password (min 12 characters)"
        required
        minLength={12}
        autoComplete="new-password"
        className="auth-split-input"
      />
      <button
        type="submit"
        className="auth-split-submit"
        disabled={loading}
      >
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
