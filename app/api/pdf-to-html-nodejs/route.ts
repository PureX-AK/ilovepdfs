import { NextRequest, NextResponse } from 'next/server';

// Polyfill browser APIs for Node.js environment
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    constructor(init?: string | number[]) {
      if (typeof init === 'string') {
        const m = init.match(/matrix\(([^)]+)\)/);
        if (m) {
          const vals = m[1].split(',').map(v => parseFloat(v.trim()));
          if (vals.length >= 6) {
            [this.a, this.b, this.c, this.d, this.e, this.f] = vals;
          }
        }
      } else if (Array.isArray(init) && init.length >= 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      }
    }
    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
  } as any;
}

// Dynamically import pdfjs-dist
let pdfjsLib: any = null;
const loadPdfJs = async () => {
  if (!pdfjsLib) {
    try {
      // Try importing the Node.js compatible version
      pdfjsLib = await import('pdfjs-dist');
    } catch (e) {
      console.error('Failed to import pdfjs-dist:', e);
      throw new Error('Failed to load pdfjs-dist library');
    }
    
    // Disable worker for server-side usage
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
  }
  return pdfjsLib;
};

export async function POST(request: NextRequest) {
  try {
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload a PDF file.' },
        { status: 400 }
      );
    }

    // Validate file size (25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 25MB limit' },
        { status: 400 }
      );
    }

    // Read the file
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Load PDF.js
    const pdfjs = await loadPdfJs();
    const loadingTask = pdfjs.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;

    // Start building HTML
    const htmlParts: string[] = [];
    htmlParts.push('<!DOCTYPE html>');
    htmlParts.push('<html lang="en">');
    htmlParts.push('<head>');
    htmlParts.push('    <meta charset="UTF-8">');
    htmlParts.push('    <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    htmlParts.push(`    <title>${file.name.replace('.pdf', '')}</title>`);
    htmlParts.push('    <style>');
    htmlParts.push('        body {');
    htmlParts.push('            margin: 0;');
    htmlParts.push('            padding: 20px;');
    htmlParts.push('            background-color: #f5f5f5;');
    htmlParts.push('            font-family: Arial, sans-serif;');
    htmlParts.push('        }');
    htmlParts.push('        .page {');
    htmlParts.push('            position: relative;');
    htmlParts.push('            margin: 20px auto;');
    htmlParts.push('            background: white;');
    htmlParts.push('            box-shadow: 0 2px 8px rgba(0,0,0,0.1);');
    htmlParts.push('        }');
    htmlParts.push('        .text-element {');
    htmlParts.push('            position: absolute;');
    htmlParts.push('            white-space: pre;');
    htmlParts.push('            line-height: 1.0;');
    htmlParts.push('            z-index: 2;');
    htmlParts.push('        }');
    htmlParts.push('    </style>');
    htmlParts.push('</head>');
    htmlParts.push('<body>');

    // Process each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();

      const pageWidth = viewport.width;
      const pageHeight = viewport.height;

      // Create page container
      htmlParts.push(`    <div class="page" style="width: ${pageWidth}px; height: ${pageHeight}px;">`);

      // Process text items
      textContent.items.forEach((item: any) => {
        if (!item.str || !item.str.trim()) {
          return;
        }

        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const x = transform[4];
        const y = viewport.height - transform[5]; // Invert Y coordinate

        // Get font properties
        const fontSize = item.height || 12;
        const fontName = item.fontName || 'Arial';
        const width = item.width || 0;

        // Determine if bold/italic from font name
        const isBold = fontName.toLowerCase().includes('bold') || fontName.toLowerCase().includes('black');
        const isItalic = fontName.toLowerCase().includes('italic') || fontName.toLowerCase().includes('oblique');

        // Escape HTML
        const textEscaped = item.str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

        // Build style string
        const styleParts = [
          `left: ${x}px`,
          `top: ${y}px`,
          `font-size: ${fontSize}px`,
          `font-family: '${fontName}', Arial, sans-serif`
        ];

        if (isBold) {
          styleParts.push('font-weight: bold');
        }
        if (isItalic) {
          styleParts.push('font-style: italic');
        }

        const styleStr = styleParts.join('; ');

        // Add text element
        htmlParts.push(`        <div class="text-element" style="${styleStr}">${textEscaped}</div>`);
      });

      htmlParts.push('    </div>');
    }

    htmlParts.push('</body>');
    htmlParts.push('</html>');

    const htmlContent = htmlParts.join('\n');

    // Return the HTML file
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '')}.html"`,
      },
    });
  } catch (error: any) {
    console.error('PDF to HTML conversion error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to convert PDF to HTML using Node.js' 
      },
      { status: 500 }
    );
  }
}

