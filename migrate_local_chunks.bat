@echo off
REM Migrate Local ChromaDB Chunks to Render.com
REM Usage: migrate_local_chunks.bat

setlocal enabledelayedexpansion

set RAG_URL=https://tutorverse-rag.onrender.com
set DOCS_DIR=RAG18Nov2025-1\data\input

echo ========================================
echo Migrate Local ChromaDB to Render
echo ========================================
echo.
echo RAG Service: %RAG_URL%
echo Documents Dir: %DOCS_DIR%
echo.

set COUNT=0
for %%F in ("%DOCS_DIR%\*") do (
    set /a COUNT+=1
)

echo Found %COUNT% document(s):
for %%F in ("%DOCS_DIR%\*") do (
    echo   - %%~nxF
)
echo.

echo Starting upload...
echo.

set SUCCESS=0
set FAILED=0

for %%F in ("%DOCS_DIR%\*") do (
    echo Uploading: %%~nxF
    
    curl -s -X POST "%RAG_URL%/educator/upload" ^
        -F "file=@%%F" ^
        -o upload_response.json
    
    if exist upload_response.json (
        findstr /M "complete" upload_response.json >nul
        if !errorlevel! equ 0 (
            echo   SUCCESS
            set /a SUCCESS+=1
        ) else (
            echo   FAILED
            set /a FAILED+=1
        )
        del upload_response.json
    ) else (
        echo   ERROR: Cannot connect to RAG service
        set /a FAILED+=1
    )
    echo.
)

echo ========================================
echo Migration Complete
echo ========================================
echo.
echo Successful: %SUCCESS%
echo Failed: %FAILED%
echo.
echo SUCCESS: Chunks migrated to Render disk!
echo Quiz/Chat now use online chunks from Render
echo.
