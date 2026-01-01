<script lang="ts">
  /**
   * ShareModal - Modal for sharing build configurations
   *
   * Provides:
   * - Shareable URL with one-click copy
   * - Text summary for forums
   * - QR code (future)
   */

  import { app } from '$lib/state.svelte'
  import {
    encodeShareURL,
    getFullShareURL,
    generateTextSummary,
    type BuildToEncode,
  } from '$lib/share'
  import { copyToClipboard } from '$lib/checksum'
  import { showToast } from '$lib/toast.svelte'

  interface Props {
    open: boolean
    onclose: () => void
  }

  let { open, onclose }: Props = $props()

  let urlCopied = $state(false)
  let textCopied = $state(false)
  let activeTab = $state<'url' | 'text'>('url')

  // Build current state for encoding
  let currentBuild = $derived<BuildToEncode>({
    cpu: app.hardware.cpu,
    gpu: app.hardware.gpu,
    dnsProvider: app.dnsProvider,
    peripherals: Array.from(app.peripherals),
    monitorSoftware: Array.from(app.monitorSoftware),
    optimizations: Array.from(app.optimizations),
    packages: Array.from(app.selected),
    preset: app.activePreset ?? undefined,
  })

  let shareURL = $derived(getFullShareURL(currentBuild))
  let textSummary = $derived(generateTextSummary(currentBuild))

  async function handleCopyURL() {
    const success = await copyToClipboard(shareURL)
    if (success) {
      urlCopied = true
      showToast('Link copied to clipboard!', 'success')
      setTimeout(() => (urlCopied = false), 2000)
    }
  }

  async function handleCopyText() {
    const success = await copyToClipboard(textSummary)
    if (success) {
      textCopied = true
      showToast('Text summary copied!', 'success')
      setTimeout(() => (textCopied = false), 2000)
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onclose()
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onclose()
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="share-modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="share-modal-title"
    tabindex="-1"
    onclick={handleBackdropClick}
  >
    <div class="share-modal">
      <header class="share-modal__header">
        <h2 id="share-modal-title" class="share-modal__title">
          <svg class="share-modal__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share Your Build
        </h2>
        <button
          type="button"
          class="share-modal__close"
          onclick={onclose}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div class="share-modal__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="share-tab"
          class:active={activeTab === 'url'}
          aria-selected={activeTab === 'url'}
          onclick={() => (activeTab = 'url')}
        >
          <svg class="share-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          Share Link
        </button>
        <button
          type="button"
          role="tab"
          class="share-tab"
          class:active={activeTab === 'text'}
          aria-selected={activeTab === 'text'}
          onclick={() => (activeTab = 'text')}
        >
          <svg class="share-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Text Summary
        </button>
      </div>

      <div class="share-modal__content">
        {#if activeTab === 'url'}
          <div class="share-panel" role="tabpanel">
            <p class="share-panel__desc">
              Copy this link to share your exact build configuration with anyone.
            </p>
            <div class="share-url-box">
              <input
                type="text"
                class="share-url-input"
                value={shareURL}
                readonly
                onclick={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                class="share-url-copy"
                class:copied={urlCopied}
                onclick={handleCopyURL}
              >
                {#if urlCopied}
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Copied!
                {:else}
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Link
                {/if}
              </button>
            </div>
            <p class="share-panel__hint">
              Works on Discord, Reddit, Twitter, and anywhere else you can paste a link.
            </p>
          </div>
        {:else}
          <div class="share-panel" role="tabpanel">
            <p class="share-panel__desc">
              Copy this text summary for forums, Reddit, or documentation.
            </p>
            <div class="share-text-box">
              <pre class="share-text-preview">{textSummary}</pre>
              <button
                type="button"
                class="share-text-copy"
                class:copied={textCopied}
                onclick={handleCopyText}
              >
                {#if textCopied}
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Copied!
                {:else}
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Text
                {/if}
              </button>
            </div>
          </div>
        {/if}
      </div>

      <footer class="share-modal__footer">
        <p class="share-modal__stats">
          {app.optimizations.size} optimizations · {app.selected.size} packages
        </p>
      </footer>
    </div>
  </div>
{/if}

<style>
  .share-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 9000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
    background: oklch(0 0 0 / 0.8);
    backdrop-filter: blur(4px);
    animation: fade-in 0.2s ease-out;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .share-modal {
    width: 100%;
    max-width: 520px;
    background: oklch(0.12 0.02 250);
    border: 1px solid oklch(0.3 0.05 250);
    border-radius: var(--radius-lg);
    box-shadow: 0 20px 40px oklch(0 0 0 / 0.5);
    animation: slide-up 0.2s ease-out;
  }

  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .share-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid oklch(0.25 0.03 250);
  }

  .share-modal__title {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text-primary);
  }

  .share-modal__icon {
    width: 24px;
    height: 24px;
    color: oklch(0.7 0.15 250);
  }

  .share-modal__close {
    padding: var(--space-xs);
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: color 0.15s, background-color 0.15s;
  }

  .share-modal__close:hover {
    color: var(--text-primary);
    background: oklch(1 0 0 / 0.1);
  }

  .share-modal__close svg {
    width: 20px;
    height: 20px;
  }

  .share-modal__tabs {
    display: flex;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-lg);
    border-bottom: 1px solid oklch(0.2 0.02 250);
  }

  .share-tab {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-sm);
    background: none;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s;
  }

  .share-tab:hover {
    color: var(--text-secondary);
  }

  .share-tab.active {
    color: oklch(0.7 0.15 250);
    background: oklch(0.7 0.15 250 / 0.1);
    border-color: oklch(0.7 0.15 250 / 0.3);
  }

  .share-tab__icon {
    width: 16px;
    height: 16px;
  }

  .share-modal__content {
    padding: var(--space-lg);
  }

  .share-panel__desc {
    margin: 0 0 var(--space-md) 0;
    font-size: var(--text-sm);
    color: var(--text-secondary);
  }

  .share-url-box {
    display: flex;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
  }

  .share-url-input {
    flex: 1;
    padding: var(--space-sm) var(--space-md);
    background: oklch(0.08 0.01 250);
    border: 1px solid oklch(0.25 0.03 250);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--text-primary);
    cursor: text;
  }

  .share-url-input:focus {
    outline: none;
    border-color: oklch(0.6 0.15 250);
  }

  .share-url-copy,
  .share-text-copy {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    background: oklch(0.7 0.15 250);
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    font-weight: 500;
    color: oklch(0.1 0.02 250);
    cursor: pointer;
    transition: background-color 0.15s;
    white-space: nowrap;
  }

  .share-url-copy:hover,
  .share-text-copy:hover {
    background: oklch(0.75 0.15 250);
  }

  .share-url-copy.copied,
  .share-text-copy.copied {
    background: oklch(0.6 0.18 145);
  }

  .share-url-copy .icon,
  .share-text-copy .icon {
    width: 16px;
    height: 16px;
  }

  .share-panel__hint {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-muted);
  }

  .share-text-box {
    position: relative;
  }

  .share-text-preview {
    padding: var(--space-md);
    margin: 0 0 var(--space-sm) 0;
    background: oklch(0.08 0.01 250);
    border: 1px solid oklch(0.25 0.03 250);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--text-secondary);
    white-space: pre-wrap;
    max-height: 200px;
    overflow-y: auto;
  }

  .share-modal__footer {
    padding: var(--space-sm) var(--space-lg);
    border-top: 1px solid oklch(0.2 0.02 250);
    text-align: center;
  }

  .share-modal__stats {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-muted);
  }

  @media (max-width: 640px) {
    .share-modal-backdrop {
      align-items: flex-end;
      padding: 0;
    }

    .share-modal {
      max-width: none;
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }

    .share-url-box {
      flex-direction: column;
    }
  }
</style>
