/**
 * Script Generator - Pure PowerShell script generation
 *
 * Generates self-contained PowerShell scripts from user selections.
 * Scripts work offline without network dependencies.
 */

import type {
  HardwareProfile,
  MonitorSoftwareType,
  PackageKey,
  PeripheralType,
  SoftwareCatalog,
} from './types'

export type SelectionState = {
  hardware: HardwareProfile
  optimizations: string[]
  packages: PackageKey[]
  missingPackages: string[]
}

/** Map peripheral types to catalog package keys */
const PERIPHERAL_TO_PACKAGE: Record<PeripheralType, PackageKey | null> = {
  logitech: 'logitechghub' as PackageKey,
  razer: 'razersynapse' as PackageKey,
  corsair: 'icue' as PackageKey,
  steelseries: 'steelseriesgg' as PackageKey,
  asus: 'armourycrate' as PackageKey,
  wooting: 'wooting' as PackageKey,
}

/** Map monitor software types to catalog package keys */
const MONITOR_TO_PACKAGE: Record<MonitorSoftwareType, PackageKey | null> = {
  dell: 'delldisplaymanager' as PackageKey,
  lg: 'lgonscreencontrol' as PackageKey,
  hp: 'hpdisplaycenter' as PackageKey,
}

export type ScriptGeneratorOptions = {
  /** Software catalog for package lookups */
  catalog: SoftwareCatalog
  /** DNS provider for network optimization (default: 'cloudflare') */
  dnsProvider?: string
}

const DEFAULT_DNS_PROVIDER = 'cloudflare'

/** Inline helper functions for self-contained scripts */
const HELPER_FUNCTIONS = `
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
    if (pkgKey && pkgKey in catalog) {
      allPackages.add(pkgKey)
    }
  }

  for (const monitor of hardware.monitorSoftware) {
    const pkgKey = MONITOR_TO_PACKAGE[monitor]
    if (pkgKey && pkgKey in catalog) {
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
  lines.push('    Source: https://github.com/thepedroferrari/windows-gaming-settings')
  lines.push('')
  lines.push('    Windows is the arena. RockTune is the upgrade bay.')
  lines.push('#>')
  lines.push('')

  // Config JSON
  const config = {
    generated: timestamp,
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

  // Clear screen and header
  lines.push('Clear-Host')
  lines.push('Write-Host ""')
  lines.push('Write-Host "  ROCKTUNE LOADOUT" -ForegroundColor Magenta')
  lines.push('Write-Host "  ================" -ForegroundColor Magenta')
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

  // Footer
  lines.push('Write-Step "Complete"')
  lines.push('Write-Host ""')
  lines.push('Write-Host "  Loadout applied. Reboot recommended." -ForegroundColor Green')
  lines.push('Write-Host ""')

  return lines.join('\n')
}

function generateSystemOpts(selected: Set<string>): string[] {
  const lines: string[] = []

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
    lines.push('# Note: Timer resolution requires timer-tool.ps1 running before games')
    lines.push('Write-OK "Run timer-tool.ps1 before gaming for 0.5ms timer"')
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

  return lines
}

function generateNetworkOpts(selected: Set<string>, dnsProvider: string): string[] {
  const lines: string[] = []

  if (selected.has('dns')) {
    const dnsServers: Record<string, [string, string]> = {
      cloudflare: ['1.1.1.1', '1.0.0.1'],
      google: ['8.8.8.8', '8.8.4.4'],
      quad9: ['9.9.9.9', '149.112.112.112'],
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

  return lines
}
