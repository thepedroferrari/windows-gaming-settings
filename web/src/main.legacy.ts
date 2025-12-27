import { setupAuditPanel } from './components/audit'
import {
  renderSoftwareGrid,
  setupSoftwareListeners,
  updateCategoryBadges,
} from './components/cards'
import { initCyberToggle } from './components/cyber-toggle'
import { setupDriverLinks } from './components/drivers'
import { setupClearAll, setupFilters, setupSearch, setupViewToggle } from './components/filters'
import { setupPresets } from './components/presets'
import { setupProfileActions } from './components/profiles'
import {
  downloadFile,
  generateSafeScript,
  SAFE_SCRIPT_FILENAME,
  setupDownload,
} from './components/script-generator'
import { setupFormListeners, updateSummary } from './components/summary'
import { formatZodErrors, isParseSuccess, safeParseCatalog, type ValidatedCatalog } from './schemas'
import { store } from './state'
import { CATEGORY_SVG_ICONS } from './types'
import { $id, onReady } from './utils/dom'
import { setupCursorGlow, setupImageFallbacks, setupProgressNav } from './utils/effects'
import { type CleanupController, createCleanupController } from './utils/lifecycle'
import { setupRichTooltips } from './utils/tooltips'

interface LoadState {
  error: string | null
  isLoading: boolean
}

const loadState: LoadState = {
  error: null,
  isLoading: false,
}

let appController: CleanupController | null = null

async function loadCatalog(): Promise<ValidatedCatalog> {
  loadState.isLoading = true

  try {
    const response = await fetch('/catalog.json')
    if (!response.ok) {
      throw new Error(`Failed to load catalog: HTTP ${response.status}`)
    }

    const rawData: unknown = await response.json()
    const result = safeParseCatalog(rawData)

    if (!isParseSuccess(result)) {
      throw new Error(`Invalid catalog format: ${formatZodErrors(result.error)}`)
    }

    loadState.error = null
    return result.data
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error loading catalog'
    console.error('Catalog load error:', message)
    loadState.error = message
    return {}
  } finally {
    loadState.isLoading = false
  }
}

function hideError(): void {
  const banner = $id('error-banner')
  if (banner) banner.hidden = true
}

function setSoftwareSectionVisible(isVisible: boolean): void {
  const softwareSection = $id('software')
  if (softwareSection) {
    softwareSection.hidden = !isVisible
  }
}

function setupErrorHandlers(controller: CleanupController): void {
  const retryBtn = $id('error-retry')
  const dismissBtn = $id('error-dismiss')
  if (retryBtn) controller.addEventListener(retryBtn, 'click', handleRetry)
  if (dismissBtn) controller.addEventListener(dismissBtn, 'click', hideError)
}

async function handleRetry(): Promise<void> {
  if (loadState.isLoading) return

  hideError()
  const catalog = await loadCatalog()

  if (Object.keys(catalog).length > 0) {
    store.setSoftware(catalog)
    renderSoftwareGrid()
    updateCategoryBadges()
    setSoftwareSectionVisible(true)
  } else {
    setSoftwareSectionVisible(false)
  }
}

async function init(): Promise<void> {
  appController = createCleanupController()

  setupErrorHandlers(appController)

  const catalog = await loadCatalog()
  const hasCatalog = Object.keys(catalog).length > 0
  store.setSoftware(catalog)

  setupVisualEffects(appController)
  setupUI(appController)
  setupInteractions(appController)
  setSoftwareSectionVisible(hasCatalog)

  updateSummary()
  document.dispatchEvent(new CustomEvent('script-change-request'))

  // Cleanup on HMR (Vite dev mode)
  const hot = (import.meta as unknown as { hot?: { dispose: (cb: () => void) => void } }).hot
  if (hot) {
    hot.dispose(() => {
      appController?.cleanup()
    })
  }
}

function setupVisualEffects(controller: CleanupController): void {
  setupCursorGlow(controller)
  setupProgressNav(controller)
  setupImageFallbacks(CATEGORY_SVG_ICONS, controller)
  setupRichTooltips(controller)
}

function setupUI(controller: CleanupController): void {
  renderSoftwareGrid()
  setupSoftwareListeners(controller)
  updateCategoryBadges()
}

function setupQuickDownload(controller: CleanupController): void {
  const quickBtn = $id('quick-download-btn')
  if (quickBtn) {
    controller.addEventListener(quickBtn, 'click', () => {
      const script = generateSafeScript()
      downloadFile(script, SAFE_SCRIPT_FILENAME)
    })
  }
}

function setupAuditPanelVisibility(controller: CleanupController): void {
  const auditPanel = $id('audit-panel')
  if (!auditPanel) return

  const handleScroll = (): void => {
    if (window.scrollY > 600) {
      // ~78vh hero height
      auditPanel.classList.add('visible')
    }
  }

  controller.addEventListener(window, 'scroll', handleScroll, {
    passive: true,
  })
}

function setupInteractions(controller: CleanupController): void {
  setupFilters(controller)
  setupSearch(controller)
  setupViewToggle(controller)
  setupClearAll(controller)
  setupPresets(controller)
  setupFormListeners(controller)
  setupDownload(controller)
  setupProfileActions(controller)
  setupAuditPanel(controller)
  setupAuditPanelVisibility(controller)
  setupDriverLinks(controller)
  initCyberToggle(controller)
  setupQuickDownload(controller)
  setupPeriodicVerdictFlicker(controller)
}

/**
 * Setup periodic verdict flicker (MOT-001 from PRD)
 * Triggers random flicker burst every 15-20s
 */
function setupPeriodicVerdictFlicker(controller: CleanupController): void {
  const verdictElement = document.querySelector('[data-hero-verdict]') as HTMLElement | null
  if (!verdictElement) return

  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReducedMotion) return

  const triggerFlicker = (): void => {
    // Add flicker class for 260ms
    verdictElement.classList.add('is-flicker')

    controller.setTimeout(() => {
      verdictElement.classList.remove('is-flicker')

      // Schedule next flicker (random 15-20s)
      const nextDelay = 15000 + Math.random() * 5000 // 15000-20000ms
      controller.setTimeout(triggerFlicker, nextDelay)
    }, 260) // Burst duration
  }

  // Initial delay (random 15-20s)
  const initialDelay = 15000 + Math.random() * 5000
  controller.setTimeout(triggerFlicker, initialDelay)
}

onReady(init)

export function cleanupApp(): void {
  appController?.cleanup()
  appController = null
}
