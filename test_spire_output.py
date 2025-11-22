#!/usr/bin/env python3
"""Test what HTML structure spire-pdf generates"""

import sys
import os
from pathlib import Path

try:
    from spire.pdf import PdfDocument, FileFormat
    from bs4 import BeautifulSoup
except ImportError as e:
    print(f"ERROR: {e}", file=sys.stderr)
    sys.exit(1)

# Create a simple test PDF or use an existing one
test_pdf = sys.argv[1] if len(sys.argv) > 1 else None

if not test_pdf or not os.path.exists(test_pdf):
    print("Usage: python test_spire_output.py <path_to_pdf>", file=sys.stderr)
    print("This will show the HTML structure that spire-pdf generates", file=sys.stderr)
    sys.exit(1)

try:
    # Convert PDF to HTML
    doc = PdfDocument()
    doc.LoadFromFile(test_pdf)
    
    temp_html = "test_spire_output.html"
    doc.SaveToFile(temp_html, FileFormat.HTML)
    doc.Close()
    
    # Read and analyze the HTML
    with open(temp_html, 'r', encoding='utf-8', errors='ignore') as f:
        html_content = f.read()
    
    print(f"HTML length: {len(html_content)} characters")
    print(f"\nFirst 2000 characters of HTML:")
    print(html_content[:2000])
    print("\n" + "="*80)
    
    # Parse with BeautifulSoup
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Find all elements
    all_elements = soup.find_all(True)
    print(f"\nTotal elements: {len(all_elements)}")
    
    # Count by tag type
    tag_counts = {}
    for el in all_elements:
        tag = el.name
        tag_counts[tag] = tag_counts.get(tag, 0) + 1
    
    print("\nElement counts by tag:")
    for tag, count in sorted(tag_counts.items(), key=lambda x: -x[1])[:20]:
        print(f"  {tag}: {count}")
    
    # Find elements with text
    elements_with_text = []
    for el in all_elements:
        if el.name in ['script', 'style', 'meta', 'link']:
            continue
        text = el.get_text(strip=True)
        if text and len(text.strip()) > 0:
            elements_with_text.append((el.name, text[:50]))
    
    print(f"\nElements with text: {len(elements_with_text)}")
    print("First 10 elements with text:")
    for tag, text in elements_with_text[:10]:
        print(f"  <{tag}>: {text}")
    
    # Check if there are images
    images = soup.find_all('img')
    print(f"\nImages found: {len(images)}")
    if images:
        print("First 3 images:")
        for img in images[:3]:
            print(f"  {img}")
    
    # Clean up
    if os.path.exists(temp_html):
        os.remove(temp_html)
        
except Exception as e:
    print(f"ERROR: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc()

