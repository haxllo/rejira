'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import type { Locale, Dictionary } from '@/lib/i18n/dict';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/i18n/dict';

let cachedDict: Dictionary | null = null;
let cachedLocale: Locale | null = null;

function resolveLocale(): Locale {
  if (typeof window === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const cookieLocale = document.cookie
    .split('; ')
    .find((row) => row.startsWith('locale='))
    ?.split('=')[1];

  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  if (navigator.language) {
    const browserLang = navigator.language.slice(0, 2);
    const match = SUPPORTED_LOCALES.find((l) => l === browserLang);
    if (match) return match;
  }

  return DEFAULT_LOCALE;
}

export function useLocale() {
  const pathname = usePathname();

  const locale = useMemo((): Locale => {
    const segments = pathname?.split('/').filter(Boolean) ?? [];
    if (segments.length > 0 && SUPPORTED_LOCALES.includes(segments[0] as Locale)) {
      return segments[0] as Locale;
    }
    return resolveLocale();
  }, [pathname]);

  const t = useMemo(() => {
    return (key: string, replacements?: Record<string, string | number>): string => {
      if (!cachedDict || cachedLocale !== locale) {
        return key;
      }
      const parts = key.split('.');
      let current: unknown = cachedDict;

      for (const part of parts) {
        if (typeof current !== 'object' || current === null) {
          return key;
        }
        current = (current as Record<string, unknown>)[part];
      }

      if (typeof current !== 'string') {
        return key;
      }

      if (replacements) {
        let result = current;
        for (const [k, v] of Object.entries(replacements)) {
          result = result.replace(`{${k}}`, String(v));
        }
        return result;
      }

      return current;
    };
  }, [locale]);

  return { locale, t };
}

export async function loadLocaleDict(locale: Locale, dict: Dictionary): Promise<void> {
  cachedDict = dict;
  cachedLocale = locale;
}
