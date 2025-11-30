#!/usr/bin/env python3
"""
Protect PDF - Add password protection to PDF files.
Uses PyMuPDF to encrypt PDFs with user password.
"""

import sys
import os

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF library not installed. Install it with: pip install PyMuPDF", file=sys.stderr)
    sys.exit(1)


def protect_pdf(pdf_path: str, output_path: str, password: str) -> bool:
    """
    Protect a PDF with password encryption.
    
    Args:
        pdf_path: Path to input PDF file
        output_path: Path to output protected PDF file
        password: Password to encrypt the PDF
        
    Returns:
        True if protection successful, False otherwise
    """
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False
        
        if not password or len(password) < 1:
            print(f"ERROR: Password is required", file=sys.stderr)
            return False
        
        # Open PDF (with password if it's already encrypted)
        try:
            doc = fitz.open(pdf_path)
        except Exception as e:
            if "password" in str(e).lower():
                print(f"ERROR: PDF is already password-protected. Please unlock it first.", file=sys.stderr)
            else:
                print(f"ERROR: Failed to open PDF: {str(e)}", file=sys.stderr)
            return False
        
        # Encrypt PDF with AES-256 encryption
        # encryption_method: 0 = no encryption, 1 = RC4 40-bit, 2 = RC4 128-bit, 3 = AES 128-bit, 4 = AES 256-bit
        encryption_method = 4  # AES 256-bit
        permissions = fitz.PDF_PERM_PRINT | fitz.PDF_PERM_COPY | fitz.PDF_PERM_ANNOTATE | fitz.PDF_PERM_FORM
        
        doc.save(
            output_path,
            encryption=encryption_method,
            user_pw=password,
            owner_pw=password,  # Use same password for owner
            permissions=permissions
        )
        doc.close()
        
        if not os.path.exists(output_path):
            print(f"ERROR: Output file was not created: {output_path}", file=sys.stderr)
            return False
        
        return True
        
    except Exception as e:
        print(f"ERROR: Failed to protect PDF: {str(e)}", file=sys.stderr)
        return False


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python pdf_protect.py <input_pdf> <output_pdf> <password>", file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    password = sys.argv[3]
    
    success = protect_pdf(input_path, output_path, password)
    sys.exit(0 if success else 1)

