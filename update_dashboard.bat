@echo off
setlocal
title Update Dashboard Sewerage

rem ================= PENGATURAN =================
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=db_cwis06
set DB_USER=postgres
set SRC_SRID=32749
rem ==============================================
rem Letakkan file ini di folder repo hasil git clone (satu folder dengan index.html).
rem Sebelum menjalankan: di QGIS klik Save Edits agar perubahan masuk ke database.

cd /d "%~dp0"

if not exist ".git" (
  echo Folder ini bukan repo Git. Jalankan git clone dulu, lalu salin file ini ke folder hasil clone.
  goto :gagal
)
where git >nul 2>&1
if errorlevel 1 (
  echo Git belum terpasang. Pasang Git for Windows dari git-scm.com.
  goto :gagal
)

set "QGIS_DIR="
for /d %%D in ("C:\Program Files\QGIS*") do set "QGIS_DIR=%%~fD"
if not defined QGIS_DIR (
  echo Folder QGIS tidak ditemukan di C:\Program Files. Ubah baris QGIS_DIR di file ini.
  goto :gagal
)

rem PERBAIKAN: Menyimpan PATH Windows asli agar perintah 'git' tidak hilang setelah QGIS dipanggil
set "ORIG_PATH=%PATH%"
call "%QGIS_DIR%\bin\o4w_env.bat" >nul 2>&1
set "PATH=%ORIG_PATH%;%PATH%"

where ogr2ogr >nul 2>&1
if errorlevel 1 (
  echo ogr2ogr tidak ditemukan di instalasi QGIS: %QGIS_DIR%
  goto :gagal
)

rem Password: dibaca dari pgpass.conf bila ada, kalau tidak ada ditanyakan (tidak disimpan).
if not exist "%APPDATA%\postgresql\pgpass.conf" (
  if not defined PGPASSWORD set /p PGPASSWORD=Password PostgreSQL untuk user %DB_USER%: 
)

if not exist data mkdir data
rem Format: call :ekspor NAMA_TABEL NAMA_FILE WAJIB(1/0). Layer opsional dilewati bila tabelnya belum ada.
call :ekspor v_lateral_pipe v_lateral_pipe 1
if errorlevel 1 goto :gagal
call :ekspor v_manhole v_manhole 1
if errorlevel 1 goto :gagal
call :ekspor house_inlet house_inlet 0
call :ekspor inspection_chamber inspection_chamber 0
call :ekspor collecting_pipe collecting_pipe 0
call :ekspor persil_pipe persil_pipe 0
call :ekspor zone_area zona 0
call :ekspor rw_boundary batas_rw 0

git add data/*.geojson
git diff --cached --quiet
if not errorlevel 1 (
  echo Tidak ada perubahan data. Dashboard sudah terbaru.
  goto :selesai
)
git commit -m "Update data %date% %time%"
if errorlevel 1 goto :gagal
git pull --rebase
if errorlevel 1 goto :gagal
git push
if errorlevel 1 goto :gagal

echo.
echo Berhasil. Dashboard akan terbarui dalam 1-2 menit. Muat ulang halaman dengan Ctrl+F5.
goto :selesai

:ekspor
set "OUTF=data\%2.geojson"
set "TMPF=data\%2.tmp.geojson"
if exist "%TMPF%" del "%TMPF%"
echo Mengekspor %1 ...
ogr2ogr -f GeoJSON -s_srs EPSG:%SRC_SRID% -t_srs EPSG:4326 -lco COORDINATE_PRECISION=7 "%TMPF%" "PG:host=%DB_HOST% port=%DB_PORT% dbname=%DB_NAME% user=%DB_USER%" -sql "SELECT * FROM sewer.%1"
if errorlevel 1 goto :gagal_ekspor
if not exist "%TMPF%" goto :gagal_ekspor
move /y "%TMPF%" "%OUTF%" >nul
exit /b 0

:gagal_ekspor
if exist "%TMPF%" del "%TMPF%"
if "%3"=="1" exit /b 1
echo Dilewati: %1 belum ada di database atau gagal diekspor.
exit /b 0

:gagal
echo.
echo Proses dihentikan karena ada kesalahan. Baca pesan di atas.

:selesai
echo.
pause
endlocal