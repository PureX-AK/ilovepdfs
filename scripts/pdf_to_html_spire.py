#!/usr/bin/env python3
"""
PDF to HTML conversion for EditPDF using Spire.PDF library.
Uses spire-pdf to convert PDF to HTML with layout preservation.
Post-processes HTML to make text elements editable by adding 'text-element' class.
"""

import sys
import os
import re
from pathlib import Path

try:
    from spire.pdf import PdfDocument, FileFormat
except ImportError:
    print("ERROR: spire-pdf library not installed. Install it with: pip install spire-pdf", file=sys.stderr)
    sys.exit(1)

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    HAS_BS4 = False


def add_text_element_class(html_content: str) -> str:
    """
    Post-process HTML to add 'text-element' class to text-containing elements.
    This makes them editable in the EditPDF component.
    
    Args:
        html_content: Original HTML content from spire-pdf
        
    Returns:
        Modified HTML with text-element classes added
    """
    if HAS_BS4:
        # Use BeautifulSoup for robust parsing
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Find ALL elements, not just specific tags
            all_elements = soup.find_all(True)  # True means all tags
            
            for element in all_elements:
                # Skip script, style, and other non-content elements
                if element.name in ['script', 'style', 'meta', 'link', 'head', 'html', 'body']:
                    continue
                
                # Check if element has direct text content (not just nested elements)
                # Get direct text nodes
                direct_text = ''
                for child in element.children:
                    if hasattr(child, 'string') and child.string:
                        direct_text += child.string
                    elif isinstance(child, str):
                        direct_text += child
                
                # Also check total text content
                text = element.get_text(strip=True)
                
                # If element has text content, make it editable
                if text and len(text.strip()) > 0:
                    # Get existing classes
                    classes = element.get('class', [])
                    if not classes:
                        classes = []
                    elif isinstance(classes, str):
                        classes = [classes]
                    
                    # Add text-element class if not already present
                    if 'text-element' not in classes:
                        classes.append('text-element')
                        element['class'] = classes
            
            # Count how many elements got the class
            text_element_count = len(soup.find_all(class_='text-element'))
            print(f"Added 'text-element' class to {text_element_count} elements", file=sys.stderr)
            
            return str(soup)
        except Exception as e:
            print(f"WARNING: BeautifulSoup processing failed: {e}, using regex fallback", file=sys.stderr)
    
    # Simple regex fallback: add class to common text tags
    # This is a basic approach that works for most cases
    modified_html = html_content
    
    # List of common text-containing HTML tags
    text_tags = ['div', 'span', 'p', 'td', 'th', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'a', 'strong', 'em', 'b', 'i', 'font']
    
    for tag in text_tags:
        # Skip if tag doesn't exist in HTML
        if f'<{tag}' not in modified_html and f'<{tag.upper()}' not in modified_html:
            continue
        
        # Add text-element to existing class attributes
        # Pattern: <tag ... class="existing" ...>
        def add_to_class(match):
            full_tag = match.group(0)
            if 'text-element' in full_tag:
                return full_tag
            # Add text-element to the class value
            return full_tag.replace('class="', 'class="text-element ', 1).replace("class='", "class='text-element ", 1)
        
        modified_html = re.sub(
            rf'<{tag}([^>]*class=["\'])([^"\']*)(["\'][^>]*)>',
            lambda m: m.group(0) if 'text-element' in m.group(0) else f'<{tag}{m.group(1)}{m.group(2)} text-element{m.group(3)}>',
            modified_html,
            flags=re.IGNORECASE
        )
        
        # Add class="text-element" to tags without class attribute
        # Only if they don't already have text-element
        def add_class_attr(match):
            full_tag = match.group(0)
            if 'text-element' in full_tag or 'class=' in full_tag:
                return full_tag
            # Insert class before closing >
            return full_tag[:-1] + ' class="text-element">'
        
        # Match opening tags without class attribute
        modified_html = re.sub(
            rf'<{tag}([^>]*?)(?<!class=)(?<!class=["\'])>',
            add_class_attr,
            modified_html,
            flags=re.IGNORECASE
        )
    
    return modified_html


def convert_pdf_to_html(pdf_path: str, html_path: str) -> bool:
    """
    Convert PDF to HTML using Spire.PDF library and make text editable.
    
    Args:
        pdf_path: Path to input PDF file
        html_path: Path to output HTML file
        
    Returns:
        True if conversion successful, False otherwise
    """
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False
        
        # Create temporary HTML file
        temp_html_path = html_path + '.temp'
        
        # Create an instance of PdfDocument
        doc = PdfDocument()
        
        # Load the PDF document
        doc.LoadFromFile(pdf_path)
        
        # Set conversion options to disable embedded SVG for editable text
        # Parameters: useEmbeddedSvg, useEmbeddedImg, maxPageOneFile, useHighQualityEmbeddedSvg
        # useEmbeddedSvg=False makes text editable instead of rendering as SVG images
        try:
            # Set useEmbeddedSvg=False (first param) to get editable text HTML
            # Other params: useEmbeddedImg=False, maxPageOneFile=500, useHighQualityEmbeddedSvg=False
            doc.ConvertOptions.SetPdfToHtmlOptions(False, False, 500, False)
            print("Set HTML conversion options: useEmbeddedSvg=False for editable text", file=sys.stderr)
        except Exception as opt_error:
            # If setting options fails, continue with default (might be SVG)
            print(f"WARNING: Could not set HTML conversion options: {opt_error}", file=sys.stderr)
            print(f"WARNING: Continuing with default conversion settings", file=sys.stderr)
        
        # Save the document as an HTML file
        doc.SaveToFile(temp_html_path, FileFormat.HTML)
        
        # Close the document
        doc.Close()
        
        if not os.path.exists(temp_html_path):
            print(f"ERROR: Output file was not created: {temp_html_path}", file=sys.stderr)
            return False
        
        # Read the HTML content
        try:
            with open(temp_html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
        except UnicodeDecodeError:
            # Try with different encoding
            with open(temp_html_path, 'r', encoding='latin-1') as f:
                html_content = f.read()
        
        # Post-process HTML to add text-element class for editability
        modified_html = add_text_element_class(html_content)
        
        # Write the modified HTML
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(modified_html)
        
        # Remove temporary file
        try:
            if os.path.exists(temp_html_path):
                os.remove(temp_html_path)
        except:
            pass
        
        if os.path.exists(html_path):
            print(f"SUCCESS: Converted {pdf_path} to {html_path} with editable text elements", file=sys.stderr)
            return True
        else:
            print(f"ERROR: Output file was not created: {html_path}", file=sys.stderr)
            return False
            
    except Exception as e:
        error_msg = str(e)
        # Check for SkiaSharp/native dependency errors
        if 'SkiaSharp' in error_msg or 'libSkiaSharp' in error_msg or 'DllNotFound' in error_msg:
            print(f"ERROR: spire-pdf requires native SkiaSharp dependencies that are not installed.", file=sys.stderr)
            print(f"ERROR: Please install Visual C++ Redistributable or try using PyMuPDF instead.", file=sys.stderr)
            print(f"ERROR: Original error: {error_msg}", file=sys.stderr)
        else:
            print(f"ERROR: Conversion failed: {error_msg}", file=sys.stderr)
            import traceback
            traceback.print_exc()
        return False


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pdf_to_html_spire.py <input_pdf> <output_html>", file=sys.stderr)
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_html = sys.argv[2]
    
    success = convert_pdf_to_html(input_pdf, output_html)
    sys.exit(0 if success else 1)
