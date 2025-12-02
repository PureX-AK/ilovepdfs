#!/usr/bin/env python3
"""
PDF to DOCX conversion script using pdf2docx library
This script converts a PDF file to DOCX format with better formatting preservation.
"""

import sys
import os
from pathlib import Path

try:
    from pdf2docx import Converter
except ImportError:
    print("ERROR: pdf2docx library not installed. Install it with: pip install pdf2docx", file=sys.stderr)
    sys.exit(1)

def convert_pdf_to_docx(pdf_path: str, docx_path: str) -> bool:
    """
    Convert PDF to DOCX using pdf2docx library.
    
    Args:
        pdf_path: Path to input PDF file
        docx_path: Path to output DOCX file
        
    Returns:
        True if conversion successful, False otherwise
    """
    try:
        # Check if PDF file exists
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False
        
        # Create converter instance
        cv = Converter(pdf_path)

        # Convert PDF to DOCX
        # Use layout_mode="exact" for better preservation of complex layouts/tables
        cv.convert(docx_path, start=0, end=None, layout_mode="exact")

        # Close the converter
        cv.close()
        
        # Check if output file was created
        if os.path.exists(docx_path):
            print(f"SUCCESS: Converted {pdf_path} to {docx_path}")
            return True
        else:
            print(f"ERROR: Output file was not created: {docx_path}", file=sys.stderr)
            return False
            
    except Exception as e:
        print(f"ERROR: Conversion failed: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pdf_to_docx.py <input_pdf> <output_docx>", file=sys.stderr)
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_docx = sys.argv[2]
    
    success = convert_pdf_to_docx(input_pdf, output_docx)
    sys.exit(0 if success else 1)

