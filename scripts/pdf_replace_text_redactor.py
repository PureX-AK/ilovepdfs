#!/usr/bin/env python3
"""
Replace text in PDF using pdf-redactor library.
Uses content-based matching for more reliable text replacement.
"""

import sys
import os
import re
import json

try:
    import pdf_redactor
except ImportError:
    print("ERROR: pdf-redactor library not installed. Install it with: pip install pdf-redactor", file=sys.stderr)
    sys.exit(1)


def replace_text_at_positions(pdf_path: str, output_path: str, replacements: list) -> bool:
    """
    Replace text at specific positions in PDF using pdf-redactor.
    
    Args:
        pdf_path: Path to input PDF file
        output_path: Path to output PDF file
        replacements: List of replacement dicts with keys:
            - oldText: Text to replace (will be escaped for regex)
            - newText: Replacement text
            - pageNum: Page number (1-indexed) - for reference only, pdf-redactor processes all pages
            
    Returns:
        True if replacement successful, False otherwise
    """
    print("\n" + "="*70, file=sys.stderr)
    print("DEBUG: pdf_replace_text_redactor.py - replace_text_at_positions() CALLED", file=sys.stderr)
    print(f"DEBUG: PDF path: {pdf_path}", file=sys.stderr)
    print(f"DEBUG: Output path: {output_path}", file=sys.stderr)
    print(f"DEBUG: Number of replacements: {len(replacements)}", file=sys.stderr)
    print("="*70 + "\n", file=sys.stderr)
    
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False
        
        if not replacements:
            print("ERROR: No replacements provided", file=sys.stderr)
            return False
        
        # Create redactor options
        options = pdf_redactor.RedactorOptions()
        
        # Set input and output streams
        options.input_stream = open(pdf_path, 'rb')
        options.output_stream = open(output_path, 'wb')
        
        # Build content filters from replacements
        # pdf-redactor expects (pattern, callable) where callable takes match and returns replacement
        content_filters = []
        
        print(f"\n{'='*70}", file=sys.stderr)
        print("DEBUG: PROCESSING REPLACEMENTS", file=sys.stderr)
        print(f"{'='*70}", file=sys.stderr)
        
        for idx, replacement in enumerate(replacements):
            old_text = replacement.get('oldText', '').strip()
            new_text = replacement.get('newText', '').strip()
            page_num = replacement.get('pageNum', 1)
            
            print(f"\nReplacement {idx + 1}:", file=sys.stderr)
            print(f"  oldText (from frontend): '{old_text}'", file=sys.stderr)
            print(f"  oldText length: {len(old_text)} chars", file=sys.stderr)
            print(f"  newText: '{new_text}'", file=sys.stderr)
            print(f"  pageNum: {page_num}", file=sys.stderr)
            
            if not old_text:
                print(f"  WARNING: Skipping - oldText is empty", file=sys.stderr)
                continue
            
            # Normalize text: remove all spaces for flexible matching
            # This handles spacing differences between frontend and PDF
            def normalize_text(text):
                # Remove ALL spaces
                return re.sub(r'\s+', '', text.strip())
            
            normalized_old = normalize_text(old_text)
            print(f"  Normalized oldText (spaces removed): '{normalized_old}'", file=sys.stderr)
            
            # For pdf-redactor, we need to create a flexible pattern
            # Since pdf-redactor does regex matching, we can use a pattern that matches
            # the text with optional spaces
            # But first, let's try with the original text (exact match)
            escaped_old_text = re.escape(old_text)
            
            # Also create a normalized pattern (spaces removed) for flexible matching
            # Replace spaces in the escaped text with \s* (zero or more whitespace)
            flexible_pattern = re.sub(r'\\ ', r'\\s*', escaped_old_text)
            
            print(f"  Regex pattern (exact): '{escaped_old_text}'", file=sys.stderr)
            print(f"  Regex pattern (flexible): '{flexible_pattern}'", file=sys.stderr)
            
            # Try flexible pattern first (allows spacing differences)
            try:
                pattern = re.compile(flexible_pattern, re.IGNORECASE)
                print(f"  Using FLEXIBLE pattern (allows spacing differences)", file=sys.stderr)
            except:
                # Fallback to exact pattern
                pattern = re.compile(escaped_old_text, re.IGNORECASE)
                print(f"  Using EXACT pattern (fallback)", file=sys.stderr)
            
            # Create a callable function that returns the replacement text
            # Use a factory function to properly capture each replacement text in closure
            # This prevents all functions from capturing the same variable
            def make_replacement_func(replacement_text):
                def replacement_func(match):
                    # Return the full replacement text
                    # pdf-redactor may split this across tokens, but we return the full text
                    return replacement_text
                return replacement_func
            
            replacement_func = make_replacement_func(new_text)
            
            # Add as a filter: (compiled_pattern, callable_function)
            content_filters.append((pattern, replacement_func))
            print(f"  ✓ Added to content filters", file=sys.stderr)
        
        print(f"\n{'='*70}", file=sys.stderr)
        print(f"DEBUG: Total content filters created: {len(content_filters)}", file=sys.stderr)
        print(f"{'='*70}\n", file=sys.stderr)
        
        if not content_filters:
            print("ERROR: No valid replacements to process", file=sys.stderr)
            options.input_stream.close()
            options.output_stream.close()
            return False
        
        options.content_filters = content_filters
        
        try:
            # Perform redaction/replacement
            pdf_redactor.redactor(options)
        finally:
            # Close streams
            options.input_stream.close()
            options.output_stream.close()
        
        # Verify output file was created
        if not os.path.exists(output_path):
            print("ERROR: Output file was not created", file=sys.stderr)
            return False
        
        return True
        
    except Exception as e:
        print(f"ERROR: Text replacement failed: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    print("="*70, file=sys.stderr)
    print("DEBUG: pdf_replace_text_redactor.py STARTED", file=sys.stderr)
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
        print("Usage: python pdf_replace_text_redactor.py <input_pdf> <output_pdf> --json <replacements_json>", file=sys.stderr)
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

