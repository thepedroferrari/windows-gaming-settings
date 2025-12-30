<script lang="ts">
  /**
   * Optimizations Section - Upgrades/tweaks selection
   *
   * Renders all optimization checkboxes grouped by tier and category.
   */

  import { app, toggleWizardMode, acknowledgeLudicrous } from '$lib/state.svelte'
  import {
    OPTIMIZATIONS,
    getOptimizationsByTierAndCategory,
    getCategoriesForTier,
    type OptimizationCategory,
  } from '$lib/optimizations'
  import { OPTIMIZATION_TIERS, OPTIMIZATION_KEYS, type OptimizationTier } from '$lib/types'
  import OptimizationCheckbox from './OptimizationCheckbox.svelte'
  import DnsProviderSelector from './DnsProviderSelector.svelte'

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

  /** Tier order for rendering - LUDICROUS excluded from normal flow */
  const NORMAL_TIERS: readonly OptimizationTier[] = [
    OPTIMIZATION_TIERS.SAFE,
    OPTIMIZATION_TIERS.CAUTION,
    OPTIMIZATION_TIERS.RISKY,
  ] as const

  /** Tier display names */
  const TIER_LABELS: Record<OptimizationTier, string> = {
    [OPTIMIZATION_TIERS.SAFE]: 'Safe',
    [OPTIMIZATION_TIERS.CAUTION]: 'Caution',
    [OPTIMIZATION_TIERS.RISKY]: 'Risky',
    [OPTIMIZATION_TIERS.LUDICROUS]: 'Ludicrous',
  }

  /** Reference to LUDICROUS dialog element */
  let ludicrousDialog: HTMLDialogElement | null = $state(null)

  function handleWizardToggle() {
    toggleWizardMode()
  }

  function openLudicrousModal() {
    ludicrousDialog?.showModal()
  }

  function closeLudicrousModal() {
    ludicrousDialog?.close()
  }

  function confirmLudicrous() {
    acknowledgeLudicrous()
    ludicrousDialog?.close()
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
    {#each NORMAL_TIERS as tier}
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
              {#if opt.key === OPTIMIZATION_KEYS.DNS && app.optimizations.has(OPTIMIZATION_KEYS.DNS)}
                <DnsProviderSelector />
              {/if}
            {/each}
          </fieldset>
        {/if}
      {/each}
    {/each}
  </div>

  <!-- LUDICROUS Tier Section -->
  <div class="ludicrous-section">
    {#if app.ui.ludicrousAcknowledged}
      <!-- Show LUDICROUS optimizations after acknowledgment -->
      <div class="ludicrous-unlocked">
        <div class="ludicrous-header">
          <span class="tier tier-ludicrous">Ludicrous</span>
          <span class="ludicrous-warning-badge">Security Disabled</span>
        </div>
        <div class="upgrades-grid upgrades-grid--ludicrous">
          {#each getCategoriesForTier(OPTIMIZATION_TIERS.LUDICROUS) as category}
            {@const opts = getOptimizationsByTierAndCategory(OPTIMIZATION_TIERS.LUDICROUS, category)}
            {#if opts.length > 0}
              <fieldset class="tier-ludicrous-field">
                <legend>
                  <span class="tier tier-ludicrous">{TIER_LABELS[OPTIMIZATION_TIERS.LUDICROUS]}</span>
                  {CATEGORY_LABELS[category]}
                </legend>
                {#each opts as opt (opt.key)}
                  <OptimizationCheckbox {opt} />
                {/each}
              </fieldset>
            {/if}
          {/each}
        </div>
      </div>
    {:else}
      <!-- Show unlock button before acknowledgment -->
      <div class="ludicrous-locked">
        <button type="button" class="ludicrous-unlock-btn" onclick={openLudicrousModal}>
          <span class="unlock-icon">&#9888;</span>
          <span class="unlock-text">Reveal Dangerous Options</span>
          <span class="unlock-hint">Disable CPU security mitigations (not recommended)</span>
        </button>
      </div>
    {/if}
  </div>

  <!-- LUDICROUS Acknowledgment Dialog - uses native <dialog> -->
  <dialog
    bind:this={ludicrousDialog}
    class="ludicrous-dialog"
    aria-labelledby="ludicrous-dialog-title"
  >
    <div class="ludicrous-dialog-header">
      <svg class="danger-icon" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
      </svg>
      <h3 id="ludicrous-dialog-title">Warning: Dangerous Optimizations</h3>
    </div>

    <div class="ludicrous-dialog-body">
      <p class="danger-intro">
        <strong>These options disable real security features.</strong> This is not a joke or exaggeration.
        Anyone who knows you have these disabled can attack your computer.
      </p>

      <div class="cve-section">
        <h4>CVEs You Will Be Vulnerable To:</h4>
        <ul class="cve-list">
          <li>
            <a href="https://nvd.nist.gov/vuln/detail/CVE-2017-5753" target="_blank" rel="noopener">CVE-2017-5753</a>
            <span class="cve-name">(Spectre V1)</span> — Bounds check bypass
          </li>
          <li>
            <a href="https://nvd.nist.gov/vuln/detail/CVE-2017-5715" target="_blank" rel="noopener">CVE-2017-5715</a>
            <span class="cve-name">(Spectre V2)</span> — Branch target injection
          </li>
          <li>
            <a href="https://nvd.nist.gov/vuln/detail/CVE-2017-5754" target="_blank" rel="noopener">CVE-2017-5754</a>
            <span class="cve-name">(Meltdown)</span> — Rogue data cache load
          </li>
        </ul>
      </div>

      <div class="attack-vectors">
        <h4>How You Can Be Attacked:</h4>
        <ul>
          <li><strong>Any website</strong> can read your passwords from memory</li>
          <li><strong>Any JavaScript</strong> can access other tabs' data</li>
          <li><strong>Any game with mods</strong> can take full control</li>
          <li><strong>Anti-cheat bypasses</strong> become trivial</li>
        </ul>
      </div>

      <div class="only-for">
        <h4>Only Use These If:</h4>
        <ul>
          <li>This is a dedicated, <strong>completely offline</strong> benchmarking PC</li>
          <li>You will <strong>never</strong> browse the web on this machine</li>
          <li>You will <strong>never</strong> run untrusted executables</li>
          <li>You understand <strong>you are responsible</strong> for the consequences</li>
        </ul>
      </div>

      <div class="research-links">
        <span>Research before proceeding:</span>
        <a href="https://meltdownattack.com" target="_blank" rel="noopener">meltdownattack.com</a>
        <a href="https://spectreattack.com" target="_blank" rel="noopener">spectreattack.com</a>
      </div>
    </div>

    <div class="ludicrous-dialog-footer">
      <button type="button" class="btn-secondary" onclick={closeLudicrousModal}>
        Cancel (Stay Safe)
      </button>
      <button type="button" class="btn-danger" onclick={confirmLudicrous}>
        I Understand the Risks
      </button>
    </div>
  </dialog>
</section>
