#!/usr/bin/env python3
"""
Hybrid PDF text replacement script combining pdf-redactor's positioning 
with PyMuPDF's text control for better results.
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


def normalize_text(text):
    """Normalize text by removing all spaces for matching."""
    return re.sub(r'\s+', '', text.strip())


def replace_text_at_positions(pdf_path: str, output_path: str, replacements: list) -> bool:
    """
    Replace text in PDF using PyMuPDF with content-based matching (like pdf-redactor).
    This combines accurate positioning with proper text display.
    
    Args:
        pdf_path: Path to input PDF file
        output_path: Path to output PDF file
        replacements: List of replacement dicts with oldText, newText, pageNum, etc.
        
    Returns:
        True if replacement successful, False otherwise
    """
    print(f"DEBUG: Starting hybrid replace_text_at_positions with {len(replacements)} replacements", file=sys.stderr)
    
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False
        
        if not replacements:
            print("ERROR: No replacements provided", file=sys.stderr)
            return False
        
        # Open PDF
        doc = fitz.open(pdf_path)
        replacements_made = 0
        
        # Process each replacement
        for replacement in replacements:
            old_text = replacement.get('oldText', '').strip()
            new_text = replacement.get('newText', '').strip()
            page_num = replacement.get('pageNum', 1) - 1  # Convert to 0-indexed
            
            if page_num < 0 or page_num >= len(doc):
                print(f"WARNING: Invalid page number {replacement.get('pageNum')}, skipping", file=sys.stderr)
                continue
            
            if not old_text:
                continue
            
            page = doc[page_num]
            page_height = page.rect.height
            
            print(f"\nDEBUG: Processing replacement on page {page_num + 1}", file=sys.stderr)
            print(f"DEBUG: oldText: '{old_text[:50]}...'", file=sys.stderr)
            print(f"DEBUG: newText: '{new_text[:50]}...'", file=sys.stderr)
            
            # Normalize text for matching
            normalized_old = normalize_text(old_text)
            
            # Get all text instances on the page with their positions
            text_dict = page.get_text("dict")
            
            # Find matching text using content-based search (like pdf-redactor)
            # Search through all text blocks to find the exact match
            found_match = False
            match_bbox = None
            match_font_props = None
            
            for block in text_dict.get("blocks", []):
                if "lines" not in block:
                    continue
                
                for line in block.get("lines", []):
                    line_text_parts = []
                    line_spans = []
                    line_bbox = None
                    min_x = float('inf')
                    max_x = 0
                    min_y = float('inf')
                    max_y = 0
                    
                    for span in line.get("spans", []):
                        span_text = span.get("text", "").strip()
                        if span_text:
                            line_text_parts.append(span_text)
                            line_spans.append(span)
                            
                            # Get span bbox
                            bbox = span.get("bbox", [0, 0, 0, 0])
                            x0, y0, x1, y1 = bbox
                            min_x = min(min_x, x0)
                            max_x = max(max_x, x1)
                            min_y = min(min_y, y0)
                            max_y = max(max_y, y1)
                    
                    if line_text_parts:
                        # Combine line text and normalize
                        line_text = ' '.join(line_text_parts)
                        normalized_line = normalize_text(line_text)
                        
                        # Check for match (exact or partial)
                        if (normalized_old.lower() == normalized_line.lower() or
                            normalized_old.lower() in normalized_line.lower() or
                            normalized_line.lower() in normalized_old.lower()):
                            
                            # Found match - use this line's bbox
                            match_bbox = (min_x, min_y, max_x, max_y)
                            match_font_props = {
                                'size': line_spans[0].get("size", 12),
                                'font': line_spans[0].get("font", "helv"),
                                'color': line_spans[0].get("color", 0)
                            }
                            found_match = True
                            print(f"DEBUG: Found text match: '{line_text[:50]}...'", file=sys.stderr)
                            print(f"DEBUG: Match bbox: {match_bbox}", file=sys.stderr)
                            break
                    
                    if found_match:
                        break
                
                if found_match:
                    break
            
            if not found_match:
                print(f"WARNING: Could not find text '{old_text[:50]}...' on page {page_num + 1}", file=sys.stderr)
                continue
            
            # Redact the matched text
            x0, y0, x1, y1 = match_bbox
            rect = fitz.Rect(x0, y0, x1, y1)
            page.add_redact_annot(rect, fill=(1, 1, 1))  # White fill
            page.apply_redactions()
            
            # Insert new text at the exact same position
            # Use the redacted rectangle for insertion
            textbox_rect = fitz.Rect(
                x0,                           # Left
                page_height - y1,            # Bottom (convert from top-left to bottom-left)
                x1,                           # Right
                page_height - y0             # Top (convert from top-left to bottom-left)
            )
            
            # Parse color
            color_int = match_font_props['color']
            r = (color_int >> 16) & 0xFF
            g = (color_int >> 8) & 0xFF
            b = color_int & 0xFF
            color = (r / 255.0, g / 255.0, b / 255.0)
            
            print(f"DEBUG: Inserting text at bbox: {textbox_rect}", file=sys.stderr)
            print(f"DEBUG: Font: {match_font_props['font']}, Size: {match_font_props['size']}", file=sys.stderr)
            
            # Try to insert text in the exact rectangle
            try:
                chars_fit = page.insert_textbox(
                    textbox_rect,
                    new_text,
                    fontsize=match_font_props['size'],
                    fontname=match_font_props['font'],
                    color=color,
                    align=0
                )
                
                if chars_fit < 0 or chars_fit < len(new_text):
                    # Textbox didn't work, use insert_text at baseline
                    print(f"DEBUG: Textbox fit {chars_fit} chars, using insert_text at baseline", file=sys.stderr)
                    baseline_y = page_height - y1
                    point = fitz.Point(x0, baseline_y)
                    page.insert_text(
                        point,
                        new_text,
                        fontsize=match_font_props['size'],
                        fontname=match_font_props['font'],
                        color=color
                    )
            except Exception as e:
                # Fallback to standard font
                try:
                    print(f"DEBUG: Insert failed: {str(e)}, trying with 'helv' font", file=sys.stderr)
                    baseline_y = page_height - y1
                    point = fitz.Point(x0, baseline_y)
                    page.insert_text(
                        point,
                        new_text,
                        fontsize=match_font_props['size'],
                        fontname="helv",
                        color=color
                    )
                except Exception as e2:
                    # Last resort: default font
                    try:
                        print(f"DEBUG: Insert with 'helv' failed: {str(e2)}, trying default font", file=sys.stderr)
                        baseline_y = page_height - y1
                        point = fitz.Point(x0, baseline_y)
                        page.insert_text(
                            point,
                            new_text,
                            fontsize=match_font_props['size'],
                            color=color
                        )
                    except Exception as e3:
                        print(f"ERROR: Could not insert text: {str(e3)}", file=sys.stderr)
                        continue
            
            replacements_made += 1
            print(f"DEBUG: Successfully replaced text on page {page_num + 1}", file=sys.stderr)
        
        # Report summary
        print(f"\nDEBUG: Total replacements made: {replacements_made} out of {len(replacements)} requested", file=sys.stderr)
        
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
    print("DEBUG: pdf_replace_text_hybrid.py STARTED", file=sys.stderr)
    print(f"DEBUG: Arguments received: {len(sys.argv)}", file=sys.stderr)
    for i, arg in enumerate(sys.argv):
        if i > 0 and i < len(sys.argv) - 1:
            if arg == '--json' and i + 1 < len(sys.argv):
                print(f"  arg[{i}]: {arg}", file=sys.stderr)
                print(f"  arg[{i+1}]: (JSON data, {len(sys.argv[i+1])} chars)", file=sys.stderr)
            else:
                print(f"  arg[{i}]: {arg[:100]}..." if len(arg) > 100 else f"  arg[{i}]: {arg}", file=sys.stderr)
    print("="*70, file=sys.stderr)
    
    if len(sys.argv) < 3:
        print("Usage: python pdf_replace_text_hybrid.py <input_pdf> <output_pdf> --json <replacements_json>", file=sys.stderr)
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    
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
        print("ERROR: JSON mode required. Use: --json <replacements_json>", file=sys.stderr)
        sys.exit(1)
    
    sys.exit(0 if success else 1)

