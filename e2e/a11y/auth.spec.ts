import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from '@axe-core/playwright';

const AUTH_PAGES = [
  { name: 'sign-in', path: '/sign-in' },
  { name: 'sign-up', path: '/sign-up' },
  { name: 'forgot-password', path: '/forgot-password' },
];

for (const { name, path } of AUTH_PAGES) {
  test(`${name} page passes WCAG 2.2 AA accessibility audit`, async ({ page }) => {
    await page.goto(path);
    await page.waitForSelector('form', { timeout: 10000 }).catch(() => {
    });

    await injectAxe(page);
    const violations = await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });

    if (violations.length > 0) {
      const violationList = violations
        .map((v) => `${v.id}: ${v.description} (${v.nodes.length} nodes)`)
        .join('\n');
      console.log(`Accessibility violations on ${name}:\n${violationList}`);
    }

    expect(violations).toEqual([]);
  });
}
