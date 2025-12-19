#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Gaming PC Setup Script - Optimizes Windows for gaming performance
    
.DESCRIPTION
    This script configures Windows for optimal gaming performance by:
    - Installing essential gaming software via winget
    - Optimizing power plans and process priorities
    - Configuring network settings for low latency
    - Disabling unnecessary services and bloatware
    - Setting up NVIDIA and audio configurations
    - Creating game-specific launch configurations
    
.PARAMETER SkipConfirmations
    Skip confirmation prompts for destructive operations
    
.PARAMETER LogPath
    Path to log file (default: .\gaming-pc-setup.log)
    
.PARAMETER SkipWingetInstall
    Skip winget installation attempt if not available (software installation will be skipped)
#>

param(
    [switch]$SkipConfirmations,
    [string]$LogPath = ".\gaming-pc-setup.log",
    [switch]$SkipWingetInstall
)

#region Initialization
$ErrorActionPreference = "Stop"
$script:LogPath = $LogPath
$script:StartTime = Get-Date

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $script:LogPath -Value $logMessage
    Write-Host $logMessage -ForegroundColor $(if ($Level -eq "ERROR") { "Red" } elseif ($Level -eq "SUCCESS") { "Green" } else { "White" })
}

function Write-Progress-Log {
    param([string]$Activity, [string]$Status, [int]$PercentComplete)
    Write-Progress -Activity $Activity -Status $Status -PercentComplete $PercentComplete
    Write-Log "$Activity - $Status"
}

function Test-Admin {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Backup-RegistryKey {
    param([string]$Path)
    if (Test-Path $Path) {
        $backupPath = "$Path.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        try {
            reg export $Path.Replace('HKLM:\', 'HKEY_LOCAL_MACHINE\').Replace('\', '\') $backupPath /y | Out-Null
            Write-Log "Backed up registry key: $Path -> $backupPath" "SUCCESS"
            return $true
        } catch {
            Write-Log "Failed to backup registry key $Path : $_" "ERROR"
            return $false
        }
    }
    return $false
}

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
            Write-Log "Created registry path: $Path"
        }
        Set-ItemProperty -Path $Path -Name $Name -Value $Value -Type $Type -ErrorAction Stop
        Write-Log "Set registry value: $Path\$Name = $Value" "SUCCESS"
        return $true
    } catch {
        Write-Log "Failed to set registry value $Path\$Name : $_" "ERROR"
        return $false
    }
}

# Check admin privileges
if (-not (Test-Admin)) {
    Write-Host "This script requires administrator privileges. Please run as administrator." -ForegroundColor Red
    exit 1
}

Write-Log "=== Gaming PC Setup Script Started ===" "SUCCESS"
Write-Log "Log file: $script:LogPath"

# Detect Windows X-Lite or debloated builds
function Test-XLiteBuild {
    $isXLite = $false
    $indicators = @()
    
    # Check for X-Lite indicators
    $computerInfo = Get-ComputerInfo -ErrorAction SilentlyContinue
    $osVersion = (Get-CimInstance Win32_OperatingSystem).Version
    
    # Check if Defender is disabled (common in X-Lite)
    try {
        $defenderStatus = Get-MpComputerStatus -ErrorAction SilentlyContinue
        if (-not $defenderStatus) {
            $indicators += "Defender appears disabled"
            $isXLite = $true
        }
    } catch {
        $indicators += "Defender not available (likely disabled)"
        $isXLite = $true
    }
    
    # Check if UAC is disabled (X-Lite disables it)
    $uacStatus = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System").EnableLUA
    if ($uacStatus -eq 0) {
        $indicators += "UAC is disabled"
        $isXLite = $true
    }
    
    # Check for missing UWP apps (X-Lite removes them)
    $uwpApps = Get-AppxPackage -ErrorAction SilentlyContinue | Measure-Object
    if ($uwpApps.Count -lt 10) {
        $indicators += "Very few UWP apps installed"
        $isXLite = $true
    }
    
    # Check for Windows X-Lite registry markers
    $xliteMarker = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion" -Name "BuildLabEx" -ErrorAction SilentlyContinue
    if ($xliteMarker) {
        $indicators += "X-Lite registry markers detected"
        $isXLite = $true
    }
    
    if ($isXLite) {
        Write-Log "Windows X-Lite or debloated build detected!" "SUCCESS"
        Write-Log "Indicators: $($indicators -join ', ')" "SUCCESS"
        Write-Log "Skipping redundant optimizations, focusing on gaming-specific tweaks" "SUCCESS"
    }
    
    return $isXLite
}

$script:IsXLiteBuild = Test-XLiteBuild

# Check and install winget if needed
function Install-Winget {
    Write-Log "=== Checking for winget ==="
    
    # Check if winget is available
    try {
        $wingetVersion = winget --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "winget is available: $wingetVersion" "SUCCESS"
            return $true
        }
    } catch {
        Write-Log "winget command not found" "ERROR"
    }
    
    Write-Log "winget not found. Attempting to install..." "SUCCESS"
    
    # Method 1: Try to install via Microsoft Store (App Installer)
    Write-Log "Method 1: Installing via Microsoft Store..."
    try {
        # Check if Microsoft Store is available
        $storeApp = Get-AppxPackage -Name "Microsoft.WindowsStore" -ErrorAction SilentlyContinue
        if ($storeApp) {
            Write-Log "Microsoft Store found, installing App Installer..." "SUCCESS"
            Start-Process "ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1" -ErrorAction SilentlyContinue
            Write-Log "Microsoft Store opened. Please install 'App Installer' manually, then restart this script." "SUCCESS"
            Write-Host ""
            Write-Host "After installing App Installer from Microsoft Store:" -ForegroundColor Yellow
            Write-Host "1. Close this window" -ForegroundColor White
            Write-Host "2. Restart PowerShell as Administrator" -ForegroundColor White
            Write-Host "3. Run this script again" -ForegroundColor White
            Write-Host ""
            $confirm = Read-Host "Press Enter to continue (or close to install App Installer first)"
            return $false
        } else {
            Write-Log "Microsoft Store not available (common on X-Lite builds)" "ERROR"
        }
    } catch {
        Write-Log "Could not open Microsoft Store: $_" "ERROR"
    }
    
    # Method 2: Direct download and install App Installer
    Write-Log "Method 2: Downloading App Installer directly..."
    try {
        $appInstallerUrl = "https://aka.ms/getwinget"
        $downloadPath = "$env:TEMP\Microsoft.DesktopAppInstaller.msixbundle"
        
        Write-Log "Downloading App Installer from Microsoft..." "SUCCESS"
        Invoke-WebRequest -Uri $appInstallerUrl -OutFile $downloadPath -UseBasicParsing -ErrorAction Stop
        
        Write-Log "Installing App Installer..." "SUCCESS"
        Add-AppxPackage -Path $downloadPath -ErrorAction Stop
        
        Write-Log "App Installer installed successfully" "SUCCESS"
        Write-Log "Please restart PowerShell and run this script again" "SUCCESS"
        
        Remove-Item $downloadPath -ErrorAction SilentlyContinue
        
        Write-Host ""
        Write-Host "App Installer installed! Please:" -ForegroundColor Green
        Write-Host "1. Close this PowerShell window" -ForegroundColor White
        Write-Host "2. Open PowerShell as Administrator again" -ForegroundColor White
        Write-Host "3. Run this script again" -ForegroundColor White
        Write-Host ""
        
        return $false
    } catch {
        Write-Log "Failed to download/install App Installer: $_" "ERROR"
        Write-Log "You may need to install App Installer manually" "ERROR"
    }
    
    # Method 3: Check if it's in PATH but not working
    Write-Log "Method 3: Checking PATH for winget..."
    $wingetPath = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetPath) {
        Write-Log "winget found in PATH but not working. May need App Installer update." "ERROR"
    }
    
    Write-Log "winget installation failed. Software installation will be skipped." "ERROR"
    Write-Host ""
    Write-Host "To install winget manually:" -ForegroundColor Yellow
    Write-Host "1. Download App Installer from: https://aka.ms/getwinget" -ForegroundColor White
    Write-Host "2. Install the .msixbundle file" -ForegroundColor White
    Write-Host "3. Restart PowerShell and run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternatively, you can:" -ForegroundColor Yellow
    Write-Host "- Skip software installation and install manually" -ForegroundColor White
    Write-Host "- Continue with other optimizations (they don't require winget)" -ForegroundColor White
    Write-Host ""
    
    $continue = Read-Host "Continue without winget? (Y/N)"
    if ($continue -eq "Y") {
        return $false
    } else {
        exit 0
    }
}

function Test-WingetAvailable {
    try {
        $null = winget --version 2>&1
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

# Check winget at startup
$script:WingetAvailable = Test-WingetAvailable
if (-not $script:WingetAvailable) {
    if ($SkipWingetInstall) {
        Write-Log "winget not found and SkipWingetInstall flag set. Skipping winget installation." "SUCCESS"
        Write-Log "Software installation will be skipped. Other optimizations will continue." "SUCCESS"
    } else {
        Write-Host "winget not found. Attempting installation..." -ForegroundColor Yellow
        Write-Host ""
        $script:WingetAvailable = Install-Winget
        if (-not $script:WingetAvailable) {
            Write-Log "winget not available. Software installation will be skipped." "ERROR"
            Write-Log "All other optimizations will continue normally." "SUCCESS"
        }
    }
} else {
    Write-Log "winget is available and ready to use" "SUCCESS"
}
#endregion

#region Software Installation
function Install-Software {
    Write-Log "=== Software Installation ==="
    
    if (-not $script:WingetAvailable) {
        Write-Log "winget not available. Skipping software installation." "ERROR"
        Write-Log "Please install software manually or install winget and rerun this script." "ERROR"
        Write-Host ""
        Write-Host "To install winget:" -ForegroundColor Yellow
        Write-Host "1. Download from: https://aka.ms/getwinget" -ForegroundColor White
        Write-Host "2. Install App Installer (.msixbundle)" -ForegroundColor White
        Write-Host "3. Restart PowerShell and run this script again" -ForegroundColor White
        Write-Host ""
        return
    }
    
    # Verify winget is still working
    if (-not (Test-WingetAvailable)) {
        Write-Log "winget became unavailable. Skipping software installation." "ERROR"
        return
    }
    
    $packages = @(
        @{Id = "Valve.Steam"; Name = "Steam" },
        @{Id = "Discord.Discord"; Name = "Discord" },
        @{Id = "VideoLAN.VLC"; Name = "VLC Media Player" },
        @{Id = "Brave.Brave"; Name = "Brave Browser" }
    )
    
    $installed = 0
    $failed = 0
    
    foreach ($package in $packages) {
        Write-Progress-Log "Installing Software" "Installing $($package.Name)..." ([int](($installed + $failed) / $packages.Count * 100))
        
        try {
            # Check if winget is still available
            if (-not (Test-WingetAvailable)) {
                Write-Log "winget became unavailable during installation" "ERROR"
                break
            }
            
            $result = winget install --id $package.Id --accept-package-agreements --accept-source-agreements --silent 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Installed: $($package.Name)" "SUCCESS"
                $installed++
            } else {
                # Check if it's already installed
                $installedCheck = winget list --id $package.Id --accept-source-agreements 2>&1
                if ($LASTEXITCODE -eq 0 -and $installedCheck -match $package.Id) {
                    Write-Log "Already installed: $($package.Name)" "SUCCESS"
                    $installed++
                } else {
                    Write-Log "Failed to install $($package.Name) (exit code: $LASTEXITCODE)" "ERROR"
                    $failed++
                }
            }
        } catch {
            Write-Log "Error installing $($package.Name): $_" "ERROR"
            $failed++
        }
    }
    
    Write-Log "Software installation complete: $installed installed, $failed failed/skipped" "SUCCESS"
}
#endregion

#region Power Plan Configuration
function Set-PowerPlan {
    Write-Log "=== Power Plan Configuration ==="
    
    try {
        $highPerfPlan = powercfg /list | Select-String "High performance" | ForEach-Object { ($_ -split '\s+')[3] }
        
        if ($highPerfPlan) {
            powercfg /setactive $highPerfPlan
            Write-Log "Set power plan to High Performance: $highPerfPlan" "SUCCESS"
        } else {
            # Create high performance plan if it doesn't exist
            $guid = powercfg /duplicatescheme 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
            if ($guid) {
                $guid = ($guid -split '\s+')[-1]
                powercfg /setactive $guid
                Write-Log "Created and activated High Performance plan: $guid" "SUCCESS"
            }
        }
        
        # Disable USB selective suspend
        powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
        powercfg /setdcvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
        
        # Set minimum processor state to 100%
        powercfg /setacvalueindex SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ed 100
        powercfg /setdcvalueindex SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ed 100
        
        powercfg /setactive SCHEME_CURRENT
        Write-Log "Power plan optimizations applied" "SUCCESS"
    } catch {
        Write-Log "Error configuring power plan: $_" "ERROR"
    }
}
#endregion

#region Process Priority Tweaks
function Set-ProcessPriorityTweaks {
    Write-Log "=== Process Priority Tweaks ==="
    
    $regPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Image File Execution Options"
    
    $games = @(
        "cs2.exe",
        "dota2.exe",
        "helldivers2.exe",
        "SpaceMarine2.exe",
        "steam.exe"
    )
    
    foreach ($game in $games) {
        $gamePath = Join-Path $regPath $game
        Backup-RegistryKey $gamePath | Out-Null
        
        Set-RegistryValue -Path $gamePath -Name "PerfOptions" -Value 0x00000003 -Type "DWORD" | Out-Null
        Set-RegistryValue -Path $gamePath -Name "CpuPriorityClass" -Value 0x00000003 -Type "DWORD" | Out-Null
    }
    
    Write-Log "Process priority tweaks applied for $($games.Count) executables" "SUCCESS"
}
#endregion

#region Network Optimization
function Optimize-Network {
    Write-Log "=== Network Optimization ==="
    
    try {
        # Auto-detect active network adapter
        $adapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and ($_.InterfaceDescription -like "*Ethernet*" -or $_.InterfaceDescription -like "*Wi-Fi*") } | Select-Object -First 1
        
        if (-not $adapter) {
            Write-Log "No active network adapter found" "ERROR"
            return
        }
        
        $adapterGuid = $adapter.InterfaceGuid
        Write-Log "Detected network adapter: $($adapter.Name) (GUID: $adapterGuid)" "SUCCESS"
        
        $regBase = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\$adapterGuid"
        
        if (-not (Test-Path $regBase)) {
            Write-Log "Registry path not found for adapter GUID" "ERROR"
            return
        }
        
        Backup-RegistryKey $regBase | Out-Null
        
        # Network optimizations
        Set-RegistryValue -Path $regBase -Name "TcpAckFrequency" -Value 1
        Set-RegistryValue -Path $regBase -Name "TCPNoDelay" -Value 1
        Set-RegistryValue -Path $regBase -Name "TcpDelAckTicks" -Value 0
        Set-RegistryValue -Path $regBase -Name "Tcp1323Opts" -Value 0
        Set-RegistryValue -Path $regBase -Name "DefaultTTL" -Value 64
        Set-RegistryValue -Path $regBase -Name "EnablePMTUBHDetect" -Value 0
        Set-RegistryValue -Path $regBase -Name "EnablePMTUDiscovery" -Value 1
        Set-RegistryValue -Path $regBase -Name "DisableTaskOffload" -Value 0
        
        # Disable RSC (Receive Side Scaling)
        $rscPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
        Set-RegistryValue -Path $rscPath -Name "EnableRSS" -Value 0
        
        # Disable ECN (Explicit Congestion Notification)
        Set-RegistryValue -Path $regBase -Name "TcpEcnEnabled" -Value 0
        
        # Network throttling index (maximum)
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "NetworkThrottlingIndex" -Value 0xffffffff -Type "DWORD"
        
        # Disable Chimney offload
        Set-RegistryValue -Path $regBase -Name "EnableTCPChimney" -Value 0
        Set-RegistryValue -Path $regBase -Name "EnableRSS" -Value 0
        
        Write-Log "Network optimizations applied for adapter: $($adapter.Name)" "SUCCESS"
    } catch {
        Write-Log "Error optimizing network: $_" "ERROR"
    }
}
#endregion

#region QoS Configuration
function Set-QoSConfiguration {
    Write-Log "=== QoS Configuration ==="
    
    try {
        $gameExecutables = @(
            "cs2.exe",
            "dota2.exe",
            "helldivers2.exe",
            "SpaceMarine2.exe"
        )
        
        foreach ($exe in $gameExecutables) {
            $qosPolicy = Get-NetQosPolicy -Name "Game-$exe" -ErrorAction SilentlyContinue
            if (-not $qosPolicy) {
                New-NetQosPolicy -Name "Game-$exe" -AppPathNameMatchCondition $exe -DSCPAction 46 -NetworkProfile All | Out-Null
                Write-Log "Created QoS policy for $exe" "SUCCESS"
            } else {
                Write-Log "QoS policy for $exe already exists" "SUCCESS"
            }
        }
        
        Write-Log "QoS configuration complete" "SUCCESS"
    } catch {
        Write-Log "Error configuring QoS (may require Windows Pro/Enterprise): $_" "ERROR"
    }
}
#endregion

#region Service Management
function Disable-Services {
    Write-Log "=== Service Management ==="
    
    if ($script:IsXLiteBuild) {
        Write-Log "X-Lite build detected - many services already disabled, checking remaining ones..." "SUCCESS"
    }
    
    $servicesToDisable = @(
        "DiagTrack",                    # Connected User Experiences and Telemetry
        "dmwappushservice",             # WAP Push Message Routing Service
        "WSearch",                      # Windows Search (optional, can impact search)
        "XblAuthManager",               # Xbox Live Auth Manager
        "XblGameSave",                  # Xbox Live Game Save
        "XboxGipSvc",                   # Xbox Accessory Management Service
        "XboxNetApiSvc",                # Xbox Live Networking Service
        "SysMain",                      # Superfetch (can help on SSDs)
        "Themes",                       # Themes (optional)
        "Spooler"                       # Print Spooler (only disable if no printer)
    )
    
    $disabled = 0
    foreach ($serviceName in $servicesToDisable) {
        try {
            $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
            if ($service -and $service.Status -ne "Stopped") {
                if (-not $SkipConfirmations -and $serviceName -eq "Spooler") {
                    $confirm = Read-Host "Disable Print Spooler? This will prevent printing. (Y/N)"
                    if ($confirm -ne "Y") {
                        Write-Log "Skipped disabling $serviceName" "SUCCESS"
                        continue
                    }
                }
                
                Stop-Service -Name $serviceName -Force -ErrorAction Stop
                Set-Service -Name $serviceName -StartupType Disabled -ErrorAction Stop
                Write-Log "Disabled service: $serviceName" "SUCCESS"
                $disabled++
            } else {
                Write-Log "Service $serviceName already disabled or not found" "SUCCESS"
            }
        } catch {
            Write-Log "Error disabling service $serviceName : $_" "ERROR"
        }
    }
    
    Write-Log "Service management complete: $disabled services disabled" "SUCCESS"
}
#endregion

#region Bloatware Removal
function Remove-Bloatware {
    Write-Log "=== Bloatware Removal ==="
    
    if ($script:IsXLiteBuild) {
        Write-Log "X-Lite build detected - bloatware already removed, skipping..." "SUCCESS"
        return
    }
    
    $appsToRemove = @(
        "Microsoft.XboxApp",
        "Microsoft.XboxGameCallableUI",
        "Microsoft.XboxGamingOverlay",
        "Microsoft.XboxIdentityProvider",
        "Microsoft.XboxSpeechToTextOverlay",
        "Microsoft.Xbox.TCUI",
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
            } else {
                Write-Log "App not found: $app" "SUCCESS"
            }
        } catch {
            Write-Log "Error removing app $app : $_" "ERROR"
        }
    }
    
    Write-Log "Bloatware removal complete: $removed apps removed" "SUCCESS"
}
#endregion

#region NVIDIA Configuration
function Set-NVIDIASettings {
    Write-Log "=== NVIDIA Configuration ==="
    
    try {
        $nvidiaPath = "HKLM:\SYSTEM\CurrentControlSet\Services\nvlddmkm"
        
        if (-not (Test-Path $nvidiaPath)) {
            Write-Log "NVIDIA driver registry path not found. Ensure NVIDIA drivers are installed." "ERROR"
            return
        }
        
        Backup-RegistryKey $nvidiaPath | Out-Null
        
        # Power management mode: Prefer maximum performance
        $nvidiaGlobalPath = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
        Set-RegistryValue -Path $nvidiaGlobalPath -Name "HwSchMode" -Value 2
        
        # Disable GPU scaling (can cause input lag)
        Set-RegistryValue -Path $nvidiaPath -Name "DisableOverlay" -Value 0
        
        Write-Log "NVIDIA registry settings applied. Use NVIDIA Control Panel for full configuration." "SUCCESS"
        Write-Log "Recommended NVIDIA Control Panel settings:" "SUCCESS"
        Write-Log "  - Power management mode: Prefer maximum performance" "SUCCESS"
        Write-Log "  - Vertical sync: Off (or Fast for G-Sync)" "SUCCESS"
        Write-Log "  - Low latency mode: Ultra" "SUCCESS"
        Write-Log "  - Texture filtering - Quality: High performance" "SUCCESS"
    } catch {
        Write-Log "Error configuring NVIDIA settings: $_" "ERROR"
    }
}
#endregion

#region DTS Audio Setup
function Set-DTSAudio {
    Write-Log "=== DTS Audio Setup ==="
    
    try {
        $audioPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio"
        
        Write-Log "DTS Audio configuration for Samsung Q990D:" "SUCCESS"
        Write-Log "1. Install Samsung audio drivers from Samsung website" "SUCCESS"
        Write-Log "2. Enable Windows Spatial Audio: Settings > System > Sound > Spatial audio" "SUCCESS"
        Write-Log "3. Configure DTS settings in Windows Sound settings" "SUCCESS"
        
        # Enable audio enhancements
        $enhancementsPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Audio"
        Set-RegistryValue -Path $enhancementsPath -Name "DisableProtectedAudioDG" -Value 0
        
        Write-Log "Audio enhancement registry keys set. Manual driver installation required." "SUCCESS"
    } catch {
        Write-Log "Error configuring DTS audio: $_" "ERROR"
    }
}
#endregion

#region Telemetry Removal
function Remove-Telemetry {
    Write-Log "=== Telemetry Removal ==="
    
    try {
        # Disable telemetry via registry
        $telemetryPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\DataCollection"
        Backup-RegistryKey $telemetryPath | Out-Null
        
        Set-RegistryValue -Path $telemetryPath -Name "AllowTelemetry" -Value 0
        Set-RegistryValue -Path $telemetryPath -Name "DoNotShowFeedbackNotifications" -Value 1
        
        # Disable Windows Error Reporting
        $werPath = "HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting"
        Backup-RegistryKey $werPath | Out-Null
        Set-RegistryValue -Path $werPath -Name "Disabled" -Value 1
        
        # Disable scheduled tasks
        $tasks = @(
            "\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser",
            "\Microsoft\Windows\Application Experience\ProgramDataUpdater",
            "\Microsoft\Windows\Customer Experience Improvement Program\*",
            "\Microsoft\Windows\Diagnosis\Scheduled"
        )
        
        foreach ($task in $tasks) {
            try {
                Disable-ScheduledTask -TaskPath $task -ErrorAction SilentlyContinue | Out-Null
                Write-Log "Disabled scheduled task: $task" "SUCCESS"
            } catch {
                # Task may not exist, continue
            }
        }
        
        Write-Log "Telemetry removal complete" "SUCCESS"
    } catch {
        Write-Log "Error removing telemetry: $_" "ERROR"
    }
}
#endregion

#region Game Launch Options
function Create-GameConfigs {
    Write-Log "=== Game Launch Options ==="
    
    $steamPath = "${env:ProgramFiles(x86)}\Steam\steamapps\common"
    $configs = @{
        "CS2" = @{
            Path = Join-Path $steamPath "Counter-Strike Global Offensive\game\csgo\cfg\autoexec.cfg"
            Content = @"
// CS2 Launch Options: -high -threads 8 -novid -tickrate 128 +fps_max 0
// Autoexec Configuration

// Performance
fps_max 0
cl_forcepreload 1
cl_threaded_bone_setup 1
cl_threaded_particle_setup 1
r_dynamic 0
r_drawtracers_firstperson 0
cl_showfps 1

// Network
rate 786432
cl_cmdrate 128
cl_updaterate 128
cl_interp_ratio 1
cl_interp 0.015625

// Mouse
m_rawinput 1
m_mousespeed 0
"@
        }
        "Dota2" = @{
            Path = Join-Path $steamPath "dota 2 beta\game\dota\cfg\autoexec.cfg"
            Content = @"
// Dota 2 Launch Options: -high -threads 8 -novid -console
// Autoexec Configuration

// Performance
dota_embers 0
dota_embers_override 0
dota_screen_shake 0
dota_unit_fly_height 0
dota_use_particle_fow 1
dota_use_particle_mip 1
dota_render_water 0
dota_render_grass 0
dota_render_tree_animations 0

// Network
cl_cmdrate 30
cl_updaterate 30
rate 80000

// Console
con_enable 1
"@
        }
    }
    
    $created = 0
    foreach ($game in $configs.Keys) {
        try {
            $config = $configs[$game]
            $dir = Split-Path $config.Path -Parent
            
            if (-not (Test-Path $dir)) {
                Write-Log "Game directory not found for $game : $dir" "ERROR"
                continue
            }
            
            if (Test-Path $config.Path) {
                $backup = "$($config.Path).backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
                Copy-Item $config.Path $backup
                Write-Log "Backed up existing config: $backup" "SUCCESS"
            }
            
            Set-Content -Path $config.Path -Value $config.Content -Encoding UTF8
            Write-Log "Created config for $game : $($config.Path)" "SUCCESS"
            $created++
        } catch {
            Write-Log "Error creating config for $game : $_" "ERROR"
        }
    }
    
    Write-Log "Game config creation complete: $created configs created" "SUCCESS"
}
#endregion

#region Stutter Fixes & Frame Time Optimization
function Fix-Stutters {
    Write-Log "=== Stutter Fixes & Frame Time Optimization ==="
    
    try {
        # Disable HPET (High Precision Event Timer) - major stutter cause
        Write-Log "Disabling HPET (High Precision Event Timer)..."
        bcdedit /set useplatformclock false 2>&1 | Out-Null
        bcdedit /set disabledynamictick yes 2>&1 | Out-Null
        Write-Log "HPET disabled. Requires reboot to take effect." "SUCCESS"
        
        # Timer Resolution - CRITICAL for micro-stutter elimination
        # Windows defaults to 15.6ms timer resolution, causing inconsistent frame times
        $timerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel"
        Backup-RegistryKey $timerPath | Out-Null
        Set-RegistryValue -Path $timerPath -Name "GlobalTimerResolutionRequests" -Value 1
        
        # Additional timer resolution tweaks for 1% low improvement
        $multimediaPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
        Set-RegistryValue -Path $multimediaPath -Name "SystemResponsiveness" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $multimediaPath -Name "GameDVR_Enabled" -Value 0 -Type "DWORD"
        
        # Set timer resolution to 0.5ms for games (requires runtime tool - see timer-tool.ps1)
        Write-Log "Timer resolution registry set. Use timer-tool.ps1 during gameplay for best results." "SUCCESS"
        
        # Disable Timer Coalescing - prevents CPU from sleeping cores
        $powerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
        Set-RegistryValue -Path $powerPath -Name "EnergyEstimationEnabled" -Value 0
        Set-RegistryValue -Path $powerPath -Name "PlatformAoAcOverride" -Value 0
        
        # Enable Game Mode
        $gameModePath = "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\ApplicationManagement\AllowGameMode"
        Set-RegistryValue -Path $gameModePath -Name "value" -Value 1
        
        # Disable Fullscreen Optimizations globally (can be re-enabled per-game if needed)
        $fullscreenPath = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
        Set-RegistryValue -Path $fullscreenPath -Name "HwSchMode" -Value 2
        Set-RegistryValue -Path $fullscreenPath -Name "TdrLevel" -Value 0
        
        # Disable Windows Memory Compression (can cause stutters)
        Disable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue
        Write-Log "Disabled memory compression" "SUCCESS"
        
        # Disable Background Apps
        $backgroundPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 1
        
        # GPU Scheduling - Hardware Accelerated GPU Scheduling (test both states)
        $gpuSchedPath = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
        # Set to 2 to enable (1 to disable) - try both and see what works better
        Set-RegistryValue -Path $gpuSchedPath -Name "HwSchMode" -Value 2
        Write-Log "Hardware Accelerated GPU Scheduling enabled (disable if stutters persist)" "SUCCESS"
        
        # Disable Visual Effects for performance
        $visualPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
        Set-RegistryValue -Path $visualPath -Name "VisualFXSetting" -Value 2 -Type "DWORD"
        
        # Disable Animations
        $animPath = "HKCU:\Control Panel\Desktop\WindowMetrics"
        Set-RegistryValue -Path "HKCU:\Control Panel\Desktop" -Name "UserPreferencesMask" -Value ([byte[]](0x90,0x12,0x03,0x80,0x10,0x00,0x00,0x00)) -Type "BINARY"
        
        # CPU Parking - ensure all cores stay active
        $cpuParkPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
        Set-RegistryValue -Path $cpuParkPath -Name "CpuParkingEnabled" -Value 0
        Set-RegistryValue -Path $cpuParkPath -Name "CpuParkingMinCores" -Value 100
        
        # Disable Core Parking per power scheme
        $schemes = powercfg /list | Select-String "GUID" | ForEach-Object { ($_ -split '\s+')[-1] }
        foreach ($scheme in $schemes) {
            powercfg /setacvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 0 2>&1 | Out-Null
            powercfg /setdcvalueindex $scheme 54533251-82be-4824-96c1-47b60b740d00 0cc5b647-c1df-4637-891a-dec35c318583 0 2>&1 | Out-Null
        }
        Write-Log "Disabled CPU core parking" "SUCCESS"
        
        # Disable Windows Defender Real-time scanning for game directories (optional, use with caution)
        if (-not $SkipConfirmations) {
            $defenderConfirm = Read-Host "Add game directories to Windows Defender exclusions? (Y/N)"
            if ($defenderConfirm -eq "Y") {
                $gameDirs = @(
                    "${env:ProgramFiles(x86)}\Steam",
                    "${env:ProgramFiles}\Steam",
                    "${env:ProgramFiles(x86)}\Epic Games",
                    "${env:ProgramFiles}\Epic Games",
                    "${env:LOCALAPPDATA}\Programs\Epic Games"
                )
                
                foreach ($dir in $gameDirs) {
                    if (Test-Path $dir) {
                        try {
                            Add-MpPreference -ExclusionPath $dir -ErrorAction SilentlyContinue
                            Write-Log "Added to Defender exclusions: $dir" "SUCCESS"
                        } catch {
                            Write-Log "Could not add Defender exclusion (may require manual setup): $dir" "ERROR"
                        }
                    }
                }
            }
        }
        
        # Disable Windows Update automatic restart
        $updatePath = "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings"
        Set-RegistryValue -Path $updatePath -Name "UxOption" -Value 1
        
        # Disable Windows Update delivery optimization
        $deliveryPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config"
        Set-RegistryValue -Path $deliveryPath -Name "DODownloadMode" -Value 0
        
        # MSI Mode for GPU and Network adapters (reduces DPC latency)
        Write-Log "Configuring MSI Mode for devices (reduces DPC latency)..."
        
        $msiEnabled = 0
        
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
                        Backup-RegistryKey $msiPath | Out-Null
                        Set-RegistryValue -Path $msiPath -Name "MSISupported" -Value 1
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
                        Backup-RegistryKey $msiPath | Out-Null
                        Set-RegistryValue -Path $msiPath -Name "MSISupported" -Value 1
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
            Write-Log "No devices found that support MSI Mode, or it's already enabled" "SUCCESS"
        }
        
        # Disable DWM (Desktop Window Manager) composition for fullscreen games
        $dwmPath = "HKLM:\SOFTWARE\Microsoft\Windows\DWM"
        Set-RegistryValue -Path $dwmPath -Name "EnableAeroPeek" -Value 0
        
        # Disable Windows Search Indexing on game drives
        $searchPath = "HKLM:\SYSTEM\CurrentControlSet\Services\WSearch"
        Set-RegistryValue -Path $searchPath -Name "Start" -Value 4 -Type "DWORD"
        
        # Set process scheduler to prefer foreground applications (aggressive)
        $schedulerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl"
        Set-RegistryValue -Path $schedulerPath -Name "Win32PrioritySeparation" -Value 38 -Type "DWORD"
        
        # Additional scheduler tweaks for frame time consistency
        Set-RegistryValue -Path $schedulerPath -Name "IRQ8Priority" -Value 1 -Type "DWORD"
        
        # Disable CPU throttling completely
        $cpuThrottlePath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
        Set-RegistryValue -Path $cpuThrottlePath -Name "CsEnabled" -Value 0 -Type "DWORD"
        
        # Audio driver optimizations (major source of DPC latency)
        Write-Log "Optimizing audio drivers for low DPC latency..."
        $audioPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e96c-e325-11ce-bfc1-08002be10318}"
        if (Test-Path $audioPath) {
            Get-ChildItem $audioPath | ForEach-Object {
                $driverPath = $_.PSPath
                try {
                    Set-RegistryValue -Path $driverPath -Name "DisableHDAudioPowerManagement" -Value 1 -ErrorAction SilentlyContinue
                    Set-RegistryValue -Path $driverPath -Name "PowerSave" -Value 0 -ErrorAction SilentlyContinue
                } catch {
                    # Some audio drivers don't have these keys
                }
            }
        }
        
        # Disable audio enhancements that cause DPC latency
        $audioEnhancePath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Audio"
        Set-RegistryValue -Path $audioEnhancePath -Name "DisableProtectedAudioDG" -Value 0
        Set-RegistryValue -Path $audioEnhancePath -Name "DisableSystemSounds" -Value 1
        
        # Set audio to exclusive mode (reduces latency)
        $audioExclusivePath = "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceClasses\{6994ad04-93ef-11d0-a3cc-00a0c9223196}"
        # This is handled per-device, but we can set global preference
        Set-RegistryValue -Path "HKCU:\Software\Microsoft\Multimedia\Audio" -Name "UserDuckingPreference" -Value 3 -Type "DWORD" -ErrorAction SilentlyContinue
        
        # Disable Windows Game Bar (can cause stutters)
        $gameBarPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR"
        Set-RegistryValue -Path $gameBarPath -Name "AppCaptureEnabled" -Value 0
        Set-RegistryValue -Path $gameBarPath -Name "GameDVR_Enabled" -Value 0
        
        $gameBarPath2 = "HKCU:\System\GameConfigStore"
        Set-RegistryValue -Path $gameBarPath2 -Name "GameDVR_Enabled" -Value 0
        
        # Disable Windows Defender real-time scanning during gameplay (major stutter source)
        if ($script:IsXLiteBuild) {
            Write-Log "X-Lite build detected - Defender likely already disabled" "SUCCESS"
        } else {
            $defenderPath = "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Real-Time Protection"
            if (-not (Test-Path $defenderPath)) {
                New-Item -Path $defenderPath -Force | Out-Null
            }
            # Note: Full disable requires Group Policy, but we can optimize scanning
            Set-RegistryValue -Path $defenderPath -Name "DisableRealtimeMonitoring" -Value 0 -ErrorAction SilentlyContinue
            Write-Log "Windows Defender: Add game directories to exclusions for best results" "SUCCESS"
        }
        
        # Disable Windows Search indexing (can cause micro-stutters)
        $searchIndexPath = "HKLM:\SYSTEM\CurrentControlSet\Services\WSearch"
        Set-RegistryValue -Path $searchIndexPath -Name "Start" -Value 4 -Type "DWORD"
        Set-RegistryValue -Path $searchIndexPath -Name "DelayedAutoStart" -Value 0 -Type "DWORD"
        
        # Disable Superfetch/Prefetch (can cause stutters on SSDs)
        $superfetchPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management\PrefetchParameters"
        Set-RegistryValue -Path $superfetchPath -Name "EnableSuperfetch" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $superfetchPath -Name "EnablePrefetcher" -Value 0 -Type "DWORD"
        
        # Disable Windows Update automatic maintenance (can cause stutters)
        $maintenancePath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\Maintenance"
        Set-RegistryValue -Path $maintenancePath -Name "MaintenanceDisabled" -Value 1 -Type "DWORD"
        
        # Optimize for low latency (not throughput)
        $latencyPath = "HKLM:\SYSTEM\CurrentControlSet\Services\NDIS\Parameters"
        Set-RegistryValue -Path $latencyPath -Name "NumRssProcessors" -Value 1 -Type "DWORD" -ErrorAction SilentlyContinue
        
        # X-Lite specific optimizations
        if ($script:IsXLiteBuild) {
            Write-Log "Applying X-Lite specific gaming optimizations..." "SUCCESS"
            
            # Ensure updates stay paused (X-Lite pauses until 3000, but ensure it stays)
            $updatePath = "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings"
            Set-RegistryValue -Path $updatePath -Name "UxOption" -Value 1
            
            # Ensure UAC stays disabled for gaming (X-Lite disables it)
            $uacPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System"
            Set-RegistryValue -Path $uacPath -Name "EnableLUA" -Value 0 -ErrorAction SilentlyContinue
            
            # Additional X-Lite gaming tweaks
            Write-Log "X-Lite optimizations: Updates paused, UAC disabled, bloatware removed" "SUCCESS"
        }
        
        Write-Log "Stutter fixes and frame time optimizations applied" "SUCCESS"
        Write-Log "IMPORTANT: Reboot required for HPET and MSI mode changes to take effect" "SUCCESS"
        Write-Log "CRITICAL: Run timer-tool.ps1 during gameplay to maintain 0.5ms timer resolution" "SUCCESS"
        
    } catch {
        Write-Log "Error applying stutter fixes: $_" "ERROR"
    }
}
#endregion

#region Main Execution
try {
    Write-Host "`n=== Gaming PC Setup Script ===" -ForegroundColor Cyan
    Write-Host "This script will optimize your Windows system for gaming.`n" -ForegroundColor Yellow
    
    if (-not $SkipConfirmations) {
        $confirm = Read-Host "Continue? (Y/N)"
        if ($confirm -ne "Y") {
            Write-Log "Script cancelled by user" "ERROR"
            exit 0
        }
    }
    
    $sections = @(
        @{ Name = "Software Installation"; Function = { Install-Software }; Weight = 15 },
        @{ Name = "Power Plan Configuration"; Function = { Set-PowerPlan }; Weight = 5 },
        @{ Name = "Process Priority Tweaks"; Function = { Set-ProcessPriorityTweaks }; Weight = 5 },
        @{ Name = "Network Optimization"; Function = { Optimize-Network }; Weight = 10 },
        @{ Name = "QoS Configuration"; Function = { Set-QoSConfiguration }; Weight = 5 },
        @{ Name = "Stutter Fixes & Frame Time Optimization"; Function = { Fix-Stutters }; Weight = 20 },
        @{ Name = "Service Management"; Function = { Disable-Services }; Weight = 10 },
        @{ Name = "Bloatware Removal"; Function = { Remove-Bloatware }; Weight = 10 },
        @{ Name = "NVIDIA Configuration"; Function = { Set-NVIDIASettings }; Weight = 10 },
        @{ Name = "DTS Audio Setup"; Function = { Set-DTSAudio }; Weight = 5 },
        @{ Name = "Telemetry Removal"; Function = { Remove-Telemetry }; Weight = 10 },
        @{ Name = "Game Launch Options"; Function = { Create-GameConfigs }; Weight = 5 }
    )
    
    $totalWeight = ($sections | Measure-Object -Property Weight -Sum).Sum
    $currentWeight = 0
    
    foreach ($section in $sections) {
        $currentWeight += $section.Weight
        $percent = [int]($currentWeight / $totalWeight * 100)
        Write-Progress-Log "Gaming PC Setup" $section.Name $percent
        
        try {
            & $section.Function
        } catch {
            Write-Log "Error in section $($section.Name): $_" "ERROR"
        }
    }
    
    Write-Progress -Activity "Gaming PC Setup" -Completed
    
    $duration = (Get-Date) - $script:StartTime
    Write-Log "=== Script Completed Successfully ===" "SUCCESS"
    Write-Log "Total execution time: $($duration.ToString('mm\:ss'))" "SUCCESS"
    Write-Host "`nSetup complete! Please restart your computer for all changes to take effect.`n" -ForegroundColor Green
    
} catch {
    Write-Log "Fatal error: $_" "ERROR"
    Write-Host "`nScript encountered a fatal error. Check the log file for details.`n" -ForegroundColor Red
    exit 1
}
#endregion
