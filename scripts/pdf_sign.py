#!/usr/bin/env python3
"""
Sign PDF using PyMuPDF.
Supports text signatures, image signatures, and positioning.
"""

import sys
import os
import base64
import tempfile

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF library not installed. Install it with: pip install PyMuPDF", file=sys.stderr)
    sys.exit(1)


def sign_pdf(pdf_path: str, output_path: str, signature_type: str, signature_data: str, 
              x: float, y: float, width: float = None, height: float = None, 
              page_num: int = 0) -> bool:
    """
    Sign a PDF with text or image signature.
    
    Args:
        pdf_path: Path to input PDF file
        output_path: Path to output PDF file
        signature_type: 'text' or 'image'
        signature_data: Text string or base64-encoded image data
        x: X position for signature (from left)
        y: Y position for signature (from top)
        width: Width for image signature (optional)
        height: Height for image signature (optional)
        page_num: Page number to sign (0-indexed, default: 0)
        
    Returns:
        True if signing successful, False otherwise
    """
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False
        
        # Open PDF
        doc = fitz.open(pdf_path)
        
        if page_num >= len(doc):
            print(f"ERROR: Page number {page_num} is out of range. PDF has {len(doc)} pages.", file=sys.stderr)
            doc.close()
            return False
        
        page = doc[page_num]
        page_rect = page.rect
        
        if signature_type == 'text':
            # Add text signature
            # PyMuPDF uses bottom-left origin, so we need to adjust Y
            # y is from top, convert to bottom-left origin
            y_from_bottom = page_rect.height - y
            
            # Insert text
            point = fitz.Point(x, y_from_bottom)
            page.insert_text(
                point,
                signature_data,
                fontsize=16,
                color=(0, 0, 0),  # Black
                fontname="helv"
            )
            
        elif signature_type == 'image':
            # Add image signature
            try:
                # Decode base64 image data
                image_data = base64.b64decode(signature_data)
                
                # Save to temporary file
                with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
                    tmp_file.write(image_data)
                    tmp_image_path = tmp_file.name
                
                try:
                    # Insert image
                    # Default dimensions if not provided
                    img_width = width if width else 150
                    img_height = height if height else 50
                    
                    # PyMuPDF uses bottom-left origin, so adjust Y
                    y_from_bottom = page_rect.height - y - img_height
                    
                    rect = fitz.Rect(x, y_from_bottom, x + img_width, y_from_bottom + img_height)
                    page.insert_image(rect, filename=tmp_image_path)
                    
                finally:
                    # Clean up temp file
                    if os.path.exists(tmp_image_path):
                        os.unlink(tmp_image_path)
                        
            except Exception as img_error:
                print(f"ERROR: Failed to insert image signature: {str(img_error)}", file=sys.stderr)
                doc.close()
                return False
        else:
            print(f"ERROR: Invalid signature type: {signature_type}. Must be 'text' or 'image'.", file=sys.stderr)
            doc.close()
            return False
        
        # Save the signed PDF
        doc.save(output_path)
        doc.close()
        
        return True
        
    except Exception as e:
        print(f"ERROR: Signing failed: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    if len(sys.argv) < 7:
        print("Usage: python pdf_sign.py <input_pdf> <output_pdf> <signature_type> <signature_data> <x> <y> [width] [height] [page_num]", file=sys.stderr)
        print("  signature_type: 'text' or 'image'", file=sys.stderr)
        print("  signature_data: Text string or base64-encoded image data", file=sys.stderr)
        print("  x, y: Position coordinates (from top-left)", file=sys.stderr)
        print("  width, height: Optional dimensions for image signature", file=sys.stderr)
        print("  page_num: Optional page number (0-indexed, default: 0)", file=sys.stderr)
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    signature_type = sys.argv[3]
    signature_data = sys.argv[4]
    x = float(sys.argv[5])
    y = float(sys.argv[6])
    width = float(sys.argv[7]) if len(sys.argv) > 7 and sys.argv[7] else None
    height = float(sys.argv[8]) if len(sys.argv) > 8 and sys.argv[8] else None
    page_num = int(sys.argv[9]) if len(sys.argv) > 9 and sys.argv[9] else 0
    
    success = sign_pdf(input_pdf, output_pdf, signature_type, signature_data, x, y, width, height, page_num)
    sys.exit(0 if success else 1)

