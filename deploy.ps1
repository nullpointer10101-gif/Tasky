# Tasky Deploy Script
# Builds miniapp, cleans old assets, copies fresh build, then pushes to GitHub
# Usage: .\deploy.ps1 [-Message "your commit message"]

param(
    [string]$Message = "deploy: update miniapp build"
)

Write-Host "=== Tasky Deploy ===" -ForegroundColor Cyan

# Step 1: Build miniapp
Write-Host "`n[1/4] Building miniapp..." -ForegroundColor Yellow
Set-Location miniapp
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build FAILED. Aborting deploy." -ForegroundColor Red
    exit 1
}
Set-Location ..

# Step 2: Clean public/app (removes ALL stale old builds)
Write-Host "`n[2/4] Cleaning backend/public/app..." -ForegroundColor Yellow
Remove-Item -Path "backend\public\app\*" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "  Cleaned." -ForegroundColor Green

# Step 3: Copy fresh build
Write-Host "`n[3/4] Copying fresh build to backend/public/app..." -ForegroundColor Yellow
Copy-Item -Path "miniapp\dist\*" -Destination "backend\public\app\" -Recurse -Force
$totalMB = (Get-ChildItem "backend\public\app" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "  Done. Total size: $([math]::Round($totalMB, 2)) MB" -ForegroundColor Green

# Step 4: Commit and push
Write-Host "`n[4/4] Committing and pushing to GitHub..." -ForegroundColor Yellow
git add -A
git commit -m $Message
git push origin main

Write-Host "`n=== Deploy complete! Render will auto-deploy. ===" -ForegroundColor Green
