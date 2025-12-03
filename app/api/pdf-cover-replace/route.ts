import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface OverlayInstruction {
  pageIndex: number; // 0-based
  normX: number;     // 0..1, from left
  normY: number;     // 0..1, from top
  normWidth: number; // 0..1
  normHeight: number;// 0..1
  text: string;
  fontSize?: number;
  color?: string;    // hex like #000000
}

function hexToRgb(hex: string | undefined) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const m = hex.replace('#', '');
  if (m.length === 3) {
    const r = parseInt(m[0] + m[0], 16);
    const g = parseInt(m[1] + m[1], 16);
    const b = parseInt(m[2] + m[2], 16);
    return { r, g, b };
  }
  if (m.length === 6) {
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    return { r, g, b };
  }
  return { r: 0, g: 0, b: 0 };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const overlaysJson = formData.get('overlays') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload a PDF file.' },
        { status: 400 }
      );
    }

    if (!overlaysJson) {
      return NextResponse.json(
        { success: false, error: 'No overlay instructions provided.' },
        { status: 400 }
      );
    }

    let overlays: OverlayInstruction[] = [];
    try {
      overlays = JSON.parse(overlaysJson);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid overlays JSON.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(overlays) || overlays.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No overlay items found.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const overlay of overlays) {
      const { pageIndex, normX, normY, normWidth, normHeight, text } = overlay;
      if (
        pageIndex == null ||
        normWidth <= 0 ||
        normHeight <= 0 ||
        !Number.isFinite(normX) ||
        !Number.isFinite(normY)
      ) {
        continue;
      }

      const page = pdfDoc.getPage(pageIndex);
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();

      const absWidth = normWidth * pageWidth;
      const absHeight = normHeight * pageHeight;

      const x = normX * pageWidth;
      const yFromTop = normY * pageHeight;
      const y = pageHeight - yFromTop - absHeight;

      // Draw white rectangle to cover existing content
      page.drawRectangle({
        x,
        y,
        width: absWidth,
        height: absHeight,
        color: rgb(1, 1, 1),
      });

      if (text && text.trim()) {
        const fontSize = overlay.fontSize && overlay.fontSize > 0 ? overlay.fontSize : 12;
        const padding = 4;
        const { r, g, b } = hexToRgb(overlay.color || '#000000');

        page.drawText(text, {
          x: x + padding,
          y: y + absHeight - fontSize - padding,
          size: fontSize,
          font: helvetica,
          color: rgb(r / 255, g / 255, b / 255),
          maxWidth: absWidth - padding * 2,
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    // Use a Node.js Buffer so NextResponse has a concrete binary BodyInit
    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.pdf$/i, '')}_edited.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF cover-replace error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to apply overlays to PDF.',
      },
      { status: 500 }
    );
  }
}


