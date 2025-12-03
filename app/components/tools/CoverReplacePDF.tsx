'use client';

import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
} from '@fortawesome/free-solid-svg-icons';
import { validateFileSize, showError, showLoading, updateToError, updateToSuccess } from '../../lib/utils';

type OverlayRect = {
  id: string;
  pageIndex: number; // 0-based
  normX: number;
  normY: number;
  normWidth: number;
  normHeight: number;
  text: string;
  fontSize: number;
  color: string;
};

interface PageEditorProps {
  pageIndex: number;
  file: File;
  overlays: OverlayRect[];
  onAddOverlay: (overlay: OverlayRect) => void;
}

function PageEditor({ pageIndex, file, overlays, onAddOverlay }: PageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // Render this page of the PDF into the canvas
  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        const version = (pdfjs as any).version || '5.4.394';
        (pdfjs as any).GlobalWorkerOptions.workerSrc =
          `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = (pdfjs as any).getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(pageIndex + 1);

        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;

        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Unable to get canvas context');
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setCanvasSize({ width: viewport.width, height: viewport.height });

        await page.render({ canvasContext: context, viewport }).promise;
      } catch (err) {
        console.error('Error rendering PDF page:', err);
        showError('Unable to render this PDF page for editing.');
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [file, pageIndex]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasSize || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawCurrent({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !drawStart || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !drawStart || !drawCurrent || !canvasSize) {
      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    const startX = drawStart.x;
    const startY = drawStart.y;
    const endX = drawCurrent.x;
    const endY = drawCurrent.y;

    const x = Math.min(startX, endX);
    const y = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);

    // Ignore tiny rectangles
    if (width < 5 || height < 5) {
      return;
    }

    const normX = x / canvasSize.width;
    const normY = y / canvasSize.height;
    const normWidth = width / canvasSize.width;
    const normHeight = height / canvasSize.height;

    const text = window.prompt('Enter replacement text (leave empty to just white-out):', '') ?? '';
    const fontSizeStr = window.prompt('Font size (optional, default 12):', '');
    const fontSize = fontSizeStr && !isNaN(Number(fontSizeStr)) ? Number(fontSizeStr) : 12;

    const overlay: OverlayRect = {
      id: `${pageIndex}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      pageIndex,
      normX,
      normY,
      normWidth,
      normHeight,
      text,
      fontSize,
      color: '#000000',
    };

    onAddOverlay(overlay);
  };

  const pageOverlays = overlays.filter((o) => o.pageIndex === pageIndex);

  return (
    <div className="mb-8">
      <h3 className="text-md font-semibold text-[var(--color-text-dark)] mb-2">
        Page {pageIndex + 1}
      </h3>
      <div
        ref={containerRef}
        className="relative inline-block border border-[var(--color-border-gray)] bg-gray-100"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <canvas ref={canvasRef} className="block max-w-full h-auto" />

        {/* Existing overlays */}
        {canvasSize &&
          pageOverlays.map((overlay) => {
            const { normX, normY, normWidth, normHeight, text } = overlay;
            const left = normX * canvasSize.width;
            const top = normY * canvasSize.height;
            const width = normWidth * canvasSize.width;
            const height = normHeight * canvasSize.height;

            return (
              <div
                key={overlay.id}
                className="absolute border border-blue-500 bg-white bg-opacity-90 text-xs text-black p-1 overflow-hidden"
                style={{
                  left,
                  top,
                  width,
                  height,
                }}
              >
                {text}
              </div>
            );
          })}

        {/* Live drawing rectangle */}
        {isDrawing && drawStart && drawCurrent && (
          <div
            className="absolute border border-dashed border-blue-400 bg-blue-200 bg-opacity-30 pointer-events-none"
            style={{
              left: Math.min(drawStart.x, drawCurrent.x),
              top: Math.min(drawStart.y, drawCurrent.y),
              width: Math.abs(drawCurrent.x - drawStart.x),
              height: Math.abs(drawCurrent.y - drawStart.y),
            }}
          />
        )}
      </div>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
        Drag to draw a white rectangle over text you want to hide, then enter the new text.
      </p>
    </div>
  );
}

export default function CoverReplacePDF() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [overlays, setOverlays] = useState<OverlayRect[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSelectFile = async (f: File) => {
    if (!validateFileSize(f)) return;
    if (f.type !== 'application/pdf') {
      showError('Please select a PDF file.');
      return;
    }
    setFile(f);
    setOverlays([]);

    try {
      const pdfjs = await import('pdfjs-dist');
      const version = (pdfjs as any).version || '5.4.394';
      (pdfjs as any).GlobalWorkerOptions.workerSrc =
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await f.arrayBuffer();
      const loadingTask = (pdfjs as any).getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      setPageCount(pdfDoc.numPages || 1);
    } catch (err) {
      console.error('Error loading PDF:', err);
      showError('Unable to open this PDF for editing.');
      setFile(null);
      setPageCount(null);
    }
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
      (file) => file.type === 'application/pdf'
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

  const handleAddOverlay = (overlay: OverlayRect) => {
    setOverlays((prev) => [...prev, overlay]);
  };

  const handleApplyEdits = async () => {
    if (!file) {
      showError('Please select a PDF first.');
      return;
    }
    if (!overlays.length) {
      showError('Please add at least one white rectangle with text.');
      return;
    }

    const toastId = showLoading('Applying edits to PDF...');
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('overlays', JSON.stringify(overlays));

      const response = await fetch('/api/pdf-cover-replace', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to apply edits to PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name.replace(/\.pdf$/i, '') + '_edited.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      updateToSuccess(toastId, 'PDF edited successfully! Download started.');
    } catch (error) {
      console.error('PDF cover-replace error:', error);
      updateToError(toastId, 'An error occurred while editing the PDF. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto">
          {/* Upload Area */}
          {!file && (
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
                  Upload your PDF to cover & replace text
                </h3>
                <p className="text-[var(--color-text-muted)] mb-6">
                  We&apos;ll let you draw white rectangles over the PDF and type new text on top.
                </p>
                <label htmlFor="cover-replace-file-input" className="cursor-pointer">
                  <span className="bg-[var(--color-primary)] text-white px-6 py-3 rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors inline-flex items-center gap-2">
                    <FontAwesomeIcon icon={faFolderOpen} />
                    Choose File
                  </span>
                </label>
                <input
                  type="file"
                  id="cover-replace-file-input"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-4">
                  Supports PDF files up to 25MB
                </p>
              </div>
            </div>
          )}

          {/* Editor */}
          {file && pageCount && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-6 mb-6">
                <h2 className="text-lg font-semibold text-[var(--color-text-dark)] mb-2">
                  Draw white rectangles and enter replacement text
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  For each area you want to change, drag to draw a box over the old content, then type the new text.
                  We&apos;ll cover the original content with white and place your text on top in the final PDF.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] p-6 mb-8 overflow-auto">
                {Array.from({ length: pageCount }).map((_, index) => (
                  <PageEditor
                    key={index}
                    pageIndex={index}
                    file={file}
                    overlays={overlays}
                    onAddOverlay={handleAddOverlay}
                  />
                ))}
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleApplyEdits}
                  disabled={isProcessing || !overlays.length}
                  className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing PDF...' : 'Apply edits and download PDF'}
                </button>
                <p className="text-sm text-[var(--color-text-muted)] mt-4">
                  We&apos;ll create a new PDF with your white rectangles and replacement text.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}


