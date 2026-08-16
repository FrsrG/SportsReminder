@echo off
cd /d "%~dp0"
echo ========================================================
echo Building Standalone Production Extension...
echo ========================================================
cmd /c npm run build

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed! Check terminal output.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ========================================================
echo Creating Release Zip Package for Friends...
echo ========================================================
powershell -Command "if (Test-Path 'Sports-Reminder-Extension-v2.0.zip') { Remove-Item 'Sports-Reminder-Extension-v2.0.zip' }; Compress-Archive -Path 'dist\*' -DestinationPath 'Sports-Reminder-Extension-v2.0.zip'"

echo.
echo SUCCESS!
echo 1. Standalone production build generated in: dist\
echo 2. Sharable zip file created: Sports-Reminder-Extension-v2.0.zip
echo.
echo You do NOT need start-dev.bat running anymore.
echo Simply load the 'dist' folder into chrome://extensions!
echo.
pause
