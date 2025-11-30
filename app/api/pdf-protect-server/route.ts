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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const password = formData.get('password') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, error: 'Invalid file type. Please upload a PDF file.' }, { status: 400 });
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: 'File size exceeds 25MB limit' }, { status: 400 });
    }

    if (!password || password.trim().length < 1) {
      return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
    }

    const tempDir = os.tmpdir();
    const uniqueId = Date.now() + Math.random().toString(36).substring(7);
    tempInputPath = path.join(tempDir, `input_${uniqueId}.pdf`);
    tempOutputPath = path.join(tempDir, `output_${uniqueId}.pdf`);

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(tempInputPath, inputBuffer);

    // Find Python executable
    let pythonCmd = 'python3';
    if (process.platform === 'win32') {
      const pythonPaths = ['python3.exe', 'python.exe', 'C:\\Python311\\python.exe', 'C:\\Python310\\python.exe'];
      for (const pyPath of pythonPaths) {
        try {
          await execFileAsync(pyPath, ['--version'], { timeout: 5000 });
          pythonCmd = pyPath;
          break;
        } catch (e) {}
      }
    } else {
      for (const cmd of ['python3', 'python', 'py']) {
        try {
          await execFileAsync(cmd, ['--version'], { timeout: 5000 });
          pythonCmd = cmd;
          break;
        } catch (e) {}
      }
    }

    const scriptPath = path.join(process.cwd(), 'scripts', 'pdf_protect.py');
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ success: false, error: 'Protect script not found' }, { status: 500 });
    }

    // Build command arguments
    const args = [scriptPath, tempInputPath, tempOutputPath, password];

    try {
      const { stdout, stderr } = await execFileAsync(pythonCmd, args, {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      if (stderr && stderr.includes('ERROR:')) {
        return NextResponse.json({ success: false, error: stderr.split('ERROR:')[1]?.trim() || 'Protection failed' }, { status: 500 });
      }

      if (!fs.existsSync(tempOutputPath)) {
        return NextResponse.json({ success: false, error: 'Protection failed: Output file was not created' }, { status: 500 });
      }

      const stats = await fs.promises.stat(tempOutputPath);
      if (stats.size === 0) {
        return NextResponse.json({ success: false, error: 'Protection failed: Output file is empty' }, { status: 500 });
      }

      const outputBuffer = await fs.promises.readFile(tempOutputPath);
      const fileHeader = outputBuffer.slice(0, 4).toString('ascii');
      if (fileHeader !== '%PDF') {
        const errorContent = await fs.promises.readFile(tempOutputPath, 'utf-8');
        return NextResponse.json({ success: false, error: `Protection failed. Output is not a valid PDF: ${errorContent.substring(0, 200)}` }, { status: 500 });
      }

      // Strip the last extension (whatever it is) and force .pdf
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const outputFilename = `${baseName}_protected.pdf`;

      return new NextResponse(outputBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${outputFilename}"`,
        },
      });
    } catch (error: any) {
      console.error('Protect processing error:', error);
      let errorMessage = 'Protection failed';
      if (error.message && error.message.includes('PyMuPDF')) {
        errorMessage = 'PyMuPDF library is not installed. Please install it with: pip install PyMuPDF';
      } else if (error.stderr && error.stderr.includes('ERROR:')) {
        errorMessage = error.stderr.split('ERROR:')[1]?.trim() || 'Protection failed';
      } else if (error.message) {
        errorMessage = `Protection failed: ${error.message}`;
      }
      return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Protect API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred' }, { status: 500 });
  } finally {
    try {
      if (tempInputPath && fs.existsSync(tempInputPath)) await fs.promises.unlink(tempInputPath);
      if (tempOutputPath && fs.existsSync(tempOutputPath)) await fs.promises.unlink(tempOutputPath);
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }
  }
}

