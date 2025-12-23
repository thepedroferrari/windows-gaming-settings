import { store } from '../state'
import type { PackageKey } from '../types'
import { $id } from '../utils/dom'
import { createCard } from './software-card'

const ANIMATION_DELAY_MS = 30 as const

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

  document.addEventListener('software-selection-changed', () => {
    updateSoftwareCounter()
    document.dispatchEvent(new CustomEvent('script-change-request'))
  })
}

export { createCard, toggleCardSelection as toggleSoftware } from './software-card'

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
