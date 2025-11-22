import { defineConfig, devices } from '@playwright/test';

/**
 * Visual Regression Testing Configuration
 * 
 * This configuration sets up Playwright for visual regression testing.
 * Screenshots are stored in `tests/screenshots/` and compared against
 * baseline images in `tests/baselines/`.
 */
export default defineConfig({
  testDir: './tests',
  
  // Maximum time one test can run for
  timeout: 60 * 1000, // Increased to 60s for E2E tests that may take longer
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Screenshot comparison settings (global)
  expect: {
    // Threshold for pixel comparison (0-1)
    toHaveScreenshot: {
      threshold: 0.2,
      maxDiffPixels: 100,
    },
  },
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'tests/results/html' }],
    ['json', { outputFile: 'tests/results/results.json' }],
    ['list'],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Screenshot settings
    screenshot: 'only-on-failure',
    
    // Video settings
    video: 'retain-on-failure',
    
    // Trace settings
    trace: 'on-first-retry',
    
    // Viewport size for consistent screenshots
    viewport: { width: 1280, height: 720 },
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile viewports
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

