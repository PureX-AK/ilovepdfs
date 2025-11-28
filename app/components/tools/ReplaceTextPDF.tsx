'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faFilePdf,
  faTrash,
  faTimes,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { validateFileSize, showError, showSuccess, showLoading, updateToSuccess, updateToError, formatFileSize } from '../../lib/utils';
import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import dynamic from 'next/dynamic';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Dynamically import react-pdf with SSR disabled (DOMMatrix is browser-only)
const ReactPdfDocument = dynamic(
  () => import('react-pdf').then((mod) => {
    // Configure PDF.js worker - use jsdelivr CDN which is more reliable
    if (typeof window !== 'undefined') {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
    }
    return mod.Document;
  }),
  { ssr: false }
);

const ReactPdfPage = dynamic(
  () => import('react-pdf').then((mod) => {
    // Ensure worker is configured
    if (typeof window !== 'undefined') {
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${mod.pdfjs.version}/build/pdf.worker.min.mjs`;
    }
    return mod.Page;
  }),
  { ssr: false }
);

interface TextItem {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pageNum: number;
  fontSize: number;
  fontName: string;
  color: string;
}

interface LineItem {
  text: string;
  items: TextItem[];
  pageNum: number;
  y: number;
  minX: number;
  maxX: number;
  fontSize: number;
  fontName: string;
  color: string;
}

interface Replacement {
  oldText: string;
  newText: string;
  pageNum: number;
  x: number;
  y: number;
  pageWidth?: number; // Page element width in pixels (for coordinate conversion)
  pageHeight?: number; // Page element height in pixels (for coordinate conversion)
  fontSize: number;
  fontName: string;
  color: string;
}

export default function ReplaceTextPDF() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedLine, setSelectedLine] = useState<LineItem | null>(null);
  const [selectedTextItem, setSelectedTextItem] = useState<TextItem | null>(null);
  const [replacementText, setReplacementText] = useState('');
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [scale, setScale] = useState(2.0);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [editingItem, setEditingItem] = useState<TextItem | null>(null);
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const editableInputRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/pdf'
    );
    if (files.length > 0 && validateFileSize(files[0])) {
      await loadPDF(files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFileSize(file)) {
        await loadPDF(file);
      }
    }
  };

  const loadPDF = async (file: File) => {
    try {
      setSelectedFile(file);
      setTextItems([]);
      setLineItems([]);
      setReplacements([]);
      setSelectedLine(null);
      setCurrentPage(1);
      
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      
      // Extract text items using Python backend for accurate positions
      await extractTextItemsFromBackend(file);
    } catch (error) {
      console.error('Error loading PDF:', error);
      showError('Failed to load PDF. Please try again.');
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setTotalPages(numPages);
  };

  const groupTextItemsIntoLines = (items: TextItem[]) => {
    // Group items by lines (similar Y positions)
    const linesByPage: { [pageNum: number]: { [lineY: number]: TextItem[] } } = {};
    
    items.forEach(item => {
      if (!linesByPage[item.pageNum]) {
        linesByPage[item.pageNum] = {};
      }
      
      // Round Y to group items on the same line (tolerance: 10px for better line detection)
      const lineY = Math.round(item.y / 10) * 10;
      
      if (!linesByPage[item.pageNum][lineY]) {
        linesByPage[item.pageNum][lineY] = [];
      }
      linesByPage[item.pageNum][lineY].push(item);
    });
    
    // Create line items
    const lines: LineItem[] = [];
    Object.keys(linesByPage).forEach(pageNumStr => {
      const pageNum = parseInt(pageNumStr);
      const pageLines = linesByPage[pageNum];
      
      Object.keys(pageLines).forEach(lineYStr => {
        const lineY = parseFloat(lineYStr);
        const lineTextItems = pageLines[lineY].sort((a, b) => a.x - b.x); // Sort by X position
        
        if (lineTextItems.length > 0) {
          // Combine all text items on this line
          const combinedText = lineTextItems.map(item => item.text).join(' ').trim();
          
          if (combinedText) {
            const firstItem = lineTextItems[0];
            const minX = Math.min(...lineTextItems.map(item => item.x));
            const maxX = Math.max(...lineTextItems.map(item => item.x + item.width));
            
            lines.push({
              text: combinedText,
              items: lineTextItems,
              pageNum: pageNum,
              y: lineY,
              minX: minX,
              maxX: maxX,
              fontSize: firstItem.fontSize,
              fontName: firstItem.fontName,
              color: firstItem.color,
            });
          }
        }
      });
    });
    
    setLineItems(lines);
  };

  const extractTextItemsFromBackend = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('scale', scale.toString());

      const response = await fetch('/api/pdf-extract-text-positions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to extract text positions');
      }

      const data = await response.json();
      if (data.success && data.textItems) {
        // Use PDF.js text layer to get exact DOM positions
        await extractTextItemsFromTextLayer(data.textItems);
      } else {
        throw new Error(data.error || 'Failed to extract text positions');
      }
    } catch (error) {
      console.error('Error extracting text from backend:', error);
      // Fallback: will extract from text layer when page renders
      showError('Failed to extract text positions. Text layer extraction will be used.');
    }
  };

  const extractTextItemsFromTextLayer = async (backendItems: TextItem[]) => {
    // For now, use backend items directly
    // The Python script should provide accurate coordinates
    setTextItems(backendItems);
    groupTextItemsIntoLines(backendItems);
  };

  const extractTextFromTextLayer = useCallback(() => {
    if (!pageRef.current || !isReplaceMode) {
      return;
    }

    // Find the text layer div created by react-pdf
    const pageElement = pageRef.current;
    const textLayer = pageElement.querySelector('.react-pdf__Page__textContent') as HTMLElement;
    
    if (!textLayer) {
      // Fallback: try to find any text layer
      const allTextLayers = pageElement.querySelectorAll('[class*="textLayer"]');
      if (allTextLayers.length === 0) return;
    }

    const textSpans = (textLayer || pageElement).querySelectorAll('span[role="presentation"]');
    const items: TextItem[] = [];

    textSpans.forEach((span: any) => {
      const text = span.textContent?.trim();
      if (!text) return;

      const rect = span.getBoundingClientRect();
      const pageRect = pageRef.current!.getBoundingClientRect();
      
      items.push({
        text: text,
        x: rect.left - pageRect.left,
        y: rect.top - pageRect.top,
        width: rect.width,
        height: rect.height,
        pageNum: currentPage,
        fontSize: parseFloat(span.style.fontSize) || 12,
        fontName: span.style.fontFamily || 'helv',
        color: span.style.color || '#000000',
      });
    });

    if (items.length > 0) {
      setTextItems(prev => {
        const otherPages = prev.filter(item => item.pageNum !== currentPage);
        return [...otherPages, ...items];
      });
      groupTextItemsIntoLines(items);
    }
  }, [currentPage, isReplaceMode, groupTextItemsIntoLines]);

  const extractTextItems = async (pdf: any, extractionScale?: number) => {
    const items: TextItem[] = [];
    // Use the same scale as canvas rendering
    const extractScale = extractionScale || scale || 2.0;
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: extractScale });
      const textContent = await page.getTextContent({ normalizeWhitespace: false });
      
      // Extract text items with coordinate conversion
      // PDF.js uses bottom-left origin, canvas uses top-left origin
      textContent.items.forEach((item: any) => {
        if (item.str && item.str.trim()) {
          const transform = item.transform || [1, 0, 0, 1, 0, 0];
          const x = transform[4]; // X position (already correct)
          
          // Y coordinate conversion
          // transform[5] is the baseline Y from bottom (PDF coordinate system)
          // Canvas uses top-left origin, so we need to invert
          const baseTextHeight = item.height || 12;
          const baseTextWidth = item.width || 50;
          const textHeight = baseTextHeight * extractScale;
          const textWidth = baseTextWidth * extractScale;
          
          // Convert from bottom-left to top-left:
          // 1. Get baseline from top: viewport.height - transform[5]
          // 2. The baseline is typically at about 75% down from top of text
          // 3. So top = baselineFromTop - (textHeight * 0.75)
          const baselineFromTop = viewport.height - transform[5];
          const y = baselineFromTop - (textHeight * 0.75);
          
          // Calculate font size from transform matrix
          const fontSize = Math.abs(transform[3] || transform[0] || 1) * baseTextHeight * extractScale;
          
          items.push({
            text: item.str,
            x: x,
            y: y,
            width: textWidth,
            height: textHeight,
            pageNum: pageNum,
            fontSize: fontSize,
            fontName: item.fontName || 'helv',
            color: item.color || '#000000',
          });
        }
      });
    }
    
    setTextItems(items);
    
    // Group items by lines (similar Y positions)
    const linesByPage: { [pageNum: number]: { [lineY: number]: TextItem[] } } = {};
    
    items.forEach(item => {
      if (!linesByPage[item.pageNum]) {
        linesByPage[item.pageNum] = {};
      }
      
      // Round Y to group items on the same line (tolerance: 10px for better line detection)
      const lineY = Math.round(item.y / 10) * 10;
      
      if (!linesByPage[item.pageNum][lineY]) {
        linesByPage[item.pageNum][lineY] = [];
      }
      linesByPage[item.pageNum][lineY].push(item);
    });
    
    // Create line items
    const lines: LineItem[] = [];
    Object.keys(linesByPage).forEach(pageNumStr => {
      const pageNum = parseInt(pageNumStr);
      const pageLines = linesByPage[pageNum];
      
      Object.keys(pageLines).forEach(lineYStr => {
        const lineY = parseFloat(lineYStr);
        const lineTextItems = pageLines[lineY].sort((a, b) => a.x - b.x); // Sort by X position
        
        if (lineTextItems.length > 0) {
          // Combine all text items on this line
          const combinedText = lineTextItems.map(item => item.text).join(' ').trim();
          
          if (combinedText) {
            const firstItem = lineTextItems[0];
            const minX = Math.min(...lineTextItems.map(item => item.x));
            const maxX = Math.max(...lineTextItems.map(item => item.x + item.width));
            
            lines.push({
              text: combinedText,
              items: lineTextItems,
              pageNum: pageNum,
              y: lineY,
              minX: minX,
              maxX: maxX,
              fontSize: firstItem.fontSize,
              fontName: firstItem.fontName,
              color: firstItem.color,
            });
          }
        }
      });
    });
    
    setLineItems(lines);
  };


  // Re-extract text items when scale changes
  useEffect(() => {
    if (selectedFile && textItems.length > 0) {
      extractTextItemsFromBackend(selectedFile);
    }
  }, [scale]);

  // Make text layer spans directly clickable (no borders - just click to edit)
  useEffect(() => {
    if (!isReplaceMode) {
      // Remove editing capabilities when not in replace mode
      if (pageRef.current) {
        // Remove any editable div overlays
        const editableDivs = pageRef.current.querySelectorAll('div[contenteditable="true"]');
        editableDivs.forEach((div) => {
          if (div.parentNode) {
            div.parentNode.removeChild(div);
          }
        });
        
        const textSpans = pageRef.current.querySelectorAll('span[role="presentation"]');
        textSpans.forEach((span: any) => {
          span.style.cursor = 'default';
          span.style.pointerEvents = 'auto';
          span.contentEditable = 'false';
          span.style.border = '';
          span.style.borderRadius = '';
          span.style.padding = '';
          span.style.backgroundColor = '';
          span.style.color = '';
          span.style.opacity = '';
          span.title = '';
          span.onblur = null;
          span.onkeydown = null;
          if (span._clickHandler) {
            span.removeEventListener('click', span._clickHandler);
            delete span._clickHandler;
          }
          delete span._originalText;
          if (span._editableDiv && span._editableDiv.parentNode) {
            span._editableDiv.parentNode.removeChild(span._editableDiv);
            delete span._editableDiv;
          }
        });
      }
      return;
    }

    // Wait for text layer to render
    const setupClickHandlers = () => {
      if (!pageRef.current) {
        setTimeout(setupClickHandlers, 100);
        return;
      }

      const pageElement = pageRef.current;
      // Try multiple selectors to find text layer
      let textLayer = pageElement.querySelector('.react-pdf__Page__textContent') as HTMLElement;
      if (!textLayer) {
        textLayer = pageElement.querySelector('[class*="textLayer"]') as HTMLElement;
      }
      if (!textLayer) {
        textLayer = pageElement.querySelector('[class*="textContent"]') as HTMLElement;
      }
      if (!textLayer) {
        // Try searching in the entire page element
        textLayer = pageElement as HTMLElement;
      }
      
      const textSpans = textLayer.querySelectorAll('span[role="presentation"]');
      
      if (textSpans.length === 0) {
        // Retry after a short delay
        setTimeout(setupClickHandlers, 100);
        return;
      }
      
      // Helper function to detect if a span is bold
      const isBold = (span: HTMLElement): boolean => {
        const style = getComputedStyle(span);
        const fontWeight = style.fontWeight;
        const fontFamily = style.fontFamily.toLowerCase();
        
        // Check font-weight (700+ is bold, or 'bold')
        if (fontWeight === 'bold' || fontWeight === 'bolder' || 
            (typeof fontWeight === 'string' && fontWeight.includes('bold'))) {
          return true;
        }
        if (typeof fontWeight === 'number' && fontWeight >= 700) {
          return true;
        }
        if (typeof fontWeight === 'string' && !isNaN(parseInt(fontWeight)) && parseInt(fontWeight) >= 700) {
          return true;
        }
        
        // Check font-family for bold indicators
        if (fontFamily.includes('bold') || fontFamily.includes('black') || 
            fontFamily.includes('heavy') || fontFamily.includes('semibold') || 
            fontFamily.includes('demibold')) {
          return true;
        }
        
        return false;
      };
      
      // Group spans into lines based on their top position
      const spansWithPositions: Array<{span: HTMLElement, rect: DOMRect, text: string, isBold: boolean}> = [];
      Array.from(textSpans).forEach((span: any) => {
        const text = span.textContent?.trim();
        if (!text) return;
        const rect = span.getBoundingClientRect();
        const bold = isBold(span);
        spansWithPositions.push({ span, rect, text, isBold: bold });
      });
      
      // First, group spans by similar top position (same line)
      const lineTolerance = 3; // pixels - spans within 3px of each other vertically are on the same line
      const lines: Array<Array<{span: HTMLElement, rect: DOMRect, text: string, isBold: boolean}>> = [];
      
      spansWithPositions.forEach((item) => {
        // Find if this span belongs to an existing line
        let foundLine = false;
        for (const line of lines) {
          if (line.length > 0) {
            const firstItemTop = line[0].rect.top;
            // Check if this span's top is within tolerance of the line's top
            if (Math.abs(item.rect.top - firstItemTop) <= lineTolerance) {
              line.push(item);
              foundLine = true;
              break;
            }
          }
        }
        
        // If no matching line found, create a new line
        if (!foundLine) {
          lines.push([item]);
        }
      });
      
      // Sort each line by left position (left to right)
      lines.forEach(line => {
        line.sort((a, b) => a.rect.left - b.rect.left);
      });
      
      // Store line and formatting information on each span
      // If a line has mixed formatting, we'll handle selection in the click handler
      lines.forEach((line, lineIndex) => {
        // Check if the entire line has the same formatting
        const firstItemFormatting = line[0].isBold;
        const allSameFormatting = line.every(item => item.isBold === firstItemFormatting);
        
        line.forEach((item) => {
          (item.span as any)._lineIndex = lineIndex;
          (item.span as any)._allLineSpans = line.map(l => l.span); // Store ALL spans in the line
          (item.span as any)._isBold = item.isBold;
          (item.span as any)._lineHasMixedFormatting = !allSameFormatting; // Track if line has mixed formatting
        });
      });
      
      // Track currently editing span globally
      let currentlyEditingSpan: HTMLElement | null = null;
      
      textSpans.forEach((span: any) => {
        const text = span.textContent?.trim();
        if (!text) return;

        // If this span was previously hidden for editing, keep it hidden
        if (span.getAttribute('data-hidden-for-edit') === 'true') {
          span.style.setProperty('display', 'none', 'important');
          span.style.setProperty('visibility', 'hidden', 'important');
          span.style.setProperty('opacity', '0', 'important');
          span.style.setProperty('color', 'transparent', 'important');
          span.style.setProperty('pointer-events', 'none', 'important');
        }

        // Make span clickable but NOT editable initially
        span.contentEditable = 'false';
        span.style.cursor = 'pointer';
        span.style.pointerEvents = 'auto';
        span.title = `Click to edit: ${text}`;
        
        // Store original text (preserve if already exists)
        if (!span._originalText) {
          span._originalText = text;
        }
        
        // Remove existing click handler
        if (span._clickHandler) {
          span.removeEventListener('click', span._clickHandler);
        }
        
        // Handle click to make THIS span's entire LINE editable
        const clickHandler = (e: MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
          
          // Remove editing from previously edited line
          if (currentlyEditingSpan) {
            // Check if it's a div (editable overlay) or a span
            if (currentlyEditingSpan.tagName === 'DIV' && currentlyEditingSpan.parentNode) {
              // It's an editable div overlay - remove it
              currentlyEditingSpan.parentNode.removeChild(currentlyEditingSpan);
              // Find and restore all spans in the previous line
              const allSpans = pageElement.querySelectorAll('span[role="presentation"]');
              allSpans.forEach((s: any) => {
                if (s._editableDiv === currentlyEditingSpan) {
                  // Restore all spans in this line
                  if (s._lineSpans) {
                    s._lineSpans.forEach((lineSpan: any) => {
                      lineSpan.style.color = '';
                      lineSpan.style.opacity = '';
                      lineSpan.style.pointerEvents = '';
                      lineSpan.style.display = '';
                      lineSpan.style.visibility = '';
                      lineSpan.style.position = '';
                      lineSpan.style.left = '';
                      lineSpan.removeAttribute('data-hidden-for-edit');
                      delete lineSpan._editableDiv;
                    });
                  }
                }
              });
            }
          }
          
          // Get all spans in the same line as the clicked span
          const allLineSpans = ((span as any)._allLineSpans as HTMLElement[]) || [span];
          const lineHasMixedFormatting = (span as any)._lineHasMixedFormatting || false;
          
          // Determine which spans to select based on formatting
          let lineSpans: HTMLElement[];
          
          if (lineHasMixedFormatting) {
            // Line has mixed formatting - only select spans with same formatting as clicked span
            const clickedIsBold = (span as any)._isBold !== undefined ? (span as any)._isBold : isBold(span);
            lineSpans = allLineSpans.filter((s: any) => {
              const spanIsBold = s._isBold !== undefined ? s._isBold : isBold(s);
              return spanIsBold === clickedIsBold;
            });
            
            // If no spans match (shouldn't happen), fall back to the clicked span
            if (lineSpans.length === 0) {
              lineSpans = [span];
            }
            
            console.log('DEBUG: Mixed formatting line - clicked:', clickedIsBold ? 'bold' : 'normal');
            console.log('DEBUG: Selected spans (same formatting):', lineSpans.length);
          } else {
            // Line has uniform formatting - select all spans in the line
            lineSpans = allLineSpans;
            console.log('DEBUG: Uniform formatting line - selected all spans:', lineSpans.length);
          }
          
          // Get the original text color from the first span
          let originalColor = getComputedStyle(span).color || '#000000';
          if (originalColor === 'transparent' || originalColor === 'rgba(0, 0, 0, 0)' || originalColor.includes('rgba(0, 0, 0, 0)')) {
            originalColor = '#000000';
          }
          
          // Combine text content from all spans in the line
          // Normalize spacing: join with single space, then normalize punctuation spacing
          const lineText = lineSpans.map(s => s.textContent?.trim() || '').join(' ').trim();
          
          // Normalize text for better matching: remove ALL spaces and normalize
          // This handles cases where PDF has "4+" but frontend extracts as "4 +"
          const normalizeText = (text: string): string => {
            // Remove ALL spaces first
            let normalized = text.replace(/\s+/g, '');
            // This ensures "4 + Years" becomes "4+Years" which matches "4+Years" from PDF
            return normalized;
          };
          
          const normalizedLineText = normalizeText(lineText);
          
          console.log('DEBUG: Original line text:', lineText);
          console.log('DEBUG: Normalized line text:', normalizedLineText);
          
          // Calculate the bounding box for the entire line
          const pageRect = pageElement.getBoundingClientRect();
          let minLeft = Infinity;
          let maxRight = -Infinity;
          let minTop = Infinity;
          let maxBottom = -Infinity;
          let maxHeight = 0;
          
          lineSpans.forEach((lineSpan) => {
            const rect = lineSpan.getBoundingClientRect();
            minLeft = Math.min(minLeft, rect.left);
            maxRight = Math.max(maxRight, rect.right);
            minTop = Math.min(minTop, rect.top);
            maxBottom = Math.max(maxBottom, rect.bottom);
            maxHeight = Math.max(maxHeight, rect.height);
          });
          
          // Hide all spans in the line
          lineSpans.forEach((lineSpan) => {
            lineSpan.setAttribute('data-hidden-for-edit', 'true');
            lineSpan.style.setProperty('display', 'none', 'important');
            lineSpan.style.setProperty('visibility', 'hidden', 'important');
            lineSpan.style.setProperty('opacity', '0', 'important');
            lineSpan.style.setProperty('color', 'transparent', 'important');
            lineSpan.style.setProperty('pointer-events', 'none', 'important');
            lineSpan.style.setProperty('position', 'absolute', 'important');
            lineSpan.style.setProperty('left', '-9999px', 'important');
          });
          
          // Create a new editable div covering the entire line
          const editableDiv = document.createElement('div');
          editableDiv.contentEditable = 'true';
          editableDiv.textContent = lineText;
          editableDiv.style.position = 'absolute';
          editableDiv.style.left = `${minLeft - pageRect.left}px`;
          editableDiv.style.top = `${minTop - pageRect.top}px`;
          editableDiv.style.width = `${maxRight - minLeft}px`;
          editableDiv.style.minHeight = `${maxHeight}px`;
          editableDiv.style.border = '2px solid #F9593A';
          editableDiv.style.borderRadius = '2px';
          editableDiv.style.padding = '1px 2px';
          editableDiv.style.backgroundColor = '#FFFFFF';
          editableDiv.style.color = originalColor;
          editableDiv.style.opacity = '1';
          editableDiv.style.visibility = 'visible';
          editableDiv.style.outline = 'none';
          editableDiv.style.display = 'block';
          editableDiv.style.zIndex = '9999';
          editableDiv.style.fontSize = getComputedStyle(span).fontSize;
          editableDiv.style.fontFamily = getComputedStyle(span).fontFamily;
          editableDiv.style.lineHeight = getComputedStyle(span).lineHeight;
          editableDiv.style.textShadow = 'none';
          editableDiv.style.filter = 'none';
          editableDiv.style.boxSizing = 'border-box';
          editableDiv.style.whiteSpace = 'pre-wrap'; // Preserve spaces and allow wrapping
          editableDiv.style.wordWrap = 'break-word';
          
          // Store reference to editable div on all spans in the line
          lineSpans.forEach((lineSpan) => {
            (lineSpan as any)._editableDiv = editableDiv;
            (lineSpan as any)._lineSpans = lineSpans; // Store line spans for restoration
            (lineSpan as any)._originalLineText = lineText; // Store ORIGINAL text (with spaces) for matching
            (lineSpan as any)._normalizedLineText = normalizedLineText; // Store normalized text for comparison
          });
          
          // Append to page element (which should be positioned relative)
          pageElement.style.position = 'relative';
          pageElement.appendChild(editableDiv);
          
          // Update currentlyEditingSpan to the div
          currentlyEditingSpan = editableDiv as any;
          
          // Focus and select
          setTimeout(() => {
            editableDiv.focus();
            const range = document.createRange();
            range.selectNodeContents(editableDiv);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
          }, 10);
          
          // Handle blur to save changes
          editableDiv.onblur = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            const newText = target.textContent?.trim() || '';
            const originalLineText = (span as any)._originalLineText || lineText;
            
            // Keep the editable div visible WITH border - don't remove it
            target.contentEditable = 'false'; // Make it non-editable for now
            
            // IMPORTANT: Keep all original spans in the line completely hidden
            lineSpans.forEach((lineSpan) => {
              lineSpan.setAttribute('data-hidden-for-edit', 'true');
              lineSpan.style.setProperty('display', 'none', 'important');
              lineSpan.style.setProperty('visibility', 'hidden', 'important');
              lineSpan.style.setProperty('opacity', '0', 'important');
              lineSpan.style.setProperty('color', 'transparent', 'important');
              lineSpan.style.setProperty('pointer-events', 'none', 'important');
              lineSpan.style.setProperty('position', 'absolute', 'important');
              lineSpan.style.setProperty('left', '-9999px', 'important');
            });
            
            // Update the replacement if text changed
            if (newText && newText !== originalLineText) {
              // Update editable div text to match
              target.textContent = newText;
              
              // Create replacement for the entire line
              // Use the editable div's position (which is correctly positioned over the text)
              const editableDivRect = target.getBoundingClientRect();
              const pageRect = pageElement.getBoundingClientRect();
              
              // Calculate position relative to page element
              const x = editableDivRect.left - pageRect.left;
              const y = editableDivRect.top - pageRect.top;
              
              console.log('DEBUG: Replacement details:', { 
                x, 
                y, 
                editableDivRect, 
                pageRect,
                oldText_ORIGINAL: originalLineText,
                oldText_NORMALIZED: normalizedLineText,
                newText: newText,
                oldTextLength: originalLineText.length,
                normalizedLength: normalizedLineText.length
              });
              
              // Use ORIGINAL text (with spaces) for the replacement
              // The backend will normalize it for matching
              // Get page dimensions for accurate coordinate conversion
              const pageWidth = pageRect.width;
              const pageHeight = pageRect.height;
              
              const replacement: Replacement = {
                oldText: originalLineText, // Original text with spaces
                newText: newText,
                pageNum: currentPage,
                x: x,
                y: y,
                pageWidth: pageWidth, // Send page dimensions for accurate conversion
                pageHeight: pageHeight,
                fontSize: parseFloat(getComputedStyle(lineSpans[0]).fontSize) || 12,
                fontName: getComputedStyle(lineSpans[0]).fontFamily || 'helv',
                color: getComputedStyle(lineSpans[0]).color || '#000000',
              };
              
              console.log('DEBUG: Creating replacement:', {
                oldText_ORIGINAL: originalLineText,
                oldText_NORMALIZED: normalizeText(originalLineText),
                newText: newText
              });
              
              setReplacements(prev => [...prev, replacement]);
              showSuccess('Replacement queued. Click "Apply All Replacements" to process.');
            } else {
              // No change or empty - restore original text
              target.textContent = originalLineText;
            }
            
            // Make editable div clickable again to re-edit
            target.style.cursor = 'pointer';
            target.onclick = () => {
              // Re-enable editing (border is already visible, just make it editable)
              target.contentEditable = 'true';
              target.style.cursor = 'text';
              target.focus();
              const range = document.createRange();
              range.selectNodeContents(target);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
              
              // Ensure all original spans in the line stay hidden
              lineSpans.forEach((lineSpan) => {
                lineSpan.style.setProperty('display', 'none', 'important');
                lineSpan.style.setProperty('visibility', 'hidden', 'important');
                lineSpan.style.setProperty('opacity', '0', 'important');
                lineSpan.style.setProperty('color', 'transparent', 'important');
                lineSpan.style.setProperty('pointer-events', 'none', 'important');
              });
              
              // Re-attach blur handler
              target.onblur = editableDiv.onblur;
            };
            
            currentlyEditingSpan = null;
          };
          
          // Handle Enter key
          editableDiv.onkeydown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              editableDiv.blur();
            }
            if (e.key === 'Escape') {
              editableDiv.textContent = span._originalText || text; // Restore original
              editableDiv.blur();
            }
          };
        };
        
        // Store handler reference for cleanup
        span._clickHandler = clickHandler;
        span.addEventListener('click', clickHandler);
      });
    };

    // Setup handlers after a delay to ensure text layer is rendered
    const timeoutId = setTimeout(setupClickHandlers, 300);
    
    // Also listen for render events
    const handleRender = () => {
      setTimeout(setupClickHandlers, 100);
    };
    window.addEventListener('pdf-page-rendered', handleRender);

      // Cleanup function
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('pdf-page-rendered', handleRender);
        if (pageRef.current) {
          const textSpans = pageRef.current.querySelectorAll('span[role="presentation"]');
          textSpans.forEach((span: any) => {
            span.style.cursor = 'default';
            span.style.pointerEvents = 'auto';
            span.contentEditable = 'false';
            span.style.border = '';
            span.style.borderRadius = '';
            span.style.padding = '';
            span.style.backgroundColor = '';
            span.title = '';
            span.onblur = null;
            span.onkeydown = null;
            if (span._clickHandler) {
              span.removeEventListener('click', span._clickHandler);
              delete span._clickHandler;
            }
            delete span._originalText;
          });
        }
      };
  }, [isReplaceMode, currentPage, scale]);

  // Update editable input position on scroll/resize
  useEffect(() => {
    if (!editingItem || !editableInputRef.current || !containerRef.current || !pageRef.current) return;

    const updatePosition = () => {
      if (!editableInputRef.current || !containerRef.current || !pageRef.current) return;
      
      const clickedSpan = (editingItem as any).spanElement as HTMLElement;
      
      if (clickedSpan && clickedSpan.getBoundingClientRect) {
        try {
          const spanRect = clickedSpan.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          const left = spanRect.left - containerRect.left + containerRef.current.scrollLeft;
          const top = spanRect.top - containerRect.top + containerRef.current.scrollTop;
          
          editableInputRef.current.style.left = `${left}px`;
          editableInputRef.current.style.top = `${top}px`;
        } catch (e) {
          // Span might be removed, ignore
        }
      }
    };

    const container = containerRef.current;
    container.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    
    // Update immediately
    updatePosition();

    return () => {
      container.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [editingItem]);

  const handleReplace = () => {
    const itemToReplace = selectedTextItem || (selectedLine ? {
      text: selectedLine.text,
      x: selectedLine.minX,
      y: selectedLine.y,
      width: selectedLine.maxX - selectedLine.minX,
      height: selectedLine.items[0]?.height || 12,
      pageNum: selectedLine.pageNum,
      fontSize: selectedLine.fontSize,
      fontName: selectedLine.fontName,
      color: selectedLine.color,
    } : null);

    if (!itemToReplace || !replacementText.trim()) {
      showError('Please enter replacement text.');
      return;
    }

    // Create replacement for the selected text item
    const replacement: Replacement = {
      oldText: itemToReplace.text,
      newText: replacementText,
      pageNum: itemToReplace.pageNum,
      x: itemToReplace.x,
      y: itemToReplace.y,
      fontSize: itemToReplace.fontSize,
      fontName: itemToReplace.fontName,
      color: itemToReplace.color,
    };

    setReplacements([...replacements, replacement]);
    setSelectedTextItem(null);
    setSelectedLine(null);
    setReplacementText('');
    showSuccess('Text replacement queued. Click "Apply All Replacements" to process.');
  };

  const handleApplyReplacements = async () => {
    if (!selectedFile || replacements.length === 0) {
      showError('No replacements to apply.');
      return;
    }

    const toastId = showLoading('Applying text replacements...');
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
      await applyReplacements();
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'Text replacements applied successfully! Download started.');
        setReplacements([]);
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while applying replacements. Please try again.');
      console.error('Replace error:', error);
    }
  };

  const applyReplacements = async () => {
    if (!selectedFile) return;

    // Use server-side PyMuPDF with proper redaction (more reliable and precise)
    try {
      console.log('DEBUG: ========== APPLYING REPLACEMENTS ==========');
      console.log('DEBUG: Total replacements:', replacements.length);
      replacements.forEach((r, idx) => {
        console.log(`DEBUG: Replacement ${idx + 1}:`, {
          oldText_ORIGINAL: r.oldText,
          oldTextLength: r.oldText?.length,
          newText: r.newText,
          pageNum: r.pageNum,
          x: r.x,
          y: r.y
        });
      });
      console.log('DEBUG: ===========================================');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('replacements', JSON.stringify(replacements));

      const response = await fetch('/api/pdf-replace-text-server', {
        method: 'POST',
        body: formData,
      });

      console.log('DEBUG: Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('DEBUG: Error response:', errorData);
        throw new Error(errorData.error || 'Text replacement failed');
      }

      const contentType = response.headers.get('Content-Type');
      if (contentType && !contentType.includes('application/pdf')) {
        const errorText = await response.text();
        throw new Error(`Invalid response: ${errorText.substring(0, 200)}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Text replacement failed: Received empty file');
      }

      const arrayBuffer = await blob.slice(0, 4).arrayBuffer();
      const header = new Uint8Array(arrayBuffer);
      const headerStr = String.fromCharCode(...header);
      if (headerStr !== '%PDF') {
        const errorText = await blob.text();
        throw new Error(`Text replacement failed. Output is not a valid PDF: ${errorText.substring(0, 200)}`);
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = selectedFile.name.replace(/\.pdf$/i, '') + '_text_replaced.pdf';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error applying replacements:', error);
      throw error;
    }
  };

  const removeReplacement = (index: number) => {
    setReplacements(replacements.filter((_, i) => i !== index));
  };

  return (
    <section className="py-2">
      <div className="w-full mx-auto px-2">
        <div className="w-full mx-auto">
          {!selectedFile ? (
            <>
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

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>How it works:</strong> Upload a PDF, then click on any text in the viewer to select and replace it with your choice.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* PDF Viewer */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-6">
                <div className="p-4 border-b border-[var(--color-border-gray)] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => {
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setIsReplaceMode(!isReplaceMode)}
                      className={`px-4 py-2 rounded font-medium transition-colors ${
                        isReplaceMode
                          ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
                          : 'bg-gray-100 text-[var(--color-text-dark)] hover:bg-gray-200'
                      }`}
                    >
                      {isReplaceMode ? '✓ Replace Text Mode' : 'Replace Text'}
                    </button>
                    <label className="text-sm text-[var(--color-text-muted)]">Zoom:</label>
                    <select
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="border border-[var(--color-border-gray)] rounded px-2 py-1 text-sm"
                    >
                      <option value="1">100%</option>
                      <option value="1.5">150%</option>
                      <option value="2">200%</option>
                      <option value="2.5">250%</option>
                      <option value="3">300%</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPdfUrl(null);
                      setTextItems([]);
                      setReplacements([]);
                      setSelectedTextItem(null);
                      setSelectedLine(null);
                      setIsReplaceMode(false);
                      setCurrentPage(1);
                      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
                    }}
                    className="text-[var(--color-danger)] hover:bg-red-50 p-2 rounded"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
                <div ref={containerRef} className="p-4 overflow-auto flex justify-center bg-gray-50 relative" style={{ minHeight: '1400px', height: 'calc(100vh - 120px)', width: '100%' }}>
                  {pdfUrl && (
                    <ReactPdfDocument
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={<div className="text-center p-8">Loading PDF...</div>}
                      error={<div className="text-center p-8 text-red-500">Failed to load PDF</div>}
                    >
                      <div ref={pageRef} className="relative" style={{ position: 'relative' }}>
                        <ReactPdfPage
                          pageNumber={currentPage}
                          scale={scale}
                          renderTextLayer={true}
                          renderAnnotationLayer={false}
                          onRenderSuccess={() => {
                            // Force re-trigger the click handler setup
                            if (isReplaceMode) {
                              // Use a custom event to trigger the effect
                              window.dispatchEvent(new Event('pdf-page-rendered'));
                            }
                          }}
                          className="border border-gray-300 shadow-md"
                        />
                        {/* Free text layer for inline editing (like PDFSimpli) */}
                        {editingItem && pageRef.current && containerRef.current && (() => {
                          // Use the stored span element for 100% accurate positioning
                          const clickedSpan = (editingItem as any).spanElement as HTMLElement;
                          
                          let left = 0;
                          let top = 0;
                          
                          // If we have the clicked span, use its exact viewport position
                          if (clickedSpan && clickedSpan.getBoundingClientRect) {
                            try {
                              const spanRect = clickedSpan.getBoundingClientRect();
                              const containerRect = containerRef.current.getBoundingClientRect();
                              // Position relative to container, accounting for scroll
                              left = spanRect.left - containerRect.left + containerRef.current.scrollLeft;
                              top = spanRect.top - containerRect.top + containerRef.current.scrollTop;
                            } catch (e) {
                              // Fallback if span is no longer in DOM
                              const pageRect = pageRef.current!.getBoundingClientRect();
                              const containerRect = containerRef.current.getBoundingClientRect();
                              const offsetX = pageRect.left - containerRect.left + containerRef.current.scrollLeft;
                              const offsetY = pageRect.top - containerRect.top + containerRef.current.scrollTop;
                              left = offsetX + editingItem.x;
                              top = offsetY + editingItem.y;
                            }
                          } else {
                            // Fallback: use stored coordinates
                            const pageRect = pageRef.current!.getBoundingClientRect();
                            const containerRect = containerRef.current.getBoundingClientRect();
                            const offsetX = pageRect.left - containerRect.left + containerRef.current.scrollLeft;
                            const offsetY = pageRect.top - containerRect.top + containerRef.current.scrollTop;
                            left = offsetX + editingItem.x;
                            top = offsetY + editingItem.y;
                          }
                          
                          return (
                            <div
                              ref={editableInputRef}
                              contentEditable
                              suppressContentEditableWarning
                              style={{
                                position: 'absolute',
                                left: `${left}px`,
                                top: `${top}px`,
                                minWidth: `${Math.max(editingItem.width, 50)}px`,
                                minHeight: `${editingItem.height}px`,
                                fontSize: `${editingItem.fontSize}px`,
                                fontFamily: editingItem.fontName || 'Arial',
                                color: '#000000', // Always use black for visibility
                                border: '2px solid #F9593A',
                                borderRadius: '2px',
                                padding: '2px 4px',
                                backgroundColor: '#FFFFFF', // White background for visibility
                                outline: 'none',
                                overflow: 'visible',
                                overflowWrap: 'break-word',
                                whiteSpace: 'nowrap',
                                zIndex: 9999, // Very high z-index to ensure it's on top
                                display: 'inline-block',
                                boxSizing: 'border-box',
                                pointerEvents: 'auto',
                                cursor: 'text',
                                lineHeight: `${editingItem.height}px`,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)', // Add shadow for visibility
                              }}
                              onBlur={(e) => {
                                const newText = e.currentTarget.textContent?.trim() || '';
                                if (newText && newText !== editingItem.text) {
                                  const replacement: Replacement = {
                                    oldText: editingItem.text,
                                    newText: newText,
                                    pageNum: editingItem.pageNum,
                                    x: editingItem.x,
                                    y: editingItem.y,
                                    fontSize: editingItem.fontSize,
                                    fontName: editingItem.fontName,
                                    color: editingItem.color,
                                  };
                                  setReplacements(prev => [...prev, replacement]);
                                  showSuccess('Replacement queued. Click "Apply All Replacements" to process.');
                                }
                                setEditingItem(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  editableInputRef.current?.blur();
                                }
                                if (e.key === 'Escape') {
                                  setEditingItem(null);
                                }
                              }}
                            >
                              {editingItem.text}
                            </div>
                          );
                        })()}
                      </div>
                    </ReactPdfDocument>
                  )}
                </div>
                <div className="px-4 pb-4">
                  <p className="text-xs text-[var(--color-text-muted)] text-center">
                    {isReplaceMode ? (
                      <>💡 <strong>Tip:</strong> Click on any text element (highlighted with orange borders) to select and replace it</>
                    ) : (
                      <>💡 <strong>Tip:</strong> Click "Replace Text" button above to enable text replacement mode</>
                    )}
                  </p>
                </div>
              </div>


              {/* Replacements List */}
              {replacements.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-6 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[var(--color-text-dark)] flex items-center gap-2">
                      <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs">Step 2</span>
                      Queued Replacements ({replacements.length})
                    </h3>
                    <button
                      onClick={handleApplyReplacements}
                      disabled={isProcessing}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      ✓ Apply All Replacements
                    </button>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mb-3">
                    Review your replacements below. Click "Apply All Replacements" when ready to process and download the modified PDF.
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {replacements.map((replacement, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded border border-[var(--color-border-gray)]">
                        <div className="flex-1">
                          <span className="text-sm text-[var(--color-text-muted)]">Page {replacement.pageNum}: </span>
                          <span className="text-sm line-through text-red-600">"{replacement.oldText}"</span>
                          <span className="text-sm mx-2">→</span>
                          <span className="text-sm text-green-600">"{replacement.newText}"</span>
                        </div>
                        <button
                          onClick={() => removeReplacement(index)}
                          className="text-[var(--color-danger)] hover:bg-red-50 p-1 rounded"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : !selectedTextItem && !selectedLine && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-2">📝 How to replace text:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Click the "Replace Text" button above to enable replacement mode</li>
                      <li>Click on any text element in the PDF (highlighted with orange borders)</li>
                      <li>Enter the replacement text in the dialog that appears</li>
                      <li>Click "Add to Queue" to queue the replacement</li>
                      <li>Repeat for more replacements, then click "Apply All Replacements"</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {isProcessing && (
                <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--color-text-dark)]">
                      Applying replacements...
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
            </>
          )}
        </div>
      </div>
    </section>
  );
}
