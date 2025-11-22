'use client';

import { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCloudArrowUp,
  faFolderOpen,
  faFilePdf,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { validateFileSize, showError, showSuccess, showLoading, updateToSuccess, updateToError, formatFileSize } from '../../lib/utils';

export default function SignPDF() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [signatureType, setSignatureType] = useState<'draw' | 'type' | 'upload'>('type');
  const [signatureText, setSignatureText] = useState('');
  const [signatureX, setSignatureX] = useState('50');
  const [signatureY, setSignatureY] = useState('100');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

  const handleSign = async () => {
    if (!selectedFile) {
      showError('Please select a PDF file to sign.');
      return;
    }

    if (signatureType === 'type' && !signatureText.trim()) {
      showError('Please enter your signature text.');
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
    if (!selectedFile) return;

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      
      const pages = pdf.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      if (signatureType === 'type') {
        // Add typed signature
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        firstPage.drawText(signatureText, {
          x: parseFloat(signatureX),
          y: height - parseFloat(signatureY),
          size: 16,
          font: font,
          color: rgb(0, 0, 0),
        });
      } else if (signatureType === 'draw' && canvasRef.current) {
        // Add drawn signature
        const canvas = canvasRef.current;
        const imageBytes = await new Promise<Uint8Array>((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) {
              blob.arrayBuffer().then(buffer => resolve(new Uint8Array(buffer)));
            }
          }, 'image/png');
        });
        
        const signatureImage = await pdf.embedPng(imageBytes);
        firstPage.drawImage(signatureImage, {
          x: parseFloat(signatureX),
          y: height - parseFloat(signatureY) - 50,
          width: 150,
          height: 50,
        });
      }
      
      // Save signed PDF
      const pdfBytes = await pdf.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = selectedFile.name.replace('.pdf', '') + '_signed.pdf';
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        X position
                      </label>
                      <input
                        type="number"
                        value={signatureX}
                        onChange={(e) => setSignatureX(e.target.value)}
                        className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--color-text-dark)] block mb-2">
                        Y position
                      </label>
                      <input
                        type="number"
                        value={signatureY}
                        onChange={(e) => setSignatureY(e.target.value)}
                        className="border border-[var(--color-border-gray)] rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
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

