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
import { setupDownload } from './components/script-generator'
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

function showError(message: string): void {
  const banner = $id('error-banner')
  const messageEl = $id('error-message')
  if (banner && messageEl) {
    messageEl.textContent = message
    banner.hidden = false
  }
}

function hideError(): void {
  const banner = $id('error-banner')
  if (banner) banner.hidden = true
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
  } else if (loadState.error) {
    showError(loadState.error)
  }
}

async function init(): Promise<void> {
  appController = createCleanupController()

  setupErrorHandlers(appController)

  const catalog = await loadCatalog()
  store.setSoftware(catalog)

  if (loadState.error) {
    showError(loadState.error)
  }

  setupVisualEffects(appController)
  setupUI(appController)
  setupInteractions(appController)

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
  setupDriverLinks(controller)
  initCyberToggle(controller)
}

onReady(init)

export function cleanupApp(): void {
  appController?.cleanup()
  appController = null
}
