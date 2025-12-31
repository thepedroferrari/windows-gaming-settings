<script lang="ts">
  /**
   * Optimizations Section - Upgrades/tweaks selection
   *
   * Renders all optimization checkboxes grouped by tier and category.
   */

  import {
    app,
    toggleWizardMode,
    acknowledgeLudicrous,
    acknowledgeRestorePointDisable,
    toggleOptimization,
  } from '$lib/state.svelte'
  import {
    OPTIMIZATIONS,
    getOptimizationsByTierAndCategory,
    getCategoriesForTier,
    type OptimizationCategory,
  } from '$lib/optimizations'
  import { OPTIMIZATION_TIERS, OPTIMIZATION_KEYS, type OptimizationTier, type OptimizationKey } from '$lib/types'
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
  /** Reference to restore point dialog element */
  let restorePointDialog: HTMLDialogElement | null = $state(null)

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

  // Restore Point Modal Handlers
  function openRestorePointModal() {
    restorePointDialog?.showModal()
  }

  function closeRestorePointModal() {
    restorePointDialog?.close()
  }

  function confirmRestorePointDisable() {
    acknowledgeRestorePointDisable()
    toggleOptimization(OPTIMIZATION_KEYS.RESTORE_POINT)
    restorePointDialog?.close()
  }

  /**
   * Intercept toggle for restore_point - show modal if trying to disable without acknowledgment
   */
  function handleBeforeToggle(key: OptimizationKey, isCurrentlyChecked: boolean): boolean {
    // Only intercept restore_point when trying to DISABLE it
    if (key === OPTIMIZATION_KEYS.RESTORE_POINT && isCurrentlyChecked) {
      // If not yet acknowledged, show modal and block toggle
      if (!app.ui.restorePointAcknowledged) {
        openRestorePointModal()
        return false
      }
    }
    return true
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
              <OptimizationCheckbox {opt} onBeforeToggle={handleBeforeToggle} />
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
      <!-- Unified LUDICROUS Placard V2 -->
      <article class="ludicrous-placard-v2">
        <header class="placard-header-grid">
          <div class="placard-header-left">
            <!-- Stylized skull icon with glow animation -->
            <svg class="placard-skull-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Skull outline -->
              <path d="M32 4C18 4 8 16 8 28c0 8 4 15 10 19v9c0 2 2 4 4 4h20c2 0 4-2 4-4v-9c6-4 10-11 10-19 0-12-10-24-24-24z" fill="currentColor" opacity="0.15"/>
              <path d="M32 4C18 4 8 16 8 28c0 8 4 15 10 19v9c0 2 2 4 4 4h20c2 0 4-2 4-4v-9c6-4 10-11 10-19 0-12-10-24-24-24z" stroke="currentColor" stroke-width="2" fill="none"/>
              <!-- Left eye socket -->
              <ellipse cx="22" cy="28" rx="6" ry="7" fill="currentColor"/>
              <!-- Right eye socket -->
              <ellipse cx="42" cy="28" rx="6" ry="7" fill="currentColor"/>
              <!-- Nose cavity -->
              <path d="M32 36l-4 8h8l-4-8z" fill="currentColor"/>
              <!-- Teeth marks -->
              <path d="M22 52v4M27 52v4M32 52v4M37 52v4M42 52v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="placard-header-right">
            <h2>Danger Zone: Security Off</h2>
            <p class="placard-desc">
              Benchmark mode. Treat system as disposable and offline only.
            </p>
          </div>
        </header>

        <div class="placard-blocks-horizontal">
          <section class="placard-block">
            <h3>Before You Flip</h3>
            <dl class="placard-list">
              <div class="placard-item">
                <dt>01</dt>
                <dd>Create a restore point or full image backup</dd>
              </div>
              <div class="placard-item">
                <dt>02</dt>
                <dd>Disconnect internet, Bluetooth, and external storage</dd>
              </div>
              <div class="placard-item">
                <dt>03</dt>
                <dd>Use a clean, dedicated benchmark user or install</dd>
              </div>
              <div class="placard-item">
                <dt>04</dt>
                <dd>Have recovery media ready (USB)</dd>
              </div>
            </dl>
          </section>

          <section class="placard-block">
            <h3>Rules While Enabled</h3>
            <dl class="placard-list">
              <div class="placard-item">
                <dt>A</dt>
                <dd>No browsing, email, chat, or logins</dd>
              </div>
              <div class="placard-item">
                <dt>B</dt>
                <dd>No mods, overlays, or third-party executables</dd>
              </div>
              <div class="placard-item">
                <dt>C</dt>
                <dd>Run only the benchmark, then exit</dd>
              </div>
              <div class="placard-item">
                <dt>D</dt>
                <dd>Monitor temps and stability; stop on errors</dd>
              </div>
            </dl>
          </section>

          <section class="placard-block">
            <h3>Rollback Plan</h3>
            <dl class="placard-list">
              <div class="placard-item">
                <dt>REC</dt>
                <dd>Re-enable mitigations immediately after testing</dd>
              </div>
              <div class="placard-item">
                <dt>REB</dt>
                <dd>Reboot and verify VBS/HVCI status</dd>
              </div>
              <div class="placard-item">
                <dt>UPD</dt>
                <dd>Run Windows Update before daily use</dd>
              </div>
              <div class="placard-item">
                <dt>RST</dt>
                <dd>If anything looks off, restore from backup</dd>
              </div>
            </dl>
          </section>
        </div>

        <div class="placard-opts-grid">
          {#each getCategoriesForTier(OPTIMIZATION_TIERS.LUDICROUS) as category}
            {#each getOptimizationsByTierAndCategory(OPTIMIZATION_TIERS.LUDICROUS, category) as opt (opt.key)}
              <div class="placard-opt-cell">
                <OptimizationCheckbox {opt} />
              </div>
            {/each}
          {/each}
        </div>

        <footer class="placard-footer-v2">
          <mark>OFFLINE ONLY</mark>
          <mark>EXPECT BREAKAGE</mark>
          <mark>ROLLBACK REQUIRED</mark>
        </footer>
      </article>
    {:else}
      <!-- Show unlock button before acknowledgment -->
      <div class="ludicrous-locked">
        <div class="ludicrous-warning-card">
          <div class="ludicrous-warning-copy">
            <span class="warning-eyebrow">Restricted Section</span>
            <h3>Dangerous Options Locked</h3>
            <p class="warning-desc">
              These disable CPU security mitigations (Spectre/Meltdown class). Only for offline benchmark rigs.
            </p>
            <div class="warning-tags">
              <span>Offline-only</span>
              <span>No web</span>
              <span>At your own risk</span>
            </div>
          </div>
          <button type="button" class="ludicrous-unlock-btn" onclick={openLudicrousModal}>
            <svg class="unlock-icon" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            <span class="unlock-text">Reveal Dangerous Options</span>
            <span class="unlock-hint">Disable CPU security mitigations (not recommended)</span>
          </button>
        </div>
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

  <!-- Restore Point Acknowledgment Dialog -->
  <dialog
    bind:this={restorePointDialog}
    class="restore-point-dialog"
    aria-labelledby="restore-point-dialog-title"
  >
    <div class="restore-point-dialog-header">
      <svg class="warning-icon" viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <h3 id="restore-point-dialog-title">Disabling Restore Point?</h3>
    </div>

    <div class="restore-point-dialog-body">
      <p class="restore-point-intro">
        <strong>Restore points are your safety net.</strong> Without one, you may need to reinstall Windows
        if something goes wrong.
      </p>

      <div class="restore-point-why">
        <h4>Why This Matters:</h4>
        <ul>
          <li>RockTune modifies registry keys, services, and system settings</li>
          <li>Some changes cannot be undone by simply "unchecking" them</li>
          <li><strong>System Restore is the only guaranteed rollback</strong> for most tweaks</li>
          <li>Takes 2 minutes to create, hours to reinstall Windows</li>
        </ul>
      </div>

      <div class="restore-point-command">
        <h4>Create One Now (PowerShell as Admin):</h4>
        <code>Checkpoint-Computer -Description "Before RockTune"</code>
      </div>

      <p class="restore-point-warning">
        If you disable this, the generated script will <strong>not</strong> create a restore point automatically.
        You are responsible for your own rollback plan.
      </p>
    </div>

    <div class="restore-point-dialog-footer">
      <button type="button" class="btn-secondary" onclick={closeRestorePointModal}>
        Keep It Enabled
      </button>
      <button type="button" class="btn-caution" onclick={confirmRestorePointDisable}>
        I Have My Own Backup Plan
      </button>
    </div>
  </dialog>
</section>
