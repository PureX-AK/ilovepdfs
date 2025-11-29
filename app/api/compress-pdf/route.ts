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
    // Find Python executable
    let pythonCmd: string | null = null;
    const pythonCommands = ['python3', 'python', 'py'];
    
    // First, try to find Python using system commands
    if (process.platform === 'win32') {
      // On Windows, use 'where' command to find python3
      try {
        const { execSync } = require('child_process');
        try {
          const whereOutput = execSync('where python3', { 
            encoding: 'utf-8',
            stdio: 'pipe',
            shell: true as any
          }).trim();
          
          if (whereOutput && !whereOutput.includes('INFO:')) {
            const pythonPath = whereOutput.split('\n')[0].trim();
            try {
              await execFileAsync(pythonPath, ['--version'], { timeout: 5000 });
              pythonCmd = pythonPath;
              console.log(`Found Python via 'where python3': ${pythonPath}`);
            } catch (e) {
              console.log(`Python found at ${pythonPath} but version check failed:`, e);
              // Continue to try other methods
            }
          }
        } catch (whereError: any) {
          // 'where' command failed (python3 not in PATH), try 'where python'
          try {
            const whereOutput = execSync('where python', { 
              encoding: 'utf-8',
              stdio: 'pipe',
              shell: true as any
            }).trim();
            
            if (whereOutput && !whereOutput.includes('INFO:')) {
              const pythonPath = whereOutput.split('\n')[0].trim();
              try {
                await execFileAsync(pythonPath, ['--version'], { timeout: 5000 });
                pythonCmd = pythonPath;
                console.log(`Found Python via 'where python': ${pythonPath}`);
              } catch (e) {
                // Continue to try other methods
              }
            }
          } catch (e) {
            // Both 'where python3' and 'where python' failed
            console.log('Python not found in PATH via "where" command');
          }
        }
      } catch (e) {
        // 'where' command failed, continue to try other methods
        console.log('Error running "where" command:', e);
      }
      
      // If not found via 'where', try direct paths
      if (!pythonCmd) {
        const pythonPaths = [
          'python3.exe',
          'python.exe',
          'py',
          'C:\\Python311\\python.exe',
          'C:\\Python310\\python.exe',
          'C:\\Python39\\python.exe',
          'C:\\Python38\\python.exe',
          'C:\\Python314\\python.exe',
          'C:\\Python313\\python.exe',
          'C:\\Python312\\python.exe',
          'C:\\Program Files\\Python311\\python.exe',
          'C:\\Program Files\\Python310\\python.exe',
          'C:\\Program Files (x86)\\Python311\\python.exe',
          'C:\\Program Files (x86)\\Python310\\python.exe',
        ];
        
        for (const pyPath of pythonPaths) {
          try {
            await execFileAsync(pyPath, ['--version'], { timeout: 5000 });
            pythonCmd = pyPath;
            console.log(`Found Python at: ${pyPath}`);
            break;
          } catch (e) {
            // Try next path
          }
        }
      }
    } else {
      // On Unix-like systems, try standard commands
      for (const cmd of pythonCommands) {
        try {
          await execFileAsync(cmd, ['--version'], { timeout: 5000 });
          pythonCmd = cmd;
          console.log(`Found Python: ${cmd}`);
          break;
        } catch (e) {
          // Try next command
        }
      }
      
      // If not found, try 'which' command
      if (!pythonCmd) {
        try {
          const { execSync } = require('child_process');
          const whichOutput = execSync('which python3', { 
            encoding: 'utf-8',
            stdio: 'pipe'
          }).trim();
          
          if (whichOutput) {
            try {
              await execFileAsync(whichOutput, ['--version'], { timeout: 5000 });
              pythonCmd = whichOutput;
              console.log(`Found Python via 'which python3': ${whichOutput}`);
            } catch (e) {
              // Continue
            }
          }
        } catch (e) {
          // 'which' command failed
        }
      }
    }
    
    // Final check - verify Python is accessible
    if (!pythonCmd) {
      throw new Error('Python not found. Please ensure Python 3.8+ is installed and in your PATH. Try running "python3 --version" in your terminal to verify Python is installed.');
    }
    
    // At this point, pythonCmd is guaranteed to be a string (not null)
    const finalPythonCmd = pythonCmd;
    
    // Verify Python works
    try {
      const { stdout } = await execFileAsync(finalPythonCmd, ['--version'], { timeout: 5000 });
      console.log(`Python version: ${stdout.trim()}`);
    } catch (e) {
      console.error('Python version check failed:', e);
      throw new Error(`Python found at "${finalPythonCmd}" but failed to execute. Please verify Python is correctly installed.`);
    }
    
    // Check if PyMuPDF is installed
    try {
      const { stdout: importCheck } = await execFileAsync(
        finalPythonCmd,
        ['-c', 'import fitz; print("PyMuPDF version:", fitz.version[0])'],
        { timeout: 5000 }
      );
      console.log('PyMuPDF check:', importCheck.trim());
    } catch (e) {
      console.error('PyMuPDF import check failed:', e);
      throw new Error('PyMuPDF is not installed. Please install it with: pip install PyMuPDF (or pip3 install PyMuPDF)');
    }
    
    // Get the form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const compressionLevel = (formData.get('compressionLevel') as string) || 'medium';

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

    const originalSize = file.size;

    // Create temporary file paths
    const tempDir = os.tmpdir();
    const uniqueId = Date.now() + Math.random().toString(36).substring(7);
    tempInputPath = path.join(tempDir, `input_${uniqueId}.pdf`);
    tempOutputPath = path.join(tempDir, `output_${uniqueId}.pdf`);

    // Read the file and save to temporary location
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(tempInputPath, inputBuffer);

    // Get the Python script path
    const scriptPath = path.join(process.cwd(), 'scripts', 'pdf_compress.py');
    console.log('Script path:', scriptPath);
    console.log('Script exists:', fs.existsSync(scriptPath));

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`Compression script not found at: ${scriptPath}`);
      console.error('Current working directory:', process.cwd());
      return NextResponse.json(
        { success: false, error: `Compression script not found at: ${scriptPath}` },
        { status: 500 }
      );
    }

    // Execute the Python script
    console.log(`Executing: ${finalPythonCmd} ${scriptPath} ${tempInputPath} ${tempOutputPath} ${compressionLevel}`);
    try {
      const { stdout, stderr } = await execFileAsync(
        finalPythonCmd,
        [scriptPath, tempInputPath, tempOutputPath, compressionLevel],
        {
          timeout: 300000, // 5 minutes timeout for compression
          maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        }
      );

      console.log('Python script stdout:', stdout);
      console.log('Python script stderr:', stderr);

      // Check if output file was created first
      if (!fs.existsSync(tempOutputPath)) {
        // Check stderr for error messages
        let errorMsg = 'Compression failed: output file not created';
        if (stderr && stderr.trim()) {
          if (stderr.includes('ERROR:')) {
            errorMsg = stderr.split('ERROR:')[1]?.trim() || errorMsg;
          } else {
            errorMsg = stderr.trim();
          }
        }
        console.error('Output file not created. Error:', errorMsg);
        return NextResponse.json(
          { success: false, error: errorMsg },
          { status: 500 }
        );
      }

      // Check if output file is empty
      const outputStats = await fs.promises.stat(tempOutputPath);
      if (outputStats.size === 0) {
        console.error('Output file is empty');
        return NextResponse.json(
          { success: false, error: 'Compression failed: output file is empty' },
          { status: 500 }
        );
      }

      // Log stderr for debugging (warnings are OK, errors are not)
      if (stderr && stderr.trim()) {
        console.error('Compression script stderr:', stderr);
        // If stderr contains ERROR (not WARNING), it's a real error
        if (stderr.includes('ERROR:')) {
          const errorMsg = stderr.split('ERROR:')[1]?.trim() || 'PDF compression failed';
          console.error('Python script error:', errorMsg);
          // Even if there's an error in stderr, if file was created, try to use it
          // But log the warning
        }
      }

      // Parse statistics from stdout if available
      let compressedSize = 0;
      let compressionRatio = '0';
      let sizeReduction = '0';
      
      try {
        if (stdout && stdout.trim()) {
          const stats = JSON.parse(stdout.trim());
          compressedSize = stats.compressed_size || 0;
          compressionRatio = stats.compression_ratio?.toFixed(1) || '0';
          sizeReduction = stats.size_reduction?.toFixed(1) || '0';
        }
      } catch (parseError) {
        // If parsing fails, calculate from file size
        console.warn('Could not parse compression statistics, calculating from file size');
      }

      // If stats weren't parsed, calculate from file
      if (compressedSize === 0) {
        const compressedPdfBuffer = await fs.promises.readFile(tempOutputPath);
        compressedSize = compressedPdfBuffer.length;
        compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
        sizeReduction = ((originalSize - compressedSize) / 1024).toFixed(1);
      }

      // Read the compressed PDF
      const compressedPdfBuffer = await fs.promises.readFile(tempOutputPath);
      const uint8Array = new Uint8Array(compressedPdfBuffer);

      // Clean up output file
      try {
        if (tempOutputPath && fs.existsSync(tempOutputPath)) {
          await fs.promises.unlink(tempOutputPath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up output file:', cleanupError);
      }

      // Return the compressed PDF
      return new NextResponse(uint8Array, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${file.name.replace('.pdf', '')}_compressed.pdf"`,
          'X-Original-Size': originalSize.toString(),
          'X-Compressed-Size': compressedSize.toString(),
          'X-Compression-Ratio': compressionRatio,
          'X-Size-Reduction': sizeReduction,
        },
      });
    } catch (pythonError: any) {
      // Clean up output file if it exists
      try {
        if (tempOutputPath && fs.existsSync(tempOutputPath)) {
          await fs.promises.unlink(tempOutputPath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      
      // Log detailed error information
      console.error('Python script execution error:', {
        message: pythonError.message,
        code: pythonError.code,
        signal: pythonError.signal,
        stdout: pythonError.stdout,
        stderr: pythonError.stderr,
        stack: pythonError.stack,
      });
      
      // Extract error message from stderr if available
      let errorMessage = pythonError.message || 'Failed to compress PDF';
      
      if (pythonError.stderr) {
        const stderrStr = pythonError.stderr.toString();
        if (stderrStr.includes('ERROR:')) {
          errorMessage = stderrStr.split('ERROR:')[1]?.trim() || errorMessage;
        } else if (stderrStr.trim()) {
          errorMessage = stderrStr.trim();
        }
      }
      
      // Check for specific error types
      if (pythonError.code === 'ENOENT') {
        errorMessage = 'Python executable not found. Please ensure Python is installed and in your PATH.';
      } else if (pythonError.code === 1) {
        // Python script exited with error code 1
        errorMessage = errorMessage || 'PDF compression failed. Check if PyMuPDF is installed: pip install PyMuPDF';
      } else if (pythonError.signal) {
        errorMessage = `Python process was terminated (signal: ${pythonError.signal}). The file might be too large or the process timed out.`;
      }
      
      throw new Error(errorMessage);
    }
  } catch (error: any) {
    console.error('PDF compression error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    
    // Provide helpful error message if Python is not installed
    const errorMessage = error.message?.toLowerCase() || '';
    const errorString = error.toString().toLowerCase();
    const errorCode = error.code?.toLowerCase() || '';
    
    // Check for Python-related errors
    if (errorMessage.includes('python') || 
        errorMessage.includes('not found') ||
        errorMessage.includes('enoent') ||
        errorString.includes('python') ||
        errorCode === 'enoent') {
      
      // More detailed error message
      let detailedError = 'Python is not installed or PyMuPDF is missing.\n\n';
      detailedError += 'Troubleshooting steps:\n';
      detailedError += '1. Verify Python is installed: Run "python3 --version" in your terminal\n';
      detailedError += '2. If Python is installed but not found:\n';
      detailedError += '   - On Windows: Add Python to PATH during installation\n';
      detailedError += '   - Or use full path to python.exe\n';
      detailedError += '3. Install PyMuPDF: pip install PyMuPDF (or pip3 install PyMuPDF)\n';
      detailedError += '4. Restart your Next.js development server\n';
      detailedError += '\nOriginal error: ' + error.message;
      
      return NextResponse.json(
        { 
          success: false, 
          error: detailedError
        },
        { status: 500 }
      );
    }

    // Check for PyMuPDF import errors
    if (errorMessage.includes('pymupdf') || 
        errorMessage.includes('fitz') ||
        errorMessage.includes('no module named')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'PyMuPDF is not installed. Please install it with: pip install PyMuPDF (or pip3 install PyMuPDF)\n\nAfter installation, restart your Next.js server.\n\nOriginal error: ' + error.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to compress PDF. Please try again.' },
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


