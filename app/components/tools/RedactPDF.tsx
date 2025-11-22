'use client';

import { useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faFilePdf,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { validateFileSize, showError, showSuccess, showLoading, updateToSuccess, updateToError, formatFileSize } from '../../lib/utils';

// Dynamically import pdfjs-dist
let pdfjsLib: any = null;
const loadPdfJs = async () => {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    const version = pdfjsLib.version || '5.4.394';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
};

export default function RedactPDF() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [textToRedact, setTextToRedact] = useState('');
  const [redactMode, setRedactMode] = useState<'text' | 'all'>('text');

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

  const handleRedact = async () => {
    if (!selectedFile) {
      showError('Please select a PDF file to redact.');
      return;
    }

    if (redactMode === 'text' && !textToRedact.trim()) {
      showError('Please enter text to redact.');
      return;
    }

    const toastId = showLoading('Redacting PDF...');
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
      await redactPDF();
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'PDF redacted successfully! Download started.');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while redacting the PDF. Please try again.');
      console.error('Redact error:', error);
    }
  };

  const redactPDF = async () => {
    if (!selectedFile) return;

    try {
      // Load PDF with pdf-lib
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();
      
      if (redactMode === 'text' && textToRedact.trim()) {
        // Load PDF with pdfjs to find text positions
        const pdfjs = await loadPdfJs();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        
        // Redact text on each page
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const pdfjsPage = await pdfDoc.getPage(i + 1);
          const textContent = await pdfjsPage.getTextContent();
          const viewport = pdfjsPage.getViewport({ scale: 1.0 });
          const { width, height } = page.getSize();
          
          // Find all occurrences of the text to redact
          textContent.items.forEach((item: any) => {
            if (item.str && item.str.toLowerCase().includes(textToRedact.toLowerCase())) {
              const transform = item.transform || [1, 0, 0, 1, 0, 0];
              const x = transform[4];
              const y = viewport.height - transform[5]; // Invert Y
              
              // Draw black rectangle over the text
              const textWidth = item.width || 100;
              const textHeight = item.height || 12;
              
              page.drawRectangle({
                x: x,
                y: height - y - textHeight,
                width: textWidth,
                height: textHeight,
                color: rgb(0, 0, 0),
              });
            }
          });
        }
      } else if (redactMode === 'all') {
        // Redact all text by drawing black rectangles over text areas
        const pdfjs = await loadPdfJs();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const pdfjsPage = await pdfDoc.getPage(i + 1);
          const textContent = await pdfjsPage.getTextContent();
          const viewport = pdfjsPage.getViewport({ scale: 1.0 });
          const { height } = page.getSize();
          
          // Redact all text items
          textContent.items.forEach((item: any) => {
            if (item.str && item.str.trim()) {
              const transform = item.transform || [1, 0, 0, 1, 0, 0];
              const x = transform[4];
              const y = viewport.height - transform[5];
              
              const textWidth = item.width || 100;
              const textHeight = item.height || 12;
              
              page.drawRectangle({
                x: x,
                y: height - y - textHeight,
                width: textWidth,
                height: textHeight,
                color: rgb(0, 0, 0),
              });
            }
          });
        }
      }
      
      // Save redacted PDF
      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace('.pdf', '') + '_redacted.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error redacting PDF:', error);
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

          {/* Redaction Options */}
          {selectedFile && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">Redaction Options</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                      Redaction mode
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="redactMode"
                          value="text"
                          checked={redactMode === 'text'}
                          onChange={(e) => setRedactMode(e.target.value as 'text')}
                          className="text-[var(--color-primary)]"
                        />
                        <span className="text-sm text-[var(--color-text-dark)]">Redact specific text</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="redactMode"
                          value="all"
                          checked={redactMode === 'all'}
                          onChange={(e) => setRedactMode(e.target.value as 'all')}
                          className="text-[var(--color-primary)]"
                        />
                        <span className="text-sm text-[var(--color-text-dark)]">Redact all text</span>
                      </label>
                    </div>
                  </div>
                  {redactMode === 'text' && (
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        Text to redact
                      </label>
                      <input
                        type="text"
                        value={textToRedact}
                        onChange={(e) => setTextToRedact(e.target.value)}
                        placeholder="Enter text to redact"
                        className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        All occurrences of this text will be permanently blacked out.
                      </p>
                    </div>
                  )}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Warning:</strong> Redaction permanently removes sensitive information by covering it with black rectangles. Make sure to review the redacted PDF before sharing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Redact Button */}
          {selectedFile && !isProcessing && (
            <div className="text-center">
              <button
                onClick={handleRedact}
                className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Redact PDF
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
                  Redacting PDF...
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
        </div>
      </div>
    </section>
  );
}

