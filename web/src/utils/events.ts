/**
 * Typed Custom Events - Type-safe event dispatch and subscription
 * ES2024+, TypeScript 5.x advanced patterns
 *
 * Provides compile-time safety for custom events:
 * - Event names are validated against the registry
 * - Event payloads are type-checked
 * - Listeners receive properly typed event details
 */

import type { CleanupController } from './lifecycle'
import type { PresetType, FilterValue, OptimizationKey, PackageKey } from '../types'

// =============================================================================
// Event Registry - Define all custom events and their payloads
// =============================================================================

/**
 * Application event registry
 * Maps event names to their payload types
 *
 * - void: Event has no payload
 * - object: Event carries structured data
 */
export interface AppEventMap {
  /** Script needs to be regenerated */
  'script-change-request': void

  /** Software selection has changed */
  'software-selection-changed': void

  /** Preset was applied */
  'preset-applied': {
    readonly preset: PresetType
    readonly software: readonly PackageKey[]
    readonly optimizations: readonly OptimizationKey[]
  }

  /** Filter changed */
  'filter-changed': {
    readonly filter: FilterValue
    readonly previousFilter: FilterValue
  }

  /** Search term changed */
  'search-changed': {
    readonly term: string
  }

  /** Software card toggled */
  'software-toggled': {
    readonly key: PackageKey
    readonly selected: boolean
  }

  /** Optimization toggled */
  'optimization-toggled': {
    readonly key: OptimizationKey
    readonly enabled: boolean
  }

  /** Script generation started */
  'script-generation-started': void

  /** Script generation completed */
  'script-generation-completed': {
    readonly scriptSize: number
    readonly packageCount: number
    readonly optimizationCount: number
  }

  /** Hardware profile changed */
  'hardware-changed': {
    readonly field: 'cpu' | 'gpu' | 'peripherals' | 'monitorSoftware'
  }
}

// =============================================================================
// Template Literal Types - Event name constraints
// =============================================================================

/** All registered event names */
export type AppEventName = keyof AppEventMap

/** Events with void payload (no detail) */
export type VoidEvents = {
  [K in keyof AppEventMap]: AppEventMap[K] extends void ? K : never
}[keyof AppEventMap]

/** Events with data payload */
export type DataEvents = Exclude<AppEventName, VoidEvents>

/** Get payload type for an event */
export type EventPayload<E extends AppEventName> = AppEventMap[E]

// =============================================================================
// Dispatch Functions - Fire events with type safety
// =============================================================================

/**
 * Dispatch a void event (no payload)
 *
 * @example
 * dispatch('script-change-request')
 */
export function dispatch(event: VoidEvents): void

/**
 * Dispatch an event with payload
 *
 * @example
 * dispatch('preset-applied', {
 *   preset: 'competitive',
 *   software: ['steam', 'discord'],
 *   optimizations: ['power_plan']
 * })
 */
export function dispatch<E extends DataEvents>(event: E, detail: AppEventMap[E]): void

export function dispatch<E extends AppEventName>(event: E, detail?: AppEventMap[E]): void {
  const customEvent = new CustomEvent(event, {
    detail,
    bubbles: true,
    cancelable: true,
  })
  document.dispatchEvent(customEvent)
}

/**
 * Dispatch event on a specific target
 */
export function dispatchOn<E extends VoidEvents>(target: EventTarget, event: E): void
export function dispatchOn<E extends DataEvents>(
  target: EventTarget,
  event: E,
  detail: AppEventMap[E],
): void
export function dispatchOn<E extends AppEventName>(
  target: EventTarget,
  event: E,
  detail?: AppEventMap[E],
): void {
  const customEvent = new CustomEvent(event, {
    detail,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(customEvent)
}

// =============================================================================
// Subscription Functions - Listen for events with type safety
// =============================================================================

/** Handler for void events */
type VoidHandler = () => void

/** Handler for events with payload */
type DataHandler<E extends DataEvents> = (detail: AppEventMap[E]) => void

/**
 * Subscribe to a void event
 *
 * @example
 * on('script-change-request', () => {
 *   console.log('Script change requested')
 * })
 */
export function on(event: VoidEvents, handler: VoidHandler, controller?: CleanupController): void

/**
 * Subscribe to an event with payload
 *
 * @example
 * on('preset-applied', ({ preset, software }) => {
 *   console.log(`Applied ${preset} with ${software.length} packages`)
 * })
 */
export function on<E extends DataEvents>(
  event: E,
  handler: DataHandler<E>,
  controller?: CleanupController,
): void

export function on<E extends AppEventName>(
  event: E,
  handler: AppEventMap[E] extends void ? VoidHandler : DataHandler<E & DataEvents>,
  controller?: CleanupController,
): void {
  const listener = (e: Event) => {
    const customEvent = e as CustomEvent<AppEventMap[E]>
    // For void events, handler takes no args; for data events, pass detail
    if (customEvent.detail !== undefined) {
      ;(handler as DataHandler<E & DataEvents>)(customEvent.detail as AppEventMap[E & DataEvents])
    } else {
      ;(handler as VoidHandler)()
    }
  }

  if (controller) {
    controller.addEventListener(document, event, listener)
  } else {
    document.addEventListener(event, listener)
  }
}

/**
 * Subscribe to event on a specific target
 */
export function onElement<E extends VoidEvents>(
  target: EventTarget,
  event: E,
  handler: VoidHandler,
  controller?: CleanupController,
): void
export function onElement<E extends DataEvents>(
  target: EventTarget,
  event: E,
  handler: DataHandler<E>,
  controller?: CleanupController,
): void
export function onElement<E extends AppEventName>(
  target: EventTarget,
  event: E,
  handler: AppEventMap[E] extends void ? VoidHandler : DataHandler<E & DataEvents>,
  controller?: CleanupController,
): void {
  const listener = (e: Event) => {
    const customEvent = e as CustomEvent<AppEventMap[E]>
    if (customEvent.detail !== undefined) {
      ;(handler as DataHandler<E & DataEvents>)(customEvent.detail as AppEventMap[E & DataEvents])
    } else {
      ;(handler as VoidHandler)()
    }
  }

  if (controller) {
    controller.addEventListener(target, event, listener)
  } else {
    target.addEventListener(event, listener)
  }
}

/**
 * Subscribe to event once (auto-removes after first fire)
 */
export function once<E extends VoidEvents>(event: E, handler: VoidHandler): void
export function once<E extends DataEvents>(event: E, handler: DataHandler<E>): void
export function once<E extends AppEventName>(
  event: E,
  handler: AppEventMap[E] extends void ? VoidHandler : DataHandler<E & DataEvents>,
): void {
  const listener = (e: Event) => {
    document.removeEventListener(event, listener)
    const customEvent = e as CustomEvent<AppEventMap[E]>
    if (customEvent.detail !== undefined) {
      ;(handler as DataHandler<E & DataEvents>)(customEvent.detail as AppEventMap[E & DataEvents])
    } else {
      ;(handler as VoidHandler)()
    }
  }

  document.addEventListener(event, listener)
}

// =============================================================================
// Promise-based Events - Await event occurrence
// =============================================================================

/**
 * Wait for a void event to fire
 *
 * @example
 * await waitFor('script-change-request')
 */
export function waitFor(event: VoidEvents): Promise<void>

/**
 * Wait for an event with payload
 *
 * @example
 * const { preset } = await waitFor('preset-applied')
 */
export function waitFor<E extends DataEvents>(event: E): Promise<AppEventMap[E]>

export function waitFor<E extends AppEventName>(
  event: E,
): Promise<AppEventMap[E] extends void ? void : AppEventMap[E]> {
  return new Promise((resolve) => {
    const listener = (e: Event) => {
      document.removeEventListener(event, listener)
      const customEvent = e as CustomEvent<AppEventMap[E]>
      resolve(customEvent.detail as AppEventMap[E] extends void ? void : AppEventMap[E])
    }
    document.addEventListener(event, listener)
  })
}

/**
 * Wait for event with timeout (ES2024 Promise.withResolvers pattern)
 */
export function waitForWithTimeout<E extends VoidEvents>(event: E, ms: number): Promise<void>
export function waitForWithTimeout<E extends DataEvents>(
  event: E,
  ms: number,
): Promise<AppEventMap[E]>
export function waitForWithTimeout<E extends AppEventName>(
  event: E,
  ms: number,
): Promise<AppEventMap[E] extends void ? void : AppEventMap[E]> {
  // ES2024 Promise.withResolvers()
  const { promise, resolve, reject } =
    Promise.withResolvers<AppEventMap[E] extends void ? void : AppEventMap[E]>()

  const timeout = setTimeout(() => {
    document.removeEventListener(event, listener)
    reject(new Error(`Timeout waiting for event: ${event}`))
  }, ms)

  const listener = (e: Event) => {
    clearTimeout(timeout)
    document.removeEventListener(event, listener)
    const customEvent = e as CustomEvent<AppEventMap[E]>
    resolve(customEvent.detail as AppEventMap[E] extends void ? void : AppEventMap[E])
  }

  document.addEventListener(event, listener)
  return promise
}

// =============================================================================
// Event Emitter Class - Object-oriented alternative
// =============================================================================

/**
 * Type-safe event emitter for encapsulated event handling
 *
 * @example
 * const events = new TypedEmitter<AppEventMap>()
 * events.on('preset-applied', ({ preset }) => console.log(preset))
 * events.emit('preset-applied', { preset: 'competitive', ... })
 */
export class TypedEmitter<TEventMap extends Record<string, unknown>> {
  readonly #target: EventTarget

  constructor(target: EventTarget = new EventTarget()) {
    this.#target = target
  }

  emit<E extends keyof TEventMap & string>(
    event: E,
    ...args: TEventMap[E] extends void ? [] : [detail: TEventMap[E]]
  ): void {
    const [detail] = args
    this.#target.dispatchEvent(new CustomEvent(event, { detail }))
  }

  on<E extends keyof TEventMap & string>(
    event: E,
    handler: TEventMap[E] extends void ? () => void : (detail: TEventMap[E]) => void,
  ): () => void {
    const listener = (e: Event) => {
      const customEvent = e as CustomEvent<TEventMap[E]>
      if (customEvent.detail !== undefined) {
        ;(handler as (detail: TEventMap[E]) => void)(customEvent.detail)
      } else {
        ;(handler as () => void)()
      }
    }
    this.#target.addEventListener(event, listener)
    return () => this.#target.removeEventListener(event, listener)
  }

  once<E extends keyof TEventMap & string>(
    event: E,
    handler: TEventMap[E] extends void ? () => void : (detail: TEventMap[E]) => void,
  ): void {
    const listener = (e: Event) => {
      this.#target.removeEventListener(event, listener)
      const customEvent = e as CustomEvent<TEventMap[E]>
      if (customEvent.detail !== undefined) {
        ;(handler as (detail: TEventMap[E]) => void)(customEvent.detail)
      } else {
        ;(handler as () => void)()
      }
    }
    this.#target.addEventListener(event, listener)
  }

  off<E extends keyof TEventMap & string>(event: E, handler: EventListener): void {
    this.#target.removeEventListener(event, handler)
  }
}
