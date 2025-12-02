import { test, expect } from '@playwright/test';
import { uploadFile, waitForProcessing, waitForDownload, verifyPDFFile } from './helpers';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Split PDF E2E Tests', () => {
  let multiPagePDF: string;

  test.beforeAll(async () => {
    // Create a multi-page test PDF
    const testDataDir = path.join(__dirname, '../test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const pdf = await PDFDocument.create();
    
    // Add 3 pages
    for (let i = 0; i < 3; i++) {
      const page = pdf.addPage([612, 792]);
      page.drawText(`Page ${i + 1}`, { x: 50, y: 700, size: 20 });
    }
    
    const pdfBytes = await pdf.save();
    multiPagePDF = path.join(testDataDir, 'multipage.pdf');
    fs.writeFileSync(multiPagePDF, pdfBytes);
  });

  test('should split PDF into individual pages', async ({ page }) => {
    await page.goto('/split');
    await page.waitForLoadState('networkidle');

    // Upload PDF
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(multiPagePDF);
    await page.waitForTimeout(1000);

    // Select split mode (all pages)
    const allPagesOption = page.locator('input[type="radio"][value="all"], label:has-text("All pages")').first();
    if (await allPagesOption.count() > 0) {
      await allPagesOption.click();
    }

    // Click split button (this will process and then redirect to download page)
    const splitButton = page.locator('button:has-text("Split"), button:has-text("Download")').first();
    await splitButton.click();

    // Wait for processing and redirect to download page
    await waitForProcessing(page, 30000);
    await page.waitForURL('**/split/download', { timeout: 30000 });

    // Trigger download from the dedicated download page
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const downloadButton = page.locator('button:has-text("Download")').first();
    await downloadButton.click();

    const downloadPath = await waitForDownload(page, downloadPromise);

    // For "all pages" mode we now deliver a ZIP archive containing all pages
    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(path.extname(downloadPath).toLowerCase()).toBe('.zip');
  });

  test('should split PDF by page range', async ({ page }) => {
    await page.goto('/split');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(multiPagePDF);
    await page.waitForTimeout(1000);

    // Try to select range mode
    const rangeOption = page.locator('input[type="radio"][value="range"], label:has-text("Range")').first();
    if (await rangeOption.count() > 0) {
      await rangeOption.click();
      await page.waitForTimeout(500);

      // Try to enter page range
      const rangeInput = page.locator('input[type="text"], input[placeholder*="page" i], input[placeholder*="range" i]').first();
      if (await rangeInput.count() > 0) {
        await rangeInput.fill('1-2');
      }
    }

    const splitButton = page.locator('button:has-text("Split"), button:has-text("Download")').first();
    await splitButton.click();
    await waitForProcessing(page);
    await page.waitForURL('**/split/download', { timeout: 30000 });

    // Trigger download and verify it is a valid PDF
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const downloadButton = page.locator('button:has-text("Download")').first();
    await downloadButton.click();

    const downloadPath = await waitForDownload(page, downloadPromise);
    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(await verifyPDFFile(downloadPath)).toBe(true);
  });
});

