<script lang="ts">
  /**
   * Toast Notification Component
   *
   * Displays toast notifications from the toast store.
   * Auto-dismisses after a configurable duration.
   */

  import { getToasts, dismissToast, type ToastMessage } from '$lib/toast.svelte'

  let toasts = $derived(getToasts())

  function getIcon(type: ToastMessage['type']): string {
    switch (type) {
      case 'success':
        return '<path d="m9 12 2 2 4-4" /><circle cx="12" cy="12" r="10" />'
      case 'warning':
        return '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />'
      case 'error':
        return '<circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />'
      case 'info':
      default:
        return '<circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />'
    }
  }
</script>

{#if toasts.length > 0}
  <div class="toast-container" role="region" aria-label="Notifications">
    {#each toasts as toast (toast.id)}
      <div
        class="toast toast--{toast.type}"
        role="alert"
      >
        <svg
          class="toast__icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          aria-hidden="true"
        >
          {@html getIcon(toast.type)}
        </svg>
        <span class="toast__message">{toast.message}</span>
        <button
          type="button"
          class="toast__dismiss"
          onclick={() => dismissToast(toast.id)}
          aria-label="Dismiss"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
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

  .toast--success .toast__icon {
    color: oklch(0.7 0.2 145);
  }

  .toast--warning {
    border-color: oklch(0.8 0.15 85 / 0.5);
  }

  .toast--warning .toast__icon {
    color: oklch(0.8 0.15 85);
  }

  .toast--error {
    border-color: oklch(0.65 0.25 25 / 0.5);
  }

  .toast--error .toast__icon {
    color: oklch(0.65 0.25 25);
  }

  .toast--info {
    border-color: oklch(0.7 0.15 250 / 0.5);
  }

  .toast--info .toast__icon {
    color: oklch(0.7 0.15 250);
  }

  .toast__icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
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

  .toast__dismiss svg {
    width: 16px;
    height: 16px;
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
