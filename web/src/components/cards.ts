/**
 * Software Grid Module
 * Handles the grid layout and counter for software cards
 * Card-specific logic is in: ./software-card/
 */

import { store } from '../state'
import type { PackageKey } from '../types'
import { $id } from '../utils/dom'
import { createCard } from './software-card'

// =============================================================================
// CONSTANTS
// =============================================================================

const ANIMATION_DELAY_MS = 30 as const

// =============================================================================
// GRID RENDERING
// =============================================================================

export function renderSoftwareGrid(): void {
  const grid = $id('software-grid')
  if (!grid) return

  grid.innerHTML = ''
  let delay = 0

  for (const [key, pkg] of Object.entries(store.software)) {
    const card = createCard(key as PackageKey, pkg, delay)
    grid.appendChild(card)
    delay += ANIMATION_DELAY_MS
  }

  updateSoftwareCounter()

  // Listen for selection changes from the card component
  document.addEventListener('software-selection-changed', () => {
    updateSoftwareCounter()
    document.dispatchEvent(new CustomEvent('script-change-request'))
  })
}

// Re-export createCard for backwards compatibility
export { createCard } from './software-card'

// =============================================================================
// TOGGLE FUNCTIONALITY (delegated to component)
// =============================================================================

export { toggleCardSelection as toggleSoftware } from './software-card'

// =============================================================================
// COUNTER & BADGES
// =============================================================================

export function updateSoftwareCounter(): void {
  const counter = $id('software-counter')
  if (counter) {
    counter.textContent = `${store.selectedCount} selected`
  }
}

export function updateCategoryBadges(): void {
  const counts = store.getCategoryCounts()
  for (const [cat, count] of Object.entries(counts)) {
    const el = $id(`count-${cat}`)
    if (el) el.textContent = String(count)
  }
}
