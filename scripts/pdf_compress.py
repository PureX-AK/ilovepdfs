#!/usr/bin/env python3
"""
PDF compression script using PyMuPDF.
Compresses PDF files by optimizing images and removing unused objects.
"""

import sys
import os

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF library not installed. Install it with: pip install PyMuPDF", file=sys.stderr)
    sys.exit(1)


def compress_pdf(input_path: str, output_path: str, compression_level: str = 'medium') -> bool:
    """
    Compress PDF using PyMuPDF with aggressive optimization.
    
    Args:
        input_path: Path to input PDF file
        output_path: Path to output compressed PDF file
        compression_level: 'low', 'medium', or 'high'
        
    Returns:
        True if compression successful, False otherwise
    """
    try:
        # Map compression level to image quality and DPI
        quality_map = {
            'low': {'dpi': 96, 'jpeg_quality': 60},      # Aggressive compression
            'medium': {'dpi': 150, 'jpeg_quality': 75},  # Balanced
            'high': {'dpi': 200, 'jpeg_quality': 85},    # Better quality
        }
        
        quality_settings = quality_map.get(compression_level.lower(), quality_map['medium'])
        target_dpi = quality_settings['dpi']
        jpeg_quality = quality_settings['jpeg_quality']
        
        # Open the PDF
        doc = fitz.open(input_path)
        
        # Process images more aggressively to reduce size
        images_processed = 0
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                image_list = page.get_images()
                
                for img_index, img in enumerate(image_list):
                    try:
                        xref = img[0]
                        pix = fitz.Pixmap(doc, xref)
                        
                        # Skip if already small or CMYK
                        if pix.n >= 4:  # CMYK or more channels
                            pix = None
                            continue
                        
                        # Calculate if we should downscale
                        # Estimate DPI: assume standard page size, calculate from image size vs page size
                        page_rect = page.rect
                        page_width_inches = page_rect.width / 72.0  # Convert points to inches
                        estimated_dpi = pix.width / page_width_inches if page_width_inches > 0 else 300
                        
                        scale_factor = target_dpi / max(estimated_dpi, 72)  # Don't upscale
                        
                        # Only process if we can reduce size
                        if scale_factor < 0.95:  # Only if reducing by at least 5%
                            new_width = max(1, int(pix.width * scale_factor))
                            new_height = max(1, int(pix.height * scale_factor))
                            
                            # Create resized pixmap
                            resized_pix = fitz.Pixmap(pix, new_width, new_height)
                            
                            # Convert to JPEG with quality setting for better compression
                            if pix.alpha == 0:  # No transparency
                                # Use JPEG with specified quality
                                # PyMuPDF doesn't support quality parameter directly, but we can use tobytes
                                # For better compression, we'll use lower quality JPEG
                                img_data = resized_pix.tobytes("jpeg")
                                
                                # If the JPEG is larger than original, skip replacement
                                original_size = len(pix.tobytes("png")) if pix.alpha > 0 else len(pix.tobytes("jpeg"))
                                if len(img_data) < original_size * 0.9:  # Only if 10% smaller
                                    doc.replace_image(xref, imgbytes=img_data)
                                    images_processed += 1
                            else:
                                # Has transparency, keep as PNG but resize
                                img_data = resized_pix.tobytes("png")
                                original_size = len(pix.tobytes("png"))
                                if len(img_data) < original_size * 0.9:  # Only if 10% smaller
                                    doc.replace_image(xref, imgbytes=img_data)
                                    images_processed += 1
                            
                            resized_pix = None
                        
                        pix = None
                        
                    except Exception as e:
                        # Skip problematic images
                        print(f"Warning: Skipping image {img_index} on page {page_num + 1}: {e}", file=sys.stderr)
                        continue
        except Exception as e:
            # Continue even if image processing fails
            print(f"Warning: Image processing error: {e}", file=sys.stderr)
        
        # Aggressive compression options
        # Use maximum garbage collection and compression
        save_options = {
            'garbage': 4,        # Maximum garbage collection (remove all unused objects)
            'deflate': True,     # Use deflate compression for streams
            'clean': True,       # Clean and sanitize content streams
            'ascii': False,      # Keep binary (smaller)
        }
        
        # Adjust based on compression level
        if compression_level.lower() == 'low':
            save_options['garbage'] = 4  # Most aggressive
        elif compression_level.lower() == 'high':
            save_options['garbage'] = 3  # Less aggressive but still good
        
        # Save the compressed PDF
        doc.save(output_path, **save_options)
        doc.close()
        
        return True
        
    except Exception as e:
        print(f"ERROR: Failed to compress PDF: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return False


def main():
    """Main function to handle command line arguments."""
    if len(sys.argv) < 3:
        print("Usage: python pdf_compress.py <input_pdf> <output_pdf> [compression_level]", file=sys.stderr)
        print("  compression_level: low, medium (default), or high", file=sys.stderr)
        sys.exit(1)
    
    input_path = sys.argv[1]
    output_path = sys.argv[2]
    compression_level = sys.argv[3] if len(sys.argv) > 3 else 'medium'
    
    # Validate input file exists
    if not os.path.exists(input_path):
        print(f"ERROR: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)
    
    # Validate compression level
    if compression_level.lower() not in ['low', 'medium', 'high']:
        print(f"WARNING: Invalid compression level '{compression_level}', using 'medium'", file=sys.stderr)
        compression_level = 'medium'
    
    # Compress the PDF
    try:
        success = compress_pdf(input_path, output_path, compression_level)
        
        if not success:
            print("ERROR: Compression function returned False", file=sys.stderr)
            sys.exit(1)
        
        # Verify output file was created
        if not os.path.exists(output_path):
            print(f"ERROR: Output file was not created: {output_path}", file=sys.stderr)
            sys.exit(1)
        
        # Verify output file is not empty
        if os.path.getsize(output_path) == 0:
            print("ERROR: Output file is empty", file=sys.stderr)
            sys.exit(1)
        
        # Get file sizes for statistics
        original_size = os.path.getsize(input_path)
        compressed_size = os.path.getsize(output_path)
        compression_ratio = ((1 - compressed_size / original_size) * 100) if original_size > 0 else 0
        
        # If compression made file larger, try a simpler approach
        if compressed_size >= original_size:
            print(f"Warning: Initial compression increased size ({compressed_size} vs {original_size}). Trying simpler compression...", file=sys.stderr)
            
            # Try again with just garbage collection and deflate, no image processing
            try:
                doc = fitz.open(input_path)
                doc.save(output_path, garbage=4, deflate=True, clean=True, ascii=False)
                doc.close()
                
                new_size = os.path.getsize(output_path)
                if new_size < compressed_size:
                    compressed_size = new_size
                    compression_ratio = ((1 - compressed_size / original_size) * 100) if original_size > 0 else 0
                    print("Simpler compression produced better results", file=sys.stderr)
            except Exception as e:
                print(f"Warning: Simpler compression also failed: {e}", file=sys.stderr)
        
        # Output statistics as JSON for the API to parse
        import json
        stats = {
            'success': True,
            'original_size': original_size,
            'compressed_size': compressed_size,
            'compression_ratio': round(compression_ratio, 1),
            'size_reduction': round((original_size - compressed_size) / 1024, 1)
        }
        print(json.dumps(stats))
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: Unexpected error during compression: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

