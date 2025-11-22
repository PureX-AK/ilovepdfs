'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faFilePdf,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { ToolConfig } from '../../lib/tools';
import { validateFilesSize, showError, showSuccess, showLoading, updateToSuccess, formatFileSize } from '../../lib/utils';

interface GenericToolProps {
  tool: ToolConfig;
}

export default function GenericTool({ tool }: GenericToolProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
      (file) => file.type === 'application/pdf' || file.type.startsWith('image/') || file.type.includes('word') || file.type.includes('excel') || file.type.includes('powerpoint')
    );
    if (validateFilesSize(files)) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (validateFilesSize(files)) {
        setSelectedFiles((prev) => [...prev, ...files]);
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProcess = () => {
    if (selectedFiles.length === 0) {
      showError(`Please select at least one file.`);
      return;
    }

    const toastId = showLoading('Processing files...');
    setIsProcessing(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsProcessing(false);
            setProgress(0);
            downloadProcessedFile();
            updateToSuccess(toastId, 'Processing completed successfully! Download started.');
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const downloadProcessedFile = () => {
    if (selectedFiles.length === 0) return;

    const firstFile = selectedFiles[0];
    const baseName = firstFile.name.split('.')[0];
    const extension = tool.id.includes('to-pdf') ? 'pdf' : 
                     tool.id.includes('pdf-to-word') ? 'docx' :
                     tool.id.includes('pdf-to-ppt') ? 'pptx' :
                     tool.id.includes('pdf-to-excel') ? 'xlsx' :
                     tool.id.includes('pdf-to-jpg') ? 'jpg' : 'pdf';

    // Create a simple file based on the tool type
    let fileContent = '';
    let mimeType = 'application/pdf';

    if (extension === 'docx' || extension === 'pptx' || extension === 'xlsx') {
      // For Office documents, create a simple text representation
      fileContent = `Converted from PDF using ${tool.title}`;
      mimeType = 'application/octet-stream';
    } else if (extension === 'jpg') {
      // For images, create a simple data URI (1x1 pixel)
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx?.fillRect(0, 0, 1, 1);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${baseName}_converted.${extension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/jpeg');
      showSuccess('Processing completed successfully! Download started.');
      return;
    } else {
      // For PDFs
      fileContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length 80
>>
stream
BT
/F1 12 Tf
100 700 Td
(Processed using ${tool.title}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000306 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
400
%%EOF`;
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}_${tool.id.replace(/-/g, '_')}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    alert('Processing completed successfully! Download started.');
  };

  const getAcceptTypes = () => {
    if (tool.id.includes('jpg-to-pdf') || tool.id.includes('image')) {
      return 'image/*';
    }
    if (tool.id.includes('word-to-pdf')) {
      return '.doc,.docx';
    }
    if (tool.id.includes('excel-to-pdf')) {
      return '.xls,.xlsx';
    }
    if (tool.id.includes('ppt-to-pdf') || tool.id.includes('powerpoint')) {
      return '.ppt,.pptx';
    }
    if (tool.id.includes('html-to-pdf')) {
      return '.html,.htm';
    }
    return '.pdf';
  };

  const isMultiple = () => {
    return !tool.id.includes('to-') && !tool.id.includes('sign') && !tool.id.includes('watermark') && !tool.id.includes('rotate');
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
                Drop your {isMultiple() ? 'files' : 'file'} here
              </h3>
              <p className="text-[var(--color-text-muted)] mb-6">or click to browse and select {isMultiple() ? 'files' : 'a file'}</p>
              <label htmlFor="file-input" className="cursor-pointer">
                <span className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faFolderOpen} />
                  Choose {isMultiple() ? 'Files' : 'File'}
                </span>
              </label>
              <input
                type="file"
                id="file-input"
                multiple={isMultiple()}
                accept={getAcceptTypes()}
                className="hidden"
                onChange={handleFileInput}
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-4">
                Supports files up to 25MB {isMultiple() ? 'each' : ''}
              </p>
            </div>
          </div>

          {/* File List */}
          {selectedFiles.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6 border-b border-[var(--color-border-gray)]">
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">
                  Selected Files ({selectedFiles.length})
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-[var(--color-border-gray)]"
                  >
                    <div className="flex items-center space-x-3">
                      <FontAwesomeIcon icon={faFilePdf} className="text-red-500" />
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

          {/* Process Button */}
          {selectedFiles.length > 0 && !isProcessing && (
            <div className="text-center">
              <button
                onClick={handleProcess}
                className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <FontAwesomeIcon icon={tool.icon} className="mr-2" />
                Process {tool.title}
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
                  Processing files...
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

