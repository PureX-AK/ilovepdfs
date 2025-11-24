import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest) {
  let tempInputPath: string | null = null;
  let tempOutputPath: string | null = null;

  try {
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const language = (formData.get('language') as string) || 'eng';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload a PDF file.' },
        { status: 400 }
      );
    }

    // Validate file size (25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 25MB limit' },
        { status: 400 }
      );
    }

    // Create temporary file paths
    const tempDir = os.tmpdir();
    const uniqueId = Date.now() + Math.random().toString(36).substring(7);
    tempInputPath = path.join(tempDir, `input_${uniqueId}.pdf`);
    tempOutputPath = path.join(tempDir, `output_${uniqueId}.pdf`);

    // Read the file and save to temporary location
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(tempInputPath, inputBuffer);

    // Find Python executable
    let pythonCmd = 'python3';
    const pythonCommands = ['python3', 'python', 'py'];
    
    // On Windows, also check common installation paths
    if (process.platform === 'win32') {
      const pythonPaths = [
        'python3.exe',
        'python.exe',
        'C:\\Python311\\python.exe',
        'C:\\Python310\\python.exe',
        'C:\\Python39\\python.exe',
        'C:\\Python38\\python.exe',
        'C:\\Python314\\python.exe',
        'C:\\Python313\\python.exe',
        'C:\\Python312\\python.exe',
      ];
      
      // Try Windows-specific paths first
      for (const pyPath of pythonPaths) {
        try {
          await execFileAsync(pyPath, ['--version'], { timeout: 5000 });
          pythonCmd = pyPath;
          break;
        } catch (e) {
          // Try next path
        }
      }
    } else {
      // Try standard Python commands on Unix-like systems
      for (const cmd of pythonCommands) {
        try {
          await execFileAsync(cmd, ['--version'], { timeout: 5000 });
          pythonCmd = cmd;
          break;
        } catch (e) {
          // Try next command
        }
      }
    }

    // Get the script path
    const scriptPath = path.join(process.cwd(), 'scripts', 'pdf_ocr.py');

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        { success: false, error: 'OCR script not found' },
        { status: 500 }
      );
    }

    // Execute the Python script
    try {
      const { stdout, stderr } = await execFileAsync(
        pythonCmd,
        [scriptPath, tempInputPath, tempOutputPath, language],
        {
          timeout: 300000, // 5 minutes timeout for OCR processing
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        }
      );

      // Log stderr for debugging (warnings are OK, errors are not)
      if (stderr && stderr.trim()) {
        console.error('OCR script stderr:', stderr);
        // If stderr contains ERROR (not WARNING), it's a real error
        if (stderr.includes('ERROR:')) {
          return NextResponse.json(
            { success: false, error: stderr.split('ERROR:')[1]?.trim() || 'OCR processing failed' },
            { status: 500 }
          );
        }
      }

      // Check if output file was created
      if (!fs.existsSync(tempOutputPath)) {
        const errorMsg = stderr || stdout || 'Unknown error';
        return NextResponse.json(
          { success: false, error: `OCR processing failed: Output file was not created. ${errorMsg}` },
          { status: 500 }
        );
      }

      // Verify the file is not empty and has reasonable size
      const stats = await fs.promises.stat(tempOutputPath);
      if (stats.size === 0) {
        return NextResponse.json(
          { success: false, error: 'OCR processing failed: Output file is empty' },
          { status: 500 }
        );
      }

      // Verify it's a PDF by checking the first few bytes (PDF files start with %PDF)
      const fileHandle = await fs.promises.open(tempOutputPath, 'r');
      const buffer = Buffer.alloc(4);
      await fileHandle.read(buffer, 0, 4, 0);
      await fileHandle.close();
      
      const fileHeader = buffer.toString('ascii');
      if (fileHeader !== '%PDF') {
        // Not a valid PDF - might be an error message
        const errorContent = await fs.promises.readFile(tempOutputPath, 'utf-8');
        return NextResponse.json(
          { success: false, error: `OCR processing failed. Output is not a valid PDF: ${errorContent.substring(0, 200)}` },
          { status: 500 }
        );
      }

      // Read the output file
      const outputBuffer = await fs.promises.readFile(tempOutputPath);

      // Generate output filename - remove .pdf extension (case-insensitive) and add _ocr.pdf
      const originalName = file.name;
      const nameWithoutExt = originalName.replace(/\.pdf$/i, '');
      const outputFilename = `${nameWithoutExt}_ocr.pdf`;

      // Return the PDF file
      return new NextResponse(outputBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${outputFilename}"`,
        },
      });
    } catch (error: any) {
      console.error('OCR processing error:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'OCR processing failed';
      if (error.message && error.message.includes('tesseract')) {
        errorMessage = 'Tesseract OCR is not installed or not found in PATH. Please install Tesseract OCR.';
      } else if (error.message && error.message.includes('pytesseract')) {
        errorMessage = 'pytesseract library is not installed. Please install it with: pip install pytesseract pillow';
      } else if (error.message && error.message.includes('PyMuPDF')) {
        errorMessage = 'PyMuPDF library is not installed. Please install it with: pip install PyMuPDF';
      } else if (error.message) {
        errorMessage = `OCR processing failed: ${error.message}`;
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('OCR API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files
    try {
      if (tempInputPath && fs.existsSync(tempInputPath)) {
        await fs.promises.unlink(tempInputPath);
      }
      if (tempOutputPath && fs.existsSync(tempOutputPath)) {
        await fs.promises.unlink(tempOutputPath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }
  }
}

