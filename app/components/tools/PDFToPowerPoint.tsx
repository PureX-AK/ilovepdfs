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

// Dynamically import pdfjs-dist and pptxgenjs
let pdfjsLib: any = null;
let pptxLib: any = null;

const loadPdfJs = async () => {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    const version = pdfjsLib.version || '5.4.394';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
};

const loadPptx = async () => {
  if (!pptxLib) {
    pptxLib = await import('pptxgenjs');
  }
  return pptxLib;
};

export default function PDFToPowerPoint() {
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

    const toastId = showLoading('Converting PDF to PowerPoint...');
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
      await convertPDFToPowerPoint();
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'PDF converted to PowerPoint successfully! Download started.');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while converting the PDF. Please try again.');
      console.error('Conversion error:', error);
    }
  };

  const convertPDFToPowerPoint = async () => {
    if (!selectedFile) return;

    try {
      // Try server-side conversion first (better formatting)
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch('/api/pdf-to-pptx-server', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          // Server-side conversion successful
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = selectedFile.name.replace('.pdf', '') + '.pptx';
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
      // Load libraries
      let pdfjs;
      try {
        pdfjs = await loadPdfJs();
      } catch (workerError) {
        pdfjs = await import('pdfjs-dist');
        const version = pdfjs.version || '5.4.394';
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
      }
      
      const PptxGenJS = await loadPptx();
      const pptx = new PptxGenJS.default();
      
      // Read the PDF file
      const arrayBuffer = await selectedFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const pageCount = pdf.numPages;
      
      // Set presentation properties
      pptx.author = 'pagalPDF';
      pptx.company = 'pagalPDF';
      pptx.title = selectedFile.name.replace('.pdf', '');
      
      // Convert each PDF page to a slide
      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Create a new slide
        const slide = pptx.addSlide();
        
        // Extract and organize text by position
        interface TextItem {
          text: string;
          bold?: boolean;
          italic?: boolean;
          fontSize?: number;
          color?: string;
          y: number;
          x: number;
        }
        
        const textItems: TextItem[] = [];
        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim()) {
            const transform = item.transform || [1, 0, 0, 1, 0, 0];
            const x = transform[4];
            const y = viewport.height - transform[5];
            
            const fontName = item.fontName || '';
            const fontSize = item.height || item.width || 12;
            const isBold = fontName.toLowerCase().includes('bold') || fontName.toLowerCase().includes('black');
            const isItalic = fontName.toLowerCase().includes('italic') || fontName.toLowerCase().includes('oblique');
            
            let color = undefined;
            if (item.color && item.color.length >= 3) {
              const r = Math.round(item.color[0] * 255);
              const g = Math.round(item.color[1] * 255);
              const b = Math.round(item.color[2] * 255);
              color = `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            }
            
            textItems.push({
              text: item.str,
              bold: isBold,
              italic: isItalic,
              fontSize: fontSize,
              color: color,
              y: y,
              x: x,
            });
          }
        });
        
        // Sort text items by position
        textItems.sort((a, b) => {
          const yDiff = Math.abs(a.y - b.y);
          if (yDiff > 5) {
            return b.y - a.y;
          }
          return a.x - b.x;
        });
        
        // Group into lines and add to slide
        if (textItems.length > 0) {
          const lines: TextItem[][] = [];
          let currentLine: TextItem[] = [];
          let lastY = textItems[0]?.y || 0;
          
          textItems.forEach((item) => {
            if (Math.abs(item.y - lastY) > 5) {
              if (currentLine.length > 0) {
                lines.push(currentLine);
              }
              currentLine = [item];
              lastY = item.y;
            } else {
              currentLine.push(item);
            }
          });
          if (currentLine.length > 0) {
            lines.push(currentLine);
          }
          
          // Add text to slide
          let yPos = 0.5; // Start position in inches
          const lineHeight = 0.3; // Height between lines
          
          lines.forEach((line) => {
            const lineText = line.map(item => item.text).join(' ');
            const firstItem = line[0];
            
            const textOptions: any = {
              x: 0.5,
              y: yPos,
              w: 9,
              h: lineHeight,
              fontSize: Math.min(Math.max(Math.round((firstItem.fontSize || 12) / 2), 10), 44),
            };
            
            if (firstItem.bold) textOptions.bold = true;
            if (firstItem.italic) textOptions.italic = true;
            if (firstItem.color) textOptions.color = firstItem.color;
            
            slide.addText(lineText, textOptions);
            yPos += lineHeight + 0.1;
          });
        } else {
          // No text found, add placeholder
          slide.addText(`Page ${i}`, {
            x: 0.5,
            y: 2,
            w: 9,
            h: 1,
            fontSize: 24,
            bold: true,
          });
        }
      }
      
      // Generate and download the PowerPoint file
      const blob = await pptx.write({ outputType: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace('.pdf', '') + '.pptx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error converting PDF to PowerPoint:', error);
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
                Convert PDF to PowerPoint
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
                  Converting PDF to PowerPoint...
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
              <strong>Note:</strong> Each PDF page will be converted to a PowerPoint slide. 
              Text formatting (bold, italic, colors) will be preserved. 
              Complex layouts, images, and tables may require manual adjustment.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

