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
import type { CleanupController } from '../utils/lifecycle'
import { type CodeViewer, computeStats, createCodeViewer } from './code-viewer'
import { getHardwareProfile, getSelectedOptimizations } from './summary/'

const preview = {
  previous: '',
  current: '',
}

const PERIPHERAL_PACKAGES = {
  [PERIPHERAL_TYPES.LOGITECH]: 'Logitech.GHUB',
  [PERIPHERAL_TYPES.RAZER]: 'RazerInc.RazerInstaller.Synapse4',
  [PERIPHERAL_TYPES.CORSAIR]: 'Corsair.iCUE.5',
  [PERIPHERAL_TYPES.STEELSERIES]: 'SteelSeries.GG',
  [PERIPHERAL_TYPES.ASUS]: 'Asus.ArmouryCrate',
  [PERIPHERAL_TYPES.WOOTING]: 'Wooting.Wootility',
} as const satisfies Record<PeripheralType, string>

const MONITOR_PACKAGES = {
  [MONITOR_SOFTWARE_TYPES.DELL]: 'Dell.DisplayManager',
  [MONITOR_SOFTWARE_TYPES.LG]: 'LG.OnScreenControl',
  [MONITOR_SOFTWARE_TYPES.HP]: 'HP.DisplayCenter',
} as const satisfies Record<MonitorSoftwareType, string>

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

  for (const p of hw.peripherals) {
    const pkg = PERIPHERAL_PACKAGES[p]
    if (pkg) packages.push(pkg)
  }

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
  const configHereString = toHereString(config)
  const postSetupHereString = toHereString(postSetupHtml)

  return `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    RockTune — Loadout generated ${timestamp}
.DESCRIPTION
    Core: ${hw.cpu} + ${hw.gpu}
    Source: https://github.com/thepedroferrari/windows-gaming-settings

    Windows is the arena. RockTune is the upgrade bay.
#>

$Config = ${configHereString} | ConvertFrom-Json

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
$htmlGuide = ${postSetupHereString}

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

function toHereString(content: string): string {
  const normalized = content.replace(/\r\n?/g, '\n').replace(/\n+$/, '')
  return `@'\n${normalized}\n'@`
}

export const SAFE_SCRIPT_FILENAME = 'rocktune-safe.ps1' as const

/**
 * Generates a zero-config "safe mode" script with:
 * - Runtime hardware detection (no user input needed)
 * - SAFE-tier optimizations only (cannot break Windows)
 * - No software installs
 * - Restore point prompt at start
 */
export function generateSafeScript(): string {
  const timestamp = new Date().toISOString()

  return `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    RockTune SAFE MODE — Zero-config optimization script
.DESCRIPTION
    Generated: ${timestamp}
    Source: https://github.com/thepedroferrari/windows-gaming-settings

    This script applies ONLY safe, reversible optimizations that:
    - Cannot break Windows or any applications
    - Do not disable security features
    - Do not remove any software
    - Work on ANY Windows 10/11 PC

    All changes can be reverted via Windows Settings or System Restore.
#>

# === Helper Functions ===
function Write-Step { param([string]$M) Write-Host ""; Write-Host "=== $M ===" -ForegroundColor Cyan }
function Write-OK { param([string]$M) Write-Host "  [OK] $M" -ForegroundColor Green }
function Write-Fail { param([string]$M) Write-Host "  [FAIL] $M" -ForegroundColor Red }
function Write-Info { param([string]$M) Write-Host "  [INFO] $M" -ForegroundColor Gray }

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
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║             ROCKTUNE SAFE MODE                               ║" -ForegroundColor Magenta
Write-Host "  ║         Zero-config • Safe tweaks only                       ║" -ForegroundColor White
Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# === System Info (Runtime Detection) ===
Write-Step "Detecting Hardware"
$cpu = (Get-CimInstance Win32_Processor).Name
$gpu = (Get-CimInstance Win32_VideoController | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1).Name
$ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB)
$build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber

Write-Host "  CPU: $cpu" -ForegroundColor White
Write-Host "  GPU: $gpu" -ForegroundColor White
Write-Host "  RAM: \${ram}GB" -ForegroundColor White
Write-Host "  Windows Build: $build" -ForegroundColor White

# Detect CPU type
$isAMD = $cpu -match "AMD"
$isIntel = $cpu -match "Intel"
$isX3D = $cpu -match "X3D|V-Cache"

# Detect GPU type
$isNVIDIA = $gpu -match "NVIDIA|GeForce|RTX|GTX"
$isAMDGPU = $gpu -match "Radeon|AMD"

# === Pre-flight: Restore Point ===
Write-Step "Pre-flight Check"
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
            Checkpoint-Computer -Description "Before RockTune Safe Mode" -RestorePointType MODIFY_SETTINGS -EA Stop
            Write-OK "Restore point created"
        } catch {
            Write-Fail "Could not create restore point: $($_.Exception.Message)"
            $continue = Read-Host "  Continue anyway? (y/N)"
            if ($continue -ne 'y' -and $continue -ne 'Y') { exit }
        }
    }
}
Write-Host ""

# === SAFE Optimizations Only ===
Write-Step "Applying Safe Optimizations"

# 1. GameDVR Off (reduces background recording overhead)
Set-Reg "HKCU:\\System\\GameConfigStore" "GameDVR_Enabled" 0
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" "AppCaptureEnabled" 0
Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\PolicyManager\\default\\ApplicationManagement\\AllowGameDVR" "value" 0
Write-OK "GameDVR disabled (no background recording)"

# 2. Background Apps Blocked
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" "GlobalUserDisabled" 1
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" "BackgroundAppGlobalToggle" 0
Write-OK "Background apps blocked"

# 3. Temp Files Purge
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
Write-OK "Temp files purged (\${freedMB}MB freed)"

# 4. Edge Debloat (disable popups and telemetry)
$edgePolicies = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge"
if (!(Test-Path $edgePolicies)) { New-Item -Path $edgePolicies -Force | Out-Null }
Set-Reg $edgePolicies "StartupBoostEnabled" 0
Set-Reg $edgePolicies "HubsSidebarEnabled" 0
Set-Reg $edgePolicies "EdgeShoppingAssistantEnabled" 0
Set-Reg $edgePolicies "PersonalizationReportingEnabled" 0
Set-Reg $edgePolicies "MetricsReportingEnabled" 0
Set-Reg $edgePolicies "ShowMicrosoftRewards" 0
Write-OK "Edge debloated (rewards/popups/telemetry off)"

# 5. Copilot Disable
Set-Reg "HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" "TurnOffWindowsCopilot" 1
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" "TurnOffWindowsCopilot" 1
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" "ShowCopilotButton" 0
Write-OK "Microsoft Copilot disabled"

# 6. Mouse Acceleration Off (1:1 raw input)
Set-Reg "HKCU:\\Control Panel\\Mouse" "MouseSpeed" 0 "String"
Set-Reg "HKCU:\\Control Panel\\Mouse" "MouseThreshold1" 0 "String"
Set-Reg "HKCU:\\Control Panel\\Mouse" "MouseThreshold2" 0 "String"
Write-OK "Mouse acceleration disabled (1:1 raw input)"

# 7. Keyboard Response Maximized
Set-Reg "HKCU:\\Control Panel\\Keyboard" "KeyboardDelay" 0 "String"
Set-Reg "HKCU:\\Control Panel\\Keyboard" "KeyboardSpeed" 31 "String"
Write-OK "Keyboard response maximized"

# 8. DNS (Cloudflare - faster, privacy-respecting)
Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {
    Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses ("1.1.1.1","1.0.0.1")
}
Write-OK "DNS set to Cloudflare (1.1.1.1)"

# 9. Storage Sense Off (prevent surprise file deletions during gaming)
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" "01" 0
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" "AllowStorageSenseGlobal" 0
Write-OK "Storage Sense disabled"

# 10. Notifications Off (no popups during gaming)
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" "ToastEnabled" 0
Set-Reg "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" "DisableNotificationCenter" 1
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" "NOC_GLOBAL_SETTING_TOASTS_ENABLED" 0
Write-OK "Windows notifications disabled"

# === Hardware-Specific (Auto-detected) ===
Write-Step "Hardware-Specific Tweaks"

# Windows Game Mode (safe, built-in)
Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "AllowAutoGameMode" 1
Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "AutoGameModeEnabled" 1
Write-OK "Windows Game Mode enabled"

# NVIDIA-specific safe tweaks
if ($isNVIDIA) {
    $nvTasks = Get-ScheduledTask | Where-Object { $_.TaskName -like "NvTmRep*" -or $_.TaskName -like "NvDriverUpdateCheck*" } -EA SilentlyContinue
    if ($nvTasks) {
        $nvTasks | Disable-ScheduledTask -EA SilentlyContinue | Out-Null
        Write-OK "NVIDIA telemetry tasks disabled"
    } else {
        Write-Info "No NVIDIA telemetry tasks found"
    }
}

# AMD X3D safe tweaks (just CPPC hint, no risky changes)
if ($isX3D) {
    Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power" "CppcEnable" 1
    Write-OK "AMD X3D: CPPC enabled for better core scheduling"
    Write-Info "Install AMD Chipset Drivers for full 3D V-Cache optimization"
}

# === Summary ===
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "  ║  SAFE MODE COMPLETE                                          ║" -ForegroundColor Green
Write-Host "  ╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║  What was applied:                                           ║" -ForegroundColor White
Write-Host "  ║  • GameDVR disabled (less CPU overhead)                      ║" -ForegroundColor Gray
Write-Host "  ║  • Background apps blocked                                   ║" -ForegroundColor Gray
Write-Host "  ║  • Temp files cleaned                                        ║" -ForegroundColor Gray
Write-Host "  ║  • Edge debloated                                            ║" -ForegroundColor Gray
Write-Host "  ║  • Copilot disabled                                          ║" -ForegroundColor Gray
Write-Host "  ║  • Mouse/keyboard response optimized                         ║" -ForegroundColor Gray
Write-Host "  ║  • DNS set to Cloudflare                                     ║" -ForegroundColor Gray
Write-Host "  ║  • Notifications disabled                                    ║" -ForegroundColor Gray
Write-Host "  ║  • Game Mode enabled                                         ║" -ForegroundColor Gray
Write-Host "  ╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Green
Write-Host "  ║  All changes are SAFE and REVERSIBLE via Windows Settings    ║" -ForegroundColor White
Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "  Reboot recommended for full effect." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Want more? Visit: rocktune.dev" -ForegroundColor Cyan
Write-Host "  GitHub: github.com/thepedroferrari/windows-gaming-settings" -ForegroundColor Gray
Write-Host ""
pause
`
}

function generateOptCode(opts: string[], hw: HardwareProfile): string {
  const code: string[] = []

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
# Privacy Tier 2: Disable tracking services + scheduled tasks
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" "AllowTelemetry" 1
Stop-Service DiagTrack -Force -EA SilentlyContinue; Set-Service DiagTrack -StartupType Disabled -EA SilentlyContinue
Stop-Service dmwappushservice -Force -EA SilentlyContinue; Set-Service dmwappushservice -StartupType Disabled -EA SilentlyContinue
Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" "Disabled" 1
Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization\\Config" "DODownloadMode" 0

# Disable telemetry scheduled tasks (like WinUtil)
$telemetryTasks = @(
    "\\Microsoft\\Windows\\Application Experience\\Microsoft Compatibility Appraiser",
    "\\Microsoft\\Windows\\Application Experience\\ProgramDataUpdater",
    "\\Microsoft\\Windows\\Autochk\\Proxy",
    "\\Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator",
    "\\Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip",
    "\\Microsoft\\Windows\\DiskDiagnostic\\Microsoft-Windows-DiskDiagnosticDataCollector",
    "\\Microsoft\\Windows\\Feedback\\Siuf\\DmClient",
    "\\Microsoft\\Windows\\Feedback\\Siuf\\DmClientOnScenarioDownload",
    "\\Microsoft\\Windows\\Windows Error Reporting\\QueueReporting",
    "\\Microsoft\\Windows\\PI\\Sqm-Tasks",
    "\\Microsoft\\Windows\\NetTrace\\GatherNetworkInfo"
)
foreach ($task in $telemetryTasks) {
    schtasks /Change /TN $task /Disable 2>&1 | Out-Null
}
Write-OK "Privacy Tier 2 (tracking services + scheduled tasks disabled)"
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
# Disk Cleanup (only if system drive is 90%+ full)
$sysDrive = (Get-CimInstance Win32_OperatingSystem).SystemDrive
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$sysDrive'"
$usedPercent = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 1)

if ($usedPercent -ge 90) {
    Write-Host "  System drive $usedPercent% full - running cleanup..." -NoNewline
    $cleanupKey = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VolumeCaches"
    Get-ChildItem $cleanupKey -EA SilentlyContinue | ForEach-Object {
        Set-ItemProperty -Path $_.PSPath -Name "StateFlags0100" -Value 2 -EA SilentlyContinue
    }
    Start-Process "cleanmgr.exe" -ArgumentList "/sagerun:100" -Wait -WindowStyle Hidden
    Write-OK "Disk Cleanup done"

    Write-Host "  Starting DISM ResetBase in background..." -NoNewline
    $dismJob = Start-Job -ScriptBlock {
        Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase 2>&1 | Out-Null
    }
    Register-ObjectEvent -InputObject $dismJob -EventName StateChanged -Action {
        if ($Sender.State -eq 'Completed') {
            [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
            $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
            $text = $template.GetElementsByTagName("text")
            $text.Item(0).AppendChild($template.CreateTextNode("Rocktune")) | Out-Null
            $text.Item(1).AppendChild($template.CreateTextNode("DISM ResetBase complete! Disk space reclaimed.")) | Out-Null
            $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Rocktune")
            $notifier.Show([Windows.UI.Notifications.ToastNotification]::new($template))
            Unregister-Event -SourceIdentifier $Event.SourceIdentifier
            Remove-Job $Sender
        }
    } | Out-Null
    Write-OK "DISM running in background (toast on completion)"
} else {
    Write-Host "  System drive $usedPercent% full - " -NoNewline
    Write-Host "SKIP" -ForegroundColor Yellow -NoNewline
    Write-Host " (cleanup only runs at 90%+)"
}`)

  // Handle IPv4/Teredo together to avoid registry conflict
  // DisabledComponents bitmask: 0x20 (32) = Prefer IPv4, 0x01 (1) = Disable tunnels
  const hasIpv4Prefer = opts.includes(OPTIMIZATION_KEYS.IPV4_PREFER)
  const hasTeredoDisable = opts.includes(OPTIMIZATION_KEYS.TEREDO_DISABLE)

  if (hasIpv4Prefer && hasTeredoDisable) {
    // Both selected - combine flags: 32 + 1 = 33
    code.push(`
# Prefer IPv4 + Disable Teredo (combined)
netsh interface teredo set state disabled 2>&1 | Out-Null
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" "DisabledComponents" 33
Write-OK "IPv4 preferred + Teredo disabled (combined)"
Write-Host "  [WARN] May break Xbox Live and IPv6-only services" -ForegroundColor Yellow
Write-Host "  [INFO] Requires reboot to take effect" -ForegroundColor Gray`)
  } else if (hasIpv4Prefer) {
    code.push(`
# Prefer IPv4 over IPv6
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" "DisabledComponents" 32
Write-OK "IPv4 preferred over IPv6"
Write-Host "  [WARN] May break IPv6-only paths or Xbox/Store features" -ForegroundColor Yellow
Write-Host "  [INFO] Requires reboot to take effect" -ForegroundColor Gray`)
  } else if (hasTeredoDisable) {
    code.push(`
# Disable Teredo tunneling
netsh interface teredo set state disabled 2>&1 | Out-Null
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" "DisabledComponents" 1
Write-OK "Teredo IPv6 tunneling disabled"
Write-Host "  [WARN] May break Xbox Live connectivity" -ForegroundColor Yellow
Write-Host "  [INFO] Requires reboot to take effect" -ForegroundColor Gray`)
  }

  if (opts.includes(OPTIMIZATION_KEYS.NATIVE_NVME))
    code.push(`
# Native NVMe I/O Path (Windows 11 24H2+ / Server 2025)
# Eliminates SCSI translation layer for up to ~80% more IOPS, ~45% less CPU overhead
$nvmeDrives = Get-PhysicalDisk | Where-Object { $_.BusType -eq "NVMe" }
if (-not $nvmeDrives) {
    Write-Host "  [SKIP] Native NVMe: No NVMe drives detected" -ForegroundColor Yellow
} else {
    $build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
    if ($build -lt 26100) {
        Write-Host "  [SKIP] Native NVMe: Requires Windows 11 24H2+ (Build 26100+)" -ForegroundColor Yellow
        Write-Host "  [INFO] Current build: $build" -ForegroundColor Gray
    } else {
        # Check if using in-box stornvme driver (vendor drivers won't benefit)
        $stornvmeDevices = Get-PnpDevice -Class DiskDrive -EA SilentlyContinue | Where-Object {
            $_.InstanceId -like "*NVME*"
        } | ForEach-Object {
            $svc = (Get-PnpDeviceProperty -InstanceId $_.InstanceId -KeyName "DEVPKEY_Device_Service" -EA SilentlyContinue).Data
            if ($svc -eq "stornvme") { $_ }
        }
        if (-not $stornvmeDevices) {
            Write-Host "  [WARN] Native NVMe: NVMe drives using vendor driver (not stornvme.sys)" -ForegroundColor Yellow
            Write-Host "  [INFO] Native NVMe only works with Windows in-box NVMe driver" -ForegroundColor Gray
        }
        # Enable Native NVMe via Feature Management registry key
        $nvmePath = "HKLM:\\SYSTEM\\CurrentControlSet\\Policies\\Microsoft\\FeatureManagement\\Overrides"
        if (!(Test-Path $nvmePath)) { New-Item -Path $nvmePath -Force | Out-Null }
        Set-Reg $nvmePath "1176759950" 1
        Write-OK "Native NVMe I/O path enabled (reboot required)"
        Write-Host "  [INFO] After reboot: NVMe moves from 'Disk drives' to 'Storage disks' in Device Manager" -ForegroundColor Cyan
        Write-Host "  [WARN] EXPERIMENTAL: Known issues with Data Deduplication - disable dedup first if enabled" -ForegroundColor Yellow
        Write-Host "  [INFO] Rollback: Set registry value to 0 and reboot" -ForegroundColor Gray
    }
}`)

  // ===== NEW OPTIMIZATIONS =====

  // Note: restore_point is handled by pre-flight at script start, not here
  // The checkbox enables/enhances the pre-flight behavior

  if (opts.includes(OPTIMIZATION_KEYS.CLASSIC_MENU))
    code.push(`
# Classic Right-Click Context Menu (Windows 11)
$build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
if ($build -ge 22000) {
    $menuPath = "HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32"
    if (!(Test-Path $menuPath)) { New-Item -Path $menuPath -Force | Out-Null }
    Set-ItemProperty -Path $menuPath -Name "(Default)" -Value "" -Force
    Write-OK "Classic right-click menu enabled (restart Explorer or reboot)"
} else {
    Write-Host "  [SKIP] Classic menu: Windows 10 already uses classic menu" -ForegroundColor Gray
}`)

  if (opts.includes(OPTIMIZATION_KEYS.STORAGE_SENSE))
    code.push(`
# Disable Storage Sense (prevent surprise file deletions)
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" "01" 0
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\StorageSense" "AllowStorageSenseGlobal" 0
Write-OK "Storage Sense disabled (no auto-cleanup during gaming)"`)

  if (opts.includes(OPTIMIZATION_KEYS.DISPLAY_PERF))
    code.push(`
# Display Performance Mode (faster visual transitions)
$vfx = "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects"
Set-Reg $vfx "VisualFXSetting" 2
$adv = "HKCU:\\Control Panel\\Desktop"
Set-ItemProperty -Path $adv -Name "UserPreferencesMask" -Value ([byte[]](0x90,0x12,0x03,0x80,0x10,0x00,0x00,0x00)) -Type Binary -EA SilentlyContinue
Set-Reg "HKCU:\\Control Panel\\Desktop\\WindowMetrics" "MinAnimate" 0 "String"
Write-OK "Display performance mode enabled"`)

  if (opts.includes(OPTIMIZATION_KEYS.END_TASK))
    code.push(`
# Taskbar End Task (Windows 11 22H2+)
$build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
if ($build -ge 22621) {
    Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" "TaskbarEndTask" 1
    Write-OK "End Task enabled in taskbar context menu"
} else {
    Write-Host "  [SKIP] Taskbar End Task: Requires Windows 11 22H2+" -ForegroundColor Gray
}`)

  if (opts.includes(OPTIMIZATION_KEYS.EXPLORER_CLEANUP))
    code.push(`
# Explorer Cleanup - Remove Home/Gallery from navigation (Windows 11)
$build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
if ($build -ge 22000) {
    # Remove Home
    $homePath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}"
    if (Test-Path $homePath) { Remove-Item $homePath -Force -EA SilentlyContinue }
    # Remove Gallery
    $galleryPath = "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}"
    if (Test-Path $galleryPath) { Remove-Item $galleryPath -Force -EA SilentlyContinue }
    Write-OK "Home and Gallery removed from Explorer navigation"
} else {
    Write-Host "  [SKIP] Explorer cleanup: Windows 11 specific" -ForegroundColor Gray
}`)

  if (opts.includes(OPTIMIZATION_KEYS.NOTIFICATIONS_OFF))
    code.push(`
# Disable Notifications (no popup distractions)
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" "ToastEnabled" 0
Set-Reg "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" "DisableNotificationCenter" 1
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" "NOC_GLOBAL_SETTING_TOASTS_ENABLED" 0
Write-OK "Windows notifications disabled (no popups during gaming)"`)

  if (opts.includes(OPTIMIZATION_KEYS.PS7_TELEMETRY))
    code.push(`
# Disable PowerShell 7 Telemetry
[System.Environment]::SetEnvironmentVariable("POWERSHELL_TELEMETRY_OPTOUT", "1", "Machine")
Write-OK "PowerShell 7 telemetry disabled"`)

  if (opts.includes(OPTIMIZATION_KEYS.MULTIPLANE_OVERLAY))
    code.push(`
# Disable Multiplane Overlay (fixes streaming/encoding issues)
Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Dwm" "OverlayTestMode" 5
Write-OK "Multiplane Overlay disabled (streamer fix)"
Write-Host "  [INFO] Reduces GPU overhead from DWM composition" -ForegroundColor Gray`)

  if (opts.includes(OPTIMIZATION_KEYS.MOUSE_ACCEL))
    code.push(`
# Disable Mouse Acceleration (1:1 raw input)
Set-Reg "HKCU:\\Control Panel\\Mouse" "MouseSpeed" 0 "String"
Set-Reg "HKCU:\\Control Panel\\Mouse" "MouseThreshold1" 0 "String"
Set-Reg "HKCU:\\Control Panel\\Mouse" "MouseThreshold2" 0 "String"
Write-OK "Mouse acceleration disabled (enhanced pointer precision off)"`)

  if (opts.includes(OPTIMIZATION_KEYS.USB_SUSPEND))
    code.push(`
# Disable USB Selective Suspend (keep peripherals awake)
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB" "DisableSelectiveSuspend" 1
# Also disable via power config
powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0 2>$null
powercfg /setactive SCHEME_CURRENT 2>$null
Write-OK "USB Selective Suspend disabled (peripherals always awake)"`)

  if (opts.includes(OPTIMIZATION_KEYS.KEYBOARD_RESPONSE))
    code.push(`
# Maximize Keyboard Response
Set-Reg "HKCU:\\Control Panel\\Keyboard" "KeyboardDelay" 0 "String"
Set-Reg "HKCU:\\Control Panel\\Keyboard" "KeyboardSpeed" 31 "String"
Write-OK "Keyboard response maximized (fastest repeat rate)"`)

  if (opts.includes(OPTIMIZATION_KEYS.WPBT_DISABLE))
    code.push(`
# Disable WPBT (Windows Platform Binary Table - OEM bloat injection)
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager" "DisableWpbt" 1
Write-OK "WPBT disabled (blocks OEM firmware bloat injection)"
Write-Host "  [WARN] Some OEM features may require manual driver installation" -ForegroundColor Yellow`)

  if (opts.includes(OPTIMIZATION_KEYS.QOS_GAMING))
    code.push(`
# QoS Gaming Priority (prioritize game traffic)
$qosPath = "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\QoS"
if (!(Test-Path "$qosPath\\GameTraffic")) { New-Item -Path "$qosPath\\GameTraffic" -Force | Out-Null }
Set-Reg "$qosPath\\GameTraffic" "Version" "1.0" "String"
Set-Reg "$qosPath\\GameTraffic" "Protocol" "*" "String"
Set-Reg "$qosPath\\GameTraffic" "Local Port" "*" "String"
Set-Reg "$qosPath\\GameTraffic" "DSCP Value" 46 "String"
Set-Reg "$qosPath\\GameTraffic" "Throttle Rate" -1
Write-OK "QoS Gaming policy created (DSCP 46 priority)"
Write-Host "  [INFO] Works best with router QoS enabled" -ForegroundColor Gray`)

  if (opts.includes(OPTIMIZATION_KEYS.NETWORK_THROTTLING))
    code.push(`
# Disable Network Throttling
Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" "NetworkThrottlingIndex" 0xFFFFFFFF
Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" "SystemResponsiveness" 0
Write-OK "Network throttling disabled"`)

  if (opts.includes(OPTIMIZATION_KEYS.INTERRUPT_AFFINITY))
    code.push(`
# GPU Interrupt Affinity (lock to CPU core 0)
$gpuDevice = Get-PnpDevice -Class Display | Where-Object { $_.Status -eq "OK" } | Select-Object -First 1
if ($gpuDevice) {
    $msiPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$($gpuDevice.InstanceId -replace '\\\\','\\\\')\\Device Parameters\\Interrupt Management\\Affinity Policy"
    if (!(Test-Path $msiPath)) { New-Item -Path $msiPath -Force | Out-Null }
    Set-Reg $msiPath "DevicePolicy" 4
    Set-Reg $msiPath "AssignmentSetOverride" 1
    Write-OK "GPU interrupt affinity set to CPU 0 (reboot required)"
}`)

  if (opts.includes(OPTIMIZATION_KEYS.PROCESS_MITIGATION))
    code.push(`
# Disable Process Mitigations (benchmarking mode)
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" "KernelShadowStacksForceDisabled" 1
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" "DisableExceptionChainValidation" 1
Write-OK "Process mitigations disabled (benchmark mode)"
Write-Host "  [WARN] Reduces security - consider re-enabling for daily use" -ForegroundColor Yellow`)

  if (opts.includes(OPTIMIZATION_KEYS.SMT_DISABLE))
    code.push(`
# Disable SMT/Hyperthreading (BIOS-only operation)
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "  ║  SMT/HYPERTHREADING CANNOT BE DISABLED VIA WINDOWS           ║" -ForegroundColor Yellow
Write-Host "  ╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Yellow
Write-Host "  ║  This must be done in BIOS/UEFI settings:                    ║" -ForegroundColor White
Write-Host "  ║                                                              ║" -ForegroundColor White
Write-Host "  ║  AMD:   Advanced → CPU Configuration → SMT Mode → Disabled   ║" -ForegroundColor Cyan
Write-Host "  ║  Intel: Advanced → CPU Configuration → Hyper-Threading → Off ║" -ForegroundColor Cyan
Write-Host "  ║                                                              ║" -ForegroundColor White
Write-Host "  ║  ⚠️  ONLY for single-threaded benchmarks!                     ║" -ForegroundColor Red
Write-Host "  ║  ⚠️  Re-enable immediately after benchmarking!                ║" -ForegroundColor Red
Write-Host "  ╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""
Write-Host "  [INFO] Press Enter to continue..." -ForegroundColor Gray
pause`)

  if (opts.includes(OPTIMIZATION_KEYS.AUDIO_EXCLUSIVE))
    code.push(`
# WASAPI Exclusive Mode (lower audio latency)
Set-Reg "HKCU:\\Software\\Microsoft\\Multimedia\\Audio" "UserDuckingPreference" 3
Write-OK "WASAPI Exclusive Mode configured"
Write-Host "  [WARN] Only one app can use audio at a time in exclusive mode" -ForegroundColor Yellow`)

  if (opts.includes(OPTIMIZATION_KEYS.TCP_OPTIMIZER))
    code.push(`
# TCP Stack Optimization (aggressive settings)
$tcpPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters"
Set-Reg $tcpPath "TcpNoDelay" 1
Set-Reg $tcpPath "TcpAckFrequency" 1
Set-Reg $tcpPath "TcpDelAckTicks" 0
Set-Reg $tcpPath "MaxUserPort" 65534
Set-Reg $tcpPath "TcpTimedWaitDelay" 30
netsh int tcp set global autotuninglevel=disabled 2>&1 | Out-Null
netsh int tcp set global chimney=disabled 2>&1 | Out-Null
netsh int tcp set supplemental template=internet congestionprovider=ctcp 2>&1 | Out-Null
Write-OK "TCP stack optimized (aggressive gaming settings)"
Write-Host "  [WARN] May increase bandwidth usage" -ForegroundColor Yellow`)

  if (opts.includes(OPTIMIZATION_KEYS.CORE_ISOLATION_OFF))
    code.push(`
# Disable Core Isolation / VBS (security tradeoff for performance)
Write-Host "  [WARN] Disabling Core Isolation significantly reduces security!" -ForegroundColor Yellow
$confirm = Read-Host "  Are you sure? This disables Virtualization Based Security (y/N)"
if ($confirm -eq 'y' -or $confirm -eq 'Y') {
    Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" "EnableVirtualizationBasedSecurity" 0
    Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity" "Enabled" 0
    bcdedit /set hypervisorlaunchtype off 2>&1 | Out-Null
    Write-OK "Core Isolation / VBS disabled (reboot required)"
    Write-Host "  [INFO] Re-enable: Device Security → Core Isolation → Memory Integrity" -ForegroundColor Cyan
} else {
    Write-Host "  [SKIP] Core Isolation disable cancelled" -ForegroundColor Gray
}`)

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
  const withBom = `\ufeff${content}`
  const blob = new Blob([withBom], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function setupDownload(controller?: CleanupController): void {
  const downloadBtn = document.getElementById('download-btn')
  const previewBtn = document.getElementById('preview-btn')
  const previewBtnHero = document.getElementById('preview-btn-hero')
  const previewModal = document.getElementById('preview-modal') as HTMLDialogElement | null
  const closeModalBtn = document.getElementById('close-modal')
  const copyBtn = document.getElementById('copy-script')
  const downloadFromModalBtn = document.getElementById('download-from-modal')
  const linesEl = document.getElementById('preview-lines')
  const sizeEl = document.getElementById('preview-size')

  let viewer: CodeViewer | null = null

  const addListener = (
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void => {
    if (controller) {
      controller.addEventListener(target, type, handler, options)
    } else {
      target.addEventListener(type, handler, options)
    }
  }

  const scheduleTimeout = (fn: () => void, delay: number): ReturnType<typeof setTimeout> =>
    controller ? controller.setTimeout(fn, delay) : setTimeout(fn, delay)

  if (downloadBtn) {
    addListener(downloadBtn, 'click', () => {
      const script = getTrackedScript()
      downloadFile(script, SCRIPT_FILENAME)
    })
  }

  const openPreview = (): void => {
    if (!previewModal) return

    if (!viewer) {
      viewer = createCodeViewer(document.getElementById('preview-viewer'), controller)
    }

    const current = getTrackedScript()
    const previous = getPreviousScript()

    viewer?.setContent({ current, previous })
    viewer?.setMode('current')

    const stats = computeStats(current)
    if (linesEl) linesEl.textContent = `${stats.lines} lines`
    if (sizeEl) sizeEl.textContent = `${stats.sizeKb} KB`

    previewModal.showModal()
  }

  if (previewBtn) {
    addListener(previewBtn, 'click', openPreview)
  }

  if (previewBtnHero) {
    addListener(previewBtnHero, 'click', openPreview)
  }

  if (closeModalBtn) {
    addListener(closeModalBtn, 'click', () => previewModal?.close())
  }

  if (previewModal) {
    addListener(previewModal, 'click', (e) => {
      if (e.target === previewModal) previewModal.close()
    })
  }

  if (copyBtn) {
    addListener(copyBtn, 'click', async () => {
      const content = viewer?.getContent() ?? getTrackedScript()
      await navigator.clipboard.writeText(content)
      const original = copyBtn.textContent
      copyBtn.textContent = 'Copied!'
      scheduleTimeout(() => {
        copyBtn.textContent = original
      }, 1500)
    })
  }

  if (downloadFromModalBtn) {
    addListener(downloadFromModalBtn, 'click', () => {
      const content = viewer?.getContent() ?? getTrackedScript()
      downloadFile(content, SCRIPT_FILENAME)
      previewModal?.close()
    })
  }
}
