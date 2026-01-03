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

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();

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

  async function handleCopy(text: string, key: keyof typeof copiedStates, msg: string) {
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

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onclose();
    }
  }

  $effect(() => {
    if (!open) return;
    function handleKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") onclose();
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  });
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="troubleshoot-title"
    tabindex="-1"
    onclick={handleBackdropClick}
  >
    <div class="modal">
      <!-- Header -->
      <header class="header">
        <h2 id="troubleshoot-title" class="title">SCRIPT BLOCKED?</h2>
        <p class="subtitle">Windows needs permission to run scripts. Pick your fix:</p>
        <button type="button" class="close-btn" onclick={onclose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <!-- Options -->
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
            <svg class="bat-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            DOWNLOAD .BAT LAUNCHER
          </button>
          <p class="card__hint">Double-click alternative. Put in same folder as the .ps1</p>
        </article>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Backdrop - solid dark, no transparency issues */
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 9000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(8px);
  }

  /* Modal container - solid dark with accent border */
  .modal {
    background: var(--surface-1);
    border: 1px solid var(--accent);
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow:
      0 0 60px rgba(var(--accent-rgb, 255, 107, 0), 0.2),
      0 0 0 1px rgba(255, 255, 255, 0.03),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    /* Subtle angular clip for ROG feel */
    clip-path: polygon(
      0 0,
      calc(100% - 16px) 0,
      100% 16px,
      100% 100%,
      16px 100%,
      0 calc(100% - 16px)
    );
  }

  /* Header section */
  .header {
    position: relative;
    padding: var(--space-xl) var(--space-xl) var(--space-lg);
    border-bottom: 1px solid var(--border);
    background: linear-gradient(
      180deg,
      rgba(var(--accent-rgb, 255, 107, 0), 0.08) 0%,
      transparent 100%
    );
  }

  .title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: var(--accent);
    text-transform: uppercase;
  }

  .subtitle {
    margin: var(--space-xs) 0 0;
    font-size: 0.95rem;
    color: var(--text-2);
  }

  .close-btn {
    position: absolute;
    top: var(--space-lg);
    right: var(--space-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-2);
    cursor: pointer;
    transition: all 0.15s ease;
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%);
  }

  .close-btn:hover {
    background: var(--surface-2);
    border-color: var(--accent);
    color: var(--text-1);
  }

  .close-btn svg {
    width: 1.25rem;
    height: 1.25rem;
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
    color: var(--surface-1);
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
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
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

  /* Scrollbar styling */
  .modal::-webkit-scrollbar {
    width: 6px;
  }

  .modal::-webkit-scrollbar-track {
    background: var(--surface-1);
  }

  .modal::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
  }

  .modal::-webkit-scrollbar-thumb:hover {
    background: var(--text-3);
  }

  /* Mobile adjustments */
  @media (max-width: 640px) {
    .backdrop {
      padding: var(--space-sm);
    }

    .modal {
      clip-path: polygon(
        0 0,
        calc(100% - 10px) 0,
        100% 10px,
        100% 100%,
        10px 100%,
        0 calc(100% - 10px)
      );
    }

    .header {
      padding: var(--space-lg);
    }

    .title {
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
  }
</style>
