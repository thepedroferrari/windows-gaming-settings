<script lang="ts">
  /**
   * HeroSection - Main hero/header with terminal aesthetic
   *
   * Contains:
   * - Holographic console with boot sequence
   * - Quick download and preview buttons
   * - Trust strip and customize link
   * - Periodic verdict flicker effect
   */

  import { onMount } from 'svelte'
  import { app, openPreviewModal } from '$lib/state.svelte'
  import { buildScript } from '$lib/script-generator'
  import { getDefaultOptimizations } from '$lib/optimizations'
  import { downloadText } from '../utils/download'
  import { CPU_TYPES, GPU_TYPES, type PackageKey } from '$lib/types'

  // Verdict element ref for flicker effect
  let verdictEl: HTMLElement | undefined = $state()

  /**
   * Setup periodic verdict flicker (MOT-001)
   * Triggers random flicker burst every 15-20s
   */
  onMount(() => {
    if (!verdictEl) return

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    let timeoutId: ReturnType<typeof setTimeout> | null = null

    function triggerFlicker() {
      if (!verdictEl) return

      // Add flicker class for 260ms
      verdictEl.classList.add('is-flicker')

      setTimeout(() => {
        verdictEl?.classList.remove('is-flicker')

        // Schedule next flicker (random 15-20s)
        const nextDelay = 15000 + Math.random() * 5000
        timeoutId = setTimeout(triggerFlicker, nextDelay)
      }, 260)
    }

    // Initial delay (random 15-20s)
    const initialDelay = 15000 + Math.random() * 5000
    timeoutId = setTimeout(triggerFlicker, initialDelay)

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  })

  /**
   * Safe download: Generate minimal zero-config script
   * Uses safe defaults only, no custom selections
   */
  function handleSafeDownload() {
    // Build a minimal "safe" selection state
    const safeSelection = {
      hardware: {
        cpu: CPU_TYPES.INTEL, // Generic safe default
        gpu: GPU_TYPES.NVIDIA, // Most common
        peripherals: [] as const,
        monitorSoftware: [] as const,
      },
      optimizations: getDefaultOptimizations(),
      packages: [] as PackageKey[], // No software, just optimizations
      missingPackages: [] as string[],
    }

    // Generate and download the safe script directly (not from current state)
    const script = buildScript(safeSelection, { catalog: app.software })
    if (script.trim()) {
      downloadText(script, 'rocktune-safe.ps1')
    }
  }

  /** Preview the current script */
  function handlePreview() {
    openPreviewModal()
  }
</script>

<header class="holo-console">
  <div class="holo-grid-bg"></div>
  <div class="holo-scanlines"></div>
  <div class="holo-content">
    <div class="holo-title-lockup">
      <h1 class="holo-logo" data-text="ROCKTUNE">ROCKTUNE</h1>
    </div>
    <div class="cyber-terminal">
      <!-- Corner accents -->
      <div class="terminal-corner terminal-corner--tl"></div>
      <div class="terminal-corner terminal-corner--tr"></div>
      <div class="terminal-corner terminal-corner--bl"></div>
      <div class="terminal-corner terminal-corner--br"></div>

      <!-- Cyberpunk header bar -->
      <div class="terminal-header">
        <div class="header-left">
          <span class="header-bracket">◢</span>
          <span class="header-label">SYS://ROCKTUNE</span>
        </div>
        <div class="header-center">
          <span class="header-line"></span>
        </div>
        <div class="header-right">
          <span class="status-indicator"></span>
          <span class="header-status">ONLINE</span>
          <span class="header-mode-group">
            <span class="header-mode">MODE:</span>
            <span class="header-mode-value">[ MAXIMUM FPS :: ZERO BLOAT ]</span>
          </span>
          <span class="header-bracket">◣</span>
        </div>
      </div>

      <!-- Terminal screen with noise overlay -->
      <div class="terminal-screen">
        <div class="screen-noise"></div>
        <div class="screen-scanline"></div>

        <!-- Glitchy boot sequence -->
        <div class="terminal-boot">
          <div class="glitch-rain" aria-hidden="true"></div>
          <div class="boot-sequence">
            <span class="boot-line">█▓▒░ ROCKTUNE.exe initializing...</span>
            <span class="boot-line">█▓▒░ Scanning system configuration</span>
            <span class="boot-line">█▓▒░ Loading optimization protocols</span>
            <span class="boot-line">█▓▒░ Bypassing Windows restrictions</span>
            <span class="boot-line boot-success">█▓▒░ SYSTEM BREACH SUCCESSFUL</span>
          </div>
        </div>

        <div class="terminal-prompt">
          <span class="prompt-path">C:\ROCKTUNE</span><span class="prompt-symbol">&gt;</span>
          <span class="prompt-command">optimize.exe /mission-brief</span>
        </div>

        <!-- Main terminal content -->
        <div class="terminal-body">
          <p class="terminal-tagline">
            Your PC was built to game.<br />
            <span
              class="highlight-text"
              data-text="WINDOWS WASN'T."
              data-hero-verdict
              bind:this={verdictEl}
            >
              WINDOWS WASN'T.
            </span>
          </p>
          <p class="terminal-subhead">
            <span class="terminal-subhead-line">
              Force Windows to run games first.
            </span>
            <span class="terminal-subhead-micro">
              No installer. No black box. Preview anytime.
            </span>
          </p>

          <div class="terminal-loading">
            <span class="loading-line">
              <span class="line-progress">■■■</span>
              <span class="line-text">8 network settings</span>
              <span class="line-dots"></span>
              <span class="result">DIALED</span>
            </span>
            <span class="loading-line">
              <span class="line-progress">■■■</span>
              <span class="line-text">47 background services</span>
              <span class="line-dots"></span>
              <span class="result">TRIMMED</span>
            </span>
            <span class="loading-line">
              <span class="line-progress">■■■</span>
              <span class="line-text">12 telemetry endpoints</span>
              <span class="line-dots"></span>
              <span class="result">BLACKOUT</span>
            </span>
            <span class="loading-line">
              <span class="line-progress">■■■</span>
              <span class="line-text">Input latency 15.6ms → 0.5ms</span>
              <span class="line-dots"></span>
              <span class="result">FASTER</span>
            </span>
            <span class="loading-line success">
              <span class="success-icon">◢◤</span>
              LOADOUT READY
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="holo-actions">
      <div class="holo-action">
        <button
          type="button"
          class="holo-btn holo-btn--safe"
          data-text="DOWNLOAD_SAFE_MODE"
          title="Conservative preset. Preview the script anytime."
          onclick={handleSafeDownload}
        >
          <span class="btn-text">
            <svg
              class="btn-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            DOWNLOAD_SAFE_MODE
          </span>
          <span class="glitch-layer"></span>
          <span class="btn-scanlines"></span>
        </button>
        <span class="holo-action-helper">Run safe preset.</span>
      </div>
      <div class="holo-action">
        <button
          type="button"
          class="holo-btn holo-btn--ghost"
          data-text="VIEW_SCRIPT"
          aria-label="View script preview"
          title="See what runs. No surprises."
          onclick={handlePreview}
        >
          <span class="btn-text">
            <svg
              class="btn-icon"
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
            VIEW_SCRIPT
            <span class="btn-badge">RECOMMENDED</span>
          </span>
          <span class="glitch-layer"></span>
          <span class="btn-scanlines"></span>
        </button>
        <span class="holo-action-helper">Preview what will run.</span>
      </div>
      <div class="holo-action">
        <a
          href="#quick-start"
          class="holo-btn holo-btn--secondary"
          data-text="CUSTOMIZE"
          title="Full control. Build your own loadout."
        >
          <span class="btn-text">CUSTOMIZE →</span>
          <span class="glitch-layer"></span>
          <span class="btn-scanlines"></span>
        </a>
        <span class="holo-action-helper">Build a loadout.</span>
      </div>
    </div>

    <p class="trust-strip">
      <a
        href="https://github.com/pedroferrari/windows-gaming-settings"
        target="_blank"
        rel="noopener noreferrer"
        class="trust-link"
      >
        OPEN SOURCE →
      </a>
      • PREVIEW FIRST • NO INSTALLER
    </p>
    <p class="quick-download-hint">
      Zero config • Safe tweaks only • Works on any PC
    </p>
  </div>
</header>
