<script lang="ts">
  import PresetCards from './PresetCards.svelte'
  import {
    app,
    setActivePreset,
    setSelection,
    setRecommendedPackages,
    clearRecommendedPackages,
    setFilter,
    setOptimizations,
  } from '$lib/state.svelte'
  import { isPackageKey, type PackageKey, type PresetType, type OptimizationKey } from '$lib/types'
  import type { PresetConfig } from '$lib/presets'
  import { FILTER_ALL, FILTER_RECOMMENDED } from '$lib/types'

  let activePreset = $derived(app.activePreset)

  function applyOptimizations(keys: readonly OptimizationKey[]) {
    if (keys.length === 0) return
    setOptimizations(keys)
  }

  function getDefaultSelection(): PackageKey[] {
    return Object.entries(app.software)
      .filter(([, pkg]) => pkg.selected)
      .map(([key]) => key)
      .filter((key): key is PackageKey => isPackageKey(app.software, key))
  }

  function handlePresetSelect(preset: PresetType, config: PresetConfig) {
    if (app.activePreset === preset) {
      setActivePreset(null)
      clearRecommendedPackages()
      setFilter(FILTER_ALL)
      return
    }

    setActivePreset(preset)
    setSelection(getDefaultSelection())
    setRecommendedPackages(config.software)
    setFilter(FILTER_RECOMMENDED)
    applyOptimizations(config.opts)
  }
</script>

<PresetCards activePreset={activePreset} onPresetSelect={handlePresetSelect} />

{#if activePreset}
  <div id="preset-actions" class="preset-actions">
    <a
      href="#generate"
      class="preset-action-btn preset-action-btn--primary"
    >
      <svg
        class="btn-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Forge Script
    </a>
    <a
      href="#hardware"
      class="preset-action-btn preset-action-btn--secondary"
    >
      <svg
        class="btn-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M12 20h9" />
        <path
          d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        />
      </svg>
      Customize First
    </a>
  </div>
{/if}

