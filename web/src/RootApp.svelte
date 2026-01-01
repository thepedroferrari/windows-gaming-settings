<script lang="ts">
  /**
   * RockTune Root App - Svelte 5
   *
   * Single root component managing the entire application.
   * All sections rendered from here - no HTML fallbacks.
   */

  import { onMount } from 'svelte'
  import {
    app,
    setSoftware,
    getSelectedCount,
    getTotalCount,
    setOptimizations,
    setView,
    setCpu,
    setGpu,
    setDnsProvider,
    setPeripherals,
    setMonitorSoftware,
    setSelection,
    setActivePreset,
  } from '$lib/state.svelte'
  import { VIEW_MODES, OPTIMIZATION_KEYS } from '$lib/types'
  import { getRecommendedPreset } from '$lib/presets'
  import { safeParseCatalog, isParseSuccess, formatZodErrors } from './schemas'
  import type { SoftwareCatalog } from '$lib/types'
  import { getDefaultOptimizations } from '$lib/optimizations'
  import {
    hasShareHash,
    getShareHash,
    decodeShareURL,
    clearShareHash,
    type DecodedBuild,
  } from '$lib/share'
  import type { PackageKey } from '$lib/types'

  /** LUDICROUS optimization keys for danger zone detection */
  const LUDICROUS_KEYS = [
    OPTIMIZATION_KEYS.SPECTRE_MELTDOWN_OFF,
    OPTIMIZATION_KEYS.CORE_ISOLATION_OFF,
    OPTIMIZATION_KEYS.KERNEL_MITIGATIONS_OFF,
    OPTIMIZATION_KEYS.DEP_OFF,
  ] as const


  import UnifiedNav from './components/UnifiedNav.svelte'


  import HeroSection from './components/HeroSection.svelte'
  import PresetSection from './components/PresetSection.svelte'
  import HardwareSection from './components/HardwareSection.svelte'
  import PeripheralsSection from './components/PeripheralsSection.svelte'
  import OptimizationsSection from './components/OptimizationsSection.svelte'
  import ForgeSection from './components/ForgeSection.svelte'
  import ManualStepsSection from './components/ManualStepsSection.svelte'


  import SoftwareGrid from './components/SoftwareGrid.svelte'
  import Filters from './components/Filters.svelte'


  import PreviewModal from './components/PreviewModal.svelte'
  import AuditPanel from './components/AuditPanel.svelte'
  import SRAnnounce from './components/SRAnnounce.svelte'
  import Toast from './components/Toast.svelte'
  import { showToast } from '$lib/toast.svelte'


  let loading = $state(true)
  let error = $state<string | null>(null)


  let selectedCount = $derived(getSelectedCount())
  let totalCount = $derived(getTotalCount())
  let recommendedPreset = $derived(getRecommendedPreset(app.activePreset))
  let activeView = $derived(app.view)

  /** Track if we loaded from a shared URL */
  let loadedFromShare = $state(false)

  /** Check if any LUDICROUS optimizations are selected */
  let hasLudicrousSelected = $derived(
    LUDICROUS_KEYS.some((key) => app.optimizations.has(key))
  )

  /** Show danger banner when LUDICROUS acknowledged AND items selected */
  let showDangerBanner = $derived(
    app.ui.ludicrousAcknowledged && hasLudicrousSelected
  )

  function handleViewToggle(view: typeof VIEW_MODES.GRID | typeof VIEW_MODES.LIST) {
    setView(view)
  }

  // RTFB-501: localStorage cache for offline resilience (AlgoExpert: O(1) lookup)
  const CATALOG_CACHE_KEY = 'rocktune_catalog_cache'
  const CATALOG_CACHE_VERSION = '1.0'
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

  interface CatalogCache {
    version: string
    timestamp: string
    catalog: SoftwareCatalog
  }

  function getCachedCatalog(): SoftwareCatalog | null {
    try {
      const cached = localStorage.getItem(CATALOG_CACHE_KEY)
      if (!cached) return null

      const data: unknown = JSON.parse(cached)
      // Type guard pattern (Matt Pocock)
      if (
        typeof data === 'object' &&
        data !== null &&
        'version' in data &&
        'timestamp' in data &&
        'catalog' in data
      ) {
        const cache = data as CatalogCache
        const age = Date.now() - new Date(cache.timestamp).getTime()

        if (age < SEVEN_DAYS_MS && cache.version === CATALOG_CACHE_VERSION) {
          return cache.catalog
        }
      }
      return null
    } catch {
      return null
    }
  }

  function saveCatalogCache(catalog: SoftwareCatalog): void {
    try {
      const cache: CatalogCache = {
        version: CATALOG_CACHE_VERSION,
        timestamp: new Date().toISOString(),
        catalog,
      }
      localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(cache))
    } catch {
      // Fail silently (quota exceeded, private browsing)
    }
  }

  async function loadCatalog(): Promise<SoftwareCatalog> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      const response = await fetch('/catalog.json', { signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
        // Friendly error codes (not raw HTTP status)
        if (response.status === 404) throw new Error('CATALOG_NOT_FOUND')
        if (response.status >= 500) throw new Error('SERVER_ERROR')
        throw new Error('NETWORK_ERROR')
      }

      const rawData: unknown = await response.json()
      const result = safeParseCatalog(rawData)

      if (!isParseSuccess(result)) {
        throw new Error('INVALID_FORMAT')
      }

      // Save successful fetch to cache
      saveCatalogCache(result.data)
      return result.data
    } catch (err) {
      clearTimeout(timeoutId)

      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('TIMEOUT')
      }

      if (!navigator.onLine) {
        throw new Error('OFFLINE')
      }

      throw err
    }
  }

  async function hydrateCatalog() {
    loading = true
    error = null

    try {
      const catalog = await loadCatalog()
      setSoftware(catalog)

      // Only apply defaults if we didn't load from a share URL
      if (!loadedFromShare) {
        const defaults = getDefaultOptimizations()
        setOptimizations(defaults)
      }
    } catch (e) {
      // RTFB-501: User-friendly errors + cache fallback
      const cached = getCachedCatalog()

      if (e instanceof Error) {
        switch (e.message) {
          case 'OFFLINE':
            error = cached
              ? '📡 You\'re offline. Using cached catalog.'
              : '📡 No internet connection. Please connect and try again.'
            break

          case 'TIMEOUT':
            error = cached
              ? '⏱️ Catalog is taking too long. Using cached version.'
              : '⏱️ Connection timeout. Check your internet and try again.'
            break

          case 'CATALOG_NOT_FOUND':
            error = '🔍 Catalog not found. Try reloading the page.'
            break

          case 'SERVER_ERROR':
            error = cached
              ? '🚨 Server error. Using cached catalog.'
              : '🚨 Server error. Please try again in a few minutes.'
            break

          case 'INVALID_FORMAT':
            error = '⚠️ Catalog format error. Please reload the page.'
            break

          default:
            error = cached
              ? '⚡ Connection failed. Using cached catalog.'
              : '⚡ Failed to load catalog. Please try again.'
        }

        // Apply cached catalog if available
        if (cached) {
          setSoftware(cached)
          // Only apply defaults if we didn't load from a share URL
          if (!loadedFromShare) {
            const defaults = getDefaultOptimizations()
            setOptimizations(defaults)
          }
        }
      } else {
        error = 'Unknown error loading catalog.'
      }

      console.error('[RockTune] Catalog load error:', error, e)
    } finally {
      loading = false
    }
  }

  /**
   * Apply a decoded shared build to app state
   */
  function applySharedBuild(build: DecodedBuild): void {
    if (build.cpu) setCpu(build.cpu)
    if (build.gpu) setGpu(build.gpu)
    if (build.dnsProvider) setDnsProvider(build.dnsProvider)
    if (build.peripherals.length > 0) setPeripherals(build.peripherals)
    if (build.monitorSoftware.length > 0) setMonitorSoftware(build.monitorSoftware)
    if (build.optimizations.length > 0) setOptimizations(build.optimizations)
    if (build.packages.length > 0) setSelection(build.packages)
    if (build.preset) setActivePreset(build.preset)

    loadedFromShare = true
  }

  /**
   * Try to load state from URL share hash
   */
  function tryLoadFromShareURL(): void {
    if (!hasShareHash()) return

    const hash = getShareHash()
    if (!hash) return

    const result = decodeShareURL(hash)

    if (result.success) {
      applySharedBuild(result.build)

      // Clear the hash from URL (clean address bar)
      clearShareHash()

      // Show appropriate toast
      if (result.build.skippedCount > 0) {
        showToast(
          `Build loaded! ${result.build.skippedCount} setting(s) no longer available.`,
          'warning',
          6000
        )
      } else {
        showToast('Build loaded from shared link!', 'success')
      }
    } else {
      showToast(result.error, 'error', 6000)
      clearShareHash()
    }
  }

  onMount(() => {
    // First try to load from share URL
    tryLoadFromShareURL()

    // Then load catalog (may override defaults but shared state takes precedence)
    void hydrateCatalog()
  })
</script>


<SRAnnounce />


<UnifiedNav />


{#if showDangerBanner}
  <div class="danger-banner" role="alert">
    <svg class="danger-banner__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
    <span class="danger-banner__text">
      <strong>SECURITY OFF</strong> — Mitigations disabled. Offline use only.
    </span>
  </div>
{/if}


<HeroSection />


<main class="container" id="main-content">

  <section id="quick-start" class="step step--quickstart">
    <div class="quickstart-header">
      <div class="quickstart-accent quickstart-accent--left" aria-hidden="true"></div>
      <div class="quickstart-title-wrap">
        <h2 class="quickstart-title">Quick Start</h2>
        <p class="quickstart-subtitle">Choose a preset or build your own loadout below</p>
      </div>
      <div class="quickstart-accent quickstart-accent--right" aria-hidden="true"></div>
    </div>
    <PresetSection />
  </section>

  <HardwareSection />


    <PeripheralsSection />


    <OptimizationsSection />

    <section id="software" class="step step--arsenal">
    <header class="step-banner">
      <div class="step-banner__marker">4</div>
      <div class="step-banner__content">
        <h2 class="step-banner__title">Arsenal</h2>
        <p class="step-banner__subtitle">
          Install via <abbr title="Windows Package Manager">winget</abbr> — Microsoft's official package manager
        </p>
      </div>
      <div class="step-banner__actions">
        <div class="view-toggle view-toggle--banner">
          <button
            type="button"
            class="view-btn view-btn--banner"
            class:active={activeView === VIEW_MODES.GRID}
            onclick={() => handleViewToggle(VIEW_MODES.GRID)}
            aria-label="Grid view"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </button>
          <button
            type="button"
            class="view-btn view-btn--banner"
            class:active={activeView === VIEW_MODES.LIST}
            onclick={() => handleViewToggle(VIEW_MODES.LIST)}
            aria-label="List view"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    </header>

    {#if loading}
      <output class="loading-state" aria-busy="true">Loading software catalog...</output>
    {:else if error}
      <output class="error-state" role="alert">
        <p>{error}</p>
        <button type="button" onclick={hydrateCatalog}>Retry</button>
      </output>
    {:else}
      <Filters {recommendedPreset} />
      <SoftwareGrid />

      <!-- RTFB-301: Wizard Next button -->
      <div class="wizard-next-container">
        <a
          href="#generate"
          class="wizard-next-btn"
          onclick={(e) => {
            e.preventDefault();
            document.getElementById('generate')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          <span class="wizard-next-text">Next: Forge Script</span>
          <svg class="wizard-next-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </a>
      </div>
    {/if}
    </section>

  <ForgeSection />

  <ManualStepsSection />
</main>


<PreviewModal />
<AuditPanel />
<Toast />


