<script lang="ts">
  /**
   * ForgeSection - Script generation section (Step 5)
   *
   * Final section with:
   * - Status indicator
   * - Preflight checks
   * - Profile save/load
   * - Preview and Download actions
   */

  import { app, openPreviewModal, generateCurrentScript } from '$lib/state.svelte'
  import { SCRIPT_FILENAME } from '$lib/types'
  import { downloadText } from '../utils/download'
  import Summary from './Summary.svelte'
  import PreflightChecks from './PreflightChecks.svelte'
  import ProfileActions from './ProfileActions.svelte'

  function handlePreview() {
    openPreviewModal()
  }

  function handleDownload() {
    // Use edited script if available, otherwise use reactively generated script
    const script = app.script.edited ?? generateCurrentScript()
    if (!script.trim()) return
    downloadText(script, SCRIPT_FILENAME)
  }
</script>

<section id="generate" class="step step--forge">
  <div class="header-row">
    <div class="header-left">
      <h2><span class="step-num">5</span> Forge Script</h2>
      <p class="step-desc">Your personalized loadout is ready</p>
    </div>
    <div class="status">
      <span class="indicator"></span>
      <span class="text">SYSTEM READY</span>
    </div>
  </div>

  <Summary />

  <PreflightChecks />
  <ProfileActions />

  <div class="actions">
    <button
      type="button"
      class="btn-preview"
      title="Preview the generated PowerShell script"
      onclick={handlePreview}
    >
      <svg
        class="icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      Preview
    </button>

    <button
      type="button"
      class="btn-forge"
      title="Download the generated PowerShell script"
      onclick={handleDownload}
    >
      <span class="text">
        <svg
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        FORGE
      </span>
      <span class="glitch"></span>
      <span class="scanlines"></span>
    </button>
  </div>
</section>

<!-- Styles are in forge.styles.css (layer: components) -->
