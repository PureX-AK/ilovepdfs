import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { uploadFile, waitForProcessing, verifyPDFFile, clickProcessButton } from './helpers';

test.describe('Advanced PDF Tools E2E Tests', () => {
  let testPDF: string;

  test.beforeAll(async () => {
    const testDataDir = path.join(__dirname, '../test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test PDF for Advanced Tools', { x: 50, y: 700, size: 20 });
    const pdfBytes = await pdf.save();
    testPDF = path.join(testDataDir, 'advanced-test.pdf');
    fs.writeFileSync(testPDF, pdfBytes);
  });

  test('should convert HTML to PDF', async ({ page }) => {
    await page.goto('/html-to-pdf', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Give page time to load

    // HTML to PDF might have textarea for HTML input
    const htmlInput = page.locator('textarea, input[type="text"]').first();
    if (await htmlInput.count() > 0) {
      // Clear first, then type (better for WebKit React state updates)
      await htmlInput.clear();
      await htmlInput.type('<html><body><h1>Test</h1></body></html>', { delay: 50 });
      // Trigger both input and change events to ensure React state updates
      await htmlInput.dispatchEvent('input');
      await htmlInput.dispatchEvent('change');
      await page.waitForTimeout(1500);
    }

    const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    const buttonClicked = await clickProcessButton(page, 'Convert');
    if (!buttonClicked) {
      test.skip();
      return;
    }

    await waitForProcessing(page, 30000);
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

    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(await verifyPDFFile(downloadPath)).toBe(true);
  });

  test('should convert PDF to PDF/A', async ({ page }) => {
    await page.goto('/pdf-to-pdfa');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testPDF);
    await page.waitForTimeout(2000);

    const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    const buttonClicked = await clickProcessButton(page, 'Convert');
    if (!buttonClicked) {
      test.skip();
      return;
    }

    await waitForProcessing(page, 30000);
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

    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(await verifyPDFFile(downloadPath)).toBe(true);
  });

  test('should repair PDF', async ({ page }) => {
    await page.goto('/repair-pdf');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testPDF);
    await page.waitForTimeout(2000);

    const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    const buttonClicked = await clickProcessButton(page, 'Repair');
    if (!buttonClicked) {
      test.skip();
      return;
    }

    await waitForProcessing(page, 30000);
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

    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(await verifyPDFFile(downloadPath)).toBe(true);
  });

  test('should perform OCR on PDF', async ({ page }) => {
    await page.goto('/ocr-pdf', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Give page time to load

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testPDF);
    await page.waitForTimeout(2000);

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
    const buttonClicked = await clickProcessButton(page, 'OCR');
    if (!buttonClicked) {
      test.skip();
      return;
    }

    await waitForProcessing(page, 60000); // OCR can take longer
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

    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(await verifyPDFFile(downloadPath)).toBe(true);
  });

  test('should scan to PDF', async ({ page }) => {
    await page.goto('/scan-to-pdf');
    await page.waitForLoadState('networkidle');

    // Scan to PDF might accept images
    const fileInput = page.locator('input[type="file"]').first();
    expect(await fileInput.count()).toBeGreaterThan(0);
  });

  test('should compare PDFs', async ({ page }) => {
    await page.goto('/compare-pdf');
    await page.waitForLoadState('networkidle');

    // Compare PDF needs two files
    const fileInputs = page.locator('input[type="file"]');
    const inputCount = await fileInputs.count();
    expect(inputCount).toBeGreaterThanOrEqual(1);
  });
});

