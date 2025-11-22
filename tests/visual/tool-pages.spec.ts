import { test, expect } from '@playwright/test';
import { preparePageForScreenshot, compareScreenshot } from './helpers';

// Key tool pages to test
const toolPages = [
  { id: 'merge', name: 'Merge PDF' },
  { id: 'split', name: 'Split PDF' },
  { id: 'compress', name: 'Compress PDF' },
  { id: 'pdf-to-word', name: 'PDF to Word' },
  { id: 'rotate-pdf', name: 'Rotate PDF' },
  { id: 'edit-pdf', name: 'Edit PDF' },
  { id: 'sign-pdf', name: 'Sign PDF' },
  { id: 'watermark-pdf', name: 'Watermark PDF' },
];

test.describe('Tool Pages Visual Regression', () => {
  for (const tool of toolPages) {
    test(`should match ${tool.name} page baseline`, async ({ page }) => {
      await page.goto(`/${tool.id}`);
      await preparePageForScreenshot(page);
      await compareScreenshot(page, `tool-${tool.id}-page`);
    });

    test(`should match ${tool.name} upload area`, async ({ page }) => {
      await page.goto(`/${tool.id}`);
      await preparePageForScreenshot(page);
      
      const uploadArea = page.locator('[class*="upload"], [class*="drop"], [class*="file"]').first();
      if (await uploadArea.count() > 0) {
        await expect(uploadArea).toHaveScreenshot(`tool-${tool.id}-upload-area.png`, {
          animations: 'disabled',
        });
      }
    });
  }
});

