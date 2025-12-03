'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faFilePdf,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { validateFileSize, showError, showSuccess, showLoading, updateToSuccess, updateToError, formatFileSize } from '../../lib/utils';

// Dynamically import pdfjs-dist and exceljs
let pdfjsLib: any = null;
let exceljsLib: any = null;

const loadPdfJs = async () => {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    const version = pdfjsLib.version || '5.4.394';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
};

const loadExcelJs = async () => {
  if (!exceljsLib) {
    exceljsLib = await import('exceljs');
  }
  return exceljsLib;
};

export default function PDFToExcel() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/pdf'
    );
    if (files.length > 0 && validateFileSize(files[0])) {
      setSelectedFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFileSize(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      showError('Please select a PDF file to convert.');
      return;
    }

    const toastId = showLoading('Converting PDF to Excel...');
    setIsProcessing(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await convertPDFToExcel();
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'PDF converted to Excel successfully! Download started.');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while converting the PDF. Please try again.');
      console.error('Conversion error:', error);
    }
  };

  const convertPDFToExcel = async () => {
    if (!selectedFile) return;

    try {
      // Convert PDF to HTML first, then parse HTML to Excel on the client
      const formData = new FormData();
      formData.append('file', selectedFile);

      const htmlResponse = await fetch('/api/pdf-to-html-server', {
        method: 'POST',
        body: formData,
      });

      if (!htmlResponse.ok) {
        const errorData = await htmlResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to convert PDF to HTML');
      }

      const htmlContent = await htmlResponse.text();

      // Step 2: Parse HTML and convert to Excel (client-side)
      const ExcelJS = await loadExcelJs();
      const workbook = new ExcelJS.Workbook();

      // Ensure we don't keep any default sheet that ExcelJS might add
      if (workbook.worksheets && workbook.worksheets.length === 1 && workbook.worksheets[0].name === 'Sheet1') {
        workbook.removeWorksheet(workbook.worksheets[0].id);
      }

      // Parse HTML using DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Find all page divs (each page is wrapped in <div class="page">)
      const pageElements = doc.querySelectorAll('div.page');
      
      // If no page divs found, treat entire body as one page
      const pagesToProcess = pageElements.length > 0 
        ? Array.from(pageElements) 
        : [doc.body || doc.documentElement];
      
      // Helper function to get text content from element
      const getTextContent = (element: Node): string => {
        let text = '';
        for (const node of Array.from(element.childNodes)) {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent || '';
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            text += getTextContent(node);
          }
        }
        return text.trim();
      };

      // Helper function to check if element is block-level
      const isBlockElement = (tagName: string): boolean => {
        const blockTags = ['DIV', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TABLE', 'UL', 'OL', 'LI', 'BR', 'HR', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'NAV', 'ASIDE', 'BLOCKQUOTE', 'PRE'];
        return blockTags.includes(tagName.toUpperCase());
      };

      // Helper function to parse style attribute
      const parseStyle = (styleAttr: string | null): Record<string, string> => {
        const styles: Record<string, string> = {};
        if (!styleAttr) return styles;
        
        styleAttr.split(';').forEach(rule => {
          const [key, value] = rule.split(':').map(s => s.trim());
          if (key && value) {
            styles[key.toLowerCase()] = value;
          }
        });
        return styles;
      };

      // Helper function to convert color to ARGB
      const colorToArgb = (color: string): string | null => {
        // Handle rgb/rgba
        const rgbMatch = color.match(/\d+/g);
        if (rgbMatch && rgbMatch.length >= 3) {
          const r = parseInt(rgbMatch[0]).toString(16).padStart(2, '0');
          const g = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
          const b = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
          return `FF${r}${g}${b}`;
        }
        // Handle hex colors
        if (color.startsWith('#')) {
          const hex = color.slice(1);
          if (hex.length === 6) {
            return `FF${hex.toUpperCase()}`;
          } else if (hex.length === 3) {
            return `FF${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
          }
        }
        return null;
      };

      // Helper function to extract position values from style
      const extractPosition = (styleAttr: string | null): { top: number | null; left: number | null; position: string | null } => {
        const styles = parseStyle(styleAttr);
        const position = styles['position'] || null;
        
        let top: number | null = null;
        let left: number | null = null;
        
        if (styles['top']) {
          const topMatch = styles['top'].match(/([\d.]+)/);
          if (topMatch) {
            top = parseFloat(topMatch[1]);
          }
        }
        
        if (styles['left']) {
          const leftMatch = styles['left'].match(/([\d.]+)/);
          if (leftMatch) {
            left = parseFloat(leftMatch[1]);
          }
        }
        
        return { top, left, position };
      };

      // Helper function to apply formatting to cell
      const applyFormatting = (cell: any, element: Element) => {
        const styleAttr = element.getAttribute('style');
        const styles = parseStyle(styleAttr);
        const font: any = {};
        
        // Bold
        if (element.tagName === 'B' || element.tagName === 'STRONG' || 
            styles['font-weight']?.includes('bold') ||
            styles['font-weight'] === '700' ||
            parseInt(styles['font-weight'] || '400') >= 600) {
          font.bold = true;
        }
        
        // Italic
        if (element.tagName === 'I' || element.tagName === 'EM' ||
            styles['font-style'] === 'italic') {
          font.italic = true;
        }

        // Underline
        if (element.tagName === 'U' || styles['text-decoration']?.includes('underline') || 
            styles['text-decoration']?.includes('underline')) {
          font.underline = true;
        }

        // Font size
        if (styles['font-size']) {
          const size = parseInt(styles['font-size']);
          if (size && !isNaN(size)) {
            font.size = size;
          }
        }

        // Color
        if (styles['color']) {
          const argb = colorToArgb(styles['color']);
          if (argb) {
            font.color = { argb };
          }
        }

        if (Object.keys(font).length > 0) {
          cell.font = { ...cell.font, ...font };
        }

        // Alignment
        if (styles['text-align']) {
          const align = styles['text-align'].toLowerCase();
          if (align === 'center') {
            cell.alignment = { ...cell.alignment, horizontal: 'center' };
          } else if (align === 'right') {
            cell.alignment = { ...cell.alignment, horizontal: 'right' };
          } else if (align === 'left') {
            cell.alignment = { ...cell.alignment, horizontal: 'left' };
          }
        }
      };

      // Helper function to check if element is inside a structured element (table, list, etc.)
      const isInsideStructuredElement = (element: Element): boolean => {
        let current: Element | null = element.parentElement;
        while (current) {
          const tagName = current.tagName.toUpperCase();
          if (tagName === 'TABLE' || tagName === 'UL' || tagName === 'OL' || 
              tagName === 'TR' || tagName === 'TD' || tagName === 'TH' || 
              tagName === 'LI' || tagName === 'THEAD' || tagName === 'TBODY' || 
              tagName === 'TFOOT') {
            return true;
          }
          current = current.parentElement;
        }
        return false;
      };

      // Helper function to collect all positioned elements
      const collectPositionedElements = (element: Element, result: Array<{ element: Element; top: number; left: number }> = []): Array<{ element: Element; top: number; left: number }> => {
        const styleAttr = element.getAttribute('style');
        const className = element.getAttribute('class') || '';
        const pos = extractPosition(styleAttr);
        
        // Check if this element has absolute positioning:
        // 1. Has class "text-element" (which has position: absolute in CSS)
        // 2. OR has position: absolute in inline style
        // 3. OR has both top and left values (strong indicator of positioning)
        // 4. AND has both top and left values
        const hasAbsolutePosition = className.includes('text-element') || 
                                   pos.position === 'absolute' || 
                                   (pos.top !== null && pos.left !== null);
        
        if (hasAbsolutePosition && pos.top !== null && pos.left !== null) {
          // Skip if inside a structured element (table, list, etc.)
          if (!isInsideStructuredElement(element)) {
            const text = getTextContent(element).trim();
            // Only include if it has text content (skip empty divs)
            if (text) {
              result.push({ element, top: pos.top, left: pos.left });
            }
          }
        }
        
        // Recursively check children (but skip tables, lists, etc. as they have their own structure)
        const tagName = element.tagName.toUpperCase();
        if (tagName !== 'TABLE' && tagName !== 'UL' && tagName !== 'OL' && 
            tagName !== 'TR' && tagName !== 'TD' && tagName !== 'TH' && 
            tagName !== 'LI' && tagName !== 'THEAD' && tagName !== 'TBODY' && 
            tagName !== 'TFOOT') {
          Array.from(element.children).forEach(child => {
            collectPositionedElements(child, result);
          });
        }
        
        return result;
      };

      // Process element recursively
      const processElement = (element: Node, row: number, worksheet: any, maxColumnRef: { value: number }, indent: number = 0, skipPositioned: Set<Element> = new Set()): number => {
        if (element.nodeType === Node.TEXT_NODE) {
          // Text nodes are handled by their parent elements
          return row;
        }

        if (element.nodeType !== Node.ELEMENT_NODE) {
          return row;
        }

        const el = element as Element;
        
        // Skip if this element was already processed as positioned
        if (skipPositioned.has(el)) {
          return row;
        }
        
        const tagName = el.tagName.toUpperCase();

        // Handle tables
        if (tagName === 'TABLE') {
          const table = el as HTMLTableElement;
          const rows = Array.from(table.querySelectorAll('tr'));
          
          // Track rowspan cells that span into current row
          const rowspanTracker: Map<number, number> = new Map(); // col -> remaining rows
          
          rows.forEach((tr, trIndex) => {
            const cells = Array.from(tr.querySelectorAll('td, th'));
            let col = indent + 1;
            
            cells.forEach((td) => {
              // Skip columns that are occupied by rowspan from previous rows
              while (rowspanTracker.has(col)) {
                const remaining = rowspanTracker.get(col)!;
                if (remaining > 1) {
                  rowspanTracker.set(col, remaining - 1);
                } else {
                  rowspanTracker.delete(col);
                }
                col++;
              }
              
              const cell = worksheet.getCell(row, col);
              const text = getTextContent(td).trim();
              cell.value = text || ''; // Empty string if no text
              
              // Apply formatting
              applyFormatting(cell, td);
              
              // Header cells
              if (td.tagName === 'TH') {
                cell.font = { ...cell.font, bold: true };
                cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
              }
              
              // Handle colspan
              const colspan = parseInt(td.getAttribute('colspan') || '1') || 1;
              const rowspan = parseInt(td.getAttribute('rowspan') || '1') || 1;
              
              // Merge cells if needed
              try {
                if (colspan > 1 && rowspan > 1) {
                  worksheet.mergeCells(row, col, row + rowspan - 1, col + colspan - 1);
                } else if (colspan > 1) {
                  worksheet.mergeCells(row, col, row, col + colspan - 1);
                } else if (rowspan > 1) {
                  worksheet.mergeCells(row, col, row + rowspan - 1, col);
                }
              } catch (mergeError) {
                // If merge fails, just continue without merging
                console.warn('Cell merge failed:', mergeError);
              }
              
              // Track rowspan (number of additional rows this cell spans)
              if (rowspan > 1) {
                for (let c = col; c < col + colspan; c++) {
                  rowspanTracker.set(c, rowspan - 1); // Will span (rowspan - 1) more rows
                }
              }
              
              // Borders - apply to the cell (merged cells will share borders)
              cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } },
              };
              
              // Alignment
              const align = td.getAttribute('align') || (td as HTMLElement).style?.textAlign;
              if (align) {
                const alignLower = align.toLowerCase();
                if (alignLower === 'center') {
                  cell.alignment = { ...cell.alignment, horizontal: 'center' };
                } else if (alignLower === 'right') {
                  cell.alignment = { ...cell.alignment, horizontal: 'right' };
                } else if (alignLower === 'left') {
                  cell.alignment = { ...cell.alignment, horizontal: 'left' };
                }
              }
              
              col += colspan;
              maxColumnRef.value = Math.max(maxColumnRef.value, col);
            });
            
            row++;
          });
          
          // Add spacing after table
          return row;
        }

        // Handle lists
        if (tagName === 'UL' || tagName === 'OL') {
          const listItems = Array.from(el.querySelectorAll('li'));
          listItems.forEach((li, index) => {
            // Collect all text from list item, including from inline children
            const allText: string[] = [];
            const collectTextFromLi = (node: Node): void => {
              if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent?.trim();
                if (text) allText.push(text);
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                const childEl = node as Element;
                const childTag = childEl.tagName.toUpperCase();
                // Only collect from inline elements, not block elements
                if (['SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'A', 'CODE', 'SMALL', 'SUB', 'SUP'].includes(childTag)) {
                  Array.from(childEl.childNodes).forEach(collectTextFromLi);
                }
              }
            };
            
            // Collect text from direct children and inline elements only
            Array.from(li.childNodes).forEach((child) => {
              if (child.nodeType === Node.TEXT_NODE) {
                const text = child.textContent?.trim();
                if (text) allText.push(text);
              } else if (child.nodeType === Node.ELEMENT_NODE) {
                const childTag = (child as Element).tagName.toUpperCase();
                if (['SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'A', 'CODE', 'SMALL', 'SUB', 'SUP'].includes(childTag)) {
                  collectTextFromLi(child);
                }
              }
            });
            
            // Add the list item text to Excel
            const cell = worksheet.getCell(row, indent + 1);
            const itemText = allText.join(' ').trim();
            cell.value = tagName === 'OL' ? `${index + 1}. ${itemText}` : `• ${itemText}`;
            applyFormatting(cell, li);
            maxColumnRef.value = Math.max(maxColumnRef.value, indent + 1);
            row++;
            
            // Process only block-level children (like nested lists or paragraphs)
            Array.from(li.childNodes).forEach((child) => {
              if (child.nodeType === Node.ELEMENT_NODE) {
                const childTag = (child as Element).tagName.toUpperCase();
                if (childTag === 'UL' || childTag === 'OL') {
                  // Nested list - process it with more indent
                  row = processElement(child, row, worksheet, maxColumnRef, indent + 2, skipPositioned);
                } else if (isBlockElement(childTag) && !['SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'A', 'CODE', 'SMALL', 'SUB', 'SUP'].includes(childTag)) {
                  // Block-level child (like paragraph, div) - process it
                  row = processElement(child, row, worksheet, maxColumnRef, indent + 1, skipPositioned);
                }
              }
            });
          });
          return row;
        }

        // Handle headings
        if (tagName.startsWith('H') && tagName.length === 2) {
          const level = parseInt(tagName[1]) || 1;
          const cell = worksheet.getCell(row, indent + 1);
          const text = getTextContent(el);
          cell.value = text;
          cell.font = { bold: true, size: 18 - (level * 2) };
          maxColumnRef.value = Math.max(maxColumnRef.value, indent + 1);
          return row + 1;
        }

        // Handle line breaks
        if (tagName === 'BR' || tagName === 'HR') {
          return row + 1;
        }

        // Handle paragraphs and divs
        if (tagName === 'P' || tagName === 'DIV' || tagName === 'SECTION' || tagName === 'ARTICLE') {
          // Check if there are block-level children
          const hasBlockChildren = Array.from(el.childNodes).some((child) => {
            if (child.nodeType === Node.ELEMENT_NODE) {
              const childTag = (child as Element).tagName.toUpperCase();
              return isBlockElement(childTag) && !['SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'A', 'CODE', 'SMALL', 'SUB', 'SUP'].includes(childTag);
            }
            return false;
          });
          
          // If no block children, collect all text and add as one cell
          if (!hasBlockChildren) {
            const allText: string[] = [];
            const collectText = (node: Node): void => {
              if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent?.trim();
                if (text) allText.push(text);
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                const childEl = node as Element;
                const childTag = childEl.tagName.toUpperCase();
                if (['SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'A', 'CODE', 'SMALL'].includes(childTag)) {
                  Array.from(childEl.childNodes).forEach(collectText);
                }
              }
            };
            
            Array.from(el.childNodes).forEach(collectText);
            
            if (allText.length > 0) {
              const cell = worksheet.getCell(row, indent + 1);
              cell.value = allText.join(' ');
              applyFormatting(cell, el);
              maxColumnRef.value = Math.max(maxColumnRef.value, indent + 1);
              row++;
            }
          } else {
            // Has block children - process them individually
            Array.from(el.childNodes).forEach((child) => {
              row = processElement(child, row, worksheet, maxColumnRef, indent, skipPositioned);
            });
          }
          
          return row;
        }

        // Handle images (placeholder)
        if (tagName === 'IMG') {
          const cell = worksheet.getCell(row, indent + 1);
          const alt = (el as HTMLImageElement).alt || 'Image';
          cell.value = `[Image: ${alt}]`;
          cell.font = { italic: true, color: { argb: 'FF808080' } };
          maxColumnRef.value = Math.max(maxColumnRef.value, indent + 1);
          return row + 1;
        }

        // Handle inline elements (span, strong, em, etc.) - these are handled by parent elements
        if (['SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'A', 'CODE', 'SMALL', 'SUB', 'SUP'].includes(tagName)) {
          // Just process children - text will be collected by parent block element
          Array.from(el.childNodes).forEach((child) => {
            row = processElement(child, row, worksheet, maxColumnRef, indent, skipPositioned);
          });
          return row;
        }

        // Default: process all children
        Array.from(el.childNodes).forEach((child) => {
          row = processElement(child, row, worksheet, maxColumnRef, indent, skipPositioned);
        });

        return row;
      };

      // Function to process a single page
      const processPage = (pageElement: Element, worksheet: any, pageNumber: number) => {
        let currentRow = 1;
        let maxColumn = 1;
        const positionedRows = new Set<number>(); // rows that come from positioned (non-table) content
        
        // Step 1: Collect and process absolutely positioned elements within this page
        const positionedElements = collectPositionedElements(pageElement);
        
        if (positionedElements.length > 0) {
          // Group elements by vertical position (same visual line) with tolerance
          // We first bucket Y positions to reduce tiny differences, then apply a tolerance.
          const tolerance = 12; // pixels tolerance for same row (slightly relaxed)
          const rowBucketSize = 5; // bucket height in pixels for normalizing "top" values
          const groupedByRow = new Map<number, Array<{ element: Element; top: number; left: number }>>();
          
          positionedElements.forEach(item => {
            // Normalize top value into a bucket so small baseline differences stay on same row
            const normalizedTop = Math.round(item.top / rowBucketSize) * rowBucketSize;
            
            // Find existing row group within tolerance
            let matchedRow: number | null = null;
            for (const [rowTop] of groupedByRow) {
              if (Math.abs(normalizedTop - rowTop) <= tolerance) {
                matchedRow = rowTop;
                break;
              }
            }
            
            if (matchedRow !== null) {
              groupedByRow.get(matchedRow)!.push(item);
            } else {
              groupedByRow.set(normalizedTop, [item]);
            }
          });
          
          // Sort rows by top value
          const sortedRows = Array.from(groupedByRow.entries()).sort((a, b) => a[0] - b[0]);
          
          // Process each row
          sortedRows.forEach(([rowTop, items]) => {
            // Sort items in this row by left value
            items.sort((a, b) => a.left - b.left);
            
            // Create unique column positions (group similar left positions)
            const columnTolerance = 30;
            const uniqueColumns: number[] = [];
            
            items.forEach(item => {
              // Find if there's an existing column position within tolerance
              let found = false;
              for (let i = 0; i < uniqueColumns.length; i++) {
                if (Math.abs(item.left - uniqueColumns[i]) <= columnTolerance) {
                  found = true;
                  break;
                }
              }
              
              // If no matching column, add this left position as a new column
              if (!found) {
                uniqueColumns.push(item.left);
              }
            });
            
            // Sort column positions
            uniqueColumns.sort((a, b) => a - b);
            
            // Map left positions to consecutive Excel columns (1, 2, 3, etc.)
            // No gaps - just use consecutive columns based on order
            const leftToColumn = new Map<number, number>();
            uniqueColumns.forEach((leftPos, index) => {
              leftToColumn.set(leftPos, index + 1); // Excel columns start at 1
            });
            
            // Track which columns we're placing content in
            const columnsUsed = new Set<number>();
            
            // Place items in their columns
            items.forEach(item => {
              // Find which column this item belongs to (closest match)
              let matchedCol = 1;
              let minDistance = Infinity;
              
              for (const [leftPos, excelCol] of leftToColumn) {
                const distance = Math.abs(item.left - leftPos);
                if (distance <= columnTolerance && distance < minDistance) {
                  minDistance = distance;
                  matchedCol = excelCol;
                }
              }
              
              columnsUsed.add(matchedCol);
              const cell = worksheet.getCell(currentRow, matchedCol);
              const text = getTextContent(item.element).trim();
              
              // If cell already has value, append with space (multiple items in same column)
              if (cell.value) {
                cell.value = String(cell.value) + ' ' + text;
              } else {
                cell.value = text;
              }
              
              applyFormatting(cell, item.element);
              maxColumn = Math.max(maxColumn, matchedCol);
            });

            // Decide if this visual line looks like a "table row":
            // if it has 3 or more distinct columns, keep them separate.
            const usedCols = Array.from(columnsUsed).sort((a, b) => a - b);
            const isTableLikeRow = usedCols.length >= 3;

            // If this visual line ended up in multiple columns but does NOT
            // look like a table row, merge those cells into a single wide cell
            // so the entire line appears as one row in Excel.
            if (!isTableLikeRow && usedCols.length > 1) {
              const firstCol = usedCols[0];
              const lastCol = usedCols[usedCols.length - 1];

              // Concatenate text from all used columns in left-to-right order
              let mergedText = '';
              usedCols.forEach((colIndex) => {
                const c = worksheet.getCell(currentRow, colIndex);
                const v = c.value !== null && c.value !== undefined ? String(c.value).trim() : '';
                if (v) {
                  mergedText += (mergedText ? ' ' : '') + v;
                }
              });

              try {
                if (mergedText) {
                  // Set value on the first cell and merge across the row
                  const startCell = worksheet.getCell(currentRow, firstCol);
                  startCell.value = mergedText;
                  worksheet.mergeCells(currentRow, firstCol, currentRow, lastCol);
                }
              } catch (mergeErr) {
                console.warn('Row merge failed for positioned line:', mergeErr);
              }
            }

            // Mark this row as coming from positioned content (for later
            // empty-column merge) ONLY if it's not table-like.
            if (!isTableLikeRow) {
              positionedRows.add(currentRow);
            }
            
            currentRow++;
          });
          
        }
        
        // Step 2: Process remaining elements using DOM parsing (tables, lists, etc.)
        // But skip elements that were already processed as positioned
        const processedPositionedElements = new Set(positionedElements.map(item => item.element));
        
        // Process the page element (skipping positioned elements)
        const maxColumnRef = { value: maxColumn };
        currentRow = processElement(pageElement, currentRow, worksheet, maxColumnRef, 0, processedPositionedElements);
        maxColumn = maxColumnRef.value;

        // Step 3: Merge empty columns per row (after all content is placed)
        // Track which columns have content overall
        const columnsWithContent = new Set<number>();
        
        console.log(`[FINAL MERGE] Starting merge process for ${currentRow} rows, max column: ${maxColumn}`);
        
        // Process each row to merge empty columns between content
        for (let row = 1; row <= currentRow; row++) {
          // IMPORTANT: only adjust rows that came from positioned (non-table) content.
          // Rows created from real <table> structures should retain their separate columns.
          if (!positionedRows.has(row)) {
            continue;
          }

          // Find which columns have content in this row
          const rowContentColumns: number[] = [];
          for (let col = 1; col <= maxColumn; col++) {
            try {
              const cell = worksheet.getCell(row, col);
              // Check if cell has a value
              const cellValue = cell.value;
              if (cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
                // Only add if not already in list (to avoid duplicates from merged cells)
                if (!rowContentColumns.includes(col)) {
                  rowContentColumns.push(col);
                  columnsWithContent.add(col);
                }
              }
            } catch (e) {
              // Skip if cell doesn't exist
            }
          }
          
          // Sort content columns for this row
          rowContentColumns.sort((a, b) => a - b);
          
          // Merge empty columns in this row
          if (rowContentColumns.length > 0) {
            // Merge empty cells between content columns
            if (rowContentColumns.length > 1) {
              for (let i = 0; i < rowContentColumns.length - 1; i++) {
                const currentCol = rowContentColumns[i];
                const nextCol = rowContentColumns[i + 1];
                
                // If there are empty columns between current and next
                if (nextCol - currentCol > 1) {
                  const endMergeCol = nextCol - 1;
                  
                  // Verify cells between are actually empty
                  let allEmpty = true;
                  for (let checkCol = currentCol + 1; checkCol < nextCol; checkCol++) {
                    try {
                      const checkCell = worksheet.getCell(row, checkCol);
                      if (checkCell.value && String(checkCell.value).trim()) {
                        allEmpty = false;
                        break;
                      }
                      if (checkCell.isMerged) {
                        try {
                          const master = checkCell.master;
                          if (master) {
                            const masterRow = parseInt(master.address.match(/(\d+)/)?.[1] || '0');
                            if (masterRow === row) {
                              allEmpty = false;
                              break;
                            }
                          }
                        } catch (e) {
                          allEmpty = false;
                          break;
                        }
                      }
                    } catch (e) {
                      // Cell doesn't exist, consider empty
                    }
                  }
                  
                  // Attempt merge if all cells between are empty
                  if (allEmpty) {
                    try {
                      const startCell = worksheet.getCell(row, currentCol);
                      if (!startCell.isMerged || (startCell.master && parseInt(startCell.master.address.match(/(\d+)/)?.[1] || '0') !== row)) {
                        worksheet.mergeCells(row, currentCol, row, endMergeCol);
                        console.log(`[FINAL MERGE] Row ${row}: Merged columns ${currentCol}-${endMergeCol}`);
                      }
                    } catch (mergeError: any) {
                      console.warn(`[FINAL MERGE] Row ${row}: Failed to merge columns ${currentCol}-${endMergeCol}:`, mergeError?.message || 'Unknown error');
                    }
                  }
                }
              }
            }
            
            // Merge empty cells after the last content column (up to maxColumn)
            const lastContentCol = rowContentColumns[rowContentColumns.length - 1];
            if (lastContentCol < maxColumn) {
              // Check if cells after last content column are empty
              let allEmptyAfter = true;
              for (let checkCol = lastContentCol + 1; checkCol <= maxColumn; checkCol++) {
                try {
                  const checkCell = worksheet.getCell(row, checkCol);
                  if (checkCell.value && String(checkCell.value).trim()) {
                    allEmptyAfter = false;
                    break;
                  }
                  if (checkCell.isMerged) {
                    try {
                      const master = checkCell.master;
                      if (master) {
                        const masterRow = parseInt(master.address.match(/(\d+)/)?.[1] || '0');
                        if (masterRow === row) {
                          allEmptyAfter = false;
                          break;
                        }
                      }
                    } catch (e) {
                      allEmptyAfter = false;
                      break;
                    }
                  }
                } catch (e) {
                  // Cell doesn't exist, consider empty
                }
              }
              
              // Merge last content column with empty cells after it
              if (allEmptyAfter) {
                try {
                  const startCell = worksheet.getCell(row, lastContentCol);
                  if (!startCell.isMerged || (startCell.master && parseInt(startCell.master.address.match(/(\d+)/)?.[1] || '0') !== row)) {
                    worksheet.mergeCells(row, lastContentCol, row, maxColumn);
                    console.log(`[FINAL MERGE] Row ${row}: Merged columns ${lastContentCol}-${maxColumn}`);
                  }
                } catch (mergeError: any) {
                  console.warn(`[FINAL MERGE] Row ${row}: Failed to merge columns ${lastContentCol}-${maxColumn}:`, mergeError?.message || 'Unknown error');
                }
              }
            }
          }
        }
        
        console.log(`[FINAL MERGE] Merge process completed`);

        // Step 4: Auto-size every content column based purely on cell text length
        // so that column width closely matches the content.
        worksheet.columns.forEach((column: any) => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: false }, (cell: any) => {
            if (cell.value !== null && cell.value !== undefined) {
              const cellText = cell.value.toString();
              if (cellText.length > maxLength) {
                maxLength = cellText.length;
              }
            }
          });

          // Add small padding and clamp to a reasonable range
          const padded = maxLength + 2;
          if (maxLength === 0) {
            column.width = 2; // almost empty column
          } else {
            column.width = Math.min(Math.max(padded, 10), 60);
          }
        });
      };
      
      // Process each page separately
      pagesToProcess.forEach((pageElement, index) => {
        const pageNumber = index + 1;
        const sheetName = pagesToProcess.length > 1 ? `Page ${pageNumber}` : 'PDF Content';
        const worksheet = workbook.addWorksheet(sheetName);
        processPage(pageElement, worksheet, pageNumber);
      });
      
      // Generate and download the Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace('.pdf', '') + '.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error converting PDF to Excel:', error);
      throw error;
    }
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`bg-white rounded-xl border-2 border-dashed border-[var(--color-border-gray)] p-12 text-center mb-8 transition-all duration-300 ${
              isDragging ? 'border-[var(--color-primary)] bg-blue-50' : 'hover:border-[var(--color-primary)]'
            }`}
          >
            <div className="flex flex-col items-center">
              <div className="bg-blue-50 rounded-full p-6 mb-4">
                <FontAwesomeIcon icon={faCloudArrowUp} className="text-[var(--color-primary)]" size="3x" />
              </div>
              <h3 className="text-xl font-semibold text-[var(--color-text-dark)] mb-2">
                Drop your PDF file here
              </h3>
              <p className="text-[var(--color-text-muted)] mb-6">or click to browse and select a file</p>
              <label htmlFor="file-input" className="cursor-pointer">
                <span className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faFolderOpen} />
                  Choose File
                </span>
              </label>
              <input
                type="file"
                id="file-input"
                accept=".pdf"
                className="hidden"
                onChange={handleFileInput}
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-4">
                Supports PDF files up to 25MB
              </p>
            </div>
          </div>

          {/* Selected File */}
          {selectedFile && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FontAwesomeIcon icon={faFilePdf} className="text-red-500" />
                    <div>
                      <span className="font-medium text-[var(--color-text-dark)]">{selectedFile.name}</span>
                      <span className="text-sm text-[var(--color-text-muted)] ml-2">
                             ({formatFileSize(selectedFile.size)})
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-[var(--color-danger)] hover:bg-red-50 p-2 rounded"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Convert Button */}
          {selectedFile && !isProcessing && (
            <div className="text-center">
              <button
                onClick={handleConvert}
                className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Convert PDF to Excel
              </button>
              <p className="text-sm text-[var(--color-text-muted)] mt-4">
                Processing typically takes a few seconds
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--color-text-dark)]">
                  Converting PDF to Excel...
                </span>
                <span className="text-sm text-[var(--color-text-muted)]">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[var(--color-primary)] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Your PDF is converted to HTML first, then to Excel, preserving the exact layout including tables, text, and formatting. 
              All content appears in a single continuous worksheet maintaining the original structure.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
