import { Page, expect } from '@playwright/test';
import * as path from 'path';

/**
 * Visual regression test helpers
 */

// Screenshot directories
export const SCREENSHOT_DIR = path.join(__dirname, '../screenshots');
export const BASELINE_DIR = path.join(__dirname, '../baselines');
export const DIFF_DIR = path.join(__dirname, '../diffs');

/**
 * Take a full page screenshot and compare with baseline
 */
export async function compareScreenshot(
  page: Page,
  name: string,
  options?: {
    fullPage?: boolean;
    threshold?: number;
    maxDiffPixels?: number;
  }
) {
  const fullPage = options?.fullPage ?? true;
  const threshold = options?.threshold ?? 0.2;
  const maxDiffPixels = options?.maxDiffPixels ?? 100;

  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage,
    threshold,
    maxDiffPixels,
    animations: 'disabled',
  });
}

/**
 * Wait for page to be fully loaded and stable
 */
export async function waitForPageStable(page: Page, timeout = 5000) {
  // Wait for network to be idle
  await page.waitForLoadState('networkidle', { timeout });
  
  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);
  
  // Small delay to ensure all animations complete
  await page.waitForTimeout(500);
}

/**
 * Hide dynamic elements that might cause false positives
 */
export async function hideDynamicElements(page: Page) {
  await page.addStyleTag({
    content: `
      /* Hide toast notifications */
      [data-testid="toast"],
      .react-hot-toast {
        display: none !important;
      }
      
      /* Hide loading spinners */
      .animate-spin {
        display: none !important;
      }
      
      /* Hide timestamps and dynamic dates */
      time,
      [data-timestamp] {
        visibility: hidden !important;
      }
    `,
  });
}

/**
 * Set consistent viewport and wait for stability
 */
export async function preparePageForScreenshot(
  page: Page,
  viewport?: { width: number; height: number }
) {
  if (viewport) {
    await page.setViewportSize(viewport);
  }
  
  await waitForPageStable(page);
  await hideDynamicElements(page);
}

/**
 * Take screenshot of specific element
 */
export async function compareElementScreenshot(
  page: Page,
  selector: string,
  name: string,
  options?: {
    threshold?: number;
    maxDiffPixels?: number;
  }
) {
  const element = page.locator(selector);
  await expect(element).toHaveScreenshot(`${name}.png`, {
    threshold: options?.threshold ?? 0.2,
    maxDiffPixels: options?.maxDiffPixels ?? 100,
    animations: 'disabled',
  });
}

