@echo off
setlocal
title Pasang otomasi database

rem ================= PENGATURAN =================
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=db_cwis06
set DB_USER=postgres
rem ==============================================
rem Dijalankan SEKALI. File otomasi_qgis.sql harus satu folder dengan file ini.

cd /d "%~dp0"
if not exist "otomasi_qgis.sql" (
  echo File otomasi_qgis.sql tidak ditemukan di folder ini.
  goto :gagal
)

set "PSQL="
for /d %%D in ("C:\Program Files\PostgreSQL\*") do if exist "%%~fD\bin\psql.exe" set "PSQL=%%~fD\bin\psql.exe"
if not defined PSQL (
  echo psql tidak ditemukan. Jalankan isi otomasi_qgis.sql satu kali lewat DB Manager QGIS atau pgAdmin.
  goto :gagal
)

set PGCLIENTENCODING=UTF8
rem Password: dibaca dari pgpass.conf bila ada. Kalau tidak ada, ditanyakan dengan input tersembunyi dan tidak disimpan.
if not exist "%APPDATA%\postgresql\pgpass.conf" (
  if not defined PGPASSWORD (
    for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "$s=Read-Host 'Password PostgreSQL untuk user %DB_USER%' -AsSecureString; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))"`) do set "PGPASSWORD=%%P"
  )
)

echo Memasang otomasi ke database %DB_NAME% ...
"%PSQL%" -w -q -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -v ON_ERROR_STOP=1 --single-transaction -f "%~dp0otomasi_qgis.sql"
if errorlevel 1 goto :gagal

echo.
echo Selesai. Otomasi terpasang. Dari sekarang cukup edit di QGIS, Save Edits, lalu jalankan update_dashboard.bat.
goto :selesai

:gagal
echo.
echo Proses dihentikan karena ada kesalahan. Baca pesan di atas.

:selesai
echo.
pause
endlocal
