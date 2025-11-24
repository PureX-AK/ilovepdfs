#!/usr/bin/env python3
"""
PDF to HTML conversion with EXACT layout preservation.
Uses PyMuPDF to extract text with exact coordinates and creates HTML with CSS absolute positioning.
This preserves the exact visual layout of the PDF.
"""

import sys
import os
import html
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF library not installed. Install it with: pip install PyMuPDF", file=sys.stderr)
    sys.exit(1)


def convert_pdf_to_html(pdf_path: str, html_path: str) -> bool:
    """
    Convert PDF to HTML with exact layout preservation.
    Uses CSS absolute positioning to maintain exact X/Y coordinates.
    
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
        
        # Open PDF
        doc = fitz.open(pdf_path)
        
        # Start building HTML
        html_content = []
        html_content.append('<!DOCTYPE html>')
        html_content.append('<html lang="en">')
        html_content.append('<head>')
        html_content.append('    <meta charset="UTF-8">')
        html_content.append('    <meta name="viewport" content="width=device-width, initial-scale=1.0">')
        html_content.append(f'    <title>{html.escape(os.path.basename(pdf_path).replace(".pdf", ""))}</title>')
        html_content.append('    <style>')
        html_content.append('        body {')
        html_content.append('            margin: 0;')
        html_content.append('            padding: 20px;')
        html_content.append('            background-color: #f5f5f5;')
        html_content.append('            font-family: Arial, sans-serif;')
        html_content.append('        }')
        html_content.append('        .page {')
        html_content.append('            position: relative;')
        html_content.append('            margin: 20px auto;')
        html_content.append('            background: white;')
        html_content.append('            box-shadow: 0 2px 8px rgba(0,0,0,0.1);')
        html_content.append('        }')
        html_content.append('        .text-element {')
        html_content.append('            position: absolute;')
        html_content.append('            display: inline-block;')
        html_content.append('            white-space: pre;')
        html_content.append('            line-height: 1.0;')
        html_content.append('            box-sizing: border-box;')
        html_content.append('            margin: 0;')
        html_content.append('            z-index: 2;')
        html_content.append('        }')
        html_content.append('        .border-element {')
        html_content.append('            position: absolute;')
        html_content.append('            z-index: 1;')
        html_content.append('            pointer-events: none;')
        html_content.append('        }')
        html_content.append('    </style>')
        html_content.append('</head>')
        html_content.append('<body>')
        
        # Process each page
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Get page dimensions
            page_rect = page.rect
            page_width = page_rect.width
            page_height = page_rect.height
            
            # Create page container
            html_content.append(f'    <div class="page" style="width: {page_width}px; height: {page_height}px;">')
            
            # Extract drawing elements (borders, lines, rectangles) FIRST so they appear behind text
            try:
                # Try using get_drawings() method (available in PyMuPDF 1.18+)
                if hasattr(page, 'get_drawings'):
                    drawings = page.get_drawings()
                else:
                    drawings = []
                    # Fallback to get_displaylist() for older versions
                    try:
                        display_list = page.get_displaylist()
                        for item in display_list:
                            if isinstance(item, tuple) and len(item) > 0:
                                if item[0] == "re":  # rectangle
                                    drawings.append({
                                        "rect": item[1] if len(item) > 1 else None,
                                        "color": item[2] if len(item) > 2 else [0, 0, 0],
                                        "width": item[3] if len(item) > 3 else 0,  # Default to 0, not 1
                                        "fill": item[4] if len(item) > 4 else None
                                    })
                                elif item[0] == "l":  # line
                                    drawings.append({
                                        "rect": item[1] if len(item) > 1 else None,
                                        "color": item[2] if len(item) > 2 else [0, 0, 0],
                                        "width": item[3] if len(item) > 3 else 0,  # Default to 0, not 1
                                        "type": "l"
                                    })
                    except Exception as e:
                        drawings = []
                
                borders_created = 0
                for drawing in drawings:
                    # Handle both dict and non-dict drawings
                    if not isinstance(drawing, dict):
                        continue
                    
                    # Get drawing rectangle - it's a fitz.Rect object, convert to tuple
                    rect = drawing.get("rect", None)
                    if rect:
                        # Handle both Rect object and tuple/list
                        if hasattr(rect, 'x0'):
                            x0, y0, x1, y1 = rect.x0, rect.y0, rect.x1, rect.y1
                        elif isinstance(rect, (list, tuple)) and len(rect) >= 4:
                            x0, y0, x1, y1 = rect[0], rect[1], rect[2], rect[3]
                        else:
                            x0 = y0 = x1 = y1 = None
                    else:
                        x0 = y0 = x1 = y1 = None
                    
                    # Process rectangle if we have valid rect
                    if rect and x0 is not None:
                        width = abs(x1 - x0)
                        height = abs(y1 - y0)
                        
                        # Skip if too small (both dimensions must be at least 0.5px)
                        if width < 0.5 and height < 0.5:
                            continue
                        
                        # Get fill and stroke colors
                        fill = drawing.get("fill", None)
                        color = drawing.get("color", None)
                        
                        # Get stroke width - default to 0 (not 1) to detect hidden borders
                        width_val = drawing.get("width", 0)
                        
                        # Check if this is a visible border (has stroke)
                        # A visible border requires: width > 0 AND a stroke color
                        has_visible_stroke = width_val is not None and width_val > 0 and color is not None
                        
                        # Get the "type" field to understand the drawing operation
                        drawing_type = drawing.get("type", "")
                        
                        # Check items to see if there's a stroke operation
                        items = drawing.get("items", [])
                        has_stroke_in_items = False
                        if items:
                            for item in items:
                                if isinstance(item, dict):
                                    item_type = item.get("type", "")
                                    # "c" = closePath, "s" = stroke, "f" = fill, "S" = stroke
                                    if item_type in ["s", "S", "c"]:
                                        has_stroke_in_items = True
                                        break
                                elif isinstance(item, tuple) and len(item) > 0:
                                    # Check if it's a stroke operation
                                    if item[0] in ["s", "S", "c"]:
                                        has_stroke_in_items = True
                                        break
                        
                        # Only create border if there's a visible stroke
                        # Visible stroke = (width > 0 AND color exists) OR stroke operation in items
                        should_create_border = has_visible_stroke or (has_stroke_in_items and width_val is not None and width_val > 0)
                        
                        # Check if there's fill but no stroke (fill-only rectangle)
                        has_fill_only = fill is not None and not should_create_border
                        
                        if should_create_border or has_fill_only:
                            # Default to black if no color specified
                            r, g, b = 0, 0, 0
                            if color:
                                if isinstance(color, (list, tuple)) and len(color) >= 3:
                                    r = int(color[0] * 255) if color[0] <= 1 else int(color[0])
                                    g = int(color[1] * 255) if color[1] <= 1 else int(color[1])
                                    b = int(color[2] * 255) if color[2] <= 1 else int(color[2])
                            
                            # Create rectangle element
                            style_parts = [
                                f"position: absolute",
                                f"left: {min(x0, x1)}px",
                                f"top: {min(y0, y1)}px",
                                f"width: {width}px",
                                f"height: {height}px",
                                f"box-sizing: border-box"
                            ]
                            
                            # Add border only if there's a visible stroke
                            if should_create_border:
                                # Use actual width, or default to 1 if somehow we got here without width
                                stroke_width = width_val if width_val and width_val > 0 else 1
                                style_parts.append(f"border: {stroke_width}px solid rgb({r}, {g}, {b})")
                            else:
                                # No border for fill-only
                                style_parts.append("border: none")
                            
                            # Add background if there's fill
                            if fill:
                                if isinstance(fill, (list, tuple)) and len(fill) >= 3:
                                    fill_r = int(fill[0] * 255) if fill[0] <= 1 else int(fill[0])
                                    fill_g = int(fill[1] * 255) if fill[1] <= 1 else int(fill[1])
                                    fill_b = int(fill[2] * 255) if fill[2] <= 1 else int(fill[2])
                                    style_parts.append(f"background-color: rgb({fill_r}, {fill_g}, {fill_b})")
                            
                            html_content.append(f'        <div class="border-element" style="{"; ".join(style_parts)}"></div>')
                            borders_created += 1
                    
                    # Process paths (lines) from items
                    items = drawing.get("items", [])
                    default_color = drawing.get("color", None)
                    # Default width to 0 (not 1) to properly detect hidden borders
                    default_width = drawing.get("width", 0)
                    if default_width is None:
                        default_width = 0
                    
                    path_points = []
                    current_color = default_color
                    current_width = default_width
                    
                    for item in items:
                        if isinstance(item, dict):
                            item_type = item.get("type", "")
                            item_rect = item.get("rect", None)
                            item_points = item.get("points", None)
                            stroke = item.get("color", default_color)
                            width_val = item.get("width", default_width)
                        elif isinstance(item, tuple) and len(item) > 0:
                            item_type = item[0] if len(item) > 0 else ""
                            item_rect = item[1] if len(item) > 1 else None
                            item_points = item[1] if len(item) > 1 and isinstance(item[1], (list, tuple)) and len(item[1]) > 0 and not hasattr(item[1], 'x0') else None
                            stroke = item[2] if len(item) > 2 else default_color
                            width_val = item[3] if len(item) > 3 else default_width
                        else:
                            continue
                        
                        if stroke:
                            current_color = stroke
                        if width_val is not None:
                            # Only use width if > 0, otherwise keep current or 0
                            current_width = width_val if width_val > 0 else (current_width if current_width > 0 else 0)
                        
                        if item_type == "l":  # Line to point
                            # Only render lines if they have a visible stroke (width > 0 and color exists)
                            has_visible_line_stroke = (current_width is not None and current_width > 0) and current_color is not None
                            
                            if not has_visible_line_stroke:
                                continue  # Skip hidden lines
                            
                            points = None
                            if item_points:
                                if isinstance(item_points, (list, tuple)) and len(item_points) > 0:
                                    if isinstance(item_points[0], (list, tuple)) and len(item_points[0]) >= 2:
                                        points = [(float(p[0]), float(p[1])) for p in item_points if len(p) >= 2]
                                    elif len(item_points) >= 2:
                                        normalized = []
                                        for i in range(0, len(item_points) - 1, 2):
                                            if i + 1 < len(item_points):
                                                normalized.append((float(item_points[i]), float(item_points[i + 1])))
                                        points = normalized if normalized else None
                            elif item_rect:
                                if hasattr(item_rect, 'x0'):
                                    points = [(item_rect.x0, item_rect.y0), (item_rect.x1, item_rect.y1)]
                                elif isinstance(item_rect, (list, tuple)) and len(item_rect) >= 4:
                                    points = [(item_rect[0], item_rect[1]), (item_rect[2], item_rect[3])]
                            
                            if points and len(points) >= 1:
                                start = path_points[-1] if path_points else points[0]
                                
                                for end_point in points:
                                    x0, y0 = start
                                    x1, y1 = end_point
                                    
                                    line_width = abs(x1 - x0)
                                    line_height = abs(y1 - y0)
                                    
                                    if line_width < 0.1 and line_height < 0.1:
                                        start = end_point
                                        continue
                                    
                                    r, g, b = 0, 0, 0
                                    if current_color:
                                        if isinstance(current_color, (list, tuple)) and len(current_color) >= 3:
                                            r = int(current_color[0] * 255) if current_color[0] <= 1 else int(current_color[0])
                                            g = int(current_color[1] * 255) if current_color[1] <= 1 else int(current_color[1])
                                            b = int(current_color[2] * 255) if current_color[2] <= 1 else int(current_color[2])
                                    
                                    # Use actual width, default to 1 only if we have a visible stroke
                                    stroke_width = current_width if (current_width is not None and current_width > 0) else 1
                                    
                                    if line_width > line_height:  # Horizontal line
                                        style_parts = [
                                            f"position: absolute",
                                            f"left: {min(x0, x1)}px",
                                            f"top: {min(y0, y1)}px",
                                            f"width: {line_width}px",
                                            f"height: {stroke_width}px",
                                            f"background-color: rgb({r}, {g}, {b})"
                                        ]
                                    else:  # Vertical line
                                        style_parts = [
                                            f"position: absolute",
                                            f"left: {min(x0, x1)}px",
                                            f"top: {min(y0, y1)}px",
                                            f"width: {stroke_width}px",
                                            f"height: {line_height}px",
                                            f"background-color: rgb({r}, {g}, {b})"
                                        ]
                                    html_content.append(f'        <div class="border-element" style="{"; ".join(style_parts)}"></div>')
                                    borders_created += 1
                                    start = end_point
                                
                                path_points.append(points[-1])
                        
                        elif item_type == "m":  # Move to point
                            if item_points:
                                if isinstance(item_points, (list, tuple)) and len(item_points) > 0:
                                    if isinstance(item_points[0], (list, tuple)) and len(item_points[0]) >= 2:
                                        path_points = [(item_points[0][0], item_points[0][1])]
                                    elif len(item_points) >= 2:
                                        path_points = [(item_points[0], item_points[1])]
                            elif item_rect:
                                if hasattr(item_rect, 'x0'):
                                    path_points = [(item_rect.x0, item_rect.y0)]
                                elif isinstance(item_rect, (list, tuple)) and len(item_rect) >= 2:
                                    path_points = [(item_rect[0], item_rect[1])]
                        
                        elif item_type == "re":  # Rectangle
                            # Check if this rectangle has a visible stroke
                            has_visible_rect_stroke = (current_width is not None and current_width > 0) and current_color is not None
                            
                            if not has_visible_rect_stroke:
                                continue  # Skip hidden rectangles (no stroke)
                            
                            if item_rect:
                                if hasattr(item_rect, 'x0'):
                                    x0, y0, x1, y1 = item_rect.x0, item_rect.y0, item_rect.x1, item_rect.y1
                                elif isinstance(item_rect, (list, tuple)) and len(item_rect) >= 4:
                                    x0, y0, x1, y1 = item_rect[0], item_rect[1], item_rect[2], item_rect[3]
                                else:
                                    continue
                                    
                                width = abs(x1 - x0)
                                height = abs(y1 - y0)
                                
                                if width < 0.5 and height < 0.5:
                                    continue
                                
                                r, g, b = 0, 0, 0
                                if current_color:
                                    if isinstance(current_color, (list, tuple)) and len(current_color) >= 3:
                                        r = int(current_color[0] * 255) if current_color[0] <= 1 else int(current_color[0])
                                        g = int(current_color[1] * 255) if current_color[1] <= 1 else int(current_color[1])
                                        b = int(current_color[2] * 255) if current_color[2] <= 1 else int(current_color[2])
                                
                                # Use actual width, default to 1 only if we have a visible stroke
                                stroke_width = current_width if (current_width is not None and current_width > 0) else 1
                                
                                style_parts = [
                                    f"position: absolute",
                                    f"left: {min(x0, x1)}px",
                                    f"top: {min(y0, y1)}px",
                                    f"width: {width}px",
                                    f"height: {height}px",
                                    f"border: {stroke_width}px solid rgb({r}, {g}, {b})",
                                    f"box-sizing: border-box"
                                ]
                                html_content.append(f'        <div class="border-element" style="{"; ".join(style_parts)}"></div>')
                                borders_created += 1
                                
            except Exception as e:
                # Print error for debugging but continue
                print(f"WARNING: Drawing extraction failed: {str(e)}", file=sys.stderr)
            
            # Extract text blocks with positions
            text_dict = page.get_text("dict")
            
            # Store previous span info for spacing calculation
            prev_span_end_x = None
            prev_span_y = None
            prev_span_right_padding = 0  # Track previous element's right padding
            prev_span_is_bold = False  # Track if previous element was bold
            prev_span_font_size = 12  # Track previous element's font size for bold extension calculation
            
            # Process blocks
            for block in text_dict.get("blocks", []):
                if "lines" not in block:  # Skip non-text blocks (images, etc.)
                    continue
                
                for line in block.get("lines", []):
                    prev_span_end_x = None  # Reset for each line
                    prev_span_right_padding = 0  # Reset padding for each line
                    prev_span_is_bold = False  # Reset bold flag for each line
                    prev_span_font_size = 12  # Reset font size for each line
                    spans_in_line = line.get("spans", [])
                    
                    for span_idx, span in enumerate(spans_in_line):
                        text = span.get("text", "")
                        # Don't strip - preserve leading/trailing spaces for spacing
                        if not text:
                            continue
                        
                        # Get position and size
                        bbox = span.get("bbox", [0, 0, 0, 0])
                        x0, y0, x1, y1 = bbox
                        
                        # Get font properties (needed for spacing calculation)
                        font_size = span.get("size", 12)
                        font_name = span.get("font", "Arial")
                        flags = span.get("flags", 0)
                        
                        # Determine font weight early (needed for padding calculation)
                        is_bold = (flags & 16) != 0
                        is_italic = (flags & 1) != 0
                        font_name_lower = font_name.lower()
                        
                        # Quick font weight check for padding calculation
                        font_weight_for_padding = "normal"
                        bold_indicators = ["-bold", "bold-", "_bold", "bold_", "boldmt", "-b", "-black", "boldit", "bolditalic"]
                        if is_bold or any(indicator in font_name_lower for indicator in bold_indicators):
                            font_weight_for_padding = "bold"
                        elif "black" in font_name_lower or "heavy" in font_name_lower:
                            font_weight_for_padding = "900"
                        elif font_name_lower.endswith("bold") or font_name_lower.endswith("boldmt"):
                            font_weight_for_padding = "bold"
                        
                        # Calculate padding for this element (for visual spacing, not position adjustment)
                        base_padding = max(1, font_size * 0.05)  # Reduced padding: 5% of font size, min 1px
                        if font_weight_for_padding == "bold" or font_weight_for_padding in ["600", "700", "800", "900"]:
                            current_padding = max(2, font_size * 0.1)  # Reduced padding: 10% of font size for bold, min 2px
                        else:
                            current_padding = base_padding
                        
                        # Adjust left position ONLY when there's actual overlap or very close proximity
                        # Only shift when elements are overlapping or extremely close (< 1px gap)
                        if prev_span_end_x is not None and abs(y0 - (prev_span_y or y0)) < font_size * 0.5:
                            # Check actual gap between bounding boxes
                            actual_gap = x0 - prev_span_end_x
                            
                            # Only intervene if there's overlap (gap < 0) or extremely close (< 1px)
                            if actual_gap < 1:
                                # Calculate visual end of previous element only when needed
                                prev_visual_end_x = prev_span_end_x
                                
                                # If previous element is bold, it may extend beyond bbox
                                # Only apply extension if we detect overlap/close proximity
                                if prev_span_is_bold and actual_gap < 0:
                                    # Bold text extends beyond bbox - use conservative extension
                                    # Only apply when there's actual overlap
                                    bold_extension = max(3, prev_span_font_size * 0.08)  # 8% of font size, min 3px
                                    prev_visual_end_x = prev_span_end_x + bold_extension
                                
                                # Calculate gap to visual end
                                gap_to_visual_end = x0 - prev_visual_end_x
                                
                                # Only shift if still overlapping after accounting for bold extension
                                if gap_to_visual_end < 0:
                                    # Overlapping - shift right by minimal amount to prevent overlap
                                    # Use 1px gap for normal, 2px if current is also bold
                                    min_gap = 2 if (font_weight_for_padding == "bold" or font_weight_for_padding in ["600", "700", "800", "900"]) else 1
                                    x0 = prev_visual_end_x + min_gap
                                elif gap_to_visual_end < 1:
                                    # Very close but not overlapping - minimal shift only if previous is bold
                                    if prev_span_is_bold:
                                        x0 = prev_visual_end_x + 1
                        
                        # Calculate spacing between spans for text content (after position adjustment)
                        if prev_span_end_x is not None:
                            gap = x0 - prev_span_end_x
                            # If gap is significant (more than 1px), add space to text
                            # Also check if they're on the same line (similar y position)
                            if gap > 1 and abs(y0 - (prev_span_y or y0)) < font_size * 0.5:
                                # Add space proportional to the gap, but more conservatively
                                num_spaces = max(1, int(gap / (font_size * 0.5)))  # More conservative spacing
                                text = " " * num_spaces + text
                        
                        # Update previous span position for next element
                        # Store the bounding box end (x1) - visual end will be calculated next iteration
                        prev_span_end_x = x1
                        prev_span_y = y0
                        prev_span_right_padding = current_padding
                        prev_span_is_bold = (font_weight_for_padding == "bold" or font_weight_for_padding in ["600", "700", "800", "900"])
                        prev_span_font_size = font_size
                        
                        # Now strip only if it's all whitespace
                        text = text.rstrip() if text.strip() else text
                        if not text.strip():
                            continue
                        
                        # Get font weight - check multiple sources with priority (already have is_bold and font_name_lower)
                        font_weight = "normal"
                        
                        # Priority 1: Check font name patterns first (most reliable for many PDFs)
                        # Check for bold indicators in font name
                        bold_indicators = ["-bold", "bold-", "_bold", "bold_", "boldmt", "-b", "-black", "boldit", "bolditalic"]
                        if any(indicator in font_name_lower for indicator in bold_indicators):
                            font_weight = "bold"
                        # Check for other weights in font name
                        elif "black" in font_name_lower or "heavy" in font_name_lower:
                            font_weight = "900"
                        elif "extrabold" in font_name_lower or "ultrabold" in font_name_lower:
                            font_weight = "800"
                        elif "semibold" in font_name_lower or "demi" in font_name_lower:
                            font_weight = "600"
                        elif "medium" in font_name_lower:
                            font_weight = "500"
                        elif "light" in font_name_lower or "thin" in font_name_lower:
                            font_weight = "300"
                        elif "extralight" in font_name_lower or "ultralight" in font_name_lower:
                            font_weight = "200"
                        # Priority 2: Check PyMuPDF flags (fallback if font name doesn't indicate)
                        elif is_bold:
                            font_weight = "bold"
                        
                        # Priority 3: Check if font appears heavier based on size relative to other text
                        # (This is a heuristic - larger text might be bold)
                        # We'll skip this as it's not reliable
                        
                        # Additional check: Some PDFs use font names like "Arial,Bold" or "TimesNewRomanPS-BoldMT"
                        if font_weight == "normal":
                            # Check for comma-separated font names with Bold
                            if "," in font_name and "bold" in font_name_lower:
                                font_weight = "bold"
                            # Check for font names ending with Bold variants
                            elif font_name_lower.endswith("bold") or font_name_lower.endswith("boldmt"):
                                font_weight = "bold"
                        
                        # Get color
                        color = span.get("color", 0)
                        # Convert color from int to RGB
                        r = (color >> 16) & 0xFF
                        g = (color >> 8) & 0xFF
                        b = color & 0xFF
                        color_str = f"rgb({r}, {g}, {b})"
                        
                        # Escape HTML but preserve spaces
                        text_escaped = html.escape(text)
                        
                        # Use the same padding values calculated earlier (current_padding)
                        # This padding is minimal and only for visual spacing, not position adjustment
                        horizontal_padding = current_padding
                        
                        # Build style string
                        # x0 has already been adjusted if elements were overlapping
                        # Add minimal right padding for visual spacing
                        style_parts = [
                            f"left: {x0}px",
                            f"top: {y0}px",
                            f"font-size: {font_size}px",
                            f"font-family: '{font_name}', Arial, sans-serif",
                            f"font-weight: {font_weight}",
                            f"color: {color_str}",
                            f"position: absolute",
                            f"white-space: pre",
                            f"padding-right: {horizontal_padding}px",
                            f"line-height: 1",
                            f"margin: 0",
                            f"display: inline-block"
                        ]
                        
                        if is_italic:
                            style_parts.append("font-style: italic")
                        
                        style_str = "; ".join(style_parts)
                        
                        # Add text element - use span instead of div to be more inline-friendly
                        # But keep absolute positioning for exact layout
                        html_content.append(f'        <span class="text-element" style="{style_str}">{text_escaped}</span>')
            
            html_content.append('    </div>')
        
        html_content.append('</body>')
        html_content.append('</html>')
        
        # Write HTML file
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(html_content))
        
        doc.close()
        
        if os.path.exists(html_path):
            return True
        else:
            print(f"ERROR: Output file was not created: {html_path}", file=sys.stderr)
            return False
            
    except Exception as e:
        print(f"ERROR: Conversion failed: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python pdf_to_html.py <input_pdf> <output_html>", file=sys.stderr)
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_html = sys.argv[2]
    
    success = convert_pdf_to_html(input_pdf, output_html)
    sys.exit(0 if success else 1)

