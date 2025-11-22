'use client';

import { useState } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faFileImage,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { validateFilesSize, showError, showSuccess, showLoading, updateToSuccess, updateToError, formatFileSize } from '../../lib/utils';

export default function JPGToPDF() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [margin, setMargin] = useState<'none' | 'small' | 'medium' | 'large'>('small');

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
      (file) => file.type.startsWith('image/')
    );
    if (validateFilesSize(files)) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(
        (file) => file.type.startsWith('image/')
      );
      if (validateFilesSize(files)) {
        setSelectedFiles((prev) => [...prev, ...files]);
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) {
      showError('Please select at least one image file to convert.');
      return;
    }

    const toastId = showLoading('Converting images to PDF...');
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
      await convertJPGToPDF();
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'Images converted to PDF successfully! Download started.');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while converting the images. Please try again.');
      console.error('Conversion error:', error);
    }
  };

  const convertJPGToPDF = async () => {
    if (selectedFiles.length === 0) return;

    try {
      const pdfDoc = await PDFDocument.create();
      const marginSize = margin === 'none' ? 0 : margin === 'small' ? 20 : margin === 'medium' ? 40 : 60;
      
      for (const file of selectedFiles) {
        // Read image file
        const arrayBuffer = await file.arrayBuffer();
        let image;
        
        // Determine image type and embed
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          image = await pdfDoc.embedJpg(arrayBuffer);
        } else if (file.type === 'image/png') {
          image = await pdfDoc.embedPng(arrayBuffer);
        } else {
          // Try to embed as JPEG as fallback
          image = await pdfDoc.embedJpg(arrayBuffer);
        }
        
        // Determine page size based on image and orientation
        let pageWidth = image.width;
        let pageHeight = image.height;
        
        if (orientation === 'portrait') {
          if (pageWidth > pageHeight) {
            [pageWidth, pageHeight] = [pageHeight, pageWidth];
          }
        } else if (orientation === 'landscape') {
          if (pageHeight > pageWidth) {
            [pageWidth, pageHeight] = [pageHeight, pageWidth];
          }
        }
        // 'auto' keeps original orientation
        
        // Add page
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        // Calculate image dimensions with margins
        const maxWidth = pageWidth - (marginSize * 2);
        const maxHeight = pageHeight - (marginSize * 2);
        
        let imgWidth = image.width;
        let imgHeight = image.height;
        
        // Scale to fit with margins
        const widthRatio = maxWidth / imgWidth;
        const heightRatio = maxHeight / imgHeight;
        const ratio = Math.min(widthRatio, heightRatio);
        
        imgWidth = imgWidth * ratio;
        imgHeight = imgHeight * ratio;
        
        // Center the image
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;
        
        // Draw image
        page.drawImage(image, {
          x: x,
          y: y,
          width: imgWidth,
          height: imgHeight,
        });
      }
      
      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFiles.length === 1 
        ? selectedFiles[0].name.replace(/\.(jpg|jpeg|png)$/i, '') + '.pdf'
        : 'images.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error converting JPG to PDF:', error);
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
                Drop your image files here
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
                accept="image/*"
                className="hidden"
                onChange={handleFileInput}
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-4">
                Supports JPG, PNG, and other image formats up to 25MB each
              </p>
            </div>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6 border-b border-[var(--color-border-gray)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">
                  Selected Images ({selectedFiles.length})
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-[var(--color-border-gray)]"
                  >
                    <div className="flex items-center space-x-3">
                      <FontAwesomeIcon icon={faFileImage} className="text-yellow-500" />
                      <span className="font-medium text-[var(--color-text-dark)]">{file.name}</span>
                      <span className="text-sm text-[var(--color-text-muted)]">
                             ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-[var(--color-danger)] hover:bg-red-50 p-2 rounded"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversion Options */}
          {selectedFiles.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">Conversion Options</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                      Orientation
                    </label>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape' | 'auto')}
                      className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="auto">Auto (use image orientation)</option>
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                      Margins
                    </label>
                    <select
                      value={margin}
                      onChange={(e) => setMargin(e.target.value as 'none' | 'small' | 'medium' | 'large')}
                      className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="none">None</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Convert Button */}
          {selectedFiles.length > 0 && !isProcessing && (
            <div className="text-center">
              <button
                onClick={handleConvert}
                className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Convert Images to PDF
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
                  Converting images to PDF...
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

