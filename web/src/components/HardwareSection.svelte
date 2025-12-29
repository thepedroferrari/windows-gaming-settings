<script lang="ts">
  /**
   * Hardware Section - CPU/GPU selection and driver recommendations
   *
   * Replaces the static HTML hardware section with reactive Svelte components.
   */

  import CpuSelector from './CpuSelector.svelte'
  import GpuSelector from './GpuSelector.svelte'
  import DriverCards from './DriverCards.svelte'
</script>

<section id="hardware" class="step">
  <div class="step-header">
    <div class="step-header__left">
      <h2><span class="step-num">1</span> Hardware</h2>
      <p class="step-desc">
        Select your CPU and GPU to enable the right optimizations
      </p>
    </div>
    <div class="step-header__right">
      <button
        type="button"
        class="help-trigger"
        popovertarget="hardware-help"
        style="anchor-name: --hw-help-anchor"
      >
        Don't know your specs?
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <circle cx="12" cy="17" r="0.5" fill="currentColor" />
        </svg>
      </button>
    </div>
  </div>

  <div id="hardware-help" popover class="hardware-help-panel">
    <div class="help-section">
      <h4>How to find your CPU</h4>
      <p>
        Press <kbd>Win</kbd> + <kbd>Pause</kbd> or search
        <strong>"System Information"</strong> in Start
      </p>
      <p>
        Look for <strong>Processor</strong> — e.g., "AMD Ryzen 7 7800X3D" or
        "Intel Core i7-13700K"
      </p>
      <p class="tip">
        X3D chips have extra cache for gaming — if yours ends in "X3D", select
        the first option!
      </p>
    </div>
    <div class="help-section">
      <h4>How to find your GPU</h4>
      <p>
        Press <kbd>Win</kbd> + <kbd>X</kbd> →
        <strong>Device Manager</strong> →
        <strong>Display adapters</strong>
      </p>
      <p>
        Or right-click Desktop → <strong>Display settings</strong> → scroll to
        <strong>Advanced display</strong>
      </p>
      <p class="tip">GeForce = NVIDIA, Radeon = AMD, Arc = Intel</p>
    </div>
  </div>

  <div class="core-grid">
    <CpuSelector />
    <GpuSelector />
  </div>

  <DriverCards />
</section>
