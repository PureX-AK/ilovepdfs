'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { toolsConfig } from '../../lib/tools';
import { useUploadWorkflow } from '../../contexts/UploadWorkflowContext';
import { saveDownloadResult } from '../../lib/workflow';
import { PDFDocument } from 'pdf-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowDown,
  faArrowLeft,
  faArrowUp,
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

  useEffect(() => {
    (async () => {
      const { tool } = await params;
      setToolId(tool);
    })();
  }, [params]);

  if (!toolId) {
    return null;
  }

  // Currently this page is implemented only for the merge tool
  if (toolId !== 'merge') {
    router.push(`/${toolId}`);
    return null;
  }

  const tool = toolsConfig[toolId];
  const files = getFiles(toolId);

  if (!files.length) {
    // No files uploaded yet, go back to main tool page
    router.push(`/${toolId}`);
    return null;
  }

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(toolId, next);
  };

  const moveFile = (index: number, direction: 'up' | 'down') => {
    const next = [...files];
    if (direction === 'up' && index > 0) {
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
    } else if (direction === 'down' && index < files.length - 1) {
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
    }
    setFiles(toolId, next);
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
                      className="bg-white rounded-xl border-2 border-[var(--color-border-gray)] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200"
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
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => moveFile(index, 'up')}
                              disabled={index === 0}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:bg-gray-100"
                              title="Move up"
                            >
                              <FontAwesomeIcon icon={faArrowUp} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveFile(index, 'down')}
                              disabled={index === files.length - 1}
                              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed rounded-md hover:bg-gray-100"
                              title="Move down"
                            >
                              <FontAwesomeIcon icon={faArrowDown} />
                            </button>
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


