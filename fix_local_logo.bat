@echo off
echo ===================================================
echo   PERBAIKAN LOGO LOKAL (BASE64 CANVAS FIX)
echo ===================================================
echo.
cd /d "%~dp0"

echo Mengonversi DayasaPaper Corporate Logo.png ke Base64 Data URI...

if exist "%~dp0DayasaPaper Corporate Logo.png" (
    C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -Command "$bytes = [System.IO.File]::ReadAllBytes('%~dp0DayasaPaper Corporate Logo.png'); $b64 = [System.Convert]::ToBase64String($bytes); $js = 'window.DEFAULT_LOGO_IMAGE = \"data:image/png;base64,' + $b64 + '\";'; [System.IO.File]::WriteAllText('%~dp0js\logo_data.js', $js, [System.Text.Encoding]::UTF8);"
    echo STATUS: Berhasil mengonversi logo ke js\logo_data.js!
) else if exist "%~dp0img\dayasa_logo.png" (
    C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe -Command "$bytes = [System.IO.File]::ReadAllBytes('%~dp0img\dayasa_logo.png'); $b64 = [System.Convert]::ToBase64String($bytes); $js = 'window.DEFAULT_LOGO_IMAGE = \"data:image/png;base64,' + $b64 + '\";'; [System.IO.File]::WriteAllText('%~dp0js\logo_data.js', $js, [System.Text.Encoding]::UTF8);"
    echo STATUS: Berhasil mengonversi logo dari img\dayasa_logo.png!
) else (
    echo ERROR: File gambar logo tidak ditemukan di folder!
)

echo.
echo Selesai! Silakan TEKAN F5 (REFRESH) pada browser lokal Anda.
echo.
pause
