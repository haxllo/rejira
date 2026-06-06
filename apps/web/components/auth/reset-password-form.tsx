// Phase 3 — Stream 3B: Reset password form.
//
// The token is extracted from the URL query parameter.

"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { setError("Missing reset token."); return; }
    setError("");
    setLoading(true);
    try {
      await authClient.resetPassword({
        newPassword: password,
        token,
      });
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="auth-success">
        <p>Password updated!</p>
        <p className="auth-description">
          <a href="/sign-in">Sign in with your new password</a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && <div className="auth-error">{error}</div>}
      <label className="auth-field">
        <span>New password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 12 characters"
          required
          minLength={12}
          autoComplete="new-password"
        />
      </label>
      <button type="submit" className="auth-button" disabled={loading || !token}>
        {loading ? "Updating..." : "Set new password"}
      </button>
    </form>
  );
}
