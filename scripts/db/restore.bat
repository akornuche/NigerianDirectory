@echo off
REM NigerianDirectory Database Restore Script
REM Usage: restore.bat <backup_file>
REM WARNING: This will overwrite the current database!

if "%1"=="" (
    echo Usage: restore.bat ^<backup_file^>
    echo Example: restore.bat backups\nigerian_directory_20260223.sql
    exit /b 1
)

set PGHOST=localhost
set PGPORT=5433
set PGUSER=postgres
set PGDATABASE=nigerian_directory
set BACKUP_FILE=%1

if not exist "%BACKUP_FILE%" (
    echo ERROR: File not found: %BACKUP_FILE%
    exit /b 1
)

echo.
echo === NigerianDirectory Database Restore ===
echo.
echo WARNING: This will overwrite the current database!
echo.
echo Host: %PGHOST%:%PGPORT%
echo Database: %PGDATABASE%
echo File: %BACKUP_FILE%
echo.
set /p CONFIRM=Are you sure? (y/n): 

if /i not "%CONFIRM%"=="y" (
    echo Restore cancelled.
    exit /b 0
)

echo.
echo Restoring database...

psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -f "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Restore completed successfully!
) else (
    echo.
    echo Restore FAILED. Check the backup file and connection settings.
    exit /b 1
)
