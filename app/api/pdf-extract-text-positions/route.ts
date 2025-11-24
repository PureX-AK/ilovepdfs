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
    const scale = parseFloat((formData.get('scale') as string) || '2.0');

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ success: false, error: 'Invalid file type. Please upload a PDF file.' }, { status: 400 });
    }

    // Save uploaded file to temp directory
    const tempDir = os.tmpdir();
    tempInputPath = path.join(tempDir, `pdf_extract_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);
    
    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(tempInputPath, Buffer.from(arrayBuffer));

    // Get script path
    const scriptPath = path.join(process.cwd(), 'scripts', 'pdf_extract_text_positions.py');

    // Execute Python script
    const { stdout, stderr } = await execFileAsync('python', [scriptPath, tempInputPath, scale.toString()]);

    if (stderr && stderr.trim()) {
      console.error('Python script stderr:', stderr);
    }

    const result = JSON.parse(stdout);

    if (!result.success) {
      throw new Error(result.error || 'Failed to extract text positions');
    }

    return NextResponse.json({
      success: true,
      textItems: result.textItems,
    });

  } catch (error: any) {
    console.error('Error extracting text positions:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to extract text positions from PDF' 
      },
      { status: 500 }
    );
  } finally {
    // Clean up temp file
    if (tempInputPath && fs.existsSync(tempInputPath)) {
      try {
        fs.unlinkSync(tempInputPath);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }
  }
}

