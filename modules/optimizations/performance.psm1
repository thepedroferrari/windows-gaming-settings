#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global



function Test-PerformanceOptimizations {
    param(
        [bool]$HPETDisabled = $false,
        [bool]$CoreParkingDisabled = $false
    )

    $allPassed = $true

    Write-Log "Verifying performance optimizations..." "INFO"

    $mmcssPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
    $gpuPriority = Get-RegistryValue -Path $mmcssPath -Name "GPU Priority"
    if ($gpuPriority -eq 8) {
        Write-Log "✓ MMCSS GPU Priority: 8 (correct)" "SUCCESS"
    } else {
        Write-Log "✗ MMCSS GPU Priority incorrect (current: $gpuPriority, expected: 8)" "ERROR"
        $allPassed = $false
    }

    $schedulerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl"
    $win32Priority = Get-RegistryValue -Path $schedulerPath -Name "Win32PrioritySeparation"
    if ($win32Priority -eq 26) {
        Write-Log "✓ Win32PrioritySeparation: 26 (balanced gaming)" "SUCCESS"
    } else {
        Write-Log "✗ Win32PrioritySeparation incorrect (current: $win32Priority, expected: 26)" "ERROR"
        $allPassed = $false
    }

    $timerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel"
    $globalTimer = Get-RegistryValue -Path $timerPath -Name "GlobalTimerResolutionRequests"
    if ($globalTimer -eq 1) {
        Write-Log "✓ GlobalTimerResolutionRequests enabled" "SUCCESS"
    }

    return $allPassed
}




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
        $result = bcdedit /set useplatformclock false 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Disabled useplatformclock" "SUCCESS"
        } else {
            Write-Log "Could not disable useplatformclock (may not be supported)" "ERROR"
        }

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


function Enable-MSIMode {
    Write-Log "Configuring MSI Mode for devices (reduces DPC latency)..." "INFO"

    $msiEnabled = 0

    try {
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
        $cpuParkPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
        Backup-RegistryKey -Path $cpuParkPath
        Set-RegistryValue -Path $cpuParkPath -Name "CpuParkingEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $cpuParkPath -Name "CpuParkingMinCores" -Value 100 -Type "DWORD"

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


function Set-SchedulerOptimizations {
    try {
        $schedulerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl"
        Backup-RegistryKey -Path $schedulerPath

        Set-RegistryValue -Path $schedulerPath -Name "Win32PrioritySeparation" -Value 26 -Type "DWORD"
        Write-Log "Set Win32PrioritySeparation to 26 (balanced gaming)" "SUCCESS"

        Set-RegistryValue -Path $schedulerPath -Name "IRQ8Priority" -Value 1 -Type "DWORD"
        Write-Log "Set IRQ8Priority for frame time consistency" "SUCCESS"

    } catch {
        Write-Log "Error configuring scheduler: $_" "ERROR"
        throw
    }
}


function Set-TimerResolution {
    try {
        $timerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel"
        Backup-RegistryKey -Path $timerPath
        Set-RegistryValue -Path $timerPath -Name "GlobalTimerResolutionRequests" -Value 1 -Type "DWORD"

        $multimediaPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
        Backup-RegistryKey -Path $multimediaPath
        Set-RegistryValue -Path $multimediaPath -Name "SystemResponsiveness" -Value 0 -Type "DWORD"

        $powerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
        Backup-RegistryKey -Path $powerPath
        Set-RegistryValue -Path $powerPath -Name "EnergyEstimationEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $powerPath -Name "PlatformAoAcOverride" -Value 0 -Type "DWORD"

        Set-RegistryValue -Path $powerPath -Name "CsEnabled" -Value 0 -Type "DWORD"

        Write-Log "Timer resolution registry configured. Use timer-tool.ps1 during gameplay." "SUCCESS"

    } catch {
        Write-Log "Error configuring timer resolution: $_" "ERROR"
        throw
    }
}


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


function Test-NVMeSupport {
    <#
    .SYNOPSIS
        Tests if Native NVMe optimization can be applied to this system.
    .DESCRIPTION
        Checks for:
        1. NVMe drives present
        2. Windows 11 24H2+ (Build 26100+) or Windows Server 2025
        3. Using Windows in-box stornvme.sys driver (not vendor driver)
    .OUTPUTS
        PSObject with HasNVMe, IsSupported, UsesInboxDriver, Message properties
    #>

    $result = [PSCustomObject]@{
        HasNVMe = $false
        IsSupported = $false
        UsesInboxDriver = $false
        BuildNumber = 0
        Message = ""
        NVMeDrives = @()
    }

    try {
        # Check for NVMe drives
        $nvmeDrives = Get-PhysicalDisk | Where-Object { $_.BusType -eq "NVMe" }
        if (-not $nvmeDrives) {
            $result.Message = "No NVMe drives detected"
            Write-Log "Native NVMe: No NVMe drives detected" "INFO"
            return $result
        }

        $result.HasNVMe = $true
        $result.NVMeDrives = $nvmeDrives | Select-Object FriendlyName, MediaType, Size
        Write-Log "Native NVMe: Found $($nvmeDrives.Count) NVMe drive(s)" "INFO"

        # Check Windows version (Build 26100+ for Windows 11 24H2)
        $build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
        $result.BuildNumber = $build

        if ($build -lt 26100) {
            $result.Message = "Requires Windows 11 24H2+ (Build 26100+). Current: $build"
            Write-Log "Native NVMe: Unsupported Windows version (Build $build, need 26100+)" "INFO"
            return $result
        }

        $result.IsSupported = $true

        # Check if using in-box stornvme driver
        $stornvmeDevices = Get-PnpDevice -Class DiskDrive -ErrorAction SilentlyContinue | Where-Object {
            $_.InstanceId -like "*NVME*"
        } | ForEach-Object {
            $svc = (Get-PnpDeviceProperty -InstanceId $_.InstanceId -KeyName "DEVPKEY_Device_Service" -ErrorAction SilentlyContinue).Data
            if ($svc -eq "stornvme") { $_ }
        }

        if ($stornvmeDevices) {
            $result.UsesInboxDriver = $true
            Write-Log "Native NVMe: Using Windows in-box stornvme.sys driver" "SUCCESS"
        } else {
            Write-Log "Native NVMe: Using vendor NVMe driver (in-box driver not detected)" "INFO"
            $result.Message = "NVMe drives using vendor driver - Native NVMe only works with stornvme.sys"
        }

        if (-not $result.Message) {
            $result.Message = "System supports Native NVMe optimization"
        }

    } catch {
        $result.Message = "Error checking NVMe support: $_"
        Write-Log "Native NVMe: Error during detection - $_" "ERROR"
    }

    return $result
}


function Enable-NativeNVMe {
    <#
    .SYNOPSIS
        Enables Native NVMe I/O path on Windows 11 24H2+ / Server 2025.
    .DESCRIPTION
        Eliminates SCSI translation layer for NVMe drives, delivering:
        - Up to ~80% more IOPS
        - ~45% reduction in CPU cycles per I/O
        - Direct multi-queue access to NVMe hardware

        After reboot, NVMe devices move from "Disk drives" to "Storage disks" in Device Manager.

        EXPERIMENTAL: Known issues with Data Deduplication - disable dedup first if enabled.
    .PARAMETER Enable
        If false, skips enabling Native NVMe (opt-in only)
    .PARAMETER Force
        If true, enables even if vendor driver detected (may have no effect)
    #>
    param(
        [bool]$Enable = $false,
        [bool]$Force = $false
    )

    if (-not $Enable) {
        Write-Log "Native NVMe: OPT-IN only (skipped)" "INFO"
        return $false
    }

    Write-Log "Enabling Native NVMe I/O path..." "INFO"

    try {
        # Run detection
        $support = Test-NVMeSupport

        if (-not $support.HasNVMe) {
            Write-Log "Native NVMe: Skipped - No NVMe drives detected" "INFO"
            return $false
        }

        if (-not $support.IsSupported) {
            Write-Log "Native NVMe: Skipped - $($support.Message)" "INFO"
            return $false
        }

        if (-not $support.UsesInboxDriver -and -not $Force) {
            Write-Log "Native NVMe: Warning - NVMe drives using vendor driver" "INFO"
            Write-Log "Native NVMe: Native NVMe only works with Windows in-box stornvme.sys driver" "INFO"
            Write-Log "Native NVMe: Continuing anyway (may have no effect on vendor-driver devices)" "INFO"
        }

        # Enable Native NVMe via Feature Management registry key
        $nvmePath = "HKLM:\SYSTEM\CurrentControlSet\Policies\Microsoft\FeatureManagement\Overrides"

        if (-not (Test-Path $nvmePath)) {
            New-Item -Path $nvmePath -Force | Out-Null
            Write-Log "Created Native NVMe registry path" "INFO"
        }

        Backup-RegistryKey -Path $nvmePath
        Set-RegistryValue -Path $nvmePath -Name "1176759950" -Value 1 -Type "DWORD"

        Write-Log "Native NVMe I/O path enabled (reboot required)" "SUCCESS"
        Write-Log "After reboot: NVMe devices move from 'Disk drives' to 'Storage disks' in Device Manager" "INFO"
        Write-Log "EXPERIMENTAL: Known issues with Data Deduplication - disable dedup first if enabled" "INFO"

        return $true

    } catch {
        Write-Log "Error enabling Native NVMe: $_" "ERROR"
        throw
    }
}


function Disable-NativeNVMe {
    <#
    .SYNOPSIS
        Disables Native NVMe I/O path and reverts to legacy SCSI translation.
    .DESCRIPTION
        Sets the feature flag to 0 and requires a reboot.
        After reboot, NVMe devices return to "Disk drives" in Device Manager.
    #>

    Write-Log "Disabling Native NVMe I/O path..." "INFO"

    try {
        $nvmePath = "HKLM:\SYSTEM\CurrentControlSet\Policies\Microsoft\FeatureManagement\Overrides"

        if (Test-Path $nvmePath) {
            $currentValue = Get-RegistryValue -Path $nvmePath -Name "1176759950"
            if ($null -ne $currentValue) {
                Set-RegistryValue -Path $nvmePath -Name "1176759950" -Value 0 -Type "DWORD"
                Write-Log "Native NVMe disabled (reboot required)" "SUCCESS"
                Write-Log "After reboot: NVMe devices return to 'Disk drives' in Device Manager" "INFO"
                return $true
            } else {
                Write-Log "Native NVMe was not enabled (registry key not found)" "INFO"
                return $false
            }
        } else {
            Write-Log "Native NVMe was not enabled (registry path not found)" "INFO"
            return $false
        }

    } catch {
        Write-Log "Error disabling Native NVMe: $_" "ERROR"
        throw
    }
}


function Test-NativeNVMeStatus {
    <#
    .SYNOPSIS
        Checks if Native NVMe is currently enabled.
    .OUTPUTS
        $true if enabled, $false otherwise
    #>

    try {
        $nvmePath = "HKLM:\SYSTEM\CurrentControlSet\Policies\Microsoft\FeatureManagement\Overrides"

        if (Test-Path $nvmePath) {
            $value = Get-RegistryValue -Path $nvmePath -Name "1176759950"
            if ($value -eq 1) {
                Write-Log "Native NVMe: Currently ENABLED" "SUCCESS"
                return $true
            }
        }

        Write-Log "Native NVMe: Currently DISABLED" "INFO"
        return $false

    } catch {
        Write-Log "Error checking Native NVMe status: $_" "ERROR"
        return $false
    }
}


function Invoke-PerformanceOptimizations {
    param(
        [bool]$DisableHPET = $false,
        [bool]$DisableCoreParking = $false,
        [bool]$DisableGameDVR = $true,
        [bool]$DisableFSO = $true,
        [bool]$EnableNativeNVMe = $false
    )

    Write-Log "Applying performance optimizations..." "INFO"

    try {
        Set-GameDVR -Enable $DisableGameDVR
        Set-FullscreenOptimizations -Enable $DisableFSO

        Disable-HPET -Enable $DisableHPET

        Enable-MSIMode

        Set-CoreParking -Disable $DisableCoreParking

        Set-SchedulerOptimizations

        Set-TimerResolution

        Set-MMCSSGamingTweaks

        Enable-GameMode

        Enable-NativeNVMe -Enable $EnableNativeNVMe

        Write-Log "Performance optimizations complete" "SUCCESS"
        Write-Log "IMPORTANT: Reboot required for HPET, MSI mode, and Native NVMe changes" "INFO"
        Write-Log "Run timer-tool.ps1 during gameplay for 0.5-1.0ms timer resolution" "INFO"

    } catch {
        Write-Log "Error applying performance optimizations: $_" "ERROR"
        throw
    }
}


function Undo-PerformanceOptimizations {
    Write-Log "Rolling back performance optimizations..." "INFO"

    try {
        bcdedit /deletevalue useplatformclock 2>&1 | Out-Null
        bcdedit /deletevalue disabledynamictick 2>&1 | Out-Null

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

        # Disable Native NVMe if it was enabled
        Disable-NativeNVMe | Out-Null

        Write-Log "Performance optimization rollback complete (restart required)" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}


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
    'Test-NVMeSupport',
    'Enable-NativeNVMe',
    'Disable-NativeNVMe',
    'Test-NativeNVMeStatus',
    'Test-PerformanceOptimizations',
    'Invoke-PerformanceOptimizations',
    'Undo-PerformanceOptimizations'
)

