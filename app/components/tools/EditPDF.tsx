'use client';

import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faFilePdf,
  faTrash,
  faEdit,
  faDownload,
} from '@fortawesome/free-solid-svg-icons';
import { validateFileSize, showError, showSuccess, showLoading, updateToSuccess, updateToError, formatFileSize } from '../../lib/utils';

export default function EditPDF() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedHtml, setEditedHtml] = useState<string>('');
  const htmlContainerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef<boolean>(false);

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

  // Convert PDF to HTML when file is selected
  useEffect(() => {
    const convertPDFToHTML = async () => {
      if (!selectedFile) return;

      const toastId = showLoading('Converting PDF to HTML for editing...');
      setIsProcessing(true);
      setProgress(0);

      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const response = await fetch('/api/pdf-to-html-server', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to convert PDF to HTML');
        }

        const html = await response.text();
        setHtmlContent(html);
        setEditedHtml(html);
        setIsEditing(true);
        setProgress(100);
        setIsProcessing(false);
        updateToSuccess(toastId, 'PDF converted to HTML. You can now edit the text.');
      } catch (error: any) {
        setIsProcessing(false);
        setProgress(0);
        updateToError(toastId, error.message || 'Failed to convert PDF to HTML');
        console.error('Conversion error:', error);
      }
    };

    if (selectedFile && !htmlContent) {
      convertPDFToHTML();
    }
  }, [selectedFile, htmlContent]);

  // Make text elements editable when HTML is loaded (only once)
  useEffect(() => {
    if (isEditing && htmlContainerRef.current && htmlContent && !isInitializedRef.current) {
      // Extract body content if HTML has full structure, otherwise use as-is
      let contentToSet = htmlContent;
      const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        contentToSet = bodyMatch[1];
        // Also extract and inject styles from head
        const styleMatch = htmlContent.match(/<style[^>]*>([\s\S]*)<\/style>/i);
        if (styleMatch) {
          // Inject styles into the container
          const styleElement = document.createElement('style');
          styleElement.textContent = styleMatch[1];
          document.head.appendChild(styleElement);
        }
      }
      
      // Set HTML content only once - preserve all styles from the HTML
      htmlContainerRef.current.innerHTML = contentToSet;
      isInitializedRef.current = true;

      // Wait for DOM to update
      setTimeout(() => {
        if (!htmlContainerRef.current) return;

        // Make all text elements editable
        // First try to find elements with .text-element class (from PyMuPDF or post-processed spire-pdf)
        let textElements = htmlContainerRef.current.querySelectorAll('.text-element');
        
        // If no .text-element found, look for ALL elements with text content
        // This is a fallback for HTML that doesn't have the class added (like raw spire-pdf output)
        if (textElements.length === 0) {
          // Get all elements in the container
          const allElements = htmlContainerRef.current.querySelectorAll('*');
          
          // Filter to elements that have text content
          const elementsWithText = Array.from(allElements).filter((el) => {
            // Skip script, style, and other non-content elements
            if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'META' || el.tagName === 'LINK') {
              return false;
            }
            
            const text = el.textContent?.trim() || '';
            // Include elements that have text
            // Don't exclude based on children - let parent and child both be editable if they have text
            return text.length > 0;
          });
          
          // Add text-element class to make them editable
          elementsWithText.forEach((el) => {
            (el as HTMLElement).classList.add('text-element');
          });
          
          // Re-query with the new class
          textElements = htmlContainerRef.current.querySelectorAll('.text-element');
        }
        
        // Log for debugging
        console.log(`Found ${textElements.length} text elements to make editable`);
        
        // Make all found text elements editable
        textElements.forEach((element) => {
          const el = element as HTMLElement;
          
          // Skip if already made editable
          if (el.getAttribute('data-editable') === 'true') {
            return;
          }
          
          // Make editable
          el.contentEditable = 'true';
          el.style.cursor = 'text';
          el.style.outline = 'none';
          el.setAttribute('data-editable', 'true');
          
          // Ensure the element is visible and can receive focus
          if (el.style.display === 'none') {
            el.style.display = '';
          }
          
          // Add hover effect
          const handleMouseEnter = () => {
            el.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            el.style.border = '1px dashed rgba(59, 130, 246, 0.5)';
          };
          
          const handleMouseLeave = () => {
            if (document.activeElement !== el) {
              el.style.backgroundColor = 'transparent';
              el.style.border = 'none';
            }
          };

          const handleFocus = () => {
            el.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
            el.style.border = '1px solid rgba(59, 130, 246, 0.7)';
          };

          const handleBlur = () => {
            el.style.backgroundColor = 'transparent';
            el.style.border = 'none';
            // Update editedHtml only on blur to avoid interrupting typing
            if (htmlContainerRef.current) {
              setEditedHtml(htmlContainerRef.current.innerHTML);
            }
          };

          // Use input event with debouncing for real-time updates (but don't reset innerHTML)
          let inputTimeout: NodeJS.Timeout;
          const handleInput = () => {
            // Clear previous timeout
            clearTimeout(inputTimeout);
            // Update editedHtml after a short delay (debounced)
            inputTimeout = setTimeout(() => {
              if (htmlContainerRef.current) {
                // Don't set innerHTML, just update state for tracking
                const currentHtml = htmlContainerRef.current.innerHTML;
                setEditedHtml(currentHtml);
              }
            }, 300);
          };

          el.addEventListener('mouseenter', handleMouseEnter);
          el.addEventListener('mouseleave', handleMouseLeave);
          el.addEventListener('focus', handleFocus);
          el.addEventListener('blur', handleBlur);
          el.addEventListener('input', handleInput);
        });
      }, 100);
    }
  }, [isEditing, htmlContent]);

  const handleSave = async () => {
    if (!selectedFile || !htmlContainerRef.current) {
      showError('Please select a PDF file and edit the content.');
      return;
    }

    const toastId = showLoading('Converting edited HTML back to PDF...');
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
      // Get the edited HTML
      const finalHtml = htmlContainerRef.current.innerHTML;

      // Convert HTML back to PDF using client-side approach (same as HTMLToPDF)
      const [{ default: jsPDF }, html2canvas] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);

      // Create a temporary container for rendering (same approach as HTMLToPDF)
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.top = '0';
      tempContainer.style.left = '0';
      tempContainer.style.width = '100%';
      tempContainer.style.minHeight = 'auto';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.zIndex = '-1';
      tempContainer.style.visibility = 'visible';
      tempContainer.style.opacity = '1';
      tempContainer.style.display = 'block';
      tempContainer.style.overflow = 'visible';
      tempContainer.style.pointerEvents = 'none';
      tempContainer.style.transform = 'translateZ(0)';
      tempContainer.style.boxSizing = 'border-box';
      
      document.body.appendChild(tempContainer);
      
      // Ensure HTML has proper structure if needed
      let processedHtml = finalHtml.trim();
      if (!processedHtml.toLowerCase().includes('<html')) {
        processedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${processedHtml}</body></html>`;
      }
      
      tempContainer.innerHTML = processedHtml;

      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Wait for images to load
      const images = tempContainer.querySelectorAll('img');
      if (images.length > 0) {
        await new Promise(resolve => {
          let loaded = 0;
          const total = images.length;
          if (total === 0) {
            setTimeout(resolve, 500);
            return;
          }
          
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

      // Get all page divs
      const pages = tempContainer.querySelectorAll('.page');
      
      // Declare pdf variable outside if/else blocks
      let pdf: any;
      
      if (pages.length === 0) {
        // If no .page divs, use the entire container
        const containerWidth = Math.max(tempContainer.scrollWidth, tempContainer.offsetWidth, 612);
        const containerHeight = Math.max(tempContainer.scrollHeight, tempContainer.offsetHeight, 792);

        // Convert entire container to canvas
        const canvas = await html2canvas.default(tempContainer, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: containerWidth,
          height: containerHeight,
          windowWidth: containerWidth,
          windowHeight: containerHeight
        });

        // Convert px to mm: 1px ≈ 0.264583mm at 96dpi
        const pageWidthMm = 210; // A4 width
        const pageHeightMm = 297; // A4 height
        const imgWidthMm = pageWidthMm - 20; // With margins
        const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
        const usablePageHeight = pageHeightMm - 20;

        pdf = new jsPDF('p', 'mm', [pageWidthMm, pageHeightMm]);
        const totalPages = Math.ceil(imgHeightMm / usablePageHeight);

        for (let i = 0; i < totalPages; i++) {
          if (i > 0) {
            pdf.addPage();
          }

          const sourceY = (canvas.height / totalPages) * i;
          const sourceHeight = canvas.height / totalPages;
          
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          const pageCtx = pageCanvas.getContext('2d');
          
          if (pageCtx) {
            pageCtx.drawImage(
              canvas,
              0, sourceY, canvas.width, sourceHeight,
              0, 0, canvas.width, sourceHeight
            );
            
            const pageImgHeight = (sourceHeight * imgWidthMm) / canvas.width;
            const actualPageImgHeight = Math.min(pageImgHeight, usablePageHeight);
            
            pdf.addImage(
              pageCanvas.toDataURL('image/jpeg', 0.95),
              'JPEG',
              10, 10, imgWidthMm, actualPageImgHeight
            );
          }
        }
      } else {
        // Process each page separately
        const pdfMargin = 0;
        const pageWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm

        pdf = new jsPDF('p', 'mm', [pageWidth, pageHeight]);

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i] as HTMLElement;
          
          if (i > 0) {
            pdf.addPage();
          }

          // Get page dimensions
          const pageWidthPx = page.clientWidth || page.offsetWidth || 612;
          const pageHeightPx = page.clientHeight || page.offsetHeight || 792;

          // Capture page as canvas with better settings
          const canvas = await html2canvas.default(page, {
            scale: 2.5,
            useCORS: true,
            logging: false,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: pageWidthPx,
            height: pageHeightPx,
            windowWidth: pageWidthPx,
            windowHeight: pageHeightPx
          });

          // Convert to mm and add to PDF
          const imgWidthMm = pageWidth - (pdfMargin * 2);
          const imgHeightMm = (canvas.height * imgWidthMm) / canvas.width;
          const usablePageHeight = pageHeight - (pdfMargin * 2);
          const actualImgHeight = Math.min(imgHeightMm, usablePageHeight);

          pdf.addImage(
            canvas.toDataURL('image/jpeg', 0.95),
            'JPEG',
            pdfMargin,
            pdfMargin,
            imgWidthMm,
            actualImgHeight
          );
        }
      }

      // Clean up
      document.body.removeChild(tempContainer);

      // Download PDF
      const pdfBlob = pdf.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace('.pdf', '') + '_edited.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'PDF edited successfully! Download started.');
      }, 500);
    } catch (error: any) {
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, error.message || 'Failed to convert HTML to PDF');
      console.error('Save error:', error);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setHtmlContent('');
    setEditedHtml('');
    setIsEditing(false);
    setIsProcessing(false);
    setProgress(0);
    isInitializedRef.current = false;
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Upload Area - Only show if no file selected */}
          {!selectedFile && (
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
          )}

          {/* Selected File Info */}
          {selectedFile && !isEditing && (
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
                    onClick={handleReset}
                    className="text-[var(--color-danger)] hover:bg-red-50 p-2 rounded"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-6 mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--color-text-dark)]">
                  {progress < 50 ? 'Converting PDF to HTML...' : 'Processing...'}
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

          {/* Editable HTML Viewer */}
          {isEditing && htmlContent && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[var(--color-text-dark)] flex items-center gap-2">
                    <FontAwesomeIcon icon={faEdit} className="text-[var(--color-primary)]" />
                    Edit PDF Text
                  </h3>
                  <button
                    onClick={handleReset}
                    className="text-sm text-[var(--color-danger)] hover:bg-red-50 px-3 py-1 rounded"
                  >
                    <FontAwesomeIcon icon={faTrash} className="mr-2" />
                    Reset
                  </button>
                </div>
                <p className="text-sm text-[var(--color-text-muted)] mb-4">
                  Click on any text to edit it directly. The layout will be preserved when you save.
                </p>
                
                {/* HTML Content Container */}
                <div className="border border-[var(--color-border-gray)] rounded-lg overflow-auto bg-gray-50 p-4 max-h-[600px]">
                  <div
                    ref={htmlContainerRef}
                    style={{ 
                      minHeight: '100px',
                      width: '100%',
                      margin: 0,
                      padding: 0
                    }}
                  />
                </div>

                {/* Save Button */}
                <div className="mt-6 text-center">
                  <button
                    onClick={handleSave}
                    disabled={isProcessing}
                    className="bg-[var(--color-primary)] text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    Save as PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>How it works:</strong> Your PDF is converted to HTML with exact layout preservation. 
              Click on any text to edit it directly. When you save, the edited HTML is converted back to PDF 
              while maintaining the original layout and formatting.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
