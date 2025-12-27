<script lang="ts">
  /**
   * RockTune App - Root Svelte Component
   *
   * Phase 3: Progressive migration of UI to Svelte components.
   * The app now renders the SoftwareGrid via Svelte.
   */

  import { app, setSoftware, getSelectedCount, getTotalCount } from '$lib/state.svelte'
  import { safeParseCatalog, isParseSuccess, formatZodErrors } from './schemas'
  import type { ValidatedCatalog } from './schemas'
  import SoftwareGrid from './components/SoftwareGrid.svelte'

  let mounted = $state(false)
  let loading = $state(true)
  let error = $state<string | null>(null)

  // Derived counts for display
  let selectedCount = $derived(getSelectedCount())
  let totalCount = $derived(getTotalCount())

  async function loadCatalog(): Promise<ValidatedCatalog> {
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

      return result.data
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error loading catalog'
      console.error('Catalog load error:', message)
      throw e
    }
  }

  $effect(() => {
    mounted = true
    console.log('[RockTune] Svelte 5 mounted successfully')

    // Load catalog on mount
    loadCatalog()
      .then((catalog) => {
        setSoftware(catalog)
        loading = false
        console.log(`[RockTune] Loaded ${Object.keys(catalog).length} packages`)
      })
      .catch((e) => {
        error = e instanceof Error ? e.message : 'Failed to load catalog'
        loading = false
      })

    return () => {
      console.log('[RockTune] Svelte unmounting')
    }
  })
</script>

<!--
  Phase 3: Svelte-rendered software grid
  Other sections still rendered by existing HTML in index.html
-->
{#if mounted}
  <section id="svelte-software-section" class="software-section-svelte">
    <header class="section-header">
      <h2>Arsenal</h2>
      <span class="counter">
        <span id="software-counter">{selectedCount}</span> / {totalCount} selected
      </span>
    </header>

    {#if loading}
      <div class="loading-state">Loading software catalog...</div>
    {:else if error}
      <div class="error-state">
        <p>{error}</p>
        <button onclick={() => location.reload()}>Retry</button>
      </div>
    {:else}
      <SoftwareGrid />
    {/if}
  </section>

  <!-- Dev indicator -->
  <div class="svelte-ready-indicator" aria-hidden="true"></div>
{/if}

<style>
  .svelte-ready-indicator {
    position: fixed;
    bottom: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    background: #00ff88;
    border-radius: 50%;
    opacity: 0.6;
    z-index: 9999;
    pointer-events: none;
  }

  .software-section-svelte {
    padding: 2rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .section-header h2 {
    margin: 0;
    font-size: 1.5rem;
    color: var(--text);
  }

  .counter {
    color: var(--text-dim);
    font-size: 0.875rem;
  }

  .loading-state,
  .error-state {
    text-align: center;
    padding: 3rem;
    color: var(--text-dim);
  }

  .error-state button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: var(--accent);
    color: var(--bg);
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
