<script lang="ts">
  /**
   * Peripherals Section - Companion software for gaming gear and monitors
   *
   * Replaces the static HTML peripherals section with reactive Svelte components.
   */

  import { app, togglePeripheral, toggleMonitorSoftware } from '$lib/state.svelte'
  import {
    PERIPHERAL_OPTIONS,
    MONITOR_OPTIONS,
    PERIPHERAL_LINKS,
    MONITOR_LINKS,
  } from '$lib/peripherals'
  import { isMonitorSoftwareType, isPeripheralType } from '$lib/types'

  function handlePeripheralChange(event: Event & { currentTarget: HTMLInputElement }) {
    const { value } = event.currentTarget
    if (isPeripheralType(value)) {
      togglePeripheral(value)
    }
  }

  function handleMonitorChange(event: Event & { currentTarget: HTMLInputElement }) {
    const { value } = event.currentTarget
    if (isMonitorSoftwareType(value)) {
      toggleMonitorSoftware(value)
    }
  }
</script>

<section id="peripherals" class="step">
  <h2><span class="step-num">2</span> Peripherals</h2>
  <p class="step-desc">Install companion software for your gaming gear</p>

  <div class="peripherals-grid">
    <!-- Gear Section -->
    <fieldset class="peripherals-fieldset peripherals-fieldset--gear">
      <legend>
        <span class="legend-badge legend-badge--peripherals">Gear</span>
        <svg
          class="legend-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="2" y="6" width="13" height="12" rx="2" />
          <path d="m22 12-4-4v8l4-4Z" />
          <circle cx="8" cy="12" r="2" />
        </svg>
      </legend>
      <div class="peripheral-columns">
        <div class="peripheral-column">
          <p class="peripheral-title">Auto-install</p>
          {#each PERIPHERAL_OPTIONS as option (option.value)}
            <label>
              <input
                type="checkbox"
                name="peripheral"
                id="peripheral-{option.value}"
                value={option.value}
                checked={app.peripherals.has(option.value)}
                onchange={handlePeripheralChange}
                aria-describedby="peripheral-hint-{option.value}"
              />
              <span class="label-text">{option.label}</span>
              <span class="label-hint" id="peripheral-hint-{option.value}">{option.hint}</span>
            </label>
          {/each}
        </div>
        <div class="peripheral-column">
          <p class="peripheral-title">Manual Download</p>
          <div class="peripheral-links peripheral-links--expanded">
            {#each PERIPHERAL_LINKS as link (link.url)}
              <a
                class="peripheral-link"
                href={link.url}
                target="_blank"
                rel="noopener"
              >
                <span class="peripheral-link-title">{link.title}</span>
                <span class="peripheral-link-action">↗</span>
              </a>
            {/each}
          </div>
        </div>
      </div>
    </fieldset>

    <!-- Monitors Section -->
    <fieldset class="peripherals-fieldset peripherals-fieldset--monitors">
      <legend>
        <span class="legend-badge legend-badge--peripherals">Monitors</span>
        <svg
          class="legend-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </legend>
      <div class="peripheral-columns">
        <div class="peripheral-column">
          <p class="peripheral-title">Auto-install</p>
          {#each MONITOR_OPTIONS as option (option.value)}
            <label>
              <input
                type="checkbox"
                name="monitor-software"
                id="monitor-{option.value}"
                value={option.value}
                checked={app.monitorSoftware.has(option.value)}
                onchange={handleMonitorChange}
                aria-describedby="monitor-hint-{option.value}"
              />
              <span class="label-text">{option.label}</span>
              <span class="label-hint" id="monitor-hint-{option.value}">{option.hint}</span>
            </label>
          {/each}
        </div>
        <div class="peripheral-column">
          <p class="peripheral-title">Manual Download</p>
          <div class="peripheral-links">
            {#each MONITOR_LINKS as link (link.url)}
              <a
                class="peripheral-link"
                href={link.url}
                target="_blank"
                rel="noopener"
              >
                <span class="peripheral-link-title">{link.title}</span>
                <span class="peripheral-link-action">↗</span>
              </a>
            {/each}
          </div>
        </div>
      </div>
    </fieldset>
  </div>
</section>
