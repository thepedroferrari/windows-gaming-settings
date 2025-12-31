<script lang="ts">
  /**
   * Optimization Checkbox - Card-style toggle with tooltip
   * Checkbox is visually hidden but retained for accessibility
   */

  import { app, toggleOptimization } from '$lib/state.svelte'
  import type { OptimizationDef } from '$lib/optimizations'
  import type { OptimizationKey } from '$lib/types'
  import { tooltip } from '../utils/tooltips'

  interface Props {
    opt: OptimizationDef
    /**
     * Optional callback before toggle. Return false to prevent the toggle.
     * Called with (key, isCurrentlyChecked) - so if isCurrentlyChecked is true,
     * the user is trying to UNCHECK it.
     */
    onBeforeToggle?: (key: OptimizationKey, isCurrentlyChecked: boolean) => boolean
  }

  let { opt, onBeforeToggle }: Props = $props()

  // Derived: is this optimization currently enabled
  let isChecked = $derived(app.optimizations.has(opt.key))

  function handleChange() {
    // If callback provided and returns false, don't toggle
    if (onBeforeToggle && !onBeforeToggle(opt.key, isChecked)) {
      return
    }
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
