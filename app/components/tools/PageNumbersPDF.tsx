'use client';

import { useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faFilePdf,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { validateFileSize, showError, showSuccess, showLoading, updateToSuccess, updateToError, formatFileSize } from '../../lib/utils';

export default function PageNumbersPDF() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [position, setPosition] = useState<'bottom-center' | 'bottom-right' | 'top-center' | 'top-right'>('bottom-center');
  const [fontSize, setFontSize] = useState('12');
  const [startPage, setStartPage] = useState('1');
  const [format, setFormat] = useState<'1' | '1/10' | 'Page 1'>('1');

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

  const handleAddPageNumbers = async () => {
    if (!selectedFile) {
      showError('Please select a PDF file.');
      return;
    }

    const toastId = showLoading('Adding page numbers...');
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
      await addPageNumbers();
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'Page numbers added successfully! Download started.');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while adding page numbers. Please try again.');
      console.error('Page numbers error:', error);
    }
  };

  const addPageNumbers = async () => {
    if (!selectedFile) return;

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const startNum = parseInt(startPage) || 1;
      
      pages.forEach((page, index) => {
        const { width, height } = page.getSize();
        const pageNum = startNum + index;
        let text = '';
        
        if (format === '1') {
          text = pageNum.toString();
        } else if (format === '1/10') {
          text = `${pageNum}/${pages.length}`;
        } else {
          text = `Page ${pageNum}`;
        }
        
        let x = 0;
        let y = 0;
        
        // Calculate position
        const textWidth = font.widthOfTextAtSize(text, parseFloat(fontSize));
        
        if (position === 'bottom-center') {
          x = (width - textWidth) / 2;
          y = 30;
        } else if (position === 'bottom-right') {
          x = width - textWidth - 30;
          y = 30;
        } else if (position === 'top-center') {
          x = (width - textWidth) / 2;
          y = height - 30;
        } else if (position === 'top-right') {
          x = width - textWidth - 30;
          y = height - 30;
        }
        
        page.drawText(text, {
          x: x,
          y: y,
          size: parseFloat(fontSize),
          font: font,
          color: rgb(0, 0, 0),
        });
      });
      
      // Save PDF with page numbers
      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace('.pdf', '') + '_numbered.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error adding page numbers:', error);
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

          {/* Page Number Options */}
          {selectedFile && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">Page Number Options</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                      Position
                    </label>
                    <select
                      value={position}
                      onChange={(e) => setPosition(e.target.value as any)}
                      className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="bottom-center">Bottom Center</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="top-center">Top Center</option>
                      <option value="top-right">Top Right</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        Font size
                      </label>
                      <input
                        type="number"
                        value={fontSize}
                        onChange={(e) => setFontSize(e.target.value)}
                        min="8"
                        max="72"
                        className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        Start from page
                      </label>
                      <input
                        type="number"
                        value={startPage}
                        onChange={(e) => setStartPage(e.target.value)}
                        min="1"
                        className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                      Format
                    </label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as any)}
                      className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="1">1</option>
                      <option value="1/10">1/10</option>
                      <option value="Page 1">Page 1</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Add Page Numbers Button */}
          {selectedFile && !isProcessing && (
            <div className="text-center">
              <button
                onClick={handleAddPageNumbers}
                className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Add Page Numbers
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
                  Adding page numbers...
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

