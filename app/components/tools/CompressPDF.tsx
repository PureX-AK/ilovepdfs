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

export default function CompressPDF() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium');

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

  const handleCompress = async () => {
    if (!selectedFile) {
      showError('Please select a PDF file to compress.');
      return;
    }

    const toastId = showLoading('Compressing PDF file...');
    setIsProcessing(true);
    setProgress(0);

    // Simulate progress while actually compressing
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Stop at 90% until compression completes
        }
        return prev + 10;
      });
    }, 200);

    try {
      // Actually compress the PDF and get compression stats
      const compressionStats = await downloadCompressedFile();
      
      // Complete the progress
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        
        // Show compression results in success message
        if (compressionStats && compressionStats.ratio > 0) {
          updateToSuccess(toastId, `PDF compressed successfully! Reduced by ${compressionStats.ratio}% (${compressionStats.reduction} KB saved). Download started.`);
        } else if (compressionStats && compressionStats.ratio < 0) {
          updateToError(toastId, `PDF size increased. This PDF may already be optimized. Consider using a different compression level.`);
        } else {
          updateToSuccess(toastId, 'PDF processed successfully! File size unchanged - PDF may already be optimized. Download started.');
        }
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while compressing the PDF file. Please try again.');
    }
  };

  const downloadCompressedFile = async (): Promise<{ ratio: number; reduction: string; originalSize: number; finalSize: number } | null> => {
    if (!selectedFile) return null;

    try {
      // Create FormData to send to server
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('compressionLevel', compressionLevel);

      // Send to server-side compression API
      const response = await fetch('/api/compress-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to compress PDF' }));
        throw new Error(errorData.error || 'Failed to compress PDF');
      }

      // Get compression statistics from response headers
      const originalSize = parseInt(response.headers.get('X-Original-Size') || '0');
      const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0');
      const compressionRatio = parseFloat(response.headers.get('X-Compression-Ratio') || '0');
      const sizeReduction = response.headers.get('X-Size-Reduction') || '0';

      // Get the compressed PDF as blob
      const blob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace('.pdf', '') + '_compressed.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log compression results
      const originalSizeMB = (originalSize / 1024 / 1024).toFixed(2);
      const compressedSizeMB = (compressedSize / 1024 / 1024).toFixed(2);
      
      console.log(`Original size: ${originalSizeMB} MB`);
      console.log(`Compressed size: ${compressedSizeMB} MB`);
      console.log(`Size reduction: ${sizeReduction} KB (${compressionRatio}%)`);

      // Return compression statistics
      return {
        ratio: compressionRatio,
        reduction: sizeReduction,
        originalSize,
        finalSize: compressedSize,
      };
      
    } catch (error) {
      console.error('Error compressing PDF:', error);
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

          {/* Compression Options */}
          {selectedFile && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">Compression Options</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                      Compression level
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="compression"
                          value="low"
                          checked={compressionLevel === 'low'}
                          onChange={(e) => setCompressionLevel(e.target.value as 'low')}
                          className="text-[var(--color-primary)]"
                        />
                        <span className="text-sm text-[var(--color-text-dark)]">
                          Low (Better quality, larger file size)
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="compression"
                          value="medium"
                          checked={compressionLevel === 'medium'}
                          onChange={(e) => setCompressionLevel(e.target.value as 'medium')}
                          className="text-[var(--color-primary)]"
                        />
                        <span className="text-sm text-[var(--color-text-dark)]">
                          Medium (Balanced quality and file size)
                        </span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="compression"
                          value="high"
                          checked={compressionLevel === 'high'}
                          onChange={(e) => setCompressionLevel(e.target.value as 'high')}
                          className="text-[var(--color-primary)]"
                        />
                        <span className="text-sm text-[var(--color-text-dark)]">
                          High (Smaller file size, slightly lower quality)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          {selectedFile && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Compression is processed server-side using Ghostscript for actual PDF compression. This will reduce file size by compressing images and optimizing content. Make sure Ghostscript is installed on your server.
              </p>
            </div>
          )}

          {/* Compress Button */}
          {selectedFile && !isProcessing && (
            <div className="text-center">
              <button
                onClick={handleCompress}
                className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Compress PDF File
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
                  Compressing file...
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

