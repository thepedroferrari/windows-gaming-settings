import { store } from '../state'
import type { HardwareProfile, MonitorSoftwareType, PeripheralType } from '../types'
import {
  CPU_TYPES,
  GPU_TYPES,
  MONITOR_SOFTWARE_TYPES,
  OPTIMIZATION_KEYS,
  PERIPHERAL_TYPES,
  SCRIPT_FILENAME,
} from '../types'
import { getHardwareProfile, getSelectedOptimizations } from './summary'

// Preview state for diff tracking
const preview = {
  previous: '',
  current: '',
}

// Peripheral package mapping - typed with PeripheralType
const PERIPHERAL_PACKAGES: Record<PeripheralType, string> = {
  [PERIPHERAL_TYPES.LOGITECH]: 'Logitech.GHUB',
  [PERIPHERAL_TYPES.RAZER]: 'RazerInc.RazerInstaller.Synapse4',
  [PERIPHERAL_TYPES.CORSAIR]: 'Corsair.iCUE.5',
  [PERIPHERAL_TYPES.STEELSERIES]: 'SteelSeries.GG',
  [PERIPHERAL_TYPES.ASUS]: 'Asus.ArmouryCrate',
  [PERIPHERAL_TYPES.WOOTING]: 'Wooting.Wootility',
}

// Monitor software package mapping
const MONITOR_PACKAGES: Record<MonitorSoftwareType, string> = {
  [MONITOR_SOFTWARE_TYPES.DELL]: 'Dell.DisplayManager',
  [MONITOR_SOFTWARE_TYPES.LG]: 'LG.OnScreenControl',
  [MONITOR_SOFTWARE_TYPES.HP]: 'HP.DisplayCenter',
}

export function getTrackedScript(): string {
  const script = generateScript()
  if (preview.current && preview.current !== script) {
    preview.previous = preview.current
  }
  preview.current = script
  return script
}

export function getPreviousScript(): string {
  return preview.previous
}

export function generateScript(): string {
  const hw = getHardwareProfile()
  const opts = getSelectedOptimizations()
  const packages: string[] = Array.from(store.selectedSoftware)
    .map((key) => store.getPackage(key)?.id)
    .filter((id): id is string => Boolean(id))

  // Add peripheral software
  for (const p of hw.peripherals) {
    const pkg = PERIPHERAL_PACKAGES[p]
    if (pkg) packages.push(pkg)
  }

  // Add monitor software
  for (const m of hw.monitorSoftware) {
    const pkg = MONITOR_PACKAGES[m]
    if (pkg) packages.push(pkg)
  }

  const timestamp = new Date().toISOString()
  const config = JSON.stringify(
    { generated: timestamp, hardware: hw, optimizations: opts, packages },
    null,
    2,
  )

  const optCode = generateOptCode(opts, hw)
  const postSetupHtml = generatePostSetupHTML(hw, opts, packages)

  return `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    RockTune — Loadout generated ${timestamp}
.DESCRIPTION
    Core: ${hw.cpu} + ${hw.gpu}
    Source: https://github.com/thepedroferrari/windows-gaming-settings

    Windows is the arena. RockTune is the upgrade bay.
#>

$Config = @'
${config}
'@ | ConvertFrom-Json

function Write-Step { param([string]$M) Write-Host ""; Write-Host "=== $M ===" -ForegroundColor Cyan }
function Write-OK { param([string]$M) Write-Host "  [OK] $M" -ForegroundColor Green }
function Write-Fail { param([string]$M) Write-Host "  [FAIL] $M" -ForegroundColor Red }

function Set-Reg {
    param([string]$Path, [string]$Name, $Value, [string]$Type = "DWORD")
    try {
        if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
        $existing = Get-ItemProperty -Path $Path -Name $Name -EA SilentlyContinue
        if ($null -eq $existing) {
            New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force | Out-Null
        } else {
            Set-ItemProperty -Path $Path -Name $Name -Value $Value -EA Stop
        }
        return $true
    } catch { return $false }
}

Clear-Host
Write-Host ""; Write-Host "  ROCKTUNE LOADOUT" -ForegroundColor Magenta; Write-Host "  ================" -ForegroundColor Magenta; Write-Host ""

# Pre-flight: Restore Point
Write-Host ""
Write-Host "  [PRE-FLIGHT] System Restore Point" -ForegroundColor Yellow
$spEnabled = $null
try { $spEnabled = (Get-ComputerRestorePoint -EA SilentlyContinue) -ne $null } catch {}
if ($spEnabled -eq $false) {
    Write-Host "  System Protection is DISABLED. Enable it in System Properties for safety." -ForegroundColor Red
} else {
    $createRP = Read-Host "  Create restore point before applying changes? (Y/n)"
    if ($createRP -ne 'n' -and $createRP -ne 'N') {
        Write-Host "  Creating restore point..." -ForegroundColor Cyan
        try {
            Checkpoint-Computer -Description "Before RockTune" -RestorePointType MODIFY_SETTINGS -EA Stop
            Write-OK "Restore point created"
        } catch {
            Write-Fail "Could not create restore point: $($_.Exception.Message)"
            $continue = Read-Host "  Continue anyway? (y/N)"
            if ($continue -ne 'y' -and $continue -ne 'Y') { exit }
        }
    }
}
Write-Host ""

$cpu = (Get-CimInstance Win32_Processor).Name
$gpu = (Get-CimInstance Win32_VideoController | ? {$_.Status -eq "OK"} | Select -First 1).Name
$ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure -Property Capacity -Sum).Sum / 1GB)
Write-Host "  CPU: $cpu" -ForegroundColor White; Write-Host "  GPU: $gpu" -ForegroundColor White; Write-Host "  RAM: \${ram}GB" -ForegroundColor White

Write-Step "Upgrades"
${optCode}

Write-Step "Arsenal (winget)"
# Check if winget is available
$wingetPath = Get-Command winget -EA SilentlyContinue
if (-not $wingetPath) {
    Write-Fail "winget not found. Install App Installer from Microsoft Store."
} else {
    $pkgs = @(${packages.map((p) => `"${p}"`).join(', ')})
    foreach ($p in $pkgs) {
        Write-Host "  Installing $p..." -NoNewline
        $null = winget install --id $p -e --accept-package-agreements --accept-source-agreements --silent 2>&1
        if ($LASTEXITCODE -eq 0) { Write-OK "" } else { Write-Fail "(exit code: $LASTEXITCODE)" }
    }
}

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Green
Write-Host "  LOADOUT FORGED! " -ForegroundColor Green -NoNewline
Write-Host "Reboot recommended." -ForegroundColor White
Write-Host "  ========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Opening POST-SETUP GUIDE in your browser..." -ForegroundColor Cyan

# Generate comprehensive HTML guide
$htmlGuide = @'
${postSetupHtml}
'@

$guidePath = Join-Path $env:TEMP "rocktune-guide.html"
Set-Content -Path $guidePath -Value $htmlGuide -Encoding UTF8
Start-Process $guidePath

Write-Host "  Guide saved to: $guidePath" -ForegroundColor Gray
Write-Host ""
Write-Host "  Need help? github.com/thepedroferrari/windows-gaming-settings" -ForegroundColor Gray
Write-Host ""
pause
`
}

function generateOptCode(opts: string[], hw: HardwareProfile): string {
  const code: string[] = []

  // ALWAYS INCLUDED: Core gaming optimizations
  code.push(`
# Scheduler optimization for gaming
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" "Win32PrioritySeparation" 26
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" "IRQ8Priority" 1
Write-OK "Windows scheduler optimized for gaming"`)

  code.push(`
# MMCSS (Multimedia Class Scheduler) gaming priority
$mmcss = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games"
if (!(Test-Path $mmcss)) { New-Item -Path $mmcss -Force | Out-Null }
Set-Reg $mmcss "GPU Priority" 8
Set-Reg $mmcss "Priority" 6
Set-Reg $mmcss "Scheduling Category" "High" "String"
Set-Reg $mmcss "SFIO Priority" "High" "String"
Write-OK "MMCSS gaming priority configured"`)

  code.push(`
# Windows Game Mode
Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "AllowAutoGameMode" 1
Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "AutoGameModeEnabled" 1
Write-OK "Windows Game Mode enabled"`)

  const minState = hw.cpu === CPU_TYPES.AMD_X3D ? 5 : 10
  code.push(`
# Min processor state (thermal headroom for higher boost clocks)
powercfg /setacvalueindex SCHEME_CURRENT 54533251-82be-4824-96c1-47b60b740d00 bc5038f7-23e0-4960-96da-33abaf5935ed ${minState}
powercfg /setactive SCHEME_CURRENT
Write-OK "Min processor state: ${minState}% (thermal headroom)"`)

  code.push(`
# Timer resolution registry hints
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" "GlobalTimerResolutionRequests" 1
Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" "SystemResponsiveness" 0
Write-OK "Timer resolution hints configured"`)

  // OPTIONAL: Checkbox-based optimizations
  if (opts.includes(OPTIMIZATION_KEYS.PAGEFILE))
    code.push(`
$ramGB = [math]::Round((gcim Win32_PhysicalMemory | Measure -Property Capacity -Sum).Sum / 1GB)
$sz = if ($ramGB -ge 32) { 4096 } else { 8192 }
try { $cs = gcim Win32_ComputerSystem; $cs | scim -Property @{AutomaticManagedPagefile=$false}; Write-OK "PageFile \${sz}MB" } catch { Write-Fail "PageFile" }`)

  if (opts.includes(OPTIMIZATION_KEYS.FASTBOOT))
    code.push(`
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" "HiberbootEnabled" 0
powercfg /hibernate off 2>&1 | Out-Null
Write-OK "Fast Startup & Hibernation disabled"`)

  if (opts.includes(OPTIMIZATION_KEYS.POWER_PLAN))
    code.push(`
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>$null; Write-OK "High Performance plan"`)

  if (opts.includes(OPTIMIZATION_KEYS.USB_POWER))
    code.push(`
powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0; Write-OK "USB Suspend disabled"`)

  if (opts.includes(OPTIMIZATION_KEYS.PCIE_POWER))
    code.push(`
powercfg /setacvalueindex SCHEME_CURRENT 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0; Write-OK "PCIe ASPM disabled"`)

  if (opts.includes(OPTIMIZATION_KEYS.DNS))
    code.push(`
Get-NetAdapter | ? {$_.Status -eq "Up"} | % { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses ("1.1.1.1","1.0.0.1") }; Write-OK "DNS 1.1.1.1"`)

  if (opts.includes(OPTIMIZATION_KEYS.NAGLE))
    code.push(`
# TCP Nagle disable (NOTE: Only affects TCP games - most modern games use UDP)
gci "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces" | % { Set-Reg $_.PSPath "TcpAckFrequency" 1; Set-Reg $_.PSPath "TCPNoDelay" 1 }
Write-OK "Nagle disabled (TCP only)"
Write-Host "  [INFO] Most games use UDP - this mainly helps older TCP-based games" -ForegroundColor Gray`)

  if (opts.includes(OPTIMIZATION_KEYS.MSI_MODE))
    code.push(`
Get-PnpDevice -Class Display | ? {$_.Status -eq "OK"} | % { $p = "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$($_.InstanceId -replace '\\\\','\\\\')\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties"; if (Test-Path $p) { Set-Reg $p "MSISupported" 1 } }; Write-OK "MSI Mode (reboot needed)"`)

  if (opts.includes(OPTIMIZATION_KEYS.GAME_BAR))
    code.push(`
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" "AppCaptureEnabled" 0; Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" "GameDVR_Enabled" 0; Write-OK "Game Bar overlays disabled"`)

  if (hw.cpu === CPU_TYPES.AMD_X3D)
    code.push(`
# AMD X3D Optimization (CPPC + scheduler hints)
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power" "CppcEnable" 1
Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power" -Name "HeteroPolicy" -EA SilentlyContinue
# Game Bar: keep detection (required for X3D optimizer), disable overlays only
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" "AppCaptureEnabled" 0
Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "ShowStartupPanel" 0
Write-OK "AMD X3D: CPPC enabled, HeteroPolicy removed, Game Bar overlays off"
Write-Host "  [INFO] Install AMD Chipset Drivers for 3D V-Cache optimizer" -ForegroundColor Yellow
Write-Host "  Download: https://www.amd.com/en/support" -ForegroundColor Cyan`)

  if (hw.gpu === GPU_TYPES.NVIDIA)
    code.push(`
# NVIDIA telemetry tasks disable
$nvTasks = Get-ScheduledTask | Where-Object { $_.TaskName -like "NvTmRep*" -or $_.TaskName -like "NvDriverUpdateCheck*" } -EA SilentlyContinue
if ($nvTasks) { $nvTasks | Disable-ScheduledTask -EA SilentlyContinue | Out-Null; Write-OK "NVIDIA telemetry tasks disabled" }
else { Write-Host "  [INFO] No NVIDIA telemetry tasks found" -ForegroundColor Gray }`)

  if (opts.includes(OPTIMIZATION_KEYS.HAGS))
    code.push(`
# HAGS (Hardware Accelerated GPU Scheduling)
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" "HwSchMode" 2
Write-OK "HAGS enabled (reboot required)"
Write-Host "  [INFO] Test game performance - HAGS benefits vary by game/GPU" -ForegroundColor Yellow`)

  if (opts.includes(OPTIMIZATION_KEYS.PRIVACY_TIER1))
    code.push(`
# Privacy Tier 1: Safe settings (ads, activity history, spotlight)
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" "Enabled" 0
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" "DisabledByGroupPolicy" 1
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" "PublishUserActivities" 0
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" "UploadUserActivities" 0
Set-Reg "HKCU:\\Software\\Microsoft\\Siuf\\Rules" "NumberOfSIUFInPeriod" 0
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "RotatingLockScreenEnabled" 0
Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" "AllowTelemetry" 1
Write-OK "Privacy Tier 1 (ads, activity, spotlight disabled)"`)

  if (opts.includes(OPTIMIZATION_KEYS.PRIVACY_TIER2))
    code.push(`
# Privacy Tier 2: Disable tracking services
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" "AllowTelemetry" 1
Stop-Service DiagTrack -Force -EA SilentlyContinue; Set-Service DiagTrack -StartupType Disabled -EA SilentlyContinue
Stop-Service dmwappushservice -Force -EA SilentlyContinue; Set-Service dmwappushservice -StartupType Disabled -EA SilentlyContinue
Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" "Disabled" 1
Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization\\Config" "DODownloadMode" 0
Write-OK "Privacy Tier 2 (tracking services disabled)"
Write-Host "  [WARN] May affect Windows diagnostics" -ForegroundColor Yellow`)

  if (opts.includes(OPTIMIZATION_KEYS.PRIVACY_TIER3))
    code.push(`
Write-Host "  [WARN] Privacy Tier 3 - May break Store/Xbox" -ForegroundColor Yellow
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" "AllowTelemetry" 0
Stop-Service DiagTrack -Force -EA SilentlyContinue; Set-Service DiagTrack -StartupType Disabled -EA SilentlyContinue
Write-OK "Privacy Tier 3"`)

  if (opts.includes(OPTIMIZATION_KEYS.BLOATWARE))
    code.push(`
# Remove UWP bloatware
$bloat = @("Microsoft.GetHelp","Microsoft.Getstarted","Microsoft.Microsoft3DViewer","Microsoft.MicrosoftSolitaireCollection","Microsoft.People","Microsoft.SkypeApp","Microsoft.YourPhone","Microsoft.ZuneMusic","Microsoft.ZuneVideo","Microsoft.MixedReality.Portal","Microsoft.BingWeather","Microsoft.BingNews")
foreach ($app in $bloat) { Get-AppxPackage -Name $app -EA SilentlyContinue | Remove-AppxPackage -EA SilentlyContinue }
Write-OK "UWP bloatware removed"
Write-Host "  [INFO] Removed: People, Your Phone, Solitaire, 3D Viewer, etc." -ForegroundColor Gray`)

  if (opts.includes(OPTIMIZATION_KEYS.TIMER))
    code.push(`
# Timer Resolution (0.5ms for smooth frame pacing)
Add-Type @"
using System; using System.Runtime.InteropServices;
public class TimerRes { [DllImport("ntdll.dll")] public static extern uint NtSetTimerResolution(uint Res, bool Set, out uint Cur); }
"@
$cur = [uint32]0; [TimerRes]::NtSetTimerResolution(5000, $true, [ref]$cur) | Out-Null
Write-OK "Timer resolution set to 0.5ms"
Write-Host "  [INFO] Keep this window open during gameplay for best results" -ForegroundColor Yellow`)

  if (opts.includes(OPTIMIZATION_KEYS.AUDIO_ENHANCEMENTS))
    code.push(`
# Disable audio enhancements and system sounds
Set-ItemProperty -Path "HKCU:\\AppEvents\\Schemes" -Name "(Default)" -Value ".None" -EA SilentlyContinue
Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Audio" "DisableSysSounds" 1
Write-OK "Audio enhancements disabled, system sounds off"`)

  if (opts.includes(OPTIMIZATION_KEYS.HPET))
    code.push(`
# Disable HPET (results vary - benchmark before/after)
bcdedit /set useplatformclock false 2>&1 | Out-Null
bcdedit /set disabledynamictick yes 2>&1 | Out-Null
Write-OK "HPET disabled (reboot required)"
Write-Host "  [WARN] Test before/after with benchmarks - results vary by system" -ForegroundColor Yellow`)

  if (opts.includes(OPTIMIZATION_KEYS.GAMEDVR))
    code.push(`
# Disable GameDVR
Set-Reg "HKCU:\\System\\GameConfigStore" "GameDVR_Enabled" 0
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" "AppCaptureEnabled" 0
Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\PolicyManager\\default\\ApplicationManagement\\AllowGameDVR" "value" 0
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" "AllowGameDVR" 0
Write-OK "GameDVR disabled (capture overhead removed)"`)

  if (opts.includes(OPTIMIZATION_KEYS.BACKGROUND_APPS))
    code.push(`
# Block background Store apps
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" "GlobalUserDisabled" 1
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" "BackgroundAppGlobalToggle" 0
Write-OK "Background apps blocked"`)

  if (opts.includes(OPTIMIZATION_KEYS.EDGE_DEBLOAT))
    code.push(`
# Edge debloat
$edgePolicies = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge"
if (!(Test-Path $edgePolicies)) { New-Item -Path $edgePolicies -Force | Out-Null }
Set-Reg $edgePolicies "StartupBoostEnabled" 0
Set-Reg $edgePolicies "HubsSidebarEnabled" 0
Set-Reg $edgePolicies "EdgeShoppingAssistantEnabled" 0
Set-Reg $edgePolicies "PersonalizationReportingEnabled" 0
Set-Reg $edgePolicies "MetricsReportingEnabled" 0
Set-Reg $edgePolicies "EdgeCollectionsEnabled" 0
Set-Reg $edgePolicies "ShowMicrosoftRewards" 0
Set-Reg $edgePolicies "SpotlightExperiencesAndRecommendationsEnabled" 0
Write-OK "Edge debloated (rewards/popups/telemetry off)"`)

  if (opts.includes(OPTIMIZATION_KEYS.COPILOT_DISABLE))
    code.push(`
# Disable Copilot
Set-Reg "HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" "TurnOffWindowsCopilot" 1
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" "TurnOffWindowsCopilot" 1
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" "ShowCopilotButton" 0
Write-OK "Microsoft Copilot disabled"`)

  if (opts.includes(OPTIMIZATION_KEYS.EXPLORER_SPEED))
    code.push(`
# Explorer speed
Set-Reg "HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\Bags\\AllFolders\\Shell" "FolderType" "NotSpecified" "String"
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" "LaunchTo" 1
Write-OK "Explorer folder type detection disabled (faster browsing)"
Write-Host "  [INFO] May need to log off for full effect" -ForegroundColor Gray`)

  if (opts.includes(OPTIMIZATION_KEYS.TEMP_PURGE))
    code.push(`
# Purge temp files
$tempPaths = @($env:TEMP, "$env:LOCALAPPDATA\\Temp", "$env:WINDIR\\Temp")
$freed = 0
foreach ($path in $tempPaths) {
    if (Test-Path $path) {
        $size = (Get-ChildItem $path -Recurse -Force -EA SilentlyContinue | Measure-Object -Property Length -Sum).Sum
        Remove-Item "$path\\*" -Recurse -Force -EA SilentlyContinue
        $freed += $size
    }
}
$freedMB = [math]::Round($freed / 1MB, 1)
Write-OK "Temp files purged (\${freedMB}MB freed)"`)

  if (opts.includes(OPTIMIZATION_KEYS.RAZER_BLOCK))
    code.push(`
# Block Razer/OEM WPBT auto-install
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager" "DisableWpbt" 1
$razerPath = "$env:LOCALAPPDATA\\Razer"
if (Test-Path $razerPath) {
    $acl = Get-Acl $razerPath
    $acl.SetAccessRuleProtection($true, $false)
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule("Everyone","FullControl","Deny")
    $acl.AddAccessRule($rule)
    Set-Acl $razerPath $acl -EA SilentlyContinue
}
Write-OK "OEM/Razer WPBT auto-install blocked"`)

  // Caution tier optimizations
  if (opts.includes(OPTIMIZATION_KEYS.ULTIMATE_PERF))
    code.push(`
# Ultimate Performance power plan
$ultPerfGuid = "e9a42b02-d5df-448d-aa00-03f14749eb61"
powercfg -duplicatescheme $ultPerfGuid 2>$null
powercfg /setactive $ultPerfGuid 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-OK "Ultimate Performance plan activated"
} else {
    # Fallback to High Performance
    powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>$null
    Write-OK "High Performance plan activated (Ultimate not available)"
}
Write-Host "  [WARN] High idle power/thermals - avoid on laptops" -ForegroundColor Yellow`)

  if (opts.includes(OPTIMIZATION_KEYS.FSO_DISABLE))
    code.push(`
# Disable Fullscreen Optimizations
Set-Reg "HKCU:\\System\\GameConfigStore" "GameDVR_FSEBehaviorMode" 2
Set-Reg "HKCU:\\System\\GameConfigStore" "GameDVR_HonorUserFSEBehaviorMode" 1
Set-Reg "HKCU:\\System\\GameConfigStore" "GameDVR_FSEBehavior" 2
Set-Reg "HKCU:\\System\\GameConfigStore" "GameDVR_DXGIHonorFSEWindowsCompatible" 1
Write-OK "Fullscreen Optimizations disabled globally"
Write-Host "  [WARN] May affect HDR/color management in exclusive fullscreen" -ForegroundColor Yellow`)

  if (opts.includes(OPTIMIZATION_KEYS.SERVICES_TRIM))
    code.push(`
# Trim non-critical services to manual
$safeServices = @(
    "DiagTrack",           # Connected User Experiences and Telemetry
    "dmwappushservice",    # WAP Push Message Routing
    "MapsBroker",          # Downloaded Maps Manager
    "lfsvc",               # Geolocation Service
    "SharedAccess",        # Internet Connection Sharing
    "RemoteRegistry",      # Remote Registry
    "WMPNetworkSvc",       # Windows Media Player Network
    "WSearch"              # Windows Search (if not using)
)
foreach ($svc in $safeServices) {
    $service = Get-Service -Name $svc -EA SilentlyContinue
    if ($service -and $service.StartType -ne "Disabled") {
        Set-Service -Name $svc -StartupType Manual -EA SilentlyContinue
    }
}
Write-OK "Non-critical services set to manual"`)

  if (opts.includes(OPTIMIZATION_KEYS.DISK_CLEANUP))
    code.push(`
# Disk Cleanup with ResetBase
Write-Host "  Running Disk Cleanup..." -NoNewline
# Set cleanup flags
$cleanupKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VolumeCaches"
Get-ChildItem $cleanupKey -EA SilentlyContinue | ForEach-Object {
    Set-ItemProperty -Path $_.PSPath -Name "StateFlags0100" -Value 2 -EA SilentlyContinue
}
Start-Process "cleanmgr.exe" -ArgumentList "/sagerun:100" -Wait -WindowStyle Hidden
# ResetBase to remove old component store files
Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase 2>&1 | Out-Null
Write-OK "Disk cleaned"`)

  if (opts.includes(OPTIMIZATION_KEYS.IPV4_PREFER))
    code.push(`
# Prefer IPv4 over IPv6
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" "DisabledComponents" 32
Write-OK "IPv4 preferred over IPv6"
Write-Host "  [WARN] May break IPv6-only paths or Xbox/Store features" -ForegroundColor Yellow
Write-Host "  [INFO] Requires reboot to take effect" -ForegroundColor Gray`)

  if (opts.includes(OPTIMIZATION_KEYS.TEREDO_DISABLE))
    code.push(`
# Disable Teredo tunneling
netsh interface teredo set state disabled 2>&1 | Out-Null
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" "DisabledComponents" 1
Write-OK "Teredo IPv6 tunneling disabled"
Write-Host "  [WARN] May break Xbox Live connectivity" -ForegroundColor Yellow
Write-Host "  [INFO] Requires reboot to take effect" -ForegroundColor Gray`)

  return code.join('\n')
}

function generatePostSetupHTML(hw: HardwareProfile, _opts: string[], _packages: string[]): string {
  const isNvidia = hw.gpu === GPU_TYPES.NVIDIA
  const isAMD = hw.gpu === GPU_TYPES.AMD
  const isX3D = hw.cpu === CPU_TYPES.AMD_X3D
  const timestamp = new Date().toLocaleString()

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RockTune Post-Setup Guide</title>
    <style>
        :root {
            --bg: #0a0a0f;
            --card: rgba(255,255,255,0.03);
            --border: rgba(255,255,255,0.08);
            --accent: #8b5cf6;
            --text: #f0f0f8;
            --text-dim: #888;
            --success: #2dd4bf;
            --warning: #fbbf24;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 2rem;
            max-width: 900px;
            margin: 0 auto;
        }
        h1 { color: var(--accent); margin-bottom: 0.5rem; }
        h2 { color: var(--text); margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }
        h3 { color: var(--accent); margin: 1.5rem 0 0.5rem; }
        .meta { color: var(--text-dim); font-size: 0.9rem; margin-bottom: 2rem; }
        .card {
            background: var(--card);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.5rem;
            margin: 1rem 0;
        }
        .critical { border-left: 4px solid #ef4444; }
        .warning { border-left: 4px solid var(--warning); }
        .success { border-left: 4px solid var(--success); }
        code { background: rgba(139,92,246,0.2); padding: 0.2rem 0.5rem; border-radius: 4px; font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 0.9em; }
        pre { background: #111; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 0.85rem; }
        ul, ol { margin-left: 1.5rem; }
        li { margin: 0.5rem 0; }
        a { color: var(--accent); }
        .checkbox { display: flex; align-items: flex-start; gap: 0.5rem; margin: 0.5rem 0; }
        .checkbox input { margin-top: 0.3rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
        .hidden { display: none; }
        @media print { body { background: #fff; color: #000; } .card { border: 1px solid #ccc; } }
    </style>
</head>
<body>
    <h1>RockTune Post-Setup Guide</h1>
    <p class="meta">Generated: ${timestamp} | Hardware: ${hw.cpu.toUpperCase()} + ${hw.gpu.toUpperCase()}</p>

    <div class="card critical">
        <h3>CRITICAL: Reboot Required</h3>
        <p>Many optimizations require a restart to take effect:</p>
        <ul>
            <li>HPET and timer changes</li>
            <li>MSI Mode GPU settings</li>
            <li>Power plan modifications</li>
            <li>Page file changes</li>
        </ul>
        <p style="margin-top:1rem"><strong>Reboot your PC now before continuing.</strong></p>
    </div>

    <h2>Before Gaming: Timer Resolution</h2>
    <div class="card">
        <p>For the smoothest gameplay, keep a timer resolution tool running:</p>
        <pre>
# Option 1: Run the timer tool (download from repo)
.\\timer-tool.ps1

# Option 2: Auto-exit when game closes
.\\timer-tool.ps1 -GameProcess "cs2"
.\\timer-tool.ps1 -GameProcess "dota2"</pre>
        <p style="margin-top:1rem;color:var(--text-dim)">This sets Windows timer to 0.5ms (from 15.6ms default), eliminating micro-stutters.</p>
    </div>

    <h2>GPU Driver Settings (Manual Configuration)</h2>
    <div class="grid">
        ${
          isNvidia
            ? `
        <div class="card">
            <h3>NVIDIA Control Panel</h3>
            <ol>
                <li>Open NVIDIA Control Panel</li>
                <li>Manage 3D Settings → Global Settings</li>
            </ol>
            <div class="checkbox"><input type="checkbox"> Power management: <strong>Prefer maximum performance</strong></div>
            <div class="checkbox"><input type="checkbox"> Low latency mode: <strong>Ultra</strong> (or On)</div>
            <div class="checkbox"><input type="checkbox"> Vertical sync: <strong>Off</strong> (or Fast with G-Sync)</div>
            <div class="checkbox"><input type="checkbox"> Texture filtering: <strong>High performance</strong></div>
            <div class="checkbox"><input type="checkbox"> Shader Cache: <strong>On</strong></div>
        </div>
        `
            : ''
        }
        ${
          isAMD
            ? `
        <div class="card">
            <h3>AMD Radeon Software</h3>
            <ol>
                <li>Open AMD Radeon Software</li>
                <li>Gaming → Global Graphics</li>
            </ol>
            <div class="checkbox"><input type="checkbox"> Radeon Anti-Lag: <strong>On</strong></div>
            <div class="checkbox"><input type="checkbox"> Radeon Boost: <strong>On</strong> (if supported)</div>
            <div class="checkbox"><input type="checkbox"> Wait for Vertical Refresh: <strong>Off</strong></div>
            <div class="checkbox"><input type="checkbox"> Texture Filtering Quality: <strong>Performance</strong></div>
        </div>
        `
            : ''
        }
        ${
          !isNvidia && !isAMD
            ? `
        <div class="card">
            <h3>Intel Arc Control</h3>
            <p>Open Intel Arc Control and adjust performance settings for your games.</p>
        </div>
        `
            : ''
        }
    </div>

    <h2>Game Launch Options</h2>
    <div class="card">
        <p><strong>Steam:</strong> Right-click game → Properties → General → Launch Options</p>
        <h3 style="margin-top:1rem">Recommended Launch Options</h3>
        <pre>
# Dota 2
-dx11 -high -nojoy -console +fps_max 0

# CS2 (Counter-Strike 2)
-high -freq 240 -nojoy +fps_max 0

# General (works for most games)
-high -nojoy</pre>
        <p style="margin-top:1rem;color:var(--text-dim)">
            <code>-high</code> = High CPU priority |
            <code>-nojoy</code> = Disable joystick (reduces input latency) |
            <code>-freq 240</code> = Match your monitor refresh rate
        </p>
    </div>

    ${
      isX3D
        ? `
    <h2>AMD Ryzen X3D Specific</h2>
    <div class="card warning">
        <h3>BIOS Settings (Critical)</h3>
        <div class="checkbox"><input type="checkbox"> CPPC: <strong>Enabled</strong> or AUTO (NOT disabled!)</div>
        <div class="checkbox"><input type="checkbox"> CPPC Preferred Cores: <strong>AUTO</strong></div>
        <div class="checkbox"><input type="checkbox"> AGESA: Update to <strong>1.0.0.7+</strong> or latest</div>
        <div class="checkbox"><input type="checkbox"> EXPO/XMP: <strong>Enabled</strong></div>

        <h3 style="margin-top:1.5rem">AMD Chipset Drivers</h3>
        <p>Install the latest AMD Chipset Drivers for the 3D V-Cache optimizer:</p>
        <p><a href="https://www.amd.com/en/support" target="_blank" rel="noopener noreferrer">Download AMD Chipset Drivers</a></p>
    </div>
    `
        : ''
    }

    <h2>Software Post-Configuration</h2>
    <div class="grid">
        <div class="card">
            <h3>Discord</h3>
            <div class="checkbox"><input type="checkbox"> Disable Hardware Acceleration if stuttering (Settings → Advanced)</div>
            <div class="checkbox"><input type="checkbox"> Video Codec: H.264 (Settings → Voice & Video)</div>
        </div>
        <div class="card">
            <h3>RGB Software (iCUE, Synapse, G HUB)</h3>
            <div class="checkbox"><input type="checkbox"> Configure devices, then close before gaming</div>
            <div class="checkbox"><input type="checkbox"> Settings are saved to device memory</div>
            <p style="color:var(--warning);margin-top:0.5rem">⚠️ Common source of DPC latency</p>
        </div>
    </div>

    <div style="text-align:center;margin-top:3rem;padding:2rem;color:var(--text-dim)">
        <p>Happy gaming! 🎮</p>
        <p style="font-size:0.8rem;margin-top:1rem">Remember: Reboot → Timer Tool → Game</p>
    </div>
</body>
</html>`
}

export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function setupDownload(): void {
  const btn = document.getElementById('download-btn')
  if (!btn) return

  btn.addEventListener('click', () => {
    const script = getTrackedScript()
    downloadFile(script, SCRIPT_FILENAME)
  })
}
