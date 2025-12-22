#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Power plan optimizations for gaming
.DESCRIPTION
    Configures Windows power plans for maximum performance while maintaining
    thermal headroom for boost behavior.

    Safe optimizations:
    - High Performance / Ultimate Performance power plan
    - USB selective suspend disabled
    - PCIe Link State Power Management disabled
    - Hibernation disabled
.NOTES
    Author: @thepedroferrari
    Risk Level: TIER_1_LOW
    Reversible: Yes (via Undo-PowerOptimizations)
#>

# Import core modules
Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global

#region Detection Functions

<#
.SYNOPSIS
    Verify power optimizations are applied correctly
.OUTPUTS
    [bool] True if all optimizations verified, false otherwise
#>
function Test-PowerOptimizations {
    $allPassed = $true

    Write-Log "Verifying power optimizations..." "INFO"

    # Check active power plan
    $activePlan = powercfg /getactivescheme
    if ($activePlan -like "*High performance*" -or $activePlan -like "*Ultimate Performance*") {
        Write-Log "✓ High Performance power plan active" "SUCCESS"
    } else {
        Write-Log "✗ High Performance power plan not active" "ERROR"
        $allPassed = $false
    }

    # Check hibernation status
    $hiberFile = Test-Path "C:\hiberfil.sys"
    if (-not $hiberFile) {
        Write-Log "✓ Hibernation disabled" "SUCCESS"
    } else {
        Write-Log "Hibernation file still exists (may be enabled)" "INFO"
    }

    return $allPassed
}

#endregion

#region Apply Functions

<#
.SYNOPSIS
    Add and activate Ultimate Performance power plan
.DESCRIPTION
    Adds the hidden Ultimate Performance power plan and activates it.
    Biases scheduler and power to maximum performance.

    WEB_CONFIG: power.ultimate_performance_plan (boolean, default: false)
    Description: "Add and activate Ultimate Performance power plan"
    Risk Level: TIER_1_LOW
    Risk Note: High idle power/thermals; avoid on laptops
    Source: winutil tweaks: WPFAddUltPerf
#>
function Set-UltimatePerformancePlan {
    try {
        Write-Log "Adding Ultimate Performance power plan..." "INFO"

        # Ultimate Performance GUID (hidden by default on non-workstation editions)
        $ultPerfGuid = "e9a42b02-d5df-448d-aa00-03f14749eb61"

        # Try to duplicate the hidden scheme
        $result = powercfg /duplicatescheme $ultPerfGuid 2>&1
        if ($LASTEXITCODE -eq 0) {
            # Extract the new GUID from output
            $newGuid = $result -replace '.*GUID:\s*', '' -replace '\s*\(.*', ''
            if ($newGuid) {
                powercfg /setactive $newGuid.Trim() 2>&1 | Out-Null
                Write-Log "Ultimate Performance plan created and activated" "SUCCESS"
                Write-Log "Warning: High idle power/thermals - avoid on laptops" "INFO"
                return
            }
        }

        # Fallback: activate existing Ultimate Performance if already present
        $existingUlt = powercfg /list | Select-String "Ultimate Performance" | ForEach-Object { ($_ -split '\s+')[3] }
        if ($existingUlt) {
            powercfg /setactive $existingUlt 2>&1 | Out-Null
            Write-Log "Activated existing Ultimate Performance plan" "SUCCESS"
            return
        }

        # Final fallback: use High Performance
        Write-Log "Ultimate Performance not available, using High Performance" "INFO"
        Set-PowerPlan

    } catch {
        Write-Log "Error setting Ultimate Performance: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Set High Performance or Ultimate Performance power plan
.DESCRIPTION
    Activates High Performance plan, or creates Ultimate Performance if missing.

    WEB_CONFIG: power.high_performance_plan (boolean, default: true)
    Description: "Use High Performance / Ultimate Performance power plan"
    Risk Level: TIER_0_SAFE
#>
function Set-PowerPlan {
    try {
        Write-Log "Configuring power plan..." "INFO"

        # Try to find High Performance plan
        $highPerfPlan = powercfg /list | Select-String "High performance" | ForEach-Object { ($_ -split '\s+')[3] }

        if ($highPerfPlan) {
            powercfg /setactive $highPerfPlan
            Write-Log "Set power plan to High Performance: $highPerfPlan" "SUCCESS"
        } else {
            # Create Ultimate Performance plan (duplicate of High Performance GUID)
            $guid = powercfg /duplicatescheme 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>&1
            if ($LASTEXITCODE -eq 0 -and $guid) {
                $guid = ($guid -split '\s+')[-1]
                powercfg /setactive $guid 2>&1 | Out-Null
                Write-Log "Created and activated Ultimate Performance plan: $guid" "SUCCESS"
            } else {
                Write-Log "Could not create Ultimate Performance plan, using current plan" "ERROR"
            }
        }

        # Apply current plan
        powercfg /setactive SCHEME_CURRENT 2>&1 | Out-Null

    } catch {
        Write-Log "Error setting power plan: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Disable PCIe Link State Power Management
.DESCRIPTION
    Prevents PCIe devices from entering low-power states, reducing latency.

    WEB_CONFIG: power.pcie_link_state_disabled (boolean, default: true)
    Description: "Disable PCIe Link State Power Management (reduces latency)"
    Risk Level: TIER_0_SAFE
#>
function Disable-PCIeLinkState {
    try {
        # Disable for AC (plugged in)
        powercfg /setacvalueindex SCHEME_CURRENT 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0 2>&1 | Out-Null

        # Disable for DC (battery)
        powercfg /setdcvalueindex SCHEME_CURRENT 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0 2>&1 | Out-Null

        powercfg /setactive SCHEME_CURRENT 2>&1 | Out-Null

        Write-Log "Disabled PCIe Link State Power Management" "SUCCESS"

    } catch {
        Write-Log "Error disabling PCIe Link State: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Disable USB Selective Suspend
.DESCRIPTION
    Prevents USB devices (mice, keyboards, headsets) from entering sleep mode.

    WEB_CONFIG: power.usb_selective_suspend_disabled (boolean, default: true)
    Description: "Disable USB Selective Suspend (prevents peripheral sleep)"
    Risk Level: TIER_0_SAFE
#>
function Disable-USBSelectiveSuspend {
    try {
        # Disable for AC
        powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null

        # Disable for DC
        powercfg /setdcvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>&1 | Out-Null

        powercfg /setactive SCHEME_CURRENT 2>&1 | Out-Null

        Write-Log "Disabled USB Selective Suspend" "SUCCESS"

    } catch {
        Write-Log "Error disabling USB Selective Suspend: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Set processor idle policy (C-States)
.DESCRIPTION
    Keeps C-States ENABLED by default.

    Default settings:
    - Min Processor State: 5-10% (not 100%)
    - C-States: ENABLED (not disabled)

    WEB_CONFIG: power.min_processor_state_percent (number, default: 5)
    Description: "Minimum processor state (5-10% recommended for X3D thermal headroom)"
    Risk Level: TIER_1_LOW
.PARAMETER MinProcessorStatePercent
    Minimum processor state percentage (5-100). Default 5% for thermal headroom.
#>
function Set-ProcessorIdlePolicy {
    param(
        [int]$MinProcessorStatePercent = 5
    )

    try {
        if ($MinProcessorStatePercent -lt 5) { $MinProcessorStatePercent = 5 }
        if ($MinProcessorStatePercent -gt 100) { $MinProcessorStatePercent = 100 }

        # Set minimum processor state (default 5%, not 100%)
        powercfg /setacvalueindex SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ed $MinProcessorStatePercent 2>&1 | Out-Null
        powercfg /setdcvalueindex SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ed $MinProcessorStatePercent 2>&1 | Out-Null

        # KEEP C-STATES ENABLED (do not set idle state to 0)
        # Old script disabled C-states (value 0), new approach: keep enabled (value 1 or omit)

        powercfg /setactive SCHEME_CURRENT 2>&1 | Out-Null

        Write-Log "Set minimum processor state to ${MinProcessorStatePercent}% (C-states enabled for thermal headroom)" "SUCCESS"

    } catch {
        Write-Log "Error setting processor idle policy: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Disable hibernation
.DESCRIPTION
    Disables hibernation to save disk space and ensure clean boots.

    WEB_CONFIG: power.hibernation_disabled (boolean, default: true)
    Description: "Disable hibernation (saves disk space, cleaner boots)"
    Risk Level: TIER_0_SAFE
#>
function Disable-Hibernation {
    try {
        powercfg /hibernate off 2>&1 | Out-Null
        Write-Log "Disabled hibernation (saves disk space)" "SUCCESS"

    } catch {
        Write-Log "Error disabling hibernation: $_" "ERROR"
        throw
    }
}

#endregion

#region Main Functions

<#
.SYNOPSIS
    Apply all power optimizations
.DESCRIPTION
    Main entry point for power optimizations.
.PARAMETER MinProcessorStatePercent
    Minimum processor state percentage (5-100). Default 5% for X3D thermal headroom.
#>
function Invoke-PowerOptimizations {
    param(
        [int]$MinProcessorStatePercent = 5
    )

    Write-Log "Applying power optimizations..." "INFO"

    try {
        # Set High Performance plan
        Set-PowerPlan

        # Disable PCIe Link State Power Management
        Disable-PCIeLinkState

        # Disable USB Selective Suspend
        Disable-USBSelectiveSuspend

        # Set processor idle policy (default: 5% min, C-states enabled)
        Set-ProcessorIdlePolicy -MinProcessorStatePercent $MinProcessorStatePercent

        # Disable hibernation
        Disable-Hibernation

        Write-Log "Power optimizations complete" "SUCCESS"

    } catch {
        Write-Log "Error applying power optimizations: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Rollback power optimizations to defaults
.DESCRIPTION
    Restores power settings to Windows balanced defaults.
#>
function Undo-PowerOptimizations {
    Write-Log "Rolling back power optimizations..." "INFO"

    try {
        # Set to Balanced power plan
        $balancedPlan = powercfg /list | Select-String "Balanced" | ForEach-Object { ($_ -split '\s+')[3] }
        if ($balancedPlan) {
            powercfg /setactive $balancedPlan 2>&1 | Out-Null
            Write-Log "Restored Balanced power plan" "SUCCESS"
        }

        # Re-enable hibernation
        powercfg /hibernate on 2>&1 | Out-Null
        Write-Log "Re-enabled hibernation" "SUCCESS"

        # Restore default power settings (balanced plan defaults)
        powercfg /restoredefaultschemes 2>&1 | Out-Null

        Write-Log "Power optimization rollback complete" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}

#endregion

# Export functions
Export-ModuleMember -Function @(
    'Set-PowerPlan',
    'Set-UltimatePerformancePlan',
    'Disable-PCIeLinkState',
    'Disable-USBSelectiveSuspend',
    'Set-ProcessorIdlePolicy',
    'Disable-Hibernation',
    'Test-PowerOptimizations',
    'Invoke-PowerOptimizations',
    'Undo-PowerOptimizations'
)
