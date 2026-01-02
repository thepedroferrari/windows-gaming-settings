/**
 * Shareable Build URL Encoding/Decoding
 *
 * Compresses build state into URL-safe strings for sharing.
 * Uses stable ID registry for backward compatibility.
 *
 * URL format: site.com/#b={version}.{compressed_data}
 * Example: rocktune.pedroferrari.com/#b=1.eJxLTc7PLShKLS5RBABJtQPi
 */

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type {
  CpuType,
  DnsProviderType,
  GpuType,
  MonitorSoftwareType,
  OptimizationKey,
  PackageKey,
  PeripheralType,
  PresetType,
} from './types'
import {
  isCpuType,
  isGpuType,
  isMonitorSoftwareType,
  isOptimizationKey,
  isPeripheralType,
  isPresetType,
  OPTIMIZATION_KEYS,
} from './types'
import {
  CPU_ID_TO_VALUE,
  CPU_VALUE_TO_ID,
  DNS_ID_TO_VALUE,
  DNS_VALUE_TO_ID,
  GPU_ID_TO_VALUE,
  GPU_VALUE_TO_ID,
  MONITOR_ID_TO_VALUE,
  MONITOR_VALUE_TO_ID,
  OPT_ID_TO_VALUE,
  OPT_VALUE_TO_ID,
  PERIPHERAL_ID_TO_VALUE,
  PERIPHERAL_VALUE_TO_ID,
  PRESET_ID_TO_VALUE,
  PRESET_VALUE_TO_ID,
  SHARE_SCHEMA_VERSION,
} from './share-registry'

/**
 * Compressed share data format (short keys for minimal URL size)
 */
interface ShareDataV1 {
  v: 1 // Schema version
  c?: number // CPU ID
  g?: number // GPU ID
  d?: number // DNS provider ID
  p?: number[] // Peripheral IDs
  m?: number[] // Monitor software IDs
  o?: number[] // Optimization IDs
  s?: string[] // Package keys (strings, not IDs)
  r?: number // Preset ID
}

type ShareData = ShareDataV1

/**
 * Safety limits to prevent DoS from malicious URLs
 */
const MAX_ARRAY_LENGTH = 100
const URL_LENGTH_WARNING_THRESHOLD = 2000

/**
 * LUDICROUS optimization keys - blocked from sharing
 * These bypass the consent flow and could harm users who click shared links.
 * Recipients must enable LUDICROUS mode themselves through the proper consent flow.
 */
const BLOCKED_SHARE_KEYS: Set<string> = new Set([
  OPTIMIZATION_KEYS.SPECTRE_MELTDOWN_OFF,
  OPTIMIZATION_KEYS.CORE_ISOLATION_OFF,
  OPTIMIZATION_KEYS.KERNEL_MITIGATIONS_OFF,
  OPTIMIZATION_KEYS.DEP_OFF,
])

/**
 * Filter out LUDICROUS optimizations that would bypass consent flow
 * @param optimizations - Array of optimization keys to filter
 * @returns Object with safe optimizations and count of blocked ones
 */
function filterBlockedOptimizations(
  optimizations: readonly OptimizationKey[]
): { safe: OptimizationKey[]; blockedCount: number } {
  const safe: OptimizationKey[] = []
  let blockedCount = 0
  for (const opt of optimizations) {
    if (BLOCKED_SHARE_KEYS.has(opt)) {
      blockedCount++
    } else {
      safe.push(opt)
    }
  }
  return { safe, blockedCount }
}

/**
 * Decoded build state (human-readable)
 */
export interface DecodedBuild {
  cpu?: CpuType
  gpu?: GpuType
  dnsProvider?: DnsProviderType
  peripherals: PeripheralType[]
  monitorSoftware: MonitorSoftwareType[]
  optimizations: OptimizationKey[]
  packages: PackageKey[]
  preset?: PresetType
  /** Number of settings that were skipped (deprecated/unknown) */
  skippedCount: number
  /** Human-readable warnings about skipped settings */
  warnings: string[]
}

/**
 * Result of decoding a share URL
 */
export type DecodeResult =
  | { success: true; build: DecodedBuild }
  | { success: false; error: string }

/**
 * Build state to encode (from app state)
 */
export interface BuildToEncode {
  cpu: CpuType
  gpu: GpuType
  dnsProvider: DnsProviderType
  peripherals: PeripheralType[]
  monitorSoftware: MonitorSoftwareType[]
  optimizations: OptimizationKey[]
  packages: PackageKey[]
  preset?: PresetType
}

/**
 * Result of encoding with metadata
 */
export interface EncodeResult {
  hash: string
  url: string
  /** True if URL exceeds safe length for some browsers/services */
  urlTooLong: boolean
  /** URL length in characters */
  urlLength: number
  /** Number of LUDICROUS optimizations excluded from share for security */
  blockedCount: number
}

/**
 * Encode build state into a shareable URL hash
 *
 * @param build - Current build state
 * @returns URL hash string (without the #) e.g., "b=1.eJx..."
 */
export function encodeShareURL(build: BuildToEncode): string {
  const data: ShareDataV1 = {
    v: SHARE_SCHEMA_VERSION,
  }

  // Only include non-default values to minimize URL size
  if (build.cpu) {
    data.c = CPU_VALUE_TO_ID[build.cpu]
  }
  if (build.gpu) {
    data.g = GPU_VALUE_TO_ID[build.gpu]
  }
  if (build.dnsProvider) {
    data.d = DNS_VALUE_TO_ID[build.dnsProvider]
  }
  if (build.peripherals.length > 0) {
    data.p = build.peripherals.map((p) => PERIPHERAL_VALUE_TO_ID[p])
  }
  if (build.monitorSoftware.length > 0) {
    data.m = build.monitorSoftware.map((m) => MONITOR_VALUE_TO_ID[m])
  }
  if (build.optimizations.length > 0) {
    // Filter out LUDICROUS optimizations - they bypass consent flow
    const { safe } = filterBlockedOptimizations(build.optimizations)
    if (safe.length > 0) {
      data.o = safe.map((o) => OPT_VALUE_TO_ID[o]).filter((id) => id !== undefined)
    }
  }
  // Packages use string keys (more resilient to catalog changes)
  if (build.packages.length > 0) {
    data.s = [...build.packages]
  }
  if (build.preset) {
    data.r = PRESET_VALUE_TO_ID[build.preset]
  }

  const json = JSON.stringify(data)
  const compressed = compressToEncodedURIComponent(json)

  return `b=${SHARE_SCHEMA_VERSION}.${compressed}`
}

/**
 * Decode a share URL hash into build state
 *
 * @param hash - URL hash (with or without #, with or without b= prefix)
 * @returns Decoded build or error
 */
export function decodeShareURL(hash: string): DecodeResult {
  try {
    // Clean up the hash
    let cleanHash = hash
    if (cleanHash.startsWith('#')) {
      cleanHash = cleanHash.slice(1)
    }
    if (cleanHash.startsWith('b=')) {
      cleanHash = cleanHash.slice(2)
    }

    // Parse version and data
    const dotIndex = cleanHash.indexOf('.')
    if (dotIndex === -1) {
      return { success: false, error: 'Invalid URL format: missing version separator' }
    }

    const version = Number.parseInt(cleanHash.slice(0, dotIndex), 10)
    const compressed = cleanHash.slice(dotIndex + 1)

    if (Number.isNaN(version) || version < 1) {
      return { success: false, error: 'Invalid URL format: invalid version' }
    }

    // Decompress
    const json = decompressFromEncodedURIComponent(compressed)
    if (!json) {
      return { success: false, error: 'Could not decompress URL data' }
    }

    // Parse JSON
    let data: ShareData
    try {
      data = JSON.parse(json) as ShareData
    } catch {
      return { success: false, error: 'Invalid URL data format' }
    }

    // Route to version-specific decoder
    if (data.v === 1) {
      return decodeV1(data)
    }

    // Future versions: try to decode as best we can
    // For now, fail gracefully
    return {
      success: false,
      error: `URL version ${data.v} is not supported. Please update RockTune.`,
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return { success: false, error: `Failed to decode URL: ${message}` }
  }
}

/**
 * Safely slice an array to max length (DoS prevention)
 */
function safeSlice<T>(arr: T[] | undefined, max: number): T[] {
  if (!arr) return []
  return arr.slice(0, max)
}

/**
 * Decode version 1 share data
 */
function decodeV1(data: ShareDataV1): DecodeResult {
  const warnings: string[] = []
  let skippedCount = 0

  const build: DecodedBuild = {
    peripherals: [],
    monitorSoftware: [],
    optimizations: [],
    packages: [],
    skippedCount: 0,
    warnings: [],
  }

  // Decode CPU
  if (data.c !== undefined) {
    const cpu = CPU_ID_TO_VALUE[data.c]
    if (cpu && isCpuType(cpu)) {
      build.cpu = cpu
    } else {
      skippedCount++
      warnings.push(`Unknown CPU setting (ID: ${data.c})`)
    }
  }

  // Decode GPU
  if (data.g !== undefined) {
    const gpu = GPU_ID_TO_VALUE[data.g]
    if (gpu && isGpuType(gpu)) {
      build.gpu = gpu
    } else {
      skippedCount++
      warnings.push(`Unknown GPU setting (ID: ${data.g})`)
    }
  }

  // Decode DNS
  if (data.d !== undefined) {
    const dns = DNS_ID_TO_VALUE[data.d]
    if (dns) {
      build.dnsProvider = dns
    } else {
      skippedCount++
      warnings.push(`Unknown DNS provider (ID: ${data.d})`)
    }
  }

  // Decode peripherals (with array limit)
  if (data.p) {
    const limitedPeripherals = safeSlice(data.p, MAX_ARRAY_LENGTH)
    let peripheralSkips = 0
    for (const id of limitedPeripherals) {
      const peripheral = PERIPHERAL_ID_TO_VALUE[id]
      if (peripheral && isPeripheralType(peripheral)) {
        build.peripherals.push(peripheral)
      } else {
        peripheralSkips++
        skippedCount++
      }
    }
    if (peripheralSkips > 0) {
      warnings.push(`${peripheralSkips} peripheral(s) no longer available`)
    }
  }

  // Decode monitor software (with array limit)
  if (data.m) {
    const limitedMonitors = safeSlice(data.m, MAX_ARRAY_LENGTH)
    let monitorSkips = 0
    for (const id of limitedMonitors) {
      const monitor = MONITOR_ID_TO_VALUE[id]
      if (monitor && isMonitorSoftwareType(monitor)) {
        build.monitorSoftware.push(monitor)
      } else {
        monitorSkips++
        skippedCount++
      }
    }
    if (monitorSkips > 0) {
      warnings.push(`${monitorSkips} monitor software no longer available`)
    }
  }

  // Decode optimizations (with array limit)
  if (data.o) {
    const limitedOpts = safeSlice(data.o, MAX_ARRAY_LENGTH)
    let optSkips = 0
    for (const id of limitedOpts) {
      const opt = OPT_ID_TO_VALUE[id]
      if (opt && isOptimizationKey(opt)) {
        build.optimizations.push(opt)
      } else {
        optSkips++
        skippedCount++
      }
    }
    if (optSkips > 0) {
      warnings.push(`${optSkips} optimization(s) no longer available`)
    }

    // Defense in depth: Filter out LUDICROUS optimizations that bypass consent
    const { safe: safeOpts, blockedCount: ludicrousBlocked } = filterBlockedOptimizations(
      build.optimizations
    )
    build.optimizations = safeOpts
    if (ludicrousBlocked > 0) {
      skippedCount += ludicrousBlocked
      warnings.push(`${ludicrousBlocked} dangerous optimization(s) removed for security`)
    }
  }

  // Decode packages (with array limit, strings validated against catalog later)
  if (data.s) {
    build.packages = safeSlice(data.s, MAX_ARRAY_LENGTH) as PackageKey[]
  }

  // Decode preset
  if (data.r !== undefined) {
    const preset = PRESET_ID_TO_VALUE[data.r]
    if (preset && isPresetType(preset)) {
      build.preset = preset
    } else {
      skippedCount++
      warnings.push(`Unknown preset (ID: ${data.r})`)
    }
  }

  build.skippedCount = skippedCount
  build.warnings = warnings

  return { success: true, build }
}

/**
 * Check if current URL has a share hash
 */
export function hasShareHash(): boolean {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash
  return hash.startsWith('#b=')
}

/**
 * Get share hash from current URL
 */
export function getShareHash(): string | null {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash
  if (!hash.startsWith('#b=')) return null
  return hash
}

/**
 * Clear the share hash from URL (after loading)
 */
export function clearShareHash(): void {
  if (typeof window === 'undefined') return
  // Use replaceState to avoid adding to history
  const url = new URL(window.location.href)
  url.hash = ''
  window.history.replaceState(null, '', url.toString())
}

/**
 * Generate full shareable URL from build state
 * @returns Just the URL string (for backward compatibility)
 */
export function getFullShareURL(build: BuildToEncode): string {
  return getFullShareURLWithMeta(build).url
}

/**
 * Generate full shareable URL with metadata about length and blocked items
 * @returns EncodeResult with URL, length warnings, and blocked count
 */
export function getFullShareURLWithMeta(build: BuildToEncode): EncodeResult {
  // Check how many LUDICROUS optimizations will be excluded
  const { blockedCount } = filterBlockedOptimizations(build.optimizations)

  const hash = encodeShareURL(build)
  // In production, use the actual domain
  const baseURL =
    typeof window !== 'undefined' ? window.location.origin : 'https://rocktune.pedroferrari.com'
  const url = `${baseURL}/#${hash}`

  return {
    hash,
    url,
    urlLength: url.length,
    urlTooLong: url.length > URL_LENGTH_WARNING_THRESHOLD,
    blockedCount,
  }
}

/**
 * Validate packages against a catalog and return valid/invalid counts
 * @param packages - Package keys to validate
 * @param catalogKeys - Set of valid package keys from catalog
 * @returns Object with valid packages and count of invalid ones
 */
export function validatePackages(
  packages: readonly PackageKey[],
  catalogKeys: Set<string>
): { valid: PackageKey[]; invalidCount: number } {
  const valid: PackageKey[] = []
  let invalidCount = 0

  for (const pkg of packages) {
    if (catalogKeys.has(pkg)) {
      valid.push(pkg)
    } else {
      invalidCount++
    }
  }

  return { valid, invalidCount }
}

/**
 * Generate text summary of a build for sharing on forums/Reddit
 */
export function generateTextSummary(build: BuildToEncode): string {
  const lines: string[] = ['RockTune Build', '─'.repeat(40)]

  if (build.cpu || build.gpu) {
    const hw = [build.cpu?.toUpperCase(), build.gpu?.toUpperCase()].filter(Boolean).join(' + ')
    lines.push(`Hardware: ${hw}`)
  }

  if (build.dnsProvider) {
    lines.push(`DNS: ${build.dnsProvider}`)
  }

  if (build.peripherals.length > 0) {
    lines.push(`Peripherals: ${build.peripherals.join(', ')}`)
  }

  if (build.optimizations.length > 0) {
    lines.push(`Optimizations: ${build.optimizations.length} enabled`)
  }

  if (build.packages.length > 0) {
    lines.push(`Software: ${build.packages.length} packages`)
  }

  lines.push('')
  lines.push(`Import: ${getFullShareURL(build)}`)

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact URL Encoding for PowerShell One-Liner
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Encode build state into compact query parameters for PowerShell one-liner
 *
 * Format: c=1&g=1&d=1&o=1,2,3&s=steam,discord&p=1,2&m=1
 *
 * This format can be parsed natively by PowerShell without LZ-string decompression.
 * LUDICROUS optimizations are filtered out for security.
 *
 * @param build - Current build state
 * @returns Query string (without leading ?)
 */
export function encodeCompactURL(build: BuildToEncode): string {
  const params = new URLSearchParams()

  // Hardware profile
  if (build.cpu) {
    params.set('c', String(CPU_VALUE_TO_ID[build.cpu]))
  }
  if (build.gpu) {
    params.set('g', String(GPU_VALUE_TO_ID[build.gpu]))
  }
  if (build.dnsProvider) {
    params.set('d', String(DNS_VALUE_TO_ID[build.dnsProvider]))
  }

  // Peripherals (comma-separated IDs)
  if (build.peripherals.length > 0) {
    const ids = build.peripherals.map((p) => PERIPHERAL_VALUE_TO_ID[p]).filter(Boolean)
    if (ids.length > 0) {
      params.set('p', ids.join(','))
    }
  }

  // Monitor software (comma-separated IDs)
  if (build.monitorSoftware.length > 0) {
    const ids = build.monitorSoftware.map((m) => MONITOR_VALUE_TO_ID[m]).filter(Boolean)
    if (ids.length > 0) {
      params.set('m', ids.join(','))
    }
  }

  // Optimizations (comma-separated IDs, LUDICROUS filtered)
  if (build.optimizations.length > 0) {
    const { safe } = filterBlockedOptimizations(build.optimizations)
    if (safe.length > 0) {
      const ids = safe.map((o) => OPT_VALUE_TO_ID[o]).filter((id) => id !== undefined)
      if (ids.length > 0) {
        params.set('o', ids.join(','))
      }
    }
  }

  // Packages (comma-separated keys - strings, not IDs)
  if (build.packages.length > 0) {
    params.set('s', build.packages.join(','))
  }

  return params.toString()
}

/**
 * Result of generating a one-liner command
 */
export interface OneLinerResult {
  /** Full PowerShell command: irm "url" | iex */
  command: string
  /** Just the URL portion */
  url: string
  /** URL length in characters */
  urlLength: number
  /** True if URL exceeds safe length */
  urlTooLong: boolean
  /** Number of LUDICROUS optimizations excluded */
  blockedCount: number
}

/**
 * Generate PowerShell one-liner command for direct execution
 *
 * @example
 * irm "https://rocktune.pedroferrari.com/run.ps1?c=1&g=1&o=1,2,10" | iex
 *
 * @param build - Current build state
 * @returns OneLinerResult with command and metadata
 */
export function getOneLinerWithMeta(build: BuildToEncode): OneLinerResult {
  const { blockedCount } = filterBlockedOptimizations(build.optimizations)
  const queryString = encodeCompactURL(build)

  // Build URL
  const baseURL =
    typeof window !== 'undefined' ? window.location.origin : 'https://rocktune.pedroferrari.com'
  const url = queryString ? `${baseURL}/run.ps1?${queryString}` : `${baseURL}/run.ps1`

  // Build command
  const command = `irm "${url}" | iex`

  return {
    command,
    url,
    urlLength: url.length,
    urlTooLong: url.length > URL_LENGTH_WARNING_THRESHOLD,
    blockedCount,
  }
}

/**
 * Generate PowerShell one-liner command (simple version)
 *
 * @param build - Current build state
 * @returns PowerShell command string
 */
export function getOneLinerCommand(build: BuildToEncode): string {
  return getOneLinerWithMeta(build).command
}
