<#
.SYNOPSIS
    AMD Ryzen X3D-specific optimizations and validation.
.DESCRIPTION
    Applies CPPC registry configuration and Game Bar settings that help Windows
    schedule threads correctly on Ryzen X3D CPUs. Includes chipset driver checks
    and rollback helpers.
.NOTES
    Requires Administrator. Intended only for supported X3D CPUs.
#>
#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global



function Test-X3DCpu {
    <#
    .SYNOPSIS
        Detects whether the system CPU is a Ryzen X3D model.
    .DESCRIPTION
        Queries Win32_Processor and checks against known X3D model substrings.
    .OUTPUTS
        [bool] True if an X3D CPU is detected, else false.
    #>
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


function Test-AMDChipsetDrivers {
    <#
    .SYNOPSIS
        Verifies AMD chipset driver components required for X3D scheduling.
    .DESCRIPTION
        Checks for the 3D V-Cache Performance Optimizer and the PPM provisioning
        driver using PnP device queries.
    .OUTPUTS
        [bool] True when required components are present.
    #>
    try {
        Write-Log "Checking for AMD Chipset Drivers (required for X3D)..." "INFO"

        $vCacheOptimizer = Get-PnpDevice -FriendlyName "*3D V-Cache*" -ErrorAction SilentlyContinue

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


function Test-X3DOptimizations {
    <#
    .SYNOPSIS
        Verifies that X3D-related registry settings are applied.
    .DESCRIPTION
        Ensures CPPC is enabled, HeteroPolicy overrides are removed, and Game Bar
        overlay settings are disabled for lower overhead.
    .OUTPUTS
        [bool] True if all checks pass, else false.
    #>
    $allPassed = $true

    Write-Log "Verifying AMD X3D optimizations..." "INFO"

    if (-not (Test-AMDChipsetDrivers)) {
        Write-Log "WARNING: AMD Chipset Drivers not detected - X3D optimizations may not work!" "ERROR"
    }

    $cppcValue = Get-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "CppcEnable"
    if ($cppcValue -eq 1) {
        Write-Log "✓ CPPC is ENABLED (correct)" "SUCCESS"
    } else {
        Write-Log "✗ CPPC is not enabled correctly (current value: $cppcValue, expected: 1)" "ERROR"
        $allPassed = $false
    }

    $heteroExists = Test-RegistryValueExists -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "HeteroPolicy"
    if (-not $heteroExists) {
        Write-Log "✓ HeteroPolicy removed (correct)" "SUCCESS"
    } else {
        Write-Log "✗ HeteroPolicy still exists (should be removed)" "ERROR"
        $allPassed = $false
    }

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




function Enable-CPPCOptimization {
    <#
    .SYNOPSIS
        Enables CPPC registry settings for X3D scheduling.
    .DESCRIPTION
        Sets CppcEnable and removes HeteroPolicy overrides that conflict with
        AMD X3D scheduling.
    .OUTPUTS
        None.
    .NOTES
        Backs up the parent registry key before modification.
    #>
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"

    Backup-RegistryKey -Path $regPath

    try {
        Set-RegistryValue -Path $regPath -Name "CppcEnable" -Value 1 -Type "DWORD"
        Write-Log "AMD X3D: ENABLED CPPC for proper CCD thread steering" "SUCCESS"

        if (Test-RegistryValueExists -Path $regPath -Name "HeteroPolicy") {
            Remove-RegistryValue -Path $regPath -Name "HeteroPolicy"
            Write-Log "AMD X3D: Removed HeteroPolicy registry hack (not needed for AMD)" "SUCCESS"
        }

    } catch {
        Write-Log "Error configuring CPPC: $_" "ERROR"
        throw
    }
}


function Set-GameBarConfiguration {
    <#
    .SYNOPSIS
        Disables Game Bar overlays while keeping scheduler hints.
    .DESCRIPTION
        Disables GameDVR capture settings to reduce overhead, but keeps Game Bar
        detection enabled so the OS can apply gaming heuristics.
    .OUTPUTS
        None.
    #>
    try {
        $gameBarPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR"

        Backup-RegistryKey -Path $gameBarPath

        Set-RegistryValue -Path $gameBarPath -Name "AppCaptureEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $gameBarPath -Name "GameDVR_Enabled" -Value 0 -Type "DWORD"
        Write-Log "AMD X3D: Disabled Game Bar overlays and recording" "SUCCESS"

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




function Invoke-X3DOptimizations {
    <#
    .SYNOPSIS
        Applies all AMD X3D optimizations.
    .DESCRIPTION
        Confirms the CPU is X3D, warns if chipset drivers are missing, then
        enables CPPC optimizations and configures Game Bar settings.
    .OUTPUTS
        None.
    #>
    if (-not (Test-X3DCpu)) {
        Write-Log "No AMD X3D CPU detected - skipping X3D optimizations" "INFO"
        return
    }

    Write-Log "Applying AMD Ryzen X3D optimizations..." "INFO"

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
        Enable-CPPCOptimization

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


function Undo-X3DOptimizations {
    <#
    .SYNOPSIS
        Reverts X3D-specific registry changes.
    .DESCRIPTION
        Restores backed up registry values for CPPC and Game Bar settings.
    .OUTPUTS
        None.
    #>
    Write-Log "Rolling back AMD X3D optimizations..." "INFO"

    try {
        $powerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
        if (Restore-RegistryKey -Path $powerPath) {
            Write-Log "Restored CPPC/power registry settings" "SUCCESS"
        }

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


Export-ModuleMember -Function @(
    'Test-X3DCpu',
    'Test-AMDChipsetDrivers',
    'Enable-CPPCOptimization',
    'Set-GameBarConfiguration',
    'Test-X3DOptimizations',
    'Invoke-X3DOptimizations',
    'Undo-X3DOptimizations'
)
