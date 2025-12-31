<script lang="ts">
  /**
   * Optimization Checkbox - Card-style toggle with tooltip
   * Checkbox is visually hidden but retained for accessibility
   */

  import { app, toggleOptimization } from '$lib/state.svelte'
  import type { OptimizationDef } from '$lib/optimizations'
  import { tooltip } from '../utils/tooltips'

  interface Props {
    opt: OptimizationDef
  }

  let { opt }: Props = $props()

  // Derived: is this optimization currently enabled
  let isChecked = $derived(app.optimizations.has(opt.key))

  function handleChange() {
    toggleOptimization(opt.key)
  }
</script>

<label class:selected={isChecked} data-opt={opt.key} use:tooltip={opt.tooltip}>
  <input
    type="checkbox"
    name="opt"
    id="opt-{opt.key}"
    value={opt.key}
    checked={isChecked}
    onchange={handleChange}
    aria-describedby="opt-hint-{opt.key}"
    class="sr-only"
  />
  <span class="label-text">{opt.label}</span>
  <span class="preset-badge" hidden></span>
  <span class="label-hint" id="opt-hint-{opt.key}">{opt.hint}</span>
  <span class="corner-indicator" aria-hidden="true"></span>
</label>
