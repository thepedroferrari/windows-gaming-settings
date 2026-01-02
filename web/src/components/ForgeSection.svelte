<script lang="ts">
  /**
   * ForgeSection - Script generation section (Step 5)
   *
   * Final section with:
   * - Status indicator
   * - Preflight checks
   * - Profile save/load
   * - Preview and Download actions
   * - SHA256 checksum for verification
   */

  import {
    app,
    openPreviewModal,
    generateCurrentScript,
    setScriptDownloaded,
  } from "$lib/state.svelte";
  import { SCRIPT_FILENAME } from "$lib/types";
  import { generateSHA256, copyToClipboard } from "$lib/checksum";
  import { downloadText } from "../utils/download";
  import {
    buildVerificationScript,
    type SelectionState,
  } from "$lib/script-generator";
  import Summary from "./Summary.svelte";
  import PreflightChecks from "./PreflightChecks.svelte";
  import ProfileActions from "./ProfileActions.svelte";
  import ShareModal from "./ShareModal.svelte";

  let checksum = $state("");
  let copied = $state(false);
  let shareModalOpen = $state(false);

  function openShareModal() {
    shareModalOpen = true;
  }

  function closeShareModal() {
    shareModalOpen = false;
  }

  $effect(() => {
    const script = app.script.edited ?? generateCurrentScript();
    if (script.trim()) {
      generateSHA256(script, { includeBom: true }).then((hash) => {
        checksum = hash;
      });
    } else {
      checksum = "";
    }
  });

  function handlePreview() {
    openPreviewModal();
  }

  function handleDownload() {
    const script = app.script.edited ?? generateCurrentScript();
    if (!script.trim()) return;
    downloadText(script, SCRIPT_FILENAME);
    setScriptDownloaded(true);
  }

  function handleDownloadVerify() {
    const selection: SelectionState = {
      hardware: app.hardware,
      optimizations: Array.from(app.optimizations),
      packages: Array.from(app.selected),
      missingPackages: [],
    };
    const script = buildVerificationScript(selection);
    downloadText(script, "rocktune-verify.ps1");
  }

  async function handleCopyHash() {
    if (!checksum) return;
    const success = await copyToClipboard(checksum);
    if (success) {
      copied = true;
      setTimeout(() => (copied = false), 2000);
    }
  }
</script>

<section id="generate" class="step step--forge">
  <header class="step-banner">
    <div class="step-banner__marker">5</div>
    <div class="step-banner__content">
      <h2 class="step-banner__title">Forge Script</h2>
      <p class="step-banner__subtitle">Your personalized loadout is ready</p>
    </div>
    <div class="step-banner__actions">
      {#if app.script.downloaded}
        <output class="status-badge--downloaded">
          <svg
            class="status-icon--downloaded"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span class="status-text--downloaded">DOWNLOADED</span>
        </output>
      {:else}
        <output class="status-badge--ready">
          <span class="status-indicator--ready"></span>
          <span class="status-text--ready">SYSTEM READY</span>
        </output>
      {/if}
    </div>
  </header>

  <Summary />

  <PreflightChecks />
  <ProfileActions />

  <section class="transparency-zone" id="download">
    <span class="corner corner--tl"></span>
    <span class="corner corner--tr"></span>
    <span class="corner corner--bl"></span>
    <span class="corner corner--br"></span>

    <!-- Section headline -->
    <h3 class="zone-headline">
      Unlike typical optimizers, this is a PowerShell script you can read.
    </h3>

    <!-- HERO CTA: Download button -->
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
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download Loadout
      </span>
      <span class="scanlines"></span>
    </button>

    <!-- Tagline beneath download -->
    <p class="zone-tagline">No installer. No bundled crapware. Just code.</p>

    <!-- Secondary actions -->
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
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Preview
      </button>

      <button
        type="button"
        class="btn-share"
        title="Share your build configuration"
        onclick={openShareModal}
      >
        <svg
          class="icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>
    </div>

    <!-- Trust indicators with provenance -->
    <div class="trust-strip">
      <span class="trust-item">
        <svg
          class="trust-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Open Source
      </span>
      <span class="trust-divider">·</span>
      <span class="trust-item">
        <svg
          class="trust-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        Preview First
      </span>
      <span class="trust-divider">·</span>
      <span class="trust-item">
        <svg
          class="trust-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
        No Tracking
      </span>
      <span class="trust-divider">·</span>
      <span class="trust-item">
        <svg
          class="trust-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Self-Contained
      </span>
      <span class="trust-divider">·</span>
      <a
        href="https://github.com/thepedroferrari/rocktune/tree/{__BUILD_COMMIT__}"
        target="_blank"
        rel="noopener"
        class="trust-item trust-item--provenance"
      >
        <svg
          class="trust-icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
        >
          <path
            d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
          />
        </svg>
        {__BUILD_COMMIT__} · {__BUILD_DATE__}
      </a>
    </div>
  </section>

  {#if checksum}
    <section class="verification-hud" id="verification-hud">
      <header class="verification-hud__header">
        <svg
          class="verification-hud__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <h3 class="verification-hud__title">SHA-256 CHECKSUM</h3>
      </header>

      <div class="verification-hud__content">
        <div class="hash-panel">
          <span class="hash-panel__label">File Hash</span>
          <code class="hash-panel__value" title={checksum}>{checksum}</code>
          <div class="hash-panel__actions">
            <button
              type="button"
              class="hash-panel__btn"
              title={copied ? "Copied!" : "Copy SHA-256 hash"}
              onclick={handleCopyHash}
            >
              {#if copied}
                <svg
                  class="icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="m9 12 2 2 4-4" />
                </svg>
                Copied
              {:else}
                <svg
                  class="icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path
                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  />
                </svg>
                Copy Hash
              {/if}
            </button>
            <button
              type="button"
              class="hash-panel__btn hash-panel__btn--verify"
              title="Download verification script to check if optimizations were applied"
              onclick={handleDownloadVerify}
            >
              <svg
                class="icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M9 11l3 3L22 4" />
                <path
                  d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                />
              </svg>
              Verify Script
            </button>
          </div>
        </div>

        <div class="verify-instructions">
          <details class="verify-details">
            <summary class="verify-summary">How to verify</summary>
            <div class="verify-steps">
              <p class="verify-intro">
                Security folks and IT pros: here's how to double-check the file
                hash.
              </p>
              <div class="verify-step">
                <span class="verify-step__num">1</span>
                <div class="verify-step__content">
                  <p class="verify-step__label">
                    Run in PowerShell (same folder as download):
                  </p>
                  <code class="verify-step__command"
                    >Get-FileHash .\rocktune-setup.ps1 -Algorithm SHA256 |
                    Select-Object -ExpandProperty Hash</code
                  >
                </div>
              </div>
              <div class="verify-step">
                <span class="verify-step__num">2</span>
                <div class="verify-step__content">
                  <p class="verify-step__label">Compare with:</p>
                  <code class="verify-step__expected">{checksum}</code>
                </div>
              </div>
              <p class="verify-result">Match? You're good to go.</p>
            </div>
          </details>
        </div>
      </div>
    </section>
  {/if}
</section>

<ShareModal open={shareModalOpen} onclose={closeShareModal} />
