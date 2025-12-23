#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Core performance optimizations (HPET, MSI, scheduler, timer resolution)
.DESCRIPTION
    Extracted from Fix-Stutters function (gaming-pc-setup.ps1 lines 1026-1320).
    Provides granular control over performance-critical settings.
.NOTES
    Author: @thepedroferrari
    Risk Level: TIER_1_LOW
    Reversible: Yes (via Undo-PerformanceOptimizations)
#>

# Import core modules
Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global

#region Detection Functions

<#
.SYNOPSIS
    Verify performance optimizations are applied correctly
.OUTPUTS
    [bool] True if all optimizations verified, false otherwise
#>
function Test-PerformanceOptimizations {
    param(
        [bool]$HPETDisabled = $false,
        [bool]$CoreParkingDisabled = $false
    )

    $allPassed = $true

    Write-Log "Verifying performance optimizations..." "INFO"

    # Check MMCSS Gaming Tweaks
    $mmcssPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
    $gpuPriority = Get-RegistryValue -Path $mmcssPath -Name "GPU Priority"
    if ($gpuPriority -eq 8) {
        Write-Log "✓ MMCSS GPU Priority: 8 (correct)" "SUCCESS"
    } else {
        Write-Log "✗ MMCSS GPU Priority incorrect (current: $gpuPriority, expected: 8)" "ERROR"
        $allPassed = $false
    }

    # Check Scheduler
    $schedulerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl"
    $win32Priority = Get-RegistryValue -Path $schedulerPath -Name "Win32PrioritySeparation"
    if ($win32Priority -eq 26) {
        Write-Log "✓ Win32PrioritySeparation: 26 (balanced gaming)" "SUCCESS"
    } else {
        Write-Log "✗ Win32PrioritySeparation incorrect (current: $win32Priority, expected: 26)" "ERROR"
        $allPassed = $false
    }

    # Check Timer Resolution
    $timerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel"
    $globalTimer = Get-RegistryValue -Path $timerPath -Name "GlobalTimerResolutionRequests"
    if ($globalTimer -eq 1) {
        Write-Log "✓ GlobalTimerResolutionRequests enabled" "SUCCESS"
    }

    return $allPassed
}

#endregion

#region Apply Functions

<#
.SYNOPSIS
    Disable HPET (High Precision Event Timer) via bcdedit
.DESCRIPTION
    Disables platform clock and dynamic tick for potential latency reduction.

    Only enable if validated with ETW traces showing HPET-related overhead.

    WEB_CONFIG: performance.hpet_disabled (boolean, default: false)
    Description: "Disable HPET - opt-in only, validate with ETW traces first"
    Risk Level: TIER_1_LOW
    Note: "Limited benefit on Win11, QPC uses TSC by default"
.PARAMETER Enable
    If true, disables HPET. If false, skips this optimization.
#>
function Disable-HPET {
    param(
        [bool]$Enable = $false
    )

    if (-not $Enable) {
        Write-Log "HPET disable: OPT-IN only (skipped, default: keep enabled)" "INFO"
        return
    }

    Write-Log "Disabling HPET (High Precision Event Timer)..." "INFO"

    try {
        # Disable useplatformclock
        $result = bcdedit /set useplatformclock false 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Disabled useplatformclock" "SUCCESS"
        } else {
            Write-Log "Could not disable useplatformclock (may not be supported)" "ERROR"
        }

        # Disable dynamic tick
        $result = bcdedit /set disabledynamictick yes 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Disabled dynamic tick" "SUCCESS"
        } else {
            Write-Log "Could not disable disabledynamictick (may not be supported)" "ERROR"
        }

        Write-Log "HPET configuration complete. Requires reboot." "SUCCESS"

    } catch {
        Write-Log "Error disabling HPET: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Enable MSI Mode for GPU and network adapters
.DESCRIPTION
    Message Signaled Interrupts (MSI) reduce DPC latency by avoiding shared
    line-based interrupts.

    IMPORTANT: Only enable if device is currently using line-based interrupts.
    Modern devices (2020+) already use MSI/MSI-X by default.

    WEB_CONFIG: performance.msi_mode_enabled (boolean, default: true)
    Description: "Enable MSI mode for GPU/NIC (audit first, only if line-based)"
    Risk Level: TIER_1_LOW
    Note: "Most modern devices already use MSI/MSI-X"
#>
function Enable-MSIMode {
    Write-Log "Configuring MSI Mode for devices (reduces DPC latency)..." "INFO"

    $msiEnabled = 0

    try {
        # Get GPU devices
        $gpuDevices = Get-PnpDevice | Where-Object {
            ($_.Class -eq "Display") -or
            ($_.FriendlyName -like "*NVIDIA*") -or
            ($_.FriendlyName -like "*AMD*") -or
            ($_.FriendlyName -like "*Intel*")
        } | Select-Object -First 3

        foreach ($device in $gpuDevices) {
            try {
                $deviceId = $device.InstanceId
                if ($deviceId) {
                    $msiPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$deviceId\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
                    if (Test-Path $msiPath) {
                        Backup-RegistryKey -Path $msiPath
                        Set-RegistryValue -Path $msiPath -Name "MSISupported" -Value 1 -Type "DWORD"
                        Write-Log "Enabled MSI mode for GPU: $($device.FriendlyName)" "SUCCESS"
                        $msiEnabled++
                    }
                }
            } catch {
                Write-Log "Could not enable MSI mode for $($device.FriendlyName): $_" "ERROR"
            }
        }

        # Network adapter MSI mode
        $netAdapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
        foreach ($adapter in $netAdapters) {
            try {
                $netDevice = Get-PnpDevice | Where-Object { $_.FriendlyName -eq $adapter.InterfaceDescription } | Select-Object -First 1
                if ($netDevice -and $netDevice.InstanceId) {
                    $deviceId = $netDevice.InstanceId
                    $msiPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$deviceId\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
                    if (Test-Path $msiPath) {
                        Backup-RegistryKey -Path $msiPath
                        Set-RegistryValue -Path $msiPath -Name "MSISupported" -Value 1 -Type "DWORD"
                        Write-Log "Enabled MSI mode for network adapter: $($adapter.Name)" "SUCCESS"
                        $msiEnabled++
                    }
                }
            } catch {
                Write-Log "Could not enable MSI mode for network adapter $($adapter.Name): $_" "ERROR"
            }
        }

        if ($msiEnabled -gt 0) {
            Write-Log "MSI Mode enabled for $msiEnabled device(s). Reboot required." "SUCCESS"
        } else {
            Write-Log "No devices found that support MSI Mode, or it's already enabled" "INFO"
        }

    } catch {
        Write-Log "Error enabling MSI mode: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Configure CPU core parking and C-states
.DESCRIPTION
    Keeps core parking ENABLED by default.
    Only disable if validated with benchmarks showing improvement.

    WEB_CONFIG: performance.core_parking_enabled (boolean, default: true)
    Description: "Keep core parking enabled for X3D thermal/boost headroom"
    Risk Level: TIER_1_LOW
.PARAMETER Disable
    If true, disables core parking. If false (default), keeps it enabled.
#>
function Set-CoreParking {
    param(
        [bool]$Disable = $false
    )

    if (-not $Disable) {
        Write-Log "Core parking: KEPT ENABLED (default, especially for X3D CPUs)" "INFO"
        return
    }

    Write-Log "Disabling CPU core parking (opt-in)..." "INFO"

    try {
        # Registry method
        $cpuParkPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
        Backup-RegistryKey -Path $cpuParkPath
        Set-RegistryValue -Path $cpuParkPath -Name "CpuParkingEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $cpuParkPath -Name "CpuParkingMinCores" -Value 100 -Type "DWORD"

        # Power scheme method
        $schemes = powercfg /list | Select-String "GUID" | ForEach-Object { ($_ -split '\s+')[-1] }
        foreach ($scheme in $schemes) {
            powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 0 2>&1 | Out-Null
            powercfg /setdcvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 0 2>&1 | Out-Null
        }

        Write-Log "Disabled CPU core parking" "SUCCESS"

    } catch {
        Write-Log "Error configuring core parking: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Set Windows scheduler optimizations for gaming
.DESCRIPTION
    Configures Win32PrioritySeparation and IRQ8Priority for balanced gaming performance.

    Win32PrioritySeparation = 26 (0x1A):
    - Balanced foreground/background priorities
    - Fixed quantum length
    - Better for gaming than aggressive values

    WEB_CONFIG: performance.scheduler_optimized (boolean, default: true)
    Description: "Optimize Windows scheduler for gaming (Win32PrioritySeparation=26)"
    Risk Level: TIER_0_SAFE
#>
function Set-SchedulerOptimizations {
    try {
        $schedulerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl"
        Backup-RegistryKey -Path $schedulerPath

        # Win32PrioritySeparation = 26 (balanced gaming)
        Set-RegistryValue -Path $schedulerPath -Name "Win32PrioritySeparation" -Value 26 -Type "DWORD"
        Write-Log "Set Win32PrioritySeparation to 26 (balanced gaming)" "SUCCESS"

        # IRQ8Priority for frame time consistency
        Set-RegistryValue -Path $schedulerPath -Name "IRQ8Priority" -Value 1 -Type "DWORD"
        Write-Log "Set IRQ8Priority for frame time consistency" "SUCCESS"

    } catch {
        Write-Log "Error configuring scheduler: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Set timer resolution registry hints
.DESCRIPTION
    Configures registry settings to allow high-resolution timers.
    Runtime resolution (0.5-1.0ms) must be set by timer-tool.ps1 during gameplay.

    Windows default: 15.6ms timer resolution (causes frame time inconsistency)
    Gaming target: 0.5-1.0ms (via timer-tool.ps1)

    WEB_CONFIG: performance.timer_resolution_enabled (boolean, default: true)
    Description: "Enable timer resolution registry hints (runtime via timer-tool.ps1)"
    Risk Level: TIER_1_LOW
    Note: "Use timer-tool.ps1 during gameplay to set 0.5-1.0ms resolution"
#>
function Set-TimerResolution {
    try {
        # Kernel timer resolution
        $timerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel"
        Backup-RegistryKey -Path $timerPath
        Set-RegistryValue -Path $timerPath -Name "GlobalTimerResolutionRequests" -Value 1 -Type "DWORD"

        # Multimedia system responsiveness
        $multimediaPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
        Backup-RegistryKey -Path $multimediaPath
        Set-RegistryValue -Path $multimediaPath -Name "SystemResponsiveness" -Value 0 -Type "DWORD"

        # Disable timer coalescing (prevents CPU from sleeping cores)
        $powerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
        Backup-RegistryKey -Path $powerPath
        Set-RegistryValue -Path $powerPath -Name "EnergyEstimationEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $powerPath -Name "PlatformAoAcOverride" -Value 0 -Type "DWORD"

        # Disable CPU throttling
        Set-RegistryValue -Path $powerPath -Name "CsEnabled" -Value 0 -Type "DWORD"

        Write-Log "Timer resolution registry configured. Use timer-tool.ps1 during gameplay." "SUCCESS"

    } catch {
        Write-Log "Error configuring timer resolution: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Set MMCSS (Multimedia Class Scheduler Service) gaming tweaks
.DESCRIPTION
    Prioritizes game processes in Windows scheduler and I/O subsystem.

    Settings:
    - GPU Priority: 8 (highest)
    - Priority: 6 (high)
    - Scheduling Category: High
    - SFIO Priority: High (Storage Foundation I/O)

    WEB_CONFIG: performance.mmcss_gaming_tweaks (boolean, default: true)
    Description: "Optimize MMCSS for gaming (GPU Priority 8, SFIO High)"
    Risk Level: TIER_0_SAFE
#>
function Set-MMCSSGamingTweaks {
    try {
        $mmcssGamesPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
        Backup-RegistryKey -Path $mmcssGamesPath

        Set-RegistryValue -Path $mmcssGamesPath -Name "GPU Priority" -Value 8 -Type "DWORD"
        Set-RegistryValue -Path $mmcssGamesPath -Name "Priority" -Value 6 -Type "DWORD"
        Set-RegistryValue -Path $mmcssGamesPath -Name "Scheduling Category" -Value "High" -Type "String"
        Set-RegistryValue -Path $mmcssGamesPath -Name "SFIO Priority" -Value "High" -Type "String"

        Write-Log "Applied MMCSS gaming tweaks (prioritizes games)" "SUCCESS"

    } catch {
        Write-Log "Error configuring MMCSS: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Enable Windows Game Mode
.DESCRIPTION
    Enables Game Mode for scheduler hints and resource allocation.

    WEB_CONFIG: performance.game_mode_enabled (boolean, default: true)
    Description: "Enable Windows Game Mode (scheduler hints)"
    Risk Level: TIER_0_SAFE
#>
function Enable-GameMode {
    try {
        $gameModePath = "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\ApplicationManagement\AllowGameMode"
        Backup-RegistryKey -Path $gameModePath
        Set-RegistryValue -Path $gameModePath -Name "value" -Value 1 -Type "DWORD"

        Write-Log "Enabled Windows Game Mode" "SUCCESS"

    } catch {
        Write-Log "Error enabling Game Mode: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Disable GameDVR capture
.DESCRIPTION
    Removes background capture overhead and DVR hooks.
.PARAMETER Enable
    When $true (default), applies disablement. If $false, skip.
#>
function Set-GameDVR {
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "GameDVR disable skipped by config" "INFO"
        return
    }

    try {
        $dvrPath = "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR"
        Backup-RegistryKey -Path $dvrPath
        Set-RegistryValue -Path $dvrPath -Name "AppCaptureEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $dvrPath -Name "GameDVR_Enabled" -Value 0 -Type "DWORD"

        $configStore = "HKCU:\System\GameConfigStore"
        Backup-RegistryKey -Path $configStore
        Set-RegistryValue -Path $configStore -Name "GameDVR_FSEBehaviorMode" -Value 2 -Type "DWORD"
        Set-RegistryValue -Path $configStore -Name "GameDVR_HonorUserFSEBehaviorMode" -Value 1 -Type "DWORD"

        Write-Log "GameDVR disabled (capture + FSE behavior)" "SUCCESS"
    } catch {
        Write-Log "Error disabling GameDVR: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Disable Fullscreen Optimizations
.DESCRIPTION
    Helps legacy titles; may impact HDR/color-managed modes.
.PARAMETER Enable
    When $true (default), applies FSO disablement.
#>
function Set-FullscreenOptimizations {
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "FSO disable skipped by config" "INFO"
        return
    }

    try {
        $configStore = "HKCU:\System\GameConfigStore"
        Backup-RegistryKey -Path $configStore
        Set-RegistryValue -Path $configStore -Name "GameDVR_FSEBehaviorMode" -Value 2 -Type "DWORD"
        Set-RegistryValue -Path $configStore -Name "GameDVR_HonorUserFSEBehaviorMode" -Value 1 -Type "DWORD"
        Write-Log "Fullscreen Optimizations disabled (watch HDR/color-managed titles)" "SUCCESS"
    } catch {
        Write-Log "Error disabling Fullscreen Optimizations: $_" "ERROR"
        throw
    }
}

#endregion

#region Main Functions

<#
.SYNOPSIS
    Apply all performance optimizations
.DESCRIPTION
    Main entry point for performance optimizations.
.PARAMETER DisableHPET
    Opt-in to disable HPET (default: false, keep enabled)
.PARAMETER DisableCoreParking
    Opt-in to disable core parking (default: false, keep enabled)
#>
function Invoke-PerformanceOptimizations {
    param(
        [bool]$DisableHPET = $false,
        [bool]$DisableCoreParking = $false,
        [bool]$DisableGameDVR = $true,
        [bool]$DisableFSO = $true
    )

    Write-Log "Applying performance optimizations..." "INFO"

    try {
        # GameDVR + FSO
        Set-GameDVR -Enable $DisableGameDVR
        Set-FullscreenOptimizations -Enable $DisableFSO

        # HPET (opt-in only, default: keep enabled)
        Disable-HPET -Enable $DisableHPET

        # MSI Mode (audit and enable if needed)
        Enable-MSIMode

        # Core Parking (default: KEEP ENABLED for X3D)
        Set-CoreParking -Disable $DisableCoreParking

        # Scheduler optimizations
        Set-SchedulerOptimizations

        # Timer resolution registry
        Set-TimerResolution

        # MMCSS gaming tweaks
        Set-MMCSSGamingTweaks

        # Windows Game Mode
        Enable-GameMode

        Write-Log "Performance optimizations complete" "SUCCESS"
        Write-Log "IMPORTANT: Reboot required for HPET and MSI mode changes" "INFO"
        Write-Log "Run timer-tool.ps1 during gameplay for 0.5-1.0ms timer resolution" "INFO"

    } catch {
        Write-Log "Error applying performance optimizations: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Rollback performance optimizations to defaults
.DESCRIPTION
    Restores performance settings to Windows defaults.
#>
function Undo-PerformanceOptimizations {
    Write-Log "Rolling back performance optimizations..." "INFO"

    try {
        # Restore HPET via bcdedit
        bcdedit /deletevalue useplatformclock 2>&1 | Out-Null
        bcdedit /deletevalue disabledynamictick 2>&1 | Out-Null

        # Restore registry paths
        $paths = @(
            "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl",
            "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel",
            "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile",
            "HKLM:\SYSTEM\CurrentControlSet\Control\Power",
            "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games",
            "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\ApplicationManagement\AllowGameMode",
            "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\GameDVR",
            "HKCU:\System\GameConfigStore"
        )

        foreach ($path in $paths) {
            if (Restore-RegistryKey -Path $path) {
                Write-Log "Restored registry: $path" "SUCCESS"
            }
        }

        Write-Log "Performance optimization rollback complete (restart required)" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}

#endregion

# Export functions
Export-ModuleMember -Function @(
    'Disable-HPET',
    'Enable-MSIMode',
    'Set-CoreParking',
    'Set-SchedulerOptimizations',
    'Set-TimerResolution',
    'Set-MMCSSGamingTweaks',
    'Enable-GameMode',
    'Set-GameDVR',
    'Set-FullscreenOptimizations',
    'Test-PerformanceOptimizations',
    'Invoke-PerformanceOptimizations',
    'Undo-PerformanceOptimizations'
)

