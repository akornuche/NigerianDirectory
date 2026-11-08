# Monitor Secondary School Crawl Progress

$logfile = Get-ChildItem -Filter "secondary_school_crawl_*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $logfile) {
    Write-Host "No log file found" -ForegroundColor Red
    exit 1
}

Write-Host "Monitoring: $($logfile.Name)" -ForegroundColor Cyan
Write-Host ""

while ($true) {
    Clear-Host
    Write-Host "=== SECONDARY SCHOOL CRAWL PROGRESS ===" -ForegroundColor Cyan
    Write-Host ""
    
    # Get latest lines
    $lines = Get-Content $logfile.FullName -Tail 30
    
    # Count successes
    $successes = @($lines | Select-String "✅ Saved:" | Measure-Object).Count
    $failures = @($lines | Select-String "❌ Insufficient|❌ Quality rejected" | Measure-Object).Count
    
    Write-Host "Progress:"
    Write-Host "  Successful: $successes"
    Write-Host "  Failed/Rejected: $failures"
    Write-Host ""
    
    # Show last few lines
    Write-Host "Recent activity:" -ForegroundColor Yellow
    $lines | Select-Object -Last 15 | ForEach-Object {
        if ($_ -match "✅ Saved:") {
            Write-Host $_ -ForegroundColor Green
        } elseif ($_ -match "❌") {
            Write-Host $_ -ForegroundColor Red
        } elseif ($_ -match "Processing:") {
            Write-Host $_ -ForegroundColor Blue
        } else {
            Write-Host $_
        }
    }
    
    Write-Host ""
    Write-Host "Last updated: $(Get-Date)" -ForegroundColor Gray
    Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Gray
    
    Start-Sleep -Seconds 10
}
