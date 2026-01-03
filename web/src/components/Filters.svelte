<script lang="ts">
  import {
    app,
    setFilter,
    getCategoryCounts,
    getSelectedCount,
    clearSelection,
    setRecommendedPackages,
    clearRecommendedPackages,
  } from "$lib/state.svelte";
  import type { FilterValue } from "$lib/types";
  import type { RecommendedPreset } from "$lib/presets";
  import {
    CATEGORIES,
    FILTER_ALL,
    FILTER_SELECTED,
    FILTER_RECOMMENDED,
  } from "$lib/types";

  interface Props {
    recommendedPreset?: RecommendedPreset | null;
  }

  let { recommendedPreset = null }: Props = $props();

  let counts = $derived(getCategoryCounts());
  let selectedCount = $derived(getSelectedCount());
  let activeFilter = $derived(app.filter);

  let visibleCategories = $derived(CATEGORIES.filter((cat) => counts[cat] > 0));

  const FILTER_ANIMATION_DELAY_MS = 30;
  let presetOffset = $derived(recommendedPreset ? 1 : 0);

  let badgeRef: HTMLSpanElement | null = $state(null);
  let prevCount = $state(0);

  $effect(() => {
    const count = selectedCount;
    if (count !== prevCount && badgeRef && prevCount !== 0) {
      badgeRef.animate(
        [
          { transform: "scale(1.4)", textShadow: "0 0 12px var(--accent)" },
          {
            transform: "scale(1)",
            textShadow: "var(--glow-sm) var(--accent-glow)",
          },
        ],
        {
          duration: 250,
          easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        },
      );
    }
    prevCount = count;
  });

  $effect(() => {
    if (recommendedPreset?.software) {
      setRecommendedPackages(recommendedPreset.software);
    } else {
      clearRecommendedPackages();
    }
  });

  function handleFilterClick(filter: FilterValue) {
    setFilter(filter);
  }

  function handleClearAll() {
    clearSelection();
  }
</script>

<div class="arsenal-toolbar">
  <div class="toolbar-controls">
    <!-- LEFT: Category filters (primary focus) -->
    <nav class="filter-nav" aria-label="Filter by category">
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
            style:animation-delay="{(presetOffset + 1 + i) *
              FILTER_ANIMATION_DELAY_MS}ms"
            data-filter={category}
            onclick={() => handleFilterClick(category)}
          >
            {category}
          </button>
        {/each}
      </div>
    </nav>

    <div class="toolbar-actions" class:has-selection={selectedCount > 0}>
      <button
        type="button"
        class="selection-badge"
        class:active={activeFilter === FILTER_SELECTED}
        data-count={selectedCount}
        aria-label="Show {selectedCount} selected items"
        onclick={() => handleFilterClick(FILTER_SELECTED)}
      >
        <svg
          class="badge-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span class="badge-count" bind:this={badgeRef}>{selectedCount}</span>
      </button>

      {#if selectedCount > 0}
        <button
          type="button"
          id="clear-all-software"
          class="purge-btn"
          aria-label="Clear all selections"
          onclick={handleClearAll}
        >
          <svg
            class="btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      {/if}

      <search class="search-compact">
        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          id="software-search"
          name="software-search"
          type="search"
          class="search-input"
          placeholder="Find..."
          autocomplete="off"
          bind:value={app.search}
          aria-label="Search software packages"
        />
      </search>
    </div>
  </div>
</div>
