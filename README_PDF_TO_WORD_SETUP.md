# PDF to Word Server-Side Conversion Setup

This project now supports server-side PDF to Word conversion using the `pdf2docx` Python library, which provides much better formatting preservation than client-side conversion.

## Prerequisites

1. **Python 3.8 or higher** must be installed on your system
2. **pdf2docx library** must be installed in Python

## Installation Steps

### 1. Install Python

**Windows:**
- Download from [python.org](https://www.python.org/downloads/)
- During installation, check "Add Python to PATH"
- Verify installation: `python --version`

**macOS:**
- Python 3 is usually pre-installed
- Verify: `python3 --version`
- If not installed: `brew install python3`

**Linux:**
- `sudo apt-get install python3 python3-pip` (Ubuntu/Debian)
- `sudo yum install python3 python3-pip` (CentOS/RHEL)

### 2. Install pdf2docx Library

Open terminal/command prompt and run:

```bash
pip install pdf2docx
```

Or if you need to use `pip3`:

```bash
pip3 install pdf2docx
```

### 3. Verify Installation

Test that everything works:

```bash
python -c "import pdf2docx; print('pdf2docx installed successfully')"
```

Or on macOS/Linux:

```bash
python3 -c "import pdf2docx; print('pdf2docx installed successfully')"
```

## How It Works

1. **Client-side (Fallback)**: If server-side conversion fails, the app automatically falls back to the original client-side conversion using `pdfjs-dist` and `docx` libraries.

2. **Server-side (Primary)**: When Python and pdf2docx are available, the app uses the `/api/pdf-to-word-server` endpoint which:
   - Accepts the PDF file
   - Calls the Python script (`scripts/pdf_to_docx.py`)
   - Converts PDF to DOCX with better formatting preservation
   - Returns the DOCX file

## Features

The server-side conversion using pdf2docx provides:
- ✅ Better table preservation
- ✅ Image extraction and embedding
- ✅ Better formatting preservation
- ✅ More accurate text positioning
- ✅ Handles complex layouts better

## Troubleshooting

### "Python not found" Error

- Ensure Python is installed and in your PATH
- On Windows, restart your terminal after installing Python
- Try using `python3` instead of `python` (update the script if needed)

### "pdf2docx library not installed" Error

- Run: `pip install pdf2docx`
- If using virtual environment, ensure it's activated
- Try: `pip3 install pdf2docx` on macOS/Linux

### Conversion Fails Silently

- Check server logs for Python errors
- Ensure the `scripts/pdf_to_docx.py` file exists
- Verify file permissions on the scripts directory

## Development Notes

- The Python script is located at: `scripts/pdf_to_docx.py`
- The API route is at: `app/api/pdf-to-word-server/route.ts`
- The client component automatically tries server-side first, then falls back to client-side

## Production Deployment

For production (e.g., Azure, AWS, etc.):

1. **Docker**: Include Python and pdf2docx in your Dockerfile
2. **Serverless**: May need to use a different approach (cloud APIs)
3. **VPS/Server**: Install Python and pdf2docx on the server

See the main README for deployment-specific instructions.

