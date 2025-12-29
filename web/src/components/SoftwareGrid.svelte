<script lang="ts">
  import { app, getFiltered, toggleSoftware } from '$lib/state.svelte'
  import type { PackageKey } from '$lib/types'
  import SoftwareCard from './SoftwareCard.svelte'

  const ANIMATION_DELAY_MS = 30

  interface Props {
    class?: string
  }

  let { class: className = '' }: Props = $props()

  // Reactive filtered list - will update when app.filter, app.search, or app.software changes
  let filtered = $derived(getFiltered())
  let selectedSet = $derived(app.selected)

  function handleToggle(key: PackageKey) {
    toggleSoftware(key)
  }
</script>

<div
  id="software-grid"
  class="software-grid {className}"
  class:list-view={app.view === 'list'}
>
  {#each filtered as [key, pkg], index (key)}
    <SoftwareCard
      {key}
      {pkg}
      selected={selectedSet.has(key)}
      delay={index * ANIMATION_DELAY_MS}
      onToggle={handleToggle}
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

<!-- Styles are in software-card.styles.css (layer: components) -->
