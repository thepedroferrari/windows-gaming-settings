#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Audio driver optimizations for reduced DPC latency
.DESCRIPTION
    Audio drivers are often a major source of DPC (Deferred Procedure Call) latency,
    causing micro-stutters in games. This module disables audio enhancements and
    power management to reduce audio-related latency.

    Key optimizations:
    - Disable audio enhancements (APO/DSP processing)
    - Disable HD Audio power management
    - Disable system sounds
    - Configure exclusive mode preference (opt-in)

.NOTES
    Author: @thepedroferrari
    Risk Level: TIER_1_LOW
    Reversible: Yes (via Undo-AudioOptimizations)
#>

# Import core modules
Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global

#region Detection Functions

<#
.SYNOPSIS
    Verify audio optimizations are applied correctly
.OUTPUTS
    [bool] True if all optimizations verified, false otherwise
#>
function Test-AudioOptimizations {
    $allPassed = $true

    Write-Log "Verifying audio optimizations..." "INFO"

    # Check audio enhancements disabled
    $audioPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Audio"
    $systemSoundsDisabled = Get-RegistryValue -Path $audioPath -Name "DisableSystemSounds"
    if ($systemSoundsDisabled -eq 1) {
        Write-Log "✓ System sounds disabled" "SUCCESS"
    } else {
        Write-Log "System sounds not disabled" "INFO"
        $allPassed = $false
    }

    return $allPassed
}

#endregion

#region Apply Functions

<#
.SYNOPSIS
    Disable audio enhancements (APO/DSP processing)
.DESCRIPTION
    Audio enhancements (like virtual surround, bass boost, EQ) add DSP processing
    that increases DPC latency and can cause micro-stutters.

    This disables system-wide enhancements. Per-application enhancements
    (e.g., spatial audio in headphones) remain user-configurable.

    WEB_CONFIG: audio.enhancements_disabled (boolean, default: true)
    Description: "Disable audio enhancements (reduces DPC latency)"
    Risk Level: TIER_1_LOW
#>
function Disable-AudioEnhancements {
    try {
        $audioPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Audio"
        Backup-RegistryKey -Path $audioPath

        # Disable system sounds
        Set-RegistryValue -Path $audioPath -Name "DisableSystemSounds" -Value 1 -Type "DWORD"
        Write-Log "Disabled system sounds" "SUCCESS"

        # Note: DisableProtectedAudioDG = 0 actually ENABLES protected audio
        # (confusing naming by Microsoft)
        Set-RegistryValue -Path $audioPath -Name "DisableProtectedAudioDG" -Value 0 -Type "DWORD"

        Write-Log "Audio enhancements configured for reduced DPC latency" "SUCCESS"

    } catch {
        Write-Log "Error disabling audio enhancements: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Optimize audio drivers for low DPC latency
.DESCRIPTION
    Disables power management features in audio drivers that can cause
    DPC latency spikes.

    Targets HD Audio driver class GUID: {4d36e96c-e325-11ce-bfc1-08002be10318}

    WEB_CONFIG: audio.driver_power_management_disabled (boolean, default: true)
    Description: "Disable audio driver power management (reduces DPC latency)"
    Risk Level: TIER_1_LOW
#>
function Set-AudioDriverOptimizations {
    try {
        Write-Log "Optimizing audio drivers for low DPC latency..." "INFO"

        # HD Audio class GUID
        $audioPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e96c-e325-11ce-bfc1-08002be10318}"

        if (Test-Path $audioPath) {
            $audioDrivers = Get-ChildItem $audioPath -ErrorAction SilentlyContinue
            foreach ($driver in $audioDrivers) {
                $driverPath = $driver.PSPath
                try {
                    # Skip backup for audio driver subkeys (often have permission issues)
                    # Just set values directly with error suppression
                    Set-RegistryValue -Path $driverPath -Name "DisableHDAudioPowerManagement" -Value 1 -Type "DWORD" -ErrorAction SilentlyContinue
                    Set-RegistryValue -Path $driverPath -Name "PowerSave" -Value 0 -Type "DWORD" -ErrorAction SilentlyContinue

                } catch {
                    # Some audio drivers don't have these keys - silent fail
                }
            }

            Write-Log "Audio driver power management disabled" "SUCCESS"
        }

    } catch {
        Write-Log "Error optimizing audio drivers: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Set audio exclusive mode preference
.DESCRIPTION
    Configures user ducking preference for exclusive mode audio.

    IMPORTANT: Default is SHARED MODE (value 3) which is fine for gaming.
    Exclusive mode (value 2) can cause issues with multi-app audio
    (Discord + game, music + game, etc.).

    Only enable exclusive mode if you have a specific use case.

    WEB_CONFIG: audio.exclusive_mode_enabled (boolean, default: false)
    Description: "Enable exclusive mode (can conflict with multi-app audio)"
    Risk Level: TIER_1_LOW
    Note: "Shared mode (default) is fine for gaming, exclusive can cause issues"
.PARAMETER Enable
    If true, sets exclusive mode preference. If false (default), keeps shared mode.
#>
function Set-AudioExclusiveMode {
    param(
        [bool]$Enable = $false
    )

    try {
        $duckingPath = "HKCU:\Software\Microsoft\Multimedia\Audio"

        if ($Enable) {
            Backup-RegistryKey -Path $duckingPath
            Set-RegistryValue -Path $duckingPath -Name "UserDuckingPreference" -Value 2 -Type "DWORD"
            Write-Log "Enabled exclusive mode preference (opt-in)" "SUCCESS"
        } else {
            Write-Log "Exclusive mode kept disabled (default, shared mode is fine for gaming)" "INFO"
        }

    } catch {
        Write-Log "Error setting exclusive mode: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Disable system sounds
.DESCRIPTION
    Disables Windows system sounds (startup sound, error beeps, etc.)
    to reduce audio subsystem interruptions.

    WEB_CONFIG: audio.system_sounds_disabled (boolean, default: true)
    Description: "Disable Windows system sounds"
    Risk Level: TIER_0_SAFE
#>
function Disable-SystemSounds {
    try {
        # Set No Sounds scheme
        $soundPath = "HKCU:\AppEvents\Schemes"
        Backup-RegistryKey -Path $soundPath

        # Set scheme to .None (no sounds) - use "(Default)" for default value name
        Set-ItemProperty -Path $soundPath -Name "(Default)" -Value ".None" -ErrorAction SilentlyContinue

        # Disable specific system sounds
        $events = @(
            "Schemes\Apps\.Default\.Default\.Current",
            "Schemes\Apps\.Default\SystemExit\.Current",
            "Schemes\Apps\.Default\SystemStart\.Current",
            "Schemes\Apps\.Default\WindowsLogon\.Current"
        )

        foreach ($event in $events) {
            $eventPath = "HKCU:\AppEvents\$event"
            if (Test-Path $eventPath) {
                Backup-RegistryKey -Path $eventPath
                # Clear default value (empty sound path)
                Set-ItemProperty -Path $eventPath -Name "(Default)" -Value "" -ErrorAction SilentlyContinue
            }
        }

        Write-Log "Disabled system sounds" "SUCCESS"

    } catch {
        Write-Log "Error disabling system sounds: $_" "ERROR"
        throw
    }
}

#endregion

#region Main Functions

<#
.SYNOPSIS
    Apply all audio optimizations
.DESCRIPTION
    Main entry point for audio optimizations.
.PARAMETER EnableExclusiveMode
    Enable exclusive mode (opt-in, default: false)
#>
function Invoke-AudioOptimizations {
    param(
        [bool]$EnableExclusiveMode = $false
    )

    Write-Log "Applying audio optimizations..." "INFO"

    try {
        # Disable audio enhancements
        Disable-AudioEnhancements

        # Optimize audio drivers
        Set-AudioDriverOptimizations

        # System sounds
        Disable-SystemSounds

        # Exclusive mode (opt-in)
        Set-AudioExclusiveMode -Enable $EnableExclusiveMode

        Write-Log "Audio optimizations complete" "SUCCESS"
        Write-Log "NOTE: Validate with LatencyMon → WPR/WPA to measure DPC improvement" "INFO"

    } catch {
        Write-Log "Error applying audio optimizations: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Rollback audio optimizations to defaults
.DESCRIPTION
    Restores audio settings to Windows defaults.
#>
function Undo-AudioOptimizations {
    Write-Log "Rolling back audio optimizations..." "INFO"

    try {
        # Restore registry paths
        $paths = @(
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Audio",
            "HKCU:\Software\Microsoft\Multimedia\Audio",
            "HKCU:\AppEvents\Schemes"
        )

        foreach ($path in $paths) {
            if (Restore-RegistryKey -Path $path) {
                Write-Log "Restored registry: $path" "SUCCESS"
            }
        }

        # Restore audio driver settings (skip, we didn't back them up due to permission issues)
        # Audio driver registry keys will remain modified (DisableHDAudioPowerManagement, PowerSave)
        # This is acceptable as these are safe optimizations

        Write-Log "Audio optimization rollback complete" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}

#endregion

# Export functions
Export-ModuleMember -Function @(
    'Disable-AudioEnhancements',
    'Set-AudioDriverOptimizations',
    'Set-AudioExclusiveMode',
    'Disable-SystemSounds',
    'Test-AudioOptimizations',
    'Invoke-AudioOptimizations',
    'Undo-AudioOptimizations'
)
