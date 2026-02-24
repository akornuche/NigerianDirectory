@echo off
REM NigerianDirectory Database Backup Script
REM Usage: backup.bat [output_dir]
REM Requires: pg_dump in PATH or PGBIN set

set PGHOST=localhost
set PGPORT=5433
set PGUSER=postgres
set PGDATABASE=nigerian_directory

set OUTPUT_DIR=%1
if "%OUTPUT_DIR%"=="" set OUTPUT_DIR=backups

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

set TIMESTAMP=%DATE:~10,4%%DATE:~4,2%%DATE:~7,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=%OUTPUT_DIR%\nigerian_directory_%TIMESTAMP%.sql

echo.
echo === NigerianDirectory Database Backup ===
echo.
echo Host: %PGHOST%:%PGPORT%
echo Database: %PGDATABASE%
echo Output: %BACKUP_FILE%
echo.

pg_dump -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% --no-owner --no-acl -f "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Backup completed successfully!
    echo File: %BACKUP_FILE%
) else (
    echo.
    echo Backup FAILED. Check connection settings.
    exit /b 1
)
