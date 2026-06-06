// Phase 3 — Stream 3C: Account linking by email.
//
// Better Auth supports account linking natively via the `accountLinking`
// option. When a new OAuth user signs in with an email that matches
// an existing user, the OAuth `account` row is linked to the existing
// `user` row instead of creating a duplicate.
//
// This module provides the linking configuration and a helper to check
// if linking is enabled for a given provider.

export const accountLinkingConfig = {
  enabled: true,
  // Only trust Google and GitHub — email/password and magic link can't
  // be linked automatically because the user hasn't proved email ownership
  // on those providers (they could have typed any email).
  trustedProviders: ["google", "github"] as string[],

  // Allow users to link multiple OAuth accounts to the same user.
  // When disabled, a second Google account with the same email would
  // be rejected rather than linking.
  allowUnlinking: true,
};

export function isProviderTrusted(provider: string): boolean {
  return accountLinkingConfig.trustedProviders.includes(provider);
}
