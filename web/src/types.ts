// =============================================================================
// BRANDED TYPES - Nominal typing for better type safety
// =============================================================================

declare const __brand: unique symbol
type Brand<T, B> = T & { readonly [__brand]: B }

export type PackageKey = Brand<string, 'PackageKey'>
export type WingetId = Brand<string, 'WingetId'>

export function asPackageKey(key: string): PackageKey {
  return key as PackageKey
}

export function asWingetId(id: string): WingetId {
  return id as WingetId
}

// =============================================================================
// CATEGORY SYSTEM - Single source of truth
// =============================================================================

export const CATEGORIES = [
  'launcher',
  'gaming',
  'streaming',
  'monitoring',
  'browser',
  'media',
  'utility',
  'rgb',
  'dev',
  'runtime',
  'benchmark',
] as const

export type Category = (typeof CATEGORIES)[number]

export function isCategory(value: unknown): value is Category {
  return typeof value === 'string' && CATEGORIES.includes(value as Category)
}

// =============================================================================
// SOFTWARE PACKAGE - With strict typing
// =============================================================================

export interface SoftwarePackage {
  readonly id: WingetId
  readonly name: string
  readonly category: Category
  readonly icon?: string
  readonly emoji?: string
  readonly desc?: string
  readonly selected?: boolean
}

export type SoftwareCatalog = Readonly<Record<PackageKey, SoftwarePackage>>

export function isPackageKey(catalog: SoftwareCatalog, key: string): key is PackageKey {
  return key in catalog
}

// =============================================================================
// HARDWARE TYPES - Discriminated by vendor
// =============================================================================

export const CPU_TYPES = {
  AMD_X3D: 'amd_x3d',
  AMD: 'amd',
  INTEL: 'intel',
} as const satisfies Record<string, string>

export type CpuType = (typeof CPU_TYPES)[keyof typeof CPU_TYPES]

export const GPU_TYPES = {
  NVIDIA: 'nvidia',
  AMD: 'amd',
  INTEL: 'intel',
} as const satisfies Record<string, string>

export type GpuType = (typeof GPU_TYPES)[keyof typeof GPU_TYPES]

export const PERIPHERAL_TYPES = {
  LOGITECH: 'logitech',
  RAZER: 'razer',
  CORSAIR: 'corsair',
  STEELSERIES: 'steelseries',
  ASUS: 'asus',
  WOOTING: 'wooting',
} as const satisfies Record<string, string>

export type PeripheralType = (typeof PERIPHERAL_TYPES)[keyof typeof PERIPHERAL_TYPES]

export const MONITOR_SOFTWARE_TYPES = {
  DELL: 'dell',
  LG: 'lg',
  HP: 'hp',
} as const satisfies Record<string, string>

export type MonitorSoftwareType = (typeof MONITOR_SOFTWARE_TYPES)[keyof typeof MONITOR_SOFTWARE_TYPES]

export interface HardwareProfile {
  readonly cpu: CpuType
  readonly gpu: GpuType
  readonly peripherals: readonly PeripheralType[]
  readonly monitorSoftware: readonly MonitorSoftwareType[]
}

// Type guards for hardware
export function isCpuType(value: unknown): value is CpuType {
  return typeof value === 'string' && Object.values(CPU_TYPES).includes(value as CpuType)
}

export function isGpuType(value: unknown): value is GpuType {
  return typeof value === 'string' && Object.values(GPU_TYPES).includes(value as GpuType)
}

export function isPeripheralType(value: unknown): value is PeripheralType {
  return (
    typeof value === 'string' && Object.values(PERIPHERAL_TYPES).includes(value as PeripheralType)
  )
}

export function isMonitorSoftwareType(value: unknown): value is MonitorSoftwareType {
  return (
    typeof value === 'string' &&
    Object.values(MONITOR_SOFTWARE_TYPES).includes(value as MonitorSoftwareType)
  )
}

// =============================================================================
// VIEW & FILTER - Const objects with derived types
// =============================================================================

export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
} as const satisfies Record<string, string>

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES]

export const FILTER_ALL = 'all' as const
export type FilterValue = Category | typeof FILTER_ALL

export function isFilterAll(filter: FilterValue): filter is typeof FILTER_ALL {
  return filter === FILTER_ALL
}

// =============================================================================
// OPTIMIZATION SYSTEM - Grouped by risk tier
// =============================================================================

export const OPTIMIZATION_TIERS = {
  SAFE: 'safe',
  CAUTION: 'caution',
  RISKY: 'risky',
} as const

export type OptimizationTier = (typeof OPTIMIZATION_TIERS)[keyof typeof OPTIMIZATION_TIERS]

// Safe tier optimizations (low risk, high impact)
const SAFE_OPTIMIZATIONS = {
  PAGEFILE: 'pagefile',
  FASTBOOT: 'fastboot',
  TIMER: 'timer',
  POWER_PLAN: 'power_plan',
  USB_POWER: 'usb_power',
  PCIE_POWER: 'pcie_power',
  DNS: 'dns',
  NAGLE: 'nagle',
  AUDIO_ENHANCEMENTS: 'audio_enhancements',
  // PRD: New high-impact safe optimizations
  GAMEDVR: 'gamedvr', // Score 8: Remove capture overhead
  BACKGROUND_APPS: 'background_apps', // Score 6: Stop Store apps waking
  EDGE_DEBLOAT: 'edge_debloat', // Score 5: Reduce Edge background tasks
  COPILOT_DISABLE: 'copilot_disable', // Score 6: Remove Copilot hooks
  EXPLORER_SPEED: 'explorer_speed', // Score 5: Disable folder type auto-detect
  TEMP_PURGE: 'temp_purge', // Score 5: Delete temp files
  RAZER_BLOCK: 'razer_block', // Score 5: Block OEM WPBT auto-installs
} as const

// Caution tier optimizations (test before/after)
const CAUTION_OPTIMIZATIONS = {
  MSI_MODE: 'msi_mode',
  HPET: 'hpet',
  GAME_BAR: 'game_bar',
  HAGS: 'hags',
  // PRD: New caution-level optimizations
  FSO_DISABLE: 'fso_disable', // Score 6: May affect HDR/color mgmt
  ULTIMATE_PERF: 'ultimate_perf', // Score 7: High idle power/thermals
  SERVICES_TRIM: 'services_trim', // Score 5: Set non-critical to manual
  DISK_CLEANUP: 'disk_cleanup', // Score 5: Run cleanup/ResetBase
} as const

// Risky tier optimizations (may break features)
const RISKY_OPTIMIZATIONS = {
  PRIVACY_TIER1: 'privacy_tier1',
  PRIVACY_TIER2: 'privacy_tier2',
  PRIVACY_TIER3: 'privacy_tier3',
  BLOATWARE: 'bloatware',
  // PRD: New risky optimizations
  IPV4_PREFER: 'ipv4_prefer', // Score 5: May break IPv6/Xbox
  TEREDO_DISABLE: 'teredo_disable', // Score 5: May break Xbox Live
} as const

export const OPTIMIZATION_KEYS = {
  ...SAFE_OPTIMIZATIONS,
  ...CAUTION_OPTIMIZATIONS,
  ...RISKY_OPTIMIZATIONS,
} as const

export type OptimizationKey = (typeof OPTIMIZATION_KEYS)[keyof typeof OPTIMIZATION_KEYS]

export type SafeOptimization = (typeof SAFE_OPTIMIZATIONS)[keyof typeof SAFE_OPTIMIZATIONS]
export type CautionOptimization = (typeof CAUTION_OPTIMIZATIONS)[keyof typeof CAUTION_OPTIMIZATIONS]
export type RiskyOptimization = (typeof RISKY_OPTIMIZATIONS)[keyof typeof RISKY_OPTIMIZATIONS]

export function getOptimizationTier(key: OptimizationKey): OptimizationTier {
  if (Object.values(SAFE_OPTIMIZATIONS).includes(key as SafeOptimization)) {
    return OPTIMIZATION_TIERS.SAFE
  }
  if (Object.values(CAUTION_OPTIMIZATIONS).includes(key as CautionOptimization)) {
    return OPTIMIZATION_TIERS.CAUTION
  }
  return OPTIMIZATION_TIERS.RISKY
}

export function isOptimizationKey(value: unknown): value is OptimizationKey {
  return (
    typeof value === 'string' && Object.values(OPTIMIZATION_KEYS).includes(value as OptimizationKey)
  )
}

// =============================================================================
// APP STATE - Immutable by default
// =============================================================================

export interface AppState {
  readonly software: SoftwareCatalog
  readonly selectedSoftware: ReadonlySet<PackageKey>
  readonly currentFilter: FilterValue
  readonly searchTerm: string
  readonly currentView: ViewMode
}

// Mutable version for internal store use
export interface MutableAppState {
  software: Record<string, SoftwarePackage>
  selectedSoftware: Set<string>
  currentFilter: FilterValue
  searchTerm: string
  currentView: ViewMode
}

// =============================================================================
// PRESET SYSTEM
// =============================================================================

export const PRESET_TYPES = {
  COMPETITIVE: 'competitive',
  STREAMING: 'streaming',
  BALANCED: 'balanced',
  MINIMAL: 'minimal',
} as const satisfies Record<string, string>

export type PresetType = (typeof PRESET_TYPES)[keyof typeof PRESET_TYPES]

export interface Preset {
  readonly name: PresetType
  readonly hardware: Partial<HardwareProfile>
  readonly optimizations: readonly OptimizationKey[]
  readonly software: readonly PackageKey[]
}

// =============================================================================
// PROFILE SAVE/LOAD
// =============================================================================

export const PROFILE_VERSION = '1.0' as const

export interface SavedProfile {
  readonly version: typeof PROFILE_VERSION
  readonly created: string
  readonly hardware: HardwareProfile
  readonly optimizations: readonly string[]
  readonly software: readonly string[]
}

// =============================================================================
// SCRIPT GENERATION
// =============================================================================

export const SCRIPT_FILENAME = 'rocktune-setup.ps1' as const
export const GUIDE_FILENAME = 'POST-SETUP-GUIDE.html' as const

export interface ScriptConfig {
  readonly generated: string
  readonly hardware: HardwareProfile
  readonly optimizations: readonly OptimizationKey[]
  readonly packages: readonly WingetId[]
}

// =============================================================================
// UI CONSTANTS
// =============================================================================

export const CATEGORY_ICONS = {
  launcher: '🎮',
  gaming: '🎯',
  streaming: '📺',
  monitoring: '📊',
  browser: '🌐',
  media: '🎵',
  utility: '🔧',
  rgb: '💡',
  dev: '💻',
  runtime: '⚙️',
  benchmark: '📈',
  default: '📦',
} as const satisfies Record<Category | 'default', string>

export const CATEGORY_SVG_ICONS = {
  launcher:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>',
  gaming:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4m8 0h.01m2-2h.01"/></svg>',
  streaming:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 12a9 9 0 0 1 8 8"/><path d="M2 16a5 5 0 0 1 4 4"/><circle cx="2" cy="20" r="1"/></svg>',
  monitoring:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  browser:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  media:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
  utility:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  rgb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>',
  dev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  runtime:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3m6-3v3M9 20v3m6-3v3M20 9h3m-3 6h3M1 9h3m-3 6h3"/></svg>',
  benchmark:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20v-6m6 6v-4m-12 4V10m12-6 2 2-2 2m-4-2h4M6 6H2m4 0 2 2M6 6l2-2"/></svg>',
  default:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>',
} as const satisfies Record<Category | 'default', string>

export const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org' as const

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T

export type Prettify<T> = { [K in keyof T]: T[K] } & {}
