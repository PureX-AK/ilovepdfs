import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync, execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function POST(request: NextRequest) {
  let tempInputPath: string | null = null;
  let tempOutputPath: string | null = null;

  try {
    // Try to find Ghostscript if not in PATH
    // This helps when Ghostscript is installed but PATH wasn't updated
    if (process.platform === 'win32') {
      let foundGsPath: string | null = null;
      
      // Function to search for Ghostscript in a base directory
      const findGhostscript = (baseDir: string): string | null => {
        try {
          if (!fs.existsSync(baseDir)) {
            return null;
          }
          
          const gsDirs = fs.readdirSync(baseDir);
          for (const dir of gsDirs) {
            // Try gswin64c.exe first (64-bit)
            const binPath64 = path.join(baseDir, dir, 'bin', 'gswin64c.exe');
            if (fs.existsSync(binPath64)) {
              return path.dirname(binPath64);
            }
            
            // Try gswin32c.exe (32-bit)
            const binPath32 = path.join(baseDir, dir, 'bin', 'gswin32c.exe');
            if (fs.existsSync(binPath32)) {
              return path.dirname(binPath32);
            }
          }
        } catch (e) {
          // Ignore errors when searching
        }
        return null;
      };
      
      // Search in both Program Files locations
      const searchPaths = [
        'C:\\Program Files\\gs',
        'C:\\Program Files (x86)\\gs',
      ];
      
      for (const searchPath of searchPaths) {
        foundGsPath = findGhostscript(searchPath);
        if (foundGsPath) {
          break;
        }
      }
      
      // If found, add to PATH
      if (foundGsPath) {
        if (!process.env.PATH?.includes(foundGsPath)) {
          process.env.PATH = `${foundGsPath};${process.env.PATH || ''}`;
        }
        
        // Also set GS_BIN environment variable that some packages check
        const gsExe = fs.existsSync(path.join(foundGsPath, 'gswin64c.exe'))
          ? path.join(foundGsPath, 'gswin64c.exe')
          : path.join(foundGsPath, 'gswin32c.exe');
        
        if (fs.existsSync(gsExe)) {
          process.env.GS_BIN = gsExe;
          process.env.GHOSTSCRIPT = gsExe;
          // Store for use in compression function
          (global as any).__gsExecutable = gsExe;
        }
        
        console.log(`Found Ghostscript at: ${foundGsPath}`);
        console.log(`Ghostscript executable: ${gsExe}`);
      } else {
        // Don't throw error - Ghostscript might be in system PATH already
        // Let compress-pdf package try to find it
        console.log('Ghostscript not found in common installation locations, checking system PATH...');
        
        // Try to verify if gswin64c is accessible via PATH and get its location
        try {
          // On Windows, use 'where' command to find executable
          const whereOutput = execSync('where gswin64c', { 
            encoding: 'utf-8',
            stdio: 'pipe',
            shell: true as any
          }).trim();
          
          if (whereOutput) {
            const gsPath = whereOutput.split('\n')[0].trim();
            const gsDir = path.dirname(gsPath);
            
            // Add to PATH if not already there
            if (!process.env.PATH?.includes(gsDir)) {
              process.env.PATH = `${gsDir};${process.env.PATH || ''}`;
            }
            
            process.env.GS_BIN = gsPath;
            process.env.GHOSTSCRIPT = gsPath;
            (global as any).__gsExecutable = gsPath;
            
            console.log(`Found Ghostscript in system PATH: ${gsPath}`);
          }
        } catch (e) {
          // If not found anywhere, throw error
          throw new Error('Ghostscript not found. Please ensure Ghostscript is installed and accessible.');
        }
      }
      
      // Ensure we have the Ghostscript executable path
      const gsExe = (global as any).__gsExecutable || process.env.GS_BIN || process.env.GHOSTSCRIPT;
      if (!gsExe || !fs.existsSync(gsExe)) {
        throw new Error('Ghostscript executable not found. Please ensure Ghostscript is installed.');
      }
      console.log(`Using Ghostscript: ${gsExe}`);
    } else {
      // Non-Windows: try to find 'gs' command
      try {
        execSync('gs --version', { stdio: 'pipe' });
        console.log('Found Ghostscript in system PATH');
      } catch (e) {
        throw new Error('Ghostscript not found. Please ensure Ghostscript is installed.');
      }
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

    // Create temporary file path
    const tempDir = os.tmpdir();
    const uniqueId = Date.now() + Math.random().toString(36).substring(7);
    tempInputPath = path.join(tempDir, `input_${uniqueId}.pdf`);

    // Read the file and save to temporary location
    const arrayBuffer = await file.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(tempInputPath, inputBuffer);

    // Get Ghostscript executable path
    const gsExe = (global as any).__gsExecutable || process.env.GS_BIN || process.env.GHOSTSCRIPT || 'gswin64c';
    
    if (!gsExe || (!fs.existsSync(gsExe) && !gsExe.includes('gswin'))) {
      throw new Error('Ghostscript executable not found. Please ensure Ghostscript is installed.');
    }

    // Create output file path
    tempOutputPath = path.join(os.tmpdir(), `output_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`);

    // Map compression level to PDFSETTINGS
    const pdfSettingsMap: Record<string, string> = {
      low: '/screen',      // 72 dpi, lower quality
      medium: '/ebook',    // 150 dpi, good balance
      high: '/printer',    // 300 dpi, higher quality
    };
    const pdfSettings = pdfSettingsMap[compressionLevel] || '/ebook';

    // Build Ghostscript command with correct parameters for version 10.06.0+
    const gsArgs = [
      '-q',                                    // Quiet mode
      '-dNOPAUSE',                             // Don't pause between pages
      '-dBATCH',                               // Exit after processing
      '-dSAFER',                               // Safer mode
      '-sDEVICE=pdfwrite',                     // Output device
      '-dCompatibilityLevel=1.4',              // PDF version
      `-dPDFSETTINGS=${pdfSettings}`,          // Compression preset
      '-dEmbedAllFonts=true',                  // Embed all fonts
      '-dSubsetFonts=true',                    // Subset fonts
      '-dAutoRotatePages=/None',              // Don't auto-rotate
      '-dColorImageDownsampleType=/Bicubic',   // Color image downsampling
      '-dColorImageResolution=150',            // Color image resolution
      '-dGrayImageDownsampleType=/Bicubic',    // Gray image downsampling
      '-dGrayImageResolution=150',             // Gray image resolution
      '-dMonoImageDownsampleType=/Bicubic',    // Mono image downsampling
      '-dMonoImageResolution=300',             // Mono image resolution
      `-sOutputFile=${tempOutputPath}`,        // Output file (use = not space)
      tempInputPath,                           // Input file
    ];

    try {
      // Execute Ghostscript
      await execFileAsync(gsExe, gsArgs, {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      });

      // Read the compressed PDF
      const compressedPdfBuffer = await fs.promises.readFile(tempOutputPath);
      const compressedSize = compressedPdfBuffer.length;

      // Calculate compression statistics
      const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      const sizeReduction = ((originalSize - compressedSize) / 1024).toFixed(1);

      // Convert to Uint8Array for NextResponse
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
    } catch (gsError: any) {
      // Clean up output file if it exists
      try {
        if (tempOutputPath && fs.existsSync(tempOutputPath)) {
          await fs.promises.unlink(tempOutputPath);
        }
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw gsError;
    }
  } catch (error: any) {
    console.error('PDF compression error:', error);
    
    // Provide helpful error message if Ghostscript is not installed
    const errorMessage = error.message?.toLowerCase() || '';
    const errorString = error.toString().toLowerCase();
    
    if (errorMessage.includes('ghostscript') || 
        errorMessage.includes('gs') || 
        errorMessage.includes('not found') ||
        errorString.includes('ghostscript') ||
        errorString.includes('gs')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ghostscript is not installed. Please install Ghostscript to use PDF compression.\n\nInstallation:\n1. Download from https://www.ghostscript.com/download/gsdnld.html\n2. Run the installer\n3. Restart your development server\n\nAfter installation, restart your Next.js server and try again.' 
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


