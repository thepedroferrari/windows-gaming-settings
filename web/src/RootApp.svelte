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
  } from '$lib/state.svelte'
  import { VIEW_MODES, OPTIMIZATION_KEYS } from '$lib/types'
  import { getRecommendedPreset } from '$lib/presets'
  import { safeParseCatalog, isParseSuccess, formatZodErrors } from './schemas'
  import type { SoftwareCatalog } from '$lib/types'
  import { getDefaultOptimizations } from '$lib/optimizations'

  /** LUDICROUS optimization keys for danger zone detection */
  const LUDICROUS_KEYS = [
    OPTIMIZATION_KEYS.SPECTRE_MELTDOWN_OFF,
    OPTIMIZATION_KEYS.CORE_ISOLATION_OFF,
    OPTIMIZATION_KEYS.KERNEL_MITIGATIONS_OFF,
    OPTIMIZATION_KEYS.DEP_OFF,
  ] as const

  // Navigation
  import UnifiedNav from './components/UnifiedNav.svelte'

  // Section components
  import HeroSection from './components/HeroSection.svelte'
  import PresetSection from './components/PresetSection.svelte'
  import HardwareSection from './components/HardwareSection.svelte'
  import PeripheralsSection from './components/PeripheralsSection.svelte'
  import OptimizationsSection from './components/OptimizationsSection.svelte'
  import ForgeSection from './components/ForgeSection.svelte'
  import ManualStepsSection from './components/ManualStepsSection.svelte'

  // Arsenal section components
  import SoftwareGrid from './components/SoftwareGrid.svelte'
  import Filters from './components/Filters.svelte'

  // Global UI components
  import PreviewModal from './components/PreviewModal.svelte'
  import AuditPanel from './components/AuditPanel.svelte'
  import SRAnnounce from './components/SRAnnounce.svelte'

  // Loading state
  let loading = $state(true)
  let error = $state<string | null>(null)

  // Derived counts for display
  let selectedCount = $derived(getSelectedCount())
  let totalCount = $derived(getTotalCount())
  let recommendedPreset = $derived(getRecommendedPreset(app.activePreset))
  let activeView = $derived(app.view)

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

  async function loadCatalog(): Promise<SoftwareCatalog> {
    const response = await fetch('/catalog.json')
    if (!response.ok) {
      throw new Error(`Failed to load catalog: HTTP ${response.status}`)
    }

    const rawData: unknown = await response.json()
    const result = safeParseCatalog(rawData)

    if (!isParseSuccess(result)) {
      throw new Error(`Invalid catalog format: ${formatZodErrors(result.error)}`)
    }

    return result.data
  }

  async function hydrateCatalog() {
    loading = true
    error = null

    try {
      const catalog = await loadCatalog()
      setSoftware(catalog)

      // Initialize default optimizations
      const defaults = getDefaultOptimizations()
      setOptimizations(defaults)
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load catalog'
      console.error('[RockTune] Catalog load error:', error)
    } finally {
      loading = false
    }
  }

  onMount(() => {
    void hydrateCatalog()
  })
</script>

<!-- Accessibility -->
<SRAnnounce />

<!-- Fixed Navigation -->
<UnifiedNav />

<!-- Danger Zone Banner - shown when LUDICROUS items selected -->
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

<!-- Hero Header -->
<HeroSection />

<!-- Main Content -->
<main class="container" id="main-content">
  <!-- Step 0: Presets / Quick Start -->
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

  <!-- Step 1: Hardware -->
  <HardwareSection />

  <!-- Step 2: Peripherals -->
  <PeripheralsSection />

  <!-- Step 3: Optimizations -->
  <OptimizationsSection />

  <!-- Step 4: Arsenal (Software Grid) -->
  <section id="software" class="step step--arsenal">
    <div class="step-header">
      <div class="step-header__left">
        <h2><span class="step-num">4</span> Arsenal</h2>
        <p class="step-desc">
          All packages installed via <abbr title="Windows Package Manager">winget</abbr> — Microsoft's official package manager.
          <span class="trust-hint">Pulled from verified sources. Preview exact commands in the Forge.</span>
        </p>
      </div>
      <div class="step-header__right">
        <div class="view-toggle">
          <button
            type="button"
            class="view-btn"
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
            class="view-btn"
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
    </div>

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
    {/if}
  </section>

  <!-- Step 5: Forge Script -->
  <ForgeSection />

  <!-- Step 6: Manual Guide -->
  <section id="manual-guide" class="step step--manual-guide">
    <ManualStepsSection />
  </section>
</main>

<!-- Global UI Components -->
<PreviewModal />
<AuditPanel />

<!-- Styles are in layout.css (layer: layout) and filters.styles.css (layer: components) -->
