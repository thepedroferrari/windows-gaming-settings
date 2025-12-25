import { store } from '../state'
import type { PackageKey } from '../types'
import { $id } from '../utils/dom'
import type { CleanupController } from '../utils/lifecycle'
import { createCard } from './software-card'

const ANIMATION_DELAY_MS = 30 as const

let listenersInitialized = false

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
}

export function setupSoftwareListeners(controller?: CleanupController): void {
  if (listenersInitialized) return
  listenersInitialized = true

  const handler = (): void => {
    updateSoftwareCounter()
    document.dispatchEvent(new CustomEvent('script-change-request'))
  }

  if (controller) {
    controller.addEventListener(document, 'software-selection-changed', handler)
  } else {
    document.addEventListener('software-selection-changed', handler)
  }

  controller?.onCleanup(() => {
    listenersInitialized = false
  })
}

export { createCard, toggleCardSelection as toggleSoftware } from './software-card'

export function updateSoftwareCounter(): void {
  const counter = $id('software-counter')
  if (counter) {
    counter.textContent = String(store.selectedCount)
  }
  const selectedBadge = $id('count-selected')
  if (selectedBadge) {
    selectedBadge.textContent = String(store.selectedCount)
  }
  const actionBadge = $id('selected-action-badge')
  if (actionBadge) {
    actionBadge.classList.toggle('has-selection', store.selectedCount > 0)
  }
}

export function updateCategoryBadges(): void {
  const counts = store.getCategoryCounts()
  for (const [cat, count] of Object.entries(counts)) {
    const el = $id(`count-${cat}`)
    if (el) el.textContent = String(count)
  }
}
