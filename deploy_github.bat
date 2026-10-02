@echo off
echo ===================================================
echo     DEPLOY APLIKASI KE GITHUB (DAYASAPAPER)
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/5] Memperbarui file logo HD & Base64 Data URL...

if exist "%~dp0DayasaPaper Corporate Logo.png" (
    copy /y "%~dp0DayasaPaper Corporate Logo.png" "%~dp0img\dayasa_logo.png" >nul 2>&1
)

if exist "C:\Users\Asus\.gemini\antigravity\brain\b801216d-cf3e-414d-8fba-bc59f20263b9\.user_uploaded\media__1790954919308.png" (
    copy /y "C:\Users\Asus\.gemini\antigravity\brain\b801216d-cf3e-414d-8fba-bc59f20263b9\.user_uploaded\media__1790954919308.png" "%~dp0img\dayasa_logo.png" >nul 2>&1
    copy /y "C:\Users\Asus\.gemini\antigravity\brain\b801216d-cf3e-414d-8fba-bc59f20263b9\.user_uploaded\media__1790954919308.png" "%~dp0DayasaPaper Corporate Logo.png" >nul 2>&1
)

C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -Command "$bytes = [System.IO.File]::ReadAllBytes('%~dp0img\dayasa_logo.png'); $b64 = [System.Convert]::ToBase64String($bytes); $js = 'window.DEFAULT_LOGO_IMAGE = \"data:image/png;base64,' + $b64 + '\";'; [System.IO.File]::WriteAllText('%~dp0js\logo_data.js', $js);" >nul 2>&1

echo [2/5] Menginisialisasi Git Repository...
git init
git add .
git commit -m "Deploy Dayasa Bulk Card Generator App with HD Base64 Logo"

echo.
echo [3/5] Buka https://github.com/new untuk buat repo baru jika belum.
echo       - Nama Repo: dayasa-card-generator
echo       - Klik 'Create repository'
echo.
set /p REPO_URL="[4/5] Paste (tempel) URL Repository GitHub Anda di sini (lalu tekan Enter): "

if "%REPO_URL%"=="" (
    echo.
    echo ERROR: URL Repository tidak boleh kosong!
    pause
    exit /b
)

git branch -M main
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

echo.
echo [5/5] Mengunggah file ke GitHub...
git push -u origin main

echo.
echo ===================================================
echo     PROSES UPLOAD SELESAI!
echo ===================================================
echo.
echo Langkah Terakhir untuk Mengaktifkan Link Web (GitHub Pages):
echo 1. Buka repository Anda di browser.
echo 2. Klik menu 'Settings' -> 'Pages'.
echo 3. Di bagian Source: Pilih 'Deploy from a branch'.
echo 4. Pilih Branch: 'main' dan '/ (root)' lalu klik 'Save'.
echo 5. Web Anda akan aktif di: https://<username>.github.io/dayasa-card-generator/
echo ===================================================
echo.
pause
