<script lang="ts">
  /**
   * Optimizations Section - Upgrades/tweaks selection
   *
   * Renders all optimization checkboxes grouped by tier and category.
   */

  import { app, toggleWizardMode } from '$lib/state.svelte'
  import {
    OPTIMIZATIONS,
    getOptimizationsByTierAndCategory,
    getCategoriesForTier,
    type OptimizationCategory,
  } from '$lib/optimizations'
  import { OPTIMIZATION_TIERS, type OptimizationTier } from '$lib/types'
  import OptimizationCheckbox from './OptimizationCheckbox.svelte'

  /** Category display names */
  const CATEGORY_LABELS: Record<OptimizationCategory, string> = {
    system: 'System',
    power: 'Power',
    network: 'Network',
    input: 'Input',
    display: 'Display',
    privacy: 'Privacy',
    audio: 'Audio',
  }

  /** Tier order for rendering */
  const TIER_ORDER: readonly OptimizationTier[] = [
    OPTIMIZATION_TIERS.SAFE,
    OPTIMIZATION_TIERS.CAUTION,
    OPTIMIZATION_TIERS.RISKY,
  ] as const

  /** Tier display names */
  const TIER_LABELS: Record<OptimizationTier, string> = {
    [OPTIMIZATION_TIERS.SAFE]: 'Safe',
    [OPTIMIZATION_TIERS.CAUTION]: 'Caution',
    [OPTIMIZATION_TIERS.RISKY]: 'Risky',
  }

  function handleWizardToggle() {
    toggleWizardMode()
  }
</script>

<section id="optimizations" class="step">
  <div class="step-header">
    <div class="step-header__left">
      <h2><span class="step-num">3</span> Upgrades</h2>
      <p class="step-desc">Safe options enabled by default — hover for details</p>
    </div>
    <div class="step-header__right">
      <div class="wizard-toggle">
        <span class="toggle-label">
          <strong>Wizard Mode</strong>
          <span class="toggle-hint">Review each change</span>
        </span>
        <div class="cyber-toggle">
          <input
            type="checkbox"
            id="wizard-mode"
            class="cyber-toggle-input"
            checked={app.ui.wizardMode}
            onchange={handleWizardToggle}
          />
          <label for="wizard-mode" class="cyber-toggle-label">
            <svg
              class="cyber-toggle-svg"
              height="28"
              width="64"
              viewBox="0 0 64 28"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g class="cyber-toggle-track">
                {#each Array(10) as _, row}
                  <g class="pixel-row">
                    {#each Array(11) as _, col}
                      <rect x={4 + col * 2} y={4 + row * 2} width="2" height="2" />
                    {/each}
                  </g>
                {/each}
              </g>
            </svg>
          </label>
        </div>
      </div>
    </div>
  </div>

  <!-- Wizard Modal (placeholder - will be a separate component) -->
  <dialog id="wizard-modal" class="wizard-modal">
    <div class="wizard-content">
      <h3 id="wizard-title">Optimization Name</h3>
      <div class="wizard-risk">
        <span id="wizard-risk-badge" class="tier tier-safe">Safe</span>
      </div>
      <div id="wizard-description" class="wizard-description">
        <p>Description of what this optimization does...</p>
      </div>
      <div class="wizard-details">
        <h4>What it modifies:</h4>
        <ul id="wizard-changes"></ul>
      </div>
      <div class="wizard-actions">
        <button type="button" id="wizard-cancel" class="btn-secondary">Cancel</button>
        <button type="button" id="wizard-confirm" class="download-btn">
          <span class="text">Enable This</span>
          <span class="shimmer"></span>
        </button>
      </div>
    </div>
  </dialog>

  <div class="upgrades-grid">
    {#each TIER_ORDER as tier}
      {#each getCategoriesForTier(tier) as category}
        {@const opts = getOptimizationsByTierAndCategory(tier, category)}
        {#if opts.length > 0}
          <fieldset class="tier-{tier}-field">
            <legend>
              <span class="tier tier-{tier}">{TIER_LABELS[tier]}</span>
              {CATEGORY_LABELS[category]}
            </legend>
            {#each opts as opt (opt.key)}
              <OptimizationCheckbox {opt} />
            {/each}
          </fieldset>
        {/if}
      {/each}
    {/each}
  </div>
</section>
