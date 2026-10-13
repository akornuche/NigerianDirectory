<#
.SYNOPSIS
    Control the local (Docker-free) PostgreSQL 15 instance.

.DESCRIPTION
    Runs PostgreSQL from portable binaries as a normal user process.
    No Docker, no WSL, no administrator rights required.

    Because this is not installed as a Windows service, it does NOT
    start automatically after a reboot. Run `pg-local.ps1 start` again.

.EXAMPLE
    .\scripts\pg-local.ps1 start
    .\scripts\pg-local.ps1 status
    .\scripts\pg-local.ps1 stop
    .\scripts\pg-local.ps1 psql
    .\scripts\pg-local.ps1 counts
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('start', 'stop', 'restart', 'status', 'psql', 'counts')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'

$PgRoot  = Join-Path $env:LOCALAPPDATA 'pg15'
$PgBin   = Join-Path $PgRoot 'pgsql\bin'
$PgData  = Join-Path $PgRoot 'data'
$PgLog   = Join-Path $PgRoot 'pg.log'
$PgPort  = 5433
$PgDb    = 'nigerian_directory'
$PgUser  = 'postgres'

if (-not (Test-Path $PgBin)) {
    Write-Error "PostgreSQL binaries not found at $PgBin"
    exit 1
}

# Password is read from the environment when provided, otherwise the
# local development default is used. Never commit real credentials.
if (-not $env:PGPASSWORD) { $env:PGPASSWORD = 'devpassword123' }

switch ($Action) {
    'start' {
        & "$PgBin\pg_ctl.exe" -D $PgData -o "-p $PgPort" -l $PgLog start
        Start-Sleep -Seconds 5
        & "$PgBin\pg_isready.exe" -h localhost -p $PgPort -U $PgUser
    }
    'stop' {
        & "$PgBin\pg_ctl.exe" -D $PgData -m fast stop
    }
    'restart' {
        & "$PgBin\pg_ctl.exe" -D $PgData -m fast stop
        Start-Sleep -Seconds 3
        & "$PgBin\pg_ctl.exe" -D $PgData -o "-p $PgPort" -l $PgLog start
        Start-Sleep -Seconds 5
        & "$PgBin\pg_isready.exe" -h localhost -p $PgPort -U $PgUser
    }
    'status' {
        & "$PgBin\pg_isready.exe" -h localhost -p $PgPort -U $PgUser
    }
    'psql' {
        & "$PgBin\psql.exe" -h localhost -p $PgPort -U $PgUser -d $PgDb
    }
    'counts' {
        $sql = @"
SELECT COALESCE(institution_category, '(none)') AS category,
       COUNT(*)                                  AS total,
       COUNT(*) FILTER (WHERE enriched_at IS NOT NULL) AS enriched
FROM schools
GROUP BY 1
ORDER BY 2 DESC;
"@
        & "$PgBin\psql.exe" -h localhost -p $PgPort -U $PgUser -d $PgDb -c $sql
    }
}
