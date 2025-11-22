import { test, expect } from '@playwright/test';
import { preparePageForScreenshot } from './helpers';

test.describe('Component Visual Regression', () => {
  test('should match tool card component', async ({ page }) => {
    await page.goto('/');
    await preparePageForScreenshot(page);
    
    // Find first tool card
    const toolCard = page.locator('[class*="card"], [class*="tool"]').first();
    if (await toolCard.count() > 0) {
      await expect(toolCard).toHaveScreenshot('component-tool-card.png', {
        animations: 'disabled',
      });
    }
  });

  test('should match button styles', async ({ page }) => {
    await page.goto('/');
    await preparePageForScreenshot(page);
    
    // Find primary button
    const primaryButton = page.locator('button, a[class*="button"]').filter({
      hasText: /Sign Up|Get Started|Convert|Merge/i,
    }).first();
    
    if (await primaryButton.count() > 0) {
      await expect(primaryButton).toHaveScreenshot('component-primary-button.png', {
        animations: 'disabled',
      });
    }
  });

  test('should match form input styles', async ({ page }) => {
    await page.goto('/login');
    await preparePageForScreenshot(page);
    
    const input = page.locator('input[type="email"], input[type="text"]').first();
    if (await input.count() > 0) {
      await expect(input).toHaveScreenshot('component-input-field.png', {
        animations: 'disabled',
      });
    }
  });
});

