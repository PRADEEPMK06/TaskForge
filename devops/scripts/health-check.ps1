$ErrorActionPreference = "Stop"

$Backend = $env:TASKFLOW_BACKEND_URL
if (-not $Backend) {
    $Backend = "http://localhost:8000"
}

$Frontend = $env:TASKFLOW_FRONTEND_URL
if (-not $Frontend) {
    $Frontend = "http://localhost:3000"
}

Write-Host "Checking backend: $Backend/health"
Invoke-RestMethod "$Backend/health" | ConvertTo-Json

Write-Host "Checking frontend: $Frontend/health"
Invoke-WebRequest "$Frontend/health" -UseBasicParsing | Select-Object StatusCode, StatusDescription

