#!/usr/bin/env python3
"""
Add watermark to PDF using PyMuPDF.
Supports text watermarks with customizable position, size, color, and opacity.
"""

import sys
import os
import re

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: PyMuPDF library not installed. Install it with: pip install PyMuPDF", file=sys.stderr)
    sys.exit(1)


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 6:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    return (128, 128, 128)  # Default gray


def add_watermark(pdf_path: str, output_path: str, watermark_text: str, 
                  font_size: float, opacity: float, position: str, 
                  color: str = '#808080') -> bool:
    """
    Add text watermark to PDF.
    
    Args:
        pdf_path: Path to input PDF file
        output_path: Path to output PDF file
        watermark_text: Text to use as watermark
        font_size: Font size for watermark
        opacity: Opacity (0.0 to 1.0)
        position: 'center' or 'diagonal'
        color: Hex color code (e.g., '#808080')
        
    Returns:
        True if watermarking successful, False otherwise
    """
    try:
        if not os.path.exists(pdf_path):
            print(f"ERROR: PDF file not found: {pdf_path}", file=sys.stderr)
            return False
        
        # Open PDF
        doc = fitz.open(pdf_path)
        
        # Convert hex color to RGB
        rgb_color = hex_to_rgb(color)
        # Normalize to 0-1 range for PyMuPDF
        color_normalized = (rgb_color[0] / 255.0, rgb_color[1] / 255.0, rgb_color[2] / 255.0)
        
        # Process each page
        for page_num in range(len(doc)):
            page = doc[page_num]
            page_rect = page.rect
            
            # Calculate center point
            center_x = page_rect.width / 2
            center_y = page_rect.height / 2
            
            # Determine rotation
            rotation = 0 if position == 'center' else -45  # -45 degrees for diagonal
            
            # For opacity, adjust color (blend with white background)
            if opacity < 1.0:
                # Adjust color based on opacity (blend with white background)
                adjusted_color = tuple(
                    min(255, int(c * 255 * opacity + 255 * (1 - opacity))) 
                    for c in color_normalized
                )
                # Normalize back
                final_color = tuple(c / 255.0 for c in adjusted_color)
            else:
                final_color = color_normalized
            
            # Use page.insert_textbox for better control, or use shape with standard font
            # PyMuPDF uses bottom-left origin, so adjust center_y
            center_y_from_bottom = page_rect.height - center_y
            
            # Approximate text width for centering
            text_width_approx = len(watermark_text) * font_size * 0.6
            text_x = center_x - (text_width_approx / 2)
            
            # Use insert_textbox for better font handling and rotation support
            # Create a text box that can be rotated
            text_rect = fitz.Rect(0, 0, page_rect.width, page_rect.height)
            
            if rotation == 0:
                # No rotation - center the text
                try:
                    rc = page.insert_textbox(
                        text_rect,
                        watermark_text,
                        fontsize=font_size,
                        color=final_color,
                        align=1,  # Center alignment
                        render_mode=3  # Invisible text
                    )
                    if rc < 0:
                        # Fallback without render_mode
                        page.insert_textbox(
                            text_rect,
                            watermark_text,
                            fontsize=font_size,
                            color=final_color,
                            align=1
                        )
                except:
                    # Fallback: use simple insert_text
                    page.insert_text(
                        fitz.Point(text_x, center_y_from_bottom),
                        watermark_text,
                        fontsize=font_size,
                        color=final_color
                    )
            else:
                # With rotation - use PIL/Pillow to create rotated text image
                try:
                    from PIL import Image, ImageDraw, ImageFont
                    import io
                    
                    # Create image with text
                    # Estimate text size
                    img_width = int(text_width_approx * 1.5)
                    img_height = int(font_size * 2)
                    
                    # Create white background image
                    img = Image.new('RGBA', (img_width, img_height), (255, 255, 255, 0))
                    draw = ImageDraw.Draw(img)
                    
                    # Convert color
                    img_color = tuple(int(c * 255) for c in final_color)
                    # Add alpha based on opacity
                    if opacity < 1.0:
                        img_color = img_color + (int(opacity * 255),)
                    else:
                        img_color = img_color + (255,)
                    
                    # Draw text (try to use default font, fallback to basic)
                    try:
                        # Try to use a truetype font if available
                        font_obj = ImageFont.truetype("arial.ttf", int(font_size))
                    except:
                        try:
                            font_obj = ImageFont.load_default()
                        except:
                            font_obj = None
                    
                    # Get text bounding box
                    if font_obj:
                        bbox = draw.textbbox((0, 0), watermark_text, font=font_obj)
                        text_w = bbox[2] - bbox[0]
                        text_h = bbox[3] - bbox[1]
                    else:
                        text_w = len(watermark_text) * font_size * 0.6
                        text_h = font_size
                    
                    # Center text in image
                    text_x_img = (img_width - text_w) / 2
                    text_y_img = (img_height - text_h) / 2
                    
                    # Draw text
                    if font_obj:
                        draw.text((text_x_img, text_y_img), watermark_text, fill=img_color, font=font_obj)
                    else:
                        draw.text((text_x_img, text_y_img), watermark_text, fill=img_color)
                    
                    # Rotate image
                    rotated_img = img.rotate(rotation, expand=True, fillcolor=(255, 255, 255, 0))
                    
                    # Convert to bytes
                    img_bytes_io = io.BytesIO()
                    rotated_img.save(img_bytes_io, format='PNG')
                    img_bytes = img_bytes_io.getvalue()
                    img_bytes_io.close()
                    
                    # Calculate rotated image dimensions
                    rot_width, rot_height = rotated_img.size
                    rot_w = rot_width / 2.0  # Adjust scale if needed
                    rot_h = rot_height / 2.0
                    
                    # Create rect for rotated image at center
                    img_rect = fitz.Rect(
                        center_x - rot_w/2,
                        center_y_from_bottom - rot_h/2,
                        center_x + rot_w/2,
                        center_y_from_bottom + rot_h/2
                    )
                    
                    # Insert rotated image
                    page.insert_image(img_rect, stream=img_bytes)
                    
                except ImportError:
                    # PIL not available - fallback to simple text
                    print("WARNING: PIL/Pillow not available, using simple text without rotation", file=sys.stderr)
                    page.insert_text(
                        fitz.Point(text_x, center_y_from_bottom),
                        watermark_text,
                        fontsize=font_size,
                        color=final_color
                    )
                except Exception as e:
                    # Any other error - fallback
                    print(f"WARNING: Rotated watermark failed, using simple text: {str(e)}", file=sys.stderr)
                    page.insert_text(
                        fitz.Point(text_x, center_y_from_bottom),
                        watermark_text,
                        fontsize=font_size,
                        color=final_color
                    )
        
        # Save the watermarked PDF
        doc.save(output_path)
        doc.close()
        
        return True
        
    except Exception as e:
        print(f"ERROR: Watermarking failed: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    if len(sys.argv) < 7:
        print("Usage: python pdf_watermark.py <input_pdf> <output_pdf> <watermark_text> <font_size> <opacity> <position> [color]", file=sys.stderr)
        print("  position: 'center' or 'diagonal'", file=sys.stderr)
        print("  color: Hex color code (default: #808080)", file=sys.stderr)
        sys.exit(1)
    
    input_pdf = sys.argv[1]
    output_pdf = sys.argv[2]
    watermark_text = sys.argv[3]
    font_size = float(sys.argv[4])
    opacity = float(sys.argv[5])
    position = sys.argv[6]
    color = sys.argv[7] if len(sys.argv) > 7 else '#808080'
    
    success = add_watermark(input_pdf, output_pdf, watermark_text, font_size, opacity, position, color)
    sys.exit(0 if success else 1)

