'use client';

import { useState, useEffect, useCallback } from 'react';

interface PasskeyCredential {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface PasskeyEnrollmentProps {
  userId: string;
}

export function PasskeyEnrollment({ userId }: PasskeyEnrollmentProps): React.ReactElement {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [newPasskeyName, setNewPasskeyName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.PublicKeyCredential) {
      setSupported(false);
    }
    void loadPasskeys();
  }, []);

  const loadPasskeys = useCallback(async () => {
    try {
      const mod = await import('@/lib/auth/passkey');
      const list = await mod.listPasskeys(userId);
      setPasskeys(list);
    } catch {
      // silently fail
    }
  }, [userId]);

  const handleEnroll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const mod = await import('@/lib/auth/passkey');
      const { options } = await mod.enrollPasskey(userId);

      const credential = await navigator.credentials.create({
        publicKey: options,
      });

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      setShowNameInput(true);
      setNewPasskeyName('');

      const success = await mod.verifyPasskeyRegistration(userId, {
        id: (credential as PublicKeyCredential).id,
        rawId: Array.from(new Uint8Array((credential as PublicKeyCredential).rawId)),
        response: {
          clientDataJSON: Array.from(
            new Uint8Array(
              (credential as PublicKeyCredential).response instanceof AuthenticatorAttestationResponse
                ? (credential as PublicKeyCredential).response.clientDataJSON
                : new ArrayBuffer(0),
            ),
          ),
          attestationObject: Array.from(
            new Uint8Array(
              ((credential as PublicKeyCredential).response as unknown as Record<string, ArrayBuffer>).attestationObject
                ?? new ArrayBuffer(0),
            ),
          ),
        },
        type: (credential as PublicKeyCredential).type,
      } as Record<string, unknown>);

      if (success) {
        await loadPasskeys();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enroll passkey');
    } finally {
      setLoading(false);
      setShowNameInput(false);
    }
  }, [userId, loadPasskeys]);

  const handleRemove = useCallback(async (credentialId: string) => {
    try {
      const mod = await import('@/lib/auth/passkey');
      await mod.removePasskey(userId, credentialId);
      await loadPasskeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove passkey');
    }
  }, [userId, loadPasskeys]);

  if (!supported) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
        <p className="text-sm text-red-400">This device does not support passkeys.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-zinc-200">Passkeys</h3>
          <p className="text-xs text-zinc-500">Sign in without a password using your device.</p>
        </div>
        <button
          type="button"
          onClick={handleEnroll}
          disabled={loading}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add a passkey'}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 p-3 text-xs text-red-400">{error}</div>
      )}

      {showNameInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newPasskeyName}
            onChange={(e) => setNewPasskeyName(e.target.value)}
            placeholder="Name this passkey (e.g., MacBook Touch ID)"
            className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
      )}

      {passkeys.length > 0 && (
        <ul className="space-y-2">
          {passkeys.map((pk) => (
            <li key={pk.id} className="flex items-center justify-between rounded-md bg-zinc-800/50 px-3 py-2">
              <div>
                <p className="text-xs font-medium text-zinc-300">{pk.name}</p>
                <p className="text-[10px] text-zinc-500">
                  Added {new Date(pk.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(pk.id)}
                className="text-xs text-zinc-500 hover:text-red-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
