$exePath = Resolve-Path "release\win-unpacked\VOOC Store.exe"
Write-Output "Testing executable at: $exePath"

$p = Start-Process -FilePath $exePath -PassThru
Start-Sleep -Seconds 3

$runningProc = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
if ($runningProc) {
    Write-Output "SUCCESS: VOOC Store packaged executable is running with PID $($p.Id)"
    Stop-Process -Id $p.Id -Force
    Write-Output "Terminated test instance cleanly."
} else {
    Write-Output "FAILED: Process did not stay alive."
}

# Verify installer existence and size
$installerPath = Resolve-Path "release\VOOC-Store-Setup-1.0.0.exe"
$portablePath = Resolve-Path "release\VOOC-Store-Portable-1.0.0.exe"

$installerItem = Get-Item $installerPath
$portableItem = Get-Item $portablePath

Write-Output "Installer: $($installerItem.FullName) (Size: $([math]::Round($installerItem.Length / 1MB, 2)) MB)"
Write-Output "Portable:  $($portableItem.FullName) (Size: $([math]::Round($portableItem.Length / 1MB, 2)) MB)"
