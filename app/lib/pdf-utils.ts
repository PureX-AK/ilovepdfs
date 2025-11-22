import { PDFDocument, rgb } from 'pdf-lib';

// Helper function to read file as ArrayBuffer
export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Helper function to download PDF
export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Merge PDFs
export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf = await PDFDocument.load(arrayBuffer);
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach((page) => mergedPdf.addPage(page));
  }
  
  return await mergedPdf.save();
}

// Split PDF - Extract specific pages
export async function splitPDF(
  file: File,
  pageRanges: { start: number; end: number }[]
): Promise<Uint8Array[]> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  const totalPages = pdf.getPageCount();
  
  const splitPdfs: Uint8Array[] = [];
  
  for (const range of pageRanges) {
    const newPdf = await PDFDocument.create();
    const startPage = Math.max(0, range.start - 1);
    const endPage = Math.min(totalPages, range.end);
    
    for (let i = startPage; i < endPage; i++) {
      const [page] = await newPdf.copyPages(pdf, [i]);
      newPdf.addPage(page);
    }
    
    splitPdfs.push(await newPdf.save());
  }
  
  return splitPdfs;
}

// Split PDF - One page per file
export async function splitPDFByPages(file: File): Promise<Uint8Array[]> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  const totalPages = pdf.getPageCount();
  
  const splitPdfs: Uint8Array[] = [];
  
  for (let i = 0; i < totalPages; i++) {
    const newPdf = await PDFDocument.create();
    const [page] = await newPdf.copyPages(pdf, [i]);
    newPdf.addPage(page);
    splitPdfs.push(await newPdf.save());
  }
  
  return splitPdfs;
}

// Compress PDF (basic compression by removing unnecessary objects)
export async function compressPDF(file: File): Promise<Uint8Array> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  
  // Re-save to remove unnecessary objects (basic compression)
  return await pdf.save({ useObjectStreams: false });
}

// Rotate PDF pages
export async function rotatePDF(
  file: File,
  angle: 90 | 180 | 270,
  pageIndices?: number[]
): Promise<Uint8Array> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  const totalPages = pdf.getPageCount();
  
  const pagesToRotate = pageIndices || Array.from({ length: totalPages }, (_, i) => i);
  
  pagesToRotate.forEach((pageIndex) => {
    const page = pdf.getPage(pageIndex);
    const currentRotation = page.getRotation().angle;
    page.setRotation({ angle: currentRotation + angle } as any);
  });
  
  return await pdf.save();
}

// Organize PDF - Reorder pages
export async function organizePDF(
  file: File,
  pageOrder: number[]
): Promise<Uint8Array> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  
  for (const pageIndex of pageOrder) {
    if (pageIndex >= 0 && pageIndex < pdf.getPageCount()) {
      const [page] = await newPdf.copyPages(pdf, [pageIndex]);
      newPdf.addPage(page);
    }
  }
  
  return await newPdf.save();
}

// Add watermark to PDF
export async function addWatermark(
  file: File,
  watermarkText: string,
  options?: {
    fontSize?: number;
    opacity?: number;
    color?: { r: number; g: number; b: number };
    position?: 'center' | 'top' | 'bottom';
  }
): Promise<Uint8Array> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  
  // Note: pdf-lib doesn't have built-in text watermark, so we'll use a simple approach
  // For production, you might want to use a more advanced library
  const pages = pdf.getPages();
  const fontSize = options?.fontSize || 50;
  const opacity = options?.opacity || 0.3;
  const color = options?.color || { r: 0.7, g: 0.7, b: 0.7 };
  
  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const x = width / 2;
    const y = options?.position === 'top' ? height - 50 : 
              options?.position === 'bottom' ? 50 : height / 2;
    
    page.drawText(watermarkText, {
      x,
      y,
      size: fontSize,
      opacity,
      color: rgb(color.r, color.g, color.b),
      rotate: { angle: -45, x, y } as any,
    });
  });
  
  return await pdf.save();
}

// Unlock PDF (remove password protection)
export async function unlockPDF(file: File, password: string): Promise<Uint8Array> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    // pdf-lib doesn't support password-protected PDFs directly
    // This would require a different library or server-side processing
    // For now, we'll just try to load it
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return await pdf.save();
  } catch (error) {
    throw new Error('Failed to unlock PDF. The file may require a password or be corrupted.');
  }
}

// Protect PDF (add password - note: pdf-lib doesn't support encryption directly)
// This would require server-side processing or a different library
export async function protectPDF(
  file: File,
  password: string
): Promise<Uint8Array> {
  // pdf-lib doesn't support password protection
  // This is a placeholder - would need server-side implementation
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  return await pdf.save();
}

// Convert images to PDF
export async function imagesToPDF(files: File[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    let image;
    
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
      image = await pdf.embedJpg(arrayBuffer);
    } else if (file.type === 'image/png') {
      image = await pdf.embedPng(arrayBuffer);
    } else {
      continue; // Skip unsupported image types
    }
    
    const page = pdf.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });
  }
  
  return await pdf.save();
}

// Repair PDF (try to fix corrupted PDF)
export async function repairPDF(file: File): Promise<Uint8Array> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return await pdf.save();
  } catch (error) {
    throw new Error('Failed to repair PDF. The file may be too corrupted.');
  }
}

// Add page numbers to PDF
export async function addPageNumbers(
  file: File,
  options?: {
    position?: 'top' | 'bottom';
    fontSize?: number;
    startFrom?: number;
  }
): Promise<Uint8Array> {
  const arrayBuffer = await readFileAsArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  const pages = pdf.getPages();
  const position = options?.position || 'bottom';
  const fontSize = options?.fontSize || 12;
  const startFrom = options?.startFrom || 1;
  
  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    const pageNumber = startFrom + index;
    const y = position === 'top' ? height - 20 : 20;
    
    page.drawText(`${pageNumber}`, {
      x: width / 2,
      y,
      size: fontSize,
      color: rgb(0, 0, 0),
    });
  });
  
  return await pdf.save();
}

