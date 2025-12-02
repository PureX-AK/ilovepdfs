import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest) {
  let tempInputPath: string | null = null;
  let tempOcrPath: string | null = null;
  let tempOutputPath: string | null = null;

  try {
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const modeRaw = formData.get('mode') as string | null;
    // editable: use pdf2docx (with optional OCR); image: pages-as-images DOCX
    const mode = modeRaw === 'image' ? 'image' : 'editable';

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
    tempOcrPath = path.join(tempDir, `ocr_${uniqueId}.pdf`);
    tempOutputPath = path.join(tempDir, `output_${uniqueId}.docx`);

    // Read the file and save to temporary location
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(tempInputPath, inputBuffer);

    // By default, use the original input PDF
    let inputPdfPath = tempInputPath;

    // --- Optional OCR pre-processing for scanned PDFs (editable mode only) ---
    // If pdf_ocr.py exists and Python/Tesseract are installed, try to create a searchable PDF first.
    if (mode === 'editable') {
      try {
        const ocrScriptPath = path.join(process.cwd(), 'scripts', 'pdf_ocr.py');
        if (fs.existsSync(ocrScriptPath) && tempInputPath && tempOcrPath) {
          // Find Python executable
          let pythonCmd = 'python3';
          const pythonCommands = ['python3', 'python', 'py'];

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

            for (const pyPath of pythonPaths) {
              try {
                await execFileAsync(pyPath, ['--version'], { timeout: 5000 });
                pythonCmd = pyPath;
                break;
              } catch {
                // try next
              }
            }
          } else {
            for (const cmd of pythonCommands) {
              try {
                await execFileAsync(cmd, ['--version'], { timeout: 5000 });
                pythonCmd = cmd;
                break;
              } catch {
                // try next
              }
            }
          }

          // Run OCR script to generate a searchable PDF
          try {
            const { stdout, stderr } = await execFileAsync(
              pythonCmd,
              [ocrScriptPath, tempInputPath, tempOcrPath, 'eng'],
              {
                timeout: 300000,
                maxBuffer: 50 * 1024 * 1024,
              }
            );

            if (stdout) {
              console.log('PDF OCR stdout:', stdout);
            }
            if (stderr) {
              console.log('PDF OCR stderr:', stderr);
            }

            // If OCR output looks like a valid non-empty PDF, use it as input for DOCX conversion
            if (fs.existsSync(tempOcrPath)) {
              const stats = await fs.promises.stat(tempOcrPath);
              if (stats.size > 0) {
                const fh = await fs.promises.open(tempOcrPath, 'r');
                const headerBuf = Buffer.alloc(4);
                await fh.read(headerBuf, 0, 4, 0);
                await fh.close();
                if (headerBuf.toString('ascii') === '%PDF') {
                  inputPdfPath = tempOcrPath;
                }
              }
            }
          } catch (ocrError: any) {
            console.error('PDF OCR pre-processing failed, continuing without OCR:', {
              message: ocrError.message,
              stderr: ocrError.stderr?.toString(),
            });
          }
        }
      } catch (ocrSetupError: any) {
        console.error('PDF OCR setup failed, continuing without OCR:', ocrSetupError);
      }
    }

    // --- Main conversion: choose between editable (pdf2docx) and image-layout modes ---
    // Find Python executable
    let pythonCmd = 'python3';
    const pythonCommands = ['python3', 'python', 'py'];

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

      for (const pyPath of pythonPaths) {
        try {
          await execFileAsync(pyPath, ['--version'], { timeout: 5000 });
          pythonCmd = pyPath;
          break;
        } catch {
          // try next
        }
      }
    } else {
      for (const cmd of pythonCommands) {
        try {
          await execFileAsync(cmd, ['--version'], { timeout: 5000 });
          pythonCmd = cmd;
          break;
        } catch {
          // try next
        }
      }
    }

    // Verify Python is accessible
    try {
      await execFileAsync(pythonCmd, ['--version'], { timeout: 5000 });
    } catch (e) {
      throw new Error('Python not found. Please ensure Python 3.8+ is installed and in your PATH.');
    }

    // Select script based on mode
    const scriptName = mode === 'image' ? 'pdf_to_docx_images.py' : 'pdf_to_docx.py';
    const scriptPath = path.join(process.cwd(), 'scripts', scriptName);

    if (!fs.existsSync(scriptPath)) {
      throw new Error(
        `PDF to DOCX conversion script not found. Please ensure scripts/${scriptName} exists.`
      );
    }

    // Choose input PDF:
    //  - editable: use possibly OCR-processed inputPdfPath
    //  - image: always use the original uploaded PDF (tempInputPath)
    const inputForScript = mode === 'image' ? tempInputPath : inputPdfPath;

    // Execute Python script
    try {
      await execFileAsync(
        pythonCmd,
        [scriptPath, inputForScript!, tempOutputPath!],
        {
          maxBuffer: 50 * 1024 * 1024,
          timeout: 120000,
        }
      );
    } catch (execError: any) {
      if (execError.stderr && execError.stderr.includes('pdf2docx')) {
        throw new Error('pdf2docx library not installed. Please install it with: pip install pdf2docx');
      }
      if (execError.stderr && execError.stderr.includes('python-docx')) {
        throw new Error('python-docx library not installed. Please install it with: pip install python-docx');
      }
      if (execError.stderr && execError.stderr.includes('python')) {
        throw new Error('Python not found. Please install Python 3.8+ and ensure it is in your PATH.');
      }
      throw new Error(`Conversion failed: ${execError.message || 'Unknown error'}`);
    }

    // Check if output file was created
    if (!fs.existsSync(tempOutputPath)) {
      throw new Error('Conversion completed but output file was not created.');
    }

    // Read the converted DOCX file
    const docxBuffer = await fs.promises.readFile(tempOutputPath);

    // Return the DOCX file
    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '')}.docx"`,
      },
    });
  } catch (error: any) {
    console.error('PDF to Word conversion error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to convert PDF to Word. Please ensure Python 3.8+ and pdf2docx library are installed.' 
      },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files
    try {
      if (tempInputPath && fs.existsSync(tempInputPath)) {
        await fs.promises.unlink(tempInputPath);
      }
      if (tempOcrPath && fs.existsSync(tempOcrPath)) {
        await fs.promises.unlink(tempOcrPath);
      }
      if (tempOutputPath && fs.existsSync(tempOutputPath)) {
        await fs.promises.unlink(tempOutputPath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temporary files:', cleanupError);
    }
  }
}

