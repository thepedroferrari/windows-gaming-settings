/**
 * Script Generator - Pure PowerShell script generation
 *
 * Generates self-contained PowerShell scripts from user selections.
 * Scripts work offline without network dependencies.
 */

import type {
  HardwareProfile,
  MonitorSoftwareType,
  OptimizationKey,
  PackageKey,
  PeripheralType,
  SoftwareCatalog,
} from './types'
import { isPackageKey } from './types'

export type SelectionState = {
  hardware: HardwareProfile
  optimizations: OptimizationKey[]
  packages: PackageKey[]
  missingPackages: string[]
}

/** Map peripheral types to catalog package keys */
export const PERIPHERAL_TO_PACKAGE: Record<PeripheralType, string | null> = {
  logitech: 'logitechghub',
  razer: 'razersynapse',
  corsair: 'icue',
  steelseries: 'steelseriesgg',
  asus: 'armourycrate',
  wooting: 'wooting',
}

/** Map monitor software types to catalog package keys */
export const MONITOR_TO_PACKAGE: Record<MonitorSoftwareType, string | null> = {
  dell: 'delldisplaymanager',
  lg: 'lgonscreencontrol',
  hp: 'hpdisplaycenter',
}

export type ScriptGeneratorOptions = {
  /** Software catalog for package lookups */
  catalog: SoftwareCatalog
  /** DNS provider for network optimization (default: 'cloudflare') */
  dnsProvider?: string
}

const DEFAULT_DNS_PROVIDER = 'cloudflare'

/** ASCII banner for script header */
const ASCII_BANNER = `
@'
    ____             __   ______
   / __ \\____  _____/ /__/_  __/_  ______  ___
  / /_/ / __ \\/ ___/ //_/ / / / / / / __ \\/ _ \\
 / _, _/ /_/ / /__/ ,<   / / / /_/ / / / /  __/
/_/ |_|\\____/\\___/_/|_| /_/  \\__,_/_/ /_/\\___/

        Windows Gaming Loadout Builder
'@
`

/** Inline helper functions for self-contained scripts */
const HELPER_FUNCTIONS = `
# --- Progress tracking ---
$script:StepCount = 0
$script:StepTotal = 0
$script:SuccessCount = 0
$script:FailCount = 0
$script:WarningCount = 0

function Write-Banner { Write-Host ${ASCII_BANNER.trim()} -ForegroundColor Magenta }
function Write-Step { param([string]$M) $script:StepCount++; Write-Host ""; Write-Host "[$script:StepCount/$script:StepTotal] $M" -ForegroundColor Cyan }
function Write-OK { param([string]$M) $script:SuccessCount++; Write-Host "  [OK] $M" -ForegroundColor Green }
function Write-Fail { param([string]$M) $script:FailCount++; Write-Host "  [FAIL] $M" -ForegroundColor Red }
function Write-Warn { param([string]$M) $script:WarningCount++; Write-Host "  [!] $M" -ForegroundColor Yellow }
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
`

/**
 * Build a complete PowerShell script from selection state
 */
export function buildScript(selection: SelectionState, options: ScriptGeneratorOptions): string {
  const { hardware, optimizations, packages, missingPackages } = selection
  const { catalog, dnsProvider = DEFAULT_DNS_PROVIDER } = options
  const selected = new Set(optimizations)

  // Collect all packages including peripherals and monitor software
  const allPackages = new Set(packages)

  for (const peripheral of hardware.peripherals) {
    const pkgKey = PERIPHERAL_TO_PACKAGE[peripheral]
    if (pkgKey && isPackageKey(catalog, pkgKey)) {
      allPackages.add(pkgKey)
    }
  }

  for (const monitor of hardware.monitorSoftware) {
    const pkgKey = MONITOR_TO_PACKAGE[monitor]
    if (pkgKey && isPackageKey(catalog, pkgKey)) {
      allPackages.add(pkgKey)
    }
  }

  const allPackagesArray = Array.from(allPackages)
  const timestamp = new Date().toISOString()

  const lines: string[] = []

  // Header
  lines.push('#Requires -RunAsAdministrator')
  lines.push('<#')
  lines.push('.SYNOPSIS')
  lines.push(`    RockTune — Loadout generated ${timestamp}`)
  lines.push('.DESCRIPTION')
  lines.push(`    Core: ${hardware.cpu} + ${hardware.gpu}`)
  lines.push(`    Build: ${__BUILD_COMMIT__} (${__BUILD_DATE__})`)
  lines.push(`    Source: https://github.com/thepedroferrari/windows-gaming-settings/tree/${__BUILD_COMMIT__}`)
  lines.push('')
  lines.push('    Windows is the arena. RockTune is the upgrade bay.')
  lines.push('#>')
  lines.push('')

  // Config JSON
  const config = {
    generated: timestamp,
    build: __BUILD_COMMIT__,
    hardware: {
      cpu: hardware.cpu,
      gpu: hardware.gpu,
      peripherals: hardware.peripherals,
      monitorSoftware: hardware.monitorSoftware,
    },
    optimizations,
    packages: allPackagesArray,
  }
  lines.push(`$Config = @'`)
  lines.push(JSON.stringify(config, null, 2))
  lines.push(`'@ | ConvertFrom-Json`)
  lines.push('')

  // Helper functions
  lines.push(HELPER_FUNCTIONS.trim())
  lines.push('')

  // Count total steps for progress indicator
  let stepCount = 0
  if (selected.has('restore_point')) stepCount++
  stepCount++ // Upgrades
  if (allPackagesArray.length > 0) stepCount++ // Arsenal
  stepCount++ // Complete

  // Clear screen and header with banner
  lines.push('Clear-Host')
  lines.push(`$script:StepTotal = ${stepCount}`)
  lines.push('Write-Banner')
  lines.push('Write-Host ""')
  lines.push('')

  // System info
  lines.push('$cpu = (Get-CimInstance Win32_Processor).Name')
  lines.push(
    '$gpu = (Get-CimInstance Win32_VideoController | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1).Name',
  )
  lines.push(
    '$ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB)',
  )
  lines.push('Write-Host "  CPU: $cpu" -ForegroundColor White')
  lines.push('Write-Host "  GPU: $gpu" -ForegroundColor White')
  // biome-ignore lint/suspicious/noTemplateCurlyInString: PowerShell variable syntax, not JS template
  lines.push('Write-Host "  RAM: ${ram}GB" -ForegroundColor White')
  lines.push('')

  // Pre-flight restore point
  if (selected.has('restore_point')) {
    lines.push('Write-Step "Pre-flight: System Restore Point"')
    lines.push('try {')
    lines.push(
      '    Checkpoint-Computer -Description "Before RockTune" -RestorePointType MODIFY_SETTINGS -EA Stop',
    )
    lines.push('    Write-OK "Restore point created"')
    lines.push('} catch {')
    lines.push('    Write-Fail "Could not create restore point: $($_.Exception.Message)"')
    lines.push('}')
    lines.push('')
  }

  // Optimizations
  lines.push('Write-Step "Upgrades"')
  lines.push('')

  // System optimizations
  const systemOpts = generateSystemOpts(selected)
  if (systemOpts.length > 0) {
    lines.push('# System')
    lines.push(...systemOpts)
    lines.push('')
  }

  // Performance optimizations
  const perfOpts = generatePerformanceOpts(selected, hardware)
  if (perfOpts.length > 0) {
    lines.push('# Performance')
    lines.push(...perfOpts)
    lines.push('')
  }

  // Power optimizations
  const powerOpts = generatePowerOpts(selected)
  if (powerOpts.length > 0) {
    lines.push('# Power')
    lines.push(...powerOpts)
    lines.push('')
  }

  // Network optimizations
  const networkOpts = generateNetworkOpts(selected, dnsProvider)
  if (networkOpts.length > 0) {
    lines.push('# Network')
    lines.push(...networkOpts)
    lines.push('')
  }

  // Privacy optimizations
  const privacyOpts = generatePrivacyOpts(selected)
  if (privacyOpts.length > 0) {
    lines.push('# Privacy')
    lines.push(...privacyOpts)
    lines.push('')
  }

  // Audio optimizations
  const audioOpts = generateAudioOpts(selected)
  if (audioOpts.length > 0) {
    lines.push('# Audio')
    lines.push(...audioOpts)
    lines.push('')
  }

  // Software installs
  if (allPackagesArray.length > 0) {
    lines.push('Write-Step "Arsenal (winget)"')
    lines.push('$wingetPath = Get-Command winget -EA SilentlyContinue')
    lines.push('if (-not $wingetPath) {')
    lines.push('    Write-Fail "winget not found. Install App Installer from Microsoft Store."')
    lines.push('} else {')

    const sorted = allPackagesArray
      .map((key) => ({ key, pkg: catalog[key] }))
      .filter((entry) => entry.pkg)
      .sort((a, b) => a.pkg.name.localeCompare(b.pkg.name))

    for (const entry of sorted) {
      lines.push(`    Write-Host "  Installing ${entry.pkg.name}..." -NoNewline`)
      lines.push(
        `    winget install --id "${entry.pkg.id}" --silent --accept-package-agreements --accept-source-agreements 2>$null`,
      )
      lines.push('    if ($LASTEXITCODE -eq 0) { Write-OK "" } else { Write-Fail "" }')
    }

    lines.push('}')
    lines.push('')
  }

  // Missing packages note
  if (missingPackages.length > 0) {
    lines.push('# Missing software mappings:')
    for (const missing of missingPackages) {
      lines.push(`#   - ${missing}`)
    }
    lines.push('')
  }

  // Footer with summary
  lines.push('Write-Step "Complete"')
  lines.push('Write-Host ""')
  lines.push('Write-Host "  ╔════════════════════════════════════════╗" -ForegroundColor White')
  lines.push('Write-Host "  ║           LOADOUT SUMMARY              ║" -ForegroundColor White')
  lines.push('Write-Host "  ╚════════════════════════════════════════╝" -ForegroundColor White')
  lines.push('Write-Host ""')
  lines.push('Write-Host "  Applied:  $($script:SuccessCount) changes" -ForegroundColor Green')
  lines.push('if ($script:WarningCount -gt 0) { Write-Host "  Warnings: $($script:WarningCount)" -ForegroundColor Yellow }')
  lines.push('if ($script:FailCount -gt 0) { Write-Host "  Failed:   $($script:FailCount)" -ForegroundColor Red }')
  lines.push('Write-Host ""')
  lines.push('Write-Host "  Reboot recommended for all changes to take effect." -ForegroundColor Cyan')
  lines.push('Write-Host ""')
  lines.push('')
  lines.push('# Script verification hash')
  lines.push(`Write-Host "  Build: ${__BUILD_COMMIT__}" -ForegroundColor DarkGray`)
  lines.push('Write-Host ""')

  return lines.join('\n')
}

function generateSystemOpts(selected: Set<string>): string[] {
  const lines: string[] = []

  // pagefile - Fixed page file (4GB for 32GB+ RAM, 8GB for 16GB)
  if (selected.has('pagefile')) {
    lines.push('# Configure fixed page file')
    lines.push(
      '$ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object Capacity -Sum).Sum/1GB)',
    )
    lines.push('if ($ram -ge 16) {')
    lines.push('    $size = if ($ram -ge 32) { 4096 } else { 8192 }')
    lines.push('    $cs = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges')
    lines.push('    $cs.AutomaticManagedPagefile = $false; $cs.Put() | Out-Null')
    lines.push(
      '    $pf = Get-WmiObject -Query "Select * From Win32_PageFileSetting Where Name=\'C:\\pagefile.sys\'"',
    )
    lines.push(
      '    if ($pf) { $pf.InitialSize = $size; $pf.MaximumSize = $size; $pf.Put() | Out-Null }',
    )
    // biome-ignore lint/suspicious/noTemplateCurlyInString: PowerShell variable syntax
    lines.push('    Write-OK "Page file set to ${size}MB fixed"')
    lines.push('}')
  }

  if (selected.has('mouse_accel')) {
    lines.push('# Disable mouse acceleration')
    lines.push(
      'if (Set-Reg "HKCU:\\Control Panel\\Mouse" "MouseSpeed" 0) { Write-OK "Mouse acceleration disabled" }',
    )
    lines.push('Set-Reg "HKCU:\\Control Panel\\Mouse" "MouseThreshold1" 0')
    lines.push('Set-Reg "HKCU:\\Control Panel\\Mouse" "MouseThreshold2" 0')
  }

  if (selected.has('keyboard_response')) {
    lines.push('# Faster keyboard response')
    lines.push(
      'if (Set-Reg "HKCU:\\Control Panel\\Keyboard" "KeyboardDelay" 0) { Write-OK "Keyboard delay minimized" }',
    )
    lines.push('Set-Reg "HKCU:\\Control Panel\\Keyboard" "KeyboardSpeed" 31')
  }

  if (selected.has('fastboot')) {
    lines.push('# Disable fast startup')
    lines.push(
      'if (Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" "HiberbootEnabled" 0) { Write-OK "Fast startup disabled" }',
    )
  }

  if (selected.has('classic_menu')) {
    lines.push('# Enable classic context menu')
    lines.push('$clsid = "{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}"')
    lines.push('$path = "HKCU:\\Software\\Classes\\CLSID\\$clsid\\InprocServer32"')
    lines.push('if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }')
    lines.push('Set-ItemProperty -Path $path -Name "(Default)" -Value ""')
    lines.push('Write-OK "Classic context menu enabled"')
  }

  if (selected.has('end_task')) {
    lines.push('# Enable End Task in taskbar')
    lines.push(
      'if (Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" "TaskbarEndTask" 1) { Write-OK "End Task enabled in taskbar" }',
    )
  }

  if (selected.has('display_perf')) {
    lines.push('# Visual performance optimizations')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" "VisualFXSetting" 2',
    )
    lines.push('Write-OK "Visual effects set to performance"')
  }

  // explorer_speed - Disable auto folder type detection
  if (selected.has('explorer_speed')) {
    lines.push('# Disable Explorer auto folder-type detection')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\Bags\\AllFolders\\Shell" "FolderType" "NotSpecified" "String"',
    )
    lines.push('Write-OK "Explorer speed optimized"')
  }

  // temp_purge - Clear temp folders
  if (selected.has('temp_purge')) {
    lines.push('# Purge temp folders')
    lines.push('Remove-Item "$env:TEMP\\*" -Recurse -Force -EA SilentlyContinue')
    lines.push('Remove-Item "$env:WINDIR\\Temp\\*" -Recurse -Force -EA SilentlyContinue')
    lines.push('Write-OK "Temp folders purged"')
  }

  // storage_sense - Disable Storage Sense
  if (selected.has('storage_sense')) {
    lines.push('# Disable Storage Sense')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" "01" 0',
    )
    lines.push('Write-OK "Storage Sense disabled"')
  }

  // explorer_cleanup - Remove Home/Gallery from Explorer
  if (selected.has('explorer_cleanup')) {
    lines.push('# Remove Explorer clutter (Home/Gallery)')
    lines.push(
      'Remove-Item "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}" -Force -EA SilentlyContinue',
    )
    lines.push(
      'Remove-Item "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}" -Force -EA SilentlyContinue',
    )
    lines.push('Write-OK "Explorer clutter removed"')
  }

  // notifications_off - Disable notifications
  if (selected.has('notifications_off')) {
    lines.push('# Disable notifications')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" "DisableNotificationCenter" 1',
    )
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" "ToastEnabled" 0',
    )
    lines.push('Write-OK "Notifications disabled"')
  }

  // ps7_telemetry - Disable PowerShell 7 telemetry
  if (selected.has('ps7_telemetry')) {
    lines.push('# Disable PowerShell 7 telemetry')
    lines.push(
      '[Environment]::SetEnvironmentVariable("POWERSHELL_TELEMETRY_OPTOUT", "1", "Machine")',
    )
    lines.push('Write-OK "PS7 telemetry disabled"')
  }

  // accessibility_shortcuts - Disable Sticky Keys, Filter Keys, Toggle Keys
  if (selected.has('accessibility_shortcuts')) {
    lines.push('# Disable accessibility shortcuts (Sticky/Filter/Toggle Keys)')
    lines.push(
      'Set-Reg "HKCU:\\Control Panel\\Accessibility\\StickyKeys" "Flags" "506" "String"',
    )
    lines.push(
      'Set-Reg "HKCU:\\Control Panel\\Accessibility\\Keyboard Response" "Flags" "122" "String"',
    )
    lines.push(
      'Set-Reg "HKCU:\\Control Panel\\Accessibility\\ToggleKeys" "Flags" "58" "String"',
    )
    lines.push(
      'Set-Reg "HKCU:\\Control Panel\\Accessibility\\MouseKeys" "Flags" "58" "String"',
    )
    lines.push('Write-OK "Accessibility shortcuts disabled (no more Sticky Keys popup)"')
  }

  // services_search_off - Set Windows Search to Manual
  if (selected.has('services_search_off')) {
    lines.push('# Disable Windows Search indexing')
    lines.push('Stop-Service WSearch -Force -EA SilentlyContinue')
    lines.push('Set-Service WSearch -StartupType Manual -EA SilentlyContinue')
    lines.push('Write-OK "Windows Search set to Manual (stops disk indexing)"')
  }

  // input_buffer - Increase mouse/keyboard buffer size
  if (selected.has('input_buffer')) {
    lines.push('# Increase input buffer size (for high polling rate devices)')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\mouclass\\Parameters" "MouseDataQueueSize" 32',
    )
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\kbdclass\\Parameters" "KeyboardDataQueueSize" 32',
    )
    lines.push('Write-OK "Input buffer size increased (prevents drops at 8000Hz)"')
  }

  // filesystem_perf - NTFS performance optimizations
  if (selected.has('filesystem_perf')) {
    lines.push('# NTFS filesystem performance optimizations')
    lines.push('fsutil behavior set disablelastaccess 1 >$null 2>&1')
    lines.push('fsutil behavior set disable8dot3 1 >$null 2>&1')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" "NtfsMemoryUsage" 2',
    )
    lines.push('Write-OK "Filesystem performance optimized"')
  }

  // dwm_perf - DWM compositor optimizations
  if (selected.has('dwm_perf')) {
    lines.push('# DWM compositor performance optimizations')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\DWM" "AccentColorInactive" 1')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\DWM" "ColorPrevalence" 0')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\DWM" "EnableAeroPeek" 0')
    lines.push('Write-OK "DWM performance optimized"')
  }

  return lines
}

function generatePerformanceOpts(selected: Set<string>, hardware: HardwareProfile): string[] {
  const lines: string[] = []

  if (hardware.cpu === 'amd_x3d') {
    lines.push('# AMD X3D optimizations')
    lines.push('Write-OK "AMD X3D detected - ensure CPPC is enabled in BIOS"')
  }

  if (selected.has('gamedvr')) {
    lines.push('# Disable Game DVR')
    lines.push('Set-Reg "HKCU:\\System\\GameConfigStore" "GameDVR_Enabled" 0')
    lines.push('Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" "AllowGameDVR" 0')
    lines.push('Write-OK "Game DVR disabled"')
  }

  if (selected.has('game_bar')) {
    lines.push('# Configure Game Bar (keep enabled for X3D, disable overlays)')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "ShowStartupPanel" 0')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "GamePanelStartupTipIndex" 3')
    lines.push('Write-OK "Game Bar overlays disabled"')
  }

  if (selected.has('hags')) {
    lines.push('# Enable Hardware Accelerated GPU Scheduling')
    lines.push(
      'if (Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" "HwSchMode" 2) { Write-OK "HAGS enabled" }',
    )
  }

  if (selected.has('fso_disable')) {
    lines.push('# Disable fullscreen optimizations globally')
    lines.push('Set-Reg "HKCU:\\System\\GameConfigStore" "GameDVR_FSEBehaviorMode" 2')
    lines.push('Set-Reg "HKCU:\\System\\GameConfigStore" "GameDVR_HonorUserFSEBehaviorMode" 1')
    lines.push('Set-Reg "HKCU:\\System\\GameConfigStore" "GameDVR_FSEBehavior" 2')
    lines.push('Write-OK "Fullscreen optimizations disabled"')
  }

  if (selected.has('timer')) {
    lines.push('')
    lines.push('# ╔═══════════════════════════════════════════════════════════════╗')
    lines.push('# ║  TIMER RESOLUTION (0.5ms) - MANUAL STEP REQUIRED              ║')
    lines.push('# ╚═══════════════════════════════════════════════════════════════╝')
    lines.push('#')
    lines.push('# This optimization requires running timer-tool.ps1 BEFORE launching games.')
    lines.push('# Keep it running during gameplay for smooth frame pacing.')
    lines.push('#')
    lines.push('# Download: https://github.com/thepedroferrari/windows-gaming-settings/blob/master/timer-tool.ps1')
    lines.push('#')
    lines.push('# Usage:')
    lines.push('#   .\\timer-tool.ps1                        # Basic - run before gaming')
    lines.push('#   .\\timer-tool.ps1 -GameProcess "dota2"   # Auto-exit when game closes')
    lines.push('#   .\\timer-tool.ps1 -GameProcess "cs2"     # Works with any process name')
    lines.push('#')
    lines.push('# Why: Windows default timer is 15.6ms. This sets it to 0.5ms for')
    lines.push('#      smoother frame pacing and reduced micro-stutters.')
    lines.push('')
    lines.push('Write-Host ""')
    lines.push('Write-Host "  [!] MANUAL STEP: Timer Resolution" -ForegroundColor Yellow')
    lines.push('Write-Host "      Download and run timer-tool.ps1 before gaming" -ForegroundColor Yellow')
    lines.push('Write-Host "      https://github.com/thepedroferrari/windows-gaming-settings" -ForegroundColor Cyan')
    lines.push('Write-Host ""')
  }

  // msi_mode - Enable MSI mode for GPU/network
  if (selected.has('msi_mode')) {
    lines.push('# Enable MSI mode for GPU')
    lines.push(
      '$gpu = Get-PnpDevice -Class Display | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1',
    )
    lines.push('if ($gpu) {')
    lines.push(
      '    $msiPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$($gpu.InstanceId)\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties"',
    )
    lines.push(
      '    if (Test-Path $msiPath) { Set-Reg $msiPath "MSISupported" 1; Write-OK "MSI mode enabled for GPU" }',
    )
    lines.push('}')
  }

  // hpet - Disable HPET
  if (selected.has('hpet')) {
    lines.push('# Disable HPET')
    lines.push('bcdedit /set useplatformclock false 2>$null')
    lines.push('bcdedit /set disabledynamictick yes 2>$null')
    lines.push('Write-OK "HPET disabled (reboot required)"')
  }

  // multiplane_overlay - Disable MPO
  if (selected.has('multiplane_overlay')) {
    lines.push('# Disable Multiplane Overlay')
    lines.push('Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Dwm" "OverlayTestMode" 5')
    lines.push('Write-OK "Multiplane Overlay disabled"')
  }

  // process_mitigation - Disable mitigations
  if (selected.has('process_mitigation')) {
    lines.push('# Disable process mitigations (benchmarking)')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" "KernelShadowStacksForceDisabled" 1',
    )
    lines.push('Write-OK "Process mitigations disabled (security reduced)"')
  }

  // interrupt_affinity - GPU interrupt to CPU 0
  if (selected.has('interrupt_affinity')) {
    lines.push('# Configure GPU interrupt affinity')
    lines.push(
      '$gpu = Get-PnpDevice -Class Display | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1',
    )
    lines.push('if ($gpu) {')
    lines.push(
      '    $affPath = "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$($gpu.InstanceId)\\Device Parameters\\Interrupt Management\\Affinity Policy"',
    )
    lines.push('    if (-not (Test-Path $affPath)) { New-Item -Path $affPath -Force | Out-Null }')
    lines.push('    Set-Reg $affPath "DevicePolicy" 3')
    lines.push('    Set-Reg $affPath "AssignmentSetOverride" 1')
    lines.push('    Write-OK "GPU interrupt affinity set to CPU 0"')
    lines.push('}')
  }

  // core_isolation_off - Disable VBS/HVCI (LUDICROUS TIER)
  if (selected.has('core_isolation_off')) {
    lines.push('# ⚠️ LUDICROUS: Disable Core Isolation (VBS/HVCI)')
    lines.push('Write-Host "  [!!] DANGER: Disabling Core Isolation" -ForegroundColor Red')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" "EnableVirtualizationBasedSecurity" 0',
    )
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity" "Enabled" 0',
    )
    lines.push('Write-OK "Core Isolation disabled (SECURITY REDUCED, reboot required)"')
  }

  // spectre_meltdown_off - Disable Spectre/Meltdown mitigations (LUDICROUS TIER)
  if (selected.has('spectre_meltdown_off')) {
    lines.push('# ⚠️ LUDICROUS: Disable Spectre/Meltdown Mitigations')
    lines.push('Write-Host ""')
    lines.push('Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Red')
    lines.push('Write-Host "  ║ CRITICAL WARNING: DISABLING CPU SECURITY MITIGATIONS          ║" -ForegroundColor Red')
    lines.push('Write-Host "  ║ CVE-2017-5753 (Spectre V1), CVE-2017-5715 (Spectre V2)        ║" -ForegroundColor Red')
    lines.push('Write-Host "  ║ CVE-2017-5754 (Meltdown) - Hardware vulnerabilities           ║" -ForegroundColor Red')
    lines.push('Write-Host "  ║ ANY WEBSITE CAN READ YOUR PASSWORDS AFTER THIS!               ║" -ForegroundColor Red')
    lines.push('Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Red')
    lines.push('Write-Host ""')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" "FeatureSettingsOverride" 3',
    )
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" "FeatureSettingsOverrideMask" 3',
    )
    lines.push('Write-OK "Spectre/Meltdown mitigations DISABLED (reboot required)"')
  }

  // kernel_mitigations_off - Disable kernel exploit protections (LUDICROUS TIER)
  if (selected.has('kernel_mitigations_off')) {
    lines.push('# ⚠️ LUDICROUS: Disable Kernel Mitigations')
    lines.push('Write-Host "  [!!] DANGER: Disabling kernel exploit protections" -ForegroundColor Red')
    lines.push('bcdedit /set isolatedcontext No 2>$null')
    lines.push('bcdedit /set allowedinmemorysettings 0x0 2>$null')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" "DisableExceptionChainValidation" 1',
    )
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" "KernelSEHOPEnabled" 0',
    )
    lines.push('Write-OK "Kernel mitigations DISABLED (SECURITY REDUCED, reboot required)"')
  }

  // dep_off - Disable Data Execution Prevention (LUDICROUS TIER)
  if (selected.has('dep_off')) {
    lines.push('# ⚠️ LUDICROUS: Disable DEP (Data Execution Prevention)')
    lines.push('Write-Host "  [!!] DANGER: Disabling DEP - Buffer overflow exploits work again" -ForegroundColor Red')
    lines.push('bcdedit /set nx AlwaysOff 2>$null')
    lines.push('Write-OK "DEP DISABLED (SECURITY REDUCED, reboot required)"')
    lines.push('Write-Host "  [!!] Re-enable with: bcdedit /set nx OptIn" -ForegroundColor Yellow')
  }

  // native_nvme - Enable Native NVMe I/O
  if (selected.has('native_nvme')) {
    lines.push('# Enable Native NVMe I/O (Win11 24H2+)')
    lines.push('$build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber')
    lines.push('if ($build -ge 26100) {')
    lines.push(
      '    $nvmePath = "HKLM:\\SYSTEM\\CurrentControlSet\\Policies\\Microsoft\\FeatureManagement\\Overrides"',
    )
    lines.push('    if (-not (Test-Path $nvmePath)) { New-Item -Path $nvmePath -Force | Out-Null }')
    lines.push('    Set-Reg $nvmePath "1176759950" 1')
    lines.push('    Write-OK "Native NVMe enabled (reboot required)"')
    lines.push('} else { Write-Fail "Native NVMe requires Win11 24H2+" }')
  }

  // smt_disable - Disable hyperthreading
  if (selected.has('smt_disable')) {
    lines.push('# Disable SMT/Hyperthreading')
    lines.push(
      '$cores = (Get-CimInstance Win32_Processor).NumberOfCores; bcdedit /set numproc $cores 2>$null',
    )
    lines.push('Write-OK "SMT disabled (reboot required)"')
  }

  // mmcss_gaming - MMCSS Gaming Tweaks
  if (selected.has('mmcss_gaming')) {
    lines.push('# MMCSS Gaming Tweaks')
    lines.push(
      '$mmcss = "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games"',
    )
    lines.push('Set-Reg $mmcss "GPU Priority" 8')
    lines.push('Set-Reg $mmcss "Priority" 6')
    lines.push('Set-Reg $mmcss "Scheduling Category" "High" "String"')
    lines.push('Set-Reg $mmcss "SFIO Priority" "High" "String"')
    lines.push('Write-OK "MMCSS gaming priority configured"')
  }

  // scheduler_opt - Scheduler Optimization
  if (selected.has('scheduler_opt')) {
    lines.push('# Scheduler Optimization')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" "Win32PrioritySeparation" 26',
    )
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" "IRQ8Priority" 1',
    )
    lines.push('Write-OK "Scheduler optimized for gaming"')
  }

  // game_mode - Enable Game Mode
  if (selected.has('game_mode')) {
    lines.push('# Enable Game Mode')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "AllowAutoGameMode" 1')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "AutoGameModeEnabled" 1')
    lines.push('Write-OK "Game Mode enabled"')
  }

  // timer_registry - Timer Resolution Registry
  if (selected.has('timer_registry')) {
    lines.push('# Timer Resolution Registry')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" "GlobalTimerResolutionRequests" 1',
    )
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" "SystemResponsiveness" 0',
    )
    lines.push('Write-OK "Timer resolution registry configured"')
  }

  // sysmain_disable - Disable SysMain (Superfetch)
  if (selected.has('sysmain_disable')) {
    lines.push('# Disable SysMain (Superfetch)')
    lines.push('Stop-Service SysMain -Force -EA SilentlyContinue')
    lines.push('Set-Service SysMain -StartupType Disabled -EA SilentlyContinue')
    lines.push('Write-OK "SysMain/Superfetch disabled"')
  }

  // memory_gaming - Keep kernel in RAM, optimize memory for gaming
  if (selected.has('memory_gaming')) {
    lines.push('# Memory gaming mode')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" "DisablePagingExecutive" 1',
    )
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" "LargeSystemCache" 0',
    )
    lines.push('Write-OK "Memory gaming mode enabled (kernel stays in RAM)"')
  }

  // priority_boost_off - Disable dynamic priority boost
  if (selected.has('priority_boost_off')) {
    lines.push('# Disable priority boost')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" "Win32PriorityBoost" 0',
    )
    lines.push('Write-OK "Priority boost disabled (consistent scheduling)"')
  }

  return lines
}

function generatePowerOpts(selected: Set<string>): string[] {
  const lines: string[] = []

  if (selected.has('ultimate_perf')) {
    lines.push('# Enable Ultimate Performance power plan')
    lines.push('powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null')
    lines.push('$plans = powercfg -list | Select-String "Ultimate Performance"')
    lines.push('if ($plans) {')
    lines.push('    $guid = $plans.Line -replace ".*([a-f0-9-]{36}).*", \'$1\'')
    lines.push('    powercfg -setactive $guid')
    lines.push('    Write-OK "Ultimate Performance enabled"')
    lines.push('} else { Write-Fail "Could not enable Ultimate Performance" }')
  } else if (selected.has('power_plan')) {
    lines.push('# Set High Performance power plan')
    lines.push('powercfg -setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c')
    lines.push('Write-OK "High Performance power plan enabled"')
  }

  if (selected.has('usb_power') || selected.has('usb_suspend')) {
    lines.push('# Disable USB selective suspend')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB\\DisableSelectiveSuspend" "DisableSelectiveSuspend" 1',
    )
    lines.push('Write-OK "USB selective suspend disabled"')
  }

  // pcie_power - Disable PCIe ASPM
  if (selected.has('pcie_power')) {
    lines.push('# Disable PCIe link state power management')
    lines.push(
      'powercfg /setacvalueindex scheme_current sub_pciexpress ee12f906-d166-476a-8f3a-af931b6e9d31 0',
    )
    lines.push('powercfg /setactive scheme_current')
    lines.push('Write-OK "PCIe power saving disabled"')
  }

  // core_parking - Disable Core Parking
  if (selected.has('core_parking')) {
    lines.push('# Disable Core Parking')
    lines.push('powercfg /setacvalueindex scheme_current sub_processor CPMINCORES 100')
    lines.push('powercfg /setactive scheme_current')
    lines.push('Write-OK "Core parking disabled"')
  }

  // min_processor_state - Set minimum processor state to 5%
  if (selected.has('min_processor_state')) {
    lines.push('# Set minimum processor state to 5%')
    lines.push('powercfg /setacvalueindex scheme_current sub_processor PROCTHROTTLEMIN 5')
    lines.push('powercfg /setactive scheme_current')
    lines.push('Write-OK "Min processor state set to 5%"')
  }

  // hibernation_disable - Disable Hibernation
  if (selected.has('hibernation_disable')) {
    lines.push('# Disable Hibernation')
    lines.push('powercfg /hibernate off')
    lines.push('Write-OK "Hibernation disabled"')
  }

  // power_throttle_off - Disable Windows power throttling
  if (selected.has('power_throttle_off')) {
    lines.push('# Disable power throttling')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" "PowerThrottlingOff" 1',
    )
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" "EcoQosPolicyDisabled" 1',
    )
    lines.push('Write-OK "Power throttling disabled"')
  }

  return lines
}

function generateNetworkOpts(selected: Set<string>, dnsProvider: string): string[] {
  const lines: string[] = []

  if (selected.has('dns')) {
    const dnsServers: Record<string, [string, string]> = {
      cloudflare: ['1.1.1.1', '1.0.0.1'],
      google: ['8.8.8.8', '8.8.4.4'],
      quad9: ['9.9.9.9', '149.112.112.112'],
      opendns: ['208.67.222.222', '208.67.220.220'],
      adguard: ['94.140.14.14', '94.140.15.15'],
    }
    const [primary, secondary] = dnsServers[dnsProvider] || dnsServers.cloudflare
    lines.push(`# Set DNS to ${dnsProvider}`)
    lines.push(
      `Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Set-DnsClientServerAddress -ServerAddresses "${primary}","${secondary}"`,
    )
    lines.push(`Write-OK "DNS set to ${dnsProvider} (${primary}, ${secondary})"`)
  }

  if (selected.has('nagle') || selected.has('tcp_optimizer')) {
    lines.push('# TCP optimizations (disable Nagle)')
    lines.push('$adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}')
    lines.push('foreach ($adapter in $adapters) {')
    lines.push(
      '    $path = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\$($adapter.InterfaceGuid)"',
    )
    lines.push('    Set-Reg $path "TcpAckFrequency" 1')
    lines.push('    Set-Reg $path "TCPNoDelay" 1')
    lines.push('}')
    lines.push('Write-OK "Nagle algorithm disabled"')
  }

  if (selected.has('network_throttling')) {
    lines.push('# Disable network throttling')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" "NetworkThrottlingIndex" 0xffffffff',
    )
    lines.push('Write-OK "Network throttling disabled"')
  }

  // qos_gaming - Enable QoS for gaming
  if (selected.has('qos_gaming')) {
    lines.push('# Configure QoS for gaming')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" "NonBestEffortLimit" 0',
    )
    lines.push('Write-OK "QoS gaming configured"')
  }

  // ipv4_prefer - Prefer IPv4 over IPv6
  if (selected.has('ipv4_prefer')) {
    lines.push('# Prefer IPv4 over IPv6')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" "DisabledComponents" 32',
    )
    lines.push('Write-OK "IPv4 preferred over IPv6"')
  }

  // teredo_disable - Disable Teredo
  if (selected.has('teredo_disable')) {
    lines.push('# Disable Teredo')
    lines.push('netsh interface teredo set state disabled 2>$null')
    lines.push('Write-OK "Teredo disabled"')
  }

  // rss_enable - Enable Receive Side Scaling
  if (selected.has('rss_enable')) {
    lines.push('# Enable Receive Side Scaling')
    lines.push('Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {')
    lines.push('    Enable-NetAdapterRss -Name $_.Name -EA SilentlyContinue')
    lines.push('}')
    lines.push('Write-OK "RSS enabled on active adapters"')
  }

  // rsc_disable - Disable Receive Segment Coalescing
  if (selected.has('rsc_disable')) {
    lines.push('# Disable Receive Segment Coalescing')
    lines.push('Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {')
    lines.push('    Disable-NetAdapterRsc -Name $_.Name -EA SilentlyContinue')
    lines.push('}')
    lines.push('Write-OK "RSC disabled on active adapters"')
  }

  // adapter_power - Disable network adapter power saving
  if (selected.has('adapter_power')) {
    lines.push('# Disable network adapter power saving')
    lines.push('Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {')
    lines.push(
      '    Set-NetAdapterPowerManagement -Name $_.Name -WakeOnMagicPacket Disabled -WakeOnPattern Disabled -EA SilentlyContinue',
    )
    lines.push('}')
    lines.push('Write-OK "Network adapter power saving disabled"')
  }

  return lines
}

function generatePrivacyOpts(selected: Set<string>): string[] {
  const lines: string[] = []

  if (selected.has('privacy_tier1')) {
    lines.push('# Privacy Tier 1 (Safe)')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" "Enabled" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Privacy" "TailoredExperiencesWithDiagnosticDataEnabled" 0',
    )
    lines.push('Write-OK "Advertising ID and tailored experiences disabled"')
  }

  if (selected.has('privacy_tier2')) {
    lines.push('# Privacy Tier 2 (Moderate)')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" "AllowTelemetry" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" "Start_TrackProgs" 0',
    )
    lines.push('Write-OK "Telemetry minimized"')
  }

  if (selected.has('background_apps')) {
    lines.push('# Disable background apps')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" "GlobalUserDisabled" 1',
    )
    lines.push('Write-OK "Background apps disabled"')
  }

  if (selected.has('copilot_disable')) {
    lines.push('# Disable Copilot')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" "TurnOffWindowsCopilot" 1',
    )
    lines.push('Write-OK "Copilot disabled"')
  }

  if (selected.has('bloatware')) {
    lines.push('# Remove bloatware apps')
    lines.push(
      '$bloatApps = @("Microsoft.BingNews", "Microsoft.GetHelp", "Microsoft.Getstarted", "Microsoft.MicrosoftSolitaireCollection", "Microsoft.People", "Microsoft.PowerAutomateDesktop", "Microsoft.Todos", "Microsoft.WindowsAlarms", "Microsoft.WindowsFeedbackHub", "Microsoft.WindowsMaps", "Microsoft.WindowsSoundRecorder", "Microsoft.YourPhone", "Microsoft.ZuneMusic", "Microsoft.ZuneVideo", "Clipchamp.Clipchamp", "Microsoft.549981C3F5F10")',
    )
    lines.push('foreach ($app in $bloatApps) {')
    lines.push(
      '    Get-AppxPackage -Name $app -AllUsers | Remove-AppxPackage -AllUsers -EA SilentlyContinue',
    )
    lines.push('}')
    lines.push('Write-OK "Bloatware removed"')
  }

  // privacy_tier3 - Aggressive privacy (breaks Xbox)
  if (selected.has('privacy_tier3')) {
    lines.push('# Privacy Tier 3 (Aggressive - breaks Game Pass)')
    lines.push('$xboxSvc = @("XblAuthManager","XblGameSave","XboxGipSvc","XboxNetApiSvc")')
    lines.push(
      'foreach ($s in $xboxSvc) { Stop-Service $s -Force -EA SilentlyContinue; Set-Service $s -StartupType Disabled -EA SilentlyContinue }',
    )
    lines.push('Write-OK "Xbox services disabled (Game Pass broken)"')
  }

  // edge_debloat - Edge policy debloat
  if (selected.has('edge_debloat')) {
    lines.push('# Edge debloat')
    lines.push('Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge" "HideFirstRunExperience" 1')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge" "EdgeShoppingAssistantEnabled" 0',
    )
    lines.push('Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge" "WebWidgetAllowed" 0')
    lines.push('Write-OK "Edge debloated"')
  }

  // razer_block - Block Razer auto-install
  if (selected.has('razer_block')) {
    lines.push('# Block Razer auto-install')
    lines.push(
      'Get-Service | Where-Object {$_.Name -like "Razer*"} | Stop-Service -Force -EA SilentlyContinue',
    )
    lines.push(
      'Get-Service | Where-Object {$_.Name -like "Razer*"} | Set-Service -StartupType Disabled -EA SilentlyContinue',
    )
    lines.push('Write-OK "Razer services blocked"')
  }

  // wpbt_disable - Block OEM BIOS software injection
  if (selected.has('wpbt_disable')) {
    lines.push('# Disable WPBT')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager" "DisableWpbtExecution" 1',
    )
    lines.push('Write-OK "WPBT disabled (blocks OEM bloatware)"')
  }

  // services_trim - Trim non-essential services
  if (selected.has('services_trim')) {
    lines.push('# Trim services')
    lines.push(
      '$trimSvc = @("DiagTrack","dmwappushservice","lfsvc","RetailDemo","Fax","SharedAccess")',
    )
    lines.push(
      'foreach ($s in $trimSvc) { Set-Service $s -StartupType Manual -EA SilentlyContinue; Stop-Service $s -Force -EA SilentlyContinue }',
    )
    lines.push('Write-OK "Services trimmed"')
  }

  // disk_cleanup - Deep disk cleanup
  if (selected.has('disk_cleanup')) {
    lines.push('# Deep disk cleanup')
    lines.push(
      'Start-Process "cleanmgr.exe" -ArgumentList "/sagerun:100" -Wait -WindowStyle Hidden',
    )
    lines.push('Write-OK "Disk cleanup complete"')
  }

  // delivery_opt - Disable Delivery Optimization P2P
  if (selected.has('delivery_opt')) {
    lines.push('# Disable Delivery Optimization P2P')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization\\Config" "DODownloadMode" 0',
    )
    lines.push('Write-OK "Delivery Optimization P2P disabled"')
  }

  // wer_disable - Disable Windows Error Reporting
  if (selected.has('wer_disable')) {
    lines.push('# Disable Windows Error Reporting')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" "Disabled" 1',
    )
    lines.push('Stop-Service WerSvc -Force -EA SilentlyContinue')
    lines.push('Set-Service WerSvc -StartupType Disabled -EA SilentlyContinue')
    lines.push('Write-OK "Windows Error Reporting disabled"')
  }

  // wifi_sense - Disable WiFi Sense
  if (selected.has('wifi_sense')) {
    lines.push('# Disable WiFi Sense')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\WcmSvc\\wifinetworkmanager\\config" "AutoConnectAllowedOEM" 0',
    )
    lines.push('Write-OK "WiFi Sense disabled"')
  }

  // spotlight_disable - Disable Windows Spotlight
  if (selected.has('spotlight_disable')) {
    lines.push('# Disable Windows Spotlight')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "RotatingLockScreenEnabled" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "RotatingLockScreenOverlayEnabled" 0',
    )
    lines.push('Write-OK "Windows Spotlight disabled"')
  }

  // feedback_disable - Disable Windows Feedback prompts
  if (selected.has('feedback_disable')) {
    lines.push('# Disable Windows Feedback prompts')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\Siuf\\Rules" "NumberOfSIUFInPeriod" 0')
    lines.push('Write-OK "Windows Feedback prompts disabled"')
  }

  // clipboard_sync - Disable Cloud Clipboard sync
  if (selected.has('clipboard_sync')) {
    lines.push('# Disable Cloud Clipboard sync')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\Clipboard" "EnableClipboardHistory" 0')
    lines.push('Write-OK "Cloud Clipboard sync disabled"')
  }

  return lines
}

function generateAudioOpts(selected: Set<string>): string[] {
  const lines: string[] = []

  // audio_enhancements - Disable audio enhancements
  if (selected.has('audio_enhancements')) {
    lines.push('# Disable audio enhancements')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\Multimedia\\Audio" "UserDuckingPreference" 3')
    lines.push('Write-OK "Audio ducking disabled"')
  }

  // audio_exclusive - Enable WASAPI exclusive mode
  if (selected.has('audio_exclusive')) {
    lines.push('# Configure audio exclusive mode (disable system sounds)')
    lines.push('Set-Reg "HKCU:\\AppEvents\\Schemes" "(Default)" ".None" "String"')
    lines.push('Write-OK "System sounds disabled for exclusive mode"')
  }

  // audio_communications - Disable volume ducking during Discord/Teams calls
  if (selected.has('audio_communications')) {
    lines.push('# Disable volume ducking during communications')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\Multimedia\\Audio" "UserDuckingPreference" 3')
    lines.push('Write-OK "Volume ducking disabled (full volume during calls)"')
  }

  // audio_system_sounds - Mute all Windows sounds
  if (selected.has('audio_system_sounds')) {
    lines.push('# Disable all Windows system sounds')
    lines.push('Set-Reg "HKCU:\\AppEvents\\Schemes" "(Default)" ".None" "String"')
    lines.push('# Also disable individual sound events')
    lines.push(
      'Get-ChildItem "HKCU:\\AppEvents\\Schemes\\Apps" -Recurse | Where-Object {$_.PSChildName -eq ".Current"} | ForEach-Object { Set-ItemProperty -Path $_.PSPath -Name "(Default)" -Value "" -EA SilentlyContinue }',
    )
    lines.push('Write-OK "Windows system sounds muted"')
  }

  return lines
}

// =============================================================================
// Verification Script Generator
// =============================================================================

const VERIFICATION_BANNER = `
@'
    ____             __   ______
   / __ \\____  _____/ /__/_  __/_  ______  ___
  / /_/ / __ \\/ ___/ //_/ / / / / / / __ \\/ _ \\
 / _, _/ /_/ / /__/ ,<   / / / /_/ / / / /  __/
/_/ |_|\\____/\\___/_/|_| /_/  \\__,_/_/ /_/\\___/

      Verification Script - Check Applied Optimizations
'@
`

const VERIFICATION_HELPERS = `
$script:PassCount = 0
$script:FailCount = 0
$script:SkipCount = 0

function Write-Banner { Write-Host ${VERIFICATION_BANNER.trim()} -ForegroundColor Cyan }
function Write-Pass { param([string]$M) $script:PassCount++; Write-Host "  [PASS] $M" -ForegroundColor Green }
function Write-Fail { param([string]$M) $script:FailCount++; Write-Host "  [FAIL] $M" -ForegroundColor Red }
function Write-Skip { param([string]$M) $script:SkipCount++; Write-Host "  [SKIP] $M" -ForegroundColor DarkGray }
function Write-Section { param([string]$M) Write-Host ""; Write-Host "=== $M ===" -ForegroundColor White }
function Test-RegValue { param([string]$Path, [string]$Name, $Expected)
    try {
        if (-not (Test-Path $Path)) { return $false }
        $actual = (Get-ItemProperty -Path $Path -Name $Name -EA SilentlyContinue).$Name
        return $actual -eq $Expected
    } catch { return $false }
}
`

/**
 * Build a verification script that checks applied optimizations
 */
export function buildVerificationScript(selection: SelectionState): string {
  const { optimizations } = selection
  const selected = new Set(optimizations)
  const timestamp = new Date().toISOString()

  const lines: string[] = []

  // Header
  lines.push('<#')
  lines.push('.SYNOPSIS')
  lines.push(`    RockTune Verification Script - Generated ${timestamp}`)
  lines.push('.DESCRIPTION')
  lines.push('    Checks if the optimizations from your RockTune loadout were applied.')
  lines.push('    Run this script to verify your system state.')
  lines.push('#>')
  lines.push('')

  // Helper functions
  lines.push(VERIFICATION_HELPERS.trim())
  lines.push('')

  // Banner
  lines.push('Clear-Host')
  lines.push('Write-Banner')
  lines.push('Write-Host ""')
  lines.push('')

  // System section
  lines.push('Write-Section "System Settings"')

  if (selected.has('mouse_accel')) {
    lines.push('if (Test-RegValue "HKCU:\\Control Panel\\Mouse" "MouseSpeed" 0) { Write-Pass "Mouse acceleration disabled" } else { Write-Fail "Mouse acceleration NOT disabled" }')
  }

  if (selected.has('keyboard_response')) {
    lines.push('if (Test-RegValue "HKCU:\\Control Panel\\Keyboard" "KeyboardDelay" 0) { Write-Pass "Keyboard delay minimized" } else { Write-Fail "Keyboard delay NOT minimized" }')
  }

  if (selected.has('fastboot')) {
    lines.push('if (Test-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" "HiberbootEnabled" 0) { Write-Pass "Fast startup disabled" } else { Write-Fail "Fast startup NOT disabled" }')
  }

  if (selected.has('end_task')) {
    lines.push('if (Test-RegValue "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" "TaskbarEndTask" 1) { Write-Pass "End Task enabled in taskbar" } else { Write-Fail "End Task NOT enabled" }')
  }

  if (selected.has('notifications_off')) {
    lines.push('if (Test-RegValue "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" "DisableNotificationCenter" 1) { Write-Pass "Notifications disabled" } else { Write-Fail "Notifications NOT disabled" }')
  }

  // Performance section
  lines.push('')
  lines.push('Write-Section "Performance Settings"')

  if (selected.has('gamedvr')) {
    lines.push('if (Test-RegValue "HKCU:\\System\\GameConfigStore" "GameDVR_Enabled" 0) { Write-Pass "Game DVR disabled" } else { Write-Fail "Game DVR NOT disabled" }')
  }

  if (selected.has('hags')) {
    lines.push('if (Test-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" "HwSchMode" 2) { Write-Pass "HAGS enabled" } else { Write-Fail "HAGS NOT enabled" }')
  }

  if (selected.has('fso_disable')) {
    lines.push('if (Test-RegValue "HKCU:\\System\\GameConfigStore" "GameDVR_FSEBehaviorMode" 2) { Write-Pass "Fullscreen optimizations disabled" } else { Write-Fail "Fullscreen optimizations NOT disabled" }')
  }

  if (selected.has('game_mode')) {
    lines.push('if (Test-RegValue "HKCU:\\Software\\Microsoft\\GameBar" "AutoGameModeEnabled" 1) { Write-Pass "Game Mode enabled" } else { Write-Fail "Game Mode NOT enabled" }')
  }

  // Power section
  lines.push('')
  lines.push('Write-Section "Power Settings"')

  if (selected.has('ultimate_perf') || selected.has('power_plan')) {
    lines.push('$plan = powercfg /getactivescheme')
    lines.push('if ($plan -match "Ultimate Performance|High performance") { Write-Pass "High/Ultimate performance plan active" } else { Write-Fail "Performance power plan NOT active" }')
  }

  if (selected.has('hibernation_disable')) {
    lines.push('$hibPath = "$env:SystemDrive\\hiberfil.sys"')
    lines.push('if (-not (Test-Path $hibPath)) { Write-Pass "Hibernation disabled" } else { Write-Fail "Hibernation file still exists" }')
  }

  // Network section
  lines.push('')
  lines.push('Write-Section "Network Settings"')

  if (selected.has('nagle') || selected.has('tcp_optimizer')) {
    lines.push('$adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1')
    lines.push('if ($adapter) {')
    lines.push('    $path = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\$($adapter.InterfaceGuid)"')
    lines.push('    if (Test-RegValue $path "TcpAckFrequency" 1) { Write-Pass "Nagle algorithm disabled on $($adapter.Name)" } else { Write-Fail "Nagle algorithm NOT disabled" }')
    lines.push('} else { Write-Skip "No active network adapter found" }')
  }

  if (selected.has('network_throttling')) {
    lines.push('if (Test-RegValue "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" "NetworkThrottlingIndex" 0xffffffff) { Write-Pass "Network throttling disabled" } else { Write-Fail "Network throttling NOT disabled" }')
  }

  // Privacy section
  lines.push('')
  lines.push('Write-Section "Privacy Settings"')

  if (selected.has('privacy_tier1')) {
    lines.push('if (Test-RegValue "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" "Enabled" 0) { Write-Pass "Advertising ID disabled" } else { Write-Fail "Advertising ID NOT disabled" }')
  }

  if (selected.has('privacy_tier2')) {
    lines.push('if (Test-RegValue "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" "AllowTelemetry" 0) { Write-Pass "Telemetry minimized" } else { Write-Fail "Telemetry NOT minimized" }')
  }

  if (selected.has('background_apps')) {
    lines.push('if (Test-RegValue "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" "GlobalUserDisabled" 1) { Write-Pass "Background apps disabled" } else { Write-Fail "Background apps NOT disabled" }')
  }

  if (selected.has('copilot_disable')) {
    lines.push('if (Test-RegValue "HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" "TurnOffWindowsCopilot" 1) { Write-Pass "Copilot disabled" } else { Write-Fail "Copilot NOT disabled" }')
  }

  // Summary
  lines.push('')
  lines.push('Write-Host ""')
  lines.push('Write-Host "  ╔════════════════════════════════════════╗" -ForegroundColor White')
  lines.push('Write-Host "  ║         VERIFICATION SUMMARY           ║" -ForegroundColor White')
  lines.push('Write-Host "  ╚════════════════════════════════════════╝" -ForegroundColor White')
  lines.push('Write-Host ""')
  lines.push('$total = $script:PassCount + $script:FailCount')
  lines.push('Write-Host "  Passed:  $($script:PassCount)/$total" -ForegroundColor Green')
  lines.push('if ($script:FailCount -gt 0) { Write-Host "  Failed:  $($script:FailCount)" -ForegroundColor Red }')
  lines.push('if ($script:SkipCount -gt 0) { Write-Host "  Skipped: $($script:SkipCount)" -ForegroundColor DarkGray }')
  lines.push('Write-Host ""')
  lines.push('if ($script:FailCount -eq 0) { Write-Host "  All optimizations verified!" -ForegroundColor Green }')
  lines.push('else { Write-Host "  Some optimizations may need to be re-applied or require reboot." -ForegroundColor Yellow }')
  lines.push('Write-Host ""')

  return lines.join('\n')
}
