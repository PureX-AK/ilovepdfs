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
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    const validExtensions = ['.docx', '.doc'];
    
    const isValidType = validTypes.includes(file.type);
    const isValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType && !isValidExtension) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Please upload a Word document (DOCX or DOC).' },
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
    const fileExtension = file.name.toLowerCase().endsWith('.docx') ? '.docx' : '.doc';
    tempInputPath = path.join(tempDir, `input_${uniqueId}${fileExtension}`);
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
    const scriptPath = path.join(process.cwd(), 'scripts', 'word_to_pdf.py');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error('Word to PDF conversion script not found. Please ensure scripts/word_to_pdf.py exists.');
    }

    // Execute Python script
    let stdout = '';
    let stderr = '';
    try {
      const result = await execFileAsync(
        pythonCmd,
        [scriptPath, tempInputPath, tempOutputPath],
        {
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
          timeout: 120000, // 2 minute timeout
        }
      );
      stdout = result.stdout || '';
      stderr = result.stderr || '';
    } catch (execError: any) {
      stdout = execError.stdout || '';
      stderr = execError.stderr || '';
      
      // Check if it's a Python/library error
      if (stderr.includes('python-docx')) {
        throw new Error(
          'python-docx library not installed. Please install it with: pip install python-docx reportlab'
        );
      }
      if (stderr.includes('reportlab')) {
        throw new Error(
          'reportlab library not installed. Please install it with: pip install python-docx reportlab'
        );
      }
      if (stderr.includes('python')) {
        throw new Error(
          'Python not found. Please install Python 3.8+ and ensure it is in your PATH.'
        );
      }
      
      console.error('Python script error:', { stdout, stderr, message: execError.message });
      throw new Error(`Conversion failed: ${execError.message || 'Unknown error'}. ${stderr}`);
    }

    // Check if output file was created
    if (!fs.existsSync(tempOutputPath)) {
      throw new Error('Conversion completed but output file was not created.');
    }

    // Read the converted PDF file
    const pdfBuffer = await fs.promises.readFile(tempOutputPath);

    // Return the PDF file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${file.name.replace(/\.(doc|docx)$/i, '')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Word to PDF conversion error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to convert Word to PDF. Please ensure Python 3.8+ and required libraries (python-docx, reportlab) are installed.' 
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

