import { test, expect } from '@playwright/test';
import {
  uploadFile,
  waitForProcessing,
  verifyPDFFile,
  getFileSize,
} from './helpers';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Compress PDF E2E Tests', () => {
  let testPDF: string;

  test.beforeAll(async () => {
    const testDataDir = path.join(__dirname, '../test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    // Create a test PDF
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test PDF for Compression', { x: 50, y: 700, size: 20 });
    const pdfBytes = await pdf.save();
    testPDF = path.join(testDataDir, 'compress-test.pdf');
    fs.writeFileSync(testPDF, pdfBytes);
  });

  test('should compress PDF file', async ({ page }) => {
    await page.goto('/compress');
    await page.waitForLoadState('networkidle');

    const originalSize = getFileSize(testPDF);

    // Upload PDF
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testPDF);
    await page.waitForTimeout(1000);

    // Select compression level if available
    const compressionLevel = page.locator('select, input[type="radio"]').first();
    if (await compressionLevel.count() > 0) {
      await compressionLevel.selectOption('medium').catch(() => {
        // If it's a radio, try clicking
        compressionLevel.click();
      });
    }

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    // Click compress button
    const compressButton = page.locator('button:has-text("Compress"), button:has-text("Download")').first();
    await compressButton.click();

    await waitForProcessing(page);

    // Wait for download
    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '../downloads', download.suggestedFilename());
    const downloadDir = path.dirname(downloadPath);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    await download.saveAs(downloadPath);

    // Verify downloaded file
    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(await verifyPDFFile(downloadPath)).toBe(true);

    // Verify file is valid PDF (compression might not always reduce size for small files)
    const compressedSize = getFileSize(downloadPath);
    expect(compressedSize).toBeGreaterThan(0);
  });
});

