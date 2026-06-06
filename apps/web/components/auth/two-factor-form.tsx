"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export function TwoFactorForm({ onSuccess }: { onSuccess?: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authClient.twoFactor.verifyTotp({ code });
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {error && <div className="auth-error">{error}</div>}
      <label className="auth-field">
        <span>Enter 6-digit code</span>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          required
          maxLength={6}
          pattern="\d{6}"
          autoComplete="one-time-code"
        />
      </label>
      <button type="submit" className="auth-button" disabled={loading || code.length !== 6}>
        {loading ? "Verifying..." : "Verify"}
      </button>
    </form>
  );
}
