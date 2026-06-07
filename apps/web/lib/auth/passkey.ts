import 'server-only';

export interface PasskeyCredential {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export async function enrollPasskey(userId: string): Promise<{
  options: PublicKeyCredentialCreationOptions;
  challenge: string;
}> {
  const { auth } = await import('./server');
  try {
    const result = await (auth.api as Record<string, CallableFunction>).addPasskey?.({
      body: { userId },
    });
    return {
      options: (result as { options: PublicKeyCredentialCreationOptions }).options,
      challenge: (result as { challenge: string }).challenge || '',
    };
  } catch (err) {
    console.error('[passkey] Enrollment failed:', err);
    throw new Error('Failed to enroll passkey');
  }
}

export async function verifyPasskeyRegistration(
  userId: string,
  credential: Record<string, unknown>,
): Promise<boolean> {
  const { auth } = await import('./server');
  try {
    await (auth.api as Record<string, CallableFunction>).verifyPasskey?.({
      body: { userId, ...credential },
    });
    return true;
  } catch {
    return false;
  }
}

export async function signInWithPasskey(): Promise<{
  options: PublicKeyCredentialRequestOptions;
  challenge: string;
}> {
  const { auth } = await import('./server');
  try {
    const result = await (auth.api as Record<string, CallableFunction>).signInPasskey?.({});
    return {
      options: (result as { options: PublicKeyCredentialRequestOptions }).options,
      challenge: (result as { challenge: string }).challenge || '',
    };
  } catch (err) {
    console.error('[passkey] Sign-in failed:', err);
    throw new Error('Failed to sign in with passkey');
  }
}

export async function verifyPasskeySignIn(
  credential: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { auth } = await import('./server');
  try {
    const result = await (auth.api as Record<string, CallableFunction>).verifyPasskeySignIn?.({
      body: credential,
    });
    return result as Record<string, unknown>;
  } catch (err) {
    console.error('[passkey] Sign-in verification failed:', err);
    throw new Error('Passkey sign-in verification failed');
  }
}

export async function removePasskey(userId: string, credentialId: string): Promise<void> {
  const { auth } = await import('./server');
  try {
    await (auth.api as Record<string, CallableFunction>).removePasskey?.({
      body: { userId, credentialId },
    });
  } catch (err) {
    console.error('[passkey] Removal failed:', err);
    throw new Error('Failed to remove passkey');
  }
}

export async function listPasskeys(userId: string): Promise<PasskeyCredential[]> {
  const { auth } = await import('./server');
  try {
    const result = await (auth.api as Record<string, CallableFunction>).listPasskeys?.({
      query: { userId },
    });
    const list = (result as { passkeys?: Array<Record<string, unknown>> }).passkeys || [];
    return list.map((pk: Record<string, unknown>) => ({
      id: pk.id as string,
      name: pk.name as string || 'Unknown device',
      createdAt: pk.createdAt as string || new Date().toISOString(),
      lastUsedAt: pk.lastUsedAt as string || null,
    }));
  } catch {
    return [];
  }
}
