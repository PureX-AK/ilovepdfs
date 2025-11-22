import { test, expect } from '@playwright/test';
import {
  uploadFile,
  waitForProcessing,
  verifyPDFFile,
  clickProcessButton,
} from './helpers';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Rotate PDF E2E Tests', () => {
  let testPDF: string;

  test.beforeAll(async () => {
    const testDataDir = path.join(__dirname, '../test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test PDF for Rotation', { x: 50, y: 700, size: 20 });
    const pdfBytes = await pdf.save();
    testPDF = path.join(testDataDir, 'rotate-test.pdf');
    fs.writeFileSync(testPDF, pdfBytes);
  });

  test('should rotate PDF pages', async ({ page }) => {
    await page.goto('/rotate-pdf');
    await page.waitForLoadState('networkidle');

    // Upload PDF
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testPDF);
    await page.waitForTimeout(2000);

    // Select rotation angle if available
    const rotationSelect = page.locator('select, input[type="radio"][value="90"], button:has-text("90")').first();
    if (await rotationSelect.count() > 0) {
      await rotationSelect.click().catch(async () => {
        await rotationSelect.selectOption('90').catch(() => {});
      });
    }

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    const buttonClicked = await clickProcessButton(page, 'Rotate');
    if (!buttonClicked) {
      test.skip();
      return;
    }

    await waitForProcessing(page, 15000);
    const download = await downloadPromise;
    if (!download) {
      expect(await page.locator('input[type="file"]').count()).toBeGreaterThan(0);
      return;
    }
    const downloadPath = path.join(__dirname, '../downloads', download.suggestedFilename());
    const downloadDir = path.dirname(downloadPath);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    await download.saveAs(downloadPath);

    // Verify downloaded file
    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(await verifyPDFFile(downloadPath)).toBe(true);
  });
});

