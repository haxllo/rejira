"use client";
import { useState } from "react";
import { enableTwoFactor } from "@/lib/auth/two-factor";

export function TwoFactorSetup({ onDone }: { onDone?: () => void }) {
  const [password, setPassword] = useState("");
  const [secret, setSecret] = useState<{ totpURI: string; secret: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await enableTwoFactor(password) as any;
      setSecret(result as { totpURI: string; secret: string });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to enable 2FA");
    } finally {
      setLoading(false);
    }
  }

  if (secret) {
    return (
      <div>
        <div className="auth-success">
          <p>Scan this QR code with your authenticator app:</p>
        </div>
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(secret.totpURI)}`}
          alt="QR code"
          className="auth-qr"
        />
        <p className="auth-description">
          Or enter this secret manually: <code>{secret.secret}</code>
        </p>
        <button className="auth-button" onClick={onDone}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleEnable} className="auth-form">
      {error && <div className="auth-error">{error}</div>}
      <p className="auth-description">
        Enter your password to enable two-factor authentication.
      </p>
      <label className="auth-field">
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </label>
      <button type="submit" className="auth-button" disabled={loading}>
        {loading ? "Setting up..." : "Enable 2FA"}
      </button>
    </form>
  );
}
