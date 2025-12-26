<#
.SYNOPSIS
    GPU optimization helpers with vendor-specific tuning notes.
.DESCRIPTION
    Applies optional HAGS settings and performs vendor-specific housekeeping,
    primarily focused on reducing background telemetry tasks.
.NOTES
    Requires Administrator. Vendor control panel settings are suggested but not
    changed by this module.
#>
#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global



function Test-GPUVendor {
    <#
    .SYNOPSIS
        Detects the primary GPU vendor.
    .DESCRIPTION
        Reads Win32_VideoController and maps the first adapter to nvidia/amd/intel.
    .OUTPUTS
        [string] One of: nvidia, amd, intel, unknown.
    #>
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


function Test-GPUOptimizations {
    <#
    .SYNOPSIS
        Verifies GPU-related settings.
    .DESCRIPTION
        Reads HAGS (Hardware-accelerated GPU Scheduling) state from registry.
    .OUTPUTS
        [bool] True when verification runs without errors.
    #>
    $allPassed = $true

    Write-Log "Verifying GPU optimizations..." "INFO"

    $hagsPath = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
    $hagsValue = Get-RegistryValue -Path $hagsPath -Name "HwSchMode"
    if ($hagsValue -eq 2) {
        Write-Log "HAGS enabled (validate with benchmarks)" "INFO"
    } else {
        Write-Log "HAGS disabled (default)" "INFO"
    }

    return $allPassed
}




function Set-HAGS {
    <#
    .SYNOPSIS
        Enables or disables Hardware-accelerated GPU Scheduling.
    .DESCRIPTION
        Writes HwSchMode under GraphicsDrivers and logs the chosen state.
    .PARAMETER Enable
        When true, enables HAGS; when false, disables it.
    .OUTPUTS
        None.
    #>
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


function Set-NVIDIAOptimizations {
    <#
    .SYNOPSIS
        Applies NVIDIA-specific housekeeping.
    .DESCRIPTION
        Disables known NVIDIA telemetry and updater scheduled tasks. Logs
        recommended control panel settings for manual review.
    .OUTPUTS
        None.
    #>
    try {
        $nvidiaPath = "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm"

        if (-not (Test-Path $nvidiaPath)) {
            Write-Log "NVIDIA driver registry path not found. Ensure NVIDIA drivers are installed." "ERROR"
            return
        }

        Write-Log "Applying NVIDIA optimizations..." "INFO"
        Backup-RegistryKey -Path $nvidiaPath

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


function Set-AMDOptimizations {
    <#
    .SYNOPSIS
        Applies AMD-specific housekeeping.
    .DESCRIPTION
        Performs minimal registry backup and prints recommended Radeon settings.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Applying AMD optimizations..." "INFO"

        $amdPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0000"
        if (Test-Path $amdPath) {
            Backup-RegistryKey -Path $amdPath
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


function Set-IntelOptimizations {
    <#
    .SYNOPSIS
        Applies Intel-specific housekeeping.
    .DESCRIPTION
        Logs recommended Intel graphics settings for manual review.
    .OUTPUTS
        None.
    #>
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




function Invoke-GPUOptimizations {
    <#
    .SYNOPSIS
        Runs GPU optimizations based on detected vendor.
    .DESCRIPTION
        Applies HAGS preference, detects GPU vendor, and executes the matching
        vendor-specific helper.
    .PARAMETER EnableHAGS
        Enables HAGS when true.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$EnableHAGS = $false
    )

    Write-Log "Applying GPU optimizations..." "INFO"

    try {
        Set-HAGS -Enable $EnableHAGS

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


function Undo-GPUOptimizations {
    <#
    .SYNOPSIS
        Reverts GPU-related settings and tasks.
    .DESCRIPTION
        Disables HAGS, re-enables NVIDIA scheduled tasks, and restores backed
        up registry values when present.
    .OUTPUTS
        None.
    #>
    Write-Log "Rolling back GPU optimizations..." "INFO"

    try {
        Set-HAGS -Enable $false

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
