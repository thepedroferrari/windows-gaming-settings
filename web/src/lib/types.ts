declare const __brand: unique symbol
type Brand<T, B> = T & { readonly [__brand]: B }

/** Unique identifier for a software package in the catalog */
export type PackageKey = Brand<string, 'PackageKey'>
/** Winget package identifier (e.g., "Valve.Steam") */
export type WingetId = Brand<string, 'WingetId'>
/** Branded ID for requestAnimationFrame handles - prevents mixing with timeouts */
export type AnimationFrameId = Brand<number, 'AnimationFrameId'>
/** Branded ID for setTimeout/setInterval handles */
export type TimeoutId = Brand<number, 'TimeoutId'>
/** Branded ID for event listener cleanup tracking */
export type ListenerId = Brand<symbol, 'ListenerId'>
/** Branded type for HTML element IDs */
export type HtmlId = Brand<string, 'HtmlId'>
/** Branded type for CSS class names */
export type CssClassName = Brand<string, 'CssClassName'>
/** Branded type for preset identifiers */
export type PresetId = Brand<string, 'PresetId'>
/** Positive integer type (for counts, indices, etc.) */
export type PositiveInt = Brand<number, 'PositiveInt'>
/** Non-empty string type */
export type NonEmptyString = Brand<string, 'NonEmptyString'>

/** CSS variable name type: --variable-name */
export type CssVarName = `--${string}`

/** CSS variable reference: var(--variable-name) */
export type CssVarRef<T extends CssVarName = CssVarName> = `var(${T})`

/** Data attribute selector: [data-*] */
export type DataSelector = `[data-${string}]`

/** ID selector: #id */
export type IdSelector = `#${string}`

/** Class selector: .class */
export type ClassSelector = `.${string}`

/** Any valid CSS selector */
export type CssSelector = IdSelector | ClassSelector | DataSelector | keyof HTMLElementTagNameMap

/** Custom event names for RockTune app */
export type AppEventName =
  | 'script-change-request'
  | 'software-selection-changed'
  | 'preset-applied'
  | 'filter-changed'
  | 'search-changed'

/** ISO date string type */
export type ISODateString = `${number}-${number}-${number}T${number}:${number}:${number}${string}`

/** Make specific keys required */
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

/** Make specific keys optional */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/** Extract keys of T that are of type U */
export type KeysOfType<T, U> = { [K in keyof T]: T[K] extends U ? K : never }[keyof T]

/** Strict extract - only exact matches */
export type StrictExtract<T, U extends T> = Extract<T, U>

/** Non-nullable version of a type */
export type Defined<T> = Exclude<T, null | undefined>

/** Make all properties mutable (remove readonly) */
export type Mutable<T> = { -readonly [K in keyof T]: T[K] }

/** Flatten intersection types for better IDE display */
export type Flatten<T> = { [K in keyof T]: T[K] } & {}

/** Get the value type of a Record/Map */
export type ValueOf<T> = T[keyof T]

/** Ensure exactly one property is set */
export type ExactlyOne<T, K extends keyof T = keyof T> = K extends keyof T
  ? { [P in K]: T[P] } & Partial<Record<Exclude<keyof T, K>, never>>
  : never

/** At least one property must be set */
export type AtLeastOne<T, K extends keyof T = keyof T> = Partial<T> &
  { [P in K]: Required<Pick<T, P>> }[K]

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

function isStringEnumValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.includes(value as T)
}

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

export const CPU_TYPES = {
  AMD_X3D: 'amd_x3d',
  AMD: 'amd',
  INTEL: 'intel',
} as const satisfies Record<string, string>

export type CpuType = (typeof CPU_TYPES)[keyof typeof CPU_TYPES]

const CPU_TYPE_VALUES = Object.values(CPU_TYPES) as CpuType[]

export const GPU_TYPES = {
  NVIDIA: 'nvidia',
  AMD: 'amd',
  INTEL: 'intel',
} as const satisfies Record<string, string>

export type GpuType = (typeof GPU_TYPES)[keyof typeof GPU_TYPES]

const GPU_TYPE_VALUES = Object.values(GPU_TYPES) as GpuType[]

export const DNS_PROVIDERS = {
  CLOUDFLARE: 'cloudflare',
  GOOGLE: 'google',
  QUAD9: 'quad9',
  OPENDNS: 'opendns',
  ADGUARD: 'adguard',
} as const satisfies Record<string, string>

export type DnsProviderType = (typeof DNS_PROVIDERS)[keyof typeof DNS_PROVIDERS]

const DNS_PROVIDER_VALUES = Object.values(DNS_PROVIDERS) as DnsProviderType[]

export function isDnsProviderType(value: unknown): value is DnsProviderType {
  return typeof value === 'string' && DNS_PROVIDER_VALUES.includes(value as DnsProviderType)
}

export const PERIPHERAL_TYPES = {
  LOGITECH: 'logitech',
  RAZER: 'razer',
  CORSAIR: 'corsair',
  STEELSERIES: 'steelseries',
  ASUS: 'asus',
  WOOTING: 'wooting',
} as const satisfies Record<string, string>

export type PeripheralType = (typeof PERIPHERAL_TYPES)[keyof typeof PERIPHERAL_TYPES]

const PERIPHERAL_TYPE_VALUES = Object.values(PERIPHERAL_TYPES) as PeripheralType[]

export const MONITOR_SOFTWARE_TYPES = {
  DELL: 'dell',
  LG: 'lg',
  HP: 'hp',
} as const satisfies Record<string, string>

export type MonitorSoftwareType =
  (typeof MONITOR_SOFTWARE_TYPES)[keyof typeof MONITOR_SOFTWARE_TYPES]

const MONITOR_SOFTWARE_VALUES = Object.values(MONITOR_SOFTWARE_TYPES) as MonitorSoftwareType[]

export interface HardwareProfile {
  readonly cpu: CpuType
  readonly gpu: GpuType
  readonly peripherals: readonly PeripheralType[]
  readonly monitorSoftware: readonly MonitorSoftwareType[]
}

export function isCpuType(value: unknown): value is CpuType {
  return isStringEnumValue(CPU_TYPE_VALUES, value)
}

export function isGpuType(value: unknown): value is GpuType {
  return isStringEnumValue(GPU_TYPE_VALUES, value)
}

export function isPeripheralType(value: unknown): value is PeripheralType {
  return isStringEnumValue(PERIPHERAL_TYPE_VALUES, value)
}

export function isMonitorSoftwareType(value: unknown): value is MonitorSoftwareType {
  return isStringEnumValue(MONITOR_SOFTWARE_VALUES, value)
}

export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list',
} as const satisfies Record<string, string>

export type ViewMode = (typeof VIEW_MODES)[keyof typeof VIEW_MODES]

export const FILTER_ALL = 'all' as const
export const FILTER_SELECTED = 'selected' as const
export const FILTER_RECOMMENDED = 'recommended' as const
export type FilterValue =
  | Category
  | typeof FILTER_ALL
  | typeof FILTER_SELECTED
  | typeof FILTER_RECOMMENDED

export function isFilterAll(filter: FilterValue): filter is typeof FILTER_ALL {
  return filter === FILTER_ALL
}

export function isFilterSelected(filter: FilterValue): filter is typeof FILTER_SELECTED {
  return filter === FILTER_SELECTED
}

export function isFilterRecommended(filter: FilterValue): filter is typeof FILTER_RECOMMENDED {
  return filter === FILTER_RECOMMENDED
}

export const OPTIMIZATION_TIERS = {
  SAFE: 'safe',
  CAUTION: 'caution',
  RISKY: 'risky',
} as const

export type OptimizationTier = (typeof OPTIMIZATION_TIERS)[keyof typeof OPTIMIZATION_TIERS]

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
  GAMEDVR: 'gamedvr',
  BACKGROUND_APPS: 'background_apps',
  EDGE_DEBLOAT: 'edge_debloat',
  COPILOT_DISABLE: 'copilot_disable',
  EXPLORER_SPEED: 'explorer_speed',
  TEMP_PURGE: 'temp_purge',
  RAZER_BLOCK: 'razer_block',
  RESTORE_POINT: 'restore_point',
  CLASSIC_MENU: 'classic_menu',
  STORAGE_SENSE: 'storage_sense',
  DISPLAY_PERF: 'display_perf',
  END_TASK: 'end_task',
  EXPLORER_CLEANUP: 'explorer_cleanup',
  NOTIFICATIONS_OFF: 'notifications_off',
  PS7_TELEMETRY: 'ps7_telemetry',
  MULTIPLANE_OVERLAY: 'multiplane_overlay',
  MOUSE_ACCEL: 'mouse_accel',
  USB_SUSPEND: 'usb_suspend',
  KEYBOARD_RESPONSE: 'keyboard_response',
  GAME_MODE: 'game_mode',
  MIN_PROCESSOR_STATE: 'min_processor_state',
  HIBERNATION_DISABLE: 'hibernation_disable',
  RSS_ENABLE: 'rss_enable',
  ADAPTER_POWER: 'adapter_power',
  DELIVERY_OPT: 'delivery_opt',
  WER_DISABLE: 'wer_disable',
  WIFI_SENSE: 'wifi_sense',
  SPOTLIGHT_DISABLE: 'spotlight_disable',
  FEEDBACK_DISABLE: 'feedback_disable',
  CLIPBOARD_SYNC: 'clipboard_sync',
  // New GAP 16-17 optimizations
  ACCESSIBILITY_SHORTCUTS: 'accessibility_shortcuts',
  AUDIO_COMMUNICATIONS: 'audio_communications',
  AUDIO_SYSTEM_SOUNDS: 'audio_system_sounds',
} as const

const CAUTION_OPTIMIZATIONS = {
  MSI_MODE: 'msi_mode',
  HPET: 'hpet',
  GAME_BAR: 'game_bar',
  HAGS: 'hags',
  FSO_DISABLE: 'fso_disable',
  ULTIMATE_PERF: 'ultimate_perf',
  SERVICES_TRIM: 'services_trim',
  DISK_CLEANUP: 'disk_cleanup',
  // New gaming optimizations
  WPBT_DISABLE: 'wpbt_disable',
  QOS_GAMING: 'qos_gaming',
  NETWORK_THROTTLING: 'network_throttling',
  INTERRUPT_AFFINITY: 'interrupt_affinity',
  PROCESS_MITIGATION: 'process_mitigation',
  // PS Module parity - Caution tier
  MMCSS_GAMING: 'mmcss_gaming',
  SCHEDULER_OPT: 'scheduler_opt',
  CORE_PARKING: 'core_parking',
  TIMER_REGISTRY: 'timer_registry',
  RSC_DISABLE: 'rsc_disable',
  SYSMAIN_DISABLE: 'sysmain_disable',
  // New GAP 15 - Services
  SERVICES_SEARCH_OFF: 'services_search_off',
} as const

const RISKY_OPTIMIZATIONS = {
  PRIVACY_TIER1: 'privacy_tier1',
  PRIVACY_TIER2: 'privacy_tier2',
  PRIVACY_TIER3: 'privacy_tier3',
  BLOATWARE: 'bloatware',
  IPV4_PREFER: 'ipv4_prefer',
  TEREDO_DISABLE: 'teredo_disable',
  NATIVE_NVME: 'native_nvme',
  // New experimental/risky gaming optimizations
  SMT_DISABLE: 'smt_disable',
  AUDIO_EXCLUSIVE: 'audio_exclusive',
  TCP_OPTIMIZER: 'tcp_optimizer',
  CORE_ISOLATION_OFF: 'core_isolation_off',
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

const OPTIMIZATION_KEY_VALUES = Object.values(OPTIMIZATION_KEYS) as OptimizationKey[]

export function isOptimizationKey(value: unknown): value is OptimizationKey {
  return isStringEnumValue(OPTIMIZATION_KEY_VALUES, value)
}

export interface AppState {
  readonly software: SoftwareCatalog
  readonly selectedSoftware: ReadonlySet<PackageKey>
  readonly currentFilter: FilterValue
  readonly searchTerm: string
  readonly currentView: ViewMode
}

const PRESET_TYPES = {
  BENCHMARKER: 'benchmarker',
  PRO_GAMER: 'pro_gamer',
  STREAMER: 'streamer',
  GAMER: 'gamer',
} as const satisfies Record<string, string>

export type PresetType = (typeof PRESET_TYPES)[keyof typeof PRESET_TYPES]

const PRESET_TYPE_VALUES = Object.values(PRESET_TYPES) as PresetType[]

export function isPresetType(value: unknown): value is PresetType {
  return isStringEnumValue(PRESET_TYPE_VALUES, value)
}

export interface Preset {
  readonly name: PresetType
  readonly hardware: Partial<HardwareProfile>
  readonly optimizations: readonly OptimizationKey[]
  readonly software: readonly PackageKey[]
}

export const PROFILE_VERSION = '1.0' as const

export interface SavedProfile {
  readonly version: typeof PROFILE_VERSION
  readonly created: string
  readonly hardware: HardwareProfile
  readonly optimizations: readonly string[]
  readonly software: readonly string[]
}

export const SCRIPT_FILENAME = 'rocktune-setup.ps1' as const

export interface ScriptConfig {
  readonly generated: string
  readonly hardware: HardwareProfile
  readonly optimizations: readonly OptimizationKey[]
  readonly packages: readonly WingetId[]
}

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

export type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T

export type Prettify<T> = { [K in keyof T]: T[K] } & {}
