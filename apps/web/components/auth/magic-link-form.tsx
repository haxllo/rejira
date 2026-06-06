// Phase 3 — Stream 3B: Magic link form.

"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth/client";

export function MagicLinkForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn.magicLink({
        email,
        callbackURL: "/inbox",
      });
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-success">
        <p>Magic link sent!</p>
        <p className="auth-description">Check your email for a sign-in link.</p>
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
      <button type="submit" className="auth-button auth-button-secondary" disabled={loading}>
        {loading ? "Sending link..." : "Send magic link"}
      </button>
    </form>
  );
}
