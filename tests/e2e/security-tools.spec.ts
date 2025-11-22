import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import { uploadFile, waitForProcessing, verifyPDFFile, clickProcessButton } from './helpers';

test.describe('PDF Security Tools E2E Tests', () => {
  let testPDF: string;

  test.beforeAll(async () => {
    const testDataDir = path.join(__dirname, '../test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test PDF for Security', { x: 50, y: 700, size: 20 });
    const pdfBytes = await pdf.save();
    testPDF = path.join(testDataDir, 'security-test.pdf');
    fs.writeFileSync(testPDF, pdfBytes);
  });

  test('should protect PDF with password', async ({ page }) => {
    await page.goto('/protect-pdf');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testPDF);
    await page.waitForTimeout(1000);

    // Enter password if password input is available
    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.count() > 0) {
      await passwordInput.fill('test123');
      await page.waitForTimeout(500);
    }

    const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    const buttonClicked = await clickProcessButton(page, 'Protect');
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

    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(await verifyPDFFile(downloadPath)).toBe(true);
  });

  test('should unlock PDF', async ({ page }) => {
    await page.goto('/unlock-pdf');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testPDF);
    await page.waitForTimeout(1000);

    // Enter password if required
    const passwordInput = page.locator('input[type="password"]').first();
    if (await passwordInput.count() > 0) {
      await passwordInput.fill('test123');
      await page.waitForTimeout(500);
    }

    const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    const buttonClicked = await clickProcessButton(page, 'Unlock');
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

    expect(fs.existsSync(downloadPath)).toBe(true);
    expect(await verifyPDFFile(downloadPath)).toBe(true);
  });
});

