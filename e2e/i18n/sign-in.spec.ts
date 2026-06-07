import { test, expect } from '@playwright/test';

const LOCALES = [
  { code: 'en', expected: 'Sign in' },
  { code: 'es', expected: 'Iniciar sesion' },
  { code: 'fr', expected: 'Se connecter' },
  { code: 'de', expected: 'Anmelden' },
  { code: 'ja', expected: '[JA] Sign in' },
  { code: 'zh', expected: '[ZH] Sign in' },
];

for (const { code, expected } of LOCALES) {
  test(`sign-in page renders in ${code} locale`, async ({ page }) => {
    await page.setExtraHTTPHeaders({
      'Accept-Language': code,
    });
    await page.goto('/sign-in');
    await expect(page.locator('h1')).toContainText(expected);
  });
}
