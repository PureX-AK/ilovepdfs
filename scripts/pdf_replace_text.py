#!/usr/bin/env python3
"""
Replace text in PDF using PyMuPDF.
Finds and replaces text occurrences in PDF documents.
"""

import sys
import os
import re
import json

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF library not installed. Install it with: pip install PyMuPDF", file=sys.stderr)
    sys.exit(1)


def replace_text_in_pdf(pdf_path: str, output_path: str, old_text: str, new_text: str, 
                        case_sensitive: bool = False, replace_all: bool = True) -> bool:
    """
    Replace text in PDF by redacting old text and adding new text.
    
    Args:
        pdf_path: Path to input PDF file
        output_path: Path to output PDF file
        old_text: Text to find and replace
        new_text: Replacement text
        case_sensitive: Whether search should be case-sensitive
        replace_all: Whether to replace all occurrences (True) or just first (False)
        
    Returns:
        True if replacement successful, False otherwise
    """
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False
        
        if not old_text or not old_text.strip():
            print("ERROR: Old text cannot be empty", file=sys.stderr)
            return False
        
        # Open PDF
        doc = fitz.open(pdf_path)
        
        # Track if any replacements were made
        replacements_made = 0
        
        # Process each page
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Get text with positions
            text_dict = page.get_text("dict")
            
            # Find all occurrences of old_text
            occurrences = []
            
            for block in text_dict.get("blocks", []):
                if "lines" not in block:
                    continue
                
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        span_text = span.get("text", "")
                        bbox = span.get("bbox", [0, 0, 0, 0])
                        
                        # Check if old_text is in this span
                        search_text = span_text if case_sensitive else span_text.lower()
                        search_old = old_text if case_sensitive else old_text.lower()
                        
                        if search_old in search_text:
                            # Found a match - store the bbox
                            occurrences.append({
                                'bbox': bbox,
                                'text': span_text,
                                'font_size': span.get("size", 12),
                                'font_name': span.get("font", "helv"),
                                'color': span.get("color", 0),
                            })
                            
                            if not replace_all:
                                # Only replace first occurrence
                                break
                    if not replace_all and occurrences:
                        break
                if not replace_all and occurrences:
                    break
            
            # Apply redactions and add new text
            for occ in occurrences:
                bbox = occ['bbox']
                x0, y0, x1, y1 = bbox
                
                # Create redaction rectangle (slightly larger to cover text completely)
                rect = fitz.Rect(x0 - 1, y0 - 1, x1 + 1, y1 + 1)
                
                # Add redaction annotation (white fill to cover old text)
                page.add_redact_annot(rect, fill=(1, 1, 1))  # White fill
                
                # Get font properties from original text
                font_size = occ['font_size']
                font_name = occ['font_name']
                
                # Extract color
                color_int = occ['color']
                r = (color_int >> 16) & 0xFF
                g = (color_int >> 8) & 0xFF
                b = color_int & 0xFF
                color = (r / 255.0, g / 255.0, b / 255.0)
                
                # Apply redactions
                page.apply_redactions()
                
                # Add new text at the same position
                # PyMuPDF uses bottom-left origin, so adjust y
                page_height = page.rect.height
                point = fitz.Point(x0, page_height - y0)
                
                try:
                    page.insert_text(
                        point,
                        new_text,
                        fontsize=font_size,
                        fontname=font_name,
                        color=color
                    )
                    replacements_made += 1
                except Exception as insert_error:
                    # Fallback: try with default font
                    try:
                        page.insert_text(
                            point,
                            new_text,
                            fontsize=font_size,
                            color=color
                        )
                        replacements_made += 1
                    except:
                        print(f"WARNING: Could not insert text at page {page_num + 1}: {str(insert_error)}", file=sys.stderr)
        
        if replacements_made == 0:
            print(f"WARNING: No occurrences of '{old_text}' found in PDF", file=sys.stderr)
        
        # Save the modified PDF
        doc.save(output_path)
        doc.close()
        
        return True
        
    except Exception as e:
        print(f"ERROR: Text replacement failed: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


def replace_text_at_positions(pdf_path: str, output_path: str, replacements: list) -> bool:
    """
    Replace text at specific positions in PDF.
    
    Args:
        pdf_path: Path to input PDF file
        output_path: Path to output PDF file
        replacements: List of replacement dictionaries with oldText, newText, pageNum, x, y, etc.
        
    Returns:
        True if replacement successful, False otherwise
    """
    print(f"DEBUG: Starting replace_text_at_positions with {len(replacements)} replacements", file=sys.stderr)
    """
    Replace text at specific positions in PDF.
    
    Args:
        pdf_path: Path to input PDF file
        output_path: Path to output PDF file
        replacements: List of replacement dicts with keys:
            - oldText: Text to replace
            - newText: Replacement text
            - pageNum: Page number (1-indexed)
            - x: X coordinate
            - y: Y coordinate
            - fontSize: Font size
            - fontName: Font name
            - color: Color string (e.g., "#000000")
            
    Returns:
        True if replacement successful, False otherwise
    """
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False
        
        if not replacements:
            print("ERROR: No replacements provided", file=sys.stderr)
            return False
        
        # Open PDF
        doc = fitz.open(pdf_path)
        
        # Track if any replacements were made
        replacements_made = 0
        
        # Group replacements by page
        replacements_by_page = {}
        for replacement in replacements:
            page_num = replacement.get('pageNum', 1) - 1  # Convert to 0-indexed
            if page_num < 0 or page_num >= len(doc):
                print(f"WARNING: Invalid page number {replacement.get('pageNum')}, skipping", file=sys.stderr)
                continue
            
            if page_num not in replacements_by_page:
                replacements_by_page[page_num] = []
            replacements_by_page[page_num].append(replacement)
        
        # Process each page with replacements
        for page_num, page_replacements in replacements_by_page.items():
            page = doc[page_num]
            page_height = page.rect.height
            
            print(f"DEBUG: Processing page {page_num + 1} with {len(page_replacements)} replacements", file=sys.stderr)
            
            # Get text with positions to find exact matches
            text_dict = page.get_text("dict")
            
            for replacement in page_replacements:
                print(f"DEBUG: Processing replacement: oldText='{replacement.get('oldText', '')[:50]}...', newText='{replacement.get('newText', '')[:50]}...'", file=sys.stderr)
                old_text = replacement.get('oldText', '')
                new_text = replacement.get('newText', '')
                # Frontend sends coordinates in pixels from getBoundingClientRect()
                # These are screen coordinates from the editable div (getBoundingClientRect)
                # They are in pixels relative to the page element
                # We need to convert to PDF points using the actual page dimensions
                target_x_pixels = replacement.get('x', 0)
                target_y_pixels = replacement.get('y', 0)
                page_width_pixels = replacement.get('pageWidth', 0)
                page_height_pixels = replacement.get('pageHeight', 0)
                
                # Get actual PDF page dimensions in points
                page_rect = page.rect
                pdf_page_width = page_rect.width
                pdf_page_height = page_rect.height
                
                # Calculate conversion ratio based on actual dimensions
                # This accounts for the actual render scale used by react-pdf
                if page_width_pixels > 0 and page_height_pixels > 0:
                    # Calculate the scale factor: PDF points per pixel
                    scale_x = pdf_page_width / page_width_pixels
                    scale_y = pdf_page_height / page_height_pixels
                    
                    # Convert frontend pixels to PDF points
                    target_x = target_x_pixels * scale_x
                    target_y = target_y_pixels * scale_y
                    
                    print(f"DEBUG: Frontend page dimensions: ({page_width_pixels}, {page_height_pixels}) pixels", file=sys.stderr)
                    print(f"DEBUG: PDF page dimensions: ({pdf_page_width}, {pdf_page_height}) points", file=sys.stderr)
                    print(f"DEBUG: Scale factors: X={scale_x:.4f}, Y={scale_y:.4f}", file=sys.stderr)
                else:
                    # Fallback: use default scale if page dimensions not provided
                    frontend_scale = 2.0
                    target_x = target_x_pixels / frontend_scale * 0.75
                    target_y = target_y_pixels / frontend_scale * 0.75
                    print(f"DEBUG: Using fallback conversion (page dimensions not provided)", file=sys.stderr)
                
                print(f"DEBUG: Frontend coordinates: ({target_x_pixels}, {target_y_pixels}) pixels", file=sys.stderr)
                print(f"DEBUG: Converted to PDF points: ({target_x}, {target_y})", file=sys.stderr)
                font_size = replacement.get('fontSize', 12)
                font_name = replacement.get('fontName', 'helv')
                color_str = replacement.get('color', '#000000')
                
                if not old_text:
                    continue
                
                # Find the text span that matches the position and text
                # Support both individual text items and lines
                # Use very large tolerance since coordinates might be in different units
                # Focus on text matching first, position is secondary
                tolerance = 1000  # Very large tolerance - focus on text matching
                found_match = False
                
                # Check if old_text contains spaces (likely a line-based replacement)
                is_line_replacement = ' ' in old_text.strip()
                
                # First, try to find individual span that matches (for individual text item replacement)
                # Only do this if it's NOT a line replacement
                best_span_match = None
                best_span_score = float('inf')
                
                if not is_line_replacement:
                    for block in text_dict.get("blocks", []):
                        if "lines" not in block:
                            continue
                        
                        for line in block.get("lines", []):
                            for span in line.get("spans", []):
                                span_text = span.get("text", "").strip()
                                if not span_text:
                                    continue
                                
                                bbox = span.get("bbox", [0, 0, 0, 0])
                                x0, y0, x1, y1 = bbox
                                span_center_x = (x0 + x1) / 2
                                span_center_y = (y0 + y1) / 2
                                
                                # Check if this span matches the target
                                text_match = (old_text.strip().lower() == span_text.lower() or 
                                             old_text.strip() == span_text)
                                
                                if text_match:
                                    x_distance = abs(span_center_x - target_x)
                                    y_distance = abs(span_center_y - target_y)
                                    total_distance = (x_distance ** 2 + y_distance ** 2) ** 0.5
                                    
                                    if total_distance < tolerance * 2:
                                        if total_distance < best_span_score:
                                            best_span_score = total_distance
                                            best_span_match = {
                                                'span': span,
                                                'bbox': bbox,
                                                'text': span_text,
                                                'x': x0,
                                                'y': (y0 + y1) / 2,
                                                'x1': x1,
                                                'y1': y1
                                            }
                
                # If individual span found, use it; otherwise try to find line
                if best_span_match:
                    # Use individual span
                    span_data = best_span_match
                    line_bbox_x0 = span_data['x']
                    line_bbox_y0 = span_data['bbox'][1]
                    line_bbox_x1 = span_data['x1']
                    line_bbox_y1 = span_data['y1']
                    first_span = span_data['span']
                    
                    # Redact the individual span
                    rect = fitz.Rect(line_bbox_x0, line_bbox_y0, line_bbox_x1, line_bbox_y1)
                    page.add_redact_annot(rect, fill=(1, 1, 1))
                    page.apply_redactions()
                    
                    # Get font properties
                    original_font_size = first_span.get("size", font_size)
                    original_font_name = first_span.get("font", font_name)
                    original_color_int = first_span.get("color", 0)
                    
                    # Parse color
                    r = (original_color_int >> 16) & 0xFF
                    g = (original_color_int >> 8) & 0xFF
                    b = original_color_int & 0xFF
                    color = (r / 255.0, g / 255.0, b / 255.0)
                    
                    # Insert new text at the exact position
                    # Use insert_textbox with the exact span bbox first (same approach as line-based)
                    textbox_rect = fitz.Rect(
                        line_bbox_x0,                    # Left edge
                        page_height - line_bbox_y1,      # Bottom (converted from top)
                        line_bbox_x1,                    # Right edge
                        page_height - line_bbox_y0       # Top (converted from top)
                    )
                    
                    # Log for debugging
                    print(f"DEBUG: Using individual span position for insertion", file=sys.stderr)
                    print(f"DEBUG: Span bbox (top-left origin): ({line_bbox_x0}, {line_bbox_y0}, {line_bbox_x1}, {line_bbox_y1})", file=sys.stderr)
                    print(f"DEBUG: Textbox rect (bottom-left origin): ({textbox_rect.x0}, {textbox_rect.y0}, {textbox_rect.x1}, {textbox_rect.y1})", file=sys.stderr)
                    print(f"DEBUG: Font: {original_font_name}, Size: {original_font_size}", file=sys.stderr)
                    print(f"DEBUG: New text: '{new_text}'", file=sys.stderr)
                    
                    try:
                        # Try insert_textbox first (places text in exact rectangle)
                        chars_fit = page.insert_textbox(
                            textbox_rect,
                            new_text,
                            fontsize=original_font_size,
                            fontname=original_font_name,
                            color=color,
                            align=0
                        )
                        
                        if chars_fit < 0 or chars_fit < len(new_text):
                            # Text didn't fit, fall back to insert_text at baseline
                            print(f"DEBUG: Textbox insertion: only {chars_fit} chars fit, falling back to insert_text", file=sys.stderr)
                            baseline_y = page_height - line_bbox_y1
                            point = fitz.Point(line_bbox_x0, baseline_y)
                            page.insert_text(
                                point,
                                new_text,
                                fontsize=original_font_size,
                                fontname=original_font_name,
                                color=color
                            )
                            print(f"DEBUG: Successfully inserted using insert_text at baseline Y={baseline_y}", file=sys.stderr)
                        else:
                            print(f"DEBUG: Successfully inserted all {chars_fit} characters using textbox", file=sys.stderr)
                        
                        found_match = True
                        replacements_made += 1
                        break
                    except Exception as insert_error:
                        try:
                            print(f"DEBUG: Insert with original font '{original_font_name}' failed: {str(insert_error)}", file=sys.stderr)
                            print(f"DEBUG: Trying with standard font 'helv' using insert_text...", file=sys.stderr)
                            # Fall back to insert_text at baseline
                            baseline_y = page_height - line_bbox_y1
                            point = fitz.Point(line_bbox_x0, baseline_y)
                            page.insert_text(
                                point,
                                new_text,
                                fontsize=original_font_size,
                                fontname="helv",
                                color=color
                            )
                            found_match = True
                            replacements_made += 1
                            print(f"DEBUG: Successfully inserted using 'helv' font at baseline Y={baseline_y}", file=sys.stderr)
                            break
                        except Exception as insert_error2:
                            try:
                                print(f"DEBUG: Insert with 'helv' font also failed: {str(insert_error2)}", file=sys.stderr)
                                print(f"DEBUG: Trying without fontname...", file=sys.stderr)
                                baseline_y = page_height - line_bbox_y1
                                point = fitz.Point(line_bbox_x0, baseline_y)
                                page.insert_text(
                                    point,
                                    new_text,
                                    fontsize=original_font_size,
                                    color=color
                                )
                                found_match = True
                                replacements_made += 1
                                print(f"DEBUG: Successfully inserted using default font at baseline Y={baseline_y}", file=sys.stderr)
                                break
                            except Exception as insert_error3:
                                print(f"WARNING: Could not insert text at page {page_num + 1}: {str(insert_error3)}", file=sys.stderr)
                
                # For line-based replacements, skip position matching and search entire page by text
                # If no individual span match, try line-based matching
                if not found_match or is_line_replacement:
                    # Group spans by lines (similar Y positions)
                    # For line replacements, build lines from all blocks
                    lines = []
                    for block in text_dict.get("blocks", []):
                        if "lines" not in block:
                            continue
                        
                        for line in block.get("lines", []):
                            line_spans = []
                            line_text = ""
                            line_y = None
                            line_min_x = float('inf')
                            line_max_x = 0
                            
                            for span in line.get("spans", []):
                                span_text = span.get("text", "").strip()
                                if not span_text:
                                    continue
                                
                                bbox = span.get("bbox", [0, 0, 0, 0])
                                x0, y0, x1, y1 = bbox
                                
                                if line_y is None:
                                    line_y = (y0 + y1) / 2
                                
                                # Check if this span is on the same line (similar Y)
                                span_y = (y0 + y1) / 2
                                if abs(span_y - line_y) < tolerance:
                                    line_spans.append({
                                        'span': span,
                                        'bbox': bbox,
                                        'text': span_text
                                    })
                                    # Join with single space (normalization will remove all spaces for matching)
                                    if line_text:
                                        line_text += " " + span_text
                                    else:
                                        line_text = span_text
                                    line_min_x = min(line_min_x, x0)
                                    line_max_x = max(line_max_x, x1)
                            
                            if line_spans and line_text.strip():
                                lines.append({
                                    'spans': line_spans,
                                    'text': line_text.strip(),
                                    'y': line_y,
                                    'min_x': line_min_x,
                                    'max_x': line_max_x
                                })
                    
                    # Initialize best_match for line-based matching
                    best_match = None
                    best_score = float('inf')
                    
                    # Normalize text: remove ALL spaces for matching
                    # This handles cases where PDF has "4+" but frontend extracts as "4 +"
                    def normalize_text(text):
                        import re
                        # Remove ALL spaces - this ensures "4 + Years" becomes "4+Years" which matches "4+Years" from PDF
                        normalized = re.sub(r'\s+', '', text.strip())
                        return normalized
                    
                    normalized_old = normalize_text(old_text)
                    
                    # For line replacements, search ALL lines on the page (ignore position completely)
                    if is_line_replacement:
                        print(f"\n{'='*70}", file=sys.stderr)
                        print(f"DEBUG: TEXT MATCHING - COMPARING TEXTS", file=sys.stderr)
                        print(f"{'='*70}", file=sys.stderr)
                        print(f"FRONTEND SENT:", file=sys.stderr)
                        print(f"  Original text:     '{old_text}'", file=sys.stderr)
                        print(f"  Normalized text:   '{normalized_old}' (all spaces removed)", file=sys.stderr)
                        print(f"  Text length:       {len(old_text)} chars (original), {len(normalized_old)} chars (normalized)", file=sys.stderr)
                        print(f"\nSEARCHING IN {len(lines)} LINES FROM PDF:", file=sys.stderr)
                        print(f"{'-'*70}", file=sys.stderr)
                        
                        for idx, line_data in enumerate(lines):
                            line_text = line_data['text']
                            normalized_line = normalize_text(line_text)
                            
                            print(f"\nPDF Line {idx + 1}:", file=sys.stderr)
                            print(f"  Original PDF text: '{line_text}'", file=sys.stderr)
                            print(f"  Normalized PDF:    '{normalized_line}' (all spaces removed)", file=sys.stderr)
                            print(f"  Length:            {len(line_text)} chars (original), {len(normalized_line)} chars (normalized)", file=sys.stderr)
                            
                            # Show the exact comparison
                            frontend_normalized = normalized_old.lower()
                            pdf_normalized = normalized_line.lower()
                            
                            print(f"\n  COMPARISON:", file=sys.stderr)
                            print(f"    Frontend: '{frontend_normalized}'", file=sys.stderr)
                            print(f"    PDF:      '{pdf_normalized}'", file=sys.stderr)
                            
                            # Check for exact or close text match (case-insensitive)
                            if frontend_normalized == pdf_normalized:
                                # Found exact match - use this line
                                print(f"    RESULT: ✓✓✓ EXACT MATCH! ✓✓✓", file=sys.stderr)
                                best_match = line_data
                                best_score = 0
                                break
                            elif frontend_normalized in pdf_normalized:
                                print(f"    RESULT: ✓ PARTIAL MATCH (frontend text found inside PDF text)", file=sys.stderr)
                                best_match = line_data
                                best_score = 1
                                break
                            elif pdf_normalized in frontend_normalized:
                                print(f"    RESULT: ✓ PARTIAL MATCH (PDF text found inside frontend text)", file=sys.stderr)
                                best_match = line_data
                                best_score = 1
                                break
                            else:
                                print(f"    RESULT: ✗ NO MATCH", file=sys.stderr)
                        
                        if best_match:
                            print(f"\n{'='*70}", file=sys.stderr)
                            print(f"MATCH FOUND! Using PDF Line {idx + 1}", file=sys.stderr)
                            print(f"{'='*70}\n", file=sys.stderr)
                        else:
                            print(f"\n{'='*70}", file=sys.stderr)
                            print(f"NO MATCH FOUND in any of the {len(lines)} lines!", file=sys.stderr)
                            print(f"{'='*70}\n", file=sys.stderr)
                        
                        if not best_match:
                            print(f"DEBUG: No match found in {len(lines)} lines. Trying fuzzy matching...", file=sys.stderr)
                            # Try fuzzy matching: check if normalized texts are similar (80%+ character overlap)
                            for line_data in lines:
                                line_text = line_data['text']
                                normalized_line = normalize_text(line_text)
                                
                                # Calculate character-based similarity
                                old_chars = set(normalized_old.lower())
                                line_chars = set(normalized_line.lower())
                                
                                if old_chars and line_chars:
                                    intersection = len(old_chars & line_chars)
                                    union = len(old_chars | line_chars)
                                    similarity = intersection / union if union > 0 else 0
                                    
                                    # Also check if one is a substring of the other
                                    if similarity > 0.8 or normalized_old.lower() in normalized_line.lower() or normalized_line.lower() in normalized_old.lower():
                                        print(f"DEBUG: Found fuzzy match! Similarity: {similarity:.2f}", file=sys.stderr)
                                        best_match = line_data
                                        best_score = 2
                                        break
                    
                    # If line-based matching didn't find a match, try position-based matching for single words
                    if not best_match and not is_line_replacement:
                        # For single word replacements, check both text and position
                        for line_data in lines:
                            line_y = line_data['y']
                            line_min_x = line_data['min_x']
                            line_max_x = line_data['max_x']
                            line_text = line_data['text']
                            normalized_line = ' '.join(line_text.strip().split())
                            
                            text_match = (normalized_old.lower() == normalized_line.lower() or
                                         normalized_old.lower() in normalized_line.lower() or 
                                         normalized_line.lower() in normalized_old.lower())
                            
                            if not text_match:
                                old_chars = set(normalized_old.lower().replace(' ', ''))
                                line_chars = set(normalized_line.lower().replace(' ', ''))
                                if old_chars and line_chars:
                                    similarity = len(old_chars & line_chars) / len(old_chars | line_chars)
                                    text_match = similarity > 0.8
                            
                            if text_match:
                                x_distance = 0
                                if target_x < line_min_x:
                                    x_distance = line_min_x - target_x
                                elif target_x > line_max_x:
                                    x_distance = target_x - line_max_x
                                
                                y_distance = abs(line_y - target_y)
                                total_distance = (x_distance ** 2 + y_distance ** 2) ** 0.5
                                
                                if total_distance < tolerance * 5 and total_distance < best_score:
                                    best_score = total_distance
                                    best_match = line_data
                    
                    # Use the best match if found
                    print(f"DEBUG: Text matching completed. Best match found: {best_match is not None}", file=sys.stderr)
                    if best_match:
                        line_data = best_match
                        line_y = line_data['y']
                        line_min_x = line_data['min_x']
                        line_max_x = line_data['max_x']
                        line_text = line_data['text']
                        
                        # Found matching line - redact all spans in the line precisely
                        # Get the exact bounding box of the entire line
                        line_bbox_x0 = line_min_x
                        line_bbox_y0 = float('inf')
                        line_bbox_x1 = line_max_x
                        line_bbox_y1 = 0
                        
                        # Find the exact vertical bounds of the line
                        for span_data in line_data['spans']:
                            bbox = span_data['bbox']
                            x0, y0, x1, y1 = bbox
                            line_bbox_y0 = min(line_bbox_y0, y0)
                            line_bbox_y1 = max(line_bbox_y1, y1)
                        
                        # Redact only the exact line area (no extra padding to avoid hiding other lines)
                        rect = fitz.Rect(line_bbox_x0, line_bbox_y0, line_bbox_x1, line_bbox_y1)
                        page.add_redact_annot(rect, fill=(1, 1, 1))  # White fill
                        
                        # Apply redactions
                        page.apply_redactions()
                        
                        # Get font properties from the first span (to match original)
                        first_span_data = line_data['spans'][0]
                        first_span = first_span_data['span']
                        original_font_size = first_span.get("size", font_size)
                        original_font_name = first_span.get("font", font_name)
                        original_color_int = first_span.get("color", 0)
                        
                        # Parse color from original text
                        r = (original_color_int >> 16) & 0xFF
                        g = (original_color_int >> 8) & 0xFF
                        b = original_color_int & 0xFF
                        color = (r / 255.0, g / 255.0, b / 255.0)
                        
                        # Add new text at the exact position with original font properties
                        # PyMuPDF insert_text uses bottom-left origin, Y is the baseline
                        # bbox uses top-left origin (y0=top, y1=bottom)
                        # The baseline is typically near y1 (bottom of text bbox)
                        # Convert from top-left to bottom-left: y_bottom = page_height - y_top
                        
                        # IMPORTANT: Use insert_textbox with the EXACT line bbox
                        # This places the text in the exact same rectangle where the original text was
                        # This matches how pdf-redactor works - it replaces text in-place
                        # The textbox will automatically handle baseline alignment within the rectangle
                        
                        # Convert line bbox from top-left origin to PyMuPDF's coordinate system
                        # PyMuPDF uses bottom-left origin for rectangles
                        # For textbox: rect uses (x0, y0, x1, y1) where y0 is bottom, y1 is top
                        textbox_rect = fitz.Rect(
                            line_bbox_x0,                    # Left edge
                            page_height - line_bbox_y1,      # Bottom (converted from top)
                            line_bbox_x1,                    # Right edge
                            page_height - line_bbox_y0       # Top (converted from top)
                        )
                        
                        # Log for debugging
                        print(f"DEBUG: Using insert_textbox with EXACT line bbox", file=sys.stderr)
                        print(f"DEBUG: Line bbox (top-left origin): ({line_bbox_x0}, {line_bbox_y0}, {line_bbox_x1}, {line_bbox_y1})", file=sys.stderr)
                        print(f"DEBUG: Line width: {line_bbox_x1 - line_bbox_x0}pt, height: {line_bbox_y1 - line_bbox_y0}pt", file=sys.stderr)
                        print(f"DEBUG: Textbox rect (bottom-left origin): ({textbox_rect.x0}, {textbox_rect.y0}, {textbox_rect.x1}, {textbox_rect.y1})", file=sys.stderr)
                        print(f"DEBUG: Frontend sent X: {target_x_pixels}px -> {target_x}pt, Y: {target_y_pixels}px -> {target_y}pt", file=sys.stderr)
                        print(f"DEBUG: Page height: {page_height}", file=sys.stderr)
                        print(f"DEBUG: Font: {original_font_name}, Size: {original_font_size}", file=sys.stderr)
                        print(f"DEBUG: New text to insert: '{new_text}'", file=sys.stderr)
                        
                        try:
                            # Use insert_textbox to place text in the exact same rectangle
                            # This ensures the text appears in the exact same position as the original
                            # insert_textbox returns the number of characters that fit, or -1 if none fit
                            chars_fit = page.insert_textbox(
                                textbox_rect,
                                new_text,
                                fontsize=original_font_size,
                                fontname=original_font_name,
                                color=color,
                                align=0  # Left align (0=left, 1=center, 2=right)
                            )
                            
                            if chars_fit < 0 or chars_fit < len(new_text):
                                # Text didn't fit in textbox, fall back to insert_text at baseline
                                print(f"DEBUG: Textbox insertion: only {chars_fit} chars fit (out of {len(new_text)}), falling back to insert_text", file=sys.stderr)
                                # Use the first span's baseline for accurate positioning
                                # The first span's y1 is the actual baseline position of the original text
                                first_span_bbox = first_span_data['bbox']
                                first_x0, first_y0, first_x1, first_y1 = first_span_bbox
                                baseline_y = page_height - first_y1
                                point = fitz.Point(first_x0, baseline_y)
                                page.insert_text(
                                    point,
                                    new_text,
                                    fontsize=original_font_size,
                                    fontname=original_font_name,
                                    color=color
                                )
                                print(f"DEBUG: Successfully inserted text using insert_text at first span baseline Y={baseline_y} (span_y1={first_y1})", file=sys.stderr)
                            else:
                                print(f"DEBUG: Successfully inserted all {chars_fit} characters using textbox", file=sys.stderr)
                            
                            found_match = True
                            replacements_made += 1
                            print(f"DEBUG: Successfully replaced text on page {page_num + 1}", file=sys.stderr)
                            break
                        except Exception as insert_error:
                            # Fallback: try with standard font (helv = Helvetica, a standard PDF font)
                            try:
                                print(f"DEBUG: Insert with original font '{original_font_name}' failed: {str(insert_error)}", file=sys.stderr)
                                print(f"DEBUG: Trying with standard font 'helv' (Helvetica) using insert_text...", file=sys.stderr)
                                # Fall back to insert_text at first span baseline (more accurate)
                                first_span_bbox = first_span_data['bbox']
                                first_x0, first_y0, first_x1, first_y1 = first_span_bbox
                                baseline_y = page_height - first_y1
                                point = fitz.Point(first_x0, baseline_y)
                                page.insert_text(
                                    point,
                                    new_text,
                                    fontsize=original_font_size,
                                    fontname="helv",  # Use standard Helvetica font
                                    color=color
                                )
                                found_match = True
                                replacements_made += 1
                                print(f"DEBUG: Successfully replaced text on page {page_num + 1} using standard font with insert_text at first span baseline Y={baseline_y}", file=sys.stderr)
                                break
                            except Exception as insert_error2:
                                # Last resort: try without fontname (PyMuPDF will use default)
                                try:
                                    print(f"DEBUG: Insert with 'helv' font also failed: {str(insert_error2)}", file=sys.stderr)
                                    print(f"DEBUG: Trying without fontname (using PyMuPDF default)...", file=sys.stderr)
                                    first_span_bbox = first_span_data['bbox']
                                    first_x0, first_y0, first_x1, first_y1 = first_span_bbox
                                    baseline_y = page_height - first_y1
                                    point = fitz.Point(first_x0, baseline_y)
                                    page.insert_text(
                                        point,
                                        new_text,
                                        fontsize=original_font_size,
                                        color=color
                                    )
                                    found_match = True
                                    replacements_made += 1
                                    print(f"DEBUG: Successfully replaced text on page {page_num + 1} using PyMuPDF default font with insert_text at first span baseline Y={baseline_y}", file=sys.stderr)
                                    break
                                except Exception as insert_error3:
                                    print(f"ERROR: Could not insert text at page {page_num + 1}: {str(insert_error3)}", file=sys.stderr)
                                    print(f"DEBUG: Textbox rect: ({textbox_rect.x0}, {textbox_rect.y0}, {textbox_rect.x1}, {textbox_rect.y1}), Font: {original_font_name}, Size: {original_font_size}", file=sys.stderr)
                                    import traceback
                                    traceback.print_exc(file=sys.stderr)
                
                if not found_match:
                    # Last resort: for line replacements, try to find ANY line with matching text (ignore position completely)
                    if is_line_replacement:
                        normalized_old = ' '.join(old_text.strip().split())
                        for block in text_dict.get("blocks", []):
                            if "lines" not in block:
                                continue
                            for line in block.get("lines", []):
                                line_text_parts = []
                                line_spans_list = []
                                for span in line.get("spans", []):
                                    span_text = span.get("text", "").strip()
                                    if span_text:
                                        line_text_parts.append(span_text)
                                        line_spans_list.append(span)
                                
                                if line_text_parts:
                                    line_text_combined = ' '.join(line_text_parts)
                                    normalized_line = ' '.join(line_text_combined.strip().split())
                                    
                                    if normalized_old.lower() == normalized_line.lower():
                                        # Found matching line - use it
                                        bbox_list = [span.get("bbox", [0, 0, 0, 0]) for span in line_spans_list]
                                        if bbox_list:
                                            min_x = min(b[0] for b in bbox_list)
                                            max_x = max(b[2] for b in bbox_list)
                                            min_y = min(b[1] for b in bbox_list)
                                            max_y = max(b[3] for b in bbox_list)
                                            
                                            # Redact the line
                                            rect = fitz.Rect(min_x - 1, min_y - 1, max_x + 1, max_y + 1)
                                            page.add_redact_annot(rect, fill=(1, 1, 1))
                                            page.apply_redactions()
                                            
                                            # Insert new text
                                            first_span = line_spans_list[0]
                                            original_font_size = first_span.get("size", font_size)
                                            original_font_name = first_span.get("font", font_name)
                                            original_color_int = first_span.get("color", 0)
                                            
                                            r = (original_color_int >> 16) & 0xFF
                                            g = (original_color_int >> 8) & 0xFF
                                            b = original_color_int & 0xFF
                                            color = (r / 255.0, g / 255.0, b / 255.0)
                                            
                                            baseline_y = page_height - max_y
                                            point = fitz.Point(min_x, baseline_y)
                                            
                                            try:
                                                page.insert_text(point, new_text, fontsize=original_font_size, fontname=original_font_name, color=color)
                                                found_match = True
                                                replacements_made += 1
                                                break
                                            except Exception as insert_error:
                                                try:
                                                    print(f"DEBUG: Insert with original font '{original_font_name}' failed: {str(insert_error)}", file=sys.stderr)
                                                    print(f"DEBUG: Trying with standard font 'helv'...", file=sys.stderr)
                                                    page.insert_text(point, new_text, fontsize=original_font_size, fontname="helv", color=color)
                                                    found_match = True
                                                    replacements_made += 1
                                                    break
                                                except Exception as insert_error2:
                                                    try:
                                                        print(f"DEBUG: Insert with 'helv' font also failed: {str(insert_error2)}", file=sys.stderr)
                                                        print(f"DEBUG: Trying without fontname...", file=sys.stderr)
                                                        page.insert_text(point, new_text, fontsize=original_font_size, color=color)
                                                        found_match = True
                                                        replacements_made += 1
                                                        break
                                                    except Exception as insert_error3:
                                                        print(f"WARNING: Could not insert text at page {page_num + 1}: {str(insert_error3)}", file=sys.stderr)
                                    
                                    if found_match:
                                        break
                                if found_match:
                                    break
                            if found_match:
                                break
                    
                    if not found_match:
                        print(f"WARNING: Could not find text '{old_text}' at position ({target_x}, {target_y}) on page {page_num + 1}", file=sys.stderr)
                        print(f"DEBUG: Original coordinates (pixels): ({target_x_pixels}, {target_y_pixels}), Converted (points): ({target_x}, {target_y})", file=sys.stderr)
                        print(f"DEBUG: Normalized search text: '{' '.join(old_text.strip().split())}'", file=sys.stderr)
                        print(f"DEBUG: Is line replacement: {is_line_replacement}, Tolerance: {tolerance}", file=sys.stderr)
        
        # Report summary
        print(f"DEBUG: Total replacements made: {replacements_made} out of {len(replacements)} requested", file=sys.stderr)
        if replacements_made == 0:
            print(f"WARNING: No replacements were successfully applied", file=sys.stderr)
        
        # Save the modified PDF
        doc.save(output_path)
        doc.close()
        
        return True
        
    except Exception as e:
        print(f"ERROR: Text replacement failed: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    print("="*70, file=sys.stderr)
    print("DEBUG: Python script STARTED", file=sys.stderr)
    print(f"DEBUG: Arguments received: {len(sys.argv)}", file=sys.stderr)
    for i, arg in enumerate(sys.argv):
        if i > 0 and i < len(sys.argv) - 1:  # Don't print full JSON, just indicate it's there
            if arg == '--json' and i + 1 < len(sys.argv):
                print(f"  arg[{i}]: {arg}", file=sys.stderr)
                print(f"  arg[{i+1}]: (JSON data, {len(sys.argv[i+1])} chars)", file=sys.stderr)
            else:
                print(f"  arg[{i}]: {arg[:100]}..." if len(arg) > 100 else f"  arg[{i}]: {arg}", file=sys.stderr)
    print("="*70, file=sys.stderr)
    
    if len(sys.argv) < 3:
        print("Usage:", file=sys.stderr)
        print("  Mode 1: python pdf_replace_text.py <input_pdf> <output_pdf> <old_text> <new_text> [case_sensitive] [replace_all]", file=sys.stderr)
        print("  Mode 2: python pdf_replace_text.py <input_pdf> <output_pdf> --json <replacements_json>", file=sys.stderr)
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    
    # Check if using JSON mode
    if len(sys.argv) > 4 and sys.argv[3] == '--json':
        replacements_json = sys.argv[4]
        try:
            replacements = json.loads(replacements_json)
            if not isinstance(replacements, list):
                replacements = [replacements]
            success = replace_text_at_positions(input_pdf, output_pdf, replacements)
        except json.JSONDecodeError as e:
            print(f"ERROR: Invalid JSON: {str(e)}", file=sys.stderr)
            sys.exit(1)
    else:
        # Original mode
        if len(sys.argv) < 4:
            print("ERROR: Missing required arguments", file=sys.stderr)
            sys.exit(1)
        
        old_text = sys.argv[3]
        new_text = sys.argv[4] if len(sys.argv) > 4 else ""
        case_sensitive = sys.argv[5].lower() == 'true' if len(sys.argv) > 5 else False
        replace_all = sys.argv[6].lower() == 'true' if len(sys.argv) > 6 else True
        
        success = replace_text_in_pdf(input_pdf, output_pdf, old_text, new_text, case_sensitive, replace_all)
    
    sys.exit(0 if success else 1)

