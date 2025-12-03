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
    tempOutputPath = path.join(tempDir, `output_${uniqueId}.xlsx`);

    // Read the file and save to temporary location
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(tempInputPath, inputBuffer);

    // Find Python executable
    // Try python3 first (works on most systems), then python
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
      // On Unix-like systems, try python3, then python
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
    
    // Final check - verify Python is accessible
    try {
      await execFileAsync(pythonCmd, ['--version'], { timeout: 5000 });
    } catch (e) {
      throw new Error('Python not found. Please ensure Python 3.8+ is installed and in your PATH.');
    }

    // Path to the PDF → Excel Python script
    const pdfToExcelScript = path.join(process.cwd(), 'scripts', 'pdf_to_excel.py');

    if (!fs.existsSync(pdfToExcelScript)) {
      throw new Error('PDF to Excel conversion script not found. Please ensure scripts/pdf_to_excel.py exists.');
    }

    try {
      console.log('Converting PDF to Excel using Python script...');
      const { stdout, stderr } = await execFileAsync(
        pythonCmd,
        [pdfToExcelScript, tempInputPath, tempOutputPath],
        {
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
          timeout: 300000, // up to 5 minutes for complex PDFs
        }
      );

      if (stdout) {
        console.log('pdf_to_excel stdout:', stdout);
      }
      if (stderr) {
        console.log('pdf_to_excel stderr:', stderr);
      }
    } catch (execError: any) {
      const errorOutput = (execError.stderr || execError.stdout || '').toString();
      if (errorOutput.includes('PyMuPDF') || errorOutput.includes('fitz')) {
        throw new Error('PyMuPDF library not installed. Please install it with: pip install PyMuPDF');
      }
      if (errorOutput.includes('openpyxl')) {
        throw new Error('openpyxl library not installed. Please install it with: pip install openpyxl');
      }
      throw new Error(`PDF to Excel conversion failed: ${execError.message || 'Unknown error'}`);
    }

    // Ensure output file exists
    if (!tempOutputPath || !fs.existsSync(tempOutputPath)) {
      throw new Error('Conversion completed but output Excel file was not created.');
    }

    // Read the converted Excel file
    const excelBuffer = await fs.promises.readFile(tempOutputPath);

    // Return the Excel file
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '')}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('PDF to Excel conversion error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to convert PDF to Excel.' 
      },
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

