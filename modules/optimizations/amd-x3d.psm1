#Requires -RunAsAdministrator

<#
.SYNOPSIS
    AMD Ryzen X3D CPU optimizations with CORRECT CPPC configuration
.DESCRIPTION
    Optimizations for AMD Ryzen 7900X3D/7950X3D CPUs with 3D V-Cache technology.

    This module ENABLES CPPC.
    AMD's 3D V-Cache Performance Optimizer driver REQUIRES CPPC enabled for proper
    CCD (Core Complex Die) thread steering.

.NOTES
    Author: @thepedroferrari
    Risk Level: TIER_1_LOW
    Reversible: Yes (via Undo-X3DOptimizations)
#>

# Import core modules
Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global

#region Detection Functions

<#
.SYNOPSIS
    Detect if system has an AMD Ryzen X3D CPU
.OUTPUTS
    [bool] True if X3D CPU detected, false otherwise
#>
function Test-X3DCpu {
    try {
        $cpuInfo = Get-CimInstance Win32_Processor -ErrorAction Stop
        $isX3D = $cpuInfo.Name -like "*7900X3D*" -or $cpuInfo.Name -like "*7950X3D*" -or
                 $cpuInfo.Name -like "*5800X3D*" -or $cpuInfo.Name -like "*5600X3D*" -or
                 $cpuInfo.Name -like "*9800X3D*" -or $cpuInfo.Name -like "*9900X3D*" -or
                 $cpuInfo.Name -like "*9950X3D*"

        if ($isX3D) {
            Write-Log "AMD Ryzen X3D CPU detected: $($cpuInfo.Name)" "INFO"
        }

        return $isX3D
    } catch {
        Write-Log "Error detecting CPU type: $_" "ERROR"
        return $false
    }
}

<#
.SYNOPSIS
    Check if AMD Chipset Drivers are installed
.DESCRIPTION
    Verifies that the AMD 3D V-Cache Performance Optimizer and PPM Provisioning
    File Driver are installed. These are required for proper X3D thread steering.
.OUTPUTS
    [bool] True if drivers detected, false otherwise
#>
function Test-AMDChipsetDrivers {
    try {
        Write-Log "Checking for AMD Chipset Drivers (required for X3D)..." "INFO"

        # Check for AMD 3D V-Cache Performance Optimizer
        $vCacheOptimizer = Get-PnpDevice -FriendlyName "*3D V-Cache*" -ErrorAction SilentlyContinue

        # Check for AMD Provisioning Packages (PPM driver)
        # Note: AMD calls this "AMD Provisioning Packages", not "PPM Provisioning"
        $ppmDriver = Get-PnpDevice -FriendlyName "*Provisioning Packages*" -ErrorAction SilentlyContinue

        if ($vCacheOptimizer -and $ppmDriver) {
            Write-Log "✓ AMD Chipset Drivers detected (3D V-Cache optimizer and Provisioning Packages)" "SUCCESS"
            return $true
        } elseif ($vCacheOptimizer) {
            Write-Log "⚠ AMD 3D V-Cache optimizer found, but Provisioning Packages driver missing" "ERROR"
            Write-Log "Install AMD Chipset Drivers: https://www.amd.com/en/support" "ERROR"
            return $false
        } elseif ($ppmDriver) {
            Write-Log "⚠ AMD Provisioning Packages driver found, but 3D V-Cache optimizer missing" "ERROR"
            Write-Log "Install AMD Chipset Drivers: https://www.amd.com/en/support" "ERROR"
            return $false
        } else {
            Write-Log "✗ AMD Chipset Drivers NOT DETECTED!" "ERROR"
            Write-Log "Install AMD Chipset Drivers from https://www.amd.com/en/support" "ERROR"
            Write-Log "Required for X3D thread steering - CPPC optimizations won't work without them!" "ERROR"
            return $false
        }
    } catch {
        Write-Log "Error checking AMD chipset drivers: $_" "ERROR"
        return $false
    }
}

<#
.SYNOPSIS
    Verify AMD X3D optimizations are applied correctly
.OUTPUTS
    [bool] True if all optimizations verified, false otherwise
#>
function Test-X3DOptimizations {
    $allPassed = $true

    Write-Log "Verifying AMD X3D optimizations..." "INFO"

    # Check 0: AMD Chipset Drivers
    if (-not (Test-AMDChipsetDrivers)) {
        Write-Log "WARNING: AMD Chipset Drivers not detected - X3D optimizations may not work!" "ERROR"
        # Don't fail verification, just warn
    }

    # Check 1: CPPC must be ENABLED (Value = 1)
    $cppcValue = Get-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "CppcEnable"
    if ($cppcValue -eq 1) {
        Write-Log "✓ CPPC is ENABLED (correct)" "SUCCESS"
    } else {
        Write-Log "✗ CPPC is not enabled correctly (current value: $cppcValue, expected: 1)" "ERROR"
        $allPassed = $false
    }

    # Check 2: HeteroPolicy should NOT exist (we remove it)
    $heteroExists = Test-RegistryValueExists -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "HeteroPolicy"
    if (-not $heteroExists) {
        Write-Log "✓ HeteroPolicy removed (correct)" "SUCCESS"
    } else {
        Write-Log "✗ HeteroPolicy still exists (should be removed)" "ERROR"
        $allPassed = $false
    }

    # Check 3: Game Bar detection should be enabled (GameDVR_Enabled = 0, but GameMode allowed)
    $gameDvrPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR"
    $appCaptureDisabled = (Get-RegistryValue -Path $gameDvrPath -Name "AppCaptureEnabled") -eq 0
    $gameDvrDisabled = (Get-RegistryValue -Path $gameDvrPath -Name "GameDVR_Enabled") -eq 0

    if ($appCaptureDisabled -and $gameDvrDisabled) {
        Write-Log "✓ Game Bar overlays disabled (correct)" "SUCCESS"
    } else {
        Write-Log "✗ Game Bar overlay configuration incorrect" "ERROR"
        $allPassed = $false
    }

    return $allPassed
}

#endregion

#region Apply Functions

<#
.SYNOPSIS
    Enable CPPC for AMD X3D CPUs
.DESCRIPTION
    Enables CPPC (Collaborative Processor Performance Control) which is REQUIRED
    for AMD's 3D V-Cache Performance Optimizer and PPM Provisioning File Driver
    to properly steer threads to the correct CCD.

    OLD BEHAVIOR (WRONG): Disabled CPPC (CppcEnable = 0)
    NEW BEHAVIOR (CORRECT): Enables CPPC (CppcEnable = 1)

    WEB_CONFIG: amd_x3d.cppc_enabled (boolean, default: true, locked: true)
    Description: "Enable CPPC for AMD X3D CPUs (REQUIRED for proper CCD steering)"
    Risk Level: TIER_0_SAFE
#>
function Enable-CPPCOptimization {
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"

    # Backup registry before changes
    Backup-RegistryKey -Path $regPath

    try {
        # ENABLE CPPC (not disable)
        Set-RegistryValue -Path $regPath -Name "CppcEnable" -Value 1 -Type "DWORD"
        Write-Log "AMD X3D: ENABLED CPPC for proper CCD thread steering" "SUCCESS"

        # Remove HeteroPolicy if it exists (old script set this to 0, interferes with scheduler)
        if (Test-RegistryValueExists -Path $regPath -Name "HeteroPolicy") {
            Remove-RegistryValue -Path $regPath -Name "HeteroPolicy"
            Write-Log "AMD X3D: Removed HeteroPolicy registry hack (not needed for AMD)" "SUCCESS"
        }

    } catch {
        Write-Log "Error configuring CPPC: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Configure Game Bar for X3D (keep detection, disable overlays)
.DESCRIPTION
    Keeps Game Bar game detection enabled (needed for X3D thread steering hints)
    but disables overlays and recording features that cause performance issues.

    OLD BEHAVIOR (WRONG): Completely disabled Game Bar
    NEW BEHAVIOR (CORRECT): Keep detection enabled, disable overlays only

    WEB_CONFIG: amd_x3d.game_bar_overlays_disabled (boolean, default: true)
    Description: "Disable Game Bar overlays while keeping game detection for X3D"
    Risk Level: TIER_1_LOW
#>
function Set-GameBarConfiguration {
    try {
        $gameBarPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR"

        # Backup registry before changes
        Backup-RegistryKey -Path $gameBarPath

        # Disable overlays and recording (performance impact)
        Set-RegistryValue -Path $gameBarPath -Name "AppCaptureEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $gameBarPath -Name "GameDVR_Enabled" -Value 0 -Type "DWORD"
        Write-Log "AMD X3D: Disabled Game Bar overlays and recording" "SUCCESS"

        # Additional Game DVR disable
        $gameConfigPath = "HKCU:\System\GameConfigStore"
        if (Test-Path $gameConfigPath) {
            Backup-RegistryKey -Path $gameConfigPath
            Set-RegistryValue -Path $gameConfigPath -Name "GameDVR_Enabled" -Value 0 -Type "DWORD"
        }

        Write-Log "AMD X3D: Game Bar detection remains enabled for scheduler hints" "INFO"

    } catch {
        Write-Log "Error configuring Game Bar: $_" "ERROR"
        throw
    }
}

#endregion

#region Main Functions

<#
.SYNOPSIS
    Apply all AMD X3D optimizations
.DESCRIPTION
    Main entry point for AMD Ryzen X3D CPU optimizations.
    Applies CPPC enablement and Game Bar configuration.

    Only runs if Test-X3DCpu returns true.
#>
function Invoke-X3DOptimizations {
    if (-not (Test-X3DCpu)) {
        Write-Log "No AMD X3D CPU detected - skipping X3D optimizations" "INFO"
        return
    }

    Write-Log "Applying AMD Ryzen X3D optimizations..." "INFO"

    # Check for AMD Chipset Drivers FIRST (warn user if missing)
    $chipsetDriversInstalled = Test-AMDChipsetDrivers
    if (-not $chipsetDriversInstalled) {
        Write-Host ""
        Write-Host "  ⚠️  WARNING: AMD Chipset Drivers NOT DETECTED!" -ForegroundColor Yellow
        Write-Host "  The CPPC optimizations will be applied, but they WON'T WORK without:" -ForegroundColor Yellow
        Write-Host "    - AMD 3D V-Cache Performance Optimizer" -ForegroundColor White
        Write-Host "    - AMD PPM Provisioning File Driver" -ForegroundColor White
        Write-Host ""
        Write-Host "  Download from: https://www.amd.com/en/support" -ForegroundColor Cyan
        Write-Host "  (Added to POST-SETUP-CHECKLIST.txt)" -ForegroundColor Gray
        Write-Host ""
    }

    try {
        # Enable CPPC
        Enable-CPPCOptimization

        # Configure Game Bar (keep detection, disable overlays)
        Set-GameBarConfiguration

        Write-Log "AMD X3D optimizations complete" "SUCCESS"

        if (-not $chipsetDriversInstalled) {
            Write-Log "Install AMD Chipset Drivers after reboot!" "ERROR"
            Write-Log "Download: https://www.amd.com/en/support" "ERROR"
        }

        Write-Log "BIOS: Set 'CPPC Preferred Cores' to AUTO or DRIVER (not DISABLED)" "INFO"

    } catch {
        Write-Log "Error applying X3D optimizations: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Rollback AMD X3D optimizations to defaults
.DESCRIPTION
    Restores registry keys to their backed-up state.

    Note: Windows defaults are:
    - CppcEnable: 1 (enabled) or not present
    - HeteroPolicy: not present
    - Game Bar: enabled with all features
#>
function Undo-X3DOptimizations {
    Write-Log "Rolling back AMD X3D optimizations..." "INFO"

    try {
        # Restore power settings
        $powerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
        if (Restore-RegistryKey -Path $powerPath) {
            Write-Log "Restored CPPC/power registry settings" "SUCCESS"
        }

        # Restore Game Bar settings
        $gameBarPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR"
        if (Restore-RegistryKey -Path $gameBarPath) {
            Write-Log "Restored Game Bar registry settings" "SUCCESS"
        }

        $gameConfigPath = "HKCU:\System\GameConfigStore"
        if (Test-Path $gameConfigPath) {
            Restore-RegistryKey -Path $gameConfigPath
        }

        Write-Log "AMD X3D optimization rollback complete" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}

#endregion

# Export functions
Export-ModuleMember -Function @(
    'Test-X3DCpu',
    'Test-AMDChipsetDrivers',
    'Enable-CPPCOptimization',
    'Set-GameBarConfiguration',
    'Test-X3DOptimizations',
    'Invoke-X3DOptimizations',
    'Undo-X3DOptimizations'
)
