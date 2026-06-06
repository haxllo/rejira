// Phase 3 — Stream 3J: Internationalization dictionaries.
//
// All auth and email strings. 3J fills in all 6 locales.

const en = {
  "auth.signIn": "Sign in",
  "auth.signUp": "Sign up",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.magicLink": "Send magic link",
  "auth.welcome": "Welcome to Rejira",
  "invite.subject": "You've been invited to join a workspace",
  "invite.body": "Click the link to accept the invitation",
};

const dictionaries: Record<string, Record<string, string>> = { en };

export function t(key: string, locale = "en"): string {
  return dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
}
