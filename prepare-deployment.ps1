# PowerShell script to prepare Azure deployment package
# This excludes node_modules and includes the built .next folder

Write-Host "Preparing Azure deployment package..." -ForegroundColor Green

# Create deployment folder
$deployFolder = "azure-deploy"
if (Test-Path $deployFolder) {
    Remove-Item -Recurse -Force $deployFolder
}
New-Item -ItemType Directory -Path $deployFolder | Out-Null

Write-Host "Copying files..." -ForegroundColor Yellow

# Copy necessary files and folders
$itemsToCopy = @(
    "app",
    "public",
    "scripts",
    ".next",
    "package.json",
    "package-lock.json",
    "next.config.ts",
    "tsconfig.json",
    "requirements.txt"
)

foreach ($item in $itemsToCopy) {
    if (Test-Path $item) {
        Write-Host "  Copying $item..." -ForegroundColor Cyan
        Copy-Item -Path $item -Destination $deployFolder -Recurse -Force
    } else {
        Write-Host "  Warning: $item not found, skipping..." -ForegroundColor Yellow
    }
}

# Create .gitignore for deployment (optional)
$gitignoreContent = @"
node_modules/
.env.local
.env*.local
*.log
.DS_Store
"@
Set-Content -Path "$deployFolder\.gitignore" -Value $gitignoreContent

Write-Host "`nCreating ZIP file..." -ForegroundColor Yellow
$zipFile = "azure-deployment.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

# Create ZIP using .NET compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($deployFolder, $zipFile)

Write-Host "`nDeployment package created: $zipFile" -ForegroundColor Green
Write-Host "Size: $([math]::Round((Get-Item $zipFile).Length / 1MB, 2)) MB" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Upload $zipFile to Azure via Kudu or Azure CLI" -ForegroundColor White
Write-Host "2. In Azure, run: npm install --production" -ForegroundColor White
Write-Host "3. In Azure, run: npm start" -ForegroundColor White


