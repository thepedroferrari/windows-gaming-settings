<script lang="ts">
  /**
   * Summary - Displays current loadout summary
   *
   * Reads hardware and optimization state from centralized app state.
   * Uses Svelte 5 $derived for all computed values.
   */
  import { app, getSelectedCount } from '$lib/state.svelte'
  import type { CpuType, GpuType } from '$lib/types'

  // Derived from centralized state
  let softwareCount = $derived(getSelectedCount())
  let optimizationCount = $derived(app.optimizationCount)

  const cpuLabels: Record<CpuType, string> = {
    amd_x3d: 'X3D',
    amd: 'AMD',
    intel: 'Intel',
  }

  const gpuLabels: Record<GpuType, string> = {
    nvidia: 'NVIDIA',
    amd: 'Radeon',
    intel: 'Arc',
  }

  let cpuLabel = $derived(cpuLabels[app.hardware.cpu] || app.hardware.cpu)
  let gpuLabel = $derived(gpuLabels[app.hardware.gpu] || app.hardware.gpu)
  let hardwareLabel = $derived(`${cpuLabel} + ${gpuLabel}`)
</script>

<div id="summary" class="summary">
  <span class="summary-corner summary-corner--tl"></span>
  <span class="summary-corner summary-corner--tr"></span>
  <span class="summary-corner summary-corner--bl"></span>
  <span class="summary-corner summary-corner--br"></span>
  <div class="summary-item">
    <div id="summary-hardware" class="summary-value">{hardwareLabel}</div>
    <div class="summary-label">Core</div>
  </div>
  <div class="summary-item">
    <div id="summary-opts" class="summary-value">{optimizationCount}</div>
    <div class="summary-label">Upgrades</div>
  </div>
  <div class="summary-item">
    <div id="summary-software" class="summary-value">{softwareCount}</div>
    <div class="summary-label">Arsenal</div>
  </div>
</div>
