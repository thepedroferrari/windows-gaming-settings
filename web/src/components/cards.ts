import { store } from '../state'
import { asPackageKey, type PackageKey } from '../types'
import { $id } from '../utils/dom'
import { createRipple } from '../utils/effects'
import type { CleanupController } from '../utils/lifecycle'
import { createCard, toggleCardSelection } from './software-card'

const ANIMATION_DELAY_MS = 30 as const
const MAGNETIC_FACTOR = 0.015 as const
const TILT_FACTOR = 3 as const

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

  setupCardInteractions(controller)

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

function setupCardInteractions(controller?: CleanupController): void {
  const grid = $id('software-grid')
  if (!grid) return

  const addListener = (
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void => {
    if (controller) {
      controller.addEventListener(target, type, handler, options)
    } else {
      target.addEventListener(type, handler, options)
    }
  }

  const getCard = (target: EventTarget | null): HTMLDivElement | null => {
    if (!(target instanceof Element)) return null
    return target.closest<HTMLDivElement>('.software-card')
  }

  const resetCardVisual = (card: HTMLDivElement): void => {
    card.style.transform = ''
    card.style.setProperty('--light-x', '50%')
    card.style.setProperty('--light-y', '50%')
  }

  let activeCard: HTMLDivElement | null = null

  addListener(grid, 'click', (e: Event) => {
    if (!(e instanceof MouseEvent)) return
    const card = getCard(e.target)
    if (!card) return
    const key = card.dataset.key
    if (!key) return
    toggleCardSelection(asPackageKey(key), card)
    createRipple(e, card)
  })

  addListener(grid, 'keydown', (e: Event) => {
    if (!(e instanceof KeyboardEvent)) return
    if (e.key !== 'Enter' && e.key !== ' ') return
    const card = getCard(e.target)
    if (!card) return
    const key = card.dataset.key
    if (!key) return
    e.preventDefault()
    toggleCardSelection(asPackageKey(key), card)
  })

  addListener(grid, 'mousemove', (e: Event) => {
    if (!(e instanceof MouseEvent)) return
    const card = getCard(e.target)
    if (!card) {
      if (activeCard) {
        resetCardVisual(activeCard)
        activeCard = null
      }
      return
    }

    const gridEl = card.closest('.software-grid')
    const isListView = gridEl?.classList.contains('list-view')
    if (isListView) {
      if (activeCard) {
        resetCardVisual(activeCard)
        activeCard = null
      }
      return
    }

    if (activeCard && activeCard !== card) {
      resetCardVisual(activeCard)
    }
    activeCard = card

    const rect = card.getBoundingClientRect()
    const centerX = e.clientX - rect.left - rect.width / 2
    const centerY = e.clientY - rect.top - rect.height / 2

    const magneticX = centerX * MAGNETIC_FACTOR
    // Constrain vertical movement: only allow slight downward press, no upward lift
    const magneticY = Math.max(0, centerY * MAGNETIC_FACTOR * 0.5)

    const normalizedX = centerX / (rect.width / 2)
    const normalizedY = centerY / (rect.height / 2)
    const rotateY = normalizedX * TILT_FACTOR
    const rotateX = -normalizedY * TILT_FACTOR

    card.style.transform = `translate(${magneticX}px, ${magneticY}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`

    const lightX = ((e.clientX - rect.left) / rect.width) * 100
    const lightY = ((e.clientY - rect.top) / rect.height) * 100
    card.style.setProperty('--light-x', `${lightX}%`)
    card.style.setProperty('--light-y', `${lightY}%`)
  })

  addListener(grid, 'mouseleave', () => {
    if (activeCard) {
      resetCardVisual(activeCard)
      activeCard = null
    }
  })

  addListener(grid, 'animationend', (e: Event) => {
    const target = e.target
    if (!(target instanceof HTMLElement)) return
    if (!target.classList.contains('software-card')) return
    target.classList.remove('entering')
  })
}
