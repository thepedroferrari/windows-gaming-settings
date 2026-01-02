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
    getFullShareURLWithMeta,
    generateTextSummary,
    getOneLinerWithMeta,
    type BuildToEncode,
    type EncodeResult,
    type OneLinerResult,
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
  let oneLinerCopied = $state(false)
  let activeTab = $state<'url' | 'oneliner' | 'text'>('url')

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

  // Get URL with metadata (length warning)
  let shareResult = $derived<EncodeResult>(getFullShareURLWithMeta(currentBuild))
  let shareURL = $derived(shareResult.url)
  let textSummary = $derived(generateTextSummary(currentBuild))

  // Get one-liner command for PowerShell execution
  let oneLinerResult = $derived<OneLinerResult>(getOneLinerWithMeta(currentBuild))
  let oneLinerCommand = $derived(oneLinerResult.command)

  // Svelte 5: Auto-reset copied states with proper cleanup
  $effect(() => {
    if (!urlCopied) return
    const timer = setTimeout(() => (urlCopied = false), 2000)
    return () => clearTimeout(timer)
  })

  $effect(() => {
    if (!textCopied) return
    const timer = setTimeout(() => (textCopied = false), 2000)
    return () => clearTimeout(timer)
  })

  $effect(() => {
    if (!oneLinerCopied) return
    const timer = setTimeout(() => (oneLinerCopied = false), 2000)
    return () => clearTimeout(timer)
  })

  async function handleCopyURL() {
    const success = await copyToClipboard(shareURL)
    if (success) {
      urlCopied = true
      showToast('Link copied to clipboard!', 'success')
    }
  }

  async function handleCopyText() {
    const success = await copyToClipboard(textSummary)
    if (success) {
      textCopied = true
      showToast('Text summary copied!', 'success')
    }
  }

  async function handleCopyOneLiner() {
    const success = await copyToClipboard(oneLinerCommand)
    if (success) {
      oneLinerCopied = true
      showToast('One-liner command copied!', 'success')
    }
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onclose()
    }
  }

  // Svelte 5: Conditionally add/remove keydown listener
  $effect(() => {
    if (!open) return

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onclose()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  })
</script>

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
          class:active={activeTab === 'oneliner'}
          aria-selected={activeTab === 'oneliner'}
          onclick={() => (activeTab = 'oneliner')}
        >
          <svg class="share-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          One-Liner
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
            {#if shareResult.blockedCount > 0}
              <div class="share-panel__security-notice">
                <svg class="security-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
                <span>
                  {shareResult.blockedCount} dangerous optimization{shareResult.blockedCount > 1 ? 's' : ''} excluded for security.
                  Recipients must enable LUDICROUS mode themselves.
                </span>
              </div>
            {/if}
            {#if shareResult.urlTooLong}
              <p class="share-panel__warning">
                <svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                URL is {shareResult.urlLength} chars — some services may truncate long URLs.
              </p>
            {:else}
              <p class="share-panel__hint">
                Works on Discord, Reddit, Twitter, and anywhere else you can paste a link.
              </p>
            {/if}
          </div>
        {:else if activeTab === 'oneliner'}
          <div class="share-panel" role="tabpanel">
            <p class="share-panel__desc">
              Run directly in PowerShell (Admin) on a fresh Windows install — no browser needed.
            </p>
            <div class="share-oneliner-box">
              <pre class="share-oneliner-code">{oneLinerCommand}</pre>
              <button
                type="button"
                class="share-oneliner-copy"
                class:copied={oneLinerCopied}
                onclick={handleCopyOneLiner}
              >
                {#if oneLinerCopied}
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Copied!
                {:else}
                  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Command
                {/if}
              </button>
            </div>
            {#if oneLinerResult.blockedCount > 0}
              <div class="share-panel__security-notice">
                <svg class="security-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
                <span>
                  {oneLinerResult.blockedCount} dangerous optimization{oneLinerResult.blockedCount > 1 ? 's' : ''} excluded for security.
                </span>
              </div>
            {/if}
            {#if oneLinerResult.urlTooLong}
              <p class="share-panel__warning">
                <svg class="warning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                URL is {oneLinerResult.urlLength} chars — reduce selections if command fails.
              </p>
            {:else}
              <p class="share-panel__hint">
                Paste in Admin PowerShell to apply your loadout instantly.
              </p>
            {/if}
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

  .share-panel__warning {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin: 0;
    padding: var(--space-xs) var(--space-sm);
    background: oklch(0.8 0.15 85 / 0.1);
    border: 1px solid oklch(0.8 0.15 85 / 0.3);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: oklch(0.85 0.12 85);
  }

  .share-panel__warning .warning-icon {
    flex-shrink: 0;
    width: 14px;
    height: 14px;
  }

  .share-panel__security-notice {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: oklch(0.6 0.18 145 / 0.1);
    border: 1px solid oklch(0.6 0.18 145 / 0.3);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: oklch(0.75 0.15 145);
    line-height: 1.4;
  }

  .share-panel__security-notice .security-icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    margin-top: 1px;
  }

  .share-oneliner-box {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
  }

  .share-oneliner-code {
    padding: var(--space-md);
    margin: 0;
    background: oklch(0.08 0.01 250);
    border: 1px solid oklch(0.25 0.03 250);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: oklch(0.85 0.15 145);
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 120px;
    overflow-y: auto;
  }

  .share-oneliner-copy {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    background: oklch(0.6 0.18 145);
    border: none;
    border-radius: var(--radius-sm);
    font-size: var(--text-sm);
    font-weight: 500;
    color: oklch(0.1 0.02 145);
    cursor: pointer;
    transition: background-color 0.15s;
    white-space: nowrap;
  }

  .share-oneliner-copy:hover {
    background: oklch(0.65 0.18 145);
  }

  .share-oneliner-copy.copied {
    background: oklch(0.6 0.18 145);
  }

  .share-oneliner-copy .icon {
    width: 16px;
    height: 16px;
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
