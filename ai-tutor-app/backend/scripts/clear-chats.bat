@echo off
REM Script to clear all chat sessions and messages
REM Usage: clear-chats.bat

echo.
echo 4 Clearing all chats and messages...
echo.
echo WARNING: This will delete ALL chat data!
echo.
set /p confirm="Type 'DELETE ALL CHATS' to confirm: "

if not "%confirm%"=="DELETE ALL CHATS" (
    echo Cancelled.
    exit /b 1
)

set CONFIRM_DELETE=true
cd /d "%~dp0\.."
call npx ts-node scripts/clear-all-chats.ts
