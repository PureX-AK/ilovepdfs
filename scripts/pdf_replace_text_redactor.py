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
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False
        
        if not replacements:
            print("ERROR: No replacements provided", file=sys.stderr)
            return False
        
        options = pdf_redactor.RedactorOptions()
        options.input_stream = open(pdf_path, 'rb')
        options.output_stream = open(output_path, 'wb')
        
        content_filters = []
        
        for idx, replacement in enumerate(replacements):
            old_text = replacement.get('oldText', '').strip()
            new_text = replacement.get('newText', '').strip()
            
            if not old_text:
                print(f"WARNING: Replacement {idx + 1} has empty oldText, skipping", file=sys.stderr)
                continue
            
            print(f"Processing replacement {idx + 1}:", file=sys.stderr)
            print(f"  oldText length: {len(old_text)} chars", file=sys.stderr)
            print(f"  oldText preview: {repr(old_text[:100])}...", file=sys.stderr)
            print(f"  newText preview: {repr(new_text[:100])}...", file=sys.stderr)
            
            # Normalize text: remove ALL whitespace for comparison
            def normalize_text(text):
                return re.sub(r'\s+', '', text.strip())
            
            # For very long text (paragraphs), we need a more flexible approach
            # The issue is that PDFs may encode text differently (spaces, newlines, etc.)
            # Strategy: Create a pattern that allows flexible whitespace matching
            
            # First, try to escape special regex characters
            escaped_old_text = re.escape(old_text)
            
            # Replace escaped spaces with flexible whitespace pattern
            # This allows spaces, newlines, tabs, etc. to match
            # Use \s+ to match one or more whitespace characters
            flexible_pattern = re.sub(r'\\ ', r'\\s+', escaped_old_text)
            
            # For very long text, also try a more aggressive pattern that allows
            # optional whitespace between words (but this might be too permissive)
            # Let's start with the simpler approach
            
            try:
                # Use DOTALL to allow . to match newlines, and IGNORECASE for case-insensitive
                pattern = re.compile(flexible_pattern, re.IGNORECASE | re.DOTALL)
                print(f"  Pattern compiled successfully (length: {len(flexible_pattern)} chars)", file=sys.stderr)
            except Exception as e:
                print(f"  ERROR: Failed to compile flexible pattern: {e}", file=sys.stderr)
                print(f"  Falling back to exact pattern", file=sys.stderr)
                try:
                    pattern = re.compile(escaped_old_text, re.IGNORECASE)
                except Exception as e2:
                    print(f"  ERROR: Failed to compile exact pattern: {e2}", file=sys.stderr)
                    print(f"  Skipping this replacement", file=sys.stderr)
                    continue
            
            # Track if replacement was applied
            match_tracker = {'found': False, 'count': 0}
            
            def make_replacement_func(replacement_text, tracker):
                def replacement_func(match):
                    tracker['found'] = True
                    tracker['count'] += 1
                    # Normalize spacing: collapse multiple spaces/newlines to single space
                    normalized = re.sub(r'\s+', ' ', replacement_text.strip())
                    print(f"  → MATCH #{tracker['count']} FOUND! Applying replacement", file=sys.stderr)
                    return normalized
                return replacement_func
            
            replacement_func = make_replacement_func(new_text, match_tracker)
            # pdf-redactor expects (pattern, function) tuples only
            content_filters.append((pattern, replacement_func))
            # Store trackers separately for reporting
            if not hasattr(replace_text_at_positions, '_match_trackers'):
                replace_text_at_positions._match_trackers = []
            replace_text_at_positions._match_trackers.append(match_tracker)
            print(f"  ✓ Pattern created and added to filters", file=sys.stderr)
        
        if not content_filters:
            print("ERROR: No valid replacements to process", file=sys.stderr)
            options.input_stream.close()
            options.output_stream.close()
            return False
        
        options.content_filters = content_filters
        
        print(f"\nTotal filters to apply: {len(content_filters)}", file=sys.stderr)
        print("Starting redaction process...", file=sys.stderr)
        
        try:
            pdf_redactor.redactor(options)
            print("✓ Redaction completed successfully", file=sys.stderr)
            
            # Report match results
            if hasattr(replace_text_at_positions, '_match_trackers') and replace_text_at_positions._match_trackers:
                print("\nReplacement results:", file=sys.stderr)
                for idx, tracker in enumerate(replace_text_at_positions._match_trackers):
                    if tracker['count'] > 0:
                        print(f"  Replacement {idx + 1}: ✓ Applied ({tracker['count']} match(es))", file=sys.stderr)
                    else:
                        print(f"  Replacement {idx + 1}: ✗ No match found", file=sys.stderr)
                        print(f"    → The text may not exist in the PDF, or spacing/encoding differs", file=sys.stderr)
                        print(f"    → For long paragraphs, try editing smaller sections", file=sys.stderr)
        except Exception as e:
            print(f"ERROR during redaction: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            return False
        finally:
            options.input_stream.close()
            options.output_stream.close()
        
        if not os.path.exists(output_path):
            print("ERROR: Output file was not created", file=sys.stderr)
            return False
        
        # Check output file size
        output_size = os.path.getsize(output_path)
        print(f"Output file created: {output_size} bytes", file=sys.stderr)
        
        return True
        
    except Exception as e:
        print(f"ERROR: Text replacement failed: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
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

