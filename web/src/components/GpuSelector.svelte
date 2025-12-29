<script lang="ts">
  /**
   * GPU Selector - Radio group for GPU type selection
   */

  import { app, setGpu } from '$lib/state.svelte'
  import { GPU_OPTIONS } from '$lib/hardware'
  import { isGpuType } from '$lib/types'

  function handleChange(event: Event & { currentTarget: HTMLInputElement }) {
    const { value } = event.currentTarget
    if (isGpuType(value)) {
      setGpu(value)
    }
  }
</script>

<fieldset>
  <legend>
    <span class="legend-badge legend-badge--hardware">GPU</span>
    <svg
      class="legend-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 12h.01" />
      <path d="M10 12h.01" />
      <path d="M14 12h.01" />
      <path d="M18 12h.01" />
      <path d="M6 8v8" />
      <path d="M22 10v4" />
    </svg>
  </legend>
  {#each GPU_OPTIONS as option (option.value)}
    <label>
      <input
        type="radio"
        name="gpu"
        value={option.value}
        checked={app.hardware.gpu === option.value}
        onchange={handleChange}
      />
      <span class="label-text">{option.label}</span>
      <span class="label-hint">{option.hint}</span>
    </label>
  {/each}
</fieldset>
