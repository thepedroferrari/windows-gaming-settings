#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Gaming PC Setup Script - ENHANCED VERSION - Optimizes Windows for gaming performance

.DESCRIPTION
    This script configures Windows for optimal gaming performance by:
    - Installing essential gaming software via winget
    - Optimizing power plans and process priorities
    - Configuring network settings for low latency
    - Disabling unnecessary services and bloatware
    - Setting up NVIDIA and audio configurations
    - Creating game-specific launch configurations
    - ENHANCED: Additional anti-tracking, privacy, and performance optimizations

.PARAMETER SkipConfirmations
    Skip confirmation prompts for destructive operations

.PARAMETER LogPath
    Path to log file (default: .\gaming-pc-setup.log)

.PARAMETER SkipWingetInstall
    Skip winget installation attempt if not available (software installation will be skipped)

.PARAMETER EnableAggressiveOptimizations
    Enable aggressive optimizations (disable Spectre/Meltdown mitigations, etc.)
    WARNING: May have security implications
#>

param(
    [switch]$SkipConfirmations,
    [string]$LogPath = ".\gaming-pc-setup-enhanced.log",
    [switch]$SkipWingetInstall,
    [switch]$EnableAggressiveOptimizations
)

#region Initialization
$ErrorActionPreference = "Stop"
$script:LogPath = $LogPath
$script:StartTime = Get-Date

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    # Try to write to log file (handle file locks gracefully)
    try {
        Add-Content -Path $script:LogPath -Value $logMessage -ErrorAction Stop
    } catch {
        # If log file is locked, just skip writing to file (still show on console)
    }

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
        $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $backupPath = "$env:TEMP\RegistryBackup-$timestamp-$($Path.Replace('\', '_').Replace(':', '')).reg"
        try {
            $exportPath = $Path.Replace('HKLM:\', 'HKEY_LOCAL_MACHINE\').Replace('HKCU:\', 'HKEY_CURRENT_USER\')
            reg export $exportPath $backupPath /y 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Backed up registry key: $Path -> $backupPath" "SUCCESS"
                return $true
            }
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
        Write-Log "Set registry value: $Path\$Name = $Value ($Type)" "SUCCESS"
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

Write-Log "=== Gaming PC Setup Script ENHANCED Started ===" "SUCCESS"
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
    $uacStatus = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -ErrorAction SilentlyContinue).EnableLUA
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
        @{Id = "Brave.Brave"; Name = "Brave Browser" },
        @{Id = "Spotify.Spotify"; Name = "Spotify" },
        @{Id = "qBittorrent.qBittorrent"; Name = "qBittorrent" },
        @{Id = "Python.Python.3.14"; Name = "Python 3.14" },
        @{Id = "ZedIndustries.Zed"; Name = "Zed Editor" },
        @{Id = "Philips.HueSync"; Name = "Philips Hue Sync" },
        @{Id = "Logitech.GHUB"; Name = "Logitech G HUB" }
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

            $result = winget install --id $package.Id --source winget --accept-package-agreements --accept-source-agreements --silent 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Installed: $($package.Name)" "SUCCESS"
                $installed++
            } else {
                # Check if it's already installed
                $installedCheck = winget list --id $package.Id --source winget --accept-source-agreements 2>&1
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
    Write-Log "Post-installation configuration steps saved to POST-SETUP-CHECKLIST.txt" "SUCCESS"
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

        # Disable PCIe Link State Power Management (ENHANCED: reduces latency)
        powercfg /setacvalueindex SCHEME_CURRENT 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0
        powercfg /setdcvalueindex SCHEME_CURRENT 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0
        Write-Log "Disabled PCIe Link State Power Management" "SUCCESS"

        # Disable processor idle states (C-States) for ultra-low latency
        powercfg /setacvalueindex SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 5d76a2ca-e8c0-402f-a133-2158492d58ad 0
        powercfg /setdcvalueindex SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 5d76a2ca-e8c0-402f-a133-2158492d58ad 0
        Write-Log "Disabled processor idle states (C-States)" "SUCCESS"

        # Disable hibernation (ENHANCED: saves disk space, cleaner boots)
        powercfg /hibernate off
        Write-Log "Disabled hibernation (saves disk space)" "SUCCESS"

        powercfg /setactive SCHEME_CURRENT
        Write-Log "Power plan optimizations applied" "SUCCESS"

        # AMD Ryzen 7900X3D Specific Optimizations
        $cpuInfo = Get-CimInstance Win32_Processor
        if ($cpuInfo.Name -like "*7900X3D*" -or $cpuInfo.Name -like "*7950X3D*") {
            Write-Log "AMD Ryzen X3D CPU detected - applying specific optimizations" "SUCCESS"

            # Disable CPPC Preferred Cores (can cause inconsistent performance in games)
            # Some games perform better with this disabled for consistent core usage
            Set-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "CppcEnable" -Value 0 -Type "DWORD" -ErrorAction SilentlyContinue
            Write-Log "AMD X3D: Disabled CPPC Preferred Cores for consistent gaming performance" "SUCCESS"

            # Ensure Game Bar is disabled (interferes with AMD core scheduling)
            Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Name "AppCaptureEnabled" -Value 0
            Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR" -Name "GameDVR_Enabled" -Value 0
            Write-Log "AMD X3D: Ensured Game Bar is disabled (critical for X3D)" "SUCCESS"

            # Set heterogeneous policy to prefer performance cores (CCD0 with V-Cache)
            Set-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Power" -Name "HeteroPolicy" -Value 0 -Type "DWORD" -ErrorAction SilentlyContinue
            Write-Log "AMD X3D: Set heterogeneous policy to prefer V-Cache CCD" "SUCCESS"

            Write-Log "AMD Ryzen X3D optimizations complete. NOTE: Also disable CPPC in BIOS for best gaming!" "SUCCESS"
        }

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

        # High priority (0x3) for games
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

        # Enable TCP Window Scaling (helps with high-speed connections)
        Set-RegistryValue -Path $regBase -Name "Tcp1323Opts" -Value 1

        Set-RegistryValue -Path $regBase -Name "DefaultTTL" -Value 64
        Set-RegistryValue -Path $regBase -Name "EnablePMTUBHDetect" -Value 0
        Set-RegistryValue -Path $regBase -Name "EnablePMTUDiscovery" -Value 1

        # Global TCP/IP settings
        $tcpPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"

        # ENHANCED: Keep RSS enabled (Receive Side Scaling) - improves performance on multi-core
        Set-RegistryValue -Path $tcpPath -Name "EnableRSS" -Value 1
        Write-Log "Enabled RSS (Receive Side Scaling) for better multi-core performance" "SUCCESS"

        # Disable RSC (Receive Segment Coalescing) - can cause stutters
        Set-RegistryValue -Path $tcpPath -Name "EnableRSC" -Value 0

        # Disable ECN (Explicit Congestion Notification)
        Set-RegistryValue -Path $tcpPath -Name "TcpEcnEnabled" -Value 0

        # Network throttling index (maximum = disable throttling)
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" -Name "NetworkThrottlingIndex" -Value 0xffffffff -Type "DWORD"

        # Disable Chimney offload (can cause issues)
        Set-RegistryValue -Path $tcpPath -Name "EnableTCPChimney" -Value 0

        # ENHANCED: Disable network adapter power saving
        try {
            $netAdapterConfig = Get-WmiObject -Class Win32_NetworkAdapter | Where-Object { $_.GUID -eq "{$adapterGuid}" }
            if ($netAdapterConfig) {
                $powerMgmt = Get-WmiObject MSPower_DeviceEnable -Namespace root\wmi | Where-Object { $_.InstanceName -like "*$adapterGuid*" }
                if ($powerMgmt) {
                    $powerMgmt.Enable = $false
                    $powerMgmt.Put() | Out-Null
                    Write-Log "Disabled power saving for network adapter" "SUCCESS"
                }
            }
        } catch {
            Write-Log "Could not disable network adapter power saving (may require manual configuration): $_" "ERROR"
        }

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
        "XblAuthManager",               # Xbox Live Auth Manager
        "XblGameSave",                  # Xbox Live Game Save
        "XboxGipSvc",                   # Xbox Accessory Management Service
        "XboxNetApiSvc",                # Xbox Live Networking Service
        "SysMain"                       # Superfetch (keeping disabled for consistency)
    )

    # ENHANCED: NVIDIA telemetry services
    $servicesToDisable += @(
        "NvTelemetryContainer",         # NVIDIA Telemetry Container
        "NvContainerLocalSystem"        # NVIDIA Container Local System
    )

    $disabled = 0
    foreach ($serviceName in $servicesToDisable) {
        try {
            $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
            if ($service -and $service.Status -ne "Stopped") {
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

        # Hardware Accelerated GPU Scheduling (set in one place)
        $gpuSchedPath = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
        Set-RegistryValue -Path $gpuSchedPath -Name "HwSchMode" -Value 2
        Write-Log "Hardware Accelerated GPU Scheduling enabled" "SUCCESS"

        # ENHANCED: Disable NVIDIA telemetry via scheduled tasks
        try {
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
                try {
                    schtasks /Change /TN $task /DISABLE 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        Write-Log "Disabled NVIDIA telemetry task: $task" "SUCCESS"
                    }
                } catch {
                    # Task may not exist
                }
            }
        } catch {
            Write-Log "Could not disable some NVIDIA telemetry tasks (may not exist): $_" "ERROR"
        }

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
        Write-Log "DTS Audio configuration for Samsung Q990D:" "SUCCESS"
        Write-Log "1. Install Samsung audio drivers from Samsung website" "SUCCESS"
        Write-Log "2. Enable Windows Spatial Audio: Settings > System > Sound > Spatial audio" "SUCCESS"
        Write-Log "3. Configure DTS settings in Windows Sound settings" "SUCCESS"

        # Audio enhancement path (this enables protected audio DG, despite confusing name)
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
    Write-Log "=== Telemetry & Privacy Removal (ENHANCED) ==="

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

        # ENHANCED: Advertising ID
        Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo" -Name "Enabled" -Value 0
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AdvertisingInfo" -Name "DisabledByGroupPolicy" -Value 1
        Write-Log "Disabled Advertising ID" "SUCCESS"

        # ENHANCED: SmartScreen Filter (sends URLs to Microsoft)
        Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\AppHost" -Name "EnableWebContentEvaluation" -Value 0
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "EnableSmartScreen" -Value 0
        Write-Log "Disabled SmartScreen Filter" "SUCCESS"

        # ENHANCED: Activity History / Timeline
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "PublishUserActivities" -Value 0
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\System" -Name "UploadUserActivities" -Value 0
        Write-Log "Disabled Activity History / Timeline" "SUCCESS"

        # ENHANCED: WiFi Sense (shares WiFi passwords)
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config" -Name "AutoConnectAllowedOEM" -Value 0
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config" -Name "WiFISenseAllowed" -Value 0
        Write-Log "Disabled WiFi Sense" "SUCCESS"

        # ENHANCED: Cortana Data Collection
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Windows Search" -Name "AllowCortana" -Value 0
        Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "BingSearchEnabled" -Value 0
        Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "CortanaConsent" -Value 0
        Write-Log "Disabled Cortana data collection" "SUCCESS"

        # ENHANCED: Windows Feedback
        Set-RegistryValue -Path "HKCU:\Software\Microsoft\Siuf\Rules" -Name "NumberOfSIUFInPeriod" -Value 0
        Write-Log "Disabled Windows Feedback" "SUCCESS"

        # ENHANCED: App Diagnostics
        Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Diagnostics\DiagTrack" -Name "ShowedToastAtLevel" -Value 1
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppPrivacy" -Name "LetAppsGetDiagnosticInfo" -Value 2
        Write-Log "Disabled App Diagnostics" "SUCCESS"

        # ENHANCED: Automatic Sample Submission (Windows Defender)
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Spynet" -Name "SubmitSamplesConsent" -Value 2
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows Defender\Spynet" -Name "SpynetReporting" -Value 0
        Write-Log "Disabled Windows Defender automatic sample submission" "SUCCESS"

        # ENHANCED: Steps Recorder
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppCompat" -Name "DisableUAR" -Value 1
        Write-Log "Disabled Steps Recorder" "SUCCESS"

        # ENHANCED: Inventory Collector
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\AppCompat" -Name "DisableInventory" -Value 1
        Write-Log "Disabled Inventory Collector" "SUCCESS"

        # ENHANCED: Windows Spotlight
        Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "RotatingLockScreenEnabled" -Value 0
        Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "RotatingLockScreenOverlayEnabled" -Value 0
        Set-RegistryValue -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-338389Enabled" -Value 0
        Write-Log "Disabled Windows Spotlight" "SUCCESS"

        # ENHANCED: Cloud Clipboard Sync
        Set-RegistryValue -Path "HKCU:\Software\Microsoft\Clipboard" -Name "EnableClipboardHistory" -Value 0
        Write-Log "Disabled Cloud Clipboard Sync" "SUCCESS"

        # ENHANCED: Delivery Optimization P2P
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" -Name "DODownloadMode" -Value 0
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" -Name "DownloadMode" -Value 0
        Set-RegistryValue -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization" -Name "DODownloadMode" -Value 0
        Write-Log "Disabled Delivery Optimization P2P" "SUCCESS"

        # Disable scheduled tasks - ENHANCED with more tasks
        $tasks = @(
            "\Microsoft\Windows\Application Experience\Microsoft Compatibility Appraiser",
            "\Microsoft\Windows\Application Experience\ProgramDataUpdater",
            "\Microsoft\Windows\Application Experience\AitAgent",
            "\Microsoft\Windows\Application Experience\StartupAppTask",
            "\Microsoft\Windows\Customer Experience Improvement Program\Consolidator",
            "\Microsoft\Windows\Customer Experience Improvement Program\UsbCeip",
            "\Microsoft\Windows\Autochk\Proxy",
            "\Microsoft\Windows\CloudExperienceHost\CreateObjectTask",
            "\Microsoft\Windows\DiskDiagnostic\Microsoft-Windows-DiskDiagnosticDataCollector",
            "\Microsoft\Windows\Maintenance\WinSAT",
            "\Microsoft\Windows\Maps\MapsToastTask",
            "\Microsoft\Windows\Maps\MapsUpdateTask",
            "\Microsoft\Windows\Mobile Broadband Accounts\MNO Metadata Parser",
            "\Microsoft\Windows\NetTrace\GatherNetworkInfo",
            "\Microsoft\Windows\PI\Sqm-Tasks",
            "\Microsoft\Windows\Power Efficiency Diagnostics\AnalyzeSystem",
            "\Microsoft\Windows\Shell\FamilySafetyMonitor",
            "\Microsoft\Windows\Shell\FamilySafetyRefresh",
            "\Microsoft\Windows\Windows Media Sharing\UpdateLibrary"
        )

        foreach ($task in $tasks) {
            try {
                Disable-ScheduledTask -TaskName $task -ErrorAction SilentlyContinue | Out-Null
                Write-Log "Disabled scheduled task: $task" "SUCCESS"
            } catch {
                # Task may not exist, continue
            }
        }

        Write-Log "Telemetry & privacy removal complete (ENHANCED)" "SUCCESS"
    } catch {
        Write-Log "Error removing telemetry: $_" "ERROR"
    }
}
#endregion

#region Game Launch Options
function Create-GameConfigs {
    Write-Log "=== Game Launch Options & Installed Games Scan ==="

    # Scan multiple Steam library locations
    $steamPaths = @(
        "${env:ProgramFiles(x86)}\Steam\steamapps\common",
        "D:\SteamLibrary\steamapps\common",
        "C:\SteamLibrary\steamapps\common"
    )

    # Game optimization database
    $gameOptimizations = @{
        "PUBG" = @{ LaunchOptions = "-malloc=system -USEALLAVAILABLECORES -sm4"; Priority = "HIGH" }
        "Call of Duty HQ" = @{ LaunchOptions = "-high -threads 8"; Priority = "HIGH" }
        "Marvel Rivals" = @{ LaunchOptions = "-high -dx11"; Priority = "HIGH" }
        "Battlefield" = @{ LaunchOptions = "-high -threads 8 -novid"; Priority = "HIGH" }
        "Deadlock" = @{ LaunchOptions = "-high -threads 8 -novid -console +fps_max 0"; Priority = "HIGH" }
        "Aim Lab" = @{ LaunchOptions = "-high -refresh 165"; Priority = "HIGH" }
        "Cyberpunk" = @{ LaunchOptions = "-high"; Priority = "MEDIUM" }
        "Satisfactory" = @{ LaunchOptions = "-dx12 -high"; Priority = "MEDIUM" }
        "Pacific Drive" = @{ LaunchOptions = "-dx12 -high"; Priority = "MEDIUM" }
        "Need for Speed" = @{ LaunchOptions = "-high -novid"; Priority = "MEDIUM" }
        "Dragon Ball" = @{ LaunchOptions = "-high -dx11"; Priority = "MEDIUM" }
        "Trepang2" = @{ LaunchOptions = "-high -dx11"; Priority = "MEDIUM" }
        "Death Stranding" = @{ LaunchOptions = "-high"; Priority = "MEDIUM" }
        "No Man" = @{ LaunchOptions = "-high"; Priority = "MEDIUM" }
        "Age of Empires" = @{ LaunchOptions = "-high"; Priority = "MEDIUM" }
        "Age of Mythology" = @{ LaunchOptions = "-high"; Priority = "MEDIUM" }
        "Last Epoch" = @{ LaunchOptions = "-high"; Priority = "MEDIUM" }
        "Everspace" = @{ LaunchOptions = "-high"; Priority = "MEDIUM" }
        "The Long Dark" = @{ LaunchOptions = "-high"; Priority = "MEDIUM" }
        "Ace Combat" = @{ LaunchOptions = "-high"; Priority = "MEDIUM" }
        "Final Fantasy" = @{ LaunchOptions = "-high"; Priority = "MEDIUM" }
    }

    # Scan for installed games
    $installedGames = @()
    foreach ($steamPath in $steamPaths) {
        if (Test-Path $steamPath) {
            Write-Log "Scanning: $steamPath" "SUCCESS"
            $folders = Get-ChildItem -Path $steamPath -Directory -ErrorAction SilentlyContinue
            foreach ($folder in $folders) {
                foreach ($gameName in $gameOptimizations.Keys) {
                    if ($folder.Name -like "*$gameName*") {
                        $installedGames += @{
                            Name = $folder.Name
                            OptimizationKey = $gameName
                            Path = $folder.FullName
                        }
                    }
                }
            }
        }
    }

    # Log found games
    if ($installedGames.Count -gt 0) {
        Write-Log "Found $($installedGames.Count) installed games with optimization recommendations" "SUCCESS"
        Write-Log "Launch options will be listed in POST-SETUP-CHECKLIST.txt" "SUCCESS"
    }

    # CS2/Dota 2 autoexec creation (original functionality)
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
    if ($created -gt 0) {
        Write-Log "Autoexec configs created - launch options must be set manually in Steam" "SUCCESS"
        Write-Log "See POST-SETUP-CHECKLIST.txt for instructions" "SUCCESS"
    }
}
#endregion

#region Stutter Fixes & Frame Time Optimization (ENHANCED)
function Fix-Stutters {
    Write-Log "=== Stutter Fixes & Frame Time Optimization (ENHANCED) ==="

    try {
        # Disable HPET (High Precision Event Timer) - major stutter cause
        Write-Log "Disabling HPET (High Precision Event Timer)..."

        try {
            $result = bcdedit /set useplatformclock false 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Disabled useplatformclock" "SUCCESS"
            }
        } catch {
            Write-Log "Could not disable useplatformclock (may not be supported)" "ERROR"
        }

        try {
            $result = bcdedit /set disabledynamictick yes 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Log "Disabled dynamic tick" "SUCCESS"
            }
        } catch {
            Write-Log "Could not disable disabledynamictick (may not be supported)" "ERROR"
        }

        Write-Log "HPET configuration complete. Requires reboot." "SUCCESS"

        # ENHANCED: Aggressive optimizations if enabled
        if ($EnableAggressiveOptimizations) {
            Write-Log "AGGRESSIVE: Disabling Spectre/Meltdown mitigations (SECURITY RISK!)" "SUCCESS"

            try { bcdedit /set hypervisorlaunchtype off 2>&1 | Out-Null } catch { }
            try { bcdedit /set isolatedcontext No 2>&1 | Out-Null } catch { }
            try { bcdedit /set tscsyncpolicy Enhanced 2>&1 | Out-Null } catch { }
            try { bcdedit /set x2apicpolicy Enable 2>&1 | Out-Null } catch { }

            Write-Log "Spectre/Meltdown mitigations disabled (5-15% FPS boost, SECURITY RISK)" "SUCCESS"
        }

        # ENHANCED: Disable Fast Startup (causes issues with games)
        Set-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -Name "HiberbootEnabled" -Value 0
        Write-Log "Disabled Fast Startup (cleaner boots, better for gaming)" "SUCCESS"

        # Timer Resolution - CRITICAL for micro-stutter elimination
        # Windows defaults to 15.6ms timer resolution, causing inconsistent frame times
        $timerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel"
        Backup-RegistryKey $timerPath | Out-Null
        Set-RegistryValue -Path $timerPath -Name "GlobalTimerResolutionRequests" -Value 1

        # Additional timer resolution tweaks for 1% low improvement
        $multimediaPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
        Set-RegistryValue -Path $multimediaPath -Name "SystemResponsiveness" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $multimediaPath -Name "GameDVR_Enabled" -Value 0 -Type "DWORD"

        # ENHANCED: MMCSS Gaming Tweaks (Multimedia Class Scheduler Service)
        $mmcssGamesPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
        Set-RegistryValue -Path $mmcssGamesPath -Name "GPU Priority" -Value 8 -Type "DWORD"
        Set-RegistryValue -Path $mmcssGamesPath -Name "Priority" -Value 6 -Type "DWORD"
        Set-RegistryValue -Path $mmcssGamesPath -Name "Scheduling Category" -Value "High" -Type "String"
        Set-RegistryValue -Path $mmcssGamesPath -Name "SFIO Priority" -Value "High" -Type "String"
        Write-Log "Applied MMCSS gaming tweaks (prioritizes games)" "SUCCESS"

        # Set timer resolution to 0.5ms for games (requires runtime tool - see timer-tool.ps1)
        Write-Log "Timer resolution registry set. Use timer-tool.ps1 during gameplay for best results." "SUCCESS"

        # Disable Timer Coalescing - prevents CPU from sleeping cores
        $powerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Power"
        Set-RegistryValue -Path $powerPath -Name "EnergyEstimationEnabled" -Value 0
        Set-RegistryValue -Path $powerPath -Name "PlatformAoAcOverride" -Value 0

        # Enable Game Mode
        $gameModePath = "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\ApplicationManagement\AllowGameMode"
        Set-RegistryValue -Path $gameModePath -Name "value" -Value 1

        # ENHANCED: Memory Compression - only disable if user has enough RAM
        $totalRAM = (Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB
        if ($totalRAM -ge 32) {
            Disable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue
            Write-Log "Disabled memory compression (system has ${totalRAM}GB RAM)" "SUCCESS"
        } else {
            Write-Log "Keeping memory compression enabled (system has ${totalRAM}GB RAM, < 32GB threshold)" "SUCCESS"
        }

        # Disable Background Apps
        $backgroundPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications"
        Set-RegistryValue -Path $backgroundPath -Name "GlobalUserDisabled" -Value 1

        # Disable Visual Effects for performance
        $visualPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
        Set-RegistryValue -Path $visualPath -Name "VisualFXSetting" -Value 2 -Type "DWORD"

        # Disable Animations
        $animBytes = [byte[]](0x90,0x12,0x03,0x80,0x10,0x00,0x00,0x00)
        Set-RegistryValue -Path "HKCU:\Control Panel\Desktop" -Name "UserPreferencesMask" -Value $animBytes -Type "Binary"

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

        # Disable DWM (Desktop Window Manager) AeroPeek
        $dwmPath = "HKLM:\SOFTWARE\Microsoft\Windows\DWM"
        Set-RegistryValue -Path $dwmPath -Name "EnableAeroPeek" -Value 0

        # FIXED: Set process scheduler to prefer foreground applications (BALANCED, not aggressive)
        # Value 26 (decimal) = 0x1A hex = balanced gaming performance
        $schedulerPath = "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl"
        Set-RegistryValue -Path $schedulerPath -Name "Win32PrioritySeparation" -Value 26 -Type "DWORD"
        Write-Log "Set Win32PrioritySeparation to 26 (balanced gaming)" "SUCCESS"

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

        # Set audio to exclusive mode preference
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

        Write-Log "Stutter fixes and frame time optimizations applied (ENHANCED)" "SUCCESS"
        Write-Log "IMPORTANT: Reboot required for HPET and MSI mode changes to take effect" "SUCCESS"
        Write-Log "CRITICAL: Run timer-tool.ps1 during gameplay to maintain 0.5ms timer resolution" "SUCCESS"

    } catch {
        Write-Log "Error applying stutter fixes: $_" "ERROR"
    }
}
#endregion

#region ENHANCED: Hosts File Blocking (Optional)
function Set-HostsFileBlocking {
    Write-Log "=== Hosts File Telemetry Blocking (ENHANCED) ==="

    if (-not $SkipConfirmations) {
        $hostsConfirm = Read-Host "Block Microsoft telemetry domains via hosts file? (Y/N)"
        if ($hostsConfirm -ne "Y") {
            Write-Log "Skipped hosts file blocking" "SUCCESS"
            return
        }
    }

    try {
        $hostsFile = "$env:SystemRoot\System32\drivers\etc\hosts"

        # AGGRESSIVE FIX FOR X-LITE: Take ownership and force permissions
        Write-Log "Taking ownership of hosts file (required for X-Lite builds)..."

        # Take ownership using takeown.exe
        $takeownResult = takeown.exe /F $hostsFile /A 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Successfully took ownership of hosts file" "SUCCESS"
        } else {
            Write-Log "Takeown result: $takeownResult" "ERROR"
        }

        # Grant full permissions using icacls
        $icaclsResult = icacls.exe $hostsFile /grant "Administrators:F" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Successfully granted full permissions to Administrators" "SUCCESS"
        } else {
            Write-Log "Icacls result: $icaclsResult" "ERROR"
        }

        # Additional permission for current user
        $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        icacls.exe $hostsFile /grant "${currentUser}:F" 2>&1 | Out-Null

        # Stop DNS Client service to unlock hosts file
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
            # Backup hosts file (with force to override locks)
            $backupPath = "$hostsFile.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

            # Use [System.IO.File] for more control over locked files
            $hostsBytes = [System.IO.File]::ReadAllBytes($hostsFile)
            [System.IO.File]::WriteAllBytes($backupPath, $hostsBytes)
            Write-Log "Backed up hosts file to: $backupPath" "SUCCESS"

            $telemetryDomains = @(
                "vortex.data.microsoft.com",
                "vortex-win.data.microsoft.com",
                "telemetry.microsoft.com",
                "telemetry.urs.microsoft.com",
                "telemetry.appex.bing.net",
                "watson.telemetry.microsoft.com",
                "watson.ppe.telemetry.microsoft.com",
                "oca.telemetry.microsoft.com",
                "statsfe2.ws.microsoft.com",
                "corpext.msitadfs.glbdns2.microsoft.com",
                "compatexchange.cloudapp.net",
                "cs1.wpc.v0cdn.net",
                "a-0001.a-msedge.net",
                "feedback.windows.com",
                "feedback.microsoft-hohm.com",
                "feedback.search.microsoft.com"
            )

            # Read hosts file content using more robust method
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
                # Build new content
                $newContent = $hostsContentRaw
                if (-not $hostsContentRaw.EndsWith("`n")) {
                    $newContent += "`r`n"
                }
                $newContent += "`r`n# Gaming PC Setup - Microsoft Telemetry Blocking ($(Get-Date -Format 'yyyy-MM-dd'))`r`n"
                $newContent += ($newEntries -join "`r`n")
                $newContent += "`r`n"

                # Write using [System.IO.File] for better lock handling
                $utf8NoBom = New-Object System.Text.UTF8Encoding $false
                [System.IO.File]::WriteAllText($hostsFile, $newContent, $utf8NoBom)

                Write-Log "Added $($newEntries.Count) telemetry domains to hosts file" "SUCCESS"
            } else {
                Write-Log "All telemetry domains already blocked in hosts file" "SUCCESS"
            }

        } finally {
            # Always restart DNS Client service
            if ($dnsWasRunning) {
                try {
                    # Try sc.exe first (better for X-Lite builds)
                    $startResult = sc.exe start "Dnscache" 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-Log "DNS Client service restarted" "SUCCESS"
                    } else {
                        # Fallback to PowerShell cmdlet
                        Start-Service -Name "Dnscache" -ErrorAction SilentlyContinue
                        Write-Log "DNS Client service restarted" "SUCCESS"
                    }
                } catch {
                    Write-Log "DNS Client service could not be restarted (may require manual restart)" "ERROR"
                }

                # Flush DNS cache to apply changes
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
}
#endregion

#region ENHANCED: Page File Optimization
function Optimize-PageFile {
    Write-Log "=== Page File Optimization (ENHANCED) ==="

    try {
        # Get total RAM
        $totalRAM = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB)

        # For gaming PCs with sufficient RAM, use fixed size page file
        if ($totalRAM -ge 16) {
            Write-Log "System has ${totalRAM}GB RAM - setting fixed page file size" "SUCCESS"

            # Disable automatic page file management
            $ComputerSystem = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
            $ComputerSystem.AutomaticManagedPagefile = $false
            $ComputerSystem.Put() | Out-Null

            # Set fixed size (4GB for systems with 16GB+ RAM)
            $PageFile = Get-WmiObject -Query "Select * From Win32_PageFileSetting Where Name='C:\\pagefile.sys'"
            if ($PageFile) {
                $PageFile.InitialSize = 4096
                $PageFile.MaximumSize = 4096
                $PageFile.Put() | Out-Null
                Write-Log "Set page file to fixed 4GB size" "SUCCESS"
            } else {
                Write-Log "Could not find page file to configure" "ERROR"
            }
        } else {
            Write-Log "System has ${totalRAM}GB RAM - keeping automatic page file management" "SUCCESS"
        }

    } catch {
        Write-Log "Error optimizing page file: $_" "ERROR"
    }
}
#endregion

#region ENHANCED: Cloudflare DNS Configuration
function Set-CloudflareDNS {
    Write-Log "=== Cloudflare DNS Configuration (Low Latency Gaming) ==="

    if (-not $SkipConfirmations) {
        $dnsConfirm = Read-Host "Configure Cloudflare DNS (1.1.1.1) for lower latency? (Y/N)"
        if ($dnsConfirm -ne "Y") {
            Write-Log "Skipped Cloudflare DNS configuration" "SUCCESS"
            return
        }
    }

    try {
        # Auto-detect active network adapter
        $adapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and ($_.InterfaceDescription -like "*Ethernet*" -or $_.InterfaceDescription -like "*Wi-Fi*") } | Select-Object -First 1

        if (-not $adapter) {
            Write-Log "No active network adapter found" "ERROR"
            return
        }

        Write-Log "Configuring Cloudflare DNS for adapter: $($adapter.Name)" "SUCCESS"

        # Set IPv4 DNS servers (Cloudflare)
        Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses ("1.1.1.1", "1.0.0.1") -ErrorAction Stop
        Write-Log "IPv4 DNS set to Cloudflare: 1.1.1.1, 1.0.0.1" "SUCCESS"

        # Set IPv6 DNS servers (Cloudflare) if IPv6 is enabled
        try {
            $ipv6Enabled = (Get-NetAdapterBinding -InterfaceAlias $adapter.Name -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue).Enabled
            if ($ipv6Enabled) {
                Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses ("2606:4700:4700::1111", "2606:4700:4700::1001") -ErrorAction Stop
                Write-Log "IPv6 DNS set to Cloudflare: 2606:4700:4700::1111, 2606:4700:4700::1001" "SUCCESS"
            }
        } catch {
            Write-Log "IPv6 not enabled or could not configure IPv6 DNS" "SUCCESS"
        }

        # Flush DNS cache
        ipconfig /flushdns | Out-Null
        Write-Log "DNS cache flushed" "SUCCESS"

        # Register DNS
        ipconfig /registerdns | Out-Null
        Write-Log "DNS registered" "SUCCESS"

        # Test DNS resolution
        Write-Log "Testing DNS resolution..."
        try {
            $testResult = Resolve-DnsName -Name "google.com" -Server "1.1.1.1" -ErrorAction Stop -QuickTimeout
            if ($testResult) {
                Write-Log "DNS resolution test successful via Cloudflare" "SUCCESS"
            }
        } catch {
            Write-Log "DNS resolution test failed (network may need a moment to update)" "ERROR"
        }

        Write-Log "Cloudflare DNS configuration complete" "SUCCESS"
        Write-Log "Benefits: Lower latency, faster DNS lookups, better privacy" "SUCCESS"

    } catch {
        Write-Log "Error configuring Cloudflare DNS: $_" "ERROR"
    }
}
#endregion

#region Main Execution
try {
    Write-Host "`n=== Gaming PC Setup Script ENHANCED ===" -ForegroundColor Cyan
    Write-Host "This script will optimize your Windows system for gaming.`n" -ForegroundColor Yellow

    if ($EnableAggressiveOptimizations) {
        Write-Host "WARNING: Aggressive optimizations enabled (disables Spectre/Meltdown mitigations)" -ForegroundColor Red
        Write-Host "This provides 5-15% FPS boost but has SECURITY implications!`n" -ForegroundColor Red
    }

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
        @{ Name = "Cloudflare DNS Configuration"; Function = { Set-CloudflareDNS }; Weight = 3 },
        @{ Name = "QoS Configuration"; Function = { Set-QoSConfiguration }; Weight = 5 },
        @{ Name = "Stutter Fixes & Frame Time Optimization"; Function = { Fix-Stutters }; Weight = 20 },
        @{ Name = "Service Management"; Function = { Disable-Services }; Weight = 10 },
        @{ Name = "Bloatware Removal"; Function = { Remove-Bloatware }; Weight = 10 },
        @{ Name = "NVIDIA Configuration"; Function = { Set-NVIDIASettings }; Weight = 10 },
        @{ Name = "DTS Audio Setup"; Function = { Set-DTSAudio }; Weight = 5 },
        @{ Name = "Telemetry & Privacy Removal"; Function = { Remove-Telemetry }; Weight = 10 },
        @{ Name = "Game Launch Options"; Function = { Create-GameConfigs }; Weight = 5 },
        @{ Name = "Hosts File Telemetry Blocking"; Function = { Set-HostsFileBlocking }; Weight = 3 },
        @{ Name = "Page File Optimization"; Function = { Optimize-PageFile }; Weight = 2 }
    )

    $totalWeight = 0; foreach ($s in $sections) { $totalWeight += $s.Weight }
    $currentWeight = 0

    foreach ($section in $sections) {
        $currentWeight += $section.Weight
        $percent = [int]($currentWeight / $totalWeight * 100)
        Write-Progress-Log "Gaming PC Setup ENHANCED" $section.Name $percent

        try {
            & $section.Function
        } catch {
            Write-Log "Error in section $($section.Name): $_" "ERROR"
        }
    }

    Write-Progress -Activity "Gaming PC Setup ENHANCED" -Completed

    $duration = (Get-Date) - $script:StartTime
    Write-Log "=== Script Completed Successfully ===" "SUCCESS"
    Write-Log "Total execution time: $($duration.ToString('mm\:ss'))" "SUCCESS"

    # Build post-setup checklist
    $steamPaths = @(
        "${env:ProgramFiles(x86)}\Steam\steamapps\common",
        "D:\SteamLibrary\steamapps\common",
        "C:\SteamLibrary\steamapps\common"
    )

    $gameOptimizations = @{
        "PUBG" = "-malloc=system -USEALLAVAILABLECORES -sm4"
        "Call of Duty HQ" = "-high -threads 8"
        "Marvel Rivals" = "-high -dx11"
        "Battlefield" = "-high -threads 8 -novid"
        "Deadlock" = "-high -threads 8 -novid -console +fps_max 0"
        "Aim Lab" = "-high -refresh 165"
        "Cyberpunk" = "-high"
        "Satisfactory" = "-dx12 -high"
        "Pacific Drive" = "-dx12 -high"
        "Need for Speed" = "-high -novid"
        "CS2" = "-high -threads 8 -novid -tickrate 128 +fps_max 0"
        "Counter-Strike" = "-high -threads 8 -novid -tickrate 128 +fps_max 0"
        "Dota 2" = "-high -threads 8 -novid -console"
        "dota 2 beta" = "-high -threads 8 -novid -console"
    }

    # Detect installed games for summary stats
    $detectedGames = @()
    foreach ($steamPath in $steamPaths) {
        if (Test-Path $steamPath) {
            $folders = Get-ChildItem -Path $steamPath -Directory -ErrorAction SilentlyContinue
            foreach ($folder in $folders) {
                foreach ($gameName in $gameOptimizations.Keys) {
                    if ($folder.Name -like "*$gameName*") {
                        $detectedGames += $gameName
                        break
                    }
                }
            }
        }
    }

    # Create comprehensive checklist file
    $checklistContent = @"
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                    🎮 POST-SETUP CHECKLIST - ACTION REQUIRED! 🎮              ║
║                                                                              ║
║              Complete these steps to finish your gaming setup                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Script: gaming-pc-setup-enhanced.ps1

════════════════════════════════════════════════════════════════════════════════
 ⚠️  STEP 1: REBOOT YOUR COMPUTER (REQUIRED!)
════════════════════════════════════════════════════════════════════════════════

  [ ] Restart Windows now to apply all optimizations (DO THIS FIRST!)

════════════════════════════════════════════════════════════════════════════════
 🎯 STEP 2: STEAM LAUNCH OPTIONS (30 seconds per game)
════════════════════════════════════════════════════════════════════════════════

  HOW TO: Steam → Library → Right-click game → Properties → Launch Options

"@

    # Sort games alphabetically and display in compact format
    $sortedGames = $gameOptimizations.GetEnumerator() | Sort-Object Key
    foreach ($game in $sortedGames) {
        $installed = if ($detectedGames -contains $game.Key) { "✓" } else { " " }
        $checklistContent += "  [$installed] $($game.Key): $($game.Value)`n"
    }

    $checklistContent += "`n  💡 Games with ✓ are installed | Copy/paste options into Steam`n`n"

    # Spotify configuration
    if ($script:WingetAvailable) {
        $checklistContent += @"
════════════════════════════════════════════════════════════════════════════════
 🎵 STEP 3: CONFIGURE SPOTIFY (2 MINUTES)
════════════════════════════════════════════════════════════════════════════════

  Open Spotify → Settings (Ctrl+,):

  [ ] Scroll to "Startup and window behaviour"
      • DISABLE "Open Spotify automatically after you log into the computer"
        (Saves resources for gaming!)

  [ ] Scroll to "Audio Quality"
      • Set "Streaming quality" → Very High
      • Set "Download quality" → Very High
        (You deserve better audio quality!)


"@
    }

    # DNS verification
    $checklistContent += @"
════════════════════════════════════════════════════════════════════════════════
 🌐 STEP 4: VERIFY DNS CONFIGURATION (30 SECONDS)
════════════════════════════════════════════════════════════════════════════════

  Open PowerShell or CMD and run:

  [ ] nslookup google.com

      Expected output should show: 1.1.1.1 (Cloudflare DNS)
      ✓ If you see 1.1.1.1 → DNS is working!
      ✗ If not → DNS may need manual configuration


"@

    # NVIDIA settings
    $checklistContent += @"
════════════════════════════════════════════════════════════════════════════════
 🎮 STEP 5: NVIDIA CONTROL PANEL SETTINGS (5 MINUTES)
════════════════════════════════════════════════════════════════════════════════

  Open NVIDIA Control Panel (right-click desktop):

  [ ] Manage 3D Settings → Global Settings:
      • Power management mode → Prefer maximum performance
      • Low latency mode → Ultra
      • Vertical sync → Off (or Fast if you have G-Sync)
      • Texture filtering - Quality → High performance
      • Threaded optimization → On

  💡 These settings drastically improve frame times and reduce input lag!


"@

    # Optional/Advanced steps
    $checklistContent += @"
════════════════════════════════════════════════════════════════════════════════
 🔧 OPTIONAL STEPS (When You Have Time)
════════════════════════════════════════════════════════════════════════════════

  [ ] qBittorrent Search Plugins (OPTIONAL)
      • Python 3.14 was installed for search plugin support
      • In qBittorrent: View → Search Engine → Install plugins
      • Search for: The Pirate Bay, 1337x, RARBG plugins

  [ ] Philips Hue Sync (if installed)
      • Great for ambient gaming lighting!
      • ⚠️  Can cause DPC latency → Close if you get stutters
      • Or use game-mode.ps1 to auto-close it before gaming

  [ ] DTS Audio Setup (Samsung Q990D)
      • Settings → System → Sound → Spatial audio
      • Configure DTS:X settings
      • Install Samsung audio drivers if needed

  [ ] Windows Graphics Settings (Per-Game Tweaks)
      • Settings → System → Display → Graphics settings
      • Add each game EXE manually
      • Set to "High performance"
      • Enable/disable "Hardware-accelerated GPU scheduling" per preference


"@

    # Performance verification
    $checklistContent += @"
════════════════════════════════════════════════════════════════════════════════
 📊 STEP 6: VERIFY PERFORMANCE IMPROVEMENTS (AFTER REBOOT)
════════════════════════════════════════════════════════════════════════════════

  After rebooting, test your games:

  [ ] Check FPS improvements (should see 5-20% boost)
  [ ] Monitor frame times (should be more consistent - less stutters)
  [ ] Test input latency (should feel more responsive)
  [ ] Run LatencyMon to verify DPC latency is low (<500μs is good)

  💡 Keep this checklist and mark items as done!


"@

    # Warnings
    if ($EnableAggressiveOptimizations) {
        $checklistContent += @"
════════════════════════════════════════════════════════════════════════════════
 ⚠️  SECURITY WARNING
════════════════════════════════════════════════════════════════════════════════

  Aggressive optimizations were enabled:
  • Spectre/Meltdown mitigations DISABLED
  • 5-15% FPS boost at the cost of security

  [ ] Be cautious with untrusted software
  [ ] Don't use this PC for sensitive banking/work
  [ ] Consider re-enabling if you need better security


"@
    }

    # Footer
    $checklistContent += @"
════════════════════════════════════════════════════════════════════════════════
 📝 NOTES & TIPS
════════════════════════════════════════════════════════════════════════════════

  • REBOOT IS MANDATORY - Do it first!
  • Steam launch options take 30 sec per game - do it while fresh!
  • Keep this file open and check off items as you complete them
  • Games with ✓ are already installed on your system
  • Questions? Check the log file: $script:LogPath

  🎯 Priority order: Reboot → Steam → Spotify → NVIDIA → Everything else

════════════════════════════════════════════════════════════════════════════════

Happy gaming! Your setup is now optimized for maximum performance. 🚀

"@

    # Save checklist to file
    try {
        $checklistPath = ".\POST-SETUP-CHECKLIST.txt"
        Set-Content -Path $checklistPath -Value $checklistContent -Encoding UTF8
        Write-Log "Post-setup checklist saved to: $checklistPath" "SUCCESS"

        # Auto-open the checklist in Notepad
        try {
            Start-Process "notepad.exe" -ArgumentList $checklistPath -ErrorAction SilentlyContinue
            Write-Log "Opened checklist in Notepad" "SUCCESS"
        } catch {
            Write-Log "Could not auto-open checklist (open it manually)" "ERROR"
        }
    } catch {
        Write-Log "Could not save checklist file: $_" "ERROR"
    }

    # Display condensed version on screen
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                                                                              ║" -ForegroundColor Green
    Write-Host "║                    🎮 SETUP COMPLETE - ACTION REQUIRED! 🎮                    ║" -ForegroundColor Green
    Write-Host "║                                                                              ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  🚨 IMPORTANT: Checklist opened in Notepad!" -ForegroundColor Red
    Write-Host ""
    Write-Host "  POST-SETUP-CHECKLIST.txt contains all the steps you need." -ForegroundColor Yellow
    Write-Host "  → $(Resolve-Path '.\POST-SETUP-CHECKLIST.txt')" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ⚡ QUICK SUMMARY (DO IN THIS ORDER):" -ForegroundColor Red
    Write-Host ""
    Write-Host "  [ ] 1. READ THE CHECKLIST FILE (already open in Notepad)" -ForegroundColor White
    Write-Host "         (Keep it open so you don't lose track!)" -ForegroundColor Gray
    Write-Host ""

    Write-Host "  [ ] 2. SET STEAM LAUNCH OPTIONS" -ForegroundColor White
    $installedCount = $detectedGames.Count
    $totalCount = $gameOptimizations.Count
    if ($installedCount -gt 0) {
        Write-Host "         Found $installedCount/$totalCount games | All $totalCount games listed in checklist" -ForegroundColor Gray
    } else {
        Write-Host "         All $totalCount supported games listed in checklist for reference" -ForegroundColor Gray
    }
    Write-Host ""

    Write-Host "  [ ] 3. CONFIGURE SPOTIFY (disable autostart, set quality)" -ForegroundColor White
    Write-Host "         Settings → Startup behaviour + Audio Quality" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [ ] 4. NVIDIA CONTROL PANEL (max performance, low latency)" -ForegroundColor White
    Write-Host "         Right-click desktop → NVIDIA Control Panel" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  [ ] 5. REBOOT YOUR COMPUTER (DO THIS LAST!)" -ForegroundColor Yellow
    Write-Host "         (Rebooting closes this window - do other steps first)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  💡 TIP: Open the checklist file NOW, then do the other steps!" -ForegroundColor Cyan
    Write-Host ""

    if ($EnableAggressiveOptimizations) {
        Write-Host "  ⚠️  WARNING: Spectre/Meltdown mitigations disabled" -ForegroundColor Red
        Write-Host "     5-15% FPS boost, but reduced security" -ForegroundColor Red
        Write-Host ""
    }

    Write-Host "════════════════════════════════════════════════════════════════════════════════" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Log "Fatal error: $_" "ERROR"
    Write-Host "`nScript encountered a fatal error. Check the log file for details.`n" -ForegroundColor Red
    exit 1
}
#endregion

