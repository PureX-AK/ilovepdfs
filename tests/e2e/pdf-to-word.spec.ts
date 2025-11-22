import { test, expect } from '@playwright/test';
import {
  uploadFile,
  waitForProcessing,
  verifyPDFFile,
} from './helpers';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

test.describe('PDF to Word E2E Tests', () => {
  let testPDF: string;

  test.beforeAll(async () => {
    const testDataDir = path.join(__dirname, '../test-data');
    if (!fs.existsSync(testDataDir)) {
      fs.mkdirSync(testDataDir, { recursive: true });
    }

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([612, 792]);
    page.drawText('Test PDF for Word Conversion', { x: 50, y: 700, size: 20 });
    const pdfBytes = await pdf.save();
    testPDF = path.join(testDataDir, 'word-test.pdf');
    fs.writeFileSync(testPDF, pdfBytes);
  });

  test('should convert PDF to Word document', async ({ page }) => {
    await page.goto('/pdf-to-word');
    await page.waitForLoadState('networkidle');

    // Upload PDF
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(testPDF);
    await page.waitForTimeout(1000);

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });

    // Click convert button
    const convertButton = page.locator('button:has-text("Convert"), button:has-text("Download")').first();
    await convertButton.click();

    await waitForProcessing(page, 60000); // Word conversion might take longer

    // Wait for download
    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, '../downloads', download.suggestedFilename());
    const downloadDir = path.dirname(downloadPath);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }
    await download.saveAs(downloadPath);

    // Verify downloaded file exists
    expect(fs.existsSync(downloadPath)).toBe(true);

    // Verify it's a Word document (DOCX files start with PK zip signature)
    const fileContent = fs.readFileSync(downloadPath);
    const isDocx = fileContent.slice(0, 2).toString() === 'PK';
    expect(isDocx || download.suggestedFilename().endsWith('.docx')).toBe(true);
  });
});

