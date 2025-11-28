import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest) {
  let tempInputPath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

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

    const tempDir = os.tmpdir();
    const uniqueId = Date.now() + Math.random().toString(36).substring(7);
    tempInputPath = path.join(tempDir, `input_${uniqueId}.pdf`);

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(tempInputPath, inputBuffer);

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

    const scriptPath = path.join(process.cwd(), 'scripts', 'pdf_extract_text_with_color.py');
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ success: false, error: 'Extract text script not found' }, { status: 500 });
    }

    try {
      const { stdout, stderr } = await execFileAsync(
        pythonCmd,
        [scriptPath, tempInputPath],
        { timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
      );

      if (stderr && stderr.trim() && !stderr.includes('success')) {
        // Try to parse error from stderr
        try {
          const errorData = JSON.parse(stderr);
          if (errorData.error) {
            return NextResponse.json({ success: false, error: errorData.error }, { status: 500 });
          }
        } catch (e) {
          // If stderr is not JSON, it might be a warning, check stdout
        }
      }

      // Parse the JSON output
      const result = JSON.parse(stdout);
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error || 'Failed to extract text' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        textItems: result.textItems || [],
        count: result.count || 0
      });
    } catch (error: any) {
      console.error('Text extraction error:', error);
      let errorMessage = 'Text extraction failed';
      if (error.message) {
        errorMessage = `Text extraction failed: ${error.message}`;
      }
      return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Extract text API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred' }, { status: 500 });
  } finally {
    try {
      if (tempInputPath && fs.existsSync(tempInputPath)) {
        await fs.promises.unlink(tempInputPath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }
  }
}

