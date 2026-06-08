export const accountLinkingConfig = {
  enabled: true,
  trustedProviders: ['google', 'github'] as string[],
  allowUnlinking: true,
};

export function isProviderTrusted(provider: string): boolean {
  return accountLinkingConfig.trustedProviders.includes(provider);
}

export async function linkAccount(userId: string, provider: string): Promise<boolean> {
  if (!isProviderTrusted(provider)) {
    throw new Error(`Provider "${provider}" is not trusted for automatic account linking`);
  }
  try {
    const { authClient } = await import('./client');
    const result = await (authClient as unknown as Record<string, CallableFunction>).linkSocialAccount({ userId, provider });
    return result?.ok ?? false;
  } catch {
    return false;
  }
}

export async function unlinkAccount(accountId: string): Promise<boolean> {
  try {
    const { authClient } = await import('./client');
    const result = await (authClient as unknown as Record<string, CallableFunction>).unlinkAccount({ accountId });
    return result?.ok ?? false;
  } catch {
    return false;
  }
}

export async function getLinkedAccounts(userId: string): Promise<Array<{ id: string; provider: string; providerAccountId: string }>> {
  try {
    const { authClient } = await import('./client');
    const result = await (authClient as unknown as Record<string, CallableFunction>).listAccounts();
    return (result?.data ?? result ?? []) as Array<{ id: string; provider: string; providerAccountId: string }>;
  } catch {
    return [];
  }
}
