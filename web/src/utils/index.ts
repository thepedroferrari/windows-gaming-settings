/**
 * Utils Barrel Exports
 * ES2024+, TypeScript 5.x - Modern utility library
 *
 * Explicit exports for public API surface
 */

// =============================================================================
// DOM Utilities
// =============================================================================

export {
  $,
  $$,
  $id,
  $idStrict,
  isHTMLElement,
  isInputElement,
  isSelectElement,
  isButtonElement,
  isDialogElement,
  announce,
  escapeHtml,
  sanitize,
  debounce,
  throttle,
  onReady,
  onClick,
  onInput,
  toggleClass,
  addClass,
  removeClass,
  hasClass,
} from './dom'

export type { DebouncedFunction } from './dom'

// =============================================================================
// Lifecycle & Cleanup Management (RAII Pattern)
// =============================================================================

export { createCleanupController, getGlobalController, resetGlobalController } from './lifecycle'

export type { CleanupController } from './lifecycle'

// =============================================================================
// Spring Physics Animation
// =============================================================================

export { Spring, SPRING_PRESETS, round, clamp, adjust, lerp } from './spring'

export type { SpringConfig, SpringValue } from './spring'

// =============================================================================
// Result/Either Pattern - Explicit Error Handling
// =============================================================================

export {
  // Constructors
  ok,
  err,
  // Type guards
  isOk,
  isErr,
  // Transformations
  map as mapResult,
  mapErr,
  flatMap as flatMapResult,
  ap as apResult,
  // Unwrapping
  unwrapOr,
  unwrapOrElse,
  unwrap,
  unwrapErr,
  // Combining
  all as allResults,
  any as anyResult,
  partition as partitionResults,
  // Pattern matching
  match as matchResult,
  tap as tapResult,
  // Conversions
  fromNullable as resultFromNullable,
  toNullable as resultToNullable,
  tryCatch,
  tryCatchAsync,
  // Filtering
  filter as filterResult,
  filterOrElse,
} from './result'

export type { Ok, Err, Result } from './result'

// =============================================================================
// Option/Maybe Pattern - Explicit Nullable Handling
// =============================================================================

export {
  // Constructors
  some,
  none,
  fromNullable as optionFromNullable,
  fromPredicate,
  fromFalsy,
  // Type guards
  isSome,
  isNone,
  // Transformations
  map as mapOption,
  flatMap as flatMapOption,
  ap as apOption,
  filter as filterOption,
  filterMap,
  // Unwrapping
  getOrElse,
  getOrElseLazy,
  getOrThrow,
  toNullable as optionToNullable,
  toUndefined,
  // Alternative
  alt,
  altLazy,
  firstSome,
  // Combining
  all as allOptions,
  map2,
  map3,
  partition as partitionOptions,
  // Pattern matching
  match as matchOption,
  tap as tapOption,
  // Predicates
  exists,
  forAll,
  contains,
  // Iteration
  forEach,
  // Conversions
  toResult,
  toResultLazy,
  fromResult,
} from './option'

export type { Some, None, Option } from './option'

// =============================================================================
// Functional Programming Utilities
// =============================================================================

export {
  // Composition
  pipe,
  flow,
  compose,
  // Combinators
  identity,
  constant,
  flip,
  not,
  both,
  either,
  // Currying
  curry2,
  curry3,
  uncurry2,
  uncurry3,
  // Tuples
  tuple,
  fst,
  snd,
  swap,
  mapFst,
  mapSnd,
  bimap,
  // Arrays
  head,
  last,
  init,
  tail,
  chunk,
  zip,
  zipWith,
  unzip,
  intersperse,
  // Objects
  pick,
  omit,
  mapValues,
  filterEntries,
} from './fp'

export type { Fn, Identity, Predicate, Refinement } from './fp'

// =============================================================================
// Memoization Utilities
// =============================================================================

export {
  memoize,
  memoizeWeak,
  memoizeBy,
  memoizeJSON,
  memoizeLRU,
  memoizeLRUBy,
  memoizeTTL,
  once,
  lazy,
  memoizeAsync,
} from './memo'

export type { MemoizedFunction, LRUMemoizedFunction, TTLMemoizedFunction } from './memo'

// =============================================================================
// Typed Custom Events
// =============================================================================

export {
  dispatch,
  dispatchOn,
  on,
  onElement,
  once as onceEvent,
  waitFor,
  waitForWithTimeout,
  TypedEmitter,
} from './events'

export type {
  AppEventMap,
  AppEventName,
  VoidEvents,
  DataEvents,
  EventPayload,
} from './events'

// =============================================================================
// Event Binding Helpers
// =============================================================================

export {
  createEventBinder,
  createWindowBinder,
  createDocumentBinder,
  bindClick,
  bindInput,
  bindChange,
  bindKeydown,
  bindHotkey,
  bindHover,
  bindFocus,
  bindScroll,
  bindResize,
  delegate,
  delegateData,
  prevent,
  stopAll,
  withPreventDefault,
  withStopPropagation,
} from './event-helpers'

// =============================================================================
// Visual Effects
// =============================================================================

export { setupCursorGlow, setupProgressNav, createRipple, setupImageFallbacks } from './effects'

// =============================================================================
// Frame Scheduling
// =============================================================================

export { getFrameScheduler } from './frame'

export type { FrameScheduler } from './frame'

// =============================================================================
// Tooltips
// =============================================================================

export { setupTooltips } from './tooltips'
