// Phase 3 — Stream 3B: Forgot password form.

"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
// Use the correct Better Auth password reset request method
const requestReset = (authClient as any).requestPasswordReset || (authClient as any).forgetPassword;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestReset({
        email,
        redirectTo: "/reset-password",
      });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-success">
        <p>Reset link sent!</p>
        <p className="auth-description">Check your email for a password reset link.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && <div className="auth-error">{error}</div>}
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
      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}
