<#
.SYNOPSIS
    Privacy-focused tweaks and optional debloat actions.
.DESCRIPTION
    Applies tiered privacy settings, reduces telemetry, removes select UWP apps,
    and configures Windows privacy-related policies.
.NOTES
    Requires Administrator. Tier 3 and Xbox removals can break Game Pass features.
#>
#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global



function Test-PrivacyOptimizations {
    <#
    .SYNOPSIS
        Verifies privacy-related registry values.
    .DESCRIPTION
        Checks advertising ID and activity history policies.
    .OUTPUTS
        [bool] True when checks pass, else false.
    #>
    $allPassed = $true

    Write-Log "Verifying privacy optimizations..." "INFO"

    $advID = Get-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo" -Name "Enabled"
    if ($advID -eq 0) {
        Write-Log "✓ Advertising ID disabled" "SUCCESS"
    } else {
        Write-Log "✗ Advertising ID not disabled" "ERROR"
        $allPassed = $false
    }

    $activityHistory = Get-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "PublishUserActivities"
    if ($activityHistory -eq 0) {
        Write-Log "✓ Activity History disabled" "SUCCESS"
    }

    return $allPassed
}




function Apply-PrivacyTier1Safe {
    <#
    .SYNOPSIS
        Applies Tier 1 privacy settings (safe defaults).
    .DESCRIPTION
        Disables advertising ID, activity history, WiFi Sense, feedback prompts,
        spotlight content, cloud clipboard, and reduces telemetry level.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Applying Tier 1 safe privacy tweaks..." "INFO"

        $advPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo"
        Backup-RegistryKey -Path $advPath
        Set-RegistryValue -Path $advPath -Name "Enabled" -Value 0 -Type "DWORD"

        $advPath2 = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo"
        Backup-RegistryKey -Path $advPath2
        Set-RegistryValue -Path $advPath2 -Name "DisabledByGroupPolicy" -Value 1 -Type "DWORD"
        Write-Log "Disabled Advertising ID" "SUCCESS"

        $activityPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System"
        Backup-RegistryKey -Path $activityPath
        Set-RegistryValue -Path $activityPath -Name "PublishUserActivities" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $activityPath -Name "UploadUserActivities" -Value 0 -Type "DWORD"
        Write-Log "Disabled Activity History / Timeline" "SUCCESS"

        $wifiPath = "HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config"
        Backup-RegistryKey -Path $wifiPath
        Set-RegistryValue -Path $wifiPath -Name "AutoConnectAllowedOEM" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $wifiPath -Name "WiFISenseAllowed" -Value 0 -Type "DWORD"
        Write-Log "Disabled WiFi Sense" "SUCCESS"

        $feedbackPath = "HKCU:\Software\Microsoft\Siuf\Rules"
        Backup-RegistryKey -Path $feedbackPath
        Set-RegistryValue -Path $feedbackPath -Name "NumberOfSIUFInPeriod" -Value 0 -Type "DWORD"
        Write-Log "Disabled Windows Feedback" "SUCCESS"

        $spotlightPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager"
        Backup-RegistryKey -Path $spotlightPath
        Set-RegistryValue -Path $spotlightPath -Name "RotatingLockScreenEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $spotlightPath -Name "RotatingLockScreenOverlayEnabled" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $spotlightPath -Name "SubscribedContent-338389Enabled" -Value 0 -Type "DWORD"
        Write-Log "Disabled Windows Spotlight" "SUCCESS"

        $clipboardPath = "HKCU:\Software\Microsoft\Clipboard"
        Backup-RegistryKey -Path $clipboardPath
        Set-RegistryValue -Path $clipboardPath -Name "EnableClipboardHistory" -Value 0 -Type "DWORD"
        Write-Log "Disabled Cloud Clipboard Sync" "SUCCESS"

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




function Apply-PrivacyTier2Moderate {
    <#
    .SYNOPSIS
        Applies Tier 2 privacy settings (moderate).
    .DESCRIPTION
        Disables telemetry-related services and delivery optimization.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Applying Tier 2 moderate privacy tweaks (opt-in)..." "INFO"

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

        $werPath = "HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting"
        Backup-RegistryKey -Path $werPath
        Set-RegistryValue -Path $werPath -Name "Disabled" -Value 1 -Type "DWORD"
        Write-Log "Disabled Windows Error Reporting" "SUCCESS"

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




function Apply-PrivacyTier3Aggressive {
    <#
    .SYNOPSIS
        Applies Tier 3 privacy settings (aggressive).
    .DESCRIPTION
        Disables Xbox/Game Pass services and other components that can break
        Microsoft gaming features.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Applying Tier 3 aggressive privacy tweaks (opt-in, BREAKS features)..." "INFO"
        Write-Log "WARNING: This will BREAK Game Pass and Xbox app functionality!" "ERROR"

        $xboxServices = @(
            "XblAuthManager",
            "XblGameSave",
            "XboxGipSvc",
            "XboxNetApiSvc"
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




function Remove-Bloatware {
    <#
    .SYNOPSIS
        Removes selected built-in UWP apps.
    .DESCRIPTION
        Uninstalls a curated list of consumer apps for a leaner system.
    .OUTPUTS
        None.
    #>
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


function Remove-XboxApps {
    <#
    .SYNOPSIS
        Removes Xbox-related UWP apps.
    .DESCRIPTION
        Uninstalls Xbox UWP apps. This breaks Game Pass and Xbox app features.
    .OUTPUTS
        None.
    #>
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




function Set-BackgroundAppsOff {
    <#
    .SYNOPSIS
        Disables background UWP app activity.
    .DESCRIPTION
        Turns off background app access and related search toggles.
    .OUTPUTS
        None.
    #>
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


function Apply-EdgeDebloat {
    <#
    .SYNOPSIS
        Applies Microsoft Edge policy debloat settings.
    .DESCRIPTION
        Disables select Edge UI features and prompts via policy keys.
    .OUTPUTS
        None.
    #>
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


function Disable-Copilot {
    <#
    .SYNOPSIS
        Disables Windows Copilot.
    .DESCRIPTION
        Applies user and policy keys to disable Copilot UI on Windows 11.
    .OUTPUTS
        None.
    #>
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


function Disable-Notifications {
    <#
    .SYNOPSIS
        Disables Windows notification center and toast notifications.
    .DESCRIPTION
        Prevents popup distractions during gaming sessions.
        Disables both the notification center and individual toast popups.
    .PARAMETER Enable
        When true, disables notifications.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Disable notifications: skipped" "INFO"
        return
    }

    try {
        # Disable Notification Center
        $notifPath = "HKCU:\Software\Policies\Microsoft\Windows\Explorer"
        Backup-RegistryKey -Path $notifPath
        Set-RegistryValue -Path $notifPath -Name "DisableNotificationCenter" -Value 1 -Type "DWORD"

        # Disable toast notifications
        $toastPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications"
        Backup-RegistryKey -Path $toastPath
        Set-RegistryValue -Path $toastPath -Name "ToastEnabled" -Value 0 -Type "DWORD"

        # Disable lock screen notifications
        $lockPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Notifications\Settings"
        Backup-RegistryKey -Path $lockPath
        Set-RegistryValue -Path $lockPath -Name "NOC_GLOBAL_SETTING_ALLOW_TOASTS_ABOVE_LOCK" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $lockPath -Name "NOC_GLOBAL_SETTING_ALLOW_CRITICAL_TOASTS_ABOVE_LOCK" -Value 0 -Type "DWORD"

        Write-Log "Disabled notifications (no popups during gaming)" "SUCCESS"
    } catch {
        Write-Log "Error disabling notifications: $_" "ERROR"
    }
}


function Disable-PS7Telemetry {
    <#
    .SYNOPSIS
        Disables PowerShell 7 telemetry collection.
    .DESCRIPTION
        Sets the POWERSHELL_TELEMETRY_OPTOUT environment variable.
        Only relevant if PowerShell 7 is installed.
    .PARAMETER Enable
        When true, sets the opt-out environment variable.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Disable PS7 telemetry: skipped" "INFO"
        return
    }

    try {
        # Check if PowerShell 7 is installed
        $ps7Path = "$env:ProgramFiles\PowerShell\7\pwsh.exe"
        if (-not (Test-Path $ps7Path)) {
            Write-Log "PowerShell 7 not installed - skipping telemetry opt-out" "INFO"
            return
        }

        # Set environment variable to opt out of PS7 telemetry
        [Environment]::SetEnvironmentVariable("POWERSHELL_TELEMETRY_OPTOUT", "1", "Machine")
        Write-Log "Disabled PowerShell 7 telemetry (env var set)" "SUCCESS"
    } catch {
        Write-Log "Error disabling PS7 telemetry: $_" "ERROR"
    }
}


function Disable-WPBT {
    <#
    .SYNOPSIS
        Disables Windows Platform Binary Table (WPBT).
    .DESCRIPTION
        WPBT allows OEMs to inject software at boot time.
        Disabling prevents manufacturer bloatware from auto-installing.
    .PARAMETER Enable
        When true, disables WPBT execution.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Disable WPBT: skipped" "INFO"
        return
    }

    try {
        $wpbtPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager"
        Backup-RegistryKey -Path $wpbtPath
        Set-RegistryValue -Path $wpbtPath -Name "DisableWpbtExecution" -Value 1 -Type "DWORD"

        Write-Log "Disabled WPBT (blocks OEM bloatware injection at boot)" "SUCCESS"
    } catch {
        Write-Log "Error disabling WPBT: $_" "ERROR"
    }
}




function Invoke-PrivacyOptimizations {
    <#
    .SYNOPSIS
        Applies selected privacy optimization tiers and extras.
    .DESCRIPTION
        Runs tiered privacy settings, optional debloat steps, and WinUtil-inspired
        tweaks such as notification and Copilot disablement.
    .PARAMETER Tier1Safe
        Applies safe privacy defaults when true.
    .PARAMETER Tier2Moderate
        Applies moderate privacy settings when true.
    .PARAMETER Tier3Aggressive
        Applies aggressive settings (breaks Xbox/Game Pass) when true.
    .PARAMETER RemoveBloatware
        Removes select built-in apps when true.
    .PARAMETER RemoveXboxApps
        Removes Xbox apps (breaks Game Pass) when true.
    .PARAMETER BackgroundAppsOff
        Disables background UWP apps when true.
    .PARAMETER EdgeDebloat
        Applies Edge policy debloat settings when true.
    .PARAMETER DisableCopilot
        Disables Windows Copilot when true.
    .PARAMETER DisableNotifications
        Disables notifications when true.
    .PARAMETER DisablePS7Telemetry
        Disables PowerShell 7 telemetry when true.
    .PARAMETER DisableWPBT
        Disables WPBT execution when true.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Tier1Safe = $true,
        [bool]$Tier2Moderate = $false,
        [bool]$Tier3Aggressive = $false,
        [bool]$RemoveBloatware = $true,
        [bool]$RemoveXboxApps = $false,
        [bool]$BackgroundAppsOff = $true,
        [bool]$EdgeDebloat = $true,
        [bool]$DisableCopilot = $true,
        [bool]$DisableNotifications = $true,
        [bool]$DisablePS7Telemetry = $true,
        [bool]$DisableWPBT = $true
    )

    Write-Log "Applying privacy optimizations..." "INFO"

    try {
        if ($Tier1Safe) {
            Apply-PrivacyTier1Safe
        }

        if ($Tier2Moderate) {
            Apply-PrivacyTier2Moderate
        }

        if ($Tier3Aggressive) {
            Apply-PrivacyTier3Aggressive
        }

        if ($RemoveBloatware) {
            Remove-Bloatware
        }

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

        # New WinUtil-inspired tweaks
        Disable-Notifications -Enable $DisableNotifications

        Disable-PS7Telemetry -Enable $DisablePS7Telemetry

        Disable-WPBT -Enable $DisableWPBT

        Write-Log "Privacy optimizations complete" "SUCCESS"
        Write-Log "SmartScreen and Windows Update remain ENABLED (security)" "INFO"

    } catch {
        Write-Log "Error applying privacy optimizations: $_" "ERROR"
        throw
    }
}


function Undo-PrivacyOptimizations {
    <#
    .SYNOPSIS
        Reverts privacy-related changes.
    .DESCRIPTION
        Re-enables services and restores backed up registry values.
    .OUTPUTS
        None.
    #>
    Write-Log "Rolling back privacy optimizations..." "INFO"

    try {
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


Export-ModuleMember -Function @(
    'Apply-PrivacyTier1Safe',
    'Apply-PrivacyTier2Moderate',
    'Apply-PrivacyTier3Aggressive',
    'Remove-Bloatware',
    'Remove-XboxApps',
    'Set-BackgroundAppsOff',
    'Apply-EdgeDebloat',
    'Disable-Copilot',
    'Disable-Notifications',
    'Disable-PS7Telemetry',
    'Disable-WPBT',
    'Test-PrivacyOptimizations',
    'Invoke-PrivacyOptimizations',
    'Undo-PrivacyOptimizations'
)
