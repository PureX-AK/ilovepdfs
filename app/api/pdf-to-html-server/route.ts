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
    tempOutputPath = path.join(tempDir, `output_${uniqueId}.html`);

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

    // Get the Python script path
    const scriptPath = path.join(process.cwd(), 'scripts', 'pdf_to_html.py');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error('PDF to HTML conversion script not found. Please ensure scripts/pdf_to_html.py exists.');
    }

    // Execute Python script
    try {
      const { stdout, stderr } = await execFileAsync(
        pythonCmd,
        [scriptPath, tempInputPath, tempOutputPath],
        {
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
          timeout: 120000, // 2 minute timeout
        }
      );
      
      // Log debug output from Python script
      if (stderr) {
        console.log('Python script stderr:', stderr);
      }
      if (stdout) {
        console.log('Python script stdout:', stdout);
      }
    } catch (execError: any) {
      // Log stderr for debugging
      if (execError.stderr) {
        console.error('Python script stderr:', execError.stderr);
      }
      if (execError.stdout) {
        console.log('Python script stdout:', execError.stdout);
      }
      
      // Check if it's a Python/library error
      if (execError.stderr && execError.stderr.includes('PyMuPDF')) {
        throw new Error(
          'PyMuPDF library not installed. Please install it with: pip install PyMuPDF'
        );
      }
      if (execError.stderr && execError.stderr.includes('python')) {
        throw new Error(
          'Python not found. Please install Python 3.8+ and ensure it is in your PATH.'
        );
      }
      throw new Error(`Conversion failed: ${execError.message || 'Unknown error'}`);
    }

    // Check if output file was created
    if (!fs.existsSync(tempOutputPath)) {
      throw new Error('Conversion completed but output file was not created.');
    }

    // Read the converted HTML file
    const htmlContent = await fs.promises.readFile(tempOutputPath, 'utf-8');

    // Return the HTML file
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '')}.html"`,
      },
    });
  } catch (error: any) {
    console.error('PDF to HTML conversion error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to convert PDF to HTML. Please ensure Python 3.8+ and PyMuPDF library are installed.' 
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

