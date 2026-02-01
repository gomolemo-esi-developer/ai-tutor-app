# PowerShell Script for Cleanup Before Containerization
# Run this script to remove development artifacts and large files

Write-Host "=== TutorVerse Cleanup Script ===" -ForegroundColor Green
Write-Host "This will remove build artifacts and environment files for containerization" -ForegroundColor Yellow
Write-Host ""

$confirmDelete = Read-Host "Continue? (yes/no)"
if ($confirmDelete -ne "yes") {
    Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    exit
}

# Frontend cleanup
Write-Host "Cleaning Frontend (ai-tutor-app/tutorverse-hub-main)..." -ForegroundColor Cyan

$frontendPaths = @(
    "ai-tutor-app\tutorverse-hub-main\node_modules",
    "ai-tutor-app\tutorverse-hub-main\dist"
)

foreach ($path in $frontendPaths) {
    if (Test-Path $path) {
        Write-Host "  Removing: $path" -ForegroundColor Yellow
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Backend cleanup
Write-Host "Cleaning Backend (ai-tutor-app/backend)..." -ForegroundColor Cyan

$backendPaths = @(
    "ai-tutor-app\backend\node_modules",
    "ai-tutor-app\backend\dist",
    "ai-tutor-app\backend\lambda-code.tar.gz",
    "ai-tutor-app\backend\lambda-code.zip",
    "ai-tutor-app\backend\backend.log"
)

foreach ($path in $backendPaths) {
    if (Test-Path $path) {
        Write-Host "  Removing: $path" -ForegroundColor Yellow
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# RAG Service cleanup
Write-Host "Cleaning RAG Service (RAG18Nov2025-1)..." -ForegroundColor Cyan

$ragPaths = @(
    "RAG18Nov2025-1\venv",
    "RAG18Nov2025-1\__pycache__",
    "RAG18Nov2025-1\chroma_db",
    "RAG18Nov2025-1\educator_files_list.json",
    "RAG18Nov2025-1\chroma_population_dynamodb_summary.json",
    "RAG18Nov2025-1\chroma_population_summary.json"
)

foreach ($path in $ragPaths) {
    if (Test-Path $path) {
        Write-Host "  Removing: $path" -ForegroundColor Yellow
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Clean up Python cache in all subdirectories
Write-Host "Cleaning Python cache files..." -ForegroundColor Cyan
Get-ChildItem -Path "RAG18Nov2025-1" -Recurse -Filter "__pycache__" -Directory | 
    ForEach-Object { 
        Write-Host "  Removing: $($_.FullName)" -ForegroundColor Yellow
        Remove-Item -Path $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }

Get-ChildItem -Path "RAG18Nov2025-1" -Recurse -Filter "*.pyc" | 
    ForEach-Object { 
        Write-Host "  Removing: $($_.FullName)" -ForegroundColor Yellow
        Remove-Item -Path $_.FullName -Force -ErrorAction SilentlyContinue
    }

Write-Host ""
Write-Host "=== Cleanup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "✓ Build artifacts removed" -ForegroundColor Green
Write-Host "✓ Virtual environments removed" -ForegroundColor Green
Write-Host "✓ Cache files removed" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Delete .env files manually (they contain secrets)"
Write-Host "  2. Review tutorverse-hub-main/ and backups/ directories"
Write-Host "  3. Commit cleaned code: git add -A ; git commit -m 'chore: cleanup for containerization'"
Write-Host "  4. Test Docker build: docker-compose build"
Write-Host "  5. Push to GitHub and Docker registry"
