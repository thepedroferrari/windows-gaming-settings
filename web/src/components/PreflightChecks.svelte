<script lang="ts">
  /**
   * PreflightChecks - Hardware-dependent prerequisite cards
   *
   * Shows recommended/required steps before running the generated script.
   * Visibility is reactive based on hardware selection.
   */

  import { app } from '$lib/state.svelte'
  import { PREFLIGHT_CHECKS, isPreflightVisible, type PreflightCheck } from '$lib/preflight'
  import { copyToClipboard } from '../utils/clipboard'

  // Reactive: filter preflight checks based on hardware
  let visibleChecks = $derived(
    PREFLIGHT_CHECKS.filter((check) =>
      isPreflightVisible(check, app.hardware.cpu, app.hardware.gpu),
    ),
  )

  // Copy feedback state per card
  let copyFeedback = $state<Record<string, string>>({})

  async function handleCopy(check: PreflightCheck) {
    if (check.action.type !== 'copy') return

    const success = await copyToClipboard(check.action.text)
    if (success) {
      copyFeedback[check.id] = 'Copied!'
      setTimeout(() => {
        copyFeedback[check.id] = ''
      }, 1800)
    }
  }
</script>

{#if visibleChecks.length > 0}
  <div class="preflight-section">
    <h3 class="title">
      <svg
        class="icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      Pre-Flight Check
    </h3>

    <div class="items">
      {#each visibleChecks as check (check.id)}
        <div class="card">
          <span class="badge {check.badge}">{check.badge}</span>
          <h4>{check.title}</h4>
          <p>{check.description}</p>

          {#if check.action.type === 'link'}
            <a
              href={check.action.url}
              target="_blank"
              rel="noopener noreferrer"
              class="link"
            >
              {check.action.label}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          {:else if check.action.type === 'copy'}
            <button type="button" class="link" onclick={() => handleCopy(check)}>
              {copyFeedback[check.id] || check.action.label}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          {/if}
        </div>
      {/each}
    </div>
  </div>
{/if}

<!-- Styles are in preflight.styles.css (layer: components) -->
