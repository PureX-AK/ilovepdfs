'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCloudArrowUp, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { validateFileSize, showError } from '../../lib/utils';
import { useUploadWorkflow } from '../../contexts/UploadWorkflowContext';

export default function PDFToWord() {
  const router = useRouter();
  const { setFiles } = useUploadWorkflow();
  const [isDragging, setIsDragging] = useState(false);

  const handleSelectFile = (file: File) => {
    if (!validateFileSize(file)) {
      return;
    }
    if (file.type !== 'application/pdf') {
      showError('Please select a PDF file.');
      return;
    }
    // Store the file for the pdf-to-word workflow and go to the files/options page
    setFiles('pdf-to-word', [file]);
    router.push('/pdf-to-word/files');
  };

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
      (f) => f.type === 'application/pdf'
    );
    if (!files.length) {
      showError('Please drop a PDF file.');
      return;
    }
    handleSelectFile(files[0]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectFile(e.target.files[0]);
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
                Upload your PDF to convert to Word
              </h3>
              <p className="text-[var(--color-text-muted)] mb-6">
                Drop your PDF here or click to browse. On the next step, you can choose between an editable DOCX
                or a layout-perfect DOCX (pages as images).
              </p>
              <label htmlFor="pdf-to-word-file-input" className="cursor-pointer">
                <span className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors inline-flex items-center gap-2">
                  <FontAwesomeIcon icon={faFolderOpen} />
                  Choose File
                </span>
              </label>
              <input
                type="file"
                id="pdf-to-word-file-input"
                accept=".pdf"
                className="hidden"
                onChange={handleFileInput}
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-4">
                Supports PDF files up to 25MB
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


