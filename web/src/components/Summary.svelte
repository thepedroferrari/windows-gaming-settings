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

<div class="summary-shell">
  <div id="summary" class="summary">
    <span class="corner corner--tl"></span>
    <span class="corner corner--tr"></span>
    <span class="corner corner--bl"></span>
    <span class="corner corner--br"></span>
    <div class="item">
      <div id="summary-hardware" class="value">{hardwareLabel}</div>
      <div class="label">Core</div>
    </div>
    <div class="item">
      <div id="summary-opts" class="value">{optimizationCount}</div>
      <div class="label">Upgrades</div>
    </div>
    <div class="item">
      <div id="summary-software" class="value">{softwareCount}</div>
      <div class="label">Arsenal</div>
    </div>
  </div>
</div>
