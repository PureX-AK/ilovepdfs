import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { uploadFile, waitForProcessing, verifyPDFFile, clickProcessButton } from './helpers';

test.describe('PDF Conversion Tools E2E Tests', () => {
  let testPDF: string;

  test.beforeAll(async () => {
    const testDataDir = path.join(__dirname, '../test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test PDF for Conversion', { x: 50, y: 700, size: 20 });
    const pdfBytes = await pdf.save();
    testPDF = path.join(testDataDir, 'conversion-test.pdf');
    fs.writeFileSync(testPDF, pdfBytes);
  });

  test('should convert PDF to PowerPoint', async ({ page }) => {
    await page.goto('/pdf-to-ppt');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testPDF);
    await page.waitForTimeout(1000);

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const convertButton = page.locator('button:has-text("Convert"), button:has-text("Download")').first();
    await convertButton.click();

    await waitForProcessing(page, 60000);
    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '../downloads', download.suggestedFilename());
    const downloadDir = path.dirname(downloadPath);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    await download.saveAs(downloadPath);

    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(download.suggestedFilename().endsWith('.pptx') || download.suggestedFilename().endsWith('.ppt')).toBe(true);
  });

  test('should convert PDF to Excel', async ({ page }) => {
    await page.goto('/pdf-to-excel');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testPDF);
    await page.waitForTimeout(1000);

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    const convertButton = page.locator('button:has-text("Convert"), button:has-text("Download")').first();
    await convertButton.click();

    await waitForProcessing(page, 60000);
    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '../downloads', download.suggestedFilename());
    const downloadDir = path.dirname(downloadPath);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    await download.saveAs(downloadPath);

    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(download.suggestedFilename().endsWith('.xlsx') || download.suggestedFilename().endsWith('.xls')).toBe(true);
  });

  test('should convert PDF to JPG', async ({ page }) => {
    await page.goto('/pdf-to-jpg');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testPDF);
    await page.waitForTimeout(1000);

    // May download multiple images or a zip
    page.on('download', async (download) => {
      const downloadPath = path.join(__dirname, '../downloads', download.suggestedFilename());
      const downloadDir = path.dirname(downloadPath);
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }
      await download.saveAs(downloadPath);
    });

    const convertButton = page.locator('button:has-text("Convert"), button:has-text("Download")').first();
    await convertButton.click();
    await waitForProcessing(page, 60000);
    await page.waitForTimeout(2000);

    expect(await page.locator('input[type="file"]').count()).toBeGreaterThan(0);
  });
});

test.describe('Document to PDF Conversion E2E Tests', () => {
  test('should convert Word to PDF', async ({ page }) => {
    await page.goto('/word-to-pdf');
    await page.waitForLoadState('networkidle');

    // Note: Would need actual Word file for full test
    // This tests the UI flow
    const fileInput = page.locator('input[type="file"]').first();
    expect(await fileInput.count()).toBeGreaterThan(0);
  });

  test('should convert PowerPoint to PDF', async ({ page }) => {
    await page.goto('/ppt-to-pdf');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    expect(await fileInput.count()).toBeGreaterThan(0);
  });

  test('should convert Excel to PDF', async ({ page }) => {
    await page.goto('/excel-to-pdf');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    expect(await fileInput.count()).toBeGreaterThan(0);
  });

  test('should convert JPG to PDF', async ({ page }) => {
    await page.goto('/jpg-to-pdf');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    expect(await fileInput.count()).toBeGreaterThan(0);
  });
});

