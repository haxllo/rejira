export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh';

export const SUPPORTED_LOCALES: Locale[] = ['en', 'es', 'fr', 'de', 'ja', 'zh'];

export const DEFAULT_LOCALE: Locale = 'en';

export type Dictionary = Record<string, Record<string, string>>;

const localeCache: Partial<Record<Locale, Dictionary>> = {};

export async function getDict(locale: Locale): Promise<Dictionary> {
  if (localeCache[locale]) {
    return localeCache[locale]!;
  }

  const mod = await import(`./dictionaries/${locale}.json`) as { default: Dictionary };
  localeCache[locale] = mod.default;
  return mod.default;
}

export function t(key: string, dict: Dictionary): string {
  const parts = key.split('.');
  let current: unknown = dict;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }

  if (typeof current !== 'string') {
    return key;
  }

  return current;
}
