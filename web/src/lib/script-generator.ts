/**
 * Script Generator - Pure PowerShell script generation
 *
 * Generates self-contained PowerShell scripts from user selections.
 * Scripts work offline without network dependencies.
 *
 * ## Generator Modules (for new optimizations)
 *
 * When adding new optimizations, prefer using the structured generators
 * from ./generators/ for consistent code generation:
 *
 * ```typescript
 * import { generateRegistryOpt, generateServiceOpt, generateBcdeditOpt } from './generators'
 *
 * // Registry optimization
 * const lines = generateRegistryOpt({
 *   type: 'registry',
 *   tier: 'safe',
 *   description: 'Disable mouse acceleration',
 *   path: 'HKCU:\\Control Panel\\Mouse',
 *   name: 'MouseSpeed',
 *   value: 0,
 *   successMessage: 'Mouse acceleration disabled'
 * })
 *
 * // Service optimization
 * const lines = generateServiceOpt({
 *   type: 'service',
 *   tier: 'risky',
 *   description: 'Disable Xbox services - breaks Game Pass',
 *   services: ['XblAuthManager', 'XblGameSave'],
 *   action: 'stop-and-disable',
 *   warningMessage: 'This will break Game Pass!',
 *   successMessage: 'Xbox services disabled'
 * })
 *
 * // Bcdedit optimization
 * const lines = generateBcdeditOpt(
 *   'caution',
 *   'Disable HPET',
 *   '/set useplatformclock false',
 *   'HPET disabled',
 *   'HPET disabled'  // reboot reason
 * )
 * ```
 *
 * These generators automatically handle:
 * - Tier-prefixed comments ([SAFE], [CAUTION], [RISKY], [LUDICROUS])
 * - Consistent feedback (Write-OK, Write-Fail, Write-Warn)
 * - Reboot tracking (Add-RebootReason)
 * - Error handling
 */

import { OPTIMIZATIONS } from './optimizations'
import type {
  HardwareProfile,
  MonitorSoftwareType,
  OptimizationKey,
  OptimizationTier,
  PackageKey,
  PeripheralType,
  PresetType,
  SoftwareCatalog,
} from './types'
import { isPackageKey, OPTIMIZATION_KEYS, OPTIMIZATION_TIERS } from './types'

/** LUDICROUS optimization keys for danger zone detection */
const LUDICROUS_KEYS: readonly OptimizationKey[] = [
  OPTIMIZATION_KEYS.SPECTRE_MELTDOWN_OFF,
  OPTIMIZATION_KEYS.CORE_ISOLATION_OFF,
  OPTIMIZATION_KEYS.KERNEL_MITIGATIONS_OFF,
  OPTIMIZATION_KEYS.DEP_OFF,
]

/** Build a lookup map from optimization key to tier */
const TIER_BY_KEY = new Map<OptimizationKey, OptimizationTier>(
  OPTIMIZATIONS.map((opt) => [opt.key, opt.tier]),
)

/** Tier priority for risk profile calculation (higher = more dangerous) */
const TIER_PRIORITY: Record<OptimizationTier, number> = {
  [OPTIMIZATION_TIERS.SAFE]: 0,
  [OPTIMIZATION_TIERS.CAUTION]: 1,
  [OPTIMIZATION_TIERS.RISKY]: 2,
  [OPTIMIZATION_TIERS.LUDICROUS]: 3,
}

/** Curated next steps per persona - shown after script completion */
const NEXT_STEPS_BY_PRESET: Record<PresetType, readonly string[]> = {
  gamer: [
    'DISPLAY: Set refresh rate to max (Settings > Display > Advanced)',
    'GPU: Low Latency Mode = On, Power = Max Performance',
    'DISCORD: Disable Hardware Acceleration (Settings > Advanced)',
  ],
  pro_gamer: [
    'DISPLAY: Set refresh rate to max (Settings > Display > Advanced)',
    'GPU: Low Latency Mode = Ultra, Power = Max Performance',
    'DISCORD: Disable Hardware Acceleration (Settings > Advanced)',
    'RGB: Disable all RGB software overlays',
    'TIMER: Use option [2] in the menu to run timer before gaming',
  ],
  streamer: [
    'OBS: Set encoder to NVENC/AMF, Quality preset',
    'OBS: Enable Game Capture over Display Capture',
    'AUDIO: Configure VoiceMeeter for stream/game split',
    'GPU: Enable capture mode in NVIDIA/AMD settings',
  ],
  benchmarker: [
    'CAPFRAMEX: Capture baseline before/after for comparisons',
    'LATENCYMON: Verify DPC latency < 500us, no red flags',
    'HWINFO: Log temps/power during benchmark runs',
    'TIMER: Use option [2] in the menu for accurate frametime capture',
  ],
}

/** Embedded timer tool code (from timer-tool.ps1) */
const TIMER_TOOL_CODE = `
# ══════════════════════════════════════════════════════════════════════════════
# TIMER RESOLUTION TOOL (embedded from timer-tool.ps1)
# Maintains 0.5ms timer resolution for smooth frame pacing
# ══════════════════════════════════════════════════════════════════════════════

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class TimerResolution {
    [DllImport("ntdll.dll", SetLastError = true)]
    public static extern uint NtSetTimerResolution(uint DesiredResolution, bool SetResolution, out uint CurrentResolution);

    [DllImport("ntdll.dll", SetLastError = true)]
    public static extern uint NtQueryTimerResolution(out uint MinimumResolution, out uint MaximumResolution, out uint CurrentResolution);
}
"@

function Set-TimerResolution {
    param([double]$Milliseconds = 0.5)
    $period = [uint32]($Milliseconds * 10000)
    try {
        $currentRes = [uint32]0
        $result = [TimerResolution]::NtSetTimerResolution($period, $true, [ref]$currentRes)
        return $result -eq 0
    } catch { return $false }
}

function Get-CurrentTimerResolution {
    try {
        $minRes = [uint32]0; $maxRes = [uint32]0; $curRes = [uint32]0
        $result = [TimerResolution]::NtQueryTimerResolution([ref]$minRes, [ref]$maxRes, [ref]$curRes)
        if ($result -eq 0) { return $curRes / 10000.0 }
        return $null
    } catch { return $null }
}

function Start-TimerLoop {
    param([string]$GameProcess = "")

    Write-Host ""
    Write-Host "  === TIMER RESOLUTION TOOL ===" -ForegroundColor Cyan
    Write-Host "  Maintaining 0.5ms timer resolution for smooth frame pacing" -ForegroundColor Yellow
    Write-Host ""

    $currentRes = Get-CurrentTimerResolution
    if ($currentRes) {
        Write-Host "  Current: $([math]::Round($currentRes, 2)) ms  ->  Target: 0.5 ms" -ForegroundColor Yellow
    }

    if (Set-TimerResolution -Milliseconds 0.5) {
        $newRes = Get-CurrentTimerResolution
        if ($newRes) { Write-Host "  Timer set to: $([math]::Round($newRes, 2)) ms" -ForegroundColor Green }
        else { Write-Host "  Timer set to 0.5ms (unable to verify)" -ForegroundColor Green }
    } else {
        Write-Host "  Failed to set timer resolution" -ForegroundColor Red
        return
    }

    Write-Host ""
    Write-Host "  Keep this window open while gaming." -ForegroundColor Yellow
    Write-Host "  Press Ctrl+C to stop." -ForegroundColor Yellow
    Write-Host ""

    if ($GameProcess) {
        Write-Host "  Monitoring for process: $GameProcess" -ForegroundColor Cyan
        Write-Host "  Will exit when game closes." -ForegroundColor Yellow
        while ($true) {
            $proc = Get-Process -Name $GameProcess -ErrorAction SilentlyContinue
            if (-not $proc) {
                Write-Host "  Game process not found. Exiting..." -ForegroundColor Yellow
                break
            }
            Start-Sleep -Seconds 5
        }
    } else {
        while ($true) {
            Start-Sleep -Seconds 1
            $current = Get-CurrentTimerResolution
            if ($current -and $current -gt 1.0) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Timer reset detected ($([math]::Round($current, 2)) ms). Re-applying..." -ForegroundColor Yellow
                Set-TimerResolution -Milliseconds 0.5 | Out-Null
            }
        }
    }
}

`

/**
 * Calculate the highest risk tier from selected optimizations
 */
function calculateRiskProfile(selected: Set<OptimizationKey>): OptimizationTier {
  let highestPriority = 0
  let highestTier: OptimizationTier = OPTIMIZATION_TIERS.SAFE

  for (const key of selected) {
    const tier = TIER_BY_KEY.get(key)
    if (tier) {
      const priority = TIER_PRIORITY[tier]
      if (priority > highestPriority) {
        highestPriority = priority
        highestTier = tier
      }
    }
  }

  return highestTier
}

/**
 * Check if any CAUTION or higher tier optimizations are selected
 */
function hasNonSafeOptimizations(selected: Set<OptimizationKey>): boolean {
  for (const key of selected) {
    const tier = TIER_BY_KEY.get(key)
    if (tier && TIER_PRIORITY[tier] >= TIER_PRIORITY[OPTIMIZATION_TIERS.CAUTION]) {
      return true
    }
  }
  return false
}

export type SelectionState = {
  hardware: HardwareProfile
  optimizations: OptimizationKey[]
  packages: PackageKey[]
  missingPackages: string[]
  preset: PresetType | null
  /** Include embedded timer tool code with launch menu (default: true) */
  includeTimer: boolean
  /** Include manual steps section in completion (default: false) */
  includeManualSteps: boolean
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

function escapePsDoubleQuoted(value: string): string {
  return value.replace(/`/g, '``').replace(/"/g, '`"').replace(/\$/g, '`$').replace(/\r?\n/g, ' ')
}

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

# --- Reboot tracking ---
$script:RebootRequired = $false
$script:RebootReasons = @()

$script:Banner = ${ASCII_BANNER.trim()}

function Write-Banner { Write-Host $script:Banner -ForegroundColor Magenta }
function Write-Step { param([string]$M) $script:StepCount++; Write-Host ""; Write-Host "[$script:StepCount/$script:StepTotal] $M" -ForegroundColor Cyan }
function Write-OK { param([string]$M) $script:SuccessCount++; Write-Host "  [OK] $M" -ForegroundColor Green }
function Write-Fail { param([string]$M) $script:FailCount++; Write-Host "  [FAIL] $M" -ForegroundColor Red }
function Write-Warn { param([string]$M) $script:WarningCount++; Write-Host "  [!] $M" -ForegroundColor Yellow }
function Add-RebootReason { param([string]$R) $script:RebootRequired = $true; $script:RebootReasons += $R }
function Set-Reg {
    param([string]$Path, [string]$Name, $Value, [string]$Type = "DWORD", [switch]$PassThru)
    $success = $false
    try {
        if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
        $existing = Get-ItemProperty -Path $Path -Name $Name -EA SilentlyContinue
        if ($null -eq $existing) {
            New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force | Out-Null
        } else {
            Set-ItemProperty -Path $Path -Name $Name -Value $Value -EA Stop
        }
        $success = $true
    } catch { $success = $false }
    if ($PassThru) { return $success }
}
function Set-Reg-Verified {
    param([string]$Path, [string]$Name, $Value, [string]$Type = "DWORD", [string]$Label)
    $before = (Get-ItemProperty -Path $Path -Name $Name -EA SilentlyContinue).$Name
    $success = Set-Reg $Path $Name $Value $Type -PassThru
    if ($success) {
        $after = (Get-ItemProperty -Path $Path -Name $Name -EA SilentlyContinue).$Name
        if ($after -eq $Value) { Write-OK "$Label" }
        else { Write-Warn "$Label (expected $Value, got $after)" }
    } else { Write-Fail "$Label" }
}
function Disable-Task {
    param([string]$TaskPath)
    try { Disable-ScheduledTask -TaskName $TaskPath -EA SilentlyContinue | Out-Null; return $true }
    catch { return $false }
}

# --- Pre-flight scan ---
$script:ScanResults = @()
function Get-RegValue { param([string]$Path, [string]$Name)
    try {
        if (-not (Test-Path $Path)) { return $null }
        return (Get-ItemProperty -Path $Path -Name $Name -EA SilentlyContinue).$Name
    } catch { return $null }
}
function Add-ScanResult {
    param([string]$Name, [string]$Current, [string]$Target, [string]$Status)
    $script:ScanResults += [PSCustomObject]@{
        Setting = $Name
        Current = if ($Current -eq $null -or $Current -eq '') { '(not set)' } else { $Current }
        Target = $Target
        Status = $Status
    }
}
function Write-ScanHeader {
    Write-Host ""
    Write-Host "ITEM                                    | BEFORE        | AFTER" -ForegroundColor Cyan
    Write-Host "$([string]::new([char]0x2500, 40))" -NoNewline -ForegroundColor DarkGray
    Write-Host "$([char]0x253C)" -NoNewline -ForegroundColor DarkGray
    Write-Host "$([string]::new([char]0x2500, 15))" -NoNewline -ForegroundColor DarkGray
    Write-Host "$([char]0x253C)" -NoNewline -ForegroundColor DarkGray
    Write-Host "$([string]::new([char]0x2500, 22))" -ForegroundColor DarkGray
}
function Write-ScanRow {
    param([string]$Item, [string]$Before, [string]$After, [string]$Status)
    $checkbox = switch ($Status) {
        'OK'     { '[X]' }
        'CHANGE' { '[ ]' }
        default  { '[~]' }
    }
    $color = switch ($Status) {
        'OK'     { 'DarkGreen' }
        'CHANGE' { 'Yellow' }
        default  { 'DarkGray' }
    }
    $itemCol = if ($Item.Length -gt 40) { $Item.Substring(0,37) + '...' } else { $Item.PadRight(40) }
    $beforeCol = if ($Before.Length -gt 14) { $Before.Substring(0,11) + '...' } else { $Before.PadRight(14) }
    $afterVal = if ($After.Length -gt 14) { $After.Substring(0,11) + '...' } else { $After }
    $afterCol = "$afterVal $checkbox".PadRight(22)
    Write-Host $itemCol -NoNewline -ForegroundColor $color
    Write-Host "|" -NoNewline -ForegroundColor DarkGray
    Write-Host $beforeCol -NoNewline -ForegroundColor $color
    Write-Host "|" -NoNewline -ForegroundColor DarkGray
    Write-Host $afterCol -ForegroundColor $color
}
function Write-ScanResults {
    foreach ($r in $script:ScanResults) {
        Write-ScanRow $r.Setting $r.Current $r.Target $r.Status
    }
    $ok = ($script:ScanResults | Where-Object { $_.Status -eq 'OK' }).Count
    $change = ($script:ScanResults | Where-Object { $_.Status -eq 'CHANGE' }).Count
    $other = ($script:ScanResults | Where-Object { $_.Status -notin 'OK','CHANGE' }).Count
    Write-Host ""
    Write-Host "Summary: " -NoNewline
    Write-Host "$ok ready" -ForegroundColor Green -NoNewline
    Write-Host " | " -NoNewline
    Write-Host "$change to apply" -ForegroundColor Yellow -NoNewline
    if ($other -gt 0) {
        Write-Host " | " -NoNewline
        Write-Host "$other pending reboot" -ForegroundColor DarkGray
    }
    Write-Host ""
}
`

/**
 * Generate PowerShell code for displaying next steps based on preset
 */
function generateNextStepsBlock(preset: PresetType | null): string[] {
  const lines: string[] = []
  const steps = NEXT_STEPS_BY_PRESET[preset ?? 'gamer']
  const presetLabel = (preset ?? 'gamer').toUpperCase().replace('_', ' ')

  lines.push('')
  lines.push('Write-Host ""')
  lines.push(
    'Write-Host "  ╔════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan',
  )
  lines.push(
    `Write-Host "  ║                           NEXT STEPS: ${presetLabel.padEnd(24)}          ║" -ForegroundColor Cyan`,
  )
  lines.push(
    'Write-Host "  ╠════════════════════════════════════════════════════════════════════════════╣" -ForegroundColor Cyan',
  )
  lines.push('Write-Host "  ║" -ForegroundColor Cyan')

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    const paddedStep = `  ${i + 1}. ${step}`.padEnd(76)
    lines.push(`Write-Host "  ║${paddedStep}║" -ForegroundColor Cyan`)
  }

  lines.push('Write-Host "  ║" -ForegroundColor Cyan')
  lines.push(
    'Write-Host "  ║  Full guide: https://rocktune.pedroferrari.com/#guide                      ║" -ForegroundColor Cyan',
  )
  lines.push(
    'Write-Host "  ╚════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan',
  )
  lines.push('Write-Host ""')

  return lines
}

/**
 * Generate the launch menu PowerShell code (when timer is included)
 */
function generateLaunchMenu(): string[] {
  const lines: string[] = []

  lines.push('')
  lines.push('# ══════════════════════════════════════════════════════════════════════════════')
  lines.push('# LAUNCH MENU')
  lines.push('# ══════════════════════════════════════════════════════════════════════════════')
  lines.push('')
  lines.push('function Show-RockTuneMenu {')
  lines.push('    while ($true) {')
  lines.push('        Clear-Host')
  lines.push('        Write-Banner')
  lines.push('        Write-Host ""')
  lines.push(
    '        Write-Host "  ╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta',
  )
  lines.push(
    '        Write-Host "  ║                    ROCKTUNE LOADOUT                            ║" -ForegroundColor Magenta',
  )
  lines.push(
    '        Write-Host "  ╠════════════════════════════════════════════════════════════════╣" -ForegroundColor Magenta',
  )
  lines.push(
    '        Write-Host "  ║                                                                ║" -ForegroundColor Magenta',
  )
  lines.push(
    '        Write-Host "  ║  [1] Apply Optimizations                                       ║" -ForegroundColor White',
  )
  lines.push(
    '        Write-Host "  ║      Run system optimizations and install software             ║" -ForegroundColor DarkGray',
  )
  lines.push(
    '        Write-Host "  ║                                                                ║" -ForegroundColor Magenta',
  )
  lines.push(
    '        Write-Host "  ║  [2] Run Timer Tool (0.5ms)                                    ║" -ForegroundColor White',
  )
  lines.push(
    '        Write-Host "  ║      Keep running for smooth frame pacing during games         ║" -ForegroundColor DarkGray',
  )
  lines.push(
    '        Write-Host "  ║                                                                ║" -ForegroundColor Magenta',
  )
  lines.push(
    '        Write-Host "  ║  [3] Both (Apply + Timer)                                      ║" -ForegroundColor White',
  )
  lines.push(
    '        Write-Host "  ║      Apply optimizations, then start timer tool                ║" -ForegroundColor DarkGray',
  )
  lines.push(
    '        Write-Host "  ║                                                                ║" -ForegroundColor Magenta',
  )
  lines.push(
    '        Write-Host "  ║  [Q] Quit                                                      ║" -ForegroundColor DarkGray',
  )
  lines.push(
    '        Write-Host "  ║                                                                ║" -ForegroundColor Magenta',
  )
  lines.push(
    '        Write-Host "  ╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta',
  )
  lines.push('        Write-Host ""')
  lines.push('        $choice = Read-Host "  Select option (1-3, Q to quit)"')
  lines.push('')
  lines.push('        switch ($choice.ToUpper()) {')
  lines.push('            "1" { Invoke-RockTuneOptimizations; break }')
  lines.push('            "2" { Start-TimerLoop; break }')
  lines.push('            "3" { Invoke-RockTuneOptimizations; Start-TimerLoop; break }')
  lines.push('            "Q" { Write-Host "  Exiting." -ForegroundColor Yellow; return }')
  lines.push('            default {')
  lines.push('                Write-Host ""')
  lines.push('                Write-Host "  Invalid option. Press any key to try again..." -ForegroundColor Red')
  lines.push('                try { $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") } catch { }')
  lines.push('            }')
  lines.push('        }')
  lines.push('    }')
  lines.push('}')
  lines.push('')

  return lines
}

/**
 * Build a complete PowerShell script from selection state
 */
export function buildScript(selection: SelectionState, options: ScriptGeneratorOptions): string {
  const { hardware, optimizations, packages, missingPackages, preset, includeTimer } = selection
  const { catalog, dnsProvider = DEFAULT_DNS_PROVIDER } = options
  const selected = new Set(optimizations)

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

  const hasLudicrous = LUDICROUS_KEYS.some((key) => selected.has(key))

  lines.push('#Requires -RunAsAdministrator')
  if (hasLudicrous) {
    lines.push('# ╔═══════════════════════════════════════════════════════════════════════╗')
    lines.push('# ║  ⚠️  DANGER_ZONE_ENABLED=true                                          ║')
    lines.push('# ║  WARNING: Security mitigations disabled. OFFLINE USE ONLY.            ║')
    lines.push('# ╚═══════════════════════════════════════════════════════════════════════╝')
    lines.push('')
  }
  lines.push('<#')
  lines.push('.SYNOPSIS')
  lines.push(`    RockTune — Loadout generated ${timestamp}`)
  lines.push('.DESCRIPTION')
  lines.push(`    Core: ${hardware.cpu} + ${hardware.gpu}`)
  lines.push(`    Build: ${__BUILD_COMMIT__} (${__BUILD_DATE__})`)
  lines.push(`    Source: https://github.com/thepedroferrari/rocktune/tree/${__BUILD_COMMIT__}`)
  if (hasLudicrous) {
    lines.push('')
    lines.push('    ⚠️  DANGER ZONE: CPU security mitigations are DISABLED in this script.')
    lines.push('    DO NOT run this on any machine connected to the internet.')
  }
  lines.push('')
  lines.push('    Windows is the arena. RockTune is the upgrade bay.')
  lines.push('.NOTES')
  lines.push('    BENCHMARKING GUIDANCE:')
  lines.push('    Before running optimizations:')
  lines.push('      1. Run CapFrameX or RTSS benchmark in your main game')
  lines.push('      2. Note: Average FPS, 1% low, 0.1% low')
  lines.push('      3. Apply optimizations, reboot')
  lines.push('      4. Run same benchmark, compare results')
  lines.push('')
  lines.push('    Recommended tools:')
  lines.push('      - CapFrameX: https://www.capframex.com/')
  lines.push('      - LatencyMon: https://www.resplendence.com/latencymon')
  lines.push('      - RTSS: https://www.guru3d.com/download/rtss-rivatuner-statistics-server-download/')
  lines.push('#>')
  lines.push('')

  const riskProfile = calculateRiskProfile(selected)
  const restorePointRequired = hasNonSafeOptimizations(selected)

  const config = {
    generated: timestamp,
    build: __BUILD_COMMIT__,
    risk_profile: riskProfile,
    restore_point_required: restorePointRequired,
    hardware: {
      cpu: hardware.cpu,
      gpu: hardware.gpu,
      peripherals: hardware.peripherals,
      monitorSoftware: hardware.monitorSoftware,
    },
    optimizations,
    packages: allPackagesArray,
  }
  // Base64 encode config to prevent injection from apostrophes in CPU/GPU names
  const configJson = JSON.stringify(config)
  const base64Config = btoa(unescape(encodeURIComponent(configJson)))
  lines.push(
    `$Config = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("${base64Config}")) | ConvertFrom-Json`,
  )
  lines.push('')

  lines.push(HELPER_FUNCTIONS.trim())
  lines.push('')

  // Add timer tool code if enabled
  if (includeTimer) {
    lines.push(TIMER_TOOL_CODE.trim())
    lines.push('')
    lines.push(...generateLaunchMenu())
  }

  let stepCount = 0
  stepCount++ // Pre-flight scan
  if (selected.has('restore_point')) stepCount++
  stepCount++ // Upgrades
  if (allPackagesArray.length > 0) stepCount++
  stepCount++ // Completion

  // When timer is included, wrap optimizations in a function
  if (includeTimer) {
    lines.push('# ══════════════════════════════════════════════════════════════════════════════')
    lines.push('# OPTIMIZATION FUNCTION')
    lines.push('# ══════════════════════════════════════════════════════════════════════════════')
    lines.push('')
    lines.push('function Invoke-RockTuneOptimizations {')
    lines.push('    Clear-Host')
    lines.push('    # Reset counters for fresh run (fixes 15→30→45 bug on restart)')
    lines.push('    $script:StepCount = 0')
    lines.push('    $script:SuccessCount = 0')
    lines.push('    $script:FailCount = 0')
    lines.push('    $script:WarningCount = 0')
    lines.push('    $script:ScanResults = @()')
    lines.push(`    $script:StepTotal = ${stepCount}`)
    lines.push('    Write-Banner')
    lines.push('    Write-Host ""')
    lines.push('')
  } else {
    lines.push('Clear-Host')
    lines.push(`$script:StepTotal = ${stepCount}`)
    lines.push('Write-Banner')
    lines.push('Write-Host ""')
    lines.push('')
  }

  // Indentation prefix for function body
  const indent = includeTimer ? '    ' : ''

  // Helper to add indented lines
  const addIndented = (optLines: string[]) => {
    for (const line of optLines) {
      lines.push(line ? `${indent}${line}` : '')
    }
  }

  lines.push(`${indent}$cpu = (Get-CimInstance Win32_Processor).Name`)
  lines.push(
    `${indent}$gpu = (Get-CimInstance Win32_VideoController | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1).Name`,
  )
  lines.push(
    `${indent}$ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB)`,
  )
  lines.push(`${indent}Write-Host "  CPU: $cpu" -ForegroundColor White`)
  lines.push(`${indent}Write-Host "  GPU: $gpu" -ForegroundColor White`)

  lines.push(`${indent}Write-Host "  RAM: ` + '$' + `{ram}GB" -ForegroundColor White`)
  lines.push('')

  // Pre-flight scan step - show current vs. target values
  lines.push(`${indent}Write-Step "Pre-flight Scan"`)
  const scanLines = generatePreflightScan(selected, hardware)
  addIndented(scanLines)
  lines.push('')

  if (selected.has('restore_point')) {
    lines.push(`${indent}Write-Step "Pre-flight: System Restore Point"`)
    lines.push(`${indent}$recentRestorePoint = $null`)
    lines.push(
      `${indent}try { $recentRestorePoint = Get-ComputerRestorePoint -EA Stop | Sort-Object CreationTime -Descending | Select-Object -First 1 } catch { $recentRestorePoint = $null }`,
    )
    lines.push(
      `${indent}if ($recentRestorePoint -and $recentRestorePoint.CreationTime -gt (Get-Date).AddMinutes(-1440)) {`,
    )
    lines.push(`${indent}    Write-Warn "Restore point already created within last 24 hours (skipped)"`)
    lines.push(`${indent}} else {`)
    lines.push(`${indent}    try {`)
    lines.push(
      `${indent}        Checkpoint-Computer -Description "Before RockTune" -RestorePointType MODIFY_SETTINGS -EA Stop -WarningAction SilentlyContinue`,
    )
    lines.push(`${indent}        Write-OK "Restore point created"`)
    lines.push(`${indent}    } catch {`)
    lines.push(`${indent}        Write-Warn "Could not create restore point: $($_.Exception.Message)"`)
    lines.push(`${indent}    }`)
    lines.push(`${indent}}`)
    lines.push('')
  }

  lines.push(`${indent}Write-Step "Upgrades"`)
  lines.push('')

  const systemOpts = generateSystemOpts(selected)
  if (systemOpts.length > 0) {
    lines.push(`${indent}# System`)
    addIndented(systemOpts)
    lines.push('')
  }

  const perfOpts = generatePerformanceOpts(selected, hardware)
  if (perfOpts.length > 0) {
    lines.push(`${indent}# Performance`)
    addIndented(perfOpts)
    lines.push('')
  }

  const powerOpts = generatePowerOpts(selected)
  if (powerOpts.length > 0) {
    lines.push(`${indent}# Power`)
    addIndented(powerOpts)
    lines.push('')
  }

  const networkOpts = generateNetworkOpts(selected, dnsProvider)
  if (networkOpts.length > 0) {
    lines.push(`${indent}# Network`)
    addIndented(networkOpts)
    lines.push('')
  }

  const privacyOpts = generatePrivacyOpts(selected)
  if (privacyOpts.length > 0) {
    lines.push(`${indent}# Privacy`)
    addIndented(privacyOpts)
    lines.push('')
  }

  const audioOpts = generateAudioOpts(selected)
  if (audioOpts.length > 0) {
    lines.push(`${indent}# Audio`)
    addIndented(audioOpts)
    lines.push('')
  }

  if (allPackagesArray.length > 0) {
    lines.push(`${indent}Write-Step "Arsenal (winget)"`)
    lines.push(`${indent}$wingetPath = Get-Command winget -EA SilentlyContinue`)
    lines.push(`${indent}if (-not $wingetPath) {`)
    lines.push(`${indent}    Write-Fail "winget not found. Install App Installer from Microsoft Store."`)
    lines.push(`${indent}} else {`)

    const sorted = allPackagesArray
      .map((key) => ({ key, pkg: catalog[key] }))
      .filter((entry) => entry.pkg)
      .sort((a, b) => a.pkg.name.localeCompare(b.pkg.name))

    const total = sorted.length
    lines.push(`${indent}    $totalPkgs = ${total}`)
    lines.push(`${indent}    $currentPkg = 0`)

    for (const entry of sorted) {
      const packageName = escapePsDoubleQuoted(entry.pkg.name)
      const packageId = escapePsDoubleQuoted(entry.pkg.id)
      lines.push(`${indent}    $currentPkg++`)
      lines.push(`${indent}    $pct = [math]::Round(($currentPkg / $totalPkgs) * 100)`)
      lines.push(`${indent}    Write-Progress -Activity "Installing Arsenal" -Status "${packageName}" -PercentComplete $pct -CurrentOperation "$currentPkg of $totalPkgs"`)
      lines.push(`${indent}    Write-Host "  Installing ${packageName}..." -NoNewline`)
      lines.push(
        `${indent}    $installOutput = winget install --id "${packageId}" --silent --accept-package-agreements --accept-source-agreements 2>&1`,
      )
      // Use exit codes only for reliable detection (works on non-English Windows)
      // Exit code 0 = success, -1978335189 (0x8A150019) = already installed
      lines.push(`${indent}    if ($LASTEXITCODE -eq 0) { Write-OK "" }`)
      lines.push(`${indent}    elseif ($LASTEXITCODE -eq -1978335189) { Write-OK "Already installed" }`)
      lines.push(
        `${indent}    else { Write-Fail "Exit code: $LASTEXITCODE"; $installOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray } }`,
      )
    }

    lines.push(`${indent}    Write-Progress -Activity "Installing Arsenal" -Completed`)
    lines.push(`${indent}}`)
    lines.push('')
  }

  if (missingPackages.length > 0) {
    lines.push(`${indent}# Missing software mappings:`)
    for (const missing of missingPackages) {
      lines.push(`${indent}#   - ${missing}`)
    }
    lines.push('')
  }

  lines.push(`${indent}Write-Step "Complete"`)
  lines.push(`${indent}Write-Host ""`)
  lines.push(
    `${indent}Write-Host "  ╔════════════════════════════════════════╗" -ForegroundColor White`,
  )
  lines.push(
    `${indent}Write-Host "  ║           LOADOUT SUMMARY              ║" -ForegroundColor White`,
  )
  lines.push(
    `${indent}Write-Host "  ╚════════════════════════════════════════╝" -ForegroundColor White`,
  )
  lines.push(`${indent}Write-Host ""`)
  lines.push(`${indent}Write-Host "  Applied:  $($script:SuccessCount) changes" -ForegroundColor Green`)
  lines.push(
    `${indent}if ($script:WarningCount -gt 0) { Write-Host "  Warnings: $($script:WarningCount)" -ForegroundColor Yellow }`,
  )
  lines.push(
    `${indent}if ($script:FailCount -gt 0) { Write-Host "  Failed:   $($script:FailCount)" -ForegroundColor Red }`,
  )
  lines.push(`${indent}Write-Host ""`)

  // Support & website reference
  lines.push(`${indent}Write-Host "  Need help or have feedback?" -ForegroundColor White`)
  lines.push(`${indent}Write-Host "    Web:    https://rocktune.pedroferrari.com" -ForegroundColor Cyan`)
  lines.push(
    `${indent}Write-Host "    Issues: https://github.com/thepedroferrari/rocktune/issues" -ForegroundColor Cyan`,
  )
  lines.push(`${indent}Write-Host ""`)

  // Verification command
  lines.push(`${indent}Write-Host "  Verify:" -ForegroundColor DarkGray`)
  lines.push(
    `${indent}Write-Host "  Get-FileHash .\\rocktune-setup.ps1 -Algorithm SHA256" -ForegroundColor DarkGray`,
  )
  lines.push(`${indent}Write-Host "  Build: ${__BUILD_COMMIT__}" -ForegroundColor DarkGray`)
  lines.push(`${indent}Write-Host ""`)

  // Interactive key prompt with next-steps option
  lines.push(
    `${indent}Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor DarkCyan`,
  )
  lines.push(
    `${indent}Write-Host "  ║  Press [N] for next steps, or any key to exit                 ║" -ForegroundColor DarkCyan`,
  )
  lines.push(
    `${indent}Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor DarkCyan`,
  )
  lines.push(`${indent}Write-Host ""`)
  // Try/catch wrapper for non-interactive shells (CI, remote, etc.)
  lines.push(`${indent}try {`)
  lines.push(
    `${indent}    $key = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown").Character.ToString().ToUpper()`,
  )
  lines.push(`${indent}} catch {`)
  lines.push(`${indent}    # Non-interactive shell - auto-continue`)
  lines.push(`${indent}    $key = ""`)
  lines.push(`${indent}}`)
  lines.push(`${indent}if ($key -eq "N") {`)

  // Generate next steps block inline
  const nextStepsLines = generateNextStepsBlock(preset)
  for (const line of nextStepsLines) {
    lines.push(`${indent}    ${line}`)
  }

  lines.push(`${indent}}`)

  // Display reboot reasons if any
  lines.push(`${indent}if ($script:RebootRequired) {`)
  lines.push(`${indent}    Write-Host ""`)
  lines.push(
    `${indent}    Write-Host "  ╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow`,
  )
  lines.push(
    `${indent}    Write-Host "  ║  REBOOT REQUIRED for these changes to take effect:            ║" -ForegroundColor Yellow`,
  )
  lines.push(
    `${indent}    Write-Host "  ╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow`,
  )
  lines.push(`${indent}    foreach ($reason in $script:RebootReasons) {`)
  lines.push(`${indent}        Write-Host "    - $reason" -ForegroundColor Yellow`)
  lines.push(`${indent}    }`)
  lines.push(`${indent}}`)

  lines.push(`${indent}Write-Host ""`)
  lines.push(
    `${indent}Write-Host "  Reboot recommended for all changes to take effect." -ForegroundColor Cyan`,
  )
  lines.push(`${indent}Write-Host ""`)

  // Close the function if timer is included
  if (includeTimer) {
    lines.push('}')
    lines.push('')
    lines.push('# ══════════════════════════════════════════════════════════════════════════════')
    lines.push('# ENTRY POINT')
    lines.push('# ══════════════════════════════════════════════════════════════════════════════')
    lines.push('')
    lines.push('Show-RockTuneMenu')
  }

  return lines.join('\n')
}

/**
 * Generate pre-flight scan code to show current vs. target settings
 * This helps users understand what will change before applying optimizations
 */
function generatePreflightScan(
  selected: Set<string>,
  hardware: HardwareProfile,
): string[] {
  const lines: string[] = []

  lines.push('Write-ScanHeader')
  lines.push('')

  // === SYSTEM OPTIMIZATIONS ===
  if (selected.has('mouse_accel')) {
    lines.push('# Scan: Mouse acceleration')
    lines.push('$val = Get-RegValue "HKCU:\\Control Panel\\Mouse" "MouseSpeed"')
    lines.push(
      'if ($val -eq 0) { Add-ScanResult "Mouse acceleration" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Mouse acceleration" "Enabled ($val)" "Disabled (0)" "CHANGE" }',
    )
  }

  if (selected.has('keyboard_response')) {
    lines.push('# Scan: Keyboard response')
    lines.push('$delay = Get-RegValue "HKCU:\\Control Panel\\Keyboard" "KeyboardDelay"')
    lines.push(
      'if ($delay -eq 0) { Add-ScanResult "Keyboard delay" "0 (fastest)" "0" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Keyboard delay" "$delay" "0 (fastest)" "CHANGE" }',
    )
  }

  if (selected.has('fastboot')) {
    lines.push('# Scan: Fast startup')
    lines.push(
      '$val = Get-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" "HiberbootEnabled"',
    )
    lines.push(
      'if ($val -eq 0) { Add-ScanResult "Fast startup" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Fast startup" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('end_task')) {
    lines.push('# Scan: End Task in taskbar')
    lines.push(
      '$val = Get-RegValue "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" "TaskbarEndTask"',
    )
    lines.push(
      'if ($val -eq 1) { Add-ScanResult "End Task in taskbar" "Enabled" "Enabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "End Task in taskbar" "Disabled" "Enabled" "CHANGE" }',
    )
  }

  if (selected.has('notifications_off')) {
    lines.push('# Scan: Notifications')
    lines.push(
      '$val = Get-RegValue "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications" "ToastEnabled"',
    )
    lines.push(
      'if ($val -eq 0) { Add-ScanResult "Notifications" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Notifications" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('storage_sense')) {
    lines.push('# Scan: Storage Sense')
    lines.push(
      '$val = Get-RegValue "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" "01"',
    )
    lines.push(
      'if ($val -eq 0) { Add-ScanResult "Storage Sense" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Storage Sense" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('input_buffer')) {
    lines.push('# Scan: Input buffer size')
    lines.push(
      '$val = Get-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\mouclass\\Parameters" "MouseDataQueueSize"',
    )
    lines.push(
      'if ($val -eq 32) { Add-ScanResult "Mouse buffer size" "32" "32" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Mouse buffer size" "$val" "32" "CHANGE" }',
    )
  }

  // === PERFORMANCE OPTIMIZATIONS ===
  if (selected.has('gamedvr')) {
    lines.push('# Scan: Game DVR')
    lines.push('$val = Get-RegValue "HKCU:\\System\\GameConfigStore" "GameDVR_Enabled"')
    lines.push(
      'if ($val -eq 0) { Add-ScanResult "Game DVR" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Game DVR" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('game_bar')) {
    lines.push('# Scan: Game Bar overlays')
    lines.push('$val = Get-RegValue "HKCU:\\Software\\Microsoft\\GameBar" "ShowStartupPanel"')
    lines.push(
      'if ($val -eq 0) { Add-ScanResult "Game Bar overlays" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Game Bar overlays" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('hags')) {
    lines.push('# Scan: HAGS')
    lines.push(
      '$val = Get-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" "HwSchMode"',
    )
    lines.push(
      'if ($val -eq 2) { Add-ScanResult "Hardware Accelerated GPU Scheduling" "Enabled" "Enabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Hardware Accelerated GPU Scheduling" "Disabled" "Enabled" "CHANGE" }',
    )
  }

  if (selected.has('fso_disable')) {
    lines.push('# Scan: Fullscreen optimizations')
    lines.push('$val = Get-RegValue "HKCU:\\System\\GameConfigStore" "GameDVR_FSEBehaviorMode"')
    lines.push(
      'if ($val -eq 2) { Add-ScanResult "Fullscreen optimizations" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Fullscreen optimizations" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('hpet')) {
    lines.push('# Scan: HPET (requires bcdedit)')
    lines.push('$hpetVal = bcdedit /enum | Select-String "useplatformclock"')
    lines.push(
      'if ($hpetVal -match "No") { Add-ScanResult "HPET" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'elseif ($hpetVal) { Add-ScanResult "HPET" "Enabled" "Disabled" "CHANGE" }',
    )
    lines.push(
      'else { Add-ScanResult "HPET" "(not set)" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('multiplane_overlay')) {
    lines.push('# Scan: Multiplane Overlay')
    lines.push('$val = Get-RegValue "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Dwm" "OverlayTestMode"')
    lines.push(
      'if ($val -eq 5) { Add-ScanResult "Multiplane Overlay" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Multiplane Overlay" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('core_isolation_off')) {
    lines.push('# Scan: Core Isolation')
    lines.push(
      '$val = Get-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" "EnableVirtualizationBasedSecurity"',
    )
    lines.push(
      'if ($val -eq 0) { Add-ScanResult "Core Isolation (VBS)" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Core Isolation (VBS)" "Enabled" "Disabled [DANGER]" "CHANGE" }',
    )
  }

  if (selected.has('spectre_meltdown_off')) {
    lines.push('# Scan: Spectre/Meltdown mitigations')
    lines.push(
      '$val = Get-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" "FeatureSettingsOverride"',
    )
    lines.push(
      'if ($val -eq 3) { Add-ScanResult "Spectre/Meltdown mitigations" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Spectre/Meltdown mitigations" "Enabled" "Disabled [DANGER]" "CHANGE" }',
    )
  }

  if (selected.has('dep_off')) {
    lines.push('# Scan: DEP')
    lines.push('$nxVal = bcdedit /enum | Select-String "nx"')
    lines.push(
      'if ($nxVal -match "AlwaysOff") { Add-ScanResult "DEP (Data Execution Prevention)" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "DEP (Data Execution Prevention)" "Enabled" "Disabled [DANGER]" "CHANGE" }',
    )
  }

  if (selected.has('native_nvme')) {
    lines.push('# Scan: Native NVMe')
    lines.push(
      '$val = Get-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Policies\\Microsoft\\FeatureManagement\\Overrides" "1176759950"',
    )
    lines.push(
      'if ($val -eq 1) { Add-ScanResult "Native NVMe I/O" "Enabled" "Enabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Native NVMe I/O" "Disabled" "Enabled" "CHANGE" }',
    )
  }

  if (selected.has('smt_disable')) {
    lines.push('# Scan: SMT (requires bcdedit)')
    lines.push('Add-ScanResult "SMT/Hyperthreading" "(current)" "Disabled" "REBOOT"')
  }

  // === POWER OPTIMIZATIONS ===
  if (selected.has('power_ultimate')) {
    lines.push('# Scan: Ultimate Power Plan')
    lines.push('$activePlan = powercfg /getactivescheme')
    lines.push(
      'if ($activePlan -match "Ultimate") { Add-ScanResult "Power Plan" "Ultimate" "Ultimate" "OK" }',
    )
    lines.push(
      'elseif ($activePlan -match "High performance") { Add-ScanResult "Power Plan" "High Performance" "Ultimate" "CHANGE" }',
    )
    lines.push(
      'else { Add-ScanResult "Power Plan" "Other" "Ultimate" "CHANGE" }',
    )
  }

  if (selected.has('usb_power')) {
    lines.push('# Scan: USB selective suspend')
    lines.push(
      '$val = Get-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB\\DisableSelectiveSuspend" "DisableSelectiveSuspend"',
    )
    lines.push(
      'if ($val -eq 1) { Add-ScanResult "USB selective suspend" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "USB selective suspend" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('pcie_power')) {
    lines.push('# Scan: PCIe ASPM')
    lines.push('Add-ScanResult "PCIe link state power management" "(check powercfg)" "Off" "CHANGE"')
  }

  // === NETWORK OPTIMIZATIONS ===
  if (selected.has('nagle')) {
    lines.push('# Scan: Nagle algorithm')
    lines.push('Add-ScanResult "Nagle algorithm" "(per-adapter)" "Disabled" "CHANGE"')
  }

  if (selected.has('throttle_index')) {
    lines.push('# Scan: Network throttling')
    lines.push(
      '$val = Get-RegValue "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" "NetworkThrottlingIndex"',
    )
    lines.push(
      'if ($val -eq 4294967295) { Add-ScanResult "Network throttling" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Network throttling" "Enabled ($val)" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('network_teredo')) {
    lines.push('# Scan: Teredo')
    lines.push('$teredoState = netsh interface teredo show state 2>$null')
    lines.push(
      'if ($teredoState -match "disabled") { Add-ScanResult "Teredo tunneling" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Teredo tunneling" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  // === PRIVACY OPTIMIZATIONS ===
  if (selected.has('ads_off')) {
    lines.push('# Scan: Windows ads')
    lines.push(
      '$val = Get-RegValue "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "SubscribedContent-338388Enabled"',
    )
    lines.push(
      'if ($val -eq 0) { Add-ScanResult "Windows advertising" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Windows advertising" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('telemetry_min')) {
    lines.push('# Scan: Telemetry level')
    lines.push(
      '$val = Get-RegValue "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" "AllowTelemetry"',
    )
    lines.push(
      'if ($val -eq 0) { Add-ScanResult "Telemetry" "Security only (0)" "Security only (0)" "OK" }',
    )
    lines.push(
      'elseif ($val -eq 1) { Add-ScanResult "Telemetry" "Basic (1)" "Security only (0)" "CHANGE" }',
    )
    lines.push(
      'else { Add-ScanResult "Telemetry" "Full ($val)" "Security only (0)" "CHANGE" }',
    )
  }

  if (selected.has('activity_off')) {
    lines.push('# Scan: Activity history')
    lines.push(
      '$val = Get-RegValue "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System" "EnableActivityFeed"',
    )
    lines.push(
      'if ($val -eq 0) { Add-ScanResult "Activity history" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Activity history" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('cortana_off')) {
    lines.push('# Scan: Cortana')
    lines.push(
      '$val = Get-RegValue "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search" "AllowCortana"',
    )
    lines.push(
      'if ($val -eq 0) { Add-ScanResult "Cortana" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Cortana" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  // === SERVICE OPTIMIZATIONS ===
  if (selected.has('services_search_off')) {
    lines.push('# Scan: Windows Search service')
    lines.push('$svc = Get-Service WSearch -EA SilentlyContinue')
    lines.push(
      'if ($svc -and $svc.StartType -eq "Manual") { Add-ScanResult "Windows Search service" "Manual" "Manual" "OK" }',
    )
    lines.push(
      'elseif ($svc) { Add-ScanResult "Windows Search service" "$($svc.StartType)" "Manual" "CHANGE" }',
    )
    lines.push('else { Add-ScanResult "Windows Search service" "Not found" "Manual" "N/A" }')
  }

  if (selected.has('services_superfetch')) {
    lines.push('# Scan: SysMain (Superfetch) service')
    lines.push('$svc = Get-Service SysMain -EA SilentlyContinue')
    lines.push(
      'if ($svc -and $svc.StartType -eq "Manual") { Add-ScanResult "SysMain (Superfetch)" "Manual" "Manual" "OK" }',
    )
    lines.push(
      'elseif ($svc) { Add-ScanResult "SysMain (Superfetch)" "$($svc.StartType)" "Manual" "CHANGE" }',
    )
    lines.push('else { Add-ScanResult "SysMain (Superfetch)" "Not found" "Manual" "N/A" }')
  }

  if (selected.has('services_xbox_off')) {
    lines.push('# Scan: Xbox services')
    lines.push('$xblAuth = Get-Service XblAuthManager -EA SilentlyContinue')
    lines.push(
      'if ($xblAuth -and $xblAuth.StartType -eq "Disabled") { Add-ScanResult "Xbox services" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'elseif ($xblAuth) { Add-ScanResult "Xbox services" "$($xblAuth.StartType)" "Disabled" "CHANGE" }',
    )
    lines.push('else { Add-ScanResult "Xbox services" "Not found" "Disabled" "N/A" }')
  }

  // === AUDIO OPTIMIZATIONS ===
  if (selected.has('audio_enhancements')) {
    lines.push('# Scan: Audio enhancements (registry)')
    lines.push('$val = Get-RegValue "HKCU:\\Software\\Microsoft\\Multimedia\\Audio" "DisableAudioEnhancements"')
    lines.push(
      'if ($val -eq 1) { Add-ScanResult "Audio enhancements (global)" "Disabled" "Disabled" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Audio enhancements (global)" "Enabled" "Disabled" "CHANGE" }',
    )
  }

  if (selected.has('audio_exclusive')) {
    lines.push('# Scan: Exclusive mode priority')
    lines.push('$val = Get-RegValue "HKCU:\\Software\\Microsoft\\Multimedia\\Audio" "ExclusiveModeLatency"')
    lines.push(
      'if ($val -eq 1) { Add-ScanResult "Exclusive mode priority" "Low latency" "Low latency" "OK" }',
    )
    lines.push(
      'else { Add-ScanResult "Exclusive mode priority" "Normal" "Low latency" "CHANGE" }',
    )
  }

  // === FALLBACK: Show all selected optimizations that don't have explicit scan checks ===
  // This ensures users see ALL their selected optimizations in the pre-flight table
  const SCANNED_KEYS = new Set([
    'mouse_accel',
    'keyboard_response',
    'fastboot',
    'end_task',
    'notifications_off',
    'storage_sense',
    'input_buffer',
    'gamedvr',
    'game_bar',
    'hags',
    'fso_disable',
    'hpet',
    'multiplane_overlay',
    'core_isolation_off',
    'spectre_meltdown_off',
    'dep_off',
    'native_nvme',
    'smt_disable',
    'ultimate_perf', // power_ultimate in scan
    'usb_power',
    'pcie_power',
    'nagle',
    'network_throttling', // throttle_index in scan
    'teredo_disable', // network_teredo in scan
    'privacy_tier1', // ads_off in scan
    'privacy_tier2', // telemetry_min in scan
    'services_search_off',
    'sysmain_disable', // services_superfetch in scan
    'privacy_tier3', // services_xbox_off in scan
    'audio_enhancements',
    'audio_exclusive',
  ])

  // Add fallback entries for optimizations without explicit scans
  const unscannedKeys = [...selected].filter((key) => !SCANNED_KEYS.has(key))
  if (unscannedKeys.length > 0) {
    lines.push('')
    lines.push('# === Additional selected optimizations (no pre-check available) ===')
    for (const key of unscannedKeys) {
      const opt = OPTIMIZATIONS.find((o) => o.key === key)
      if (opt) {
        const tierBadge = opt.tier.toUpperCase()
        lines.push(`Add-ScanResult "[${tierBadge}] ${opt.label}" "—" "Will apply" "PENDING"`)
      }
    }
  }

  lines.push('')
  lines.push('Write-ScanResults')
  lines.push('')
  lines.push('Write-Host ""')
  lines.push('Write-Host "  Press any key to continue with optimizations..." -ForegroundColor DarkGray')
  lines.push('$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")')
  lines.push('Write-Host ""')

  return lines
}

function generateSystemOpts(selected: Set<string>): string[] {
  const lines: string[] = []

  if (selected.has('pagefile')) {
    lines.push('# [SAFE] Configure fixed page file - reduces fragmentation')
    lines.push(
      '$ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object Capacity -Sum).Sum/1GB)',
    )
    lines.push('if ($ram -ge 16) {')
    lines.push('    $size = if ($ram -ge 32) { 4096 } else { 8192 }')
    lines.push('    $cs = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges')
    lines.push('    $cs.AutomaticManagedPagefile = $false; $cs.Put() | Out-Null')
    lines.push(
      '    $pf = Get-WmiObject -Query "Select * From Win32_PageFileSetting Where Name=\'C:\\\\pagefile.sys\'" -EA SilentlyContinue',
    )
    lines.push('    if ($pf) {')
    lines.push('        $pf.InitialSize = $size; $pf.MaximumSize = $size; $pf.Put() | Out-Null')
    lines.push('        Write-OK "Page file set to ' + '$' + '{size}MB fixed"')
    lines.push('    } else { Write-Warn "Page file setting not found" }')
    lines.push('}')
  }

  if (selected.has('mouse_accel')) {
    lines.push('# [SAFE] Disable mouse acceleration - improves aim consistency')
    lines.push(
      'if (Set-Reg "HKCU:\\Control Panel\\Mouse" "MouseSpeed" 0 -PassThru) { Write-OK "Mouse acceleration disabled" }',
    )
    lines.push('Set-Reg "HKCU:\\Control Panel\\Mouse" "MouseThreshold1" 0')
    lines.push('Set-Reg "HKCU:\\Control Panel\\Mouse" "MouseThreshold2" 0')
  }

  if (selected.has('keyboard_response')) {
    lines.push('# [SAFE] Faster keyboard response')
    lines.push(
      'if (Set-Reg "HKCU:\\Control Panel\\Keyboard" "KeyboardDelay" 0 -PassThru) { Write-OK "Keyboard delay minimized" }',
    )
    lines.push('Set-Reg "HKCU:\\Control Panel\\Keyboard" "KeyboardSpeed" 31')
  }

  if (selected.has('fastboot')) {
    lines.push('# [SAFE] Disable fast startup - ensures clean boots')
    lines.push(
      'if (Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" "HiberbootEnabled" 0 -PassThru) { Write-OK "Fast startup disabled" }',
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
      'if (Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" "TaskbarEndTask" 1 -PassThru) { Write-OK "End Task enabled in taskbar" }',
    )
  }

  if (selected.has('display_perf')) {
    lines.push('# Visual performance optimizations')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" "VisualFXSetting" 2',
    )
    lines.push('Write-OK "Visual effects set to performance"')
  }

  if (selected.has('explorer_speed')) {
    lines.push('# Disable Explorer auto folder-type detection')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Classes\\Local Settings\\Software\\Microsoft\\Windows\\Shell\\Bags\\AllFolders\\Shell" "FolderType" "NotSpecified" "String"',
    )
    lines.push('Write-OK "Explorer speed optimized"')
  }

  if (selected.has('temp_purge')) {
    lines.push('# Purge temp folders')
    lines.push('Remove-Item "$env:TEMP\\*" -Recurse -Force -EA SilentlyContinue')
    lines.push('Remove-Item "$env:WINDIR\\Temp\\*" -Recurse -Force -EA SilentlyContinue')
    lines.push('Write-OK "Temp folders purged"')
  }

  if (selected.has('storage_sense')) {
    lines.push('# Disable Storage Sense')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy" "01" 0',
    )
    lines.push('Write-OK "Storage Sense disabled"')
  }

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

  if (selected.has('ps7_telemetry')) {
    lines.push('# Disable PowerShell 7 telemetry')
    lines.push(
      '[Environment]::SetEnvironmentVariable("POWERSHELL_TELEMETRY_OPTOUT", "1", "Machine")',
    )
    lines.push('Write-OK "PS7 telemetry disabled"')
  }

  if (selected.has('accessibility_shortcuts')) {
    lines.push('# Disable accessibility shortcuts (Sticky/Filter/Toggle Keys)')
    lines.push('Set-Reg "HKCU:\\Control Panel\\Accessibility\\StickyKeys" "Flags" "506" "String"')
    lines.push(
      'Set-Reg "HKCU:\\Control Panel\\Accessibility\\Keyboard Response" "Flags" "122" "String"',
    )
    lines.push('Set-Reg "HKCU:\\Control Panel\\Accessibility\\ToggleKeys" "Flags" "58" "String"')
    lines.push('Set-Reg "HKCU:\\Control Panel\\Accessibility\\MouseKeys" "Flags" "58" "String"')
    lines.push('Write-OK "Accessibility shortcuts disabled (no more Sticky Keys popup)"')
  }

  if (selected.has('services_search_off')) {
    lines.push('# Disable Windows Search indexing')
    lines.push('Stop-Service WSearch -Force -EA SilentlyContinue')
    lines.push('Set-Service WSearch -StartupType Manual -EA SilentlyContinue')
    lines.push('Write-OK "Windows Search set to Manual (stops disk indexing)"')
  }

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

  if (selected.has('filesystem_perf')) {
    lines.push('# NTFS filesystem performance optimizations')
    lines.push('fsutil behavior set disablelastaccess 1 >$null 2>&1')
    lines.push('fsutil behavior set disable8dot3 1 >$null 2>&1')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem" "NtfsMemoryUsage" 2',
    )
    lines.push('Write-OK "Filesystem performance optimized"')
  }

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
    lines.push('# [SAFE] Disable Game DVR - 1-3% FPS improvement')
    lines.push('Set-Reg "HKCU:\\System\\GameConfigStore" "GameDVR_Enabled" 0')
    lines.push('Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" "AllowGameDVR" 0')
    lines.push('Write-OK "Game DVR disabled"')
  }

  if (selected.has('game_bar')) {
    lines.push('# [SAFE] Configure Game Bar (keep enabled for X3D, disable overlays)')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "ShowStartupPanel" 0')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "GamePanelStartupTipIndex" 3')
    lines.push('Write-OK "Game Bar overlays disabled"')
  }

  if (selected.has('hags')) {
    lines.push('# [CAUTION] Enable Hardware Accelerated GPU Scheduling - test for regressions')
    lines.push(
      'if (Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" "HwSchMode" 2 -PassThru) { Write-OK "HAGS enabled" }',
    )
  }

  if (selected.has('fso_disable')) {
    lines.push('# [CAUTION] Disable fullscreen optimizations globally')
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
    lines.push('# Download: https://github.com/thepedroferrari/rocktune/blob/master/timer-tool.ps1')
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
    lines.push(
      'Write-Host "      Download and run timer-tool.ps1 before gaming" -ForegroundColor Yellow',
    )
    lines.push(
      'Write-Host "      https://github.com/thepedroferrari/rocktune" -ForegroundColor Cyan',
    )
    lines.push('Write-Host ""')
  }

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

  if (selected.has('hpet')) {
    lines.push('# [CAUTION] Disable HPET - requires reboot, test with benchmarks')
    lines.push('$hpetResult = bcdedit /set useplatformclock false 2>&1')
    lines.push('$tickResult = bcdedit /set disabledynamictick yes 2>&1')
    lines.push('if ($LASTEXITCODE -eq 0) {')
    lines.push('    Write-OK "HPET disabled"')
    lines.push('    Add-RebootReason "HPET disabled"')
    lines.push('} else {')
    lines.push('    Write-Fail "HPET: $hpetResult"')
    lines.push('}')
  }

  if (selected.has('multiplane_overlay')) {
    lines.push('# Disable Multiplane Overlay')
    lines.push('Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Dwm" "OverlayTestMode" 5')
    lines.push('Write-OK "Multiplane Overlay disabled"')
  }

  if (selected.has('process_mitigation')) {
    lines.push('# Disable process mitigations (benchmarking)')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" "KernelShadowStacksForceDisabled" 1',
    )
    lines.push('Write-OK "Process mitigations disabled (security reduced)"')
  }

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

  if (selected.has('core_isolation_off')) {
    lines.push('# [LUDICROUS] Disable Core Isolation (VBS/HVCI) - SECURITY RISK')
    lines.push('Write-Host "  [!!] DANGER: Disabling Core Isolation" -ForegroundColor Red')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" "EnableVirtualizationBasedSecurity" 0',
    )
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard\\Scenarios\\HypervisorEnforcedCodeIntegrity" "Enabled" 0',
    )
    lines.push('Write-OK "Core Isolation disabled (SECURITY REDUCED)"')
    lines.push('Add-RebootReason "Core Isolation (VBS/HVCI) disabled"')
  }

  if (selected.has('spectre_meltdown_off')) {
    lines.push('# [LUDICROUS] Disable Spectre/Meltdown Mitigations - CRITICAL SECURITY RISK')
    lines.push('Write-Host ""')
    lines.push(
      'Write-Host "  ╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Red',
    )
    lines.push(
      'Write-Host "  ║ CRITICAL WARNING: DISABLING CPU SECURITY MITIGATIONS          ║" -ForegroundColor Red',
    )
    lines.push(
      'Write-Host "  ║ CVE-2017-5753 (Spectre V1), CVE-2017-5715 (Spectre V2)        ║" -ForegroundColor Red',
    )
    lines.push(
      'Write-Host "  ║ CVE-2017-5754 (Meltdown) - Hardware vulnerabilities           ║" -ForegroundColor Red',
    )
    lines.push(
      'Write-Host "  ║ ANY WEBSITE CAN READ YOUR PASSWORDS AFTER THIS!               ║" -ForegroundColor Red',
    )
    lines.push(
      'Write-Host "  ╚═══════════════════════════════════════════════════════════════╝" -ForegroundColor Red',
    )
    lines.push('Write-Host ""')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" "FeatureSettingsOverride" 3',
    )
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" "FeatureSettingsOverrideMask" 3',
    )
    lines.push('Write-OK "Spectre/Meltdown mitigations DISABLED"')
    lines.push('Add-RebootReason "Spectre/Meltdown mitigations disabled"')
  }

  if (selected.has('kernel_mitigations_off')) {
    lines.push('# [LUDICROUS] Disable Kernel Mitigations - CRITICAL SECURITY RISK')
    lines.push(
      'Write-Host "  [!!] DANGER: Disabling kernel exploit protections" -ForegroundColor Red',
    )
    lines.push('$r1 = bcdedit /set isolatedcontext No 2>&1')
    lines.push('$r2 = bcdedit /set allowedinmemorysettings 0x0 2>&1')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" "DisableExceptionChainValidation" 1',
    )
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" "KernelSEHOPEnabled" 0',
    )
    lines.push('Write-OK "Kernel mitigations DISABLED"')
    lines.push('Add-RebootReason "Kernel mitigations disabled"')
  }

  if (selected.has('dep_off')) {
    lines.push('# [LUDICROUS] Disable DEP (Data Execution Prevention) - CRITICAL SECURITY RISK')
    lines.push(
      'Write-Host "  [!!] DANGER: Disabling DEP - Buffer overflow exploits work again" -ForegroundColor Red',
    )
    lines.push('$depResult = bcdedit /set nx AlwaysOff 2>&1')
    lines.push('if ($LASTEXITCODE -eq 0) {')
    lines.push('    Write-OK "DEP DISABLED"')
    lines.push('    Add-RebootReason "DEP (Data Execution Prevention) disabled"')
    lines.push('} else {')
    lines.push('    Write-Fail "DEP disable failed: $depResult"')
    lines.push('}')
    lines.push('Write-Host "  [!!] Re-enable with: bcdedit /set nx OptIn" -ForegroundColor Yellow')
  }

  if (selected.has('native_nvme')) {
    lines.push('# [CAUTION] Enable Native NVMe I/O (Win11 24H2+) - requires reboot')
    lines.push('$build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber')
    lines.push('if ($build -ge 26100) {')
    lines.push(
      '    $nvmePath = "HKLM:\\SYSTEM\\CurrentControlSet\\Policies\\Microsoft\\FeatureManagement\\Overrides"',
    )
    lines.push('    if (-not (Test-Path $nvmePath)) { New-Item -Path $nvmePath -Force | Out-Null }')
    lines.push('    Set-Reg $nvmePath "1176759950" 1')
    lines.push('    Write-OK "Native NVMe enabled"')
    lines.push('    Add-RebootReason "Native NVMe I/O"')
    lines.push('} else { Write-Fail "Native NVMe requires Win11 24H2+" }')
  }

  if (selected.has('smt_disable')) {
    lines.push('# [RISKY] Disable SMT/Hyperthreading - significantly reduces multitasking')
    lines.push('$cores = (Get-CimInstance Win32_Processor).NumberOfCores')
    lines.push('$smtResult = bcdedit /set numproc $cores 2>&1')
    lines.push('if ($LASTEXITCODE -eq 0) {')
    lines.push('    Write-OK "SMT disabled (cores limited to $cores)"')
    lines.push('    Add-RebootReason "SMT/Hyperthreading disabled"')
    lines.push('} else {')
    lines.push('    Write-Fail "SMT disable failed: $smtResult"')
    lines.push('}')
  }

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

  if (selected.has('game_mode')) {
    lines.push('# Enable Game Mode')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "AllowAutoGameMode" 1')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\GameBar" "AutoGameModeEnabled" 1')
    lines.push('Write-OK "Game Mode enabled"')
  }

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

  if (selected.has('sysmain_disable')) {
    lines.push('# Disable SysMain (Superfetch)')
    lines.push('Stop-Service SysMain -Force -EA SilentlyContinue')
    lines.push('Set-Service SysMain -StartupType Disabled -EA SilentlyContinue')
    lines.push('Write-OK "SysMain/Superfetch disabled"')
  }

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
    lines.push('powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 >$null 2>&1')
    lines.push('$planOutput = powercfg /list 2>&1')
    lines.push('$plans = $planOutput | Select-String "Ultimate Performance"')
    lines.push('if ($plans) {')
    lines.push('    $guidMatch = [regex]::Match($plans.Line, "([A-Fa-f0-9-]{36})")')
    lines.push('    if ($guidMatch.Success) {')
    lines.push('        $guid = $guidMatch.Value')
    lines.push('        powercfg /setactive $guid 2>&1 | Out-Null')
    lines.push(
      '        if ($LASTEXITCODE -eq 0) { Write-OK "Ultimate Performance enabled" } else { Write-Warn "Could not activate Ultimate Performance" }',
    )
    lines.push('    } else { Write-Warn "Could not parse Ultimate Performance GUID" }')
    lines.push('} else { Write-Warn "Ultimate Performance plan not available" }')
  } else if (selected.has('power_plan')) {
    lines.push('# Set High Performance power plan')
    lines.push('powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>&1 | Out-Null')
    lines.push(
      'if ($LASTEXITCODE -eq 0) { Write-OK "High Performance power plan enabled" } else { Write-Warn "High Performance plan not available" }',
    )
  }

  if (selected.has('usb_power') || selected.has('usb_suspend')) {
    lines.push('# Disable USB selective suspend')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\USB\\DisableSelectiveSuspend" "DisableSelectiveSuspend" 1',
    )
    lines.push('Write-OK "USB selective suspend disabled"')
  }

  if (selected.has('pcie_power')) {
    lines.push('# Disable PCIe link state power management')
    lines.push(
      'powercfg /setacvalueindex scheme_current sub_pciexpress ee12f906-d166-476a-8f3a-af931b6e9d31 0 2>&1 | Out-Null',
    )
    lines.push('if ($LASTEXITCODE -eq 0) {')
    lines.push('    powercfg /setactive scheme_current 2>&1 | Out-Null')
    lines.push('    Write-OK "PCIe power saving disabled"')
    lines.push('} else { Write-Warn "PCIe power setting not supported" }')
  }

  if (selected.has('core_parking')) {
    lines.push('# Disable Core Parking')
    lines.push(
      'powercfg /setacvalueindex scheme_current sub_processor CPMINCORES 100 2>&1 | Out-Null',
    )
    lines.push('if ($LASTEXITCODE -eq 0) {')
    lines.push('    powercfg /setactive scheme_current 2>&1 | Out-Null')
    lines.push('    Write-OK "Core parking disabled"')
    lines.push('} else { Write-Warn "Core parking setting not supported" }')
  }

  if (selected.has('min_processor_state')) {
    lines.push('# Set minimum processor state to 5%')
    lines.push(
      'powercfg /setacvalueindex scheme_current sub_processor PROCTHROTTLEMIN 5 2>&1 | Out-Null',
    )
    lines.push('if ($LASTEXITCODE -eq 0) {')
    lines.push('    powercfg /setactive scheme_current 2>&1 | Out-Null')
    lines.push('    Write-OK "Min processor state set to 5%"')
    lines.push('} else { Write-Warn "Min processor state setting not supported" }')
  }

  if (selected.has('hibernation_disable')) {
    lines.push('# Disable Hibernation')
    lines.push('powercfg /hibernate off 2>&1 | Out-Null')
    lines.push(
      'if ($LASTEXITCODE -eq 0) { Write-OK "Hibernation disabled" } else { Write-Warn "Could not disable hibernation" }',
    )
  }

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
    const dnsLabel = escapePsDoubleQuoted(dnsProvider)
    lines.push(`# Set DNS to ${dnsLabel}`)
    lines.push(
      `Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Set-DnsClientServerAddress -ServerAddresses "${primary}","${secondary}"`,
    )
    lines.push(`Write-OK "DNS set to ${dnsLabel} (${primary}, ${secondary})"`)
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

  if (selected.has('qos_gaming')) {
    lines.push('# Configure QoS for gaming')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Psched" "NonBestEffortLimit" 0',
    )
    lines.push('Write-OK "QoS gaming configured"')
  }

  if (selected.has('ipv4_prefer')) {
    lines.push('# Prefer IPv4 over IPv6')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters" "DisabledComponents" 32',
    )
    lines.push('Write-OK "IPv4 preferred over IPv6"')
  }

  if (selected.has('teredo_disable')) {
    lines.push('# [RISKY] Disable Teredo - may break Xbox Party Chat')
    lines.push('$teredoResult = netsh interface teredo set state disabled 2>&1')
    lines.push('if ($LASTEXITCODE -eq 0) { Write-OK "Teredo disabled" }')
    lines.push('else { Write-Fail "Teredo: $teredoResult" }')
  }

  if (selected.has('rss_enable')) {
    lines.push('# [SAFE] Enable Receive Side Scaling')
    lines.push('$rssCount = 0')
    lines.push('Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {')
    lines.push('    try { Enable-NetAdapterRss -Name $_.Name -EA Stop; $rssCount++ } catch { }')
    lines.push('}')
    lines.push('if ($rssCount -gt 0) { Write-OK "RSS enabled on $rssCount adapter(s)" }')
    lines.push('else { Write-Warn "RSS: No adapters supported or already enabled" }')
  }

  if (selected.has('rsc_disable')) {
    lines.push('# [CAUTION] Disable Receive Segment Coalescing - may increase CPU usage')
    lines.push('$rscCount = 0')
    lines.push('Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {')
    lines.push('    try { Disable-NetAdapterRsc -Name $_.Name -EA Stop; $rscCount++ } catch { }')
    lines.push('}')
    lines.push('if ($rscCount -gt 0) { Write-OK "RSC disabled on $rscCount adapter(s)" }')
    lines.push('else { Write-Warn "RSC: No adapters supported or already disabled" }')
  }

  if (selected.has('adapter_power')) {
    lines.push('# [SAFE] Disable network adapter power saving')
    lines.push('$adapterCount = 0')
    lines.push('Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {')
    lines.push('    try {')
    lines.push(
      '        Set-NetAdapterPowerManagement -Name $_.Name -WakeOnMagicPacket Disabled -WakeOnPattern Disabled -EA Stop',
    )
    lines.push('        $adapterCount++')
    lines.push('    } catch { }')
    lines.push('}')
    lines.push('if ($adapterCount -gt 0) { Write-OK "Power saving disabled on $adapterCount adapter(s)" }')
    lines.push('else { Write-Warn "Adapter power: No changes applied" }')
  }

  return lines
}

function generatePrivacyOpts(selected: Set<string>): string[] {
  const lines: string[] = []

  if (selected.has('privacy_tier1')) {
    lines.push('# [SAFE] Privacy Tier 1 - ads and personalization')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" "DisabledByGroupPolicy" 1',
    )
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" "Enabled" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" "DisableTailoredExperiencesWithDiagnosticData" 1',
    )
    lines.push('Write-OK "Advertising ID and tailored experiences disabled"')
  }

  if (selected.has('privacy_tier2')) {
    lines.push('# [CAUTION] Privacy Tier 2 - telemetry and tracking')
    lines.push('')
    lines.push('# Disable telemetry scheduled tasks')
    lines.push('$telemetryTasks = @(')
    lines.push('    "Microsoft\\Windows\\Autochk\\Proxy",')
    lines.push(
      '    "Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator",',
    )
    lines.push(
      '    "Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip",',
    )
    lines.push(
      '    "Microsoft\\Windows\\DiskDiagnostic\\Microsoft-Windows-DiskDiagnosticDataCollector",',
    )
    lines.push('    "Microsoft\\Windows\\Feedback\\Siuf\\DmClient",')
    lines.push('    "Microsoft\\Windows\\Feedback\\Siuf\\DmClientOnScenarioDownload",')
    lines.push('    "Microsoft\\Windows\\Windows Error Reporting\\QueueReporting",')
    lines.push('    "Microsoft\\Windows\\Application Experience\\MareBackup",')
    lines.push('    "Microsoft\\Windows\\Application Experience\\StartupAppTask",')
    lines.push('    "Microsoft\\Windows\\Application Experience\\PcaPatchDbTask"')
    lines.push(')')
    lines.push('foreach ($task in $telemetryTasks) { Disable-Task $task }')
    lines.push('')
    lines.push('# AllowTelemetry at both policy paths')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" "AllowTelemetry" 0',
    )
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" "AllowTelemetry" 0',
    )
    lines.push('')
    lines.push('# ContentDeliveryManager (content suggestions, pre-installed apps)')
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "ContentDeliveryAllowed" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "OemPreInstalledAppsEnabled" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "PreInstalledAppsEnabled" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "PreInstalledAppsEverEnabled" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "SilentInstalledAppsEnabled" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "SubscribedContent-338387Enabled" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "SubscribedContent-338388Enabled" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "SubscribedContent-338389Enabled" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "SubscribedContent-353698Enabled" 0',
    )
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" "SystemPaneSuggestionsEnabled" 0',
    )
    lines.push('')
    lines.push('# Feedback, advertising, error reporting')
    lines.push('Set-Reg "HKCU:\\SOFTWARE\\Microsoft\\Siuf\\Rules" "NumberOfSIUFInPeriod" 0')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" "DoNotShowFeedbackNotifications" 1',
    )
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent" "DisableTailoredExperiencesWithDiagnosticData" 1',
    )
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo" "DisabledByGroupPolicy" 1',
    )
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" "Disabled" 1',
    )
    lines.push('')
    lines.push('# Delivery Optimization P2P at both paths')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization\\Config" "DODownloadMode" 0',
    )
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DeliveryOptimization" "DODownloadMode" 0',
    )
    lines.push('')
    lines.push('# Disable start menu tracking')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" "Start_TrackProgs" 0',
    )
    lines.push('')
    lines.push('Write-OK "Telemetry minimized (tasks + registry)"')
  }

  if (selected.has('background_apps')) {
    lines.push('# [SAFE] Disable background apps')
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" "GlobalUserDisabled" 1',
    )
    lines.push('Write-OK "Background apps disabled"')
  }

  if (selected.has('copilot_disable')) {
    lines.push('# [CAUTION] Disable Copilot (registry + AppX removal)')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" "TurnOffWindowsCopilot" 1',
    )
    lines.push(
      'Set-Reg "HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" "TurnOffWindowsCopilot" 1',
    )
    lines.push(
      'Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" "ShowCopilotButton" 0',
    )
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Shell\\Copilot" "IsCopilotAvailable" 0',
    )
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Shell\\Copilot" "CopilotDisabledReason" "IsEnabledForGeographicRegionFailed" "String"',
    )
    lines.push(
      'Set-Reg "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsCopilot" "AllowCopilotRuntime" 0',
    )
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Shell Extensions\\Blocked" "{CB3B0003-8088-4EDE-8769-8B354AB2FF8C}" "" "String"',
    )
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Shell\\Copilot\\BingChat" "IsUserEligible" 0',
    )
    lines.push(
      'Get-AppxPackage -AllUsers *Copilot* -EA SilentlyContinue | Remove-AppxPackage -AllUsers -EA SilentlyContinue',
    )
    lines.push(
      'Get-AppxPackage -AllUsers Microsoft.MicrosoftOfficeHub -EA SilentlyContinue | Remove-AppxPackage -AllUsers -EA SilentlyContinue',
    )
    lines.push('Write-OK "Copilot disabled and removed"')
  }

  if (selected.has('bloatware')) {
    lines.push('# [CAUTION] Remove bloatware apps')
    lines.push(
      '$bloatApps = @("Microsoft.BingNews", "Microsoft.GetHelp", "Microsoft.Getstarted", "Microsoft.MicrosoftSolitaireCollection", "Microsoft.People", "Microsoft.PowerAutomateDesktop", "Microsoft.Todos", "Microsoft.WindowsAlarms", "Microsoft.WindowsFeedbackHub", "Microsoft.WindowsMaps", "Microsoft.WindowsSoundRecorder", "Microsoft.YourPhone", "Microsoft.ZuneMusic", "Microsoft.ZuneVideo", "Clipchamp.Clipchamp", "Microsoft.549981C3F5F10", "*Copilot*", "Microsoft.Windows.Ai.Copilot.Provider", "Microsoft.MicrosoftOfficeHub")',
    )
    lines.push('$removedCount = 0')
    lines.push('foreach ($app in $bloatApps) {')
    lines.push('    $pkg = Get-AppxPackage -Name $app -AllUsers -EA SilentlyContinue')
    lines.push('    if ($pkg) { $pkg | Remove-AppxPackage -AllUsers -EA SilentlyContinue; $removedCount++ }')
    lines.push('}')
    lines.push('Write-OK "Bloatware: $removedCount apps removed"')
  }

  if (selected.has('privacy_tier3')) {
    lines.push('# [RISKY] Privacy Tier 3 - BREAKS Game Pass and Xbox apps')
    lines.push('Write-Warn "This will break Game Pass and Xbox services!"')
    lines.push('$xboxSvc = @("XblAuthManager","XblGameSave","XboxGipSvc","XboxNetApiSvc")')
    lines.push(
      'foreach ($s in $xboxSvc) { Stop-Service $s -Force -EA SilentlyContinue; Set-Service $s -StartupType Disabled -EA SilentlyContinue }',
    )
    lines.push('Write-OK "Xbox services disabled"')
  }

  if (selected.has('edge_debloat')) {
    lines.push('# Edge debloat')
    lines.push('Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge" "HideFirstRunExperience" 1')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge" "EdgeShoppingAssistantEnabled" 0',
    )
    lines.push('Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge" "WebWidgetAllowed" 0')
    lines.push('Write-OK "Edge debloated"')
  }

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

  if (selected.has('wpbt_disable')) {
    lines.push('# Disable WPBT')
    lines.push(
      'Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager" "DisableWpbtExecution" 1',
    )
    lines.push('Write-OK "WPBT disabled (blocks OEM bloatware)"')
  }

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

  if (selected.has('disk_cleanup')) {
    lines.push('# Deep disk cleanup')
    lines.push(
      'Start-Process "cleanmgr.exe" -ArgumentList "/sagerun:100" -Wait -WindowStyle Hidden',
    )
    lines.push('Write-OK "Disk cleanup complete"')
  }

  if (selected.has('delivery_opt')) {
    lines.push('# Disable Delivery Optimization P2P')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization\\Config" "DODownloadMode" 0',
    )
    lines.push('Write-OK "Delivery Optimization P2P disabled"')
  }

  if (selected.has('wer_disable')) {
    lines.push('# Disable Windows Error Reporting')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Windows Error Reporting" "Disabled" 1',
    )
    lines.push('Stop-Service WerSvc -Force -EA SilentlyContinue')
    lines.push('Set-Service WerSvc -StartupType Disabled -EA SilentlyContinue')
    lines.push('Write-OK "Windows Error Reporting disabled"')
  }

  if (selected.has('wifi_sense')) {
    lines.push('# Disable WiFi Sense')
    lines.push(
      'Set-Reg "HKLM:\\SOFTWARE\\Microsoft\\WcmSvc\\wifinetworkmanager\\config" "AutoConnectAllowedOEM" 0',
    )
    lines.push('Write-OK "WiFi Sense disabled"')
  }

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

  if (selected.has('feedback_disable')) {
    lines.push('# Disable Windows Feedback prompts')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\Siuf\\Rules" "NumberOfSIUFInPeriod" 0')
    lines.push('Write-OK "Windows Feedback prompts disabled"')
  }

  if (selected.has('clipboard_sync')) {
    lines.push('# Disable Cloud Clipboard sync')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\Clipboard" "EnableClipboardHistory" 0')
    lines.push('Write-OK "Cloud Clipboard sync disabled"')
  }

  return lines
}

function generateAudioOpts(selected: Set<string>): string[] {
  const lines: string[] = []

  if (selected.has('audio_enhancements')) {
    lines.push('# Disable audio enhancements')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\Multimedia\\Audio" "UserDuckingPreference" 3')
    lines.push('Write-OK "Audio ducking disabled"')
  }

  if (selected.has('audio_exclusive')) {
    lines.push('# Configure audio exclusive mode (disable system sounds)')
    lines.push('Set-Reg "HKCU:\\AppEvents\\Schemes" "(Default)" ".None" "String"')
    lines.push('Write-OK "System sounds disabled for exclusive mode"')
  }

  if (selected.has('audio_communications')) {
    lines.push('# Disable volume ducking during communications')
    lines.push('Set-Reg "HKCU:\\Software\\Microsoft\\Multimedia\\Audio" "UserDuckingPreference" 3')
    lines.push('Write-OK "Volume ducking disabled (full volume during calls)"')
  }

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

$script:Banner = ${VERIFICATION_BANNER.trim()}

function Write-Banner { Write-Host $script:Banner -ForegroundColor Cyan }
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

  lines.push('<#')
  lines.push('.SYNOPSIS')
  lines.push(`    RockTune Verification Script - Generated ${timestamp}`)
  lines.push('.DESCRIPTION')
  lines.push('    Checks if the optimizations from your RockTune loadout were applied.')
  lines.push('    Run this script to verify your system state.')
  lines.push('#>')
  lines.push('')

  lines.push(VERIFICATION_HELPERS.trim())
  lines.push('')

  lines.push('Clear-Host')
  lines.push('Write-Banner')
  lines.push('Write-Host ""')
  lines.push('')

  lines.push('Write-Section "System Settings"')

  if (selected.has('mouse_accel')) {
    lines.push(
      'if (Test-RegValue "HKCU:\\Control Panel\\Mouse" "MouseSpeed" 0) { Write-Pass "Mouse acceleration disabled" } else { Write-Fail "Mouse acceleration NOT disabled" }',
    )
  }

  if (selected.has('keyboard_response')) {
    lines.push(
      'if (Test-RegValue "HKCU:\\Control Panel\\Keyboard" "KeyboardDelay" 0) { Write-Pass "Keyboard delay minimized" } else { Write-Fail "Keyboard delay NOT minimized" }',
    )
  }

  if (selected.has('fastboot')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" "HiberbootEnabled" 0) { Write-Pass "Fast startup disabled" } else { Write-Fail "Fast startup NOT disabled" }',
    )
  }

  if (selected.has('end_task')) {
    lines.push(
      'if (Test-RegValue "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings" "TaskbarEndTask" 1) { Write-Pass "End Task enabled in taskbar" } else { Write-Fail "End Task NOT enabled" }',
    )
  }

  if (selected.has('notifications_off')) {
    lines.push(
      'if (Test-RegValue "HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer" "DisableNotificationCenter" 1) { Write-Pass "Notifications disabled" } else { Write-Fail "Notifications NOT disabled" }',
    )
  }

  lines.push('')
  lines.push('Write-Section "Performance Settings"')

  if (selected.has('gamedvr')) {
    lines.push(
      'if (Test-RegValue "HKCU:\\System\\GameConfigStore" "GameDVR_Enabled" 0) { Write-Pass "Game DVR disabled" } else { Write-Fail "Game DVR NOT disabled" }',
    )
  }

  if (selected.has('hags')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers" "HwSchMode" 2) { Write-Pass "HAGS enabled" } else { Write-Fail "HAGS NOT enabled" }',
    )
  }

  if (selected.has('fso_disable')) {
    lines.push(
      'if (Test-RegValue "HKCU:\\System\\GameConfigStore" "GameDVR_FSEBehaviorMode" 2) { Write-Pass "Fullscreen optimizations disabled" } else { Write-Fail "Fullscreen optimizations NOT disabled" }',
    )
  }

  if (selected.has('game_mode')) {
    lines.push(
      'if (Test-RegValue "HKCU:\\Software\\Microsoft\\GameBar" "AutoGameModeEnabled" 1) { Write-Pass "Game Mode enabled" } else { Write-Fail "Game Mode NOT enabled" }',
    )
  }

  if (selected.has('mmcss_gaming')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile\\Tasks\\Games" "GPU Priority" 8) { Write-Pass "MMCSS gaming priority configured" } else { Write-Fail "MMCSS gaming NOT configured" }',
    )
  }

  if (selected.has('scheduler_opt')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" "Win32PrioritySeparation" 26) { Write-Pass "Scheduler optimized for gaming" } else { Write-Fail "Scheduler NOT optimized" }',
    )
  }

  if (selected.has('timer_registry')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\kernel" "GlobalTimerResolutionRequests" 1) { Write-Pass "Timer resolution registry configured" } else { Write-Fail "Timer resolution registry NOT configured" }',
    )
  }

  if (selected.has('memory_gaming')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" "DisablePagingExecutive" 1) { Write-Pass "Memory gaming mode enabled" } else { Write-Fail "Memory gaming mode NOT enabled" }',
    )
  }

  if (selected.has('hpet')) {
    lines.push('$bcdedit = bcdedit /enum 2>&1 | Out-String')
    lines.push(
      'if ($bcdedit -match "useplatformclock\\s+No" -or $bcdedit -notmatch "useplatformclock") { Write-Pass "HPET disabled" } else { Write-Fail "HPET may still be enabled" }',
    )
  }

  if (selected.has('smt_disable')) {
    lines.push('$bcdeditSmt = bcdedit /enum 2>&1 | Out-String')
    lines.push('$cores = (Get-CimInstance Win32_Processor).NumberOfCores')
    lines.push(
      'if ($bcdeditSmt -match "numproc\\s+$cores") { Write-Pass "SMT disabled (limited to $cores cores)" } else { Write-Fail "SMT may not be disabled" }',
    )
  }

  if (selected.has('core_isolation_off')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\DeviceGuard" "EnableVirtualizationBasedSecurity" 0) { Write-Pass "Core Isolation disabled" } else { Write-Fail "Core Isolation may still be enabled" }',
    )
  }

  if (selected.has('spectre_meltdown_off')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management" "FeatureSettingsOverride" 3) { Write-Pass "Spectre/Meltdown mitigations disabled" } else { Write-Fail "Spectre/Meltdown mitigations may still be enabled" }',
    )
  }

  if (selected.has('sysmain_disable')) {
    lines.push('$sysMain = Get-Service SysMain -EA SilentlyContinue')
    lines.push(
      'if ($sysMain -and $sysMain.Status -eq "Stopped") { Write-Pass "SysMain/Superfetch disabled" } else { Write-Fail "SysMain may still be running" }',
    )
  }

  if (selected.has('multiplane_overlay')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SOFTWARE\\Microsoft\\Windows\\Dwm" "OverlayTestMode" 5) { Write-Pass "Multiplane Overlay disabled" } else { Write-Fail "Multiplane Overlay NOT disabled" }',
    )
  }

  lines.push('')
  lines.push('Write-Section "Power Settings"')

  if (selected.has('ultimate_perf') || selected.has('power_plan')) {
    lines.push('$plan = powercfg /getactivescheme')
    lines.push(
      'if ($plan -match "Ultimate Performance|High performance") { Write-Pass "High/Ultimate performance plan active" } else { Write-Fail "Performance power plan NOT active" }',
    )
  }

  if (selected.has('hibernation_disable')) {
    lines.push('$hibPath = "$env:SystemDrive\\hiberfil.sys"')
    lines.push(
      'if (-not (Test-Path $hibPath)) { Write-Pass "Hibernation disabled" } else { Write-Fail "Hibernation file still exists" }',
    )
  }

  if (selected.has('power_throttle_off')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling" "PowerThrottlingOff" 1) { Write-Pass "Power throttling disabled" } else { Write-Fail "Power throttling NOT disabled" }',
    )
  }

  lines.push('')
  lines.push('Write-Section "Network Settings"')

  if (selected.has('nagle') || selected.has('tcp_optimizer')) {
    lines.push(
      '$adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1',
    )
    lines.push('if ($adapter) {')
    lines.push(
      '    $path = "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces\\$($adapter.InterfaceGuid)"',
    )
    lines.push(
      '    if (Test-RegValue $path "TcpAckFrequency" 1) { Write-Pass "Nagle algorithm disabled on $($adapter.Name)" } else { Write-Fail "Nagle algorithm NOT disabled" }',
    )
    lines.push('} else { Write-Skip "No active network adapter found" }')
  }

  if (selected.has('network_throttling')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile" "NetworkThrottlingIndex" 0xffffffff) { Write-Pass "Network throttling disabled" } else { Write-Fail "Network throttling NOT disabled" }',
    )
  }

  lines.push('')
  lines.push('Write-Section "Privacy Settings"')

  if (selected.has('privacy_tier1')) {
    lines.push(
      'if (Test-RegValue "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" "Enabled" 0) { Write-Pass "Advertising ID disabled" } else { Write-Fail "Advertising ID NOT disabled" }',
    )
  }

  if (selected.has('privacy_tier2')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" "AllowTelemetry" 0) { Write-Pass "Telemetry minimized" } else { Write-Fail "Telemetry NOT minimized" }',
    )
  }

  if (selected.has('background_apps')) {
    lines.push(
      'if (Test-RegValue "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" "GlobalUserDisabled" 1) { Write-Pass "Background apps disabled" } else { Write-Fail "Background apps NOT disabled" }',
    )
  }

  if (selected.has('copilot_disable')) {
    lines.push(
      'if (Test-RegValue "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" "TurnOffWindowsCopilot" 1) { Write-Pass "Copilot disabled" } else { Write-Fail "Copilot NOT disabled" }',
    )
  }

  if (selected.has('audio_enhancements') || selected.has('audio_communications')) {
    lines.push('')
    lines.push('Write-Section "Audio Settings"')
    lines.push(
      'if (Test-RegValue "HKCU:\\Software\\Microsoft\\Multimedia\\Audio" "UserDuckingPreference" 3) { Write-Pass "Audio ducking disabled" } else { Write-Fail "Audio ducking NOT disabled" }',
    )
  }

  lines.push('')
  lines.push('Write-Host ""')
  lines.push('Write-Host "  ╔════════════════════════════════════════╗" -ForegroundColor White')
  lines.push('Write-Host "  ║         VERIFICATION SUMMARY           ║" -ForegroundColor White')
  lines.push('Write-Host "  ╚════════════════════════════════════════╝" -ForegroundColor White')
  lines.push('Write-Host ""')
  lines.push('$total = $script:PassCount + $script:FailCount')
  lines.push('Write-Host "  Passed:  $($script:PassCount)/$total" -ForegroundColor Green')
  lines.push(
    'if ($script:FailCount -gt 0) { Write-Host "  Failed:  $($script:FailCount)" -ForegroundColor Red }',
  )
  lines.push(
    'if ($script:SkipCount -gt 0) { Write-Host "  Skipped: $($script:SkipCount)" -ForegroundColor DarkGray }',
  )
  lines.push('Write-Host ""')
  lines.push(
    'if ($script:FailCount -eq 0) { Write-Host "  All optimizations verified!" -ForegroundColor Green }',
  )
  lines.push(
    'else { Write-Host "  Some optimizations may need to be re-applied or require reboot." -ForegroundColor Yellow }',
  )
  lines.push('Write-Host ""')

  return lines.join('\n')
}
