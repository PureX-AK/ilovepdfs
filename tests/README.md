# Visual Regression Testing

This directory contains visual regression tests using Playwright to ensure UI consistency across changes.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Running Tests

### Run all visual tests
```bash
npm run test:visual
```

### Run tests with UI mode (interactive)
```bash
npm run test:visual:ui
```

### Update baseline screenshots
When UI changes are intentional, update the baseline images:
```bash
npm run test:visual:update
```

### View test report
```bash
npm run test:visual:report
```

## Test Structure

- `tests/visual/` - Visual regression test files
- `tests/baselines/` - Baseline screenshots (committed to git)
- `tests/screenshots/` - Current test screenshots (gitignored)
- `tests/diffs/` - Diff images when tests fail (gitignored)
- `tests/results/` - Test reports and JSON results (gitignored)

## Test Files

- `home.spec.ts` - Home page visual tests
- `tool-pages.spec.ts` - Individual tool page tests
- `navigation.spec.ts` - Navigation components tests
- `auth-pages.spec.ts` - Login and signup page tests
- `other-pages.spec.ts` - Features, pricing, contact, etc.
- `components.spec.ts` - Individual component tests
- `helpers.ts` - Shared test utilities

## How It Works

1. Tests take screenshots of pages/components
2. Screenshots are compared against baseline images
3. If differences are detected, tests fail and diff images are generated
4. Review diffs to determine if changes are intentional or bugs

## Thresholds

- **Threshold**: 0.2 (20% pixel difference allowed)
- **Max Diff Pixels**: 100 pixels

Adjust these in `helpers.ts` if needed for your use case.

## CI/CD Integration

Visual regression tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run visual tests
  run: npm run test:visual
```

## Best Practices

1. **Update baselines intentionally**: Only update baselines when UI changes are deliberate
2. **Review diffs carefully**: Always review diff images before updating baselines
3. **Test multiple viewports**: Tests cover desktop, tablet, and mobile views
4. **Test multiple browsers**: Tests run on Chromium, Firefox, and WebKit
5. **Keep baselines in git**: Baseline images should be committed to version control

## Troubleshooting

### Tests fail with "Screenshot mismatch"
- Review the diff images in `tests/diffs/`
- If changes are intentional, run `npm run test:visual:update`
- If changes are bugs, fix the UI and re-run tests

### Screenshots look different on different machines
- Ensure consistent viewport sizes
- Check for system font differences
- Verify browser versions match

### Tests are flaky
- Increase wait times in `helpers.ts`
- Check for animations that need to complete
- Verify network requests have finished

