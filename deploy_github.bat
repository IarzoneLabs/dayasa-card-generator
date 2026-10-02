@echo off
echo ===================================================
echo     DEPLOY APLIKASI KE GITHUB (DAYASAPAPER)
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/5] Memperbarui file logo HD DayasaPaper...

if exist "%~dp0DayasaPaper Corporate Logo.png" (
    copy /y "%~dp0DayasaPaper Corporate Logo.png" "%~dp0img\dayasa_logo.png" >nul 2>&1
)

echo [2/5] Menginisialisasi Git Repository...
git init
git add .
git commit -m "Deploy Ultra-Fast Lightweight Dayasa Card Generator"

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
