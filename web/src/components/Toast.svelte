<script lang="ts">
  /**
   * Toast Notification Component
   *
   * Displays toast notifications from the toast store.
   * Auto-dismisses after a configurable duration.
   */

  import { getToasts, dismissToast, type ToastMessage } from '$lib/toast.svelte'
  import Icon from './ui/Icon.svelte'
  import type { IconName } from '$lib/icons'

  let toasts = $derived(getToasts())

  /** Map toast types to icon names */
  const TOAST_ICONS: Record<ToastMessage['type'], IconName> = {
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }
</script>

{#if toasts.length > 0}
  <div class="toast-container" role="region" aria-label="Notifications">
    {#each toasts as toast (toast.id)}
      <div
        class="toast toast--{toast.type}"
        role="alert"
      >
        <Icon name={TOAST_ICONS[toast.type]} size="md" class="toast__icon" />
        <span class="toast__message">{toast.message}</span>
        <button
          type="button"
          class="toast__dismiss"
          onclick={() => dismissToast(toast.id)}
          aria-label="Dismiss"
        >
          <Icon name="close" size="sm" />
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: var(--space-lg);
    right: var(--space-lg);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    max-width: min(400px, calc(100vw - 2 * var(--space-lg)));
  }

  .toast {
    display: flex;
    align-items: flex-start;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: oklch(0.15 0.02 250);
    border: 1px solid oklch(0.3 0.05 250);
    border-radius: var(--radius-md);
    box-shadow: 0 4px 12px oklch(0 0 0 / 0.4);
    animation: toast-slide-in 0.3s ease-out;
  }

  @keyframes toast-slide-in {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .toast--success {
    border-color: oklch(0.7 0.2 145 / 0.5);
  }

  .toast--warning {
    border-color: oklch(0.8 0.15 85 / 0.5);
  }

  .toast--error {
    border-color: oklch(0.65 0.25 25 / 0.5);
  }

  .toast--info {
    border-color: oklch(0.7 0.15 250 / 0.5);
  }

  .toast__icon {
    flex-shrink: 0;
    margin-top: 2px;
  }

  .toast__message {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--text-primary);
    line-height: 1.4;
  }

  .toast__dismiss {
    flex-shrink: 0;
    padding: var(--space-2xs);
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: color 0.15s, background-color 0.15s;
  }

  .toast__dismiss:hover {
    color: var(--text-primary);
    background: oklch(1 0 0 / 0.1);
  }

  @media (max-width: 640px) {
    .toast-container {
      bottom: var(--space-md);
      right: var(--space-md);
      left: var(--space-md);
      max-width: none;
    }
  }
</style>
