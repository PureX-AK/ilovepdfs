'use client';

import { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faFilePdf,
  faTrash,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { validateFileSize, showError, showSuccess, showLoading, updateToSuccess, updateToError, formatFileSize } from '../../lib/utils';

interface SignaturePlacement {
  x: number;
  y: number;
  pageNum: number;
  type: 'text' | 'image';
  data: string;
  width?: number;
  height?: number;
}

export default function SignPDF() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [signatureType, setSignatureType] = useState<'draw' | 'type' | 'upload'>('type');
  const [signatureText, setSignatureText] = useState('');
  const [signatures, setSignatures] = useState<SignaturePlacement[]>([]);
  const [isPlacingSignature, setIsPlacingSignature] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfViewerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (file) => file.type === 'application/pdf'
    );
    if (files.length > 0 && validateFileSize(files[0])) {
      const file = files[0];
      setSelectedFile(file);
      setSignatures([]);
      
      // Create URL for PDF viewer
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      
      // Load PDF to get page count
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        setPdfDoc(pdf);
        const pages = pdf.getPages();
        setTotalPages(pages.length);
        setCurrentPage(0);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (validateFileSize(file)) {
        setSelectedFile(file);
        setSignatures([]);
        
        // Create URL for PDF viewer
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
        
        // Load PDF to get page count
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await PDFDocument.load(arrayBuffer);
          setPdfDoc(pdf);
          const pages = pdf.getPages();
          setTotalPages(pages.length);
          setCurrentPage(0);
        } catch (error) {
          console.error('Error loading PDF:', error);
        }
      }
    }
  };

  const handlePlaceSignature = () => {
    if (signatureType === 'type' && !signatureText.trim()) {
      showError('Please enter your signature text.');
      return;
    }
    if (signatureType === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx || canvas.width === 0 || canvas.height === 0) {
        showError('Please draw your signature.');
        return;
      }
    }
    setIsPlacingSignature(true);
  };

  const handlePdfClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacingSignature || !pdfViewerRef.current) return;
    
    // Check if clicking on a signature overlay (don't place new one)
    if ((e.target as HTMLElement).closest('.signature-overlay')) {
      return;
    }
    
    const rect = pdfViewerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Get signature data
    let signatureData = '';
    let width = 150;
    let height = 50;
    
    if (signatureType === 'type') {
      if (!signatureText.trim()) {
        showError('Please enter signature text first.');
        setIsPlacingSignature(false);
        return;
      }
      signatureData = signatureText;
    } else if (signatureType === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      // Check if canvas has content
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      const hasContent = imageData?.data.some((val, idx) => idx % 4 !== 3 && val !== 0);
      if (!hasContent) {
        showError('Please draw your signature first.');
        setIsPlacingSignature(false);
        return;
      }
      signatureData = canvas.toDataURL('image/png');
    } else {
      return;
    }
    
    // Add signature placement
    const newSignature: SignaturePlacement = {
      x,
      y,
      pageNum: currentPage,
      type: signatureType === 'type' ? 'text' : 'image',
      data: signatureData,
      width: signatureType === 'draw' ? width : undefined,
      height: signatureType === 'draw' ? height : undefined,
    };
    
    setSignatures([...signatures, newSignature]);
    setIsPlacingSignature(false);
  };

  const handleSign = async () => {
    if (!selectedFile || !pdfDoc) {
      showError('Please select a PDF file to sign.');
      return;
    }

    if (signatures.length === 0) {
      showError('Please place at least one signature on the PDF.');
      return;
    }

    const toastId = showLoading('Signing PDF...');
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
      await signPDF();
      setProgress(100);
      setTimeout(() => {
        setIsProcessing(false);
        setProgress(0);
        updateToSuccess(toastId, 'PDF signed successfully! Download started.');
      }, 500);
    } catch (error) {
      clearInterval(progressInterval);
      setIsProcessing(false);
      setProgress(0);
      updateToError(toastId, 'An error occurred while signing the PDF. Please try again.');
      console.error('Sign error:', error);
    }
  };

  const signPDF = async () => {
    if (!selectedFile || !pdfDoc) return;

    try {
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      // Apply all signatures
      for (const sig of signatures) {
        if (sig.pageNum >= pdfDoc.getPageCount()) continue;
        
        const page = pdfDoc.getPage(sig.pageNum);
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        // Convert click coordinates to PDF coordinates
        // Get actual viewer dimensions
        const viewerWidth = pdfViewerRef.current?.clientWidth || 800;
        const viewerHeight = 600; // Approximate iframe height
        
        // Calculate scale factors
        const scaleX = pageWidth / viewerWidth;
        const scaleY = pageHeight / viewerHeight;
        
        const pdfX = sig.x * scaleX;
        const pdfY = pageHeight - (sig.y * scaleY); // PDF uses bottom-left origin
        
        if (sig.type === 'text') {
          page.drawText(sig.data, {
            x: pdfX,
            y: pdfY,
          size: 16,
          font: font,
          color: rgb(0, 0, 0),
        });
        } else if (sig.type === 'image') {
          // Extract base64 image data
          const base64Data = sig.data.replace(/^data:image\/[a-z]+;base64,/, '');
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
        
          const image = await pdfDoc.embedPng(bytes);
          const imgWidth = sig.width || 150;
          const imgHeight = sig.height || 50;
          
          page.drawImage(image, {
            x: pdfX,
            y: pdfY - imgHeight, // Adjust for bottom-left origin
            width: imgWidth,
            height: imgHeight,
        });
        }
      }
      
      // Save signed PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace(/\.pdf$/i, '') + '_signed.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error signing PDF:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (canvasRef.current && signatureType === 'draw') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [signatureType]);

  // Cleanup PDF URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
                <div className="flex items-center justify-between mb-4">
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
                    onClick={() => {
                      setSelectedFile(null);
                      setPdfUrl(null);
                      setSignatures([]);
                      setPdfDoc(null);
                      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
                    }}
                    className="text-[var(--color-danger)] hover:bg-red-50 p-2 rounded"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
                
                {/* PDF Viewer */}
                {pdfUrl && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-[var(--color-text-dark)]">
                        Page {currentPage + 1} of {totalPages}
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                          disabled={currentPage === 0}
                          className="px-3 py-1 text-sm bg-gray-100 rounded disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                          disabled={currentPage >= totalPages - 1}
                          className="px-3 py-1 text-sm bg-gray-100 rounded disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                    <div
                      ref={pdfViewerRef}
                      className={`border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100 ${
                        isPlacingSignature ? 'border-blue-500' : ''
                      }`}
                      style={{ minHeight: '600px', position: 'relative' }}
                    >
                      <iframe
                        src={`${pdfUrl}#page=${currentPage + 1}`}
                        className="w-full"
                        style={{ 
                          height: '600px', 
                          border: 'none',
                          pointerEvents: isPlacingSignature ? 'none' : 'auto'
                        }}
                        title="PDF Viewer"
                      />
                      {/* Click overlay for signature placement */}
                      {isPlacingSignature && (
                        <div
                          onClick={handlePdfClick}
                          className="absolute inset-0 cursor-crosshair z-20"
                          style={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}
                        />
                      )}
                      
                      {/* Show placed signatures as overlays */}
                      {signatures
                        .filter(sig => sig.pageNum === currentPage)
                        .map((sig, idx) => {
                          const sigIndex = signatures.findIndex(s => s === sig);
                          return (
                            <div
                              key={sigIndex}
                              className="signature-overlay absolute border-2 border-blue-500 bg-blue-100 bg-opacity-50 rounded p-1 text-xs flex items-center gap-1"
                              style={{
                                left: `${sig.x}px`,
                                top: `${sig.y}px`,
                                pointerEvents: 'auto',
                                zIndex: 10,
                              }}
                            >
                              <span>{sig.type === 'text' ? sig.data : '📝'}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSignatures(signatures.filter((_, i) => i !== sigIndex));
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <FontAwesomeIcon icon={faTimes} size="xs" />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                    {isPlacingSignature && (
                      <p className="mt-2 text-sm text-blue-600">
                        Click on the PDF to place your signature
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Signature Options */}
          {selectedFile && (
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border-gray)] mb-8">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-[var(--color-text-dark)] mb-4">Signature Options</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                      Signature type
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="signatureType"
                          value="type"
                          checked={signatureType === 'type'}
                          onChange={(e) => setSignatureType(e.target.value as 'type')}
                          className="text-[var(--color-primary)]"
                        />
                        <span className="text-sm text-[var(--color-text-dark)]">Type signature</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="signatureType"
                          value="draw"
                          checked={signatureType === 'draw'}
                          onChange={(e) => setSignatureType(e.target.value as 'draw')}
                          className="text-[var(--color-primary)]"
                        />
                        <span className="text-sm text-[var(--color-text-dark)]">Draw signature</span>
                      </label>
                    </div>
                  </div>
                  
                  {signatureType === 'type' && (
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        Signature text
                      </label>
                      <input
                        type="text"
                        value={signatureText}
                        onChange={(e) => setSignatureText(e.target.value)}
                        placeholder="Your name"
                        className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                  )}
                  
                  {signatureType === 'draw' && (
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        Draw your signature
                      </label>
                      <div className="border border-[var(--color-border-gray)] rounded-lg p-4 bg-gray-50">
                        <canvas
                          ref={canvasRef}
                          width={400}
                          height={150}
                          className="border border-gray-300 bg-white cursor-crosshair"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                        />
                        <button
                          onClick={clearCanvas}
                          className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4">
                    <button
                      onClick={handlePlaceSignature}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                        isPlacingSignature
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
                      }`}
                    >
                      {isPlacingSignature ? 'Cancel Placement' : 'Place Signature on PDF'}
                    </button>
                    {signatures.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-[var(--color-text-muted)] mb-2">
                          {signatures.length} signature(s) placed
                        </p>
                        <button
                          onClick={() => setSignatures([])}
                          className="text-sm text-red-500 hover:underline"
                        >
                          Clear all signatures
                        </button>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sign Button */}
          {selectedFile && !isProcessing && (
            <div className="text-center">
              <button
                onClick={handleSign}
                className="bg-[var(--color-primary)] text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--color-primary-hover)] transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Sign PDF
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
                  Signing PDF...
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

