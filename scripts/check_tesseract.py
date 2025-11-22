#!/usr/bin/env python3
"""
Helper script to check if Tesseract OCR is installed and configured correctly.
"""

import sys
import subprocess
import os

def check_tesseract():
    """Check if Tesseract is installed and accessible"""
    try:
        import pytesseract
        version = pytesseract.get_tesseract_version()
        print(f"✓ Tesseract OCR is installed: version {version}")
        
        # Try to find tesseract executable
        tesseract_cmd = pytesseract.pytesseract.tesseract_cmd
        if tesseract_cmd:
            print(f"✓ Tesseract executable found at: {tesseract_cmd}")
        else:
            print("⚠ Tesseract executable path not configured")
            print("  You may need to set: pytesseract.pytesseract.tesseract_cmd = r'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'")
        
        # Try a simple OCR test
        try:
            from PIL import Image
            import io
            # Create a simple test image
            img = Image.new('RGB', (100, 30), color='white')
            result = pytesseract.image_to_string(img)
            print("✓ OCR test successful")
            return True
        except Exception as e:
            print(f"⚠ OCR test failed: {e}")
            return False
            
    except ImportError:
        print("✗ pytesseract is not installed")
        print("  Install with: pip install pytesseract")
        return False
    except Exception as e:
        print(f"✗ Tesseract OCR is not found: {e}")
        print("\nTo install Tesseract OCR on Windows:")
        print("1. Download from: https://github.com/UB-Mannheim/tesseract/wiki")
        print("2. Run the installer")
        print("3. Make sure to add Tesseract to PATH during installation")
        print("4. Restart your terminal/PowerShell")
        return False

def check_system_tesseract():
    """Check if tesseract command is available in system PATH"""
    try:
        result = subprocess.run(['tesseract', '--version'], 
                              capture_output=True, 
                              text=True, 
                              timeout=5)
        if result.returncode == 0:
            print(f"✓ System tesseract command found:")
            print(f"  {result.stdout.split(chr(10))[0]}")
            return True
    except FileNotFoundError:
        print("✗ Tesseract command not found in system PATH")
        return False
    except Exception as e:
        print(f"✗ Error checking system tesseract: {e}")
        return False

if __name__ == '__main__':
    print("Checking Tesseract OCR installation...\n")
    
    system_check = check_system_tesseract()
    print()
    python_check = check_tesseract()
    
    print("\n" + "="*50)
    if python_check:
        print("✓ Tesseract OCR is ready to use!")
    else:
        print("✗ Tesseract OCR needs to be installed or configured")
        print("\nInstallation steps:")
        print("1. Download from: https://github.com/UB-Mannheim/tesseract/wiki")
        print("2. Install to default location: C:\\Program Files\\Tesseract-OCR")
        print("3. Make sure 'Add to PATH' is checked during installation")
        print("4. Restart your terminal and run this script again")

