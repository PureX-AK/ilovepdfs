#!/usr/bin/env python3
"""
Rotate PDF pages using PyMuPDF.
Supports rotating all pages or specific pages by 90, 180, or 270 degrees.
"""

import sys
import os

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF library not installed. Install it with: pip install PyMuPDF", file=sys.stderr)
    sys.exit(1)


def rotate_pdf(pdf_path: str, output_path: str, rotation: int, apply_to_all: bool = True, page_numbers: list = None) -> bool:
    """
    Rotate PDF pages.
    
    Args:
        pdf_path: Path to input PDF file
        output_path: Path to output PDF file
        rotation: Rotation angle in degrees (90, 180, or 270)
        apply_to_all: If True, rotate all pages. If False, rotate only specified pages
        page_numbers: List of page numbers to rotate (0-indexed). Only used if apply_to_all is False
        
    Returns:
        True if rotation successful, False otherwise
    """
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False
        
        # Validate rotation angle
        if rotation not in [90, 180, 270]:
            print(f"ERROR: Invalid rotation angle: {rotation}. Must be 90, 180, or 270.", file=sys.stderr)
            return False
        
        # Open PDF
        doc = fitz.open(pdf_path)
        
        # Determine which pages to rotate
        if apply_to_all:
            pages_to_rotate = list(range(len(doc)))
        else:
            if page_numbers is None:
                pages_to_rotate = [0]  # Default to first page
            else:
                # Validate page numbers
                pages_to_rotate = [p for p in page_numbers if 0 <= p < len(doc)]
                if not pages_to_rotate:
                    print(f"ERROR: No valid page numbers provided.", file=sys.stderr)
                    doc.close()
                    return False
        
        # Rotate pages
        for page_num in pages_to_rotate:
            page = doc[page_num]
            # Get current rotation
            current_rotation = page.rotation
            # Calculate new rotation (add to current)
            new_rotation = (current_rotation + rotation) % 360
            # Set new rotation
            page.set_rotation(new_rotation)
        
        # Save the rotated PDF
        doc.save(output_path)
        doc.close()
        
        return True
        
    except Exception as e:
        print(f"ERROR: Rotation failed: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python pdf_rotate.py <input_pdf> <output_pdf> <rotation> [apply_to_all] [page_numbers]", file=sys.stderr)
        print("  rotation: Rotation angle in degrees (90, 180, or 270)", file=sys.stderr)
        print("  apply_to_all: 'true' or 'false' (default: true)", file=sys.stderr)
        print("  page_numbers: Comma-separated list of page numbers (0-indexed, e.g., '0,2,4')", file=sys.stderr)
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    rotation = int(sys.argv[3])
    apply_to_all = sys.argv[4].lower() == 'true' if len(sys.argv) > 4 else True
    page_numbers = None
    if len(sys.argv) > 5 and not apply_to_all:
        page_numbers = [int(p) for p in sys.argv[5].split(',')]
    
    success = rotate_pdf(input_pdf, output_pdf, rotation, apply_to_all, page_numbers)
    sys.exit(0 if success else 1)

