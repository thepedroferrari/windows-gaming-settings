<script lang="ts">
  import {
    app,
    setFilter,
    getCategoryCounts,
    getSelectedCount,
    clearSelection,
    setRecommendedPackages,
    clearRecommendedPackages,
  } from '$lib/state.svelte'
  import type { FilterValue } from '$lib/types'
  import type { RecommendedPreset } from '$lib/presets'
  import {
    CATEGORIES,
    FILTER_ALL,
    FILTER_SELECTED,
    FILTER_RECOMMENDED,
  } from '$lib/types'

  interface Props {
    recommendedPreset?: RecommendedPreset | null
  }

  let { recommendedPreset = null }: Props = $props()

  let counts = $derived(getCategoryCounts())
  let selectedCount = $derived(getSelectedCount())
  let activeFilter = $derived(app.filter)

  let visibleCategories = $derived(
    CATEGORIES.filter((cat) => counts[cat] > 0)
  )

  const FILTER_ANIMATION_DELAY_MS = 30
  let presetOffset = $derived(recommendedPreset ? 1 : 0)

  $effect(() => {
    if (recommendedPreset?.software) {
      setRecommendedPackages(recommendedPreset.software)
    } else {
      clearRecommendedPackages()
    }
  })

  function handleFilterClick(filter: FilterValue) {
    setFilter(filter)
  }

  function handleClearAll() {
    clearSelection()
  }
</script>

<div class="arsenal-toolbar">
  <!-- Search + Action Row -->
  <search class="search-row">
    <div class="search-wrap">
      <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        id="software-search"
        type="search"
        class="search-input"
        placeholder="Search..."
        bind:value={app.search}
        aria-label="Search software packages"
      />
    </div>

    <div class="action-zone" class:has-selection={selectedCount > 0}>
      <button
        type="button"
        class="selected-count-btn"
        class:active={activeFilter === FILTER_SELECTED}
        data-filter="selected"
        onclick={() => handleFilterClick(FILTER_SELECTED)}
      >
        <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span class="selected-num" id="software-counter">{selectedCount}</span>
        <span class="selected-label">Selected</span>
      </button>
      {#if selectedCount > 0}
        <button
          type="button"
          id="clear-all-software"
          class="purge-btn"
          onclick={handleClearAll}
        >
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          PURGE
        </button>
      {/if}
    </div>
  </search>

  <!-- Filter Row -->
  <div class="filter-row">
    <div class="filter-scroll">
      {#if recommendedPreset}
        <button
          type="button"
          class="filter filter--recommended"
          class:active={activeFilter === FILTER_RECOMMENDED}
          style:animation-delay="0ms"
          onclick={() => handleFilterClick(FILTER_RECOMMENDED)}
        >
          {recommendedPreset.displayName}
        </button>
      {/if}

      <button
        type="button"
        class="filter"
        class:active={activeFilter === FILTER_ALL}
        style:animation-delay="{presetOffset * FILTER_ANIMATION_DELAY_MS}ms"
        data-filter="*"
        onclick={() => handleFilterClick(FILTER_ALL)}
      >
        All
      </button>

      {#each visibleCategories as category, i (category)}
        <button
          type="button"
          class="filter"
          class:active={activeFilter === category}
          style:animation-delay="{(presetOffset + 1 + i) * FILTER_ANIMATION_DELAY_MS}ms"
          data-filter={category}
          onclick={() => handleFilterClick(category)}
        >
          {category}
        </button>
      {/each}
    </div>
  </div>
</div>
