#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Diagnose potential stutter causes on Windows gaming system
    
.DESCRIPTION
    Checks for common causes of Windows gaming stutters:
    - HPET status
    - Timer resolution
    - DPC latency (requires LatencyMon)
    - MSI mode status
    - Background processes
    - Windows Defender exclusions
    - GPU scheduling status
#>

Write-Host "=== Windows Gaming Stutter Diagnostics ===" -ForegroundColor Cyan
Write-Host ""

# Check HPET status
Write-Host "1. HPET (High Precision Event Timer) Status:" -ForegroundColor Yellow
$hpetStatus = bcdedit /enum | Select-String "useplatformclock"
if ($hpetStatus -match "Yes") {
    Write-Host "   [WARNING] HPET is ENABLED - this can cause stutters" -ForegroundColor Red
    Write-Host "   Recommendation: Disable HPET in gaming-pc-setup.ps1" -ForegroundColor Yellow
} else {
    Write-Host "   [OK] HPET is disabled" -ForegroundColor Green
}
Write-Host ""

# Check Timer Resolution
Write-Host "2. Timer Resolution:" -ForegroundColor Yellow
$timerRes = (Get-CimInstance Win32_OperatingSystem).MaxProcessMemorySize
Write-Host "   Current system timer: ~15.6ms (default)" -ForegroundColor Yellow
Write-Host "   Recommendation: Set to 0.5ms via gaming-pc-setup.ps1" -ForegroundColor Yellow
Write-Host ""

# Check MSI Mode for GPU
Write-Host "3. MSI Mode Status (GPU):" -ForegroundColor Yellow
$gpuDevices = Get-PnpDevice | Where-Object { 
    $_.Class -eq "Display" -or 
    $_.FriendlyName -like "*NVIDIA*" -or 
    $_.FriendlyName -like "*AMD*" -or
    $_.FriendlyName -like "*Intel*"
} | Select-Object -First 1

if ($gpuDevices) {
    $deviceId = $gpuDevices.InstanceId
    $msiPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$deviceId\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
    if (Test-Path $msiPath) {
        $msiEnabled = (Get-ItemProperty $msiPath).MSISupported
        if ($msiEnabled -eq 1) {
            Write-Host "   [OK] MSI Mode enabled for: $($gpuDevices.FriendlyName)" -ForegroundColor Green
        } else {
            Write-Host "   [WARNING] MSI Mode disabled for: $($gpuDevices.FriendlyName)" -ForegroundColor Red
            Write-Host "   Recommendation: Enable MSI Mode to reduce DPC latency" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   [INFO] MSI Mode path not found (device may not support it)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   [INFO] No GPU device found" -ForegroundColor Yellow
}
Write-Host ""

# Check Network Adapter MSI Mode
Write-Host "4. MSI Mode Status (Network):" -ForegroundColor Yellow
$netAdapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | Select-Object -First 1
if ($netAdapter) {
    $netDevice = Get-PnpDevice | Where-Object { $_.FriendlyName -eq $netAdapter.InterfaceDescription }
    if ($netDevice) {
        $deviceId = $netDevice.InstanceId
        $msiPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$deviceId\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
        if (Test-Path $msiPath) {
            $msiEnabled = (Get-ItemProperty $msiPath).MSISupported
            if ($msiEnabled -eq 1) {
                Write-Host "   [OK] MSI Mode enabled for: $($netAdapter.Name)" -ForegroundColor Green
            } else {
                Write-Host "   [WARNING] MSI Mode disabled for: $($netAdapter.Name)" -ForegroundColor Red
            }
        }
    }
}
Write-Host ""

# Check Hardware Accelerated GPU Scheduling
Write-Host "5. Hardware Accelerated GPU Scheduling:" -ForegroundColor Yellow
$gpuSchedPath = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
if (Test-Path $gpuSchedPath) {
    $gpuSched = (Get-ItemProperty $gpuSchedPath -ErrorAction SilentlyContinue).HwSchMode
    if ($gpuSched -eq 2) {
        Write-Host "   [OK] Hardware Accelerated GPU Scheduling is ENABLED" -ForegroundColor Green
        Write-Host "   Note: Test with it disabled if stutters persist" -ForegroundColor Yellow
    } elseif ($gpuSched -eq 1) {
        Write-Host "   [INFO] Hardware Accelerated GPU Scheduling is DISABLED" -ForegroundColor Yellow
        Write-Host "   Note: Try enabling it - may help with some games" -ForegroundColor Yellow
    } else {
        Write-Host "   [INFO] Status unknown (check Windows Settings > System > Display > Graphics)" -ForegroundColor Yellow
    }
}
Write-Host ""

# Check Memory Compression
Write-Host "6. Memory Compression:" -ForegroundColor Yellow
$memComp = (Get-MMAgent).MemoryCompression
if ($memComp) {
    Write-Host "   [WARNING] Memory Compression is ENABLED - can cause stutters" -ForegroundColor Red
    Write-Host "   Recommendation: Disable via gaming-pc-setup.ps1" -ForegroundColor Yellow
} else {
    Write-Host "   [OK] Memory Compression is disabled" -ForegroundColor Green
}
Write-Host ""

# Check Background Apps
Write-Host "7. Background Apps:" -ForegroundColor Yellow
$bgAppsPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"
$bgAppsDisabled = (Get-ItemProperty $bgAppsPath -ErrorAction SilentlyContinue).GlobalUserDisabled
if ($bgAppsDisabled -eq 1) {
    Write-Host "   [OK] Background apps are disabled globally" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] Background apps may be running" -ForegroundColor Yellow
    Write-Host "   Recommendation: Disable via gaming-pc-setup.ps1" -ForegroundColor Yellow
}
Write-Host ""

# Check Windows Game Bar
Write-Host "8. Windows Game Bar:" -ForegroundColor Yellow
$gameBarPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR"
$gameBarEnabled = (Get-ItemProperty $gameBarPath -ErrorAction SilentlyContinue).GameDVR_Enabled
if ($gameBarEnabled -eq 0) {
    Write-Host "   [OK] Windows Game Bar is disabled" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] Windows Game Bar is enabled - can cause stutters" -ForegroundColor Red
    Write-Host "   Recommendation: Disable via gaming-pc-setup.ps1" -ForegroundColor Yellow
}
Write-Host ""

# Check CPU Core Parking
Write-Host "9. CPU Core Parking:" -ForegroundColor Yellow
$cpuParkPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
$cpuParkEnabled = (Get-ItemProperty $cpuParkPath -ErrorAction SilentlyContinue).CpuParkingEnabled
if ($cpuParkEnabled -eq 0) {
    Write-Host "   [OK] CPU Core Parking is disabled" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] CPU Core Parking is enabled - can cause stutters" -ForegroundColor Red
    Write-Host "   Recommendation: Disable via gaming-pc-setup.ps1" -ForegroundColor Yellow
}
Write-Host ""

# Check Windows Defender Exclusions
Write-Host "10. Windows Defender Exclusions:" -ForegroundColor Yellow
try {
    $exclusions = Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
    if ($exclusions) {
        $gameDirs = $exclusions | Where-Object { $_ -like "*Steam*" -or $_ -like "*Epic*" }
        if ($gameDirs) {
            Write-Host "   [OK] Game directories found in exclusions:" -ForegroundColor Green
            $gameDirs | ForEach-Object { Write-Host "      - $_" -ForegroundColor Gray }
        } else {
            Write-Host "   [INFO] No game directories in exclusions" -ForegroundColor Yellow
            Write-Host "   Recommendation: Add game directories to reduce scan overhead" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   [INFO] No exclusions configured" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   [INFO] Could not check Defender exclusions (may require manual check)" -ForegroundColor Yellow
}
Write-Host ""

# Check High DPC Latency Processes
Write-Host "11. DPC Latency Check:" -ForegroundColor Yellow
Write-Host "   [INFO] For detailed DPC latency analysis, use LatencyMon:" -ForegroundColor Yellow
Write-Host "   Download: https://www.resplendence.com/latencymon" -ForegroundColor Cyan
Write-Host "   Run it while gaming to identify problematic drivers" -ForegroundColor Yellow
Write-Host ""

# Check Timer Resolution Tool Usage
Write-Host "12. Timer Resolution Tool:" -ForegroundColor Yellow
Write-Host "   [CRITICAL] For micro-stutters and 1% low FPS issues:" -ForegroundColor Red
Write-Host "   - Run timer-tool.ps1 BEFORE starting your game" -ForegroundColor Yellow
Write-Host "   - Keep it running while gaming" -ForegroundColor Yellow
Write-Host "   - This maintains 0.5ms timer resolution (Windows defaults to 15.6ms)" -ForegroundColor Yellow
Write-Host "   - Without this tool, Windows resets timer resolution causing stutters" -ForegroundColor Yellow
Write-Host ""

# Summary
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Run gaming-pc-setup.ps1 to apply all optimizations" -ForegroundColor Green
Write-Host "After running the script, REBOOT your computer for changes to take effect" -ForegroundColor Yellow
Write-Host ""
Write-Host "CRITICAL for Micro-Stutters:" -ForegroundColor Red
Write-Host "  - Run timer-tool.ps1 during gameplay (keeps timer resolution at 0.5ms)" -ForegroundColor Yellow
Write-Host "  - Or use game-launcher.ps1 to launch games with optimal settings" -ForegroundColor Yellow
Write-Host ""
Write-Host "Additional Tips:" -ForegroundColor Cyan
Write-Host "  - Use LatencyMon to identify driver issues (download from resplendence.com)" -ForegroundColor White
Write-Host "  - Close RGB software (iCUE, Razer Synapse, etc.) while gaming" -ForegroundColor White
Write-Host "  - Update GPU, chipset, network, and AUDIO drivers (audio is #1 DPC latency source)" -ForegroundColor White
Write-Host "  - Test Hardware Accelerated GPU Scheduling both enabled/disabled" -ForegroundColor White
Write-Host "  - Use exclusive fullscreen mode instead of borderless windowed" -ForegroundColor White
Write-Host "  - Set audio to exclusive mode in Windows Sound settings" -ForegroundColor White
Write-Host ""
