# DisplayGrid — Windows hosts file setup
# Adds the displaygrid.test entry to C:\Windows\System32\drivers\etc\hosts
#
# Run this script as Administrator:
#   Right-click PowerShell → "Run as Administrator"
#   Then: .\scripts\add-hosts.ps1

$hostsFile = "C:\Windows\System32\drivers\etc\hosts"
$entry     = "127.0.0.1`tdisplaygrid.test`t# DisplayGrid local dev"

# Check if already present
if (Select-String -Path $hostsFile -Pattern "displaygrid\.test" -Quiet) {
  Write-Host "displaygrid.test is already in your hosts file." -ForegroundColor Yellow
  exit 0
}

# Check for admin rights
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
  Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
  Write-Host "Right-click PowerShell and choose 'Run as Administrator'." -ForegroundColor Red
  exit 1
}

Add-Content -Path $hostsFile -Value "`n$entry"
Write-Host "Done! displaygrid.test now points to 127.0.0.1" -ForegroundColor Green
Write-Host ""
Write-Host "You can now access:"
Write-Host "  Dashboard:      http://displaygrid.test:3000"
Write-Host "  Display client: http://displaygrid.test:5173"
Write-Host ""
Write-Host "Optional — for clean URLs without the port number, install Caddy"
Write-Host "and run: caddy run --config Caddyfile"
