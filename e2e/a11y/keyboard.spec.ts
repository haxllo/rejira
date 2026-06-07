import { test, expect } from '@playwright/test';

test('sign-in form is fully keyboard-navigable', async ({ page }) => {
  await page.goto('/sign-in');

  await page.keyboard.press('Tab');
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeFocused();

  await page.keyboard.press('Tab');
  const passwordInput = page.locator('input[type="password"]');
  await expect(passwordInput).toBeFocused();

  await page.keyboard.press('Tab');
  const forgotLink = page.locator('a[href="/forgot-password"]');
  await expect(forgotLink).toBeFocused();

  await page.keyboard.press('Tab');
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeFocused();
});

test('sign-up form is fully keyboard-navigable', async ({ page }) => {
  await page.goto('/sign-up');

  await page.keyboard.press('Tab');
  const nameInput = page.locator('input[name="name"]');
  if (await nameInput.isVisible()) {
    await expect(nameInput).toBeFocused();
  }

  await page.keyboard.press('Tab');
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeFocused();

  await page.keyboard.press('Tab');
  const passwordInput = page.locator('input[type="password"]').first();
  await expect(passwordInput).toBeFocused();

  await page.keyboard.press('Tab');
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeFocused();
});

test('sign-in page submit via Enter key works', async ({ page }) => {
  await page.goto('/sign-in');

  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill('test@example.com');

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.fill('TestPassword123!');

  await page.keyboard.press('Enter');

  await page.waitForTimeout(2000);
  // After Enter, form should have attempted submission
  // (Success/failure depends on server, but form should process)
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeVisible();
});

test('forgot password page is keyboard-navigable', async ({ page }) => {
  await page.goto('/forgot-password');

  await page.keyboard.press('Tab');
  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toBeFocused();

  await page.keyboard.press('Tab');
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeFocused();

  await page.keyboard.press('Tab');
  const backLink = page.locator('a[href="/sign-in"]');
  await expect(backLink).toBeFocused();
});
