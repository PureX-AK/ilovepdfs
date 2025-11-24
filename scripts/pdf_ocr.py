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
        
        # Create output PDF
        output_doc = fitz.open()
        
        # Process each page
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Get page dimensions
            page_rect = page.rect
            
            # Create a new page in output PDF with same dimensions
            output_page = output_doc.new_page(width=page_rect.width, height=page_rect.height)
            
            # First, copy the original page image to preserve visual content
            output_page.show_pdf_page(
                page_rect,
                doc,
                page_num
            )
            
            # Convert page to image (pixmap) for OCR
            # Use higher DPI for better OCR accuracy (300 DPI recommended)
            zoom = 2.0  # 2x zoom = ~144 DPI, increase for better quality
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert pixmap to PIL Image
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            # Perform OCR on the image
            try:
                # Get OCR data with bounding boxes
                ocr_data = pytesseract.image_to_data(img, lang=language, output_type=pytesseract.Output.DICT)
                
                # Extract text and positions
                n_boxes = len(ocr_data['text'])
                text_inserted = False
                
                for i in range(n_boxes):
                    text = ocr_data['text'][i].strip()
                    if text:  # Only process non-empty text
                        # Get bounding box coordinates
                        x = ocr_data['left'][i] / zoom  # Scale back to original size
                        y = ocr_data['top'][i] / zoom
                        w = ocr_data['width'][i] / zoom
                        h = ocr_data['height'][i] / zoom
                        conf = ocr_data['conf'][i]
                        
                        # Only add text if confidence is reasonable (> 30)
                        if conf > 30:
                            # Create a text box (rect) for the text
                            rect = fitz.Rect(x, y, x + w, y + h)
                            
                            # Insert invisible text (render_mode=3 makes it invisible but searchable)
                            # This preserves the visual appearance while making text searchable
                            try:
                                # Try to insert text with invisible rendering
                                rc = output_page.insert_textbox(
                                    rect,
                                    text,
                                    fontsize=max(8, h),
                                    fontname="helv",
                                    align=0,  # Left align
                                    render_mode=3  # Invisible text (searchable but not visible)
                                )
                                if rc >= 0:  # Success
                                    text_inserted = True
                            except:
                                # Fallback: insert text at position (may be visible but searchable)
                                try:
                                    output_page.insert_text(
                                        (x, y + h),
                                        text,
                                        fontsize=max(8, h),
                                        fontname="helv",
                                        render_mode=3  # Invisible text
                                    )
                                    text_inserted = True
                                except:
                                    # Last resort: insert visible text
                                    output_page.insert_text(
                                        (x, y + h),
                                        text,
                                        fontsize=max(8, h),
                                        fontname="helv"
                                    )
                                    text_inserted = True
                
                # If no text was inserted from boxes, try plain text extraction as fallback
                if not text_inserted:
                    ocr_text = pytesseract.image_to_string(img, lang=language)
                    if ocr_text.strip():
                        # Add text as invisible layer at top of page
                        try:
                            output_page.insert_text(
                                (50, 50),
                                ocr_text,
                                fontsize=12,
                                fontname="helv",
                                render_mode=3  # Invisible but searchable
                            )
                        except:
                            # Fallback without render_mode
                            output_page.insert_text(
                                (50, 50),
                                ocr_text,
                                fontsize=12,
                                fontname="helv"
                            )
                
            except Exception as ocr_error:
                print(f"WARNING: OCR failed on page {page_num + 1}: {str(ocr_error)}", file=sys.stderr)
                # Continue with next page even if OCR fails
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

