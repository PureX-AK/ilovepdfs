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
    const replacementsJson = formData.get('replacements') as string | null;
    
    // Check if using new JSON format (interactive mode)
    const useJsonMode = !!replacementsJson;
    
    let oldText = '';
    let newText = '';
    let caseSensitive = false;
    let replaceAll = true;
    
    if (!useJsonMode) {
      // Legacy mode
      oldText = (formData.get('oldText') as string) || '';
      newText = (formData.get('newText') as string) || '';
      caseSensitive = (formData.get('caseSensitive') as string) === 'true';
      replaceAll = (formData.get('replaceAll') as string) !== 'false';
    }

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, error: 'Invalid file type. Please upload a PDF file.' }, { status: 400 });
    }

    if (!useJsonMode && !oldText.trim()) {
      return NextResponse.json({ success: false, error: 'Old text cannot be empty' }, { status: 400 });
    }
    
    if (useJsonMode) {
      try {
        const replacements = JSON.parse(replacementsJson);
        if (!Array.isArray(replacements) || replacements.length === 0) {
          return NextResponse.json({ success: false, error: 'Invalid replacements format' }, { status: 400 });
        }
      } catch (e) {
        return NextResponse.json({ success: false, error: 'Invalid JSON format for replacements' }, { status: 400 });
      }
    }

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: 'File size exceeds 25MB limit' }, { status: 400 });
    }

    const tempDir = os.tmpdir();
    const uniqueId = Date.now() + Math.random().toString(36).substring(7);
    tempInputPath = path.join(tempDir, `input_${uniqueId}.pdf`);
    tempOutputPath = path.join(tempDir, `output_${uniqueId}.pdf`);

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

    // Use pdf-redactor script for accurate positioning
    let scriptPath = path.join(process.cwd(), 'scripts', 'pdf_replace_text_redactor.py');
    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json({ success: false, error: 'Replace text script not found' }, { status: 500 });
    }

    try {
      let commandArgs: string[];
      
      if (useJsonMode) {
        // Use JSON mode
        const replacementsJson = formData.get('replacements') as string;
        console.log('DEBUG: Using JSON mode with replacements:', replacementsJson);
        commandArgs = [scriptPath, tempInputPath, tempOutputPath, '--json', replacementsJson];
      } else {
        // Use legacy mode (PyMuPDF only)
        commandArgs = [scriptPath, tempInputPath, tempOutputPath, oldText, newText, caseSensitive.toString(), replaceAll.toString()];
      }
      
      console.log('========================================');
      console.log('DEBUG: Executing Python script...');
      console.log('Command:', pythonCmd);
      console.log('Args:', commandArgs);
      console.log('========================================');
      
      const { stdout, stderr } = await execFileAsync(
        pythonCmd,
        commandArgs,
        { timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
      );
      
      // Log all output for debugging - make it very visible
      console.log('\n========================================');
      console.log('PYTHON SCRIPT OUTPUT:');
      console.log('========================================');
      if (stdout) {
        console.log('STDOUT:', stdout);
      } else {
        console.log('STDOUT: (empty)');
      }
      if (stderr) {
        console.log('STDERR:', stderr);
      } else {
        console.log('STDERR: (empty)');
      }
      console.log('========================================\n');
      
      // pdf-redactor might output warnings that are not errors
      if (stderr && stderr.includes('ERROR:')) {
        return NextResponse.json({ success: false, error: stderr.split('ERROR:')[1]?.trim() || 'Text replacement failed' }, { status: 500 });
      }

      if (!fs.existsSync(tempOutputPath)) {
        return NextResponse.json({ success: false, error: 'Text replacement failed: Output file was not created' }, { status: 500 });
      }

      const stats = await fs.promises.stat(tempOutputPath);
      if (stats.size === 0) {
        return NextResponse.json({ success: false, error: 'Text replacement failed: Output file is empty' }, { status: 500 });
      }

      const outputBuffer = await fs.promises.readFile(tempOutputPath);
      const fileHeader = outputBuffer.slice(0, 4).toString('ascii');
      if (fileHeader !== '%PDF') {
        const errorContent = await fs.promises.readFile(tempOutputPath, 'utf-8');
        return NextResponse.json({ success: false, error: `Text replacement failed. Output is not a valid PDF: ${errorContent.substring(0, 200)}` }, { status: 500 });
      }

      const originalName = file.name.replace(/\.pdf$/i, '');
      const outputFilename = `${originalName}_text_replaced.pdf`;

      return new NextResponse(outputBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${outputFilename}"`,
        },
      });
    } catch (error: any) {
      console.error('Text replacement error:', error);
      let errorMessage = 'Text replacement failed';
      if (error.message && error.message.includes('pdf-redactor')) {
        errorMessage = 'pdf-redactor library is not installed. Please install it with: pip install pdf-redactor';
      } else if (error.message) {
        errorMessage = `Text replacement failed: ${error.message}`;
      }
      return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Replace text API error:', error);
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

