'use client';

import { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faGripVertical,
  faFilePdf,
  faTrash,
  faArrowUp,
  faArrowDown,
} from '@fortawesome/free-solid-svg-icons';
import { validateFilesSize, showError, showSuccess, showLoading, updateToSuccess, updateToError, formatFileSize } from '../../lib/utils';

export default function MergePDF() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputFilename, setOutputFilename] = useState('merged-document');

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
    if (validateFilesSize(files)) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(
        (file) => file.type === 'application/pdf'
      );
      if (validateFilesSize(files)) {
        setSelectedFiles((prev) => [...prev, ...files]);
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      setSelectedFiles((prev) => {
        const newFiles = [...prev];
        [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
        return newFiles;
      });
    } else if (direction === 'down' && index < selectedFiles.length - 1) {
      setSelectedFiles((prev) => {
        const newFiles = [...prev];
        [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
        return newFiles;
      });
    }
  };

  const handleMerge = async () => {
    if (selectedFiles.length < 2) {
      showError('Please select at least 2 PDF files to merge.');
      return;
    }

    const toastId = showLoading('Merging PDF files...');
    setIsProcessing(true);
    setProgress(0);

    // Simulate progress while actually merging
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Stop at 90% until merge completes
        }
        return prev + 10;
      });
    }, 200);

    try {
      // Actually merge the PDFs
      await downloadMergedFile();
      
      // Complete the progress
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'PDF files merged successfully! Download started.');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while merging the PDF files. Please try again.');
    }
  };

  const downloadMergedFile = async () => {
    try {
      // Create a new PDF document
      const mergedPdf = await PDFDocument.create();

      // Process each PDF file in order
      for (const file of selectedFiles) {
        try {
          // Read the file as an array buffer
          const arrayBuffer = await file.arrayBuffer();
          
          // Load the PDF document
          const pdf = await PDFDocument.load(arrayBuffer);
          
          // Get all pages from the PDF
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          
          // Add each page to the merged PDF
          pages.forEach((page) => {
            mergedPdf.addPage(page);
          });
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
                showError(`Warning: Could not process ${file.name}. It may be corrupted or encrypted.`);
        }
      }

      // Save the merged PDF
      const pdfBytes = await mergedPdf.save();

      // Create a blob and download
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${outputFilename || 'merged-document'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Don't show alert here, let handleMerge handle the UI state
    } catch (error) {
      console.error('Error merging PDFs:', error);
      throw error; // Re-throw to let handleMerge handle it
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
                Drop your PDF files here
              </h3>
              <p className="text-[var(--color-text-muted)] mb-6">or click to browse and select files</p>
              <label htmlFor="file-input" className="cursor-pointer">
                <span className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faFolderOpen} />
                  Choose Files
                </span>
              </label>
              <input
                type="file"
                id="file-input"
                multiple
                accept=".pdf"
                className="hidden"
                onChange={handleFileInput}
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-4">
                Supports PDF files up to 25MB each
              </p>
            </div>
          </div>

          {/* File List */}
          {selectedFiles.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6 border-b border-[var(--color-border-gray)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">
                    Files to Merge ({selectedFiles.length})
                  </h3>
                  <span className="text-sm text-[var(--color-text-muted)]">Drag to reorder or use arrows</span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-[var(--color-border-gray)]"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <FontAwesomeIcon
                        icon={faGripVertical}
                        className="text-[var(--color-text-muted)] cursor-move"
                      />
                      <span className="text-sm font-medium text-[var(--color-text-muted)] min-w-[2rem]">
                        {index + 1}
                      </span>
                      <FontAwesomeIcon icon={faFilePdf} className="text-red-500" />
                      <span className="font-medium text-[var(--color-text-dark)] flex-1">{file.name}</span>
                             <span className="text-sm text-[var(--color-text-muted)]">
                               ({formatFileSize(file.size)})
                             </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => moveFile(index, 'up')}
                        disabled={index === 0}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <FontAwesomeIcon icon={faArrowUp} />
                      </button>
                      <button
                        onClick={() => moveFile(index, 'down')}
                        disabled={index === selectedFiles.length - 1}
                        className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <FontAwesomeIcon icon={faArrowDown} />
                      </button>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-[var(--color-danger)] hover:bg-red-50 p-2 rounded"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Merge Options */}
          {selectedFiles.length >= 2 && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">Merge Options</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--color-text-dark)]">
                      Output filename
                    </label>
                    <input
                      type="text"
                      value={outputFilename}
                      onChange={(e) => setOutputFilename(e.target.value)}
                      placeholder="merged-document"
                      className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Merge Button */}
          {selectedFiles.length >= 2 && !isProcessing && (
            <div className="text-center">
              <button
                onClick={handleMerge}
                className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <FontAwesomeIcon icon={faGripVertical} className="mr-2" />
                Merge PDF Files
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
                  Merging files...
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

