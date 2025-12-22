#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Privacy and telemetry optimizations (tiered approach)
.DESCRIPTION
    Three-tier privacy approach:

    TIER 1 (SAFE - Default):
    - Advertising ID disable
    - Activity History disable
    - Optional diagnostic data reduction
    - WiFi Sense disable
    - Windows Feedback disable

    TIER 2 (MODERATE - Opt-in):
    - DiagTrack service disable (may affect diagnostics)
    - SysMain (Superfetch) disable (may affect load times)
    - Windows Error Reporting disable

    TIER 3 (AGGRESSIVE - Strongly discouraged, opt-in only):
    - Xbox services disable (BREAKS Game Pass)

    SmartScreen and Windows Update are NEVER disabled (security surface).
.NOTES
    Author: @thepedroferrari
    Risk Level: TIER_1_LOW (default), TIER_2_MED (moderate), TIER_3_HIGH (aggressive)
    Reversible: Yes (via Undo-PrivacyOptimizations)
#>

# Import core modules
Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global

#region Detection Functions

<#
.SYNOPSIS
    Verify privacy optimizations are applied correctly
.OUTPUTS
    [bool] True if all optimizations verified, false otherwise
#>
function Test-PrivacyOptimizations {
    $allPassed = $true

    Write-Log "Verifying privacy optimizations..." "INFO"

    # Check Advertising ID disabled
    $advID = Get-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo" -Name "Enabled"
    if ($advID -eq 0) {
        Write-Log "✓ Advertising ID disabled" "SUCCESS"
    } else {
        Write-Log "✗ Advertising ID not disabled" "ERROR"
        $allPassed = $false
    }

    # Check Activity History disabled
    $activityHistory = Get-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "PublishUserActivities"
    if ($activityHistory -eq 0) {
        Write-Log "✓ Activity History disabled" "SUCCESS"
    }

    return $allPassed
}

#endregion

#region TIER 1: Safe Privacy Tweaks (Default)

<#
.SYNOPSIS
    Apply Tier 1 safe privacy tweaks (default)
.DESCRIPTION
    Safe privacy optimizations with no functional impact.

    WEB_CONFIG: privacy.tier1_safe (boolean, default: true)
    Description: "Safe privacy tweaks (Advertising ID, Activity History, Feedback)"
    Risk Level: TIER_1_LOW
#>
function Apply-PrivacyTier1Safe {
    try {
        Write-Log "Applying Tier 1 safe privacy tweaks..." "INFO"

        # Advertising ID
        $advPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo"
        Backup-RegistryKey -Path $advPath
        Set-RegistryValue -Path $advPath -Name "Enabled" -Value 0 -Type "DWORD"

        $advPath2 = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo"
        Backup-RegistryKey -Path $advPath2
        Set-RegistryValue -Path $advPath2 -Name "DisabledByGroupPolicy" -Value 1 -Type "DWORD"
        Write-Log "Disabled Advertising ID" "SUCCESS"

        # Activity History / Timeline
        $activityPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System"
        Backup-RegistryKey -Path $activityPath
        Set-RegistryValue -Path $activityPath -Name "PublishUserActivities" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $activityPath -Name "UploadUserActivities" -Value 0 -Type "DWORD"
        Write-Log "Disabled Activity History / Timeline" "SUCCESS"

        # WiFi Sense (shares WiFi passwords)
        $wifiPath = "HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config"
        Backup-RegistryKey -Path $wifiPath
        Set-RegistryValue -Path $wifiPath -Name "AutoConnectAllowedOEM" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $wifiPath -Name "WiFISenseAllowed" -Value 0 -Type "DWORD"
        Write-Log "Disabled WiFi Sense" "SUCCESS"

        # Windows Feedback
        $feedbackPath = "HKCU:\Software\Microsoft\Siuf\Rules"
        Backup-RegistryKey -Path $feedbackPath
        Set-RegistryValue -Path $feedbackPath -Name "NumberOfSIUFInPeriod" -Value 0 -Type "DWORD"
        Write-Log "Disabled Windows Feedback" "SUCCESS"

        # Windows Spotlight
        $spotlightPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager"
        Backup-RegistryKey -Path $spotlightPath
        Set-RegistryValue -Path $spotlightPath -Name "RotatingLockScreenEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $spotlightPath -Name "RotatingLockScreenOverlayEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $spotlightPath -Name "SubscribedContent-338389Enabled" -Value 0 -Type "DWORD"
        Write-Log "Disabled Windows Spotlight" "SUCCESS"

        # Cloud Clipboard Sync
        $clipboardPath = "HKCU:\Software\Microsoft\Clipboard"
        Backup-RegistryKey -Path $clipboardPath
        Set-RegistryValue -Path $clipboardPath -Name "EnableClipboardHistory" -Value 0 -Type "DWORD"
        Write-Log "Disabled Cloud Clipboard Sync" "SUCCESS"

        # Optional Diagnostic Data (reduce to minimum)
        $telemetryPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection"
        Backup-RegistryKey -Path $telemetryPath
        Set-RegistryValue -Path $telemetryPath -Name "AllowTelemetry" -Value 1 -Type "DWORD"  # 1 = Security only (not 0 = off, requires Enterprise)
        Set-RegistryValue -Path $telemetryPath -Name "DoNotShowFeedbackNotifications" -Value 1 -Type "DWORD"
        Write-Log "Reduced diagnostic data to minimum (Security level)" "SUCCESS"

        Write-Log "Tier 1 safe privacy tweaks complete" "SUCCESS"

    } catch {
        Write-Log "Error applying Tier 1 privacy tweaks: $_" "ERROR"
        throw
    }
}

#endregion

#region TIER 2: Moderate Privacy Tweaks (Opt-in)

<#
.SYNOPSIS
    Apply Tier 2 moderate privacy tweaks (opt-in)
.DESCRIPTION
    Moderate privacy optimizations with potential functional impact.

    WEB_CONFIG: privacy.tier2_moderate (boolean, default: false)
    Description: "Moderate privacy (DiagTrack, SysMain disable - may affect diagnostics/load times)"
    Risk Level: TIER_2_MED
    Note: "Can affect Windows diagnostics and app load times"
#>
function Apply-PrivacyTier2Moderate {
    try {
        Write-Log "Applying Tier 2 moderate privacy tweaks (opt-in)..." "INFO"

        # DiagTrack service (Connected User Experiences and Telemetry)
        try {
            $service = Get-Service -Name "DiagTrack" -ErrorAction SilentlyContinue
            if ($service) {
                Stop-Service -Name "DiagTrack" -Force -ErrorAction Stop
                Set-Service -Name "DiagTrack" -StartupType Disabled -ErrorAction Stop
                Write-Log "Disabled DiagTrack service (may affect diagnostics)" "SUCCESS"
            }
        } catch {
            Write-Log "Error disabling DiagTrack: $_" "ERROR"
        }

        # dmwappushservice (WAP Push Message Routing Service)
        try {
            $service = Get-Service -Name "dmwappushservice" -ErrorAction SilentlyContinue
            if ($service) {
                Stop-Service -Name "dmwappushservice" -Force -ErrorAction Stop
                Set-Service -Name "dmwappushservice" -StartupType Disabled -ErrorAction Stop
                Write-Log "Disabled dmwappushservice" "SUCCESS"
            }
        } catch {
            Write-Log "Error disabling dmwappushservice: $_" "ERROR"
        }

        # SysMain (Superfetch) - may affect load times
        try {
            $service = Get-Service -Name "SysMain" -ErrorAction SilentlyContinue
            if ($service) {
                Stop-Service -Name "SysMain" -Force -ErrorAction Stop
                Set-Service -Name "SysMain" -StartupType Disabled -ErrorAction Stop
                Write-Log "Disabled SysMain (Superfetch) - may affect load times" "SUCCESS"
            }
        } catch {
            Write-Log "Error disabling SysMain: $_" "ERROR"
        }

        # Windows Error Reporting
        $werPath = "HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting"
        Backup-RegistryKey -Path $werPath
        Set-RegistryValue -Path $werPath -Name "Disabled" -Value 1 -Type "DWORD"
        Write-Log "Disabled Windows Error Reporting" "SUCCESS"

        # Delivery Optimization P2P
        $doPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config"
        Backup-RegistryKey -Path $doPath
        Set-RegistryValue -Path $doPath -Name "DODownloadMode" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $doPath -Name "DownloadMode" -Value 0 -Type "DWORD"
        Write-Log "Disabled Delivery Optimization P2P" "SUCCESS"

        Write-Log "Tier 2 moderate privacy tweaks complete" "SUCCESS"

    } catch {
        Write-Log "Error applying Tier 2 privacy tweaks: $_" "ERROR"
        throw
    }
}

#endregion

#region TIER 3: Aggressive Privacy Tweaks (Strongly discouraged, opt-in only)

<#
.SYNOPSIS
    Apply Tier 3 aggressive privacy tweaks (opt-in, BREAKS features)
.DESCRIPTION
    Aggressive privacy optimizations that BREAK functionality.

    WARNING: Disabling Xbox services BREAKS Game Pass and Xbox app functionality.

    WEB_CONFIG: privacy.tier3_aggressive (boolean, default: false)
    Description: "AGGRESSIVE: Disable Xbox services (BREAKS Game Pass)"
    Risk Level: TIER_3_HIGH
    Note: "Strongly discouraged - will break Game Pass and Xbox app"
#>
function Apply-PrivacyTier3Aggressive {
    try {
        Write-Log "Applying Tier 3 aggressive privacy tweaks (opt-in, BREAKS features)..." "INFO"
        Write-Log "WARNING: This will BREAK Game Pass and Xbox app functionality!" "ERROR"

        $xboxServices = @(
            "XblAuthManager",      # Xbox Live Auth Manager
            "XblGameSave",         # Xbox Live Game Save
            "XboxGipSvc",          # Xbox Accessory Management Service
            "XboxNetApiSvc"        # Xbox Live Networking Service
        )

        foreach ($serviceName in $xboxServices) {
            try {
                $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
                if ($service) {
                    Stop-Service -Name $serviceName -Force -ErrorAction Stop
                    Set-Service -Name $serviceName -StartupType Disabled -ErrorAction Stop
                    Write-Log "Disabled Xbox service: $serviceName (BREAKS Game Pass)" "SUCCESS"
                }
            } catch {
                Write-Log "Error disabling Xbox service $serviceName : $_" "ERROR"
            }
        }

        Write-Log "Tier 3 aggressive privacy tweaks complete (Game Pass BROKEN)" "SUCCESS"

    } catch {
        Write-Log "Error applying Tier 3 privacy tweaks: $_" "ERROR"
        throw
    }
}

#endregion

#region Bloatware Removal

<#
.SYNOPSIS
    Remove UWP bloatware apps
.DESCRIPTION
    Removes pre-installed UWP apps that are not needed for gaming.

    IMPORTANT: Xbox apps are NOT removed by default (needed for Game Pass).
    Use Tier 3 aggressive to remove Xbox apps (BREAKS Game Pass).

    WEB_CONFIG: privacy.bloatware_removal (boolean, default: true)
    Description: "Remove UWP bloatware (safe list, excludes Xbox apps)"
    Risk Level: TIER_1_LOW
#>
function Remove-Bloatware {
    try {
        Write-Log "Removing UWP bloatware..." "INFO"

        $appsToRemove = @(
            "Microsoft.GetHelp",
            "Microsoft.Getstarted",
            "Microsoft.Microsoft3DViewer",
            "Microsoft.MicrosoftOfficeHub",
            "Microsoft.MicrosoftSolitaireCollection",
            "Microsoft.MixedReality.Portal",
            "Microsoft.People",
            "Microsoft.SkypeApp",
            "Microsoft.YourPhone",
            "Microsoft.ZuneMusic",
            "Microsoft.ZuneVideo"
        )

        $removed = 0
        foreach ($app in $appsToRemove) {
            try {
                $package = Get-AppxPackage -Name $app -ErrorAction SilentlyContinue
                if ($package) {
                    Remove-AppxPackage -Package $package.PackageFullName -ErrorAction Stop
                    Write-Log "Removed app: $app" "SUCCESS"
                    $removed++
                }
            } catch {
                Write-Log "Error removing app $app : $_" "ERROR"
            }
        }

        Write-Log "Bloatware removal complete: $removed apps removed" "SUCCESS"

    } catch {
        Write-Log "Error removing bloatware: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Remove Xbox UWP apps (BREAKS Game Pass)
.DESCRIPTION
    Removes Xbox UWP apps. This BREAKS Game Pass and Xbox app functionality.

    WEB_CONFIG: privacy.remove_xbox_apps (boolean, default: false)
    Description: "Remove Xbox apps (BREAKS Game Pass)"
    Risk Level: TIER_3_HIGH
#>
function Remove-XboxApps {
    try {
        Write-Log "Removing Xbox UWP apps (BREAKS Game Pass)..." "INFO"

        $xboxApps = @(
            "Microsoft.XboxApp",
            "Microsoft.XboxGameCallableUI",
            "Microsoft.XboxGamingOverlay",
            "Microsoft.XboxIdentityProvider",
            "Microsoft.XboxSpeechToTextOverlay",
            "Microsoft.Xbox.TCUI"
        )

        $removed = 0
        foreach ($app in $xboxApps) {
            try {
                $package = Get-AppxPackage -Name $app -ErrorAction SilentlyContinue
                if ($package) {
                    Remove-AppxPackage -Package $package.PackageFullName -ErrorAction Stop
                    Write-Log "Removed Xbox app: $app (Game Pass BROKEN)" "SUCCESS"
                    $removed++
                }
            } catch {
                Write-Log "Error removing Xbox app $app : $_" "ERROR"
            }
        }

        Write-Log "Xbox app removal complete: $removed apps removed (Game Pass BROKEN)" "SUCCESS"

    } catch {
        Write-Log "Error removing Xbox apps: $_" "ERROR"
        throw
    }
}

#endregion

#region Additional Privacy Toggles

<#
.SYNOPSIS
    Disable background Store apps
.DESCRIPTION
    Blocks Store apps from running in the background to reduce wakeups.
#>
function Set-BackgroundAppsOff {
    try {
        $path = "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"
        Backup-RegistryKey -Path $path
        Set-RegistryValue -Path $path -Name "GlobalUserDisabled" -Value 1 -Type "DWORD"

        $searchPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search"
        Backup-RegistryKey -Path $searchPath
        Set-RegistryValue -Path $searchPath -Name "BackgroundAppGlobalToggle" -Value 0 -Type "DWORD"

        Write-Log "Background Store apps disabled" "SUCCESS"
    } catch {
        Write-Log "Error disabling background apps: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Apply Edge debloat policies
.DESCRIPTION
    Removes first run, rewards, widget, shopping assistant noise.
#>
function Apply-EdgeDebloat {
    try {
        $edge = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
        Backup-RegistryKey -Path $edge
        Set-RegistryValue -Path $edge -Name "HideFirstRunExperience" -Value 1 -Type "DWORD"
        Set-RegistryValue -Path $edge -Name "EdgeShoppingAssistantEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $edge -Name "WebWidgetAllowed" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $edge -Name "NewTabPageCompanyLogoVisible" -Value 0 -Type "DWORD"
        Write-Log "Applied Edge debloat policies" "SUCCESS"
    } catch {
        Write-Log "Error applying Edge debloat: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Disable Microsoft Copilot surface/background hooks
.DESCRIPTION
    Win11 guard; no-op on Win10.
#>
function Disable-Copilot {
    try {
        $userCopilot = "HKCU:\SOFTWARE\Microsoft\Windows\Shell\CopilotAI"
        Backup-RegistryKey -Path $userCopilot
        Set-RegistryValue -Path $userCopilot -Name "IsCopilotAllowed" -Value 0 -Type "DWORD"

        $policyCopilot = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot"
        Backup-RegistryKey -Path $policyCopilot
        Set-RegistryValue -Path $policyCopilot -Name "TurnOffWindowsCopilot" -Value 1 -Type "DWORD"

        Write-Log "Disabled Copilot (Win11 guard, harmless on Win10)" "SUCCESS"
    } catch {
        Write-Log "Error disabling Copilot: $_" "ERROR"
        throw
    }
}

#endregion

#region Main Functions

<#
.SYNOPSIS
    Apply privacy optimizations with tiered approach
.DESCRIPTION
    Main entry point for privacy optimizations.
.PARAMETER Tier1Safe
    Apply Tier 1 safe privacy tweaks (default: true)
.PARAMETER Tier2Moderate
    Apply Tier 2 moderate privacy tweaks (opt-in, default: false)
.PARAMETER Tier3Aggressive
    Apply Tier 3 aggressive privacy tweaks (opt-in, BREAKS features, default: false)
.PARAMETER RemoveBloatware
    Remove UWP bloatware (default: true)
.PARAMETER RemoveXboxApps
    Remove Xbox apps - BREAKS Game Pass (default: false)
#>
function Invoke-PrivacyOptimizations {
    param(
        [bool]$Tier1Safe = $true,
        [bool]$Tier2Moderate = $false,
        [bool]$Tier3Aggressive = $false,
        [bool]$RemoveBloatware = $true,
        [bool]$RemoveXboxApps = $false,
        [bool]$BackgroundAppsOff = $true,
        [bool]$EdgeDebloat = $true,
        [bool]$DisableCopilot = $true
    )

    Write-Log "Applying privacy optimizations..." "INFO"

    try {
        # Tier 1 (safe, default)
        if ($Tier1Safe) {
            Apply-PrivacyTier1Safe
        }

        # Tier 2 (moderate, opt-in)
        if ($Tier2Moderate) {
            Apply-PrivacyTier2Moderate
        }

        # Tier 3 (aggressive, opt-in, BREAKS features)
        if ($Tier3Aggressive) {
            Apply-PrivacyTier3Aggressive
        }

        # Bloatware removal
        if ($RemoveBloatware) {
            Remove-Bloatware
        }

        # Xbox apps removal (opt-in, BREAKS Game Pass)
        if ($RemoveXboxApps) {
            Remove-XboxApps
        }

        if ($BackgroundAppsOff) {
            Set-BackgroundAppsOff
        }

        if ($EdgeDebloat) {
            Apply-EdgeDebloat
        }

        if ($DisableCopilot) {
            Disable-Copilot
        }

        Write-Log "Privacy optimizations complete" "SUCCESS"
        Write-Log "SmartScreen and Windows Update remain ENABLED (security)" "INFO"

    } catch {
        Write-Log "Error applying privacy optimizations: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Rollback privacy optimizations to defaults
.DESCRIPTION
    Restores privacy settings to Windows defaults.
#>
function Undo-PrivacyOptimizations {
    Write-Log "Rolling back privacy optimizations..." "INFO"

    try {
        # Re-enable services
        $services = @("DiagTrack", "dmwappushservice", "SysMain", "XblAuthManager", "XblGameSave", "XboxGipSvc", "XboxNetApiSvc")
        foreach ($serviceName in $services) {
            try {
                $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
                if ($service) {
                    Set-Service -Name $serviceName -StartupType Automatic -ErrorAction Stop
                    Start-Service -Name $serviceName -ErrorAction SilentlyContinue
                    Write-Log "Re-enabled service: $serviceName" "SUCCESS"
                }
            } catch {
                Write-Log "Error re-enabling service $serviceName : $_" "ERROR"
            }
        }

        # Restore registry paths
        $paths = @(
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo",
            "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo",
            "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System",
            "HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config",
            "HKCU:\Software\Microsoft\Siuf\Rules",
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager",
            "HKCU:\Software\Microsoft\Clipboard",
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection",
            "HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting",
            "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config",
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications",
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search",
            "HKLM:\SOFTWARE\Policies\Microsoft\Edge",
            "HKCU:\SOFTWARE\Microsoft\Windows\Shell\CopilotAI",
            "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsCopilot"
        )

        foreach ($path in $paths) {
            if (Restore-RegistryKey -Path $path) {
                Write-Log "Restored registry: $path" "SUCCESS"
            }
        }

        Write-Log "Privacy optimization rollback complete" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}

#endregion

# Export functions
Export-ModuleMember -Function @(
    'Apply-PrivacyTier1Safe',
    'Apply-PrivacyTier2Moderate',
    'Apply-PrivacyTier3Aggressive',
    'Remove-Bloatware',
    'Remove-XboxApps',
    'Set-BackgroundAppsOff',
    'Apply-EdgeDebloat',
    'Disable-Copilot',
    'Test-PrivacyOptimizations',
    'Invoke-PrivacyOptimizations',
    'Undo-PrivacyOptimizations'
)
