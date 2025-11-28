#!/usr/bin/env python3
"""
Extract text from PDF with color information using PyMuPDF.
Returns JSON with text items including their positions, fonts, and colors.
"""

import sys
import json
import fitz  # PyMuPDF

def extract_text_with_color(pdf_path):
    """Extract text from PDF with color, position, and font information."""
    doc = fitz.open(pdf_path)
    all_text_items = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Get text blocks with detailed information
        text_dict = page.get_text("dict")
        
        # Process each block
        for block in text_dict.get("blocks", []):
            if "lines" not in block:
                continue
                
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    text = span.get("text", "").strip()
                    if not text:
                        continue
                    
                    # Extract color information
                    color = span.get("color", 0)  # Default to 0 (black)
                    
                    # Convert color from integer to RGB
                    # PyMuPDF stores color as 24-bit integer: 0xRRGGBB
                    r = (color >> 16) & 0xFF
                    g = (color >> 8) & 0xFF
                    b = color & 0xFF
                    
                    # Normalize to 0-1 range for consistency
                    rgb_normalized = [r / 255.0, g / 255.0, b / 255.0]
                    
                    # Get font information
                    font_name = span.get("font", "Arial")
                    font_size = span.get("size", 12)
                    
                    # Get position and dimensions
                    # PyMuPDF bbox: [x0, y0, x1, y1] where y0 is bottom, y1 is top
                    bbox = span.get("bbox", [0, 0, 0, 0])
                    page_height = page.rect.height
                    
                    x = bbox[0]
                    # Convert Y from bottom-left origin to top-left origin (canvas coordinates)
                    y = page_height - bbox[3]  # Use bbox[3] (top) and invert
                    width = bbox[2] - bbox[0]
                    height = bbox[3] - bbox[1]
                    
                    text_item = {
                        "text": text,
                        "x": x,
                        "y": y,
                        "width": width,
                        "height": height,
                        "fontSize": font_size,
                        "fontName": font_name,
                        "color": rgb_normalized,  # [r, g, b] in 0-1 range
                        "pageNum": page_num + 1,  # 1-indexed
                    }
                    
                    all_text_items.append(text_item)
    
    doc.close()
    return all_text_items

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python pdf_extract_text_with_color.py <pdf_path>"}), file=sys.stderr)
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    try:
        text_items = extract_text_with_color(pdf_path)
        result = {
            "success": True,
            "textItems": text_items,
            "count": len(text_items)
        }
        print(json.dumps(result))
    except Exception as e:
        error_result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

