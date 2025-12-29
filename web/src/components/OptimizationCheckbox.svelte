<script lang="ts">
  /**
   * Optimization Checkbox - Individual optimization toggle with tooltip
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

<label data-opt={opt.key} use:tooltip={opt.tooltip}>
  <input
    type="checkbox"
    name="opt"
    value={opt.key}
    checked={isChecked}
    onchange={handleChange}
  />
  <span class="label-text">{opt.label}</span>
  <span class="preset-badge" hidden></span>
  <span class="label-hint">{opt.hint}</span>
</label>
