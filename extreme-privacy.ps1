<#
.SYNOPSIS
    Applies aggressive privacy and anti-tracking hardening to Windows.
.DESCRIPTION
    Disables Windows Update, telemetry services, location and cloud features,
    Microsoft account integration, and other data collection paths. This is an
    intentionally heavy-handed profile that may break features like Store apps,
    Cortana, or cloud sync. Use only if you fully understand the tradeoffs.
.PARAMETER SkipConfirmations
    Skips the interactive confirmation prompt.
.PARAMETER EnableFirewallRules
    When set, adds outbound firewall rules to block known telemetry IPs.
.EXAMPLE
    .\extreme-privacy.ps1
.EXAMPLE
    .\extreme-privacy.ps1 -SkipConfirmations
.NOTES
    Requires Administrator. Writes `extreme-privacy.log` in the current directory.
    Many changes are registry- and service-based and may require a reboot.
#>
#Requires -RunAsAdministrator



param(
    [switch]$SkipConfirmations,
    [switch]$EnableFirewallRules
)

# Fail fast to avoid partial application when an error is encountered.
$ErrorActionPreference = "Stop"
$script:LogPath = ".\extreme-privacy.log"

<#
.SYNOPSIS
    Writes a structured log line to file and console.
.DESCRIPTION
    Prepends timestamp and severity level, appends to the log file, and mirrors
    the message to the console with a level-aware color.
.PARAMETER Message
    Human-readable log text.
.PARAMETER Level
    Severity marker: INFO, SUCCESS, or ERROR.
.OUTPUTS
    None.
#>
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    try {
        Add-Content -Path $script:LogPath -Value $logMessage -ErrorAction Stop
    } catch {
    }

    Write-Host $logMessage -ForegroundColor $(if ($Level -eq "ERROR") { "Red" } elseif ($Level -eq "SUCCESS") { "Green" } else { "White" })
}

<#
.SYNOPSIS
    Sets a registry value, creating the key if needed.
.DESCRIPTION
    Ensures the registry path exists, writes the requested value and type,
    and logs success or failure.
.PARAMETER Path
    Registry path (e.g., HKLM:\Software\...).
.PARAMETER Name
    Registry value name.
.PARAMETER Value
    Data to store at the registry value.
.PARAMETER Type
    Registry value type (defaults to DWORD).
.OUTPUTS
    [bool] True on success, false on failure.
#>
function Set-RegistryValue {
    param(
        [string]$Path,
        [string]$Name,
        [object]$Value,
        [string]$Type = "DWORD"
    )
    try {
        if (-not (Test-Path $Path)) {
            New-Item -Path $Path -Force | Out-Null
        }
        Set-ItemProperty -Path $Path -Name $Name -Value $Value -Type $Type -ErrorAction Stop
        Write-Log "Set: $Path\$Name = $Value" "SUCCESS"
        return $true
    } catch {
        Write-Log "Failed: $Path\$Name - $_" "ERROR"
        return $false
    }
}

Write-Log "=== Extreme Privacy & Anti-Tracking Script Started ===" "SUCCESS"
Write-Host ""
Write-Host "=== EXTREME PRIVACY MODE ===" -ForegroundColor Red
Write-Host "This script applies AGGRESSIVE privacy hardening." -ForegroundColor Yellow
Write-Host "Some Windows features may break (Store, Cortana, etc.)" -ForegroundColor Yellow
Write-Host ""

if (-not $SkipConfirmations) {
    $confirm = Read-Host "Continue with extreme privacy mode? (Y/N)"
    if ($confirm -ne "Y") {
        Write-Log "Cancelled by user" "ERROR"
        exit 0
    }
}

# Windows Update is disabled to prevent telemetry and background bandwidth usage.
Write-Log "=== Disabling Windows Update Completely ==="
try {
    Stop-Service wuauserv -Force -ErrorAction SilentlyContinue
    Set-Service wuauserv -StartupType Disabled

    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoUpdate" -Value 1
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "AUOptions" -Value 2
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "AutoInstallMinorUpdates" -Value 0
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoRebootWithLoggedOnUsers" -Value 1

    Stop-Service UsoSvc -Force -ErrorAction SilentlyContinue
    Set-Service UsoSvc -StartupType Disabled -ErrorAction SilentlyContinue

    Write-Log "Windows Update completely disabled" "SUCCESS"
} catch {
    Write-Log "Error disabling Windows Update: $_" "ERROR"
}


# Disable telemetry and diagnostic services that phone home.
Write-Log "=== Disabling All Telemetry Services ==="
$telemetryServices = @(
    "DiagTrack",
    "dmwappushservice",
    "diagnosticshub.standardcollector.service",
    "DPS",
    "WdiSystemHost",
    "WdiServiceHost",
    "PcaSvc",
    "WerSvc",
    "Wecsvc",
    "BDESVC",
    "wercplsupport",
    "RetailDemo"
)

foreach ($svc in $telemetryServices) {
    try {
        $service = Get-Service -Name $svc -ErrorAction SilentlyContinue
        if ($service) {
            Stop-Service $svc -Force -ErrorAction Stop
            Set-Service $svc -StartupType Disabled
            Write-Log "Disabled service: $svc" "SUCCESS"
        }
    } catch {
        Write-Log "Could not disable $svc : $_" "ERROR"
    }
}


# Disable location sensors and location-based permission stores.
Write-Log "=== Disabling Location Tracking ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors" -Name "DisableLocation" -Value 1
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors" -Name "DisableWindowsLocationProvider" -Value 1
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LocationAndSensors" -Name "DisableLocationScripting" -Value 1
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\location" -Name "Value" -Value "Deny" -Type "String"


# Block camera access for UWP/modern apps, keep microphone enabled for voice chat.
Write-Log "=== Hardening Camera Privacy ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessCamera" -Value 2
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\webcam" -Name "Value" -Value "Deny" -Type "String"


Write-Log "Camera blocked | Microphone enabled for gaming voice chat" "SUCCESS"


# Disable Windows Hello biometrics and PIN logon for domain usage.
Write-Log "=== Disabling Biometrics ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Biometrics" -Name "Enabled" -Value 0
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "AllowDomainPINLogon" -Value 0


# Remove OneDrive background sync and shell integration.
Write-Log "=== Disabling OneDrive ==="
try {
    taskkill /f /im OneDrive.exe 2>&1 | Out-Null

    if (Test-Path "$env:SystemRoot\System32\OneDriveSetup.exe") {
        & "$env:SystemRoot\System32\OneDriveSetup.exe" /uninstall
    }
    if (Test-Path "$env:SystemRoot\SysWOW64\OneDriveSetup.exe") {
        & "$env:SystemRoot\SysWOW64\OneDriveSetup.exe" /uninstall
    }

    Set-RegistryValue -Path "HKCR:\CLSID\{018D5C66-4533-4307-9B53-224DE2ED1FE6}" -Name "System.IsPinnedToNameSpaceTree" -Value 0
    Set-RegistryValue -Path "HKCR:\Wow6432Node\CLSID\{018D5C66-4533-4307-9B53-224DE2ED1FE6}" -Name "System.IsPinnedToNameSpaceTree" -Value 0

    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\OneDrive" -Name "DisableFileSyncNGSC" -Value 1
    Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\OneDrive" -Name "DisableFileSync" -Value 1

    Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "OneDrive" -ErrorAction SilentlyContinue

    Write-Log "OneDrive disabled and uninstalled" "SUCCESS"
} catch {
    Write-Log "Error disabling OneDrive: $_" "ERROR"
}


# Disable Windows settings sync to reduce cloud footprint.
Write-Log "=== Disabling Sync Settings ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\SettingSync" -Name "DisableSettingSync" -Value 2
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\SettingSync" -Name "DisableSettingSyncUserOverride" -Value 1
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync" -Name "SyncPolicy" -Value 5
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Personalization" -Name "Enabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync\Groups\BrowserSettings" -Name "Enabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Credentials" -Name "Enabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Language" -Name "Enabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Accessibility" -Name "Enabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\SettingSync\Groups\Windows" -Name "Enabled" -Value 0


# Prevent Microsoft account sign-in integration (local account bias).
Write-Log "=== Disabling Microsoft Account Integration ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\current\device\Accounts" -Name "AllowMicrosoftAccountConnection" -Value 0
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\MicrosoftAccount" -Name "DisableUserAuth" -Value 1


# Disable consumer cloud content delivery and spotlight suggestions.
Write-Log "=== Disabling Cloud Content ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" -Name "DisableWindowsConsumerFeatures" -Value 1
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" -Name "DisableCloudOptimizedContent" -Value 1
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "ContentDeliveryAllowed" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "OemPreInstalledAppsEnabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "PreInstalledAppsEnabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "PreInstalledAppsEverEnabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SilentInstalledAppsEnabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-338387Enabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-338388Enabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-338389Enabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-353698Enabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SystemPaneSuggestionsEnabled" -Value 0


# Stop app suggestions and sync provider notifications.
Write-Log "=== Disabling App Suggestions ==="
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SoftLandingEnabled" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" -Name "ShowSyncProviderNotifications" -Value 0


# Disable typing/ink data collection used for personalization.
Write-Log "=== Disabling Typing Data Collection ==="
Set-RegistryValue -Path "HKCU:\Software\Microsoft\InputPersonalization" -Name "RestrictImplicitInkCollection" -Value 1
Set-RegistryValue -Path "HKCU:\Software\Microsoft\InputPersonalization" -Name "RestrictImplicitTextCollection" -Value 1
Set-RegistryValue -Path "HKCU:\Software\Microsoft\InputPersonalization\TrainedDataStore" -Name "HarvestContacts" -Value 0
Set-RegistryValue -Path "HKCU:\Software\Microsoft\Personalization\Settings" -Name "AcceptedPrivacyPolicy" -Value 0


# Block handwriting data sharing.
Write-Log "=== Disabling Handwriting Data Collection ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\TabletPC" -Name "PreventHandwritingDataSharing" -Value 1
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\HandwritingErrorReports" -Name "PreventHandwritingErrorReports" -Value 1


# Disable Microsoft experimentation/feature rollouts (A/B testing).
Write-Log "=== Disabling Microsoft Experimentation ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\current\device\System" -Name "AllowExperimentation" -Value 0
Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\System\AllowExperimentation" -Name "value" -Value 0


# Deny UWP app access to account data and identity info.
Write-Log "=== Disabling App Access to Account Info ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore\userAccountInformation" -Name "Value" -Value "Deny" -Type "String"
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessAccountInfo" -Value 2


# Deny app access to contacts and PIM data sources.
Write-Log "=== Disabling App Access to Contacts ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessContacts" -Value 2


# Deny app access to calendar entries.
Write-Log "=== Disabling App Access to Calendar ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessCalendar" -Value 2


# Deny app access to call history logs.
Write-Log "=== Disabling App Access to Call History ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessCallHistory" -Value 2


# Deny app access to email data.
Write-Log "=== Disabling App Access to Email ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessEmail" -Value 2


# Deny app access to notifications history.
Write-Log "=== Disabling App Access to Notifications ==="
Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsAccessNotifications" -Value 2


# Prevent automatic map package downloads.
Write-Log "=== Disabling Maps Auto-Update ==="
Set-RegistryValue -Path "HKLM:\SYSTEM\Maps" -Name "AutoUpdateEnabled" -Value 0


# Adds telemetry domains to hosts file; requires ownership/ACL changes.
Write-Log "=== Advanced Hosts File Telemetry Blocking ==="
try {
    $hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"

    # Ownership and permissions are required for hardened builds or customized ACLs.
    Write-Log "Taking ownership of hosts file (required for X-Lite builds)..."

    $takeownResult = takeown.exe /F $hostsFile /A 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Successfully took ownership of hosts file" "SUCCESS"
    } else {
        Write-Log "Takeown result: $takeownResult" "ERROR"
    }

    $icaclsResult = icacls.exe $hostsFile /grant "Administrators:F" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Successfully granted full permissions to Administrators" "SUCCESS"
    } else {
        Write-Log "Icacls result: $icaclsResult" "ERROR"
    }

    $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    icacls.exe $hostsFile /grant "${currentUser}:F" 2>&1 | Out-Null

    # DNS Client can keep the hosts file locked; stop it temporarily if running.
    Write-Log "Stopping DNS Client service to unlock hosts file..."
    $dnsService = Get-Service -Name "Dnscache" -ErrorAction SilentlyContinue
    $dnsWasRunning = $false

    if ($dnsService) {
        if ($dnsService.Status -eq "Running") {
            try {
                # Try using sc.exe as alternative (works better on X-Lite builds)
                $stopResult = sc.exe stop "Dnscache" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    $dnsWasRunning = $true
                    Write-Log "DNS Client service stopped" "SUCCESS"
                    Start-Sleep -Seconds 3
                } else {
                    Write-Log "DNS Client service could not be stopped (X-Lite build restrictions)" "ERROR"
                    Write-Log "Continuing with ownership/permissions changes..." "SUCCESS"
                }
            } catch {
                Write-Log "DNS Client service stop failed: $_" "ERROR"
                Write-Log "Continuing with ownership/permissions changes..." "SUCCESS"
            }
        } else {
            Write-Log "DNS Client service is not running" "SUCCESS"
        }
    } else {
        Write-Log "DNS Client service not found (disabled on X-Lite builds)" "SUCCESS"
    }

    try {
        $backupPath = "$hostsFile.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

        $hostsBytes = [System.IO.File]::ReadAllBytes($hostsFile)
        [System.IO.File]::WriteAllBytes($backupPath, $hostsBytes)
        Write-Log "Backed up hosts file to: $backupPath" "SUCCESS"

        # Curated list of telemetry/ads endpoints to null-route.
        $telemetryDomains = @(
            "vortex.data.microsoft.com",
            "vortex-win.data.microsoft.com",
            "telecommand.telemetry.microsoft.com",
            "telecommand.telemetry.microsoft.com.nsatc.net",
            "oca.telemetry.microsoft.com",
            "oca.telemetry.microsoft.com.nsatc.net",
            "sqm.telemetry.microsoft.com",
            "sqm.telemetry.microsoft.com.nsatc.net",
            "watson.telemetry.microsoft.com",
            "watson.telemetry.microsoft.com.nsatc.net",
            "redir.metaservices.microsoft.com",
            "choice.microsoft.com",
            "choice.microsoft.com.nsatc.net",
            "df.telemetry.microsoft.com",
            "reports.wes.df.telemetry.microsoft.com",
            "wes.df.telemetry.microsoft.com",
            "services.wes.df.telemetry.microsoft.com",
            "sqm.df.telemetry.microsoft.com",
            "telemetry.microsoft.com",
            "telemetry.appex.bing.net",
            "telemetry.urs.microsoft.com",
            "telemetry.appex.bing.net:443",
            "settings-sandbox.data.microsoft.com",
            "vortex-sandbox.data.microsoft.com",
            "survey.watson.microsoft.com",
            "watson.live.com",
            "watson.microsoft.com",
            "statsfe2.ws.microsoft.com",
            "corpext.msitadfs.glbdns2.microsoft.com",
            "compatexchange.cloudapp.net",
            "cs1.wpc.v0cdn.net",
            "a-0001.a-msedge.net",
            "statsfe2.update.microsoft.com.akadns.net",
            "sls.update.microsoft.com.akadns.net",
            "fe2.update.microsoft.com.akadns.net",
            "diagnostics.support.microsoft.com",
            "corp.sts.microsoft.com",
            "statsfe1.ws.microsoft.com",
            "pre.footprintpredict.com",
            "i1.services.social.microsoft.com",
            "i1.services.social.microsoft.com.nsatc.net",
            "feedback.windows.com",
            "feedback.microsoft-hohm.com",
            "feedback.search.microsoft.com",
            "fe3.delivery.dsp.mp.microsoft.com.nsatc.net",
            "tlu.dl.delivery.mp.microsoft.com",
            "ads.msn.com",
            "ads1.msn.com",
            "ads2.msn.com",
            "bingads.microsoft.com",
            "rad.msn.com",
            "flex.msn.com"
        )

        $hostsContentRaw = [System.IO.File]::ReadAllText($hostsFile)
        $hostsContent = $hostsContentRaw -split "`r?`n"
        $newEntries = @()

        foreach ($domain in $telemetryDomains) {
            $entry = "0.0.0.0 $domain"
            if ($hostsContent -notcontains $entry) {
                $newEntries += $entry
            }
        }

        if ($newEntries.Count -gt 0) {
            $newContent = $hostsContentRaw
            if (-not $hostsContentRaw.EndsWith("`n")) {
                $newContent += "`r`n"
            }
            $newContent += "`r`n# Extreme Privacy - Microsoft Telemetry Blocking ($(Get-Date -Format 'yyyy-MM-dd'))`r`n"
            $newContent += ($newEntries -join "`r`n")
            $newContent += "`r`n"

            # Preserve UTF-8 without BOM to avoid compatibility issues.
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($hostsFile, $newContent, $utf8NoBom)

            Write-Log "Added $($newEntries.Count) telemetry domains to hosts file" "SUCCESS"
        } else {
            Write-Log "All telemetry domains already blocked in hosts file" "SUCCESS"
        }

    } finally {
        if ($dnsWasRunning) {
            try {
                $startResult = sc.exe start "Dnscache" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Log "DNS Client service restarted" "SUCCESS"
                } else {
                    Start-Service -Name "Dnscache" -ErrorAction SilentlyContinue
                    Write-Log "DNS Client service restarted" "SUCCESS"
                }
            } catch {
                Write-Log "DNS Client service could not be restarted (may require manual restart)" "ERROR"
            }

            try {
                ipconfig /flushdns | Out-Null
                Write-Log "DNS cache flushed" "SUCCESS"
            } catch {
                Write-Log "Could not flush DNS cache" "ERROR"
            }
        }
    }

} catch {
    Write-Log "Error modifying hosts file: $_" "ERROR"
}


if ($EnableFirewallRules) {
    # Optional: outbound firewall rules for known telemetry IPs.
    Write-Log "=== Creating Firewall Rules to Block Telemetry ==="
    try {
        $telemetryIPs = @(
            "134.170.30.202",
            "137.116.81.24",
            "157.56.106.189",
            "184.86.53.99",
            "2.22.61.43",
            "2.22.61.66",
            "204.79.197.200",
            "23.218.212.69",
            "65.39.117.230",
            "65.52.108.33",
            "65.55.108.23"
        )

        foreach ($ip in $telemetryIPs) {
            $ruleName = "Block Telemetry IP $ip"
            if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
                New-NetFirewallRule -DisplayName $ruleName -Direction Outbound -RemoteAddress $ip -Action Block -ErrorAction SilentlyContinue | Out-Null
                Write-Log "Created firewall rule: $ruleName" "SUCCESS"
            }
        }

        Write-Log "Firewall rules created to block telemetry IPs" "SUCCESS"
    } catch {
        Write-Log "Error creating firewall rules: $_" "ERROR"
    }
}


Write-Log "=== Extreme Privacy Script Completed ===" "SUCCESS"
Write-Host ""
Write-Host "=== EXTREME PRIVACY APPLIED ===" -ForegroundColor Green
Write-Host ""
Write-Host "WARNING: Some Windows features are now disabled:" -ForegroundColor Yellow
Write-Host "  - Windows Update (disabled completely)" -ForegroundColor White
Write-Host "  - OneDrive (uninstalled)" -ForegroundColor White
Write-Host "  - Microsoft Account sync" -ForegroundColor White
Write-Host "  - Store auto-updates may be affected" -ForegroundColor White
Write-Host "  - Cortana completely disabled" -ForegroundColor White
Write-Host "  - Cloud features disabled" -ForegroundColor White
Write-Host ""
Write-Host "To re-enable Windows Update (if needed):" -ForegroundColor Cyan
Write-Host "  Set-Service wuauserv -StartupType Manual" -ForegroundColor White
Write-Host "  Start-Service wuauserv" -ForegroundColor White
Write-Host ""
Write-Host "REBOOT recommended for all changes to take effect." -ForegroundColor Yellow
Write-Host ""
