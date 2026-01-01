/**
 * Toast Notification Store
 *
 * Reactive store for toast notifications using Svelte 5 runes.
 * Import showToast() anywhere to display notifications.
 */

export interface ToastMessage {
  id: number
  type: 'success' | 'warning' | 'error' | 'info'
  message: string
  duration: number
}

let toasts = $state<ToastMessage[]>([])
let nextId = 0

/**
 * Get current toasts (reactive)
 */
export function getToasts(): ToastMessage[] {
  return toasts
}

/**
 * Show a toast notification
 *
 * @param message - Text to display
 * @param type - 'success' | 'warning' | 'error' | 'info'
 * @param duration - Auto-dismiss after ms (default 5000)
 */
export function showToast(
  message: string,
  type: ToastMessage['type'] = 'info',
  duration = 5000
): void {
  const id = nextId++
  toasts = [...toasts, { id, type, message, duration }]

  // Auto-dismiss
  setTimeout(() => {
    dismissToast(id)
  }, duration)
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id)
}

/**
 * Dismiss all toasts
 */
export function clearToasts(): void {
  toasts = []
}
