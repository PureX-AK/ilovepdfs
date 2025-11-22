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
    tempOutputPath = path.join(tempDir, `output_${uniqueId}.pptx`);

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

    // Get the Python script path
    const scriptPath = path.join(process.cwd(), 'scripts', 'pdf_to_pptx.py');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error('PDF to PPTX conversion script not found. Please ensure scripts/pdf_to_pptx.py exists.');
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
      
      // Log output for debugging
      if (stdout) {
        console.log('Python script stdout:', stdout);
      }
      if (stderr) {
        console.log('Python script stderr:', stderr);
      }
    } catch (execError: any) {
      // Log full error for debugging
      console.error('Python execution error:', execError);
      if (execError.stdout) {
        console.log('Python stdout:', execError.stdout.toString());
      }
      if (execError.stderr) {
        console.log('Python stderr:', execError.stderr.toString());
      }
      
      // Check if it's a Python/library error
      const errorOutput = (execError.stderr || execError.stdout || '').toString();
      if (errorOutput.includes('PyMuPDF') || errorOutput.includes('fitz')) {
        throw new Error(
          'PyMuPDF library not installed. Please install it with: pip install pymupdf'
        );
      }
      if (errorOutput.includes('pptx') || errorOutput.includes('Presentation')) {
        throw new Error(
          'python-pptx library not installed. Please install it with: pip install python-pptx'
        );
      }
      if (errorOutput.includes('python') || errorOutput.includes('Python')) {
        throw new Error(
          'Python not found. Please ensure Python 3.8+ is installed and in your PATH.'
        );
      }
      throw new Error(`Conversion failed: ${execError.message || 'Unknown error'}. Check server logs for details.`);
    }

    // Check if output file was created
    if (!fs.existsSync(tempOutputPath)) {
      throw new Error('Conversion completed but output file was not created.');
    }

    // Read the converted PPTX file
    const pptxBuffer = await fs.promises.readFile(tempOutputPath);

    // Return the PPTX file
    return new NextResponse(pptxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '')}.pptx"`,
      },
    });
  } catch (error: any) {
    console.error('PDF to PowerPoint conversion error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to convert PDF to PowerPoint. Please ensure Python 3.8+ and pdf2pptx library are installed.' 
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

