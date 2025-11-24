import { NextRequest, NextResponse } from 'next/server';

// Helper function to sanitize text for PDF (remove unsupported Unicode characters)
function sanitizeTextForPDF(text: string): string {
  if (!text) return '';
  
  // Replace common Unicode characters that StandardFonts can't encode
  const replacements: { [key: string]: string } = {
    '\u25CF': '*',  // ●
    '\u25CB': 'o',  // ○
    '\u25A0': '#',  // ■
    '\u25A1': '[ ]',  // □
    '\u25B2': '^',  // ▲
    '\u25B3': '^',  // △
    '\u25BA': '>',  // ►
    '\u25B8': '>',  // ▸
    '\u25C4': '<',  // ◄
    '\u25BE': 'v',  // ▾
    '\u2014': '-',  // — em dash
    '\u2013': '-',  // – en dash
    '\u201C': '"',  // " left double quote
    '\u201D': '"',  // " right double quote
    '\u2018': "'",  // ' left single quote
    '\u2019': "'",  // ' right single quote
    '\u2026': '...', // … ellipsis
    '\u20AC': 'EUR', // €
    '\u00A3': 'GBP', // £
    '\u00A5': 'JPY', // ¥
    '\u00A9': '(c)', // ©
    '\u00AE': '(R)', // ®
    '\u2122': '(TM)', // ™
  };
  
  let sanitized = text;
  
  // Replace known problematic characters
  for (const [unicode, replacement] of Object.entries(replacements)) {
    sanitized = sanitized.replace(new RegExp(unicode, 'g'), replacement);
  }
  
  // Remove any remaining non-ASCII characters that might cause issues
  // Keep basic ASCII (32-126)
  sanitized = sanitized.split('').map(char => {
    const code = char.charCodeAt(0);
    // Keep ASCII printable characters (32-126)
    if (code >= 32 && code <= 126) {
      return char;
    }
    // Keep common extended ASCII (160-255) - but these might still cause issues
    if (code >= 160 && code <= 255) {
      return char;
    }
    // Replace other Unicode with '?'
    return '?';
  }).join('');
  
  return sanitized;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const htmlContent = formData.get('html') as string;
    const file = formData.get('file') as File;

    if (!htmlContent && !file) {
      return NextResponse.json(
        { success: false, error: 'No HTML content or file provided' },
        { status: 400 }
      );
    }

    let html = '';
    
    if (file) {
      // Read HTML file
      const arrayBuffer = await file.arrayBuffer();
      html = Buffer.from(arrayBuffer).toString('utf-8');
    } else {
      html = htmlContent;
    }

    // For now, we'll use a simple approach with pdf-lib
    // For full HTML rendering, Puppeteer would be needed (but it's heavy)
    // This implementation will parse HTML and create a better PDF than the client-side version
    
    const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let page = pdfDoc.addPage([612, 792]); // Letter size
    const margin = 50;
    let yPosition = page.getHeight() - margin;
    const lineHeight = 14;
    const fontSize = 11;

    // Simple HTML parser to extract text and basic structure
    // Remove script and style tags
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Extract text from HTML with basic structure
    const textContent = html
      .replace(/<h1[^>]*>/gi, '\n\n# ')
      .replace(/<h2[^>]*>/gi, '\n\n## ')
      .replace(/<h3[^>]*>/gi, '\n\n### ')
      .replace(/<h4[^>]*>/gi, '\n\n#### ')
      .replace(/<h5[^>]*>/gi, '\n\n##### ')
      .replace(/<h6[^>]*>/gi, '\n\n###### ')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br[^>]*>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/li>/gi, '')
      .replace(/<[^>]+>/g, ' ') // Remove all remaining HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

    // Split into lines and process
    const lines = textContent.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        yPosition -= lineHeight / 2; // Small gap for empty lines
        continue;
      }

      // Check if we need a new page
      if (yPosition < margin + lineHeight) {
        page = pdfDoc.addPage([612, 792]);
        yPosition = page.getHeight() - margin;
      }

      // Determine if it's a heading
      let isHeading = false;
      let headingLevel = 0;
      let displayText = trimmedLine;
      let font = helveticaFont;
      let size = fontSize;

      if (trimmedLine.startsWith('# ')) {
        isHeading = true;
        headingLevel = 1;
        displayText = trimmedLine.substring(2);
        font = helveticaBoldFont;
        size = 20;
        yPosition -= 10; // Extra space before heading
      } else if (trimmedLine.startsWith('## ')) {
        isHeading = true;
        headingLevel = 2;
        displayText = trimmedLine.substring(3);
        font = helveticaBoldFont;
        size = 16;
        yPosition -= 8;
      } else if (trimmedLine.startsWith('### ')) {
        isHeading = true;
        headingLevel = 3;
        displayText = trimmedLine.substring(4);
        font = helveticaBoldFont;
        size = 14;
        yPosition -= 6;
      } else if (trimmedLine.startsWith('#### ')) {
        isHeading = true;
        headingLevel = 4;
        displayText = trimmedLine.substring(5);
        font = helveticaBoldFont;
        size = 12;
        yPosition -= 4;
      } else if (trimmedLine.startsWith('##### ')) {
        isHeading = true;
        headingLevel = 5;
        displayText = trimmedLine.substring(6);
        font = helveticaBoldFont;
        size = 11;
        yPosition -= 2;
      } else if (trimmedLine.startsWith('###### ')) {
        isHeading = true;
        headingLevel = 6;
        displayText = trimmedLine.substring(7);
        font = helveticaBoldFont;
        size = 10;
      } else if (trimmedLine.startsWith('• ')) {
        displayText = trimmedLine;
        // Indent list items
      }

      // Sanitize text for PDF
      const sanitizedText = sanitizeTextForPDF(displayText);
      
      // Word wrap
      const maxWidth = page.getWidth() - (margin * 2);
      const words = sanitizedText.split(' ');
      let currentLine = '';
      const indent = trimmedLine.startsWith('• ') ? 20 : 0;

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const textWidth = font.widthOfTextAtSize(testLine, size);

        if (textWidth > maxWidth - indent && currentLine) {
          // Draw current line
          try {
            page.drawText(currentLine, {
              x: margin + indent,
              y: yPosition,
              size: size,
              font: font,
              color: rgb(0, 0, 0),
            });
          } catch (error) {
            // If still fails, use even more sanitized version
            const safeLine = currentLine.replace(/[^\x20-\x7E]/g, '?');
            page.drawText(safeLine, {
              x: margin + indent,
              y: yPosition,
              size: size,
              font: font,
              color: rgb(0, 0, 0),
            });
          }
          yPosition -= lineHeight;
          currentLine = word;

          // Check for new page
          if (yPosition < margin + lineHeight) {
            page = pdfDoc.addPage([612, 792]);
            yPosition = page.getHeight() - margin;
          }
        } else {
          currentLine = testLine;
        }
      }

      // Draw remaining line
      if (currentLine) {
        try {
          page.drawText(currentLine, {
            x: margin + indent,
            y: yPosition,
            size: size,
            font: font,
            color: rgb(0, 0, 0),
          });
        } catch (error) {
          // If still fails, use even more sanitized version
          const safeLine = currentLine.replace(/[^\x20-\x7E]/g, '?');
          page.drawText(safeLine, {
            x: margin + indent,
            y: yPosition,
            size: size,
            font: font,
            color: rgb(0, 0, 0),
          });
        }
        yPosition -= lineHeight;
      }

      // Extra space after headings
      if (isHeading) {
        yPosition -= 5;
      }
    }

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // Return the PDF file
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="html-converted.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('HTML to PDF conversion error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to convert HTML to PDF.' 
      },
      { status: 500 }
    );
  }
}

