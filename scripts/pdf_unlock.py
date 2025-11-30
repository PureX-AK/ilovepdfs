#!/usr/bin/env python3
"""
Unlock PDF - Remove password protection from PDF files.
Uses PyMuPDF to decrypt password-protected PDFs.
"""

import sys
import os

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF library not installed. Install it with: pip install PyMuPDF", file=sys.stderr)
    sys.exit(1)


def unlock_pdf(pdf_path: str, output_path: str, password: str = None) -> bool:
    """
    Unlock a password-protected PDF by removing encryption.
    
    Args:
        pdf_path: Path to input PDF file
        output_path: Path to output unlocked PDF file
        password: Password for the PDF (if required)
        
    Returns:
        True if unlocking successful, False otherwise
    """
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False
        
        # Open PDF and authenticate if needed
        try:
            doc = fitz.open(pdf_path)
        except Exception as e:
            print(f"ERROR: Failed to open PDF: {str(e)}", file=sys.stderr)
            return False

        # If the document is encrypted, try to authenticate with the provided password
        if doc.needs_pass:
            if not password:
                print("ERROR: PDF is password-protected. Please provide the correct password.", file=sys.stderr)
                doc.close()
                return False

            auth_ok = doc.authenticate(password)
            if auth_ok == 0:  # authentication failed
                print("ERROR: PDF is password-protected. Please provide the correct password.", file=sys.stderr)
                doc.close()
                return False
        
        # Save as unencrypted PDF
        doc.save(output_path, encryption=fitz.PDF_ENCRYPT_NONE)
        doc.close()
        
        if not os.path.exists(output_path):
            print(f"ERROR: Output file was not created: {output_path}", file=sys.stderr)
            return False
        
        return True
        
    except Exception as e:
        print(f"ERROR: Failed to unlock PDF: {str(e)}", file=sys.stderr)
        return False


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_unlock.py <input_pdf> <output_pdf> [password]", file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    password = sys.argv[3] if len(sys.argv) > 3 else None
    
    success = unlock_pdf(input_path, output_path, password)
    sys.exit(0 if success else 1)

