/**
 * RockTune State - Svelte 5 Runes
 *
 * Single source of truth for app state using $state and $derived.
 * Replaces the old Store class with fine-grained reactivity.
 */

import { buildScript, type SelectionState } from './script-generator'
import type {
  AppEventName,
  CpuType,
  DnsProviderType,
  FilterValue,
  GpuType,
  HardwareProfile,
  MonitorSoftwareType,
  OptimizationKey,
  PackageKey,
  PeripheralType,
  PresetType,
  SoftwareCatalog,
  SoftwarePackage,
  ViewMode,
} from './types'
import {
  CPU_TYPES,
  DNS_PROVIDERS,
  FILTER_ALL,
  GPU_TYPES,
  isFilterAll,
  isFilterRecommended,
  isFilterSelected,
  isPackageKey,
  VIEW_MODES,
} from './types'

/** Script view mode for code viewer */
export type ScriptMode = 'current' | 'diff' | 'edit'

/** Script state for generation and preview */
export interface ScriptState {
  /** Currently generated script content */
  generated: string
  /** Previous script content (for diff) */
  previous: string
  /** User-edited script content (null if not edited) */
  edited: string | null
  /** Current view mode in code viewer */
  mode: ScriptMode
  /** Whether script has been downloaded */
  downloaded: boolean
  /** Whether user has verified the script */
  verified: boolean
}

/** UI state for modals and panels */
export interface UIState {
  /** Whether preview modal is open */
  previewModalOpen: boolean
  /** Whether audit panel is open */
  auditPanelOpen: boolean
  /** Whether wizard mode is active */
  wizardMode: boolean
  /** Whether user has acknowledged LUDICROUS tier risks */
  ludicrousAcknowledged: boolean
  /** Whether user has acknowledged disabling restore point */
  restorePointAcknowledged: boolean
}

interface AppStore {
  software: SoftwareCatalog
  selected: Set<PackageKey>
  filter: FilterValue
  search: string
  view: ViewMode
  recommendedPackages: Set<PackageKey>
  activePreset: PresetType | null
  hardware: HardwareProfile
  optimizations: Set<OptimizationKey>
  peripherals: Set<PeripheralType>
  monitorSoftware: Set<MonitorSoftwareType>
  dnsProvider: DnsProviderType
  script: ScriptState
  ui: UIState
  optimizationCount: number
}

/** Default hardware configuration */
const DEFAULT_HARDWARE: HardwareProfile = {
  cpu: CPU_TYPES.AMD_X3D,
  gpu: GPU_TYPES.NVIDIA,
  peripherals: [],
  monitorSoftware: [],
}

/** Default script state */
const DEFAULT_SCRIPT: ScriptState = {
  generated: '',
  previous: '',
  edited: null,
  mode: 'current',
  downloaded: false,
  verified: false,
}

/** Default UI state */
const DEFAULT_UI: UIState = {
  previewModalOpen: false,
  auditPanelOpen: false,
  wizardMode: false,
  ludicrousAcknowledged: false,
  restorePointAcknowledged: false,
}

const DEFAULT_CATALOG: SoftwareCatalog = {}
const DEFAULT_ACTIVE_PRESET: PresetType | null = null
const DEFAULT_FILTER: FilterValue = FILTER_ALL
const DEFAULT_VIEW: ViewMode = VIEW_MODES.GRID
const DEFAULT_DNS_PROVIDER: DnsProviderType = DNS_PROVIDERS.CLOUDFLARE

export const app: AppStore = $state({
  /** Software catalog loaded from catalog.json */
  software: DEFAULT_CATALOG,

  /** Currently selected packages */
  selected: new Set<PackageKey>(),

  /** Current filter: 'all', 'selected', 'recommended', or a category */
  filter: DEFAULT_FILTER,

  /** Search query */
  search: '',

  /** View mode: 'grid' or 'list' */
  view: DEFAULT_VIEW,

  /** Recommended packages from active preset (for 'recommended' filter) */
  recommendedPackages: new Set<PackageKey>(),

  /** Active preset selection (if any) */
  activePreset: DEFAULT_ACTIVE_PRESET,

  /** Hardware profile (CPU, GPU, peripherals) */
  hardware: { ...DEFAULT_HARDWARE },

  /** Currently enabled optimizations */
  optimizations: new Set<OptimizationKey>(),

  /** Selected peripheral brands */
  peripherals: new Set<PeripheralType>(),

  /** Selected monitor software brands */
  monitorSoftware: new Set<MonitorSoftwareType>(),

  /** DNS provider for network optimization */
  dnsProvider: DEFAULT_DNS_PROVIDER,

  /** Script generation and preview state */
  script: { ...DEFAULT_SCRIPT },

  /** UI state for modals and panels */
  ui: { ...DEFAULT_UI },

  /** Number of enabled optimizations (derived from optimizations.size) */
  optimizationCount: 0,
})

function emitAppEvent(name: AppEventName, detail: unknown): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

/** Count of selected packages */
export function getSelectedCount(): number {
  return app.selected.size
}

/** Total packages in catalog */
export function getTotalCount(): number {
  return Object.keys(app.software).length
}

/** Filtered and searched software list */
export function getFiltered(): [PackageKey, SoftwarePackage][] {
  const searchLower = app.search.toLowerCase()

  return Object.entries(app.software).filter((entry): entry is [PackageKey, SoftwarePackage] => {
    const [key, pkg] = entry
    if (!isPackageKey(app.software, key)) return false

    let matchesFilter: boolean
    if (isFilterAll(app.filter)) {
      matchesFilter = true
    } else if (isFilterSelected(app.filter)) {
      matchesFilter = app.selected.has(key)
    } else if (isFilterRecommended(app.filter)) {
      matchesFilter = app.recommendedPackages.has(key)
    } else {
      matchesFilter = pkg.category === app.filter
    }

    const matchesSearch =
      !app.search ||
      pkg.name.toLowerCase().includes(searchLower) ||
      pkg.desc?.toLowerCase().includes(searchLower) ||
      pkg.category.toLowerCase().includes(searchLower)

    return matchesFilter && matchesSearch
  })
}

/** Category counts for filter badges */
export function getCategoryCounts(): Record<string, number> {
  const packages = Object.values(app.software)
  const grouped = Object.groupBy(packages, (pkg) => pkg.category)

  const counts: Record<string, number> = { all: packages.length }
  for (const [category, pkgs] of Object.entries(grouped)) {
    counts[category] = pkgs?.length ?? 0
  }
  counts.selected = app.selected.size

  return counts
}

/**
 * Toggle a software package selection
 * Returns the new selection state
 */
export function toggleSoftware(key: PackageKey): boolean {
  const wasSelected = app.selected.has(key)

  if (wasSelected) {
    app.selected.delete(key)
  } else {
    app.selected.add(key)
  }

  app.selected = new Set(app.selected)

  emitAppEvent('software-selection-changed', { selected: Array.from(app.selected) })
  return !wasSelected
}

/**
 * Clear all selections
 */
export function clearSelection(): void {
  app.selected = new Set()
  emitAppEvent('software-selection-changed', { selected: [] })
}

/**
 * Set selection to specific keys
 */
export function setSelection(keys: readonly PackageKey[]): void {
  app.selected = new Set(keys)
  emitAppEvent('software-selection-changed', { selected: Array.from(app.selected) })
}

/**
 * Load software catalog and pre-select default packages
 */
export function setSoftware(catalog: SoftwareCatalog): void {
  app.software = catalog

  const preSelected = new Set<PackageKey>()
  for (const [key, pkg] of Object.entries(catalog)) {
    if (!isPackageKey(catalog, key)) continue
    if (pkg.selected) preSelected.add(key)
  }

  const mergedSelection = new Set<PackageKey>()
  for (const key of app.selected) {
    if (key in catalog) {
      mergedSelection.add(key)
    }
  }
  for (const key of preSelected) {
    mergedSelection.add(key)
  }

  app.selected = mergedSelection
  emitAppEvent('software-selection-changed', { selected: Array.from(app.selected) })
}

/**
 * Set the current filter
 */
export function setFilter(filter: FilterValue): void {
  app.filter = filter
}

/**
 * Set the view mode
 */
export function setView(view: ViewMode): void {
  app.view = view
}

/**
 * Set recommended packages (from active preset)
 */
export function setRecommendedPackages(keys: readonly PackageKey[]): void {
  app.recommendedPackages = new Set(keys)
}

/**
 * Clear recommended packages
 */
export function clearRecommendedPackages(): void {
  app.recommendedPackages = new Set()
}

/**
 * Set the active preset
 */
export function setActivePreset(preset: PresetType | null): void {
  app.activePreset = preset
  emitAppEvent('preset-applied', { preset })
}

/**
 * Set CPU type
 */
export function setCpu(cpu: CpuType): void {
  app.hardware = { ...app.hardware, cpu }
}

/**
 * Set GPU type
 */
export function setGpu(gpu: GpuType): void {
  app.hardware = { ...app.hardware, gpu }
}

/**
 * Set DNS provider
 */
export function setDnsProvider(provider: DnsProviderType): void {
  app.dnsProvider = provider
}

/**
 * Toggle an optimization on/off
 */
export function toggleOptimization(key: OptimizationKey): boolean {
  const wasEnabled = app.optimizations.has(key)

  if (wasEnabled) {
    app.optimizations.delete(key)
  } else {
    app.optimizations.add(key)
  }

  app.optimizations = new Set(app.optimizations)
  app.optimizationCount = app.optimizations.size
  return !wasEnabled
}

/**
 * Set specific optimizations
 */
export function setOptimizations(keys: readonly OptimizationKey[]): void {
  app.optimizations = new Set(keys)
  app.optimizationCount = app.optimizations.size
}

/**
 * Get all enabled optimizations
 */
export function getOptimizations(): OptimizationKey[] {
  return Array.from(app.optimizations)
}

/**
 * Toggle a peripheral brand on/off
 */
export function togglePeripheral(type: PeripheralType): boolean {
  const wasSelected = app.peripherals.has(type)

  if (wasSelected) {
    app.peripherals.delete(type)
  } else {
    app.peripherals.add(type)
  }

  app.peripherals = new Set(app.peripherals)
  return !wasSelected
}

/**
 * Set specific peripherals
 */
export function setPeripherals(types: readonly PeripheralType[]): void {
  app.peripherals = new Set(types)
}

/**
 * Toggle a monitor software brand on/off
 */
export function toggleMonitorSoftware(type: MonitorSoftwareType): boolean {
  const wasSelected = app.monitorSoftware.has(type)

  if (wasSelected) {
    app.monitorSoftware.delete(type)
  } else {
    app.monitorSoftware.add(type)
  }

  app.monitorSoftware = new Set(app.monitorSoftware)
  return !wasSelected
}

/**
 * Set specific monitor software
 */
export function setMonitorSoftware(types: readonly MonitorSoftwareType[]): void {
  app.monitorSoftware = new Set(types)
}

export function setScriptMode(mode: ScriptMode): void {
  app.script.mode = mode
}

/**
 * Set the user-edited script content
 */
export function setEditedScript(script: string | null): void {
  app.script.edited = script
}

/**
 * Mark script as downloaded
 */
export function setScriptDownloaded(downloaded: boolean): void {
  app.script = { ...app.script, downloaded }
}

/**
 * Mark script as verified by user
 */
export function setScriptVerified(verified: boolean): void {
  app.script = { ...app.script, verified }
}

/**
 * Open the preview modal
 */
export function openPreviewModal(): void {
  app.ui.previewModalOpen = true
}

/**
 * Close the preview modal
 */
export function closePreviewModal(): void {
  app.ui.previewModalOpen = false
}

/**
 * Toggle the audit panel
 */
export function toggleAuditPanel(): void {
  app.ui.auditPanelOpen = !app.ui.auditPanelOpen
}

/**
 * Toggle wizard mode
 */
export function toggleWizardMode(): void {
  app.ui = { ...app.ui, wizardMode: !app.ui.wizardMode }
}

/**
 * Acknowledge LUDICROUS tier risks - unlocks dangerous optimizations
 * This action is intentionally one-way per session for safety.
 */
export function acknowledgeLudicrous(): void {
  app.ui = { ...app.ui, ludicrousAcknowledged: true }
}

/**
 * Acknowledge restore point disable risks - allows disabling restore point optimization
 * This action is intentionally one-way per session for safety.
 */
export function acknowledgeRestorePointDisable(): void {
  app.ui = { ...app.ui, restorePointAcknowledged: true }
}

/**
 * Build SelectionState from current app state
 * Used for script generation
 */
function buildSelectionState(): SelectionState {
  const hardware: HardwareProfile = {
    cpu: app.hardware.cpu,
    gpu: app.hardware.gpu,
    peripherals: Array.from(app.peripherals),
    monitorSoftware: Array.from(app.monitorSoftware),
  }

  const packages = Array.from(app.selected)

  const missingPackages = packages.filter((key) => !(key in app.software))

  return {
    hardware,
    optimizations: Array.from(app.optimizations),
    packages: packages.filter((key) => key in app.software),
    missingPackages,
  }
}

/**
 * Generate script from current state (reactive-friendly)
 * Call this in a $derived to get auto-updating script
 */
export function generateCurrentScript(): string {
  if (Object.keys(app.software).length === 0) {
    return ''
  }

  const selection = buildSelectionState()
  return buildScript(selection, {
    catalog: app.software,
    dnsProvider: app.dnsProvider,
  })
}
