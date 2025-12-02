#!/usr/bin/env python3
"""
PDF to DOCX (pages as images) conversion script.

This script converts each PDF page to an image and embeds that image
into a DOCX page. The result preserves visual layout perfectly but
does NOT produce editable text.
"""

import sys
import os
import tempfile
import shutil
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF library not installed. Install it with: pip install PyMuPDF", file=sys.stderr)
    sys.exit(1)

try:
    from docx import Document
    from docx.shared import Inches
except ImportError:
    print("ERROR: python-docx library not installed. Install it with: pip install python-docx", file=sys.stderr)
    sys.exit(1)


def convert_pdf_to_image_docx(pdf_path: str, docx_path: str) -> bool:
    """
    Convert a PDF to a DOCX where each page is represented as a full-page image.

    Args:
        pdf_path: Path to the input PDF file.
        docx_path: Path to the output DOCX file.

    Returns:
        True if conversion succeeded, False otherwise.
    """
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False

        # Open PDF
        pdf_doc = fitz.open(pdf_path)

        # Prepare DOCX
        doc = Document()

        # temp directory for page images
        tmpdir = tempfile.mkdtemp(prefix="pdf2docx_images_")

        try:
            for page_index in range(len(pdf_doc)):
                page = pdf_doc[page_index]

                # Render page at reasonably high DPI for readability
                zoom = 2.0  # ~150-200 DPI depending on original
                mat = fitz.Matrix(zoom, zoom)
                pix = page.get_pixmap(matrix=mat)

                img_path = os.path.join(tmpdir, f"page_{page_index + 1}.png")
                pix.save(img_path)

                # New page in DOCX for each PDF page (except first where a section already exists)
                if page_index > 0:
                    doc.add_page_break()

                section = doc.sections[-1]
                # Calculate available width between margins
                page_width = section.page_width - section.left_margin - section.right_margin

                # Insert image scaled to page width
                doc.add_picture(img_path, width=page_width)

            # Save DOCX
            doc.save(docx_path)
            print(f"SUCCESS: Converted {pdf_path} to image-based DOCX {docx_path}")
            return True

        finally:
            pdf_doc.close()
            shutil.rmtree(tmpdir, ignore_errors=True)

    except Exception as e:
        print(f"ERROR: Image-based conversion failed: {str(e)}", file=sys.stderr)
        return False


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pdf_to_docx_images.py <input_pdf> <output_docx>", file=sys.stderr)
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_docx = sys.argv[2]

    ok = convert_pdf_to_image_docx(input_pdf, output_docx)
    sys.exit(0 if ok else 1)


