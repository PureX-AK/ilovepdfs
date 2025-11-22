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
  let tempHtmlPath: string | null = null;

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
    tempHtmlPath = path.join(tempDir, `intermediate_${uniqueId}.html`);

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

    // Step 1: Convert PDF to HTML
    const pdfToHtmlScript = path.join(process.cwd(), 'scripts', 'pdf_to_html.py');
    
    if (!fs.existsSync(pdfToHtmlScript)) {
      throw new Error('PDF to HTML conversion script not found. Please ensure scripts/pdf_to_html.py exists.');
    }

    try {
      console.log('Step 1: Converting PDF to HTML...');
      const { stdout: htmlStdout, stderr: htmlStderr } = await execFileAsync(
        pythonCmd,
        [pdfToHtmlScript, tempInputPath, tempHtmlPath],
        {
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
          timeout: 120000, // 2 minute timeout
        }
      );
      
      if (htmlStderr) {
        console.log('PDF to HTML stderr:', htmlStderr);
      }
    } catch (htmlError: any) {
      const errorOutput = (htmlError.stderr || htmlError.stdout || '').toString();
      if (errorOutput.includes('PyMuPDF') || errorOutput.includes('fitz')) {
        throw new Error(
          'PyMuPDF library not installed. Please install it with: pip install PyMuPDF'
        );
      }
      throw new Error(`PDF to HTML conversion failed: ${htmlError.message || 'Unknown error'}`);
    }

    // Check if HTML file was created
    if (!fs.existsSync(tempHtmlPath)) {
      throw new Error('PDF to HTML conversion completed but HTML file was not created.');
    }

    // Server-side conversion is disabled - using client-side HTML parsing instead
    throw new Error('Server-side conversion disabled. Using client-side conversion.');

    // Check if output file was created
    if (!fs.existsSync(tempOutputPath)) {
      throw new Error('Conversion completed but output file was not created.');
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
        error: error.message || 'Failed to convert PDF to Excel. Using client-side conversion instead.' 
      },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files
    try {
      if (tempInputPath && fs.existsSync(tempInputPath)) {
        await fs.promises.unlink(tempInputPath);
      }
      if (tempHtmlPath && fs.existsSync(tempHtmlPath)) {
        await fs.promises.unlink(tempHtmlPath);
      }
      if (tempOutputPath && fs.existsSync(tempOutputPath)) {
        await fs.promises.unlink(tempOutputPath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }
  }
}

