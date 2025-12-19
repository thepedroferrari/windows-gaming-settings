#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Quick setup script for Windows X-Lite gaming optimization
    
.DESCRIPTION
    Streamlined setup for Windows X-Lite builds.
    Checks for X-Lite, runs gaming optimizations, and provides post-install checklist.
#>

Write-Host "=== Windows X-Lite Gaming Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if running on X-Lite
function Test-XLiteBuild {
    $indicators = 0
    
    # Check Defender
    try {
        $defenderStatus = Get-MpComputerStatus -ErrorAction SilentlyContinue
        if (-not $defenderStatus) { $indicators++ }
    } catch {
        $indicators++
    }
    
    # Check UAC
    $uacStatus = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -ErrorAction SilentlyContinue).EnableLUA
    if ($uacStatus -eq 0) { $indicators++ }
    
    # Check UWP apps count
    $uwpApps = Get-AppxPackage -ErrorAction SilentlyContinue | Measure-Object
    if ($uwpApps.Count -lt 10) { $indicators++ }
    
    return $indicators -ge 2
}

$isXLite = Test-XLiteBuild

if ($isXLite) {
    Write-Host "[✓] Windows X-Lite build detected!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "[!] X-Lite not detected, but script will still work" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "This script will:" -ForegroundColor Cyan
Write-Host "  1. Run gaming-pc-setup.ps1 (gaming optimizations)" -ForegroundColor White
Write-Host "  2. Show post-installation checklist" -ForegroundColor White
Write-Host "  3. Provide next steps" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Continue? (Y/N)"
if ($confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "=== Step 1: Running Gaming PC Setup ===" -ForegroundColor Cyan
Write-Host ""

# Run main gaming setup script
if (Test-Path ".\gaming-pc-setup.ps1") {
    & ".\gaming-pc-setup.ps1" -SkipConfirmations
} else {
    Write-Host "Error: gaming-pc-setup.ps1 not found in current directory" -ForegroundColor Red
    Write-Host "Please ensure all scripts are in the same folder" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""

Write-Host "POST-INSTALLATION CHECKLIST:" -ForegroundColor Cyan
Write-Host ""
Write-Host "[ ] 1. REBOOT your computer (required for HPET and MSI Mode)" -ForegroundColor Yellow
Write-Host ""
Write-Host "[ ] 2. Install essential drivers from Windows X-Lite Software Page:" -ForegroundColor Yellow
Write-Host "     - DirectX 9 Runtime" -ForegroundColor White
Write-Host "     - Visual C++ Runtimes (all versions)" -ForegroundColor White
Write-Host "     - AMD Chipset Drivers (if AMD Ryzen)" -ForegroundColor White
Write-Host "     Link: https://windowsxlite.com/software/" -ForegroundColor Cyan
Write-Host ""
Write-Host "[ ] 3. Before gaming, run timer tool:" -ForegroundColor Yellow
Write-Host "     .\timer-tool.ps1 -GameProcess `"cs2`"" -ForegroundColor White
Write-Host "     (Keep it running while gaming - CRITICAL for micro-stutters)" -ForegroundColor White
Write-Host ""
Write-Host "[ ] 4. Configure NVIDIA Control Panel (if NVIDIA GPU):" -ForegroundColor Yellow
Write-Host "     - Power: Maximum Performance" -ForegroundColor White
Write-Host "     - Low Latency: Ultra" -ForegroundColor White
Write-Host "     - V-Sync: Off (or Fast for G-Sync)" -ForegroundColor White
Write-Host ""
Write-Host "[ ] 5. Set audio to exclusive mode (Settings > Sound)" -ForegroundColor Yellow
Write-Host ""
Write-Host "[ ] 6. Add game directories to Defender exclusions (if Defender enabled)" -ForegroundColor Yellow
Write-Host ""

Write-Host "=== Quick Reference ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Timer Tool (run before gaming):" -ForegroundColor Yellow
Write-Host "  .\timer-tool.ps1 -GameProcess `"yourgame`"" -ForegroundColor White
Write-Host ""
Write-Host "Diagnose stutters:" -ForegroundColor Yellow
Write-Host "  .\diagnose-stutters.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Launch game with optimizations:" -ForegroundColor Yellow
Write-Host "  .\game-launcher.ps1 -GamePath `"path\to\game.exe`" -GameProcess `"game`"" -ForegroundColor White
Write-Host ""

Write-Host "For detailed X-Lite setup guide, see: xlite-post-install.md" -ForegroundColor Cyan
Write-Host ""

$reboot = Read-Host "Reboot now? (Y/N)"
if ($reboot -eq "Y") {
    Write-Host "Rebooting in 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    Restart-Computer
} else {
    Write-Host "Remember to reboot before gaming!" -ForegroundColor Yellow
}
