import { store } from '../../state'
import type { FilterValue, ViewMode } from '../../types'
import { FILTER_ALL, FILTER_SELECTED, isCategory, VIEW_MODES } from '../../types'
import { $, $$, $id, announce, debounce, isInputElement } from '../../utils/dom'

const FILTER_WILDCARD = '*' as const
const FILTER_SELECTED_VALUE = 'selected' as const
const ANIMATION_DELAY_MS = 20 as const
const SEARCH_ANNOUNCE_DELAY_MS = 500 as const

export function setupFilters(): void {
  const buttons = $$<HTMLButtonElement>('.filter')

  for (const btn of buttons) {
    btn.addEventListener('click', () => handleFilterClick(btn, buttons))
  }
}

function handleFilterClick(
  activeBtn: HTMLButtonElement,
  allButtons: NodeListOf<HTMLButtonElement>,
): void {
  for (const btn of allButtons) {
    btn.classList.toggle('active', btn === activeBtn)
  }

  const filterRaw = activeBtn.dataset.filter ?? FILTER_WILDCARD
  animateVisibleCards(filterRaw)

  const filter: FilterValue = parseFilterValue(filterRaw)
  store.setFilter(filter)
}

function parseFilterValue(raw: string): FilterValue {
  if (raw === FILTER_WILDCARD) return FILTER_ALL
  if (raw === FILTER_SELECTED_VALUE) return FILTER_SELECTED
  return isCategory(raw) ? raw : FILTER_ALL
}

function animateVisibleCards(filter: string): void {
  const cards = $$<HTMLDivElement>('.software-card')
  let visibleIndex = 0

  for (const card of cards) {
    const key = card.dataset.key
    let isVisible: boolean

    if (filter === FILTER_WILDCARD) {
      isVisible = true
    } else if (filter === FILTER_SELECTED_VALUE) {
      isVisible = key ? store.isSelected(key) : false
    } else {
      isVisible = card.dataset.category === filter
    }

    card.classList.toggle('hidden', !isVisible)

    if (isVisible) {
      card.style.animationDelay = `${visibleIndex * ANIMATION_DELAY_MS}ms`
      card.classList.add('entering')
      card.addEventListener('animationend', () => card.classList.remove('entering'), { once: true })
      visibleIndex++
    }
  }
}

export function setupSearch(): void {
  const input = $id('software-search')
  if (!isInputElement(input)) return

  const announceResults = debounce((count: number) => {
    announce(`${count} package${count !== 1 ? 's' : ''} found`)
  }, SEARCH_ANNOUNCE_DELAY_MS)

  input.addEventListener('input', (e) => handleSearchInput(e, announceResults))
}

function handleSearchInput(event: Event, announceResults: (count: number) => void): void {
  const target = event.target
  if (!isInputElement(target)) return

  const query = target.value.toLowerCase().trim()
  const activeFilter = getActiveFilter()
  const visibleCount = filterCardsBySearch(query, activeFilter)

  store.setSearchTerm(query)
  announceResults(visibleCount)
}

function getActiveFilter(): string {
  return $<HTMLButtonElement>('.filter.active')?.dataset.filter ?? FILTER_WILDCARD
}

function filterCardsBySearch(query: string, activeFilter: string): number {
  const cards = $$<HTMLDivElement>('.software-card')
  let visibleCount = 0

  for (const card of cards) {
    const key = card.dataset.key
    if (!key) continue

    const pkg = store.getPackage(key)
    if (!pkg) continue

    const matchesSearch =
      !query ||
      pkg.name.toLowerCase().includes(query) ||
      pkg.desc?.toLowerCase().includes(query) ||
      pkg.category.toLowerCase().includes(query)

    let matchesFilter: boolean
    if (activeFilter === FILTER_WILDCARD) {
      matchesFilter = true
    } else if (activeFilter === FILTER_SELECTED_VALUE) {
      matchesFilter = store.isSelected(key)
    } else {
      matchesFilter = card.dataset.category === activeFilter
    }

    const isVisible = matchesSearch && matchesFilter

    card.classList.toggle('hidden', !isVisible)
    if (isVisible) visibleCount++
  }

  return visibleCount
}

export function setupViewToggle(): void {
  const buttons = $$<HTMLButtonElement>('.view-btn')
  const grid = $id('software-grid')
  if (!buttons.length || !grid) return

  for (const btn of buttons) {
    btn.addEventListener('click', () => handleViewToggle(btn, buttons, grid))
  }
}

function handleViewToggle(
  activeBtn: HTMLButtonElement,
  allButtons: NodeListOf<HTMLButtonElement>,
  grid: HTMLElement,
): void {
  for (const btn of allButtons) {
    btn.classList.toggle('active', btn === activeBtn)
  }

  const view = parseViewMode(activeBtn.dataset.view)
  grid.classList.toggle('list-view', view === VIEW_MODES.LIST)
  store.setView(view)
}

function parseViewMode(raw: string | undefined): ViewMode {
  return raw === VIEW_MODES.LIST ? VIEW_MODES.LIST : VIEW_MODES.GRID
}

export function setupClearAll(): void {
  const btn = $id('clear-all-software')
  if (!btn) return

  btn.addEventListener('click', () => {
    store.clearSelection()

    for (const card of $$<HTMLDivElement>('.software-card')) {
      card.classList.remove('selected')
      card.setAttribute('aria-checked', 'false')
      const action = card.querySelector('.back-action')
      if (action) action.textContent = 'Click to add'
    }

    document.dispatchEvent(new CustomEvent('software-selection-changed'))
  })
}
