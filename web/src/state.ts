import type {
  FilterValue,
  MutableAppState,
  PackageKey,
  SoftwareCatalog,
  SoftwarePackage,
  ViewMode,
} from './types'
import { FILTER_ALL, isFilterAll, VIEW_MODES } from './types'

type Listener = () => void
type Unsubscribe = () => void

// =============================================================================
// Store - Reactive state management with ES2024+ features
// =============================================================================

class Store {
  // ES2022 Private class fields - true encapsulation, not accessible via reflection
  #state: MutableAppState
  readonly #listeners = new Set<Listener>()

  // ES2022 Static initialization block - runs once when class is loaded
  static {
    // Freeze the class prototype to prevent monkey-patching
    Object.freeze(Store.prototype)
  }

  constructor() {
    this.#state = {
      software: {},
      selectedSoftware: new Set<string>(),
      currentFilter: FILTER_ALL,
      searchTerm: '',
      currentView: VIEW_MODES.GRID,
    }
  }

  // ---------------------------------------------------------------------------
  // Getters - Immutable views into state
  // ---------------------------------------------------------------------------

  get software(): SoftwareCatalog {
    return Object.freeze({ ...this.#state.software }) as SoftwareCatalog
  }

  get selectedSoftware(): ReadonlySet<PackageKey> {
    return new Set(this.#state.selectedSoftware) as ReadonlySet<PackageKey>
  }

  get currentFilter(): FilterValue {
    return this.#state.currentFilter
  }

  get searchTerm(): string {
    return this.#state.searchTerm
  }

  get currentView(): ViewMode {
    return this.#state.currentView
  }

  get selectedCount(): number {
    return this.#state.selectedSoftware.size
  }

  get totalCount(): number {
    return Object.keys(this.#state.software).length
  }

  // ---------------------------------------------------------------------------
  // Package accessors with function overloads
  // ---------------------------------------------------------------------------

  getPackage(key: PackageKey): Readonly<SoftwarePackage>
  getPackage(key: string): Readonly<SoftwarePackage> | undefined
  getPackage(key: string): Readonly<SoftwarePackage> | undefined {
    const pkg = this.#state.software[key]
    return pkg ? Object.freeze({ ...pkg }) : undefined
  }

  hasPackage(key: string): key is PackageKey {
    return key in this.#state.software
  }

  isSelected(key: PackageKey): boolean
  isSelected(key: string): boolean {
    return this.#state.selectedSoftware.has(key)
  }

  /**
   * ES2024 Set.isSubsetOf() - Check if selection is subset of given keys
   */
  isSelectionSubsetOf(keys: readonly string[]): boolean {
    return this.#state.selectedSoftware.isSubsetOf(new Set(keys))
  }

  /**
   * ES2024 Set.isSupersetOf() - Check if selection contains all given keys
   */
  isSelectionSupersetOf(keys: readonly string[]): boolean {
    return this.#state.selectedSoftware.isSupersetOf(new Set(keys))
  }

  /**
   * ES2024 Set.intersection() - Get keys that are both selected and in given set
   */
  getSelectedIntersection(keys: readonly string[]): ReadonlySet<string> {
    return this.#state.selectedSoftware.intersection(new Set(keys))
  }

  /**
   * ES2024 Set.difference() - Get selected keys not in given set
   */
  getSelectedDifference(keys: readonly string[]): ReadonlySet<string> {
    return this.#state.selectedSoftware.difference(new Set(keys))
  }

  /**
   * ES2024 Set.symmetricDifference() - Get keys in one set but not both
   */
  getSymmetricDifference(keys: readonly string[]): ReadonlySet<string> {
    return this.#state.selectedSoftware.symmetricDifference(new Set(keys))
  }

  // ---------------------------------------------------------------------------
  // Mutations - All state changes notify subscribers
  // ---------------------------------------------------------------------------

  toggleSoftware(key: PackageKey): boolean
  toggleSoftware(key: string): boolean {
    const isCurrentlySelected = this.#state.selectedSoftware.has(key)
    if (isCurrentlySelected) {
      this.#state.selectedSoftware.delete(key)
    } else {
      this.#state.selectedSoftware.add(key)
    }
    this.#notify()
    return !isCurrentlySelected
  }

  clearSelection(): void {
    this.#state.selectedSoftware.clear()
    this.#notify()
  }

  setSelection(keys: readonly string[]): void {
    this.#state.selectedSoftware = new Set(keys)
    this.#notify()
  }

  /**
   * ES2024 Set.union() - Add keys to selection without removing existing
   */
  addToSelection(keys: readonly string[]): void {
    this.#state.selectedSoftware = this.#state.selectedSoftware.union(new Set(keys))
    this.#notify()
  }

  /**
   * ES2024 Set.difference() - Remove keys from selection
   */
  removeFromSelection(keys: readonly string[]): void {
    this.#state.selectedSoftware = this.#state.selectedSoftware.difference(new Set(keys))
    this.#notify()
  }

  setSoftware(catalog: SoftwareCatalog): void {
    this.#state.software = { ...catalog }
    // Pre-select packages marked as selected in catalog
    for (const [key, pkg] of Object.entries(catalog)) {
      if (pkg.selected) {
        this.#state.selectedSoftware.add(key)
      }
    }
    this.#notify()
  }

  setFilter(filter: FilterValue): void {
    this.#state.currentFilter = filter
    this.#notify()
  }

  setSearchTerm(term: string): void {
    this.#state.searchTerm = term
    this.#notify()
  }

  setView(view: ViewMode): void {
    this.#state.currentView = view
    this.#notify()
  }

  // ---------------------------------------------------------------------------
  // Computed views - Derived data from state
  // ---------------------------------------------------------------------------

  getFilteredSoftware(): readonly [PackageKey, Readonly<SoftwarePackage>][] {
    const { software, currentFilter, searchTerm } = this.#state
    const searchLower = searchTerm.toLowerCase()

    return Object.entries(software)
      .filter(([_, pkg]) => {
        const matchesFilter = isFilterAll(currentFilter) || pkg.category === currentFilter
        const matchesSearch =
          !searchTerm ||
          pkg.name.toLowerCase().includes(searchLower) ||
          pkg.desc?.toLowerCase().includes(searchLower) ||
          pkg.category.toLowerCase().includes(searchLower)

        return matchesFilter && matchesSearch
      })
      .map(([key, pkg]) => [key as PackageKey, Object.freeze({ ...pkg })] as const)
  }

  /**
   * ES2024 Object.groupBy() - Groups packages by category
   * Returns frozen record of category -> count
   */
  getCategoryCounts(): Readonly<Record<string, number>> {
    const packages = Object.values(this.#state.software)

    // ES2024: Object.groupBy() for declarative grouping
    const grouped = Object.groupBy(packages, (pkg) => pkg.category)

    // Transform grouped object to counts
    const counts: Record<string, number> = { all: packages.length }
    for (const [category, pkgs] of Object.entries(grouped)) {
      counts[category] = pkgs?.length ?? 0
    }

    return Object.freeze(counts)
  }

  // ---------------------------------------------------------------------------
  // Subscription - Observer pattern for reactive updates
  // ---------------------------------------------------------------------------

  subscribe(listener: Listener): Unsubscribe {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  #notify(): void {
    for (const listener of this.#listeners) {
      listener()
    }
  }
}

// Singleton export - single source of truth
export const store = new Store()

export type { Store }
