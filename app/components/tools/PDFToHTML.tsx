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

// Dynamically import pdfjs-dist to avoid SSR issues
let pdfjsLib: any = null;
const loadPdfJs = async () => {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    const version = pdfjsLib.version || '5.4.394';
    
    // Set worker source - use jsdelivr CDN which is more reliable
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
};

export default function PDFToHTML() {
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

    const toastId = showLoading('Converting PDF to HTML...');
    setIsProcessing(true);
    setProgress(0);

    // Simulate progress while actually converting
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Stop at 90% until conversion completes
        }
        return prev + 10;
      });
    }, 200);

    try {
      // Actually convert the PDF
      await convertPDFToHTML();
      
      // Complete the progress
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'PDF converted to HTML successfully! Download started.');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while converting the PDF. Please try again.');
      console.error('Conversion error:', error);
    }
  };

  const convertPDFToHTML = async () => {
    if (!selectedFile) return;

    try {
      // Try server-side conversion first (exact layout preservation)
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch('/api/pdf-to-html-server', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          // Server-side conversion successful
          const htmlContent = await response.text();
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = selectedFile.name.replace('.pdf', '') + '.html';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          return; // Success, exit early
        } else {
          // Server-side conversion failed, fall back to client-side
          const errorData = await response.json().catch(() => ({}));
          console.warn('Server-side conversion failed, using client-side fallback:', errorData.error);
        }
      } catch (serverError) {
        // Server-side conversion not available, use client-side
        console.warn('Server-side conversion not available, using client-side fallback:', serverError);
      }

      // Fallback to client-side conversion (original implementation)
      // Load pdfjs-dist with error handling for worker
      let pdfjs;
      try {
        pdfjs = await loadPdfJs();
      } catch (workerError) {
        console.warn('Worker loading failed, trying alternative:', workerError);
        // Try with CDN fallback
        pdfjs = await import('pdfjs-dist');
        const version = pdfjs.version || '5.4.394';
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      }
      
      // Read the PDF file
      const arrayBuffer = await selectedFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;
      
      // Extract text with formatting from each page
      interface TextItem {
        text: string;
        bold?: boolean;
        italic?: boolean;
        fontSize?: number;
        fontName?: string;
        color?: string;
        y: number;
        x: number;
        width?: number;
        height?: number;
        pageNum: number;
      }

      const allTextItems: TextItem[] = [];
      
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Extract text items with their styling and position
        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim()) {
            const transform = item.transform || [1, 0, 0, 1, 0, 0];
            const x = transform[4];
            const y = viewport.height - transform[5]; // Invert Y coordinate
            
            // Extract font information
            const fontName = item.fontName || '';
            const fontSize = item.height || item.width || 12;
            const width = item.width || fontSize * item.str.length;
            const height = item.height || fontSize;
            const isBold = fontName.toLowerCase().includes('bold') || 
                          fontName.toLowerCase().includes('black') ||
                          fontName.toLowerCase().includes('demibold') ||
                          fontName.toLowerCase().includes('semibold');
            const isItalic = fontName.toLowerCase().includes('italic') || 
                           fontName.toLowerCase().includes('oblique');
            
            // Extract color
            let color = undefined;
            if (item.color && item.color.length >= 3) {
              const r = Math.round(item.color[0] * 255);
              const g = Math.round(item.color[1] * 255);
              const b = Math.round(item.color[2] * 255);
              color = `rgb(${r}, ${g}, ${b})`;
            }
            
            allTextItems.push({
              text: item.str,
              bold: isBold,
              italic: isItalic,
              fontSize: fontSize,
              fontName: fontName,
              color: color,
              y: y,
              x: x,
              width: width,
              height: height,
              pageNum: i,
            });
          }
        });
      }
      
      // Build HTML structure
      let htmlContent = '';
      
      if (allTextItems.length > 0) {
        // Sort by page, then Y position (top to bottom), then by X position (left to right)
        allTextItems.sort((a, b) => {
          if (a.pageNum !== b.pageNum) {
            return a.pageNum - b.pageNum;
          }
          const yDiff = Math.abs(a.y - b.y);
          if (yDiff > 5) {
            return b.y - a.y; // Higher Y first (top to bottom)
          }
          return a.x - b.x; // Left to right
        });
        
        // Calculate statistics for better detection
        const fontSizes = allTextItems.map(item => item.fontSize || 12).filter(fs => fs > 0);
        const avgFontSize = fontSizes.length > 0 
          ? fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length 
          : 12;
        const maxFontSize = Math.max(...fontSizes, 12);
        
        // Group items into lines
        const lines: { items: TextItem[], y: number, avgFontSize: number, isBold: boolean }[] = [];
        let currentLine: TextItem[] = [];
        let lastY = allTextItems[0]?.y || 0;
        
        allTextItems.forEach((item) => {
          const yTolerance = Math.max(3, (item.fontSize || 12) * 0.2);
          if (Math.abs(item.y - lastY) > yTolerance) {
            if (currentLine.length > 0) {
              currentLine.sort((a, b) => a.x - b.x);
              const lineAvgFontSize = currentLine.reduce((sum, it) => sum + (it.fontSize || 12), 0) / currentLine.length;
              const lineIsBold = currentLine.some(it => it.bold);
              lines.push({ 
                items: currentLine, 
                y: lastY,
                avgFontSize: lineAvgFontSize,
                isBold: lineIsBold
              });
            }
            currentLine = [item];
            lastY = item.y;
          } else {
            currentLine.push(item);
          }
        });
        if (currentLine.length > 0) {
          currentLine.sort((a, b) => a.x - b.x);
          const lineAvgFontSize = currentLine.reduce((sum, it) => sum + (it.fontSize || 12), 0) / currentLine.length;
          const lineIsBold = currentLine.some(it => it.bold);
          lines.push({ 
            items: currentLine, 
            y: lastY,
            avgFontSize: lineAvgFontSize,
            isBold: lineIsBold
          });
        }
        
        // Calculate average line height
        let totalLineHeight = 0;
        for (let i = 1; i < lines.length; i++) {
          totalLineHeight += Math.abs(lines[i].y - lines[i - 1].y);
        }
        const avgLineHeight = lines.length > 1 ? totalLineHeight / (lines.length - 1) : 20;
        
        // Detect list patterns
        const listPatterns = {
          bullet: /^[•·▪▫○●■□▲△►▸-]\s/,
          number: /^\d+[\.\)]\s/,
          letter: /^[a-zA-Z][\.\)]\s/,
          roman: /^[ivxlcdmIVXLCDM]+[\.\)]\s/,
        };
        
        // Build HTML content
        htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${selectedFile.name.replace('.pdf', '')}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1 { font-size: 2em; margin-top: 1em; margin-bottom: 0.5em; }
        h2 { font-size: 1.5em; margin-top: 1em; margin-bottom: 0.5em; }
        h3 { font-size: 1.2em; margin-top: 0.8em; margin-bottom: 0.4em; }
        p { margin: 0.5em 0; }
        ul, ol { margin: 0.5em 0; padding-left: 2em; }
        li { margin: 0.3em 0; }
        .page-break { page-break-after: always; margin: 2em 0; border-top: 1px dashed #ccc; }
    </style>
</head>
<body>
    <h1>${selectedFile.name.replace('.pdf', '')}</h1>
`;

        let currentPage = 1;
        let inList = false;
        let listType: 'ul' | 'ol' = 'ul';
        
        lines.forEach((lineData, lineIndex) => {
          const line = lineData.items;
          const lineText = line.map(item => item.text).join(' ').trim();
          
          // Skip empty lines
          if (!lineText) {
            return;
          }
          
          // Check for page break
          if (line[0]?.pageNum && line[0].pageNum > currentPage) {
            if (inList) {
              htmlContent += `</${listType}>\n`;
              inList = false;
            }
            htmlContent += `    <div class="page-break"></div>\n`;
            currentPage = line[0].pageNum;
          }
          
          // Detect heading
          const isHeading = 
            lineData.avgFontSize > avgFontSize * 1.3 ||
            (lineData.isBold && lineData.avgFontSize > avgFontSize * 1.1) ||
            (lineData.avgFontSize > maxFontSize * 0.8 && lineData.isBold);
          
          // Determine heading level
          let headingTag = '';
          if (isHeading) {
            if (lineData.avgFontSize > maxFontSize * 0.9) {
              headingTag = 'h1';
            } else if (lineData.avgFontSize > avgFontSize * 1.5) {
              headingTag = 'h2';
            } else {
              headingTag = 'h3';
            }
          }
          
          // Detect list items
          const isListItem = 
            listPatterns.bullet.test(lineText) ||
            listPatterns.number.test(lineText) ||
            listPatterns.letter.test(lineText) ||
            listPatterns.roman.test(lineText);
          
          // Determine list type
          if (isListItem) {
            const newListType = listPatterns.number.test(lineText) || 
                               listPatterns.letter.test(lineText) || 
                               listPatterns.roman.test(lineText) ? 'ol' : 'ul';
            
            if (!inList || listType !== newListType) {
              if (inList) {
                htmlContent += `</${listType}>\n`;
              }
              htmlContent += `    <${newListType}>\n`;
              inList = true;
              listType = newListType;
            }
          } else {
            if (inList) {
              htmlContent += `</${listType}>\n`;
              inList = false;
            }
          }
          
          // Build text with formatting
          let formattedText = '';
          let currentBold = false;
          let currentItalic = false;
          let currentColor: string | undefined = undefined;
          let currentFontSize = 12;
          let currentSpan = '';
          
          line.forEach((item, itemIndex) => {
            const needsNewSpan = 
              item.bold !== currentBold ||
              item.italic !== currentItalic ||
              item.color !== currentColor ||
              Math.abs((item.fontSize || 12) - currentFontSize) > 1;
            
            if (needsNewSpan && currentSpan) {
              // Close previous span
              if (currentBold) formattedText += '</strong>';
              if (currentItalic) formattedText += '</em>';
              if (currentColor || currentFontSize !== 12) formattedText += '</span>';
              currentSpan = '';
            }
            
            // Update current formatting
            currentBold = item.bold || false;
            currentItalic = item.italic || false;
            currentColor = item.color;
            currentFontSize = item.fontSize || 12;
            
            // Open new span if needed
            if (needsNewSpan) {
              const styles: string[] = [];
              if (currentColor) styles.push(`color: ${currentColor}`);
              if (currentFontSize !== 12) styles.push(`font-size: ${currentFontSize}px`);
              
              if (styles.length > 0) {
                formattedText += `<span style="${styles.join('; ')}">`;
                currentSpan = '</span>';
              }
              if (currentBold) formattedText += '<strong>';
              if (currentItalic) formattedText += '<em>';
            }
            
            // Add text with spacing
            if (itemIndex > 0 && !formattedText.endsWith(' ') && !item.text.startsWith(' ')) {
              const prevItem = line[itemIndex - 1];
              const prevItemEndX = prevItem.x + (prevItem.width || (prevItem.fontSize || 12) * prevItem.text.length);
              const xGap = item.x - prevItemEndX;
              const fontSizeThreshold = (currentFontSize * 0.3);
              if (xGap > fontSizeThreshold) {
                formattedText += ' ';
              }
            }
            formattedText += escapeHtml(item.text);
          });
          
          // Close any open tags
          if (currentBold) formattedText += '</strong>';
          if (currentItalic) formattedText += '</em>';
          if (currentSpan) formattedText += currentSpan;
          
          // Add to HTML
          if (isHeading && headingTag) {
            htmlContent += `    <${headingTag}>${formattedText}</${headingTag}>\n`;
          } else if (isListItem) {
            htmlContent += `        <li>${formattedText}</li>\n`;
          } else {
            // Check if this should be a new paragraph
            let addParagraph = true;
            if (lineIndex > 0) {
              const lineGap = Math.abs(lineData.y - lines[lineIndex - 1].y);
              if (lineGap <= avgLineHeight * 1.2) {
                // Small gap, might be continuation
                addParagraph = false;
              }
            }
            
            if (addParagraph) {
              htmlContent += `    <p>${formattedText}</p>\n`;
            } else {
              htmlContent += `    ${formattedText}\n`;
            }
          }
        });
        
        // Close any open list
        if (inList) {
          htmlContent += `</${listType}>\n`;
        }
        
        // Try to extract metadata
        try {
          const metadata = await pdf.getMetadata();
          if (metadata.info) {
            htmlContent += `    <hr>\n    <footer>\n        <h3>Document Information</h3>\n`;
            if (metadata.info.Title) {
              htmlContent += `        <p><strong>Title:</strong> ${escapeHtml(metadata.info.Title)}</p>\n`;
            }
            if (metadata.info.Author) {
              htmlContent += `        <p><strong>Author:</strong> ${escapeHtml(metadata.info.Author)}</p>\n`;
            }
            if (metadata.info.Subject) {
              htmlContent += `        <p><strong>Subject:</strong> ${escapeHtml(metadata.info.Subject)}</p>\n`;
            }
            htmlContent += `    </footer>\n`;
          }
        } catch (e) {
          console.log('Could not extract PDF metadata');
        }
        
        htmlContent += `</body>\n</html>`;
      } else {
        // No text extracted
        htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${selectedFile.name.replace('.pdf', '')}</title>
</head>
<body>
    <h1>${selectedFile.name.replace('.pdf', '')}</h1>
    <p>This PDF contains ${pageCount} page${pageCount > 1 ? 's' : ''}, but no extractable text was found.</p>
    <p><em>The PDF may contain only images or scanned content. For scanned PDFs, use OCR (Optical Character Recognition) to extract text.</em></p>
</body>
</html>`;
      }
      
      // Create and download HTML file
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace('.pdf', '') + '.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error converting PDF to HTML:', error);
      throw error;
    }
  };

  // Helper function to escape HTML
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
                Convert PDF to HTML
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
                  Converting PDF to HTML...
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
              <strong>Note:</strong> Server-side conversion uses PyMuPDF to preserve EXACT layout with CSS absolute positioning.
              <br />• <strong>Server-side:</strong> Exact layout preservation (requires Python 3.8+ and PyMuPDF)
              <br />• <strong>Client-side fallback:</strong> Semantic HTML with headings, paragraphs, and lists
              <br />
              <br />For best results, install: <code className="bg-blue-100 px-1 rounded">pip install PyMuPDF</code>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

