'use client';

import { useState } from 'react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
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

type ConversionMethod = 'auto' | 'server' | 'client';

export default function PDFToWord() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [conversionMethod, setConversionMethod] = useState<ConversionMethod>('auto');

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

    const methodName = conversionMethod === 'auto' ? 'Auto (Server → Client)' : 
                      conversionMethod === 'server' ? 'Server-side (Python)' : 
                      'Client-side (Browser)';
    const toastId = showLoading(`Converting PDF to Word using ${methodName}...`);
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
      // Actually convert the PDF using selected method
      await convertPDFToWord(conversionMethod);
      
      // Complete the progress
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, `PDF converted to Word successfully using ${methodName}! Download started.`);
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      const errorMsg = conversionMethod === 'server' 
        ? 'Server-side conversion failed. Make sure Python 3.8+ and pdf2docx are installed, or try Client-side method.'
        : conversionMethod === 'client'
        ? 'Client-side conversion failed. Please try again or use Server-side method.'
        : 'An error occurred while converting the PDF. Please try again.';
      updateToError(toastId, errorMsg);
      console.error('Conversion error:', error);
    }
  };

  const convertPDFToWord = async (method: ConversionMethod = 'auto') => {
    if (!selectedFile) return;

    // Handle auto mode - try server first, then fallback to client
    if (method === 'auto') {
      try {
        await convertPDFToWordServer('auto');
        return; // Success
      } catch (serverError) {
        console.warn('Server-side conversion failed, falling back to client-side:', serverError);
        // Fall through to client-side conversion
        await convertPDFToWordClient('auto');
      }
    } else if (method === 'server') {
      // Server-side only
      await convertPDFToWordServer('server');
      return;
    } else {
      // Client-side only
      await convertPDFToWordClient('client');
    }
  };

  const convertPDFToWordServer = async (method: ConversionMethod = 'server') => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    const response = await fetch('/api/pdf-to-word-server', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Server-side conversion failed');
    }

    // Server-side conversion successful
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Add suffix to indicate method used for quality comparison
    const suffix = method === 'auto' ? '_auto_server' : '_server';
    link.download = selectedFile.name.replace('.pdf', '') + suffix + '.docx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const convertPDFToWordClient = async (method: ConversionMethod = 'client') => {
    if (!selectedFile) return;

    try {
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
      
      // Create paragraphs for the Word document
      const paragraphs: Paragraph[] = [];
      
      // Add title
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Converted from PDF: ${selectedFile.name}`,
              bold: true,
              size: 28,
            }),
          ],
        })
      );
      
      paragraphs.push(new Paragraph({ text: '' })); // Empty line
      
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
              color = `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
      
      // Group text items into paragraphs based on Y position
      if (allTextItems.length > 0) {
        // Sort by page, then Y position (top to bottom), then by X position (left to right)
        allTextItems.sort((a, b) => {
          if (a.pageNum !== b.pageNum) {
            return a.pageNum - b.pageNum;
          }
          const yDiff = Math.abs(a.y - b.y);
          if (yDiff > 5) { // Different line if Y difference > 5px
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
        const minFontSize = Math.min(...fontSizes, 12);
        
        // Group items into lines (similar Y positions)
        const lines: { items: TextItem[], y: number, avgFontSize: number, isBold: boolean, leftMargin: number }[] = [];
        let currentLine: TextItem[] = [];
        let lastY = allTextItems[0]?.y || 0;
        
        allTextItems.forEach((item) => {
          const yTolerance = Math.max(3, (item.fontSize || 12) * 0.2); // Dynamic tolerance based on font size
          if (Math.abs(item.y - lastY) > yTolerance) {
            // New line
            if (currentLine.length > 0) {
              currentLine.sort((a, b) => a.x - b.x); // Sort by X within line
              const lineAvgFontSize = currentLine.reduce((sum, it) => sum + (it.fontSize || 12), 0) / currentLine.length;
              const lineIsBold = currentLine.some(it => it.bold);
              const lineLeftMargin = Math.min(...currentLine.map(it => it.x));
              lines.push({ 
                items: currentLine, 
                y: lastY,
                avgFontSize: lineAvgFontSize,
                isBold: lineIsBold,
                leftMargin: lineLeftMargin
              });
            }
            currentLine = [item];
            lastY = item.y;
          } else {
            // Same line
            currentLine.push(item);
          }
        });
        if (currentLine.length > 0) {
          currentLine.sort((a, b) => a.x - b.x);
          const lineAvgFontSize = currentLine.reduce((sum, it) => sum + (it.fontSize || 12), 0) / currentLine.length;
          const lineIsBold = currentLine.some(it => it.bold);
          const lineLeftMargin = Math.min(...currentLine.map(it => it.x));
          lines.push({ 
            items: currentLine, 
            y: lastY,
            avgFontSize: lineAvgFontSize,
            isBold: lineIsBold,
            leftMargin: lineLeftMargin
          });
        }
        
        // Calculate average line height for paragraph detection
        let totalLineHeight = 0;
        for (let i = 1; i < lines.length; i++) {
          totalLineHeight += Math.abs(lines[i].y - lines[i - 1].y);
        }
        const avgLineHeight = lines.length > 1 ? totalLineHeight / (lines.length - 1) : 20;
        
        // Detect list patterns (bullets, numbers)
        const listPatterns = {
          bullet: /^[•·▪▫○●■□▲△►▸-]\s/,
          number: /^\d+[\.\)]\s/,
          letter: /^[a-zA-Z][\.\)]\s/,
          roman: /^[ivxlcdmIVXLCDM]+[\.\)]\s/,
        };
        
        // Convert lines to paragraphs with formatting and structure detection
        lines.forEach((lineData, lineIndex) => {
          const line = lineData.items;
          const lineText = line.map(item => item.text).join(' ').trim();
          
          // Skip empty lines
          if (!lineText) {
            return;
          }
          
          // Detect if this is a heading
          const isHeading = 
            lineData.avgFontSize > avgFontSize * 1.3 || // 30% larger than average
            (lineData.isBold && lineData.avgFontSize > avgFontSize * 1.1) || // Bold and larger
            (lineData.avgFontSize > maxFontSize * 0.8 && lineData.isBold); // Near max size and bold
          
          // Determine heading level
          let headingLevel: HeadingLevel | undefined = undefined;
          if (isHeading) {
            if (lineData.avgFontSize > maxFontSize * 0.9) {
              headingLevel = HeadingLevel.HEADING_1;
            } else if (lineData.avgFontSize > avgFontSize * 1.5) {
              headingLevel = HeadingLevel.HEADING_2;
            } else {
              headingLevel = HeadingLevel.HEADING_3;
            }
          }
          
          // Detect list items
          const isListItem = 
            listPatterns.bullet.test(lineText) ||
            listPatterns.number.test(lineText) ||
            listPatterns.letter.test(lineText) ||
            listPatterns.roman.test(lineText);
          
          // Check if previous line was also a list item (for list continuation)
          const prevLine = lineIndex > 0 ? lines[lineIndex - 1] : null;
          const prevIsListItem = prevLine && (
            listPatterns.bullet.test(prevLine.items.map(it => it.text).join(' ').trim()) ||
            listPatterns.number.test(prevLine.items.map(it => it.text).join(' ').trim()) ||
            listPatterns.letter.test(prevLine.items.map(it => it.text).join(' ').trim()) ||
            listPatterns.roman.test(prevLine.items.map(it => it.text).join(' ').trim())
          );
          
          // Build text runs with formatting
          const textRuns: TextRun[] = [];
          let currentRun = '';
          let currentBold = false;
          let currentItalic = false;
          let currentColor: string | undefined = undefined;
          let currentFontSize = 12;
          
          line.forEach((item, itemIndex) => {
            const needsNewRun = 
              item.bold !== currentBold ||
              item.italic !== currentItalic ||
              item.color !== currentColor ||
              Math.abs((item.fontSize || 12) - currentFontSize) > 1;
            
            if (needsNewRun && currentRun) {
              // Save current run
              const runProps: any = { text: currentRun };
              if (currentBold) runProps.bold = true;
              if (currentItalic) runProps.italics = true;
              if (currentColor) runProps.color = currentColor;
              if (currentFontSize !== 12) runProps.size = Math.round(currentFontSize * 2); // Convert to half-points
              
              textRuns.push(new TextRun(runProps));
              currentRun = '';
            }
            
            // Update current formatting
            currentBold = item.bold || false;
            currentItalic = item.italic || false;
            currentColor = item.color;
            currentFontSize = item.fontSize || 12;
            
            // Add text (with space if not first item and previous item didn't end with space)
            if (itemIndex > 0 && !currentRun.endsWith(' ') && !item.text.startsWith(' ')) {
              // Check if items are close together (likely same word)
              const prevItem = line[itemIndex - 1];
              const prevItemEndX = prevItem.x + (prevItem.width || (prevItem.fontSize || 12) * prevItem.text.length);
              const xGap = item.x - prevItemEndX;
              const fontSizeThreshold = (currentFontSize * 0.3);
              if (xGap > fontSizeThreshold) {
                currentRun += ' ';
              }
            }
            currentRun += item.text;
          });
          
          // Add final run
          if (currentRun) {
            const runProps: any = { text: currentRun };
            if (currentBold) runProps.bold = true;
            if (currentItalic) runProps.italics = true;
            if (currentColor) runProps.color = currentColor;
            if (currentFontSize !== 12) runProps.size = Math.round(currentFontSize * 2);
            
            textRuns.push(new TextRun(runProps));
          }
          
          // Create paragraph with appropriate structure
          if (textRuns.length > 0) {
            // Calculate spacing based on gap from previous line
            let spacing = 120; // Default spacing
            let addEmptyLine = false;
            
            if (lineIndex > 0) {
              const lineGap = Math.abs(lineData.y - lines[lineIndex - 1].y);
              if (lineGap > avgLineHeight * 1.5) {
                // Large gap indicates new paragraph
                spacing = 240;
                if (lineGap > avgLineHeight * 2.5) {
                  addEmptyLine = true;
                }
              }
            }
            
            // Add empty line before if needed
            if (addEmptyLine && !isHeading) {
              paragraphs.push(new Paragraph({ text: '' }));
            }
            
            // Create paragraph based on detected structure
            if (isHeading && headingLevel) {
              // Heading paragraph (preserve formatting)
              paragraphs.push(
                new Paragraph({
                  children: textRuns,
                  heading: headingLevel,
                  spacing: { after: 240, before: lineIndex === 0 ? 0 : 120 },
                })
              );
            } else if (isListItem) {
              // List item paragraph
              paragraphs.push(
                new Paragraph({
                  children: textRuns,
                  bullet: { level: 0 },
                  spacing: { after: 60 },
                })
              );
            } else {
              // Regular paragraph
              paragraphs.push(
                new Paragraph({
                  children: textRuns,
                  spacing: { after: spacing },
                })
              );
            }
          }
        });
      } else {
        // If no text was extracted, add a note
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `This PDF contains ${pageCount} page${pageCount > 1 ? 's' : ''}, but no extractable text was found. `,
              }),
              new TextRun({
                text: 'The PDF may contain only images or scanned content. For scanned PDFs, use OCR (Optical Character Recognition) to extract text.',
                italics: true,
              }),
            ],
          })
        );
      }
      
      // Try to extract metadata
      try {
        const metadata = await pdf.getMetadata();
        if (metadata.info) {
          paragraphs.push(new Paragraph({ text: '' })); // Empty line
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Document Information:',
                  bold: true,
                }),
              ],
            })
          );
          
          if (metadata.info.Title) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `Title: ${metadata.info.Title}` }),
                ],
              })
            );
          }
          
          if (metadata.info.Author) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `Author: ${metadata.info.Author}` }),
                ],
              })
            );
          }
          
          if (metadata.info.Subject) {
            paragraphs.push(
              new Paragraph({
                children: [
                  new TextRun({ text: `Subject: ${metadata.info.Subject}` }),
                ],
              })
            );
          }
        }
      } catch (e) {
        // Metadata extraction failed, continue without it
        console.log('Could not extract PDF metadata');
      }
      
      // Create the Word document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: paragraphs,
          },
        ],
      });
      
      // Generate the DOCX file
      const blob = await Packer.toBlob(doc);
      
      // Download the file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Add suffix to indicate method used for quality comparison
      const suffix = method === 'auto' ? '_auto_client' : '_client';
      link.download = selectedFile.name.replace('.pdf', '') + suffix + '.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error converting PDF to Word (client-side):', error);
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

          {/* Conversion Method Selection */}
          {selectedFile && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">
                  Choose Conversion Method
                </h3>
                <p className="text-sm text-[var(--color-text-muted)] mb-4">
                  Select a conversion technique to compare quality. Each method has different strengths.
                </p>
                
                <div className="space-y-3">
                  {/* Auto Option */}
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 hover:border-[var(--color-primary)]"
                    style={{ 
                      borderColor: conversionMethod === 'auto' ? 'var(--color-primary)' : 'var(--color-border-gray)',
                      backgroundColor: conversionMethod === 'auto' ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                    }}>
                    <input
                      type="radio"
                      name="conversionMethod"
                      value="auto"
                      checked={conversionMethod === 'auto'}
                      onChange={(e) => setConversionMethod(e.target.value as ConversionMethod)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-[var(--color-text-dark)]">Auto (Recommended)</div>
                      <div className="text-sm text-[var(--color-text-muted)] mt-1">
                        Tries server-side first (best quality), automatically falls back to client-side if unavailable.
                        <span className="block mt-1 text-xs text-blue-600">✓ Best formatting preservation</span>
                      </div>
                    </div>
                  </label>

                  {/* Server-side Option */}
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 hover:border-[var(--color-primary)]"
                    style={{ 
                      borderColor: conversionMethod === 'server' ? 'var(--color-primary)' : 'var(--color-border-gray)',
                      backgroundColor: conversionMethod === 'server' ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                    }}>
                    <input
                      type="radio"
                      name="conversionMethod"
                      value="server"
                      checked={conversionMethod === 'server'}
                      onChange={(e) => setConversionMethod(e.target.value as ConversionMethod)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-[var(--color-text-dark)]">Server-side (Python + pdf2docx)</div>
                      <div className="text-sm text-[var(--color-text-muted)] mt-1">
                        Uses Python backend with pdf2docx library for superior formatting, tables, and layout preservation.
                        <span className="block mt-1 text-xs text-green-600">✓ Best for complex layouts, tables, and formatting</span>
                        <span className="block mt-1 text-xs text-green-600">✓ No Microsoft Word required - generates DOCX programmatically</span>
                        <span className="block mt-1 text-xs text-orange-600">⚠ Requires Python 3.8+ and pdf2docx installed</span>
                      </div>
                    </div>
                  </label>

                  {/* Client-side Option */}
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50 hover:border-[var(--color-primary)]"
                    style={{ 
                      borderColor: conversionMethod === 'client' ? 'var(--color-primary)' : 'var(--color-border-gray)',
                      backgroundColor: conversionMethod === 'client' ? 'rgba(59, 130, 246, 0.05)' : 'transparent'
                    }}>
                    <input
                      type="radio"
                      name="conversionMethod"
                      value="client"
                      checked={conversionMethod === 'client'}
                      onChange={(e) => setConversionMethod(e.target.value as ConversionMethod)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-[var(--color-text-dark)]">Client-side (Browser + pdfjs-dist)</div>
                      <div className="text-sm text-[var(--color-text-muted)] mt-1">
                        Runs entirely in your browser using pdfjs-dist and docx library. No server dependencies, works offline.
                        <span className="block mt-1 text-xs text-green-600">✓ No server setup required, works offline</span>
                        <span className="block mt-1 text-xs text-green-600">✓ No Microsoft Word required - generates DOCX programmatically</span>
                        <span className="block mt-1 text-xs text-orange-600">⚠ Basic formatting, may lose complex layouts</span>
                      </div>
                    </div>
                  </label>
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
                Convert PDF to Word
                {conversionMethod !== 'auto' && (
                  <span className="ml-2 text-sm font-normal opacity-90">
                    ({conversionMethod === 'server' ? 'Server-side' : 'Client-side'})
                  </span>
                )}
              </button>
              <p className="text-sm text-[var(--color-text-muted)] mt-4">
                {conversionMethod === 'server' && 'Processing with Python backend (may take longer)'}
                {conversionMethod === 'client' && 'Processing in browser (typically faster)'}
                {conversionMethod === 'auto' && 'Processing typically takes a few seconds'}
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--color-text-dark)]">
                  Converting PDF to Word using {conversionMethod === 'auto' ? 'Auto' : conversionMethod === 'server' ? 'Server-side' : 'Client-side'}...
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
              <strong>Quality Comparison Tips:</strong> Try converting the same PDF with different methods to compare results. 
              Server-side typically preserves tables, formatting, and layout better. Client-side is faster and works without server setup. 
              <strong className="block mt-2">Note:</strong> Neither technique requires Microsoft Word to be installed - both generate DOCX files programmatically.
              For PDFs with only images (scanned documents), use the OCR PDF tool first to extract text.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

