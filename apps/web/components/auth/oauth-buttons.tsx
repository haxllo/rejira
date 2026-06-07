// Phase 3 — Stream 3C: OAuth sign-in buttons.

"use client";

import { useState } from 'react';
import { signIn } from '@/lib/auth/client';
import { isOAuthConfigured } from '@/lib/auth/oauth-config';

export function OAuthButtons() {
  if (!isOAuthConfigured()) return null;

  return (
    <div className="oauth-buttons">
      <div className="auth-separator">
        <span>or continue with</span>
      </div>
      <div className="oauth-grid">
        <OAuthButton provider="google" label="Google" />
        <OAuthButton provider="github" label="GitHub" />
      </div>
    </div>
  );
}

function OAuthButton({ provider, label }: { provider: 'google' | 'github'; label: string }) {
  const [loading, setLoading] = useState(false);
  const disabled = !isOAuthConfigured(provider);

  async function handleClick() {
    setLoading(true);
    try {
      await signIn.social({ provider, callbackURL: '/inbox' });
    } catch (err: unknown) {
      console.error(`[oauth-${provider}]`, err);
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      className="oauth-button"
      onClick={handleClick}
      disabled={disabled || loading}
    >
      <span className="oauth-icon">{provider === 'google' ? 'G' : 'GH'}</span>
      {loading ? 'Connecting...' : label}
    </button>
  );
}
