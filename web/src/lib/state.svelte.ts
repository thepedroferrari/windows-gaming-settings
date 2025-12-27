/**
 * RockTune State - Svelte 5 Runes
 *
 * Single source of truth for app state using $state and $derived.
 * Replaces the old Store class with fine-grained reactivity.
 */

import type {
  FilterValue,
  PackageKey,
  SoftwareCatalog,
  SoftwarePackage,
  ViewMode,
} from './types'
import { FILTER_ALL, FILTER_SELECTED, isFilterAll, isFilterSelected, VIEW_MODES } from './types'

// =============================================================================
// Core State - Reactive with $state rune
// =============================================================================

export const app = $state({
  /** Software catalog loaded from catalog.json */
  software: {} as SoftwareCatalog,

  /** Currently selected packages */
  selected: new Set<PackageKey>(),

  /** Current filter: 'all', 'selected', or a category */
  filter: FILTER_ALL as FilterValue,

  /** Search query */
  search: '',

  /** View mode: 'grid' or 'list' */
  view: VIEW_MODES.GRID as ViewMode,
})

// =============================================================================
// Derived Values - Getter functions (Svelte 5 modules can't export $derived)
// =============================================================================

/** Count of selected packages */
export function getSelectedCount(): number {
  return app.selected.size
}

/** Total packages in catalog */
export function getTotalCount(): number {
  return Object.keys(app.software).length
}

/** Whether any packages are selected */
export function getHasSelection(): boolean {
  return app.selected.size > 0
}

/** Filtered and searched software list */
export function getFiltered(): [PackageKey, SoftwarePackage][] {
  const searchLower = app.search.toLowerCase()

  return Object.entries(app.software).filter(([key, pkg]) => {
    // Filter by category or selection
    let matchesFilter: boolean
    if (isFilterAll(app.filter)) {
      matchesFilter = true
    } else if (isFilterSelected(app.filter)) {
      matchesFilter = app.selected.has(key as PackageKey)
    } else {
      matchesFilter = pkg.category === app.filter
    }

    // Filter by search term
    const matchesSearch =
      !app.search ||
      pkg.name.toLowerCase().includes(searchLower) ||
      pkg.desc?.toLowerCase().includes(searchLower) ||
      pkg.category.toLowerCase().includes(searchLower)

    return matchesFilter && matchesSearch
  }) as [PackageKey, SoftwarePackage][]
}

/** Count of filtered results */
export function getFilteredCount(): number {
  return getFiltered().length
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

// =============================================================================
// Mutations - Functions to update state
// =============================================================================

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

  // Trigger reactivity by reassigning the Set
  app.selected = new Set(app.selected)

  return !wasSelected
}

/**
 * Check if a package is selected
 */
export function isSelected(key: PackageKey): boolean {
  return app.selected.has(key)
}

/**
 * Clear all selections
 */
export function clearSelection(): void {
  app.selected = new Set()
}

/**
 * Set selection to specific keys
 */
export function setSelection(keys: readonly PackageKey[]): void {
  app.selected = new Set(keys)
}

/**
 * Add keys to current selection (union)
 */
export function addToSelection(keys: readonly PackageKey[]): void {
  app.selected = app.selected.union(new Set(keys))
}

/**
 * Remove keys from current selection (difference)
 */
export function removeFromSelection(keys: readonly PackageKey[]): void {
  app.selected = app.selected.difference(new Set(keys))
}

/**
 * Load software catalog and pre-select default packages
 */
export function setSoftware(catalog: SoftwareCatalog): void {
  app.software = catalog

  // Pre-select packages marked as selected in catalog
  const preSelected = new Set<PackageKey>()
  for (const [key, pkg] of Object.entries(catalog)) {
    if (pkg.selected) {
      preSelected.add(key as PackageKey)
    }
  }
  app.selected = preSelected
}

/**
 * Set the current filter
 */
export function setFilter(filter: FilterValue): void {
  app.filter = filter
}

/**
 * Set the search term
 */
export function setSearch(term: string): void {
  app.search = term
}

/**
 * Set the view mode
 */
export function setView(view: ViewMode): void {
  app.view = view
}

/**
 * Get a package by key
 */
export function getPackage(key: PackageKey): SoftwarePackage | undefined {
  return app.software[key]
}

/**
 * Check if a key exists in the catalog
 */
export function hasPackage(key: string): key is PackageKey {
  return key in app.software
}

// =============================================================================
// ES2024 Set Methods - For advanced selection operations
// =============================================================================

/**
 * Check if selection is subset of given keys
 */
export function isSelectionSubsetOf(keys: readonly string[]): boolean {
  return app.selected.isSubsetOf(new Set(keys))
}

/**
 * Check if selection contains all given keys
 */
export function isSelectionSupersetOf(keys: readonly string[]): boolean {
  return app.selected.isSupersetOf(new Set(keys))
}

/**
 * Get keys that are both selected and in given set
 */
export function getSelectedIntersection(keys: readonly string[]): Set<string> {
  return app.selected.intersection(new Set(keys))
}

/**
 * Get selected keys not in given set
 */
export function getSelectedDifference(keys: readonly string[]): Set<string> {
  return app.selected.difference(new Set(keys))
}

/**
 * Get keys in one set but not both
 */
export function getSymmetricDifference(keys: readonly string[]): Set<string> {
  return app.selected.symmetricDifference(new Set(keys))
}
