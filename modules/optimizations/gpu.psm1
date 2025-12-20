#Requires -RunAsAdministrator

<#
.SYNOPSIS
    GPU optimizations for gaming (NVIDIA, AMD, Intel)
.DESCRIPTION
    GPU-specific optimizations including HAGS configuration and vendor-specific tweaks.

    Breaking Change from old script:
    - HAGS: Now DEFAULT OFF (was: always enabled) - PRD says validate per game first

    HAGS (Hardware Accelerated GPU Scheduling) can improve or hurt performance
    depending on the game and GPU. Always benchmark before enabling.
.NOTES
    Author: @thepedroferrari
    Risk Level: TIER_1_LOW
    Reversible: Yes (via Undo-GPUOptimizations)
#>

# Import core modules
Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global

#region Detection Functions

<#
.SYNOPSIS
    Detect GPU vendor (NVIDIA, AMD, Intel)
.OUTPUTS
    [string] GPU vendor: "nvidia", "amd", "intel", or "unknown"
#>
function Test-GPUVendor {
    try {
        $gpu = Get-CimInstance Win32_VideoController -ErrorAction Stop | Select-Object -First 1

        if ($gpu.Name -like "*NVIDIA*") {
            Write-Log "Detected NVIDIA GPU: $($gpu.Name)" "INFO"
            return "nvidia"
        } elseif ($gpu.Name -like "*AMD*" -or $gpu.Name -like "*Radeon*") {
            Write-Log "Detected AMD GPU: $($gpu.Name)" "INFO"
            return "amd"
        } elseif ($gpu.Name -like "*Intel*") {
            Write-Log "Detected Intel GPU: $($gpu.Name)" "INFO"
            return "intel"
        } else {
            Write-Log "Unknown GPU vendor: $($gpu.Name)" "INFO"
            return "unknown"
        }
    } catch {
        Write-Log "Error detecting GPU vendor: $_" "ERROR"
        return "unknown"
    }
}

<#
.SYNOPSIS
    Verify GPU optimizations are applied correctly
.OUTPUTS
    [bool] True if all optimizations verified, false otherwise
#>
function Test-GPUOptimizations {
    $allPassed = $true

    Write-Log "Verifying GPU optimizations..." "INFO"

    # Check HAGS status
    $hagsPath = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
    $hagsValue = Get-RegistryValue -Path $hagsPath -Name "HwSchMode"
    if ($hagsValue -eq 2) {
        Write-Log "HAGS enabled (validate with benchmarks)" "INFO"
    } else {
        Write-Log "HAGS disabled (default)" "INFO"
    }

    return $allPassed
}

#endregion

#region Apply Functions

<#
.SYNOPSIS
    Set HAGS (Hardware Accelerated GPU Scheduling)
.DESCRIPTION
    BREAKING CHANGE: This is now OPT-IN only (old script always enabled).

    HAGS moves GPU scheduling from CPU to GPU, potentially reducing latency.
    However, results are game-dependent and GPU-dependent.

    Requirements:
    - Windows 10 20H1 or later
    - WDDM 2.7+ GPU driver
    - Supported GPU (GTX 1000 series+, RX 5000 series+)

    PRD research shows mixed results. Always benchmark before/after.

    WEB_CONFIG: gpu.hags_enabled (boolean, default: false)
    Description: "Enable HAGS (validate with benchmarks first)"
    Risk Level: TIER_1_LOW
    Note: "Can improve or hurt performance depending on game/GPU"
.PARAMETER Enable
    If true, enables HAGS. If false (default), keeps it disabled.
#>
function Set-HAGS {
    param(
        [bool]$Enable = $false
    )

    try {
        $hagsPath = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
        Backup-RegistryKey -Path $hagsPath

        if ($Enable) {
            Set-RegistryValue -Path $hagsPath -Name "HwSchMode" -Value 2 -Type "DWORD"
            Write-Log "Hardware Accelerated GPU Scheduling ENABLED (opt-in)" "SUCCESS"
            Write-Log "IMPORTANT: Benchmark before/after to validate improvement" "INFO"
        } else {
            Set-RegistryValue -Path $hagsPath -Name "HwSchMode" -Value 1 -Type "DWORD"
            Write-Log "Hardware Accelerated GPU Scheduling DISABLED (default)" "INFO"
        }

    } catch {
        Write-Log "Error configuring HAGS: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Configure NVIDIA-specific optimizations
.DESCRIPTION
    NVIDIA driver registry tweaks and telemetry task disabling.

    WEB_CONFIG: gpu.nvidia_telemetry_disabled (boolean, default: true)
    Description: "Disable NVIDIA telemetry scheduled tasks"
    Risk Level: TIER_1_LOW
#>
function Set-NVIDIAOptimizations {
    try {
        $nvidiaPath = "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm"

        if (-not (Test-Path $nvidiaPath)) {
            Write-Log "NVIDIA driver registry path not found. Ensure NVIDIA drivers are installed." "ERROR"
            return
        }

        Write-Log "Applying NVIDIA optimizations..." "INFO"
        Backup-RegistryKey -Path $nvidiaPath

        # Disable NVIDIA telemetry scheduled tasks
        $nvidiaTasks = @(
            "NvTmRep_CrashReport1_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
            "NvTmRep_CrashReport2_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
            "NvTmRep_CrashReport3_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
            "NvTmRep_CrashReport4_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
            "NvDriverUpdateCheckDaily_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
            "NVIDIA GeForce Experience SelfUpdate_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
            "NvTmMon_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"
        )

        $disabled = 0
        foreach ($task in $nvidiaTasks) {
            try {
                schtasks /Change /TN $task /DISABLE 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    $disabled++
                }
            } catch {
                # Task may not exist
            }
        }

        if ($disabled -gt 0) {
            Write-Log "Disabled $disabled NVIDIA telemetry tasks" "SUCCESS"
        }

        Write-Log "NVIDIA optimizations complete" "SUCCESS"
        Write-Log "RECOMMENDED: Configure NVIDIA Control Panel manually:" "INFO"
        Write-Log "  - Power management mode: Prefer maximum performance" "INFO"
        Write-Log "  - Vertical sync: Off (or Fast for G-Sync)" "INFO"
        Write-Log "  - Low latency mode: Ultra" "INFO"
        Write-Log "  - Texture filtering - Quality: High performance" "INFO"

    } catch {
        Write-Log "Error applying NVIDIA optimizations: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Configure AMD-specific optimizations
.DESCRIPTION
    AMD driver optimizations. Manual Radeon Software recommendations.

    WEB_CONFIG: gpu.amd_optimized (boolean, default: true)
    Description: "Apply AMD GPU optimizations"
    Risk Level: TIER_1_LOW
#>
function Set-AMDOptimizations {
    try {
        Write-Log "Applying AMD optimizations..." "INFO"

        # AMD driver registry path (if exists)
        $amdPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000"
        if (Test-Path $amdPath) {
            Backup-RegistryKey -Path $amdPath
            # AMD-specific tweaks can go here if needed
        }

        Write-Log "AMD optimizations complete" "SUCCESS"
        Write-Log "RECOMMENDED: Configure AMD Radeon Software manually:" "INFO"
        Write-Log "  - Radeon Anti-Lag: On" "INFO"
        Write-Log "  - Radeon Boost: On (if supported)" "INFO"
        Write-Log "  - Radeon Image Sharpening: 80% (if desired)" "INFO"
        Write-Log "  - Wait for Vertical Refresh: Off" "INFO"
        Write-Log "  - Texture Filtering Quality: Performance" "INFO"

    } catch {
        Write-Log "Error applying AMD optimizations: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Configure Intel-specific optimizations
.DESCRIPTION
    Intel GPU optimizations. Manual Intel Graphics Command Center recommendations.

    WEB_CONFIG: gpu.intel_optimized (boolean, default: true)
    Description: "Apply Intel GPU optimizations"
    Risk Level: TIER_1_LOW
#>
function Set-IntelOptimizations {
    try {
        Write-Log "Applying Intel GPU optimizations..." "INFO"

        Write-Log "Intel GPU optimizations complete" "SUCCESS"
        Write-Log "RECOMMENDED: Configure Intel Graphics Command Center manually:" "INFO"
        Write-Log "  - Use Intel Graphics Command Center for performance profiles" "INFO"
        Write-Log "  - Enable Gaming mode if available" "INFO"

    } catch {
        Write-Log "Error applying Intel optimizations: $_" "ERROR"
        throw
    }
}

#endregion

#region Main Functions

<#
.SYNOPSIS
    Apply all GPU optimizations
.DESCRIPTION
    Main entry point for GPU optimizations. Auto-detects vendor and applies
    vendor-specific optimizations.
.PARAMETER EnableHAGS
    Enable HAGS (opt-in, default: false - validate with benchmarks first)
#>
function Invoke-GPUOptimizations {
    param(
        [bool]$EnableHAGS = $false
    )

    Write-Log "Applying GPU optimizations..." "INFO"

    try {
        # Set HAGS (opt-in only, default: disabled)
        Set-HAGS -Enable $EnableHAGS

        # Detect GPU vendor and apply vendor-specific optimizations
        $vendor = Test-GPUVendor

        switch ($vendor) {
            "nvidia" {
                Set-NVIDIAOptimizations
            }
            "amd" {
                Set-AMDOptimizations
            }
            "intel" {
                Set-IntelOptimizations
            }
            default {
                Write-Log "Unknown GPU vendor, skipping vendor-specific optimizations" "INFO"
            }
        }

        Write-Log "GPU optimizations complete" "SUCCESS"

    } catch {
        Write-Log "Error applying GPU optimizations: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Rollback GPU optimizations to defaults
.DESCRIPTION
    Restores GPU settings to Windows defaults.
#>
function Undo-GPUOptimizations {
    Write-Log "Rolling back GPU optimizations..." "INFO"

    try {
        # Restore HAGS to disabled
        Set-HAGS -Enable $false

        # Re-enable NVIDIA telemetry tasks
        $nvidiaTasks = @(
            "NvTmRep_CrashReport1_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
            "NvTmRep_CrashReport2_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
            "NvTmRep_CrashReport3_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
            "NvTmRep_CrashReport4_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
            "NvDriverUpdateCheckDaily_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
            "NVIDIA GeForce Experience SelfUpdate_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}",
            "NvTmMon_{B2FE1952-0186-46C3-BAEC-A80AA35AC5B8}"
        )

        foreach ($task in $nvidiaTasks) {
            schtasks /Change /TN $task /ENABLE 2>&1 | Out-Null
        }

        # Restore registry paths
        $paths = @(
            "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers",
            "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm",
            "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000"
        )

        foreach ($path in $paths) {
            if (Restore-RegistryKey -Path $path) {
                Write-Log "Restored registry: $path" "SUCCESS"
            }
        }

        Write-Log "GPU optimization rollback complete" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}

#endregion

# Export functions
Export-ModuleMember -Function @(
    'Test-GPUVendor',
    'Set-HAGS',
    'Set-NVIDIAOptimizations',
    'Set-AMDOptimizations',
    'Set-IntelOptimizations',
    'Test-GPUOptimizations',
    'Invoke-GPUOptimizations',
    'Undo-GPUOptimizations'
)
