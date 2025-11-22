'use client';

import { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import mammoth from 'mammoth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faFileWord,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { validateFileSize, showError, showSuccess, showLoading, updateToSuccess, updateToError, formatFileSize } from '../../lib/utils';

export default function WordToPDF() {
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
      (file) => file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                file.type === 'application/msword' ||
                file.name.endsWith('.doc') ||
                file.name.endsWith('.docx')
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
      showError('Please select a Word file to convert.');
      return;
    }

    const toastId = showLoading('Converting Word to PDF...');
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
      await convertWordToPDF();
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'Word document converted to PDF successfully! Download started.');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while converting the file. Please try again.');
      console.error('Conversion error:', error);
    }
  };

  const convertWordToPDF = async () => {
    if (!selectedFile) return;

    try {
      // Try server-side conversion first (better formatting)
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch('/api/word-to-pdf-server', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          // Server-side conversion successful
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = selectedFile.name.replace(/\.(doc|docx)$/i, '') + '.pdf';
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
      // Check if it's a DOCX file (mammoth only supports DOCX, not old DOC format)
      const isDocx = selectedFile.name.toLowerCase().endsWith('.docx') || 
                     selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      
      if (!isDocx) {
        throw new Error('Only DOCX files are supported in client-side mode. Please convert your DOC file to DOCX first, or use server-side conversion.');
      }

      // Read the Word file as array buffer
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      // Convert DOCX to HTML using mammoth
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;
      const messages = result.messages; // Warnings about unsupported features
      
      if (messages.length > 0) {
        console.warn('Conversion warnings:', messages);
      }
      
      // Create a temporary div to parse HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Create PDF document
      const pdfDoc = await PDFDocument.create();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      let page = pdfDoc.addPage([612, 792]); // US Letter size
      const { width, height } = page.getSize();
      const margin = 72; // 1 inch margin
      const maxWidth = width - (margin * 2);
      let y = height - margin;
      const lineHeight = 14;
      const paragraphSpacing = 8;
      
      // Helper function to sanitize text for WinAnsi encoding
      const sanitizeText = (text: string): string => {
        // Replace common Unicode characters and control characters that WinAnsi can't encode
        return text
          .replace(/\t/g, '    ')  // Replace tabs with spaces
          .replace(/\r\n/g, '\n')  // Normalize line endings
          .replace(/\r/g, '\n')     // Normalize line endings
          .replace(/●/g, '•')      // Replace filled circle with bullet
          .replace(/—/g, '--')     // Em dash
          .replace(/–/g, '-')      // En dash
          .replace(/"|"/g, '"')    // Smart double quotes
          .replace(/'|'/g, "'")    // Smart single quotes
          .replace(/…/g, '...')    // Ellipsis
          .replace(/€/g, 'EUR')    // Euro sign
          .replace(/£/g, 'GBP')    // Pound sign
          .replace(/©/g, '(c)')    // Copyright
          .replace(/®/g, '(R)')    // Registered
          .replace(/™/g, '(TM)')   // Trademark
          .replace(/[^\x00-\x7F]/g, '?') // Replace any other non-ASCII with ?
          .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ''); // Remove other control characters
      };
      
      // Helper function to wrap text
      const wrapText = (text: string, maxWidth: number, fontSize: number): string[] => {
        // Sanitize text first
        const sanitized = sanitizeText(text);
        const words = sanitized.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const textWidth = helveticaFont.widthOfTextAtSize(testLine, fontSize);
          
          if (textWidth > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        
        if (currentLine) {
          lines.push(currentLine);
        }
        
        return lines;
      };
      
      // Process all elements in the HTML
      const processElement = (element: Element | Text, parentTag?: string) => {
        if (element.nodeType === Node.TEXT_NODE) {
          // Only process text nodes if parent is not a block element (handled separately)
          if (parentTag && !['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li'].includes(parentTag)) {
            const text = element.textContent || '';
            if (text.trim()) {
              const lines = wrapText(text, maxWidth, 12);
              for (const line of lines) {
                if (y < margin + 50) {
                  page = pdfDoc.addPage([612, 792]);
                  y = height - margin;
                }
                page.drawText(line, {
        x: margin,
        y: y,
                  size: 12,
                  font: helveticaFont,
        color: rgb(0, 0, 0),
      });
                y -= lineHeight;
              }
            }
          }
        } else if (element instanceof HTMLElement) {
          const tagName = element.tagName.toLowerCase();
          
          // Handle headings
          if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || 
              tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
            const fontSize = tagName === 'h1' ? 24 : tagName === 'h2' ? 20 : tagName === 'h3' ? 18 : 16;
            y -= paragraphSpacing * 2; // Extra space before heading
            
            const text = element.textContent || '';
            const lines = wrapText(text, maxWidth, fontSize);
            for (const line of lines) {
              if (y < margin + 50) {
                page = pdfDoc.addPage([612, 792]);
                y = height - margin;
              }
              page.drawText(line, {
        x: margin,
        y: y,
        size: fontSize,
                font: helveticaBoldFont,
                color: rgb(0, 0, 0),
      });
              y -= fontSize + 4;
            }
            y -= paragraphSpacing;
          }
          // Handle paragraphs
          else if (tagName === 'p') {
            y -= paragraphSpacing;
            const text = element.textContent || '';
            if (text.trim()) {
              // Check for bold text within paragraph
              const hasBold = element.querySelector('strong, b') !== null;
              const font = hasBold ? helveticaBoldFont : helveticaFont;
              const lines = wrapText(text, maxWidth, 12);
              
              for (const line of lines) {
                if (y < margin + 50) {
                  page = pdfDoc.addPage([612, 792]);
                  y = height - margin;
                }
                page.drawText(line, {
                  x: margin,
                  y: y,
                  size: 12,
                  font: font,
                  color: rgb(0, 0, 0),
                });
                y -= lineHeight;
              }
            }
            y -= paragraphSpacing;
          }
          // Handle lists
          else if (tagName === 'ul' || tagName === 'ol') {
            y -= paragraphSpacing;
            const listItems = element.querySelectorAll('li');
            listItems.forEach((li, index) => {
              const text = li.textContent || '';
              // Use ASCII bullet character that WinAnsi can encode
              const prefix = tagName === 'ol' ? `${index + 1}. ` : '- ';
              const fullText = prefix + text;
              const lines = wrapText(fullText, maxWidth, 12);
              
              for (const line of lines) {
                if (y < margin + 50) {
                  page = pdfDoc.addPage([612, 792]);
                  y = height - margin;
                }
                page.drawText(line, {
        x: margin,
        y: y,
                  size: 12,
                  font: helveticaFont,
                  color: rgb(0, 0, 0),
      });
                y -= lineHeight;
              }
            });
            y -= paragraphSpacing;
          }
          // Handle line breaks
          else if (tagName === 'br') {
            y -= lineHeight;
          }
          // Handle other elements - process children
          else {
            Array.from(element.childNodes).forEach(child => processElement(child as Element | Text, tagName));
          }
        }
      };
      
      // Process all child nodes
      Array.from(tempDiv.childNodes).forEach(node => processElement(node as Element | Text));
      
      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace(/\.(doc|docx)$/i, '') + '.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error converting Word to PDF:', error);
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
                Drop your Word file here
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
                accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleFileInput}
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-4">
                Supports DOCX files up to 25MB (DOC files not supported)
              </p>
            </div>
          </div>

          {/* Selected File */}
          {selectedFile && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FontAwesomeIcon icon={faFileWord} className="text-blue-500" />
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
                Convert Word to PDF
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
                  Converting Word to PDF...
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
              <strong>Note:</strong> Server-side conversion uses multiple methods for perfect formatting preservation:
              <br />• <strong>Method 1:</strong> docx2pdf (perfect match - requires Word on Windows or LibreOffice)
              <br />• <strong>Method 2:</strong> LibreOffice headless (excellent match - cross-platform)
              <br />• <strong>Method 3:</strong> python-docx + reportlab (fallback with good formatting)
              <br />
              <br />For best results, install: <code className="bg-blue-100 px-1 rounded">pip install docx2pdf</code> or LibreOffice.
              <br />Client-side fallback supports DOCX files only.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

