# PowerShell script to help deploy Next.js app to IIS
# Run this script from your project root directory

Write-Host "=== Next.js IIS Deployment Helper ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Step 1: Install dependencies
Write-Host "Step 1: Installing Node.js dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: npm install failed" -ForegroundColor Red
    exit 1
}

# Step 2: Build the application
Write-Host ""
Write-Host "Step 2: Building the application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Build failed" -ForegroundColor Red
    exit 1
}

# Step 3: Check if standalone folder exists
Write-Host ""
Write-Host "Step 3: Checking build output..." -ForegroundColor Yellow
if (-not (Test-Path ".next\standalone")) {
    Write-Host "Warning: .next\standalone folder not found!" -ForegroundColor Red
    Write-Host "Make sure next.config.ts has 'output: standalone' configured." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✓ Standalone build found" -ForegroundColor Green
}

# Step 4: Check for required folders
Write-Host ""
Write-Host "Step 4: Checking required folders..." -ForegroundColor Yellow
$requiredFolders = @(".next\static", "public", "scripts")
$allExist = $true

foreach ($folder in $requiredFolders) {
    if (Test-Path $folder) {
        Write-Host "✓ $folder exists" -ForegroundColor Green
    } else {
        Write-Host "✗ $folder missing!" -ForegroundColor Red
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Host "Error: Some required folders are missing" -ForegroundColor Red
    exit 1
}

# Step 5: Check for web.config
Write-Host ""
Write-Host "Step 5: Checking web.config..." -ForegroundColor Yellow
if (Test-Path "web.config") {
    Write-Host "✓ web.config exists" -ForegroundColor Green
} else {
    Write-Host "✗ web.config missing! Creating it..." -ForegroundColor Yellow
    # You can create web.config here if needed
    Write-Host "Please create web.config file manually" -ForegroundColor Yellow
}

# Step 6: Check Node.js installation
Write-Host ""
Write-Host "Step 6: Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js and add it to PATH" -ForegroundColor Yellow
}

# Step 7: Check Python installation
Write-Host ""
Write-Host "Step 7: Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version
    Write-Host "✓ Python version: $pythonVersion" -ForegroundColor Green
    
    # Check if requirements.txt exists and suggest installing
    if (Test-Path "requirements.txt") {
        Write-Host ""
        Write-Host "Don't forget to install Python dependencies:" -ForegroundColor Yellow
        Write-Host "  pip install -r requirements.txt" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ Python not found in PATH" -ForegroundColor Red
    Write-Host "Please install Python and add it to PATH" -ForegroundColor Yellow
}

# Step 8: Summary
Write-Host ""
Write-Host "=== Deployment Summary ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Copy the following to your IIS server:" -ForegroundColor White
Write-Host "   - .next\standalone\ (entire folder)" -ForegroundColor Gray
Write-Host "   - .next\static\ (entire folder)" -ForegroundColor Gray
Write-Host "   - public\ (entire folder)" -ForegroundColor Gray
Write-Host "   - scripts\ (entire folder)" -ForegroundColor Gray
Write-Host "   - web.config" -ForegroundColor Gray
Write-Host ""
Write-Host "2. On the IIS server:" -ForegroundColor White
Write-Host "   - Install iisnode module" -ForegroundColor Gray
Write-Host "   - Install IIS URL Rewrite module" -ForegroundColor Gray
Write-Host "   - Create Application Pool (No Managed Code)" -ForegroundColor Gray
Write-Host "   - Create Website/Application pointing to copied files" -ForegroundColor Gray
Write-Host "   - Set environment variables" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Configure environment variables:" -ForegroundColor White
Write-Host "   - MONGODB_URI" -ForegroundColor Gray
Write-Host "   - JWT_SECRET" -ForegroundColor Gray
Write-Host "   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET" -ForegroundColor Gray
Write-Host "   - SMTP settings" -ForegroundColor Gray
Write-Host "   - NEXT_PUBLIC_BASE_URL" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed instructions, see: IIS-DEPLOYMENT-GUIDE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployment preparation complete! ✓" -ForegroundColor Green



