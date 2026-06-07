import { authClient } from './client';

export async function generateBackupCodes(password: string) {
  const api = authClient.twoFactor;
  return (api as Record<string, CallableFunction>).generateBackupCodes({ password }) as Promise<{
    backupCodes: string[];
  }>;
}

export async function getBackupCodes() {
  const api = authClient.twoFactor;
  return (api as Record<string, CallableFunction>).viewBackupCodes() as Promise<{
    backupCodes: string[];
  }>;
}

export async function verifyBackupCode(code: string) {
  const api = authClient.twoFactor;
  return (api as Record<string, CallableFunction>).verifyBackupCode({ code });
}

export async function getRemainingBackupCodes(): Promise<number> {
  const result = await getBackupCodes();
  return result?.backupCodes?.length ?? 0;
}
