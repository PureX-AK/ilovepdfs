import { test, expect } from '@playwright/test';
import { preparePageForScreenshot, compareScreenshot } from './helpers';

test.describe('Navigation Visual Regression', () => {
  test('should match header navigation', async ({ page }) => {
    await page.goto('/');
    await preparePageForScreenshot(page);
    
    const header = page.locator('header').first();
    await expect(header).toHaveScreenshot('navigation-header.png', {
      animations: 'disabled',
    });
  });

  test('should match mobile menu when open', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"]').first();
    if (await menuButton.count() > 0) {
      await menuButton.click();
      await page.waitForTimeout(500); // Wait for menu animation
      await preparePageForScreenshot(page);
      
      const mobileMenu = page.locator('nav, [class*="menu"]').first();
      await expect(mobileMenu).toHaveScreenshot('navigation-mobile-menu.png', {
        animations: 'disabled',
      });
    }
  });

  test('should match footer navigation', async ({ page }) => {
    await page.goto('/');
    await preparePageForScreenshot(page);
    
    const footer = page.locator('footer').first();
    await expect(footer).toHaveScreenshot('navigation-footer.png', {
      animations: 'disabled',
    });
  });
});

