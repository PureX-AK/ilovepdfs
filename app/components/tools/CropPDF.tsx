'use client';

import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faFilePdf,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { validateFileSize, showError, showSuccess, showLoading, updateToSuccess, updateToError, formatFileSize } from '../../lib/utils';

export default function CropPDF() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cropMode, setCropMode] = useState<'all' | 'single'>('all');
  const [pageNumber, setPageNumber] = useState('1');
  const [topMargin, setTopMargin] = useState('0');
  const [bottomMargin, setBottomMargin] = useState('0');
  const [leftMargin, setLeftMargin] = useState('0');
  const [rightMargin, setRightMargin] = useState('0');

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

  const handleCrop = async () => {
    if (!selectedFile) {
      showError('Please select a PDF file to crop.');
      return;
    }

    const toastId = showLoading('Cropping PDF...');
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
      await cropPDF();
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'PDF cropped successfully! Download started.');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while cropping the PDF. Please try again.');
      console.error('Crop error:', error);
    }
  };

  const cropPDF = async () => {
    if (!selectedFile) return;

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = pdf.getPages();
      
      const top = parseFloat(topMargin);
      const bottom = parseFloat(bottomMargin);
      const left = parseFloat(leftMargin);
      const right = parseFloat(rightMargin);
      
      if (cropMode === 'all') {
        // Crop all pages
        pages.forEach((page) => {
          const { width, height } = page.getSize();
          page.setCropBox(
            left,
            bottom,
            width - left - right,
            height - top - bottom
          );
        });
      } else {
        // Crop single page
        const pageNum = parseInt(pageNumber) - 1;
        if (pageNum >= 0 && pageNum < pages.length) {
          const page = pages[pageNum];
          const { width, height } = page.getSize();
          page.setCropBox(
            left,
            bottom,
            width - left - right,
            height - top - bottom
          );
        }
      }
      
      // Save cropped PDF
      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace('.pdf', '') + '_cropped.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error cropping PDF:', error);
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

          {/* Crop Options */}
          {selectedFile && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">Crop Options</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                      Apply to
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="cropMode"
                          value="all"
                          checked={cropMode === 'all'}
                          onChange={(e) => setCropMode(e.target.value as 'all')}
                          className="text-[var(--color-primary)]"
                        />
                        <span className="text-sm text-[var(--color-text-dark)]">All pages</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="cropMode"
                          value="single"
                          checked={cropMode === 'single'}
                          onChange={(e) => setCropMode(e.target.value as 'single')}
                          className="text-[var(--color-primary)]"
                        />
                        <span className="text-sm text-[var(--color-text-dark)]">Single page</span>
                      </label>
                    </div>
                  </div>
                  {cropMode === 'single' && (
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        Page number
                      </label>
                      <input
                        type="number"
                        value={pageNumber}
                        onChange={(e) => setPageNumber(e.target.value)}
                        min="1"
                        className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        Top margin (px)
                      </label>
                      <input
                        type="number"
                        value={topMargin}
                        onChange={(e) => setTopMargin(e.target.value)}
                        min="0"
                        className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        Bottom margin (px)
                      </label>
                      <input
                        type="number"
                        value={bottomMargin}
                        onChange={(e) => setBottomMargin(e.target.value)}
                        min="0"
                        className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        Left margin (px)
                      </label>
                      <input
                        type="number"
                        value={leftMargin}
                        onChange={(e) => setLeftMargin(e.target.value)}
                        min="0"
                        className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        Right margin (px)
                      </label>
                      <input
                        type="number"
                        value={rightMargin}
                        onChange={(e) => setRightMargin(e.target.value)}
                        min="0"
                        className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Crop Button */}
          {selectedFile && !isProcessing && (
            <div className="text-center">
              <button
                onClick={handleCrop}
                className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Crop PDF
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
                  Cropping PDF...
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

