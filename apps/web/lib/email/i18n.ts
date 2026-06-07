import type { Locale } from '@/lib/i18n/dict';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n/dict';

export type EmailDictionary = Record<string, Record<string, string>>;

const emailLocaleCache: Partial<Record<Locale, EmailDictionary>> = {};

export async function getEmailLocale(locale: Locale): Promise<EmailDictionary> {
  if (emailLocaleCache[locale]) {
    return emailLocaleCache[locale]!;
  }

  const mod = await import(`./templates/_locales/${locale}.json`) as { default: EmailDictionary };
  emailLocaleCache[locale] = mod.default;
  return mod.default;
}

export function resolveEmailLocale(userLocale?: string | null): Locale {
  if (!userLocale) return DEFAULT_LOCALE;

  const lang = userLocale.slice(0, 2);
  const match = SUPPORTED_LOCALES.find((l) => l === lang);
  return match ?? DEFAULT_LOCALE;
}
