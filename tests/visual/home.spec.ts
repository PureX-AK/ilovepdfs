import { test, expect } from '@playwright/test';
import { preparePageForScreenshot, compareScreenshot } from './helpers';

test.describe('Home Page Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await preparePageForScreenshot(page);
  });

  test('should match home page baseline', async ({ page }) => {
    await compareScreenshot(page, 'home-page-full');
  });

  test('should match hero section', async ({ page }) => {
    const hero = page.locator('section').first();
    await expect(hero).toHaveScreenshot('home-hero-section.png', {
      animations: 'disabled',
    });
  });

  test('should match tools grid', async ({ page }) => {
    const toolsGrid = page.locator('[class*="grid"]').filter({
      hasText: /Merge PDF|Split PDF/i,
    }).first();
    
    await expect(toolsGrid).toHaveScreenshot('home-tools-grid.png', {
      animations: 'disabled',
    });
  });

  test('should match header', async ({ page }) => {
    const header = page.locator('header').first();
    await expect(header).toHaveScreenshot('home-header.png', {
      animations: 'disabled',
    });
  });

  test('should match footer', async ({ page }) => {
    const footer = page.locator('footer').first();
    await expect(footer).toHaveScreenshot('home-footer.png', {
      animations: 'disabled',
    });
  });

  test('mobile viewport should match baseline', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await preparePageForScreenshot(page);
    await compareScreenshot(page, 'home-page-mobile');
  });

  test('tablet viewport should match baseline', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await preparePageForScreenshot(page);
    await compareScreenshot(page, 'home-page-tablet');
  });
});

