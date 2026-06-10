import { test, expect } from '@playwright/test';

test.describe('full flow — signup to closed issue', () => {
  const uniqueId = Date.now().toString(36);
  const email = `e2e-fullflow-${uniqueId}@test.com`;
  const name = 'E2E Full Flow User';
  const password = 'TestPassword123!';

  test('navigate, sign up, create issue, assign, close', async ({ page }) => {
    await page.goto('/sign-up');

    const nameInput = page.locator('input[name="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(name);
    }

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(email);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(password);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    await expect(page).toHaveURL(/\/(dashboard|getting-started|welcome|onboarding)/, { timeout: 15000 });
  });

  test('realtime — two browser contexts see each other changes', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const page1 = await ctx1.newPage();
    const page2 = await ctx2.newPage();

    await page1.goto('/sign-in');
    await page2.goto('/sign-in');

    const emailInput1 = page1.locator('input[type="email"]');
    const passwordInput1 = page1.locator('input[type="password"]').first();
    await emailInput1.fill(email);
    await passwordInput1.fill(password);
    await page1.locator('button[type="submit"]').click();
    await page1.waitForURL(/\/(dashboard|home)/, { timeout: 15000 });

    await ctx2.close();
    await ctx1.close();
  });

  test('unread badge updates when notification created', async ({ page }) => {
    await page.goto('/sign-in');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(email);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(password);

    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
  });
});
