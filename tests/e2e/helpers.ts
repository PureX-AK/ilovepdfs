import { Page, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * E2E test helpers for PDF tools
 */

// Test data directory
export const TEST_DATA_DIR = path.join(__dirname, '../test-data');

/**
 * Create a test PDF file
 */
export async function createTestPDFFile(filename: string = 'test.pdf'): Promise<string> {
  const filePath = path.join(TEST_DATA_DIR, filename);
  
  // Ensure test data directory exists
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }
  
  // For now, we'll use a simple approach - in real tests, you'd generate actual PDFs
  // or use pre-made test PDFs
  return filePath;
}

/**
 * Wait for file download
 */
export async function waitForDownload(
  page: Page,
  downloadPromise: Promise<any>,
  expectedFilename?: string
): Promise<string> {
  const download = await downloadPromise;
  
  // Wait for download to complete
  const suggestedFilename = download.suggestedFilename();
  if (expectedFilename) {
    expect(suggestedFilename).toContain(expectedFilename);
  }
  
  // Save to test results directory
  const downloadPath = path.join(__dirname, '../downloads', suggestedFilename);
  const downloadDir = path.dirname(downloadPath);
  
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }
  
  await download.saveAs(downloadPath);
  return downloadPath;
}

/**
 * Upload file to input element
 */
export async function uploadFile(
  page: Page,
  filePath: string,
  selector: string = 'input[type="file"]'
): Promise<void> {
  const fileInput = page.locator(selector).first();
  await fileInput.setInputFiles(filePath);
  
  // Wait a bit for file to be processed
  await page.waitForTimeout(500);
}

/**
 * Upload multiple files
 */
export async function uploadFiles(
  page: Page,
  filePaths: string[],
  selector: string = 'input[type="file"]'
): Promise<void> {
  const fileInput = page.locator(selector).first();
  await fileInput.setInputFiles(filePaths);
  await page.waitForTimeout(500);
}

/**
 * Wait for processing to complete
 */
export async function waitForProcessing(page: Page, timeout: number = 30000): Promise<void> {
  try {
    // Wait for loading spinner to disappear
    await page.waitForSelector('.animate-spin, [class*="spinner"], [class*="loading"], [class*="progress"]', {
      state: 'hidden',
      timeout: Math.min(timeout, 10000), // Max 10s for spinner
    }).catch(() => {
      // Spinner might not exist, that's okay
    });
  } catch (e) {
    // Ignore timeout errors for spinner
  }
  
  // Wait a bit for processing to complete
  await page.waitForTimeout(2000);
  
  // Check if there's a success message or download link
  try {
    await page.waitForSelector('[class*="success"], [class*="complete"], a[download]', {
      timeout: 5000,
      state: 'visible',
    }).catch(() => {
      // Success indicator might not exist
    });
  } catch (e) {
    // Ignore
  }
}

/**
 * Click process/convert button
 */
export async function clickProcessButton(page: Page, buttonText?: string): Promise<boolean> {
  // If specific button text provided, try that first
  if (buttonText) {
    const specificButton = page.locator(`button:has-text("${buttonText}"), button:has-text("${buttonText}")`).first();
    if (await specificButton.count() > 0 && await specificButton.isVisible()) {
      // Wait for button to be enabled (important for WebKit and React state updates)
      try {
        await specificButton.waitFor({ state: 'visible', timeout: 5000 });
        // Wait for button to be enabled with a reasonable timeout
        let attempts = 0;
        while (attempts < 20) {
          const isEnabled = await specificButton.isEnabled().catch(() => false);
          if (isEnabled) break;
          await page.waitForTimeout(500);
          attempts++;
        }
      } catch {
        // Continue to try clicking even if wait fails
      }
      try {
        await specificButton.click({ timeout: 5000 });
        return true;
      } catch {
        // If click fails, button might be disabled
        return false;
      }
    }
  }

  // Look for common button text patterns
  const buttonSelectors = [
    'button:has-text("Merge")',
    'button:has-text("Split")',
    'button:has-text("Compress")',
    'button:has-text("Rotate")',
    'button:has-text("Convert")',
    'button:has-text("Process")',
    'button:has-text("Edit PDF")',
    'button:has-text("Save")',
    'button:has-text("Add")',
    'button:has-text("Sign")',
    'button:has-text("Protect")',
    'button:has-text("Unlock")',
    'button:has-text("Crop")',
    'button:has-text("Redact")',
    'button:has-text("Repair")',
    'button:has-text("Organize")',
    'button:has-text("OCR")',
    'button[type="submit"]',
    'button[class*="primary"]',
    'button[class*="convert"]',
    'button[class*="process"]',
  ];
  
  for (const selector of buttonSelectors) {
    try {
      const button = page.locator(selector).first();
      if (await button.count() > 0 && await button.isVisible() && await button.isEnabled()) {
        await button.click();
        return true;
      }
    } catch (e) {
      // Continue to next selector
    }
  }
  
  return false;
}

/**
 * Verify PDF file is valid
 */
export async function verifyPDFFile(filePath: string): Promise<boolean> {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    // Check if file starts with PDF magic bytes
    const pdfHeader = fileContent.slice(0, 4).toString();
    return pdfHeader === '%PDF';
  } catch (error) {
    return false;
  }
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

/**
 * Wait for toast notification
 */
export async function waitForToast(
  page: Page,
  type: 'success' | 'error' = 'success',
  timeout: number = 10000
): Promise<void> {
  const toastSelector = type === 'success'
    ? '.react-hot-toast-success, [class*="success"]'
    : '.react-hot-toast-error, [class*="error"]';
  
  await page.waitForSelector(toastSelector, { timeout, state: 'visible' });
}

/**
 * Check if element exists and is visible
 */
export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector).first();
  return await element.count() > 0 && await element.isVisible();
}

