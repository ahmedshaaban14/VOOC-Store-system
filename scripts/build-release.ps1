# Kill any running VOOC Store or electron processes
Get-Process | Where-Object { $_.Name -like "*VOOC*" -or $_.Name -like "*electron*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 1

# Clean release directory
if (Test-Path 'release') {
    Remove-Item -Recurse -Force 'release' -ErrorAction SilentlyContinue
}

# Run electron-builder
npx electron-builder --win --x64
