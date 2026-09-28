# Run tests with credentials
# Usage: .\run-tests.ps1

$env:MAIL_BG_EMAIL = Read-Host "Enter your mail.bg email"
$env:MAIL_BG_PASSWORD = Read-Host "Enter your password"

Write-Host "`nRunning tests..." -ForegroundColor Cyan
npx playwright test
