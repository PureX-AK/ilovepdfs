import { test, expect } from '@playwright/test';
import { preparePageForScreenshot, compareScreenshot } from './helpers';

test.describe('Other Pages Visual Regression', () => {
  test('should match features page baseline', async ({ page }) => {
    await page.goto('/features');
    await preparePageForScreenshot(page);
    await compareScreenshot(page, 'features-page');
  });

  test('should match pricing page baseline', async ({ page }) => {
    await page.goto('/pricing');
    await preparePageForScreenshot(page);
    await compareScreenshot(page, 'pricing-page');
  });

  test('should match contact page baseline', async ({ page }) => {
    await page.goto('/contact');
    await preparePageForScreenshot(page);
    await compareScreenshot(page, 'contact-page');
  });

  test('should match test suite page baseline', async ({ page }) => {
    await page.goto('/test');
    await preparePageForScreenshot(page);
    await compareScreenshot(page, 'test-suite-page');
  });

  test('should match privacy policy page baseline', async ({ page }) => {
    await page.goto('/privacy');
    await preparePageForScreenshot(page);
    await compareScreenshot(page, 'privacy-page');
  });

  test('should match terms of service page baseline', async ({ page }) => {
    await page.goto('/terms');
    await preparePageForScreenshot(page);
    await compareScreenshot(page, 'terms-page');
  });
});

