// Phase 3 — Sign-in form.
"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth/client";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn.email({ email, password, callbackURL: "/inbox" });
      setDone(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Sign in failed — check console for details");
      console.error("[sign-in]", err);
    } finally {
      setLoading(false);
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
    <form onSubmit={handleSubmit} className="auth-form">
      {error && <div className="auth-error">{error}</div>}
      <label className="auth-field">
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="aria@acme.dev" required autoComplete="email" />
      </label>
      <label className="auth-field">
        <span>Password</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 12 characters" required minLength={12} autoComplete="current-password" />
      </label>
      <div className="auth-field-row">
        <a href="/forgot-password" className="auth-link">Forgot password?</a>
      </div>
      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
