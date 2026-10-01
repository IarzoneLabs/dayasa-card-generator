@echo off
echo ===================================================
echo     DEPLOY APLIKASI KE GITHUB (DAYASAPAPER)
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/4] Menginisialisasi Git Repository...
git init
git add .
git commit -m "Deploy Dayasa Bulk Card Generator App"

echo.
echo [2/4] Buka https://github.com/new untuk buat repo baru.
echo       - Nama Repo: dayasa-card-generator
echo       - Klik 'Create repository'
echo.
set /p REPO_URL="[3/4] Paste (tempel) URL Repository GitHub Anda di sini (lalu tekan Enter): "

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
echo Mengunggah file ke GitHub...
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
