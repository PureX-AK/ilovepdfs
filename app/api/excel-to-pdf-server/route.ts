import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
  // Keep basic ASCII (32-126) and common extended ASCII (160-255) but be careful
  sanitized = sanitized.split('').map(char => {
    const code = char.charCodeAt(0);
    // Keep ASCII printable characters (32-126)
    if (code >= 32 && code <= 126) {
      return char;
    }
    // Keep common extended ASCII (160-255) - but these might still cause issues
    // For safety, replace with '?' or remove
    if (code >= 160 && code <= 255) {
      // Try to keep it, but if it fails, it will be caught in try-catch
      return char;
    }
    // Replace other Unicode with '?'
    return '?';
  }).join('');
  
  return sanitized;
}

// Helper function to extract cell value as string
function getCellValueAsString(cell: ExcelJS.Cell): string {
  // Check if cell has a text property (formatted value)
  if (cell.text !== null && cell.text !== undefined) {
    return String(cell.text);
  }

  if (!cell.value) {
    return '';
  }

  // Handle different value types
  if (typeof cell.value === 'string') {
    return cell.value;
  }

  if (typeof cell.value === 'number') {
    return String(cell.value);
  }

  if (typeof cell.value === 'boolean') {
    return cell.value ? 'TRUE' : 'FALSE';
  }

  // Handle rich text
  if (cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
    const richText = (cell.value as any).richText as ExcelJS.RichText[];
    if (Array.isArray(richText)) {
      return richText.map(rt => rt.text || '').join('');
    }
  }

  // Handle formula result
  if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
    const formula = cell.value as ExcelJS.CellFormulaValue;
    if (formula.result !== null && formula.result !== undefined) {
      return String(formula.result);
    }
    return '';
  }

  // Handle hyperlink
  if (cell.value && typeof cell.value === 'object' && 'text' in cell.value) {
    const hyperlink = cell.value as ExcelJS.CellHyperlinkValue;
    return hyperlink.text || hyperlink.hyperlink || '';
  }

  // Handle date
  if (cell.value instanceof Date) {
    return cell.value.toLocaleDateString();
  }

  // Fallback: try to stringify
  try {
    const str = String(cell.value);
    // If it's still [object Object], return empty
    if (str === '[object Object]') {
      return '';
    }
    return str;
  } catch {
    return '';
  }
}

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
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    const validExtensions = ['.xls', '.xlsx'];
    const fileName = file.name.toLowerCase();
    
    const isValidType = validTypes.includes(file.type) || 
                        validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValidType) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload an Excel file (.xls or .xlsx).' },
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

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const buffer = Buffer.from(uint8Array);

    // Load Excel workbook
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error - ExcelJS accepts Buffer but TypeScript infers a generic Buffer type
    await workbook.xlsx.load(buffer);

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helveticaObliqueFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Page settings
    const pageWidth = 612; // Letter width in points
    const pageHeight = 792; // Letter height in points
    const margin = 50;
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);

    // Process each worksheet
    let sheetIndex = 0;
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;

    workbook.eachSheet((worksheet) => {
      if (sheetIndex > 0) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }

      // Add sheet title
      currentPage.drawText(worksheet.name, {
        x: margin,
        y: yPosition,
        size: 16,
        font: helveticaBoldFont,
      });
      yPosition -= 30;

      // Get used range
      const rowCount = worksheet.rowCount;
      const columnCount = worksheet.columnCount;

      if (rowCount === 0 || columnCount === 0) {
        currentPage.drawText('(Empty sheet)', {
          x: margin,
          y: yPosition,
          size: 12,
          font: helveticaFont,
        });
        sheetIndex++;
        return;
      }

      // Limit rows and columns for performance
      const maxRows = Math.min(rowCount, 100);
      const maxCols = Math.min(columnCount, 20);

      // Calculate column widths
      const colWidth = usableWidth / maxCols;
      const rowHeight = 20;
      const headerHeight = 25;

      // Draw header row
      const headerY = yPosition;
      currentPage.drawRectangle({
        x: margin,
        y: headerY - headerHeight,
        width: usableWidth,
        height: headerHeight,
        color: rgb(0.88, 0.88, 0.88), // Light gray
      });

      // Draw header borders and text
      let xPosition = margin;
      for (let col = 1; col <= maxCols; col++) {
        const cell = worksheet.getCell(1, col);
        const cellValue = getCellValueAsString(cell);
        
        // Get cell formatting
        const font = cell.font;
        const alignment = cell.alignment;

        // Draw cell border
        currentPage.drawRectangle({
          x: xPosition,
          y: headerY - headerHeight,
          width: colWidth,
          height: headerHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        // Draw text
        const textFont = font?.bold ? helveticaBoldFont : helveticaFont;
        const textSize = font?.size || 10;
        let textX = xPosition + 5;
        
        if (alignment?.horizontal === 'center') {
          const textWidth = textFont.widthOfTextAtSize(cellValue, textSize);
          textX = xPosition + (colWidth - textWidth) / 2;
        } else if (alignment?.horizontal === 'right') {
          const textWidth = textFont.widthOfTextAtSize(cellValue, textSize);
          textX = xPosition + colWidth - textWidth - 5;
        }

          const sanitizedValue = sanitizeTextForPDF(cellValue);
          try {
            currentPage.drawText(sanitizedValue, {
              x: textX,
              y: headerY - headerHeight + 5,
              size: textSize,
              font: textFont,
              color: rgb(0, 0, 0),
            });
          } catch (error) {
            // If still fails, try with even more sanitization
            const safeValue = sanitizedValue.replace(/[^\x20-\x7E]/g, '?');
            currentPage.drawText(safeValue, {
              x: textX,
              y: headerY - headerHeight + 5,
              size: textSize,
              font: textFont,
              color: rgb(0, 0, 0),
            });
          }

        xPosition += colWidth;
      }

      yPosition -= headerHeight;

      // Draw data rows
      for (let row = 2; row <= maxRows; row++) {
        // Check if we need a new page
        if (yPosition - rowHeight < margin) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }

        xPosition = margin;

        // Draw row background (alternating)
        if (row % 2 === 0) {
          currentPage.drawRectangle({
            x: margin,
            y: yPosition - rowHeight,
            width: usableWidth,
            height: rowHeight,
            color: rgb(0.96, 0.96, 0.96), // Very light gray
          });
        }

        for (let col = 1; col <= maxCols; col++) {
          const cell = worksheet.getCell(row, col);
          const cellValue = getCellValueAsString(cell);

          // Get cell formatting
          const font = cell.font;
          const fill = cell.fill;
          const alignment = cell.alignment;

          // Draw cell border
          currentPage.drawRectangle({
            x: xPosition,
            y: yPosition - rowHeight,
            width: colWidth,
            height: rowHeight,
            borderColor: rgb(0.8, 0.8, 0.8),
            borderWidth: 0.5,
          });

          // Apply fill color if present
          if (fill && fill.type === 'pattern' && fill.fgColor) {
            const color = fill.fgColor.argb;
            if (color) {
              const hexColor = color.replace('#', '');
              const r = parseInt(hexColor.substring(0, 2), 16) / 255;
              const g = parseInt(hexColor.substring(2, 4), 16) / 255;
              const b = parseInt(hexColor.substring(4, 6), 16) / 255;
              
              currentPage.drawRectangle({
                x: xPosition,
                y: yPosition - rowHeight,
                width: colWidth,
                height: rowHeight,
                color: rgb(r, g, b),
              });
            }
          }

          // Draw text
          const fontSize = font?.size || 9;
          const textFont = font?.bold ? helveticaBoldFont : 
                          font?.italic ? helveticaObliqueFont : helveticaFont;
          
          // Get text color
          let textColor = rgb(0, 0, 0);
          if (font?.color) {
            const color = font.color.argb;
            if (color) {
              const hexColor = color.replace('#', '');
              const r = parseInt(hexColor.substring(0, 2), 16) / 255;
              const g = parseInt(hexColor.substring(2, 4), 16) / 255;
              const b = parseInt(hexColor.substring(4, 6), 16) / 255;
              textColor = rgb(r, g, b);
            }
          }

          let textX = xPosition + 5;
          if (alignment?.horizontal === 'center') {
            const textWidth = textFont.widthOfTextAtSize(cellValue, fontSize);
            textX = xPosition + (colWidth - textWidth) / 2;
          } else if (alignment?.horizontal === 'right') {
            const textWidth = textFont.widthOfTextAtSize(cellValue, fontSize);
            textX = xPosition + colWidth - textWidth - 5;
          }

          const sanitizedValue = sanitizeTextForPDF(cellValue);
          try {
            currentPage.drawText(sanitizedValue, {
              x: textX,
              y: yPosition - rowHeight + 3,
              size: fontSize,
              font: textFont,
              color: textColor,
            });
          } catch (error) {
            // If still fails, try with even more sanitization
            const safeValue = sanitizedValue.replace(/[^\x20-\x7E]/g, '?');
            currentPage.drawText(safeValue, {
              x: textX,
              y: yPosition - rowHeight + 3,
              size: fontSize,
              font: textFont,
              color: textColor,
            });
          }

          xPosition += colWidth;
        }

        yPosition -= rowHeight;
      }

      sheetIndex++;
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();

    // Return the PDF file
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.(xls|xlsx)$/i, '')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Excel to PDF conversion error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to convert Excel to PDF. Please ensure the file is a valid Excel file.' 
      },
      { status: 500 }
    );
  }
}
