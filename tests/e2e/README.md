# E2E Functional Tests

These tests verify that the PDF tools actually work by:
1. Uploading test PDFs through the UI
2. Clicking process buttons
3. Verifying downloads
4. Validating output files

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run specific test file
```bash
npx playwright test tests/e2e/merge-pdf.spec.ts
```

## Test Files

### Core Tools
- `merge-pdf.spec.ts` - Tests PDF merging functionality
- `split-pdf.spec.ts` - Tests PDF splitting functionality
- `compress-pdf.spec.ts` - Tests PDF compression
- `rotate-pdf.spec.ts` - Tests PDF rotation

### Conversion Tools
- `pdf-to-word.spec.ts` - Tests PDF to Word conversion
- `conversion-tools.spec.ts` - Tests PDF to PowerPoint, Excel, JPG, and document to PDF conversions

### Editing Tools
- `edit-tools.spec.ts` - Tests Edit PDF, Watermark, Sign PDF, Page Numbers, Redact, Crop

### Organization Tools
- `organize-tools.spec.ts` - Tests PDF organization (reorder pages)

### Security Tools
- `security-tools.spec.ts` - Tests Protect PDF and Unlock PDF

### Advanced Tools
- `advanced-tools.spec.ts` - Tests HTML to PDF, PDF to PDF/A, Repair PDF, OCR PDF, Scan to PDF, Compare PDF

### Utilities
- `helpers.ts` - Shared test utilities

## Test Data

Test PDFs are generated automatically in `tests/test-data/` directory.
These are created before tests run and cleaned up automatically.

## Downloads

Downloaded files from tests are saved to `tests/downloads/` for inspection.
This directory is gitignored.

## What Gets Tested

### Core Tools (5 tests)
- ✅ **Merge PDF** - Upload multiple PDFs, merge, verify download
- ✅ **Split PDF** - Upload multi-page PDF, split, verify downloads
- ✅ **Compress PDF** - Upload PDF, compress, verify download
- ✅ **Rotate PDF** - Upload PDF, rotate, verify download
- ✅ **PDF to Word** - Upload PDF, convert to DOCX, verify download

### Conversion Tools (7 tests)
- ✅ **PDF to PowerPoint** - Convert PDF to PPTX
- ✅ **PDF to Excel** - Convert PDF to XLSX
- ✅ **PDF to JPG** - Convert PDF pages to images
- ✅ **Word to PDF** - UI flow test
- ✅ **PowerPoint to PDF** - UI flow test
- ✅ **Excel to PDF** - UI flow test
- ✅ **JPG to PDF** - UI flow test

### Editing Tools (6 tests)
- ✅ **Edit PDF** - Add text, verify download
- ✅ **Watermark PDF** - Add watermark, verify download
- ✅ **Sign PDF** - Add signature, verify download
- ✅ **Page Numbers** - Add page numbers, verify download
- ✅ **Redact PDF** - Redact content, verify download
- ✅ **Crop PDF** - Crop margins, verify download

### Organization Tools (1 test)
- ✅ **Organize PDF** - Reorder pages, verify download

### Security Tools (2 tests)
- ✅ **Protect PDF** - Add password protection, verify download
- ✅ **Unlock PDF** - Remove password, verify download

### Advanced Tools (6 tests)
- ✅ **HTML to PDF** - Convert HTML to PDF
- ✅ **PDF to PDF/A** - Convert to PDF/A format
- ✅ **Repair PDF** - Repair damaged PDF
- ✅ **OCR PDF** - Extract text from scanned PDF
- ✅ **Scan to PDF** - UI flow test
- ✅ **Compare PDF** - UI flow test

**Total: 27 tools tested!**

## Troubleshooting

### Tests fail with timeout
- Increase timeout in test file
- Check if dev server is running
- Verify PDFs are being generated correctly

### Downloads not working
- Check browser download settings
- Verify file paths are correct
- Check download directory permissions

### File validation fails
- Ensure test PDFs are valid
- Check file reading permissions
- Verify PDF magic bytes

