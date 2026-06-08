// Phase 3 — Sign-up form.
"use client";

import { useState } from "react";
import { signUp } from "@/lib/auth/client";

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
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
      <div className="auth-success text-center py-4">
        <p className="mb-2 font-medium">Account created!</p>
        <p className="text-[13px] text-[var(--color-text-muted)] leading-relaxed">
          Check your email to verify your address. After verification, you&apos;ll be guided through workspace setup.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && <div className="auth-error">{error}</div>}
      <label className="auth-field">
        <span>Full name</span>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Aria Vance" required autoComplete="name" />
      </label>
      <label className="auth-field">
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="aria@acme.dev" required autoComplete="email" />
      </label>
      <label className="auth-field">
        <span>Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 12 characters" required minLength={12} autoComplete="new-password" />
      </label>
      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
