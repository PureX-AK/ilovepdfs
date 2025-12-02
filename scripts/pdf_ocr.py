#!/usr/bin/env python3
"""
PDF OCR using Tesseract OCR.
Converts scanned PDFs (image-based) to searchable PDFs with text layers.
"""

import sys
import os
import io
import tempfile
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF library not installed. Install it with: pip install PyMuPDF", file=sys.stderr)
    sys.exit(1)

try:
    import pytesseract
    from PIL import Image
except ImportError:
    print("ERROR: Required OCR libraries not installed. Install with: pip install pytesseract pillow", file=sys.stderr)
    sys.exit(1)


def perform_ocr_on_pdf(pdf_path: str, output_path: str, language: str = 'eng') -> bool:
    """
    Perform OCR on a scanned PDF and create a searchable PDF with text layers.
    
    Args:
        pdf_path: Path to input PDF file (scanned/image-based)
        output_path: Path to output PDF file (searchable with text layer)
        language: Tesseract language code (default: 'eng')
        
    Returns:
        True if conversion successful, False otherwise
    """
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False

        # Open the PDF
        doc = fitz.open(pdf_path)

        # --- Fast path: if PDF already has selectable text, just copy it ---
        try:
            has_text = False
            for page_index in range(len(doc)):
                page = doc[page_index]
                text = page.get_text("text") or ""
                if text.strip():
                    has_text = True
                    break

            if has_text:
                # Close before copying
                doc.close()
                # Simply copy original PDF to output; no rasterization, no OCR
                with open(pdf_path, "rb") as src, open(output_path, "wb") as dst:
                    dst.write(src.read())
                print("INFO: PDF already contains text. Skipping OCR and copying original file.", file=sys.stderr)
                return True
        except Exception as text_check_error:
            # If text detection fails, log and continue with OCR path
            print(f"WARNING: Failed to inspect PDF text, proceeding with OCR: {text_check_error}", file=sys.stderr)

        # Create output PDF
        output_doc = fitz.open()

        # Process each page using Tesseract's own PDF output for better text mapping
        for page_num in range(len(doc)):
            page = doc[page_num]

            # Render page to high-DPI image for OCR
            zoom = 3.0  # ~300 DPI
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)

            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))

            try:
                # Let Tesseract generate a PDF page with text layer and embedded image
                pdf_bytes = pytesseract.image_to_pdf_or_hocr(
                    img,
                    lang=language,
                    config="--oem 3 --psm 6",
                    extension="pdf",
                )

                # Open that single-page PDF and append it to the output document
                ocr_page_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                output_doc.insert_pdf(ocr_page_doc)
                ocr_page_doc.close()
            except Exception as ocr_error:
                print(f"WARNING: OCR failed on page {page_num + 1}: {str(ocr_error)}", file=sys.stderr)
                # As a fallback, copy the original page without OCR
                output_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
                continue

        # Save the output PDF
        output_doc.save(output_path)
        output_doc.close()
        doc.close()

        return True
        
    except Exception as e:
        print(f"ERROR: OCR processing failed: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python pdf_ocr.py <input_pdf> <output_pdf> [language]", file=sys.stderr)
        print("Example: python pdf_ocr.py input.pdf output.pdf eng", file=sys.stderr)
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    language = sys.argv[3] if len(sys.argv) > 3 else 'eng'
    
    success = perform_ocr_on_pdf(input_pdf, output_pdf, language)
    sys.exit(0 if success else 1)

