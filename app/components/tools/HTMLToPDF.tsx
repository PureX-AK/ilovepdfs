'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faFileCode,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { validateFileSize, showError, showSuccess, showLoading, updateToSuccess, updateToError, formatFileSize } from '../../lib/utils';

export default function HTMLToPDF() {
  const [htmlContent, setHtmlContent] = useState('');
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
      (file) => file.type === 'text/html' || file.name.endsWith('.html') || file.name.endsWith('.htm')
    );
    if (files.length > 0 && validateFileSize(files[0])) {
      setSelectedFile(files[0]);
      setHtmlContent(''); // Clear text input when file is selected
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFileSize(file)) {
        setSelectedFile(file);
        setHtmlContent(''); // Clear text input when file is selected
      }
    }
  };

  const handleConvert = async () => {
    if (!htmlContent.trim() && !selectedFile) {
      showError('Please enter HTML content or upload an HTML file.');
      return;
    }

    const toastId = showLoading('Converting HTML to PDF...');
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
      await convertHTMLToPDF();
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'HTML converted to PDF successfully! Download started.');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while converting HTML to PDF. Please try again.');
      console.error('Conversion error:', error);
    }
  };

  const convertHTMLToPDF = async () => {
    try {
      // Get HTML content
      let html = '';
      
      if (selectedFile) {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const text = new TextDecoder('utf-8').decode(arrayBuffer);
        html = text;
      } else if (htmlContent.trim()) {
        html = htmlContent;
      }

      if (!html) {
        throw new Error('No HTML content to convert');
      }

      // Dynamically import jsPDF and html2canvas (browser-only)
      // Ensure we're in browser environment
      if (typeof window === 'undefined') {
        throw new Error('jsPDF and html2canvas require browser environment');
      }

      const [{ default: jsPDF }, html2canvas] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      // Check if HTML already has margins/padding (before creating container)
      const hasExistingMargins = /margin\s*:\s*[^0;]+|padding\s*:\s*[^0;]+/i.test(html);
      const hasBodyStyles = /<body[^>]*style\s*=/i.test(html) || /body\s*\{[^}]*margin|body\s*\{[^}]*padding/i.test(html);
      const shouldAddMargins = !hasExistingMargins && !hasBodyStyles;
      
      // Create a temporary visible container for rendering
      // html2canvas needs the element to be in the DOM and visible
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.top = '0';
      tempContainer.style.left = '0';
      // Container width: reduced to match smaller page size (180mm = ~680px at 96dpi)
      // If HTML has margins, use 680px, otherwise account for PDF margins (176mm = ~665px)
      const containerWidth = shouldAddMargins ? '665px' : '680px'; // Reduced width to match smaller page
      tempContainer.style.width = containerWidth;
      tempContainer.style.minHeight = 'auto';
      tempContainer.style.maxWidth = containerWidth;
      tempContainer.style.padding = '0'; // Will be set based on HTML content
      tempContainer.style.boxSizing = 'border-box'; // Include padding in width
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.zIndex = '-1'; // Behind everything
      tempContainer.style.visibility = 'visible';
      tempContainer.style.opacity = '1';
      tempContainer.style.display = 'block';
      tempContainer.style.overflow = 'visible'; // Important: don't clip content
      tempContainer.style.pointerEvents = 'none';
      // Ensure it's in viewport for html2canvas
      tempContainer.style.transform = 'translateZ(0)'; // Force GPU acceleration
      
      document.body.appendChild(tempContainer);

      try {
        // shouldAddMargins already determined above
        const containerPadding = shouldAddMargins ? '10px' : '0';

        // Ensure HTML has proper structure
        let processedHtml = html.trim();
        if (!processedHtml.toLowerCase().includes('<html')) {
          // Wrap in HTML structure if not present
          if (shouldAddMargins) {
            processedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { margin: 0; padding: 10px; box-sizing: border-box; } * { box-sizing: border-box; }</style></head><body>${processedHtml}</body></html>`;
          } else {
            processedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { margin: 0; box-sizing: border-box; } * { box-sizing: border-box; }</style></head><body>${processedHtml}</body></html>`;
          }
        }

        // Set container padding based on whether HTML has margins
        tempContainer.style.padding = containerPadding;
        
        // Set HTML content in container
        tempContainer.innerHTML = processedHtml;

        // Wait for content to render
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check if container has content
        if (!tempContainer.innerHTML || tempContainer.innerHTML.trim() === '') {
          throw new Error('HTML content is empty or could not be rendered');
        }

        // Wait for images and fonts to load
        const images = tempContainer.querySelectorAll('img');
        if (images.length > 0) {
          await new Promise(resolve => {
            let loaded = 0;
            const total = images.length;
            
            images.forEach((img) => {
              if (img.complete) {
                loaded++;
                if (loaded === total) setTimeout(resolve, 500);
              } else {
                img.onload = () => {
                  loaded++;
                  if (loaded === total) setTimeout(resolve, 500);
                };
                img.onerror = () => {
                  loaded++;
                  if (loaded === total) setTimeout(resolve, 500);
                };
              }
            });
          });
        }

        // Additional wait for fonts and rendering
        await new Promise(resolve => setTimeout(resolve, 300));

        // Wait a bit more for content to fully render
        await new Promise(resolve => setTimeout(resolve, 100));

        // Get actual rendered dimensions
        const minWidth = shouldAddMargins ? 665 : 680; // Use appropriate minimum width
        const containerWidth = Math.max(tempContainer.scrollWidth, tempContainer.offsetWidth, minWidth);
        const containerHeight = Math.max(tempContainer.scrollHeight, tempContainer.offsetHeight);

        // Convert HTML to canvas using html2canvas (higher scale for zoom)
        const canvas = await html2canvas.default(tempContainer, {
          scale: 2.5, // Increased from 2 for better zoom
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: containerWidth,
          height: containerHeight,
          windowWidth: containerWidth,
          windowHeight: containerHeight
        });

        // Get canvas dimensions
        // Use minimal margin if HTML already has margins, otherwise use small margin
        const pdfMargin = shouldAddMargins ? 2 : 0; // No PDF margin if HTML has its own
        // Reduced page dimensions
        const pageWidth = 180; // Reduced from 210mm (A4)
        const pageHeight = 250; // Reduced from 297mm (A4)
        // Image should fill the page width (accounting for left/right margins only)
        const imgWidth = pageWidth - (pdfMargin * 2); // Full width minus left and right margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const usablePageHeight = pageHeight - (pdfMargin * 2); // Height minus top and bottom margins

        // Create PDF with custom dimensions
        const pdf = new jsPDF('p', 'mm', [pageWidth, pageHeight]);
        
        // Calculate how many pages we need
        const totalPages = Math.ceil(imgHeight / usablePageHeight);
        
        // Split canvas into pages
        for (let i = 0; i < totalPages; i++) {
          if (i > 0) {
            pdf.addPage();
          }

          // Calculate the portion of canvas to show on this page
          const sourceY = (canvas.height / totalPages) * i;
          const sourceHeight = canvas.height / totalPages;
          
          // Create a temporary canvas for this page
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          const pageCtx = pageCanvas.getContext('2d');
          
          if (pageCtx) {
            // Draw the portion of the original canvas
            pageCtx.drawImage(
              canvas,
              0, sourceY, canvas.width, sourceHeight, // Source
              0, 0, canvas.width, sourceHeight // Destination
            );
            
            // Calculate dimensions for PDF
            const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;
            
            // Add to PDF with margin (or no margin if HTML has its own)
            // Ensure image height doesn't exceed usable page height to avoid bottom margin
            const actualPageImgHeight = Math.min(pageImgHeight, usablePageHeight);
            
            pdf.addImage(
              pageCanvas.toDataURL('image/jpeg', 0.95),
              'JPEG',
              pdfMargin, // Left margin (right margin is automatic: pageWidth - pdfMargin - imgWidth)
              pdfMargin, // Top margin
              imgWidth, // Width fills from left margin to right margin
              actualPageImgHeight // Height fills from top margin, stops before bottom margin
            );
          }
        }

        // Save PDF
        const filename = selectedFile 
          ? selectedFile.name.replace(/\.(html|htm)$/i, '') + '.pdf'
          : 'html-converted.pdf';
        pdf.save(filename);

      } finally {
        // Always remove the temporary container
        if (tempContainer.parentNode) {
          tempContainer.parentNode.removeChild(tempContainer);
        }
      }

    } catch (error: any) {
      console.error('Error converting HTML to PDF:', error);
      showError(error.message || 'Failed to convert HTML to PDF. Please try again.');
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
                Drop your HTML file here
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
                accept=".html,.htm,text/html"
                className="hidden"
                onChange={handleFileInput}
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-4">
                Supports HTML files up to 25MB
              </p>
            </div>
          </div>

          {/* Or Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-border-gray)]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-[var(--color-text-muted)]">OR</span>
            </div>
          </div>

          {/* HTML Content Input */}
          <div className="bg-white rounded-xl border-2 border-[var(--color-border-gray)] p-6 mb-8">
            <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">
              Paste HTML Content
            </h3>
            <textarea
              value={htmlContent}
              onChange={(e) => {
                setHtmlContent(e.target.value);
                setSelectedFile(null); // Clear file when typing
              }}
              placeholder="<html><body><h1>Your HTML content here</h1></body></html>"
              className="border border-[var(--color-border-gray)] rounded-lg px-4 py-3 text-sm w-full focus:outline-none focus:border-[var(--color-primary)] mb-4 font-mono"
              rows={8}
            />
          </div>

          {/* Selected File */}
          {selectedFile && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FontAwesomeIcon icon={faFileCode} className="text-orange-500" />
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
          {(htmlContent.trim() || selectedFile) && !isProcessing && (
            <div className="text-center">
              <button
                onClick={handleConvert}
                className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Convert HTML to PDF
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
                  Converting HTML to PDF...
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
              <strong>Note:</strong> Uses jsPDF and html2canvas for conversion.
              <br />• Preserves full HTML rendering including CSS styles
              <br />• Supports images, tables, and complex layouts
              <br />• Client-side conversion (no server required)
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
