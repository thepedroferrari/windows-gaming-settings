<script lang="ts">
  import { app, getFiltered, toggleSoftware } from '$lib/state.svelte'
  import type { PackageKey } from '$lib/types'
  import SoftwareCard from './SoftwareCard.svelte'

  interface Props {
    class?: string
  }

  let { class: className = '' }: Props = $props()

  // Reactive filtered list - will update when app.filter, app.search, or app.software changes
  let filtered = $derived(getFiltered())
  let selectedSet = $derived(app.selected)

  // Track grid dimensions for overlay positioning
  let gridEl: HTMLDivElement | undefined = $state()
  let columnsPerRow = $state(6) // Default estimate

  // Calculate how many columns fit in the grid
  $effect(() => {
    if (!gridEl) return

    const updateColumns = () => {
      const gridWidth = gridEl!.clientWidth
      // Grid uses minmax(120px, 1fr) with gap of var(--space-md) ≈ 16px
      const minCardWidth = 120
      const gap = 16
      // Calculate columns: (width + gap) / (minCardWidth + gap)
      columnsPerRow = Math.floor((gridWidth + gap) / (minCardWidth + gap))
    }

    updateColumns()

    const observer = new ResizeObserver(updateColumns)
    observer.observe(gridEl)

    return () => observer.disconnect()
  })

  // Determine if a card at given index should show overlay on left
  // (last 2 columns need left overlay due to 280px overlay width)
  function getOverlayPosition(index: number): 'right' | 'left' {
    const columnIndex = index % columnsPerRow
    // If card is in the last 2 columns, show overlay on left
    return columnIndex >= columnsPerRow - 2 ? 'left' : 'right'
  }

  function handleToggle(key: PackageKey) {
    toggleSoftware(key)
  }
</script>

<div
  bind:this={gridEl}
  id="software-grid"
  class="software-grid {className}"
  class:list-view={app.view === 'list'}
>
  {#each filtered as [key, pkg], index (key)}
    <SoftwareCard
      {key}
      {pkg}
      selected={selectedSet.has(key)}
      onToggle={handleToggle}
      overlayPosition={getOverlayPosition(index)}
    />
  {/each}

  {#if filtered.length === 0}
    <div class="empty-state">
      {#if app.search}
        <p>No software matches "{app.search}"</p>
      {:else}
        <p>No software in this category</p>
      {/if}
    </div>
  {/if}
</div>

<!-- Styles are in software-card.styles.css and software-grid.styles.css (layer: components) -->
