import { NextRequest, NextResponse } from 'next/server';
import {
  runAllTests,
  testMergePDF,
  testSplitPDF,
  testCompressPDF,
  testRotatePDF,
  testPDFToWord,
  testPDFToPowerPoint,
  testPDFToExcel,
  testWordToPDF,
  testPowerPointToPDF,
  testExcelToPDF,
  testPDFToJPG,
  testJPGToPDF,
  testEditPDF,
  testSignPDF,
  testWatermarkPDF,
  testProtectPDF,
  testUnlockPDF,
  testOrganizePDF,
  testCropPDF,
  testPageNumbersPDF,
  testComparePDF,
  testRedactPDF,
  testHTMLToPDF,
  testScanToPDF,
  testPDFToPDFA,
  testRepairPDF,
  testOCRPDF,
} from '../../lib/test-utils';

const testMap: Record<string, () => Promise<any>> = {
  merge: testMergePDF,
  split: testSplitPDF,
  compress: testCompressPDF,
  'rotate-pdf': testRotatePDF,
  'pdf-to-word': testPDFToWord,
  'pdf-to-powerpoint': testPDFToPowerPoint,
  'pdf-to-excel': testPDFToExcel,
  'word-to-pdf': testWordToPDF,
  'powerpoint-to-pdf': testPowerPointToPDF,
  'excel-to-pdf': testExcelToPDF,
  'pdf-to-jpg': testPDFToJPG,
  'jpg-to-pdf': testJPGToPDF,
  'edit-pdf': testEditPDF,
  'sign-pdf': testSignPDF,
  'watermark-pdf': testWatermarkPDF,
  'protect-pdf': testProtectPDF,
  'unlock-pdf': testUnlockPDF,
  'organize-pdf': testOrganizePDF,
  'crop-pdf': testCropPDF,
  'page-numbers-pdf': testPageNumbersPDF,
  'compare-pdf': testComparePDF,
  'redact-pdf': testRedactPDF,
  'html-to-pdf': testHTMLToPDF,
  'scan-to-pdf': testScanToPDF,
  'pdf-to-pdfa': testPDFToPDFA,
  'repair-pdf': testRepairPDF,
  'ocr-pdf': testOCRPDF,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tool = searchParams.get('tool');

    let results;

    if (tool) {
      // Test specific tool
      const testFunction = testMap[tool];
      if (!testFunction) {
        return NextResponse.json(
          { success: false, error: `Invalid tool name: ${tool}` },
          { status: 400 }
        );
      }
      results = [await testFunction()];
    } else {
      // Run all tests
      results = await runAllTests();
    }

    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    const errors = results.filter((r) => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        passed,
        failed,
        errors,
      },
      results,
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Test failed' },
      { status: 500 }
    );
  }
}

