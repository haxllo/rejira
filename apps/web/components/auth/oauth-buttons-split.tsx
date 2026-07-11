'use client';

import { useState } from 'react';
import { signIn } from '@/lib/auth/client';
import { isOAuthConfigured } from '@/lib/auth/oauth-config';

export function OAuthButtonsSplit() {
  if (!isOAuthConfigured()) return null;

  return (
    <div className="auth-split-oauth">
      <div className="auth-split-oauth-stack">
        <OAuthButton provider="google" label="Sign in with Google" />
        <OAuthButton provider="github" label="Sign in with Github" />
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
      className="auth-split-oauth-btn"
      onClick={handleClick}
      disabled={disabled || loading}
    >
      <span className="auth-split-oauth-icon" aria-hidden="true">
        {provider === 'google' ? <GoogleIcon /> : <GitHubIcon />}
      </span>
      {loading ? 'Connecting…' : label}
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8055.54-1.8368.8595-3.0477.8595-2.3441 0-4.3282-1.5831-5.0359-3.7104H.9573v2.3318C2.4382 15.9831 5.4818 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.9641 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.9641 10.71z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5814-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.9641 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="#0F0F0F">
      <path d="M12 .297C5.37.297 0 5.67 0 12.297c0 5.302 3.438 9.8 8.205 11.387.6.111.82-.26.82-.578 0-.286-.011-1.234-.017-2.238-3.338.726-4.043-1.61-4.043-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.082-.729.082-.729 1.205.085 1.84 1.236 1.84 1.236 1.07 1.834 2.807 1.304 3.492.997.108-.776.42-1.304.764-1.604-2.665-.305-5.466-1.334-5.466-5.93 0-1.31.467-2.381 1.235-3.221-.124-.303-.535-1.527.117-3.181 0 0 1.008-.322 3.3 1.23.957-.266 1.983-.399 3.005-.404 1.02.005 2.047.138 3.006.404 2.289-1.552 3.295-1.23 3.295-1.23.654 1.654.243 2.878.12 3.181.77.84 1.234 1.911 1.234 3.221 0 4.609-2.806 5.62-5.479 5.92.43.371.815 1.102.815 2.222 0 1.604-.015 2.896-.015 3.293 0 .322.218.696.825.578C20.565 22.092 24 17.594 24 12.297 24 5.67 18.627.297 12 .297z" />
    </svg>
  );
}
