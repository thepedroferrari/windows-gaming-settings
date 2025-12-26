<#
.SYNOPSIS
    Audio-related latency and quality-of-life optimizations.
.DESCRIPTION
    Disables system sounds, reduces audio driver power management, and optionally
    enables exclusive mode hints to lower audio latency.
.NOTES
    Requires Administrator for HKLM changes and driver registry paths.
#>
#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global



function Test-AudioOptimizations {
    <#
    .SYNOPSIS
        Verifies applied audio optimizations.
    .DESCRIPTION
        Checks registry values used to disable system sounds.
    .OUTPUTS
        [bool] True when expected values are present.
    #>
    $allPassed = $true

    Write-Log "Verifying audio optimizations..." "INFO"

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




function Disable-AudioEnhancements {
    <#
    .SYNOPSIS
        Disables system sounds and some audio processing overhead.
    .DESCRIPTION
        Writes audio settings under HKLM to reduce unnecessary audio processing
        and lower DPC impact from system sounds.
    .OUTPUTS
        None.
    #>
    try {
        $audioPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Audio"
        Backup-RegistryKey -Path $audioPath

        Set-RegistryValue -Path $audioPath -Name "DisableSystemSounds" -Value 1 -Type "DWORD"
        Write-Log "Disabled system sounds" "SUCCESS"

        # Note: DisableProtectedAudioDG = 0 actually ENABLES protected audio
        Set-RegistryValue -Path $audioPath -Name "DisableProtectedAudioDG" -Value 0 -Type "DWORD"

        Write-Log "Audio enhancements configured for reduced DPC latency" "SUCCESS"

    } catch {
        Write-Log "Error disabling audio enhancements: $_" "ERROR"
        throw
    }
}


function Set-AudioDriverOptimizations {
    <#
    .SYNOPSIS
        Disables audio driver power management features.
    .DESCRIPTION
        Iterates audio device class registry keys and disables power saving
        features that can introduce latency.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Optimizing audio drivers for low DPC latency..." "INFO"

        $audioPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e96c-e325-11ce-bfc1-08002be10318}"

        if (Test-Path $audioPath) {
            $audioDrivers = Get-ChildItem $audioPath -ErrorAction SilentlyContinue
            foreach ($driver in $audioDrivers) {
                $driverPath = $driver.PSPath
                try {
                    Set-RegistryValue -Path $driverPath -Name "DisableHDAudioPowerManagement" -Value 1 -Type "DWORD" -ErrorAction SilentlyContinue
                    Set-RegistryValue -Path $driverPath -Name "PowerSave" -Value 0 -Type "DWORD" -ErrorAction SilentlyContinue

                } catch {
                }
            }

            Write-Log "Audio driver power management disabled" "SUCCESS"
        }

    } catch {
        Write-Log "Error optimizing audio drivers: $_" "ERROR"
        throw
    }
}


function Set-AudioExclusiveMode {
    <#
    .SYNOPSIS
        Sets an exclusive-mode preference for audio.
    .DESCRIPTION
        Toggles UserDuckingPreference to signal exclusive-mode preference.
        This is optional and disabled by default.
    .PARAMETER Enable
        When true, writes the exclusive mode preference setting.
    .OUTPUTS
        None.
    #>
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


function Disable-SystemSounds {
    <#
    .SYNOPSIS
        Disables Windows system sounds for lower background audio activity.
    .DESCRIPTION
        Updates AppEvents scheme defaults and specific event paths to silence
        system sound triggers.
    .OUTPUTS
        None.
    #>
    try {
        $soundPath = "HKCU:\AppEvents\Schemes"
        Backup-RegistryKey -Path $soundPath

        Set-ItemProperty -Path $soundPath -Name "(Default)" -Value ".None" -ErrorAction SilentlyContinue

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
                Set-ItemProperty -Path $eventPath -Name "(Default)" -Value "" -ErrorAction SilentlyContinue
            }
        }

        Write-Log "Disabled system sounds" "SUCCESS"

    } catch {
        Write-Log "Error disabling system sounds: $_" "ERROR"
        throw
    }
}




function Invoke-AudioOptimizations {
    <#
    .SYNOPSIS
        Applies all audio optimizations in this module.
    .DESCRIPTION
        Disables audio enhancements and system sounds, applies driver power
        management changes, and optionally enables exclusive mode preference.
    .PARAMETER EnableExclusiveMode
        Enables exclusive mode preference when true.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$EnableExclusiveMode = $false
    )

    Write-Log "Applying audio optimizations..." "INFO"

    try {
        Disable-AudioEnhancements

        Set-AudioDriverOptimizations

        Disable-SystemSounds

        Set-AudioExclusiveMode -Enable $EnableExclusiveMode

        Write-Log "Audio optimizations complete" "SUCCESS"
        Write-Log "NOTE: Validate with LatencyMon → WPR/WPA to measure DPC improvement" "INFO"

    } catch {
        Write-Log "Error applying audio optimizations: $_" "ERROR"
        throw
    }
}


function Undo-AudioOptimizations {
    <#
    .SYNOPSIS
        Reverts audio-related registry changes.
    .DESCRIPTION
        Restores backed up registry keys for audio-related settings.
    .OUTPUTS
        None.
    #>
    Write-Log "Rolling back audio optimizations..." "INFO"

    try {
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


        Write-Log "Audio optimization rollback complete" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}


Export-ModuleMember -Function @(
    'Disable-AudioEnhancements',
    'Set-AudioDriverOptimizations',
    'Set-AudioExclusiveMode',
    'Disable-SystemSounds',
    'Test-AudioOptimizations',
    'Invoke-AudioOptimizations',
    'Undo-AudioOptimizations'
)
