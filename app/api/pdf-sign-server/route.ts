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
  let tempImagePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const signatureType = (formData.get('signatureType') as string) || 'text';
    const signatureData = formData.get('signatureData') as string;
    const x = parseFloat(formData.get('x') as string) || 50;
    const y = parseFloat(formData.get('y') as string) || 100;
    const width = formData.get('width') ? parseFloat(formData.get('width') as string) : null;
    const height = formData.get('height') ? parseFloat(formData.get('height') as string) : null;
    const pageNum = parseInt(formData.get('pageNum') as string) || 0;

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

    if (!signatureData) {
      return NextResponse.json({ success: false, error: 'Signature data is required' }, { status: 400 });
    }

    const tempDir = os.tmpdir();
    const uniqueId = Date.now() + Math.random().toString(36).substring(7);
    tempInputPath = path.join(tempDir, `input_${uniqueId}.pdf`);
    tempOutputPath = path.join(tempDir, `output_${uniqueId}.pdf`);

    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(tempInputPath, inputBuffer);

    // Find Python executable (same logic as OCR route)
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

    const scriptPath = path.join(process.cwd(), 'scripts', 'pdf_sign.py');
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ success: false, error: 'Sign script not found' }, { status: 500 });
    }

    // Prepare signature data
    let signatureDataArg = signatureData;
    if (signatureType === 'image') {
      // signatureData should already be base64, but remove data URL prefix if present
      signatureDataArg = signatureData.replace(/^data:image\/[a-z]+;base64,/, '');
    }

    // Build command arguments
    const args = [scriptPath, tempInputPath, tempOutputPath, signatureType, signatureDataArg, x.toString(), y.toString()];
    if (width) args.push(width.toString());
    if (height) args.push(height.toString());
    args.push(pageNum.toString());

    try {
      const { stdout, stderr } = await execFileAsync(pythonCmd, args, {
        timeout: 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      if (stderr && stderr.includes('ERROR:')) {
        return NextResponse.json({ success: false, error: stderr.split('ERROR:')[1]?.trim() || 'Signing failed' }, { status: 500 });
      }

      if (!fs.existsSync(tempOutputPath)) {
        return NextResponse.json({ success: false, error: 'Signing failed: Output file was not created' }, { status: 500 });
      }

      const stats = await fs.promises.stat(tempOutputPath);
      if (stats.size === 0) {
        return NextResponse.json({ success: false, error: 'Signing failed: Output file is empty' }, { status: 500 });
      }

      const outputBuffer = await fs.promises.readFile(tempOutputPath);
      const fileHeader = outputBuffer.slice(0, 4).toString('ascii');
      if (fileHeader !== '%PDF') {
        const errorContent = await fs.promises.readFile(tempOutputPath, 'utf-8');
        return NextResponse.json({ success: false, error: `Signing failed. Output is not a valid PDF: ${errorContent.substring(0, 200)}` }, { status: 500 });
      }

      const originalName = file.name.replace(/\.pdf$/i, '');
      const outputFilename = `${originalName}_signed.pdf`;

      return new NextResponse(outputBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${outputFilename}"`,
        },
      });
    } catch (error: any) {
      console.error('Sign processing error:', error);
      let errorMessage = 'Signing failed';
      if (error.message && error.message.includes('PyMuPDF')) {
        errorMessage = 'PyMuPDF library is not installed. Please install it with: pip install PyMuPDF';
      } else if (error.message) {
        errorMessage = `Signing failed: ${error.message}`;
      }
      return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Sign API error:', error);
    return NextResponse.json({ success: false, error: error.message || 'An unexpected error occurred' }, { status: 500 });
  } finally {
    try {
      if (tempInputPath && fs.existsSync(tempInputPath)) await fs.promises.unlink(tempInputPath);
      if (tempOutputPath && fs.existsSync(tempOutputPath)) await fs.promises.unlink(tempOutputPath);
      if (tempImagePath && fs.existsSync(tempImagePath)) await fs.promises.unlink(tempImagePath);
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }
  }
}

