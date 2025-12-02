'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { toolsConfig } from '../../lib/tools';
import { useUploadWorkflow } from '../../contexts/UploadWorkflowContext';
import { saveDownloadResult } from '../../lib/workflow';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faChevronRight,
  faFilePdf,
  faGripVertical,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { formatFileSize, showError, showLoading, updateToError, updateToSuccess } from '../../lib/utils';

interface ToolFilesPageProps {
  params: Promise<{ tool: string }>;
}

export default function ToolFilesPage({ params }: ToolFilesPageProps) {
  const router = useRouter();
  const { getFiles, setFiles } = useUploadWorkflow();
  const [toolId, setToolId] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState('merged-document');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [splitMode, setSplitMode] = useState<'all' | 'range' | 'custom'>('all');
  const [pageRange, setPageRange] = useState('');
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    (async () => {
      const { tool } = await params;
      setToolId(tool);
    })();
  }, [params]);

  const tool = toolId ? toolsConfig[toolId] : null;
  const files = toolId ? getFiles(toolId) : [];

  // Redirect tools that don't use the shared files page back to their main page
  useEffect(() => {
    if (!toolId) return;
    if (toolId !== 'merge' && toolId !== 'split' && toolId !== 'compress') {
      router.push(`/${toolId}`);
    }
  }, [toolId, router]);

  // If there are no files, send the user back to the main tool page
  useEffect(() => {
    if (!toolId) return;
    if (!files.length) {
      router.push(`/${toolId}`);
    }
  }, [toolId, files.length, router]);

  if (!toolId || !files.length || (toolId !== 'merge' && toolId !== 'split' && toolId !== 'compress')) {
    return null;
  }

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(toolId, next);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (!toolId) return;
    setDraggedIndex(index);
    setDragOverIndex(null);
    e.dataTransfer.effectAllowed = 'move';
    // Needed for Firefox
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index || !toolId) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const next = [...files];
    const [moved] = next.splice(draggedIndex, 1);
    next.splice(index, 0, moved);

    setFiles(toolId, next);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleCompress = async () => {
    const selectedFile = files[0];

    if (!selectedFile) {
      showError('Please select a PDF file to compress.');
      return;
    }

    const toastId = showLoading('Compressing PDF file...');
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
      const { blob, filename, fileCount, ratio, reduction } = await createCompressedResult(
        selectedFile,
        compressionLevel
      );
      const url = URL.createObjectURL(blob);

      saveDownloadResult(toolId, {
        url,
        filename,
        fileCount,
      });

      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);

        if (ratio > 0) {
          updateToSuccess(
            toastId,
            `PDF compressed successfully! Reduced by ${ratio}% (${reduction} KB saved).`
          );
        } else if (ratio < 0) {
          updateToError(
            toastId,
            'PDF size increased. This PDF may already be optimized. Consider using a different compression level.'
          );
        } else {
          updateToSuccess(
            toastId,
            'PDF processed successfully! File size unchanged - PDF may already be optimized.'
          );
        }

        router.push('/compress/download');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while compressing the PDF file. Please try again.');
    }
  };

  const handleSplit = async () => {
    const selectedFile = files[0];

    if (!selectedFile) {
      showError('Please select a PDF file to split.');
      return;
    }

    if (splitMode === 'range' && !pageRange.trim()) {
      showError('Please enter a page range (e.g., 1-5, 10-15).');
      return;
    }

    if (splitMode === 'custom' && !pageRange.trim()) {
      showError('Please enter page numbers (e.g., 1,3,5-10,15).');
      return;
    }

    const toastId = showLoading('Splitting PDF file...');
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
      const { blob, filename, fileCount } = await createSplitResult(selectedFile, splitMode, pageRange);
      const url = URL.createObjectURL(blob);

      saveDownloadResult(toolId, {
        url,
        filename,
        fileCount,
      });

      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'PDF file split successfully! Ready to download.');
        router.push('/split/download');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while splitting the PDF file. Please try again.');
    }
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      showError('Please select at least 2 PDF files to merge.');
      return;
    }

    const toastId = showLoading('Merging PDF files...');
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
      const { blob, filename } = await createMergedBlob(files, outputFilename);
      const url = URL.createObjectURL(blob);

      saveDownloadResult(toolId, {
        url,
        filename,
        fileCount: files.length,
      });

      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'PDF files merged successfully! Ready to download.');
        router.push('/merge/download');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while merging the PDF files. Please try again.');
    }
  };

  // MERGE TOOL VIEW
  if (toolId === 'merge') {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--color-secondary)] text-[var(--color-text-dark)]">
        <Header />

        {/* Breadcrumb */}
        <section className="bg-white border-b border-[var(--color-border-gray)]">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center text-sm text-[var(--color-text-muted)]">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="hover:text-[var(--color-primary)] transition-colors"
              >
                Home
              </button>
              <FontAwesomeIcon icon={faChevronRight} className="mx-2 text-xs" />
              {tool && (
                <>
                  <button
                    type="button"
                    onClick={() => router.push(`/${toolId}`)}
                    className="hover:text-[var(--color-primary)] transition-colors"
                  >
                    {tool.title}
                  </button>
                  <FontAwesomeIcon icon={faChevronRight} className="mx-2 text-xs" />
                </>
              )}
              <span className="text-[var(--color-text-dark)] font-medium">Uploaded Files</span>
            </div>
          </div>
        </section>

        <main className="flex-grow">
          {/* Header section similar to HTML mock */}
          <section className="py-8 bg-white border-b border-[var(--color-border-gray)]">
            <div className="container mx-auto px-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => router.push('/merge')}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">Your Uploaded Files</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      Arrange files in the order you want to merge them
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push('/merge')}
                    className="border border-[var(--color-border-gray)] text-[var(--color-text-dark)] px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Upload More
                  </button>
                  <button
                    type="button"
                    onClick={handleMerge}
                    disabled={files.length < 2 || isProcessing}
                    className="bg-[var(--color-primary)] text-white px-6 py-2 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Proceed to Merge
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Uploaded files grid, styled similar to HTML mock */}
          <section className="py-8">
            <div className="container mx-auto px-6">
              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
                <div className="p-6 border-b border-[var(--color-border-gray)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--color-text-dark)]">
                        Your Uploaded Files
                      </h3>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        Select and arrange files in the order you want to merge them
                      </p>
                    </div>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      Total files: <span className="font-medium text-[var(--color-text-dark)]">{files.length}</span>
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnter={(e) => handleDragEnter(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-xl border-2 overflow-hidden shadow-sm transition-all duration-200 cursor-move ${
                          dragOverIndex === index
                            ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]'
                            : 'border-[var(--color-border-gray)] hover:shadow-lg hover:border-[var(--color-primary)]'
                        }`}
                      >
                        <div className="h-40 flex items-center justify-center relative bg-gradient-to-br from-[#f5f7fa] to-[#c3cfe2]">
                          <div className="absolute top-3 right-3">
                            <span className="bg-blue-100 text-[var(--color-primary)] text-xs px-2 py-1 rounded-full font-semibold">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex items-center justify-center w-full h-full overflow-hidden px-2">
                            <FilePreview file={file} />
                          </div>
                        </div>
                        <div className="p-4 border-t border-[var(--color-border-gray)]">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-[var(--color-text-dark)] text-sm truncate flex-1 mr-2">
                              {file.name}
                            </h4>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)] mb-3">
                            <span>{formatFileSize(file.size)}</span>
                            <span>PDF file</span>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-gray)]">
                            <div className="flex items-center space-x-2 text-xs text-[var(--color-text-muted)]">
                              <FontAwesomeIcon icon={faGripVertical} className="text-gray-400" />
                              <span>Drag to reorder</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-[var(--color-danger)] hover:bg-red-50 p-1.5 rounded-md"
                              title="Remove file"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Merge options and main merge button */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">Merge Options</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <label className="text-sm font-medium text-[var(--color-text-dark)]">
                        Output filename
                      </label>
                      <input
                        type="text"
                        value={outputFilename}
                        onChange={(e) => setOutputFilename(e.target.value)}
                        placeholder="merged-document"
                        className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full md:w-64 focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mb-8">
                <button
                  type="button"
                  onClick={handleMerge}
                  disabled={files.length < 2 || isProcessing}
                  className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Merge PDF Files
                </button>
                <p className="text-sm text-[var(--color-text-muted)] mt-4">
                  Processing typically takes a few seconds
                </p>
              </div>

              {isProcessing && (
                <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-6 mb-8">
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
          </section>
        </main>

        <Footer />
      </div>
    );
  }

  // COMPRESS TOOL VIEW
  if (toolId === 'compress') {
    const selectedFile = files[0];

    return (
      <div className="flex flex-col min-h-screen bg-[var(--color-secondary)] text-[var(--color-text-dark)]">
        <Header />

        {/* Breadcrumb */}
        <section className="bg-white border-b border-[var(--color-border-gray)]">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center text-sm text-[var(--color-text-muted)]">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="hover:text-[var(--color-primary)] transition-colors"
              >
                Home
              </button>
              <FontAwesomeIcon icon={faChevronRight} className="mx-2 text-xs" />
              {tool && (
                <>
                  <button
                    type="button"
                    onClick={() => router.push(`/${toolId}`)}
                    className="hover:text-[var(--color-primary)] transition-colors"
                  >
                    {tool.title}
                  </button>
                  <FontAwesomeIcon icon={faChevronRight} className="mx-2 text-xs" />
                </>
              )}
              <span className="text-[var(--color-text-dark)] font-medium">Uploaded File</span>
            </div>
          </div>
        </section>

        <main className="flex-grow">
          {/* Header section */}
          <section className="py-8 bg-white border-b border-[var(--color-border-gray)]">
            <div className="container mx-auto px-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => router.push('/compress')}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">Your Uploaded File</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      Choose how strongly you want to compress your PDF
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push('/compress')}
                    className="border border-[var(--color-border-gray)] text-[var(--color-text-dark)] px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Choose Another File
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="py-8">
            <div className="container mx-auto px-6">
              {/* Selected file summary */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FontAwesomeIcon icon={faFilePdf} className="text-red-500 text-xl" />
                    <div>
                      <p className="font-medium text-[var(--color-text-dark)] truncate max-w-xs md:max-w-md">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/compress')}
                    className="text-[var(--color-danger)] hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Compression options */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">
                    Compression Options
                  </h3>
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

              {/* Info box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Compression is processed server-side using PyMuPDF for actual PDF
                  compression. This will reduce file size by compressing images and optimizing content.
                </p>
              </div>

              {/* Compress button */}
              <div className="text-center mb-8">
                <button
                  type="button"
                  onClick={handleCompress}
                  disabled={isProcessing}
                  className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Compress PDF File
                </button>
                <p className="text-sm text-[var(--color-text-muted)] mt-4">
                  Processing typically takes a few seconds
                </p>
              </div>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-6 mb-8">
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
          </section>
        </main>

        <Footer />
      </div>
    );
  }

  // SPLIT TOOL VIEW
  if (toolId === 'split') {
    const selectedFile = files[0];

    return (
      <div className="flex flex-col min-h-screen bg-[var(--color-secondary)] text-[var(--color-text-dark)]">
        <Header />

        {/* Breadcrumb */}
        <section className="bg-white border-b border-[var(--color-border-gray)]">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center text-sm text-[var(--color-text-muted)]">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="hover:text-[var(--color-primary)] transition-colors"
              >
                Home
              </button>
              <FontAwesomeIcon icon={faChevronRight} className="mx-2 text-xs" />
              {tool && (
                <>
                  <button
                    type="button"
                    onClick={() => router.push(`/${toolId}`)}
                    className="hover:text-[var(--color-primary)] transition-colors"
                  >
                    {tool.title}
                  </button>
                  <FontAwesomeIcon icon={faChevronRight} className="mx-2 text-xs" />
                </>
              )}
              <span className="text-[var(--color-text-dark)] font-medium">Uploaded File</span>
            </div>
          </div>
        </section>

        <main className="flex-grow">
          {/* Header section */}
          <section className="py-8 bg-white border-b border-[var(--color-border-gray)]">
            <div className="container mx-auto px-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => router.push('/split')}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="text-xl" />
                  </button>
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-dark)]">Your Uploaded File</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      Choose how you want to split your PDF
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push('/split')}
                    className="border border-[var(--color-border-gray)] text-[var(--color-text-dark)] px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    Choose Another File
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="py-8">
            <div className="container mx-auto px-6">
              {/* Selected file summary */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FontAwesomeIcon icon={faFilePdf} className="text-red-500 text-xl" />
                    <div>
                      <p className="font-medium text-[var(--color-text-dark)] truncate max-w-xs md:max-w-md">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/split')}
                    className="text-[var(--color-danger)] hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* Split options */}
              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">Split Options</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        Split mode
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="splitMode"
                            value="all"
                            checked={splitMode === 'all'}
                            onChange={(e) => setSplitMode(e.target.value as 'all')}
                            className="text-[var(--color-primary)]"
                          />
                          <span className="text-sm text-[var(--color-text-dark)]">
                            Split into individual pages (one PDF per page)
                          </span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="splitMode"
                            value="range"
                            checked={splitMode === 'range'}
                            onChange={(e) => setSplitMode(e.target.value as 'range')}
                            className="text-[var(--color-primary)]"
                          />
                          <span className="text-sm text-[var(--color-text-dark)]">
                            Extract page range
                          </span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="splitMode"
                            value="custom"
                            checked={splitMode === 'custom'}
                            onChange={(e) => setSplitMode(e.target.value as 'custom')}
                            className="text-[var(--color-primary)]"
                          />
                          <span className="text-sm text-[var(--color-text-dark)]">
                            Custom page selection (e.g., 1,3,5-10)
                          </span>
                        </label>
                      </div>
                    </div>
                    {splitMode === 'range' && (
                      <div>
                        <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                          Page range (e.g., 1-5)
                        </label>
                        <input
                          type="text"
                          value={pageRange}
                          onChange={(e) => setPageRange(e.target.value)}
                          placeholder="1-5"
                          className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                        />
                      </div>
                    )}
                    {splitMode === 'custom' && (
                      <div>
                        <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                          Page selection (e.g., 1,3,5-10,15)
                        </label>
                        <input
                          type="text"
                          value={pageRange}
                          onChange={(e) => setPageRange(e.target.value)}
                          placeholder="1,3,5-10,15"
                          className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Split button */}
              <div className="text-center mb-8">
                <button
                  type="button"
                  onClick={handleSplit}
                  disabled={isProcessing}
                  className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Split PDF File
                </button>
                <p className="text-sm text-[var(--color-text-muted)] mt-4">
                  Processing typically takes a few seconds
                </p>
              </div>

              {/* Progress Bar */}
              {isProcessing && (
                <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-6 mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--color-text-dark)]">
                      Splitting file...
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
          </section>
        </main>

        <Footer />
      </div>
    );
  }

  return null;
}

async function createMergedBlob(files: File[], outputFilename: string): Promise<{ blob: Blob; filename: string }> {
  try {
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        showError(`Warning: Could not process ${file.name}. It may be corrupted or encrypted.`);
      }
    }

    const pdfBytes = await mergedPdf.save();
    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const filename = `${outputFilename || 'merged-document'}.pdf`;

    return { blob, filename };
  } catch (error) {
    console.error('Error merging PDFs:', error);
    throw error;
  }
}

async function createCompressedResult(
  selectedFile: File,
  compressionLevel: 'low' | 'medium' | 'high'
): Promise<{
  blob: Blob;
  filename: string;
  fileCount: number;
  ratio: number;
  reduction: string;
  originalSize: number;
  finalSize: number;
}> {
  try {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('compressionLevel', compressionLevel);

    const response = await fetch('/api/compress-pdf', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to compress PDF' }));
      throw new Error(errorData.error || 'Failed to compress PDF');
    }

    const originalSize = parseInt(response.headers.get('X-Original-Size') || '0', 10);
    const compressedSize = parseInt(response.headers.get('X-Compressed-Size') || '0', 10);
    const compressionRatio = parseFloat(response.headers.get('X-Compression-Ratio') || '0');
    const sizeReduction = response.headers.get('X-Size-Reduction') || '0';

    const blob = await response.blob();
    const filename = selectedFile.name.replace(/\.pdf$/i, '') + '_compressed.pdf';

    return {
      blob,
      filename,
      fileCount: 1,
      ratio: compressionRatio,
      reduction: sizeReduction,
      originalSize,
      finalSize: compressedSize,
    };
  } catch (error) {
    console.error('Error compressing PDF:', error);
    throw error;
  }
}

async function createSplitResult(
  selectedFile: File,
  splitMode: 'all' | 'range' | 'custom',
  pageRange: string
): Promise<{ blob: Blob; filename: string; fileCount: number }> {
  try {
    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const pageCount = pdf.getPageCount();
    const baseName = selectedFile.name.replace('.pdf', '');

    if (splitMode === 'all') {
      // Split into individual pages (one PDF per page) and package as ZIP
      const zip = new JSZip();

      for (let i = 0; i < pageCount; i += 1) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdf, [i]);
        newPdf.addPage(copiedPage);

        const pdfBytes = await newPdf.save();
        zip.file(`${baseName}_page_${i + 1}.pdf`, pdfBytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const filename = `${baseName}_pages.zip`;

      return { blob: zipBlob, filename, fileCount: pageCount };
    } else if (splitMode === 'range') {
      const range = pageRange.trim();
      const match = range.match(/(\d+)-(\d+)/);

      if (!match) {
        throw new Error('Invalid page range format. Use format like "1-5"');
      }

      const startPage = parseInt(match[1], 10) - 1;
      const endPage = parseInt(match[2], 10) - 1;

      if (startPage < 0 || endPage >= pageCount || startPage > endPage) {
        throw new Error(`Invalid page range. PDF has ${pageCount} pages.`);
      }

      const pageIndices = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, pageIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const filename = `${baseName}_pages_${match[1]}-${match[2]}.pdf`;

      return { blob, filename, fileCount: pageIndices.length };
    } else if (splitMode === 'custom') {
      const pageNumbers = parsePageSelection(pageRange, pageCount);

      if (pageNumbers.length === 0) {
        throw new Error('No valid pages selected.');
      }

      const newPdf = await PDFDocument.create();
      const copiedPages = await newPdf.copyPages(pdf, pageNumbers);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const filename = `${baseName}_selected_pages.pdf`;

      return { blob, filename, fileCount: pageNumbers.length };
    }

    // Fallback – should not normally hit
    const emptyBlob = new Blob([], { type: 'application/pdf' });
    return { blob: emptyBlob, filename: `${baseName}_split.pdf`, fileCount: 0 };
  } catch (error) {
    console.error('Error splitting PDF:', error);
    throw error;
  }
}

function parsePageSelection(input: string, maxPages: number): number[] {
  const pages: number[] = [];
  const parts = input.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr.trim(), 10) - 1;
      const end = parseInt(endStr.trim(), 10) - 1;

      if (!Number.isNaN(start) && !Number.isNaN(end) && start >= 0 && end < maxPages && start <= end) {
        for (let i = start; i <= end; i += 1) {
          if (!pages.includes(i)) pages.push(i);
        }
      }
    } else {
      const pageNum = parseInt(trimmed, 10) - 1;
      if (!Number.isNaN(pageNum) && pageNum >= 0 && pageNum < maxPages && !pages.includes(pageNum)) {
        pages.push(pageNum);
      }
    }
  }

  return pages.sort((a, b) => a - b);
}

// Lightweight first-page preview for local PDF files
function FilePreview({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hadError, setHadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const renderPreview = async () => {
      try {
        setIsLoading(true);
        setHadError(false);

        // Dynamically load pdfjs only in the browser
        const pdfjs = await import('pdfjs-dist');
        const version = (pdfjs as any).version || '5.4.394';
        (pdfjs as any).GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = (pdfjs as any).getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);

        const viewport = page.getViewport({ scale: 0.4 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Unable to create canvas context');
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;

        const dataUrl = canvas.toDataURL('image/png');
        if (!cancelled) {
          setPreviewUrl(dataUrl);
        }
      } catch (err) {
        console.error('Error generating PDF preview:', err);
        if (!cancelled) {
          setHadError(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    renderPreview();

    return () => {
      cancelled = true;
    };
  }, [file]);

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={`${file.name} preview`}
        className="max-h-36 w-auto object-contain mx-auto rounded-md shadow-sm bg-white"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center text-[var(--color-text-muted)]">
      <FontAwesomeIcon icon={faFilePdf} className="text-red-500 text-4xl mb-2" />
      <span className="text-xs font-medium">
        {isLoading ? 'Loading preview…' : hadError ? 'Preview unavailable' : 'Page 1 Preview'}
      </span>
    </div>
  );
}


