'use client';

import { useState, useEffect, useCallback } from 'react';

export function PasskeySignIn(): React.ReactElement {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.PublicKeyCredential) {
      setSupported(false);
    }
  }, []);

  const handleSignIn = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const mod = await import('@/lib/auth/passkey');
      const { options } = await mod.signInWithPasskey();

      const credential = await navigator.credentials.get({
        publicKey: options,
      });

      if (!credential) {
        throw new Error('No passkey found for this device');
      }

      const assertion = credential as PublicKeyCredential;
      const response = assertion.response as AuthenticatorAssertionResponse;

      await mod.verifyPasskeySignIn({
        id: assertion.id,
        rawId: Array.from(new Uint8Array(assertion.rawId)),
        response: {
          clientDataJSON: Array.from(new Uint8Array(response.clientDataJSON)),
          authenticatorData: Array.from(new Uint8Array(response.authenticatorData)),
          signature: Array.from(new Uint8Array(response.signature)),
          userHandle: response.userHandle
            ? Array.from(new Uint8Array(response.userHandle))
            : null,
        },
        type: assertion.type,
      } as Record<string, unknown>);

      window.location.href = '/inbox';
    } catch (err) {
      if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err;
      setError(err instanceof Error ? err.message : 'Passkey sign-in failed');
    } finally {
      setLoading(false);
    }
  }, []);

  if (!supported) {
    return (
      <p className="text-xs text-zinc-600 text-center">Passkeys not supported on this device</p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Verifying...' : 'Sign in with passkey'}
      </button>

      {error && (
        <div className="rounded-md bg-red-500/10 p-3 text-xs text-red-400">{error}</div>
      )}
    </div>
  );
}
