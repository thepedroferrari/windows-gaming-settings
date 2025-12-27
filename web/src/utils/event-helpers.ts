/**
 * Event Binding Helpers - Consolidated DOM event management
 * ES2024+, TypeScript 5.x advanced patterns
 *
 * Provides a fluent, type-safe API for binding DOM events with
 * automatic cleanup via CleanupController integration.
 */

import type { CleanupController } from './lifecycle'

// =============================================================================
// Core Types
// =============================================================================

/** Strict event handler type */
type EventHandler<E extends Event = Event> = (event: E) => void

/** Options for event binding */
interface BindOptions extends AddEventListenerOptions {
  /** Debounce delay in ms */
  debounce?: number
  /** Throttle interval in ms */
  throttle?: number
}

// =============================================================================
// Event Binder Factory - Create scoped event binding functions
// =============================================================================

/**
 * Create an event binder scoped to a CleanupController
 * All registered events are automatically cleaned up
 *
 * @example
 * const bind = createEventBinder(controller)
 * bind(button, 'click', handleClick)
 * bind(window, 'resize', handleResize, { passive: true })
 * // All cleaned up when controller.cleanup() is called
 */
export function createEventBinder(controller?: CleanupController) {
  return <K extends keyof HTMLElementEventMap>(
    target: EventTarget,
    type: K,
    handler: EventHandler<HTMLElementEventMap[K]>,
    options?: BindOptions,
  ): void => {
    let actualHandler: EventListener = handler as EventListener

    // Apply debounce if specified
    if (options?.debounce !== undefined && options.debounce > 0) {
      actualHandler = createDebouncedHandler(handler, options.debounce)
    }

    // Apply throttle if specified (takes precedence over debounce)
    if (options?.throttle !== undefined && options.throttle > 0) {
      actualHandler = createThrottledHandler(handler, options.throttle)
    }

    if (controller) {
      controller.addEventListener(target, type, actualHandler, options)
    } else {
      target.addEventListener(type, actualHandler, options)
    }
  }
}

/**
 * Create a window event binder scoped to a CleanupController
 *
 * @example
 * const bindWindow = createWindowBinder(controller)
 * bindWindow('resize', handleResize, { passive: true })
 */
export function createWindowBinder(controller?: CleanupController) {
  return <K extends keyof WindowEventMap>(
    type: K,
    handler: EventHandler<WindowEventMap[K]>,
    options?: BindOptions,
  ): void => {
    const binder = createEventBinder(controller)
    binder(
      window as unknown as EventTarget,
      type as unknown as keyof HTMLElementEventMap,
      handler as EventHandler,
      options,
    )
  }
}

/**
 * Create a document event binder scoped to a CleanupController
 *
 * @example
 * const bindDoc = createDocumentBinder(controller)
 * bindDoc('keydown', handleKeydown)
 */
export function createDocumentBinder(controller?: CleanupController) {
  return <K extends keyof DocumentEventMap>(
    type: K,
    handler: EventHandler<DocumentEventMap[K]>,
    options?: BindOptions,
  ): void => {
    const binder = createEventBinder(controller)
    binder(document, type as unknown as keyof HTMLElementEventMap, handler as EventHandler, options)
  }
}

// =============================================================================
// Debounce & Throttle Helpers
// =============================================================================

function createDebouncedHandler<E extends Event>(
  handler: EventHandler<E>,
  delay: number,
): EventListener {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  return (event: Event) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      handler(event as E)
    }, delay)
  }
}

function createThrottledHandler<E extends Event>(
  handler: EventHandler<E>,
  interval: number,
): EventListener {
  let lastCall = 0

  return (event: Event) => {
    const now = Date.now()
    if (now - lastCall >= interval) {
      lastCall = now
      handler(event as E)
    }
  }
}

// =============================================================================
// Specialized Event Binders
// =============================================================================

/**
 * Bind click event with optional debounce
 *
 * @example
 * bindClick(button, handleClick, controller)
 * bindClick(button, handleClick, controller, { debounce: 300 })
 */
export function bindClick(
  element: HTMLElement,
  handler: EventHandler<MouseEvent>,
  controller?: CleanupController,
  options?: BindOptions,
): void {
  const binder = createEventBinder(controller)
  binder(element, 'click', handler, options)
}

/**
 * Bind input event with optional debounce (common for search fields)
 *
 * @example
 * bindInput(searchInput, handleSearch, controller, { debounce: 150 })
 */
export function bindInput(
  element: HTMLInputElement | HTMLTextAreaElement,
  handler: EventHandler<Event>,
  controller?: CleanupController,
  options?: BindOptions,
): void {
  const binder = createEventBinder(controller)
  binder(element, 'input', handler, options)
}

/**
 * Bind change event
 *
 * @example
 * bindChange(select, handleChange, controller)
 */
export function bindChange(
  element: HTMLInputElement | HTMLSelectElement,
  handler: EventHandler<Event>,
  controller?: CleanupController,
  options?: BindOptions,
): void {
  const binder = createEventBinder(controller)
  binder(element, 'change', handler, options)
}

/**
 * Bind keydown with key filtering
 *
 * @example
 * bindKeydown(input, 'Enter', handleSubmit, controller)
 * bindKeydown(document, 'Escape', handleClose, controller)
 */
export function bindKeydown(
  element: EventTarget,
  key: string,
  handler: EventHandler<KeyboardEvent>,
  controller?: CleanupController,
  options?: BindOptions,
): void {
  const binder = createEventBinder(controller)
  binder(
    element,
    'keydown',
    (event: KeyboardEvent) => {
      if (event.key === key) {
        handler(event)
      }
    },
    options,
  )
}

/**
 * Bind keydown with modifier keys
 *
 * @example
 * bindHotkey(document, { key: 's', ctrl: true }, handleSave, controller)
 * bindHotkey(document, { key: 'k', meta: true }, handleSearch, controller)
 */
export function bindHotkey(
  element: EventTarget,
  combo: {
    key: string
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean
  },
  handler: EventHandler<KeyboardEvent>,
  controller?: CleanupController,
): void {
  const binder = createEventBinder(controller)
  binder(element, 'keydown', (event: KeyboardEvent) => {
    const matches =
      event.key.toLowerCase() === combo.key.toLowerCase() &&
      (combo.ctrl === undefined || event.ctrlKey === combo.ctrl) &&
      (combo.shift === undefined || event.shiftKey === combo.shift) &&
      (combo.alt === undefined || event.altKey === combo.alt) &&
      (combo.meta === undefined || event.metaKey === combo.meta)

    if (matches) {
      event.preventDefault()
      handler(event)
    }
  })
}

/**
 * Bind hover events (mouseenter/mouseleave pair)
 *
 * @example
 * bindHover(card, { enter: showTooltip, leave: hideTooltip }, controller)
 */
export function bindHover(
  element: HTMLElement,
  handlers: {
    enter?: EventHandler<MouseEvent>
    leave?: EventHandler<MouseEvent>
  },
  controller?: CleanupController,
): void {
  const binder = createEventBinder(controller)
  if (handlers.enter) {
    binder(element, 'mouseenter', handlers.enter)
  }
  if (handlers.leave) {
    binder(element, 'mouseleave', handlers.leave)
  }
}

/**
 * Bind focus events (focus/blur pair)
 *
 * @example
 * bindFocus(input, { focus: highlightField, blur: validateField }, controller)
 */
export function bindFocus(
  element: HTMLElement,
  handlers: {
    focus?: EventHandler<FocusEvent>
    blur?: EventHandler<FocusEvent>
  },
  controller?: CleanupController,
): void {
  const binder = createEventBinder(controller)
  if (handlers.focus) {
    binder(element, 'focus', handlers.focus)
  }
  if (handlers.blur) {
    binder(element, 'blur', handlers.blur)
  }
}

/**
 * Bind scroll event with throttle (default 16ms for 60fps)
 *
 * @example
 * bindScroll(container, handleScroll, controller)
 * bindScroll(window, handleScroll, controller, { throttle: 100 })
 */
export function bindScroll(
  target: EventTarget,
  handler: EventHandler<Event>,
  controller?: CleanupController,
  options: BindOptions = {},
): void {
  const binder = createEventBinder(controller)
  binder(target, 'scroll' as keyof HTMLElementEventMap, handler, {
    passive: true,
    throttle: 16,
    ...options,
  })
}

/**
 * Bind resize event with throttle
 *
 * @example
 * bindResize(handleResize, controller)
 */
export function bindResize(
  handler: EventHandler<UIEvent>,
  controller?: CleanupController,
  options: BindOptions = {},
): void {
  const bindWindow = createWindowBinder(controller)
  bindWindow('resize', handler, {
    passive: true,
    throttle: 100,
    ...options,
  })
}

// =============================================================================
// Event Delegation
// =============================================================================

/**
 * Delegate events to child elements matching a selector
 *
 * @example
 * delegate(list, 'click', '.list-item', (event, target) => {
 *   console.log('Clicked item:', target.dataset.id)
 * }, controller)
 */
export function delegate<E extends keyof HTMLElementEventMap>(
  parent: HTMLElement,
  eventType: E,
  selector: string,
  handler: (event: HTMLElementEventMap[E], target: HTMLElement) => void,
  controller?: CleanupController,
): void {
  const binder = createEventBinder(controller)
  binder(parent, eventType, (event: HTMLElementEventMap[E]) => {
    const target = (event.target as HTMLElement).closest(selector) as HTMLElement | null
    if (target && parent.contains(target)) {
      handler(event, target)
    }
  })
}

/**
 * Delegate with data attribute extraction
 *
 * @example
 * delegateData(list, 'click', 'id', (event, id) => {
 *   console.log('Clicked item with id:', id)
 * }, controller)
 * // Works with elements like: <li data-id="123">...</li>
 */
export function delegateData<E extends keyof HTMLElementEventMap>(
  parent: HTMLElement,
  eventType: E,
  dataAttr: string,
  handler: (event: HTMLElementEventMap[E], value: string) => void,
  controller?: CleanupController,
): void {
  const binder = createEventBinder(controller)
  binder(parent, eventType, (event: HTMLElementEventMap[E]) => {
    const target = event.target as HTMLElement
    const element = target.closest(`[data-${dataAttr}]`) as HTMLElement | null
    if (element && parent.contains(element)) {
      const value = element.dataset[dataAttr]
      if (value !== undefined) {
        handler(event, value)
      }
    }
  })
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Prevent default and stop propagation
 */
export function prevent(event: Event): void {
  event.preventDefault()
  event.stopPropagation()
}

/**
 * Stop immediate propagation
 */
export function stopAll(event: Event): void {
  event.preventDefault()
  event.stopImmediatePropagation()
}

/**
 * Create a handler that prevents default
 */
export function withPreventDefault<E extends Event>(handler: EventHandler<E>): EventHandler<E> {
  return (event: E) => {
    event.preventDefault()
    handler(event)
  }
}

/**
 * Create a handler that stops propagation
 */
export function withStopPropagation<E extends Event>(handler: EventHandler<E>): EventHandler<E> {
  return (event: E) => {
    event.stopPropagation()
    handler(event)
  }
}
