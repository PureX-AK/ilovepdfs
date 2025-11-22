import { test, expect } from '@playwright/test';
import { preparePageForScreenshot, compareScreenshot } from './helpers';

test.describe('Authentication Pages Visual Regression', () => {
  test('should match login page baseline', async ({ page }) => {
    await page.goto('/login');
    await preparePageForScreenshot(page);
    await compareScreenshot(page, 'auth-login-page');
  });

  test('should match signup page baseline', async ({ page }) => {
    await page.goto('/signup');
    await preparePageForScreenshot(page);
    await compareScreenshot(page, 'auth-signup-page');
  });

  test('should match login form', async ({ page }) => {
    await page.goto('/login');
    await preparePageForScreenshot(page);
    
    const form = page.locator('form').first();
    await expect(form).toHaveScreenshot('auth-login-form.png', {
      animations: 'disabled',
    });
  });

  test('should match signup form', async ({ page }) => {
    await page.goto('/signup');
    await preparePageForScreenshot(page);
    
    const form = page.locator('form').first();
    await expect(form).toHaveScreenshot('auth-signup-form.png', {
      animations: 'disabled',
    });
  });
});

