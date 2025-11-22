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

export default function ComparePDF() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [comparisonResult, setComparisonResult] = useState<string>('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent, fileNumber: 1 | 2) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/pdf'
    );
    if (files.length > 0 && validateFileSize(files[0])) {
      if (fileNumber === 1) {
        setFile1(files[0]);
      } else {
        setFile2(files[0]);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, fileNumber: 1 | 2) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFileSize(file)) {
        if (fileNumber === 1) {
          setFile1(file);
        } else {
          setFile2(file);
        }
      }
    }
  };

  const handleCompare = async () => {
    if (!file1 || !file2) {
      showError('Please select both PDF files to compare.');
      return;
    }

    const toastId = showLoading('Comparing PDFs...');
    setIsProcessing(true);
    setProgress(0);
    setComparisonResult('');

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
      await comparePDFs();
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'PDF comparison completed!');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while comparing the PDFs. Please try again.');
      console.error('Compare error:', error);
    }
  };

  const comparePDFs = async () => {
    if (!file1 || !file2) return;

    try {
      const pdfjs = await loadPdfJs();
      
      // Load both PDFs
      const arrayBuffer1 = await file1.arrayBuffer();
      const arrayBuffer2 = await file2.arrayBuffer();
      
      const loadingTask1 = pdfjs.getDocument({ data: arrayBuffer1 });
      const loadingTask2 = pdfjs.getDocument({ data: arrayBuffer2 });
      
      const pdf1 = await loadingTask1.promise;
      const pdf2 = await loadingTask2.promise;
      
      const pageCount1 = pdf1.numPages;
      const pageCount2 = pdf2.numPages;
      
      let differences: string[] = [];
      
      // Compare page count
      if (pageCount1 !== pageCount2) {
        differences.push(`Page count differs: File 1 has ${pageCount1} pages, File 2 has ${pageCount2} pages.`);
      }
      
      // Compare pages
      const minPages = Math.min(pageCount1, pageCount2);
      for (let i = 1; i <= minPages; i++) {
        const page1 = await pdf1.getPage(i);
        const page2 = await pdf2.getPage(i);
        
        const textContent1 = await page1.getTextContent();
        const textContent2 = await page2.getTextContent();
        
        const text1 = textContent1.items.map((item: any) => item.str).join(' ');
        const text2 = textContent2.items.map((item: any) => item.str).join(' ');
        
        if (text1 !== text2) {
          differences.push(`Page ${i}: Text content differs.`);
        }
        
        // Compare page dimensions
        const viewport1 = page1.getViewport({ scale: 1.0 });
        const viewport2 = page2.getViewport({ scale: 1.0 });
        
        if (Math.abs(viewport1.width - viewport2.width) > 1 || 
            Math.abs(viewport1.height - viewport2.height) > 1) {
          differences.push(`Page ${i}: Page dimensions differ.`);
        }
      }
      
      if (differences.length === 0) {
        setComparisonResult('✓ The PDFs appear to be identical (same page count, dimensions, and text content).');
      } else {
        setComparisonResult(`Found ${differences.length} difference(s):\n\n${differences.join('\n')}`);
      }
      
    } catch (error) {
      console.error('Error comparing PDFs:', error);
      throw error;
    }
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Upload Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* File 1 */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 1)}
              className={`bg-white rounded-xl border-2 border-dashed border-[var(--color-border-gray)] p-8 text-center transition-all duration-300 ${
                isDragging ? 'border-[var(--color-primary)] bg-blue-50' : 'hover:border-[var(--color-primary)]'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="bg-blue-50 rounded-full p-4 mb-4">
                  <FontAwesomeIcon icon={faCloudArrowUp} className="text-[var(--color-primary)]" size="2x" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-2">
                  First PDF
                </h3>
                <label htmlFor="file-input-1" className="cursor-pointer">
                  <span className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors inline-flex items-center gap-2 text-sm">
                    <FontAwesomeIcon icon={faFolderOpen} />
                    Choose File
                  </span>
                </label>
                <input
                  type="file"
                  id="file-input-1"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleFileInput(e, 1)}
                />
                {file1 && (
                  <div className="mt-4 flex items-center space-x-2">
                    <FontAwesomeIcon icon={faFilePdf} className="text-red-500" />
                    <span className="text-sm text-[var(--color-text-dark)]">{file1.name}</span>
                    <button
                      onClick={() => setFile1(null)}
                      className="text-[var(--color-danger)] hover:bg-red-50 p-1 rounded"
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* File 2 */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 2)}
              className={`bg-white rounded-xl border-2 border-dashed border-[var(--color-border-gray)] p-8 text-center transition-all duration-300 ${
                isDragging ? 'border-[var(--color-primary)] bg-blue-50' : 'hover:border-[var(--color-primary)]'
              }`}
            >
              <div className="flex flex-col items-center">
                <div className="bg-blue-50 rounded-full p-4 mb-4">
                  <FontAwesomeIcon icon={faCloudArrowUp} className="text-[var(--color-primary)]" size="2x" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-2">
                  Second PDF
                </h3>
                <label htmlFor="file-input-2" className="cursor-pointer">
                  <span className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors inline-flex items-center gap-2 text-sm">
                    <FontAwesomeIcon icon={faFolderOpen} />
                    Choose File
                  </span>
                </label>
                <input
                  type="file"
                  id="file-input-2"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleFileInput(e, 2)}
                />
                {file2 && (
                  <div className="mt-4 flex items-center space-x-2">
                    <FontAwesomeIcon icon={faFilePdf} className="text-red-500" />
                    <span className="text-sm text-[var(--color-text-dark)]">{file2.name}</span>
                    <button
                      onClick={() => setFile2(null)}
                      className="text-[var(--color-danger)] hover:bg-red-50 p-1 rounded"
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compare Button */}
          {file1 && file2 && !isProcessing && (
            <div className="text-center mb-8">
              <button
                onClick={handleCompare}
                className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Compare PDFs
              </button>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-6 mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--color-text-dark)]">
                  Comparing PDFs...
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

          {/* Comparison Result */}
          {comparisonResult && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">Comparison Result</h3>
              <pre className="whitespace-pre-wrap text-sm text-[var(--color-text-dark)] bg-gray-50 p-4 rounded-lg">
                {comparisonResult}
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

