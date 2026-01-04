<script lang="ts">
  /**
   * TroubleshootModal - Help for users who can't run PowerShell scripts
   *
   * Design: Cyberpunk/ROG/CS2 aesthetic - dark, solid, angular
   * UX: "Copy this → Do that" - maximum simplicity
   */

  import { app } from "$lib/state.svelte";
  import { getOneLinerWithMeta, type BuildToEncode } from "$lib/share";
  import { copyToClipboard } from "$lib/checksum";
  import { showToast } from "$lib/toast.svelte";
  import { downloadText } from "../utils/download";
  import Modal from "./ui/Modal.svelte";

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();

  let debunkingExpanded = $state(false);

  let copiedStates = $state({
    quickest: false,
    unblock: false,
    policy: false,
  });

  let currentBuild = $derived<BuildToEncode>({
    cpu: app.hardware.cpu,
    gpu: app.hardware.gpu,
    dnsProvider: app.dnsProvider,
    peripherals: Array.from(app.peripherals),
    monitorSoftware: Array.from(app.monitorSoftware),
    optimizations: Array.from(app.optimizations),
    packages: Array.from(app.selected),
    preset: app.activePreset ?? undefined,
  });

  let oneLinerResult = $derived(getOneLinerWithMeta(currentBuild));
  let oneLinerCommand = $derived(oneLinerResult.command);

  const UNBLOCK_COMMANDS = `cd $HOME\\Downloads
Unblock-File .\\rocktune-setup.ps1
.\\rocktune-setup.ps1`;

  const POLICY_COMMAND = `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`;

  function resetCopied(key: keyof typeof copiedStates) {
    copiedStates[key] = true;
    setTimeout(() => (copiedStates[key] = false), 2000);
  }

  async function handleCopy(
    text: string,
    key: keyof typeof copiedStates,
    msg: string,
  ) {
    const success = await copyToClipboard(text);
    if (success) {
      resetCopied(key);
      showToast(msg, "success");
    }
  }

  function handleDownloadBat() {
    const batContent = `@echo off
:: RockTune Launcher
:: Requests admin, bypasses execution policy, runs the script

set "SCRIPT=%~dp0rocktune-setup.ps1"

if not exist "%SCRIPT%" (
    echo Error: rocktune-setup.ps1 not found in same folder as this .bat
    echo Make sure both files are in the same directory.
    pause
    exit /b 1
)

echo Launching RockTune with admin privileges...
powershell -Command "Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File \\"%SCRIPT%\\"' -Verb RunAs"
`;
    downloadText(batContent, "rocktune-launcher.bat");
    showToast("Launcher downloaded!", "success");
  }
</script>

<Modal {open} {onclose} size="md" class="troubleshoot-modal">
  {#snippet header()}
    <div class="troubleshoot-modal__header-content">
      <h2 class="modal-title troubleshoot-modal__title">SCRIPT BLOCKED?</h2>
      <p class="troubleshoot-modal__subtitle">
        Windows needs permission to run scripts. Pick your fix:
      </p>
    </div>
  {/snippet}

  <div class="options">
    <!-- QUICKEST FIX - Primary/highlighted -->
    <article class="card card--primary">
      <div class="card__header">
        <h3 class="card__title">QUICKEST FIX</h3>
        <button
          type="button"
          class="copy-btn"
          class:copied={copiedStates.quickest}
          onclick={() => handleCopy(oneLinerCommand, "quickest", "Copied!")}
        >
          {copiedStates.quickest ? "COPIED" : "COPY"}
        </button>
      </div>
      <p class="card__desc">Open PowerShell as Admin, paste this:</p>
      <input
        type="text"
        class="code-input"
        readonly
        value={oneLinerCommand}
        onclick={(e) => e.currentTarget.select()}
      />
      <p class="card__hint">Runs your loadout directly — no download needed.</p>
    </article>

    <!-- UNBLOCK DOWNLOADED FILE -->
    <article class="card">
      <div class="card__header">
        <h3 class="card__title">UNBLOCK DOWNLOADED FILE</h3>
        <button
          type="button"
          class="copy-btn"
          class:copied={copiedStates.unblock}
          onclick={() => handleCopy(UNBLOCK_COMMANDS, "unblock", "Copied!")}
        >
          {copiedStates.unblock ? "COPIED" : "COPY"}
        </button>
      </div>
      <pre class="code">{UNBLOCK_COMMANDS}</pre>
    </article>

    <!-- ENABLE SCRIPTS PERMANENTLY -->
    <article class="card">
      <div class="card__header">
        <h3 class="card__title">ENABLE SCRIPTS PERMANENTLY</h3>
        <button
          type="button"
          class="copy-btn"
          class:copied={copiedStates.policy}
          onclick={() => handleCopy(POLICY_COMMAND, "policy", "Copied!")}
        >
          {copiedStates.policy ? "COPIED" : "COPY"}
        </button>
      </div>
      <pre class="code">{POLICY_COMMAND}</pre>
      <p class="card__hint">Then run the unblock commands above.</p>
    </article>

    <!-- DOWNLOAD BAT LAUNCHER -->
    <article class="card card--action">
      <button type="button" class="bat-btn" onclick={handleDownloadBat}>
        <svg
          class="bat-btn__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        DOWNLOAD .BAT LAUNCHER
      </button>
      <p class="card__hint">
        Double-click alternative. Put in same folder as the .ps1
      </p>
    </article>

    <article class="card card--warning">
      <button
        type="button"
        class="debunking-toggle"
        onclick={() => (debunkingExpanded = !debunkingExpanded)}
        aria-expanded={debunkingExpanded}
      >
        <svg
          class="debunking-toggle__icon"
          class:expanded={debunkingExpanded}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span class="debunking-toggle__title">WHAT NOT TO DO</span>
        <span class="debunking-toggle__badge">EXPERT CONSENSUS</span>
      </button>

      {#if debunkingExpanded}
        <div class="debunking-content">
          <p class="debunking-intro">
            Based on FR33THY, Blur Busters, and Battle(non)sense research. These
            tweaks are either <strong>placebo</strong> or
            <strong>actively harmful</strong> on modern systems.
          </p>

          <div class="debunking-section">
            <h4 class="debunking-section__title">NEVER TOUCH</h4>
            <ul class="debunking-list">
              <li>
                <code>bcdedit useplatformclock</code> — Not used for game timing,
                can break system timers
              </li>
              <li>
                <code>bcdedit disabledynamictick</code> — Increases power consumption,
                minimal gaming benefit
              </li>
              <li>
                <code>bcdedit tscsyncpolicy</code> — Debugging tool, not for gaming
                optimization
              </li>
            </ul>
          </div>

          <div class="debunking-section">
            <h4 class="debunking-section__title">AVOID (USUALLY HARMFUL)</h4>
            <ul class="debunking-list">
              <li>
                <strong>Disable SMT/Hyperthreading</strong> — Hurts 1% lows; modern
                schedulers handle it correctly
              </li>
              <li>
                <strong>Interrupt affinity tweaks</strong> — Risky, can cause system
                instability
              </li>
              <li>
                <strong>MSI mode via registry</strong> — Only safe if device explicitly
                supports it
              </li>
              <li>
                <strong>Raise dwm.exe priority</strong> — Causes mouse acceleration
                issues
              </li>
              <li>
                <strong>Network adapter priority: High</strong> — Causes in-game
                desync
              </li>
            </ul>
          </div>

          <div class="debunking-section">
            <h4 class="debunking-section__title">SKIP (NO REAL BENEFIT)</h4>
            <ul class="debunking-list">
              <li>
                <strong>Custom Windows ISOs</strong> — Security risks outweigh minimal
                gains
              </li>
              <li>
                <strong>LatencyMon obsession</strong> — Only diagnoses driver issues,
                not real gaming latency
              </li>
              <li>
                <strong>Spread Spectrum disable</strong> — Zero measurable gaming
                impact
              </li>
            </ul>
          </div>

          <p class="debunking-quote">
            "The less you tweak, the more stability you have." — Blur Busters
          </p>
        </div>
      {/if}
    </article>
  </div>
</Modal>

<style>
  /* Modal overrides */
  :global(.troubleshoot-modal) {
    --_width: 600px;
    --_clip: polygon(
      0 0,
      calc(100% - 16px) 0,
      100% 16px,
      100% 100%,
      16px 100%,
      0 calc(100% - 16px)
    );
  }

  :global(.troubleshoot-modal .modal-header) {
    background: linear-gradient(
      180deg,
      rgba(var(--accent-rgb, 255, 107, 0), 0.08) 0%,
      transparent 100%
    );
  }

  .troubleshoot-modal__header-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .troubleshoot-modal__title {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: var(--accent);
  }

  .troubleshoot-modal__subtitle {
    margin: 0;
    font-size: 0.95rem;
    color: var(--text-2);
  }

  /* Options container */
  .options {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    padding: var(--space-lg);
  }

  /* Card - each option */
  .card {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-left: 3px solid var(--border);
    padding: var(--space-lg);
  }

  .card--primary {
    border-color: var(--accent);
    border-left-color: var(--accent);
    box-shadow: 0 0 30px rgba(var(--accent-rgb, 255, 107, 0), 0.12);
    background: linear-gradient(
      135deg,
      rgba(var(--accent-rgb, 255, 107, 0), 0.06) 0%,
      var(--surface-2) 50%
    );
  }

  .card--action {
    background: transparent;
    border: none;
    border-left: none;
    padding: var(--space-md) 0;
  }

  .card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    margin-bottom: var(--space-sm);
  }

  .card__title {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--text-1);
    text-transform: uppercase;
  }

  .card--primary .card__title {
    color: var(--accent);
  }

  .card__desc {
    margin: 0 0 var(--space-sm);
    font-size: 0.875rem;
    color: var(--text-2);
  }

  .card__hint {
    margin: var(--space-sm) 0 0;
    font-size: 0.8rem;
    color: var(--text-3);
  }

  /* Code block (pre) */
  .code {
    margin: 0;
    padding: var(--space-md);
    background: #0a0a0a;
    border: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--accent);
    white-space: pre-wrap;
    word-break: break-all;
    overflow-x: auto;
  }

  /* Code input (single line, scrollable) */
  .code-input {
    width: 100%;
    padding: var(--space-md);
    background: #0a0a0a;
    border: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--accent);
    cursor: text;
    /* Single line, horizontal scroll */
    white-space: nowrap;
    overflow-x: auto;
  }

  .code-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .code-input::selection {
    background: var(--accent);
    color: #000;
  }

  /* Copy button - big and obvious */
  .copy-btn {
    flex-shrink: 0;
    padding: var(--space-xs) var(--space-lg);
    background: var(--accent);
    border: none;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--surface-1);
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s ease;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  }

  .copy-btn:hover {
    filter: brightness(1.15);
  }

  .copy-btn.copied {
    background: var(--success, #22c55e);
  }

  /* BAT download button */
  .bat-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-lg);
    background: var(--surface-2);
    border: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    color: var(--text-1);
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s ease;
    clip-path: polygon(
      0 0,
      calc(100% - 8px) 0,
      100% 8px,
      100% 100%,
      8px 100%,
      0 calc(100% - 8px)
    );
  }

  .bat-btn:hover {
    background: var(--surface-3);
    border-color: var(--accent);
    color: var(--accent);
  }

  .bat-btn__icon {
    width: 1.25rem;
    height: 1.25rem;
  }

  .card--warning {
    border-color: var(--warning, oklch(0.75 0.15 85));
    border-left-color: var(--warning, oklch(0.75 0.15 85));
    background: linear-gradient(
      135deg,
      oklch(0.75 0.15 85 / 0.06) 0%,
      var(--surface-2) 50%
    );
    padding: 0;
  }

  .debunking-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    padding: var(--space-lg);
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .debunking-toggle:hover {
    background: oklch(0.75 0.15 85 / 0.04);
  }

  .debunking-toggle__icon {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--warning, oklch(0.75 0.15 85));
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .debunking-toggle__icon.expanded {
    transform: rotate(180deg);
  }

  .debunking-toggle__title {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--warning, oklch(0.75 0.15 85));
    text-transform: uppercase;
  }

  .debunking-toggle__badge {
    margin-inline-start: auto;
    padding: 0.15rem 0.5rem;
    background: oklch(0.75 0.15 85 / 0.15);
    border: 1px solid oklch(0.75 0.15 85 / 0.3);
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--warning, oklch(0.75 0.15 85));
    text-transform: uppercase;
  }

  .debunking-content {
    padding: 0 var(--space-lg) var(--space-lg);
    border-top: 1px solid oklch(0.75 0.15 85 / 0.2);
  }

  .debunking-intro {
    margin: var(--space-md) 0;
    font-size: 0.875rem;
    color: var(--text-2);
    line-height: 1.5;
  }

  .debunking-intro strong {
    color: var(--warning, oklch(0.75 0.15 85));
  }

  .debunking-section {
    margin-block: var(--space-md);
  }

  .debunking-section__title {
    margin: 0 0 var(--space-xs);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--text-1);
    text-transform: uppercase;
  }

  .debunking-list {
    margin: 0;
    padding-inline-start: var(--space-lg);
    font-size: 0.8rem;
    color: var(--text-2);
    line-height: 1.6;
  }

  .debunking-list li {
    margin-block: var(--space-xs);
  }

  .debunking-list code {
    padding: 0.1rem 0.35rem;
    background: oklch(0.2 0 0);
    border: 1px solid var(--border);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--warning, oklch(0.75 0.15 85));
  }

  .debunking-list strong {
    color: var(--text-1);
    font-weight: 600;
  }

  .debunking-quote {
    margin: var(--space-lg) 0 0;
    padding: var(--space-md);
    background: oklch(0.15 0.02 285);
    border-inline-start: 3px solid var(--accent);
    font-size: 0.85rem;
    font-style: italic;
    color: var(--text-2);
  }

  @media (max-width: 640px) {
    :global(.troubleshoot-modal) {
      --_clip: polygon(
        0 0,
        calc(100% - 10px) 0,
        100% 10px,
        100% 100%,
        10px 100%,
        0 calc(100% - 10px)
      );
    }

    .troubleshoot-modal__title {
      font-size: 1.25rem;
    }

    .options {
      padding: var(--space-md);
    }

    .card {
      padding: var(--space-md);
    }

    .card__header {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-sm);
    }

    .copy-btn {
      width: 100%;
      text-align: center;
      padding: var(--space-sm);
    }

    .debunking-toggle {
      padding: var(--space-md);
      flex-wrap: wrap;
    }

    .debunking-toggle__badge {
      margin-inline-start: 0;
      margin-block-start: var(--space-xs);
      order: 3;
      width: 100%;
    }

    .debunking-content {
      padding: 0 var(--space-md) var(--space-md);
    }
  }
</style>
