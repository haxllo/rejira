"use client";
import { useState } from 'react';
import { verifyTwoFactor } from '@/lib/auth/two-factor';

export function TwoFactorForm({ onSuccess }: { onSuccess?: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(3);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyTwoFactor(code);
      if (result && 'error' in result) {
        const newRemaining = remaining - 1;
        setRemaining(newRemaining);
        if (newRemaining <= 0) {
          setError('Account locked for 15 minutes. Too many failed attempts.');
        } else {
          setError(`Invalid code. ${newRemaining} attempt${newRemaining !== 1 ? 's' : ''} remaining.`);
        }
      } else {
        onSuccess?.();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code');
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
