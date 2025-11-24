#!/usr/bin/env python3
"""
Extract text items with precise bounding boxes from PDF using PyMuPDF.
Returns JSON with text positions in canvas coordinate system (top-left origin).
"""

import sys
import json
import fitz  # PyMuPDF

def extract_text_positions(pdf_path, scale=2.0):
    """
    Extract text items with bounding boxes from PDF.
    
    Args:
        pdf_path: Path to PDF file
        scale: Scale factor for coordinates (default 2.0 to match frontend)
    
    Returns:
        List of text items with positions
    """
    doc = fitz.open(pdf_path)
    text_items = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        page_height = page.rect.height
        
        # Get text blocks with bounding boxes
        blocks = page.get_text("dict")
        
        for block in blocks.get("blocks", []):
            if "lines" not in block:
                continue
                
            for line in block["lines"]:
                for span in line["spans"]:
                    text = span.get("text", "").strip()
                    if not text:
                        continue
                    
                    # Get bounding box (PyMuPDF uses bottom-left origin)
                    bbox = span["bbox"]  # [x0, y0, x1, y1] in PDF coordinates
                    x0, y0, x1, y1 = bbox
                    
                    # Convert to canvas coordinate system (top-left origin)
                    # PyMuPDF: y0 is bottom, y1 is top (inverted from what we expect)
                    # Canvas: top-left is (0,0), y increases downward
                    width = (x1 - x0) * scale
                    height = (y1 - y0) * scale
                    x = x0 * scale
                    # Convert Y: page_height - y1 gives us top in canvas coordinates
                    y = (page_height - y1) * scale
                    
                    # Get font properties
                    font_size = span.get("size", 12) * scale
                    font_name = span.get("font", "helv")
                    color = span.get("color", 0)
                    
                    # Convert color from int to hex
                    if isinstance(color, int):
                        # Color is stored as 0xRRGGBB
                        r = (color >> 16) & 0xFF
                        g = (color >> 8) & 0xFF
                        b = color & 0xFF
                        color_hex = f"#{r:02x}{g:02x}{b:02x}"
                    else:
                        color_hex = "#000000"
                    
                    text_items.append({
                        "text": text,
                        "x": round(x, 2),
                        "y": round(y, 2),
                        "width": round(width, 2),
                        "height": round(height, 2),
                        "pageNum": page_num + 1,
                        "fontSize": round(font_size, 2),
                        "fontName": font_name,
                        "color": color_hex,
                    })
    
    doc.close()
    return text_items

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python pdf_extract_text_positions.py <pdf_path> [scale]"}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    scale = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
    
    try:
        text_items = extract_text_positions(pdf_path, scale)
        result = {
            "success": True,
            "textItems": text_items
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

