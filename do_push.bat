@echo off
echo ===================================================
echo   MEMPROSES COMMIT DAN PUSH KE GITHUB / VERCEL
echo ===================================================
echo.
cd /d "%~dp0"

echo [1/3] Menyiapkan URL Remote Repository...
git remote set-url origin https://github.com/IarzoneLabs/dayasa-card-generator.git

echo.
echo [2/3] Menyimpan perubahan (Commit)...
git add -A
git commit -m "Fix HD Logo and 100% Exact PDF Match"

echo.
echo [3/3] Mengunggah ke GitHub / Vercel (Push)...
git push origin main

echo.
echo ===================================================
echo     PROSES SELESAI DENGAN SUKSES!
echo ===================================================
echo.
echo Langkah terakhir: Buka web Anda di browser lalu tekan Ctrl + Shift + R
echo ===================================================
echo.
pause
