import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { uploadFile, waitForProcessing, verifyPDFFile } from './helpers';

test.describe('PDF Organization Tools E2E Tests', () => {
  let multiPagePDF: string;

  test.beforeAll(async () => {
    const testDataDir = path.join(__dirname, '../test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const pdf = await PDFDocument.create();
    for (let i = 0; i < 3; i++) {
      const page = pdf.addPage([612, 792]);
      page.drawText(`Page ${i + 1}`, { x: 50, y: 700, size: 20 });
    }
    const pdfBytes = await pdf.save();
    multiPagePDF = path.join(testDataDir, 'organize-test.pdf');
    fs.writeFileSync(multiPagePDF, pdfBytes);
  });

  test('should organize PDF (reorder pages)', async ({ page }) => {
    await page.goto('/organize-pdf');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(multiPagePDF);
    await page.waitForTimeout(1000);

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const processButton = page.locator('button:has-text("Organize"), button:has-text("Download")').first();
    await processButton.click();

    await waitForProcessing(page);
    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '../downloads', download.suggestedFilename());
    const downloadDir = path.dirname(downloadPath);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    await download.saveAs(downloadPath);

    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(await verifyPDFFile(downloadPath)).toBe(true);
  });
});

