#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Gaming PC Setup - Modular Windows Optimization Script
.DESCRIPTION
    Evidence-based Windows optimizations for gaming performance, organized into
    modular components with full reversibility.

    Behavior notes:
    - AMD X3D: CPPC enabled (required for AMD 3D V-Cache optimizer)
    - Core Parking: Enabled by default (X3D benefits from C-states)
    - HPET: Opt-in only (limited benefit on Win11)
    - Page File: 4GB for 32GB+ RAM, 8GB for 16GB RAM
.PARAMETER DryRun
    Preview optimizations without applying changes
.PARAMETER ConfigFile
    Load configuration from JSON file
.PARAMETER Profile
    Load pre-made profile (competitive, balanced, privacy-focused)
.NOTES
    Author: @thepedroferrari
    Date: 2025-12-20
    Repository: https://github.com/thepedroferrari/gaming-pc-setup
#>

param(
    [switch]$DryRun,
    [string]$ConfigFile,
    [string]$Profile
)

#region Script Initialization

# Get script directory (works even if run from different location)
$ScriptRoot = $PSScriptRoot
if (-not $ScriptRoot) {
    $ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}

Write-Host ""
Write-Host "=== Gaming PC Setup (Modular) ===" -ForegroundColor Cyan
Write-Host "Evidence-based Windows optimizations for gaming" -ForegroundColor Yellow
Write-Host ""

if ($DryRun) {
    Write-Host "DRY RUN MODE: No changes will be applied" -ForegroundColor Yellow
    Write-Host ""
}

#endregion

#region Module Import

Write-Host "Loading modules..." -ForegroundColor Cyan

# Import core modules
Import-Module (Join-Path $ScriptRoot "modules\core\logger.psm1") -Force -Global
Import-Module (Join-Path $ScriptRoot "modules\core\registry.psm1") -Force -Global
Import-Module (Join-Path $ScriptRoot "modules\core\config.psm1") -Force -Global
Import-Module (Join-Path $ScriptRoot "modules\core\menu.psm1") -Force -Global

# Import optimization modules
Import-Module (Join-Path $ScriptRoot "modules\optimizations\system.psm1") -Force -Global
Import-Module (Join-Path $ScriptRoot "modules\optimizations\amd-x3d.psm1") -Force -Global
Import-Module (Join-Path $ScriptRoot "modules\optimizations\performance.psm1") -Force -Global
Import-Module (Join-Path $ScriptRoot "modules\optimizations\power.psm1") -Force -Global
Import-Module (Join-Path $ScriptRoot "modules\optimizations\network.psm1") -Force -Global
Import-Module (Join-Path $ScriptRoot "modules\optimizations\audio.psm1") -Force -Global
Import-Module (Join-Path $ScriptRoot "modules\optimizations\privacy.psm1") -Force -Global
Import-Module (Join-Path $ScriptRoot "modules\optimizations\gpu.psm1") -Force -Global
Import-Module (Join-Path $ScriptRoot "modules\software\installer.psm1") -Force -Global

Write-Host "All modules loaded successfully" -ForegroundColor Green
Write-Host ""

#endregion

#region Logger Initialization

$logPath = Join-Path $ScriptRoot "gaming-pc-setup.log"
Initialize-Logger -LogPath $logPath -ClearExisting $true

Write-Log "=== Gaming PC Setup Started ===" "SUCCESS"
Write-Log "Script root: $ScriptRoot" "INFO"
Write-Log "Dry run: $DryRun" "INFO"

#endregion

#region System Information

function Get-SystemInfo {
    $cpu = (Get-CimInstance Win32_Processor).Name
    $totalRAM = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB)
    $gpu = (Get-CimInstance Win32_VideoController | Select-Object -First 1).Name
    $os = (Get-CimInstance Win32_OperatingSystem).Caption
    $build = (Get-CimInstance Win32_OperatingSystem).BuildNumber

    return @{
        CPU = $cpu
        RAM = "${totalRAM}GB"
        GPU = $gpu
        OS = $os
        Build = $build
    }
}

$sysInfo = Get-SystemInfo

Write-Host "System Information:" -ForegroundColor Cyan
Write-Host "  CPU:   $($sysInfo.CPU)" -ForegroundColor White
Write-Host "  RAM:   $($sysInfo.RAM)" -ForegroundColor White
Write-Host "  GPU:   $($sysInfo.GPU)" -ForegroundColor White
Write-Host "  OS:    $($sysInfo.OS) (Build $($sysInfo.Build))" -ForegroundColor White
Write-Host ""

Write-Log "System: $($sysInfo.CPU) | $($sysInfo.RAM) | $($sysInfo.GPU)" "INFO"

#endregion

#region Optimization Sections

# Define optimization sections with weights (for progress tracking)
$sections = @(
    @{
        Name = "AMD X3D Optimizations"
        Function = "Invoke-X3DOptimizations"
        TestFunction = "Test-X3DOptimizations"
        Condition = { Test-X3DCpu }
        Weight = 5
        Description = "CPPC enabled, Game Bar detection enabled, overlays disabled"
    },
    @{
        Name = "System Optimizations"
        Function = "Invoke-SystemOptimizations"
        TestFunction = "Test-SystemOptimizations"
        Condition = $null
        Weight = 10
        Description = "Page file (4GB/8GB), fast startup disabled, Explorer speedups, disk cleanup, temp purge, safe service trim, Razer block"
    },
    @{
        Name = "Performance Optimizations"
        Function = "Invoke-PerformanceOptimizations"
        TestFunction = "Test-PerformanceOptimizations"
        Condition = $null
        Weight = 15
        Description = "GameDVR/FSO off, MSI mode, scheduler, timer resolution, MMCSS gaming tweaks, Game Mode"
    },
    @{
        Name = "Power Optimizations"
        Function = "Invoke-PowerOptimizations"
        TestFunction = "Test-PowerOptimizations"
        Condition = $null
        Weight = 10
        Description = "High performance plan, PCIe/USB power mgmt, 5% min processor state"
    },
    @{
        Name = "Network Optimizations"
        Function = "Invoke-NetworkOptimizations"
        TestFunction = "Test-NetworkOptimizations"
        Condition = $null
        Weight = 10
        Description = "DNS provider, RSS enabled, IPv4 prefer/Teredo toggle, QoS opt-in"
    },
    @{
        Name = "Audio Optimizations"
        Function = "Invoke-AudioOptimizations"
        TestFunction = "Test-AudioOptimizations"
        Condition = $null
        Weight = 10
        Description = "Audio enhancements disabled, driver power mgmt disabled"
    },
    @{
        Name = "GPU Optimizations"
        Function = "Invoke-GPUOptimizations"
        TestFunction = "Test-GPUOptimizations"
        Condition = $null
        Weight = 10
        Description = "HAGS disabled (opt-in), vendor-specific tweaks"
    },
    @{
        Name = "Privacy Optimizations"
        Function = "Invoke-PrivacyOptimizations"
        TestFunction = "Test-PrivacyOptimizations"
        Condition = $null
        Weight = 15
        Description = "Tiered telemetry, background apps off, Edge debloat, Copilot disable, optional bloat/Xbox removal"
    },
    @{
        Name = "Software Installation"
        Function = "Invoke-SoftwareInstallation"
        TestFunction = $null
        Condition = $null
        Weight = 15
        Description = "Essential + recommended packages, peripheral software"
    }
)

# Calculate total weight for progress tracking
$totalWeight = 0
foreach ($section in $sections) {
    $totalWeight += $section.Weight
}
$completedWeight = 0

#endregion

#region User Confirmation

Write-Host "The following optimizations will be applied:" -ForegroundColor Yellow
Write-Host ""

foreach ($section in $sections) {
    # Check condition (if any)
    if ($section.Condition) {
        if (-not (& $section.Condition)) {
            Write-Host "  [SKIP] $($section.Name) (condition not met)" -ForegroundColor Gray
            continue
        }
    }

    Write-Host "  [X] $($section.Name)" -ForegroundColor Green
    Write-Host "      $($section.Description)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "SmartScreen and Windows Update remain ENABLED (security)" -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun) {
    $confirm = Read-Host "Apply these optimizations? (Y/N)"
    if ($confirm -ne "Y") {
        Write-Log "User cancelled script" "INFO"
        Write-Host "Script cancelled by user" -ForegroundColor Yellow
        exit 0
    }
}

Write-Host ""
Write-Host "Starting optimizations..." -ForegroundColor Cyan
Write-Host ""

#endregion

#region Execute Optimizations

foreach ($section in $sections) {
    # Check condition (if any)
    if ($section.Condition) {
        if (-not (& $section.Condition)) {
            Write-Log "Skipping $($section.Name) (condition not met)" "INFO"
            continue
        }
    }

    # Calculate progress percentage
    $progressPercent = [int](($completedWeight / $totalWeight) * 100)
    Write-Progress -Activity "Gaming PC Setup" -Status $section.Name -PercentComplete $progressPercent

    Write-Log "=== $($section.Name) ===" "INFO"
    Write-Host "[$progressPercent%] $($section.Name)..." -ForegroundColor Cyan

    try {
        if ($DryRun) {
            Write-Log "DRY RUN: Would execute $($section.Function)" "INFO"
            Write-Host "  DRY RUN: Would apply optimizations" -ForegroundColor Yellow
        } else {
            # Execute optimization function
            & $section.Function

            # Verify if test function exists
            if ($section.TestFunction) {
                Write-Log "Verifying $($section.Name)..." "INFO"
                $testResult = & $section.TestFunction
                if ($testResult) {
                    Write-Log "$($section.Name) verification: PASSED" "SUCCESS"
                } else {
                    Write-Log "$($section.Name) verification: FAILED (review above logs)" "ERROR"
                }
            }
        }

        $completedWeight += $section.Weight

    } catch {
        Write-Log "Error in $($section.Name): $_" "ERROR"
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
}

Write-Progress -Activity "Gaming PC Setup" -Completed

#endregion

#region Post-Setup Checklist

if (-not $DryRun) {
    # Create post-setup checklist
    $checklistPath = Join-Path $ScriptRoot "POST-SETUP-CHECKLIST.txt"

    $checklistContent = @"
================================================================================
    GAMING PC SETUP - POST-INSTALLATION CHECKLIST
================================================================================

Completed: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
System: $($sysInfo.CPU) | $($sysInfo.RAM) | $($sysInfo.GPU)

================================================================================
    REBOOT REQUIRED
================================================================================

[X] REBOOT YOUR SYSTEM NOW
    - HPET, MSI Mode, and power changes require a restart
    - Page file changes require a restart

================================================================================
    BEFORE GAMING - TIMER TOOL
================================================================================

[X] Run timer-tool.ps1 BEFORE starting any game

    Command:
    .\timer-tool.ps1

    OR (auto-exit when game closes):
    .\timer-tool.ps1 -GameProcess "dota2"
    .\timer-tool.ps1 -GameProcess "cs2"

    What it does:
    - Sets Windows timer resolution to 0.5ms (from 15.6ms default)
    - Eliminates micro-stutters and improves frame pacing
    - MUST be running during gameplay
    - Press Ctrl+C when done gaming

================================================================================
    GPU DRIVER SETTINGS (MANUAL CONFIGURATION)
================================================================================

NVIDIA Control Panel (if you have NVIDIA GPU):
--------------------------------------------
1. Open NVIDIA Control Panel
2. Manage 3D Settings > Global Settings:
   [X] Power management mode: Prefer maximum performance
   [X] Low latency mode: Ultra (or On)
   [X] Vertical sync: Off (or Fast if you have G-Sync)
   [X] Texture filtering - Quality: High performance
   [X] Shader Cache: On

AMD Radeon Software (if you have AMD GPU):
------------------------------------------
1. Open AMD Radeon Software
2. Gaming > Global Graphics:
   [X] Radeon Anti-Lag: On
   [X] Radeon Boost: On (if supported)
   [X] Wait for Vertical Refresh: Off
   [X] Texture Filtering Quality: Performance
   [X] Radeon Image Sharpening: 80% (optional)

================================================================================
    GAME-SPECIFIC LAUNCH OPTIONS
================================================================================

Steam Games:
-----------
Right-click game > Properties > General > Launch Options

Dota 2:
    -dx11 -high -nojoy -console +fps_max 0

CS2 (Counter-Strike 2):
    -high -freq 240 -refresh 240 +fps_max 0 -nojoy

Helldivers 2:
    -dx11 -high

General recommendations:
    -high           (High CPU priority)
    -nojoy          (Disable joystick support, reduces input latency)
    -freq 240       (Match your monitor refresh rate)
    +fps_max 0      (Unlimited FPS)

================================================================================
    SOFTWARE POST-CONFIGURATION
================================================================================

Spotify (if installed):
-----------------------
[X] Disable auto-start on boot:
    Settings > Show Advanced Settings > Startup and Window Behaviour
    > Open Spotify automatically after you log into the computer: OFF

[X] Set audio quality to "Very High":
    Settings > Audio Quality > Streaming quality: Very High

qBittorrent (if installed):
---------------------------
[X] Install search plugins:
    View > Search Engine > Search plugins...
    Install popular plugins (ThePirateBay, 1337x, etc.)

[X] Set download location:
    Tools > Options > Downloads > Default save path

Discord:
--------
[X] Disable hardware acceleration if you experience stutters:
    Settings > Advanced > Hardware Acceleration: OFF

[X] Reduce CPU usage:
    Settings > Voice & Video > Video Codec: H.264

Philips Hue Sync (if installed):
--------------------------------
[X] Close before gaming if you experience stutters
    RGB software can cause DPC latency issues

Logitech G HUB / Razer Synapse / Corsair iCUE:
----------------------------------------------
[X] Configure your devices, then close the software before gaming
    Peripheral software is a common source of DPC latency
    Settings are saved to device memory

================================================================================
    AMD RYZEN X3D USERS (7900X3D / 7950X3D / 9800X3D)
================================================================================

BIOS Settings:
------------------------
[X] CPPC (Collaborative Processor Performance Control): ENABLED or AUTO/DRIVER
    - DO NOT DISABLE (required for AMD 3D V-Cache Performance Optimizer)

[X] CPPC Preferred Cores: AUTO or DRIVER

[X] AGESA: Update to 1.0.0.7+ or latest

[X] EXPO/XMP: Enabled (for RAM)

Drivers:
--------
[X] Install latest AMD Chipset Drivers:
    https://www.amd.com/en/support

    Includes:
    - AMD 3D V-Cache Performance Optimizer
    - PPM Provisioning File Driver
    - Required for proper X3D thread steering

Verification:
-------------
[X] After reboot, verify in Device Manager:
    System Devices > Look for:
    - "AMD 3D V-Cache Performance Optimizer"
    - "AMD PPM Provisioning File Driver"

    If missing, reinstall AMD Chipset Drivers

================================================================================
    TROUBLESHOOTING
================================================================================

Still getting micro-stutters?
-----------------------------
1. [X] Download LatencyMon: https://www.resplendence.com/latencymon
   - Identifies drivers causing DPC latency
   - Run for 5 minutes while gaming

2. [X] Update audio drivers (most common DPC latency source)
   - Visit motherboard manufacturer website
   - Download latest audio drivers

3. [X] Close RGB software (iCUE, Razer Synapse, G HUB)
   - Major source of DPC latency

4. [X] Toggle GPU Scheduling:
   - Settings > System > Display > Graphics > Hardware-accelerated GPU scheduling
   - Try both ON and OFF, benchmark both

5. [X] Verify timer tool is running:
   - Must run timer-tool.ps1 before gaming

Network still laggy?
-------------------
1. [X] Update network adapter drivers
2. [X] Check router QoS settings
3. [X] Try different DNS (script set Cloudflare 1.1.1.1)
4. [X] Test with ethernet (not WiFi)

X3D performance inconsistent?
-----------------------------
1. [X] Verify CPPC is ENABLED in BIOS (not disabled)
2. [X] Install latest AMD Chipset Drivers
3. [X] Check Device Manager for 3D V-Cache optimizer driver
4. [X] Ensure Game Bar detection is enabled (script keeps it on)

================================================================================
    BENCHMARKING & VALIDATION
================================================================================

Before/After Testing:
--------------------
[X] Run benchmarks before and after optimizations:
    - 3DMark Time Spy
    - In-game benchmarks
    - Focus on 1% Low FPS (more important than average)

[X] Monitor frame times:
    - Use MSI Afterburner + RivaTuner Statistics Server
    - Look for frame time consistency (lower variance = smoother)

Performance Monitoring:
----------------------
[X] HWiNFO64: https://www.hwinfo.com/
    - Monitor CPU/GPU temps, clocks, power
    - Check for thermal throttling

[X] CapFrameX: https://www.capframex.com/
    - Advanced frame time analysis
    - 1% Low and 0.1% Low FPS tracking

================================================================================
    ADDITIONAL RESOURCES
================================================================================

Drivers:
--------
- AMD Chipset Drivers: https://www.amd.com/en/support
- NVIDIA Drivers: https://www.nvidia.com/Download/index.aspx
- Intel Drivers: https://www.intel.com/content/www/us/en/support.html

Tools:
------
- LatencyMon: https://www.resplendence.com/latencymon
- HWiNFO64: https://www.hwinfo.com/
- MSI Afterburner: https://www.msi.com/Landing/afterburner
- CapFrameX: https://www.capframex.com/

Support:
--------
- Log file: $logPath
- GitHub Issues: https://github.com/thepedroferrari/gaming-pc-setup/issues

================================================================================
    DONE! ENJOY YOUR OPTIMIZED GAMING PC
================================================================================

Remember:
1. REBOOT NOW
2. Run timer-tool.ps1 BEFORE gaming
3. Configure GPU driver settings manually

Happy gaming! 🎮

"@

    Set-Content -Path $checklistPath -Value $checklistContent -Encoding UTF8
    Write-Log "Post-setup checklist created: $checklistPath" "SUCCESS"

    # Open checklist in notepad
    Start-Process "notepad.exe" -ArgumentList $checklistPath
}

#endregion

#region Completion

Write-Host ""
Write-Host "=== Gaming PC Setup Complete ===" -ForegroundColor Green
Write-Host ""

if (-not $DryRun) {
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. REBOOT your system for changes to take effect" -ForegroundColor White
    Write-Host "  2. Run timer-tool.ps1 during gameplay for optimal timer resolution" -ForegroundColor White
    Write-Host "  3. Review POST-SETUP-CHECKLIST.txt (opening in notepad...)" -ForegroundColor White
    Write-Host ""
    Write-Host "Log file: $logPath" -ForegroundColor Cyan
    Write-Host ""

    $summary = Get-LogSummary
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  SUCCESS: $($summary.Success)" -ForegroundColor Green
    Write-Host "  ERROR:   $($summary.Error)" -ForegroundColor Red
    Write-Host "  INFO:    $($summary.Info)" -ForegroundColor Gray
    Write-Host ""

    Write-Log "=== Gaming PC Setup Complete ===" "SUCCESS"
    Write-Log "Summary: $($summary.Success) success, $($summary.Error) errors, $($summary.Info) info" "SUCCESS"
} else {
    Write-Host "DRY RUN complete. No changes were applied." -ForegroundColor Yellow
    Write-Host ""
}

#endregion
