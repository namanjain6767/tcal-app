# PowerShell Script to Dump PostgreSQL Database
# Uses settings from the backend/.env file

# 1. Path to .env file
$envPath = Join-Path $PSScriptRoot "backend\.env"

if (-not (Test-Path $envPath)) {
    Write-Error ".env file not found at $envPath"
    exit
}

# 2. Extract DATABASE_URL
$dbUrl = Get-Content $envPath | Select-String "DATABASE_URL=" | ForEach-Object { $_.ToString().Split("=", 2)[1] }

if (-not $dbUrl) {
    Write-Error "DATABASE_URL not found in .env"
    exit
}

# 3. Create a timestamped filename
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dumpFile = "db_dump_$timestamp.dump"

Write-Host "Dumping database to $dumpFile..." -ForegroundColor Cyan

# 4. Run pg_dump
# We use the connection string directly. 
# Note: Ensure PostgreSQL bin directory is in your PATH.
try {
    & pg_dump --dbname=$dbUrl --file=$dumpFile -F c --clean --if-exists --no-owner --no-privileges
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Success! Database dumped to $dumpFile" -ForegroundColor Green
    } else {
        Write-Error "pg_dump failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Error "An error occurred while running pg_dump: $($_.Exception.Message)"
}
