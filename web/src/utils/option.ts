/**
 * Option/Maybe Pattern - Explicit nullable handling without null checks
 * ES2024+, TypeScript 5.x advanced patterns
 *
 * The Option type represents either a value (Some) or absence (None),
 * eliminating null/undefined checks through explicit handling.
 */

// =============================================================================
// Core Types - Discriminated Union Pattern
// =============================================================================

/** Some variant containing a value */
export type Some<T> = { readonly _tag: 'Some'; readonly value: T }

/** None variant representing absence */
export type None = { readonly _tag: 'None' }

/** Option type - Either Some with value T or None */
export type Option<T> = Some<T> | None

// =============================================================================
// Constructors - Create Option instances
// =============================================================================

/** Create a Some containing a value */
export const some = <T>(value: T): Some<T> => ({ _tag: 'Some', value })

/** The None singleton - represents absence */
export const none: None = Object.freeze({ _tag: 'None' })

/** Create Option from nullable value */
export const fromNullable = <T>(value: T | null | undefined): Option<NonNullable<T>> =>
  value != null ? some(value as NonNullable<T>) : none

/** Create Option from predicate */
export const fromPredicate = <T>(value: T, predicate: (v: T) => boolean): Option<T> =>
  predicate(value) ? some(value) : none

/** Create Option from falsy value (0, '', false become None) */
export const fromFalsy = <T>(value: T | '' | 0 | false | null | undefined): Option<T> =>
  value ? some(value as T) : none

// =============================================================================
// Type Guards - Narrow Option types
// =============================================================================

/** Type guard: Check if Option is Some */
export const isSome = <T>(option: Option<T>): option is Some<T> => option._tag === 'Some'

/** Type guard: Check if Option is None */
export const isNone = <T>(option: Option<T>): option is None => option._tag === 'None'

// =============================================================================
// Transformations - Functor/Monad operations
// =============================================================================

/**
 * Map over a Some value (Functor)
 * If Some, apply fn to value; if None, pass through unchanged
 */
export const map = <T, U>(option: Option<T>, fn: (value: T) => U): Option<U> =>
  option._tag === 'Some' ? some(fn(option.value)) : none

/**
 * FlatMap/Chain over a Some value (Monad)
 * If Some, apply fn that returns Option; if None, pass through unchanged
 */
export const flatMap = <T, U>(option: Option<T>, fn: (value: T) => Option<U>): Option<U> =>
  option._tag === 'Some' ? fn(option.value) : none

/**
 * Apply a function wrapped in Option to a value wrapped in Option (Applicative)
 */
export const ap = <T, U>(optionFn: Option<(value: T) => U>, option: Option<T>): Option<U> =>
  optionFn._tag === 'Some' && option._tag === 'Some' ? some(optionFn.value(option.value)) : none

/**
 * Filter Some value based on predicate
 * If Some and predicate true, keep value; otherwise None
 */
export const filter = <T>(option: Option<T>, predicate: (value: T) => boolean): Option<T> =>
  option._tag === 'Some' && predicate(option.value) ? option : none

/**
 * Refine Some value to narrower type
 */
export const filterMap = <T, U>(option: Option<T>, fn: (value: T) => Option<U>): Option<U> =>
  option._tag === 'Some' ? fn(option.value) : none

// =============================================================================
// Unwrapping - Extract values from Option
// =============================================================================

/**
 * Unwrap Some value or return default if None
 */
export const getOrElse = <T>(option: Option<T>, defaultValue: T): T =>
  option._tag === 'Some' ? option.value : defaultValue

/**
 * Unwrap Some value or compute default lazily if None
 */
export const getOrElseLazy = <T>(option: Option<T>, fn: () => T): T =>
  option._tag === 'Some' ? option.value : fn()

/**
 * Unwrap Some value or throw error (use sparingly!)
 */
export const getOrThrow = <T>(option: Option<T>, message = 'Called getOrThrow on None'): T => {
  if (option._tag === 'Some') return option.value
  throw new Error(message)
}

/**
 * Convert Option to nullable (T | null)
 */
export const toNullable = <T>(option: Option<T>): T | null =>
  option._tag === 'Some' ? option.value : null

/**
 * Convert Option to undefined (T | undefined)
 */
export const toUndefined = <T>(option: Option<T>): T | undefined =>
  option._tag === 'Some' ? option.value : undefined

// =============================================================================
// Alternative/Choice - Fallback operations
// =============================================================================

/**
 * Return first Some, or second Option if first is None
 */
export const alt = <T>(option: Option<T>, alternative: Option<T>): Option<T> =>
  option._tag === 'Some' ? option : alternative

/**
 * Return first Some, or compute alternative lazily if None
 */
export const altLazy = <T>(option: Option<T>, fn: () => Option<T>): Option<T> =>
  option._tag === 'Some' ? option : fn()

/**
 * Return first Some from array of Options, or None if all are None
 */
export const firstSome = <T>(options: readonly Option<T>[]): Option<T> => {
  for (const option of options) {
    if (option._tag === 'Some') return option
  }
  return none
}

// =============================================================================
// Combining Options - Work with multiple Options
// =============================================================================

/**
 * Combine array of Options into Option of array
 * If all Some, returns Some with array of values; if any None, returns None
 */
export const all = <T>(options: readonly Option<T>[]): Option<readonly T[]> => {
  const values: T[] = []
  for (const option of options) {
    if (option._tag === 'None') return none
    values.push(option.value)
  }
  return some(values)
}

/**
 * Combine two Options with a combining function
 */
export const map2 = <A, B, C>(
  optA: Option<A>,
  optB: Option<B>,
  fn: (a: A, b: B) => C,
): Option<C> =>
  optA._tag === 'Some' && optB._tag === 'Some' ? some(fn(optA.value, optB.value)) : none

/**
 * Combine three Options with a combining function
 */
export const map3 = <A, B, C, D>(
  optA: Option<A>,
  optB: Option<B>,
  optC: Option<C>,
  fn: (a: A, b: B, c: C) => D,
): Option<D> =>
  optA._tag === 'Some' && optB._tag === 'Some' && optC._tag === 'Some'
    ? some(fn(optA.value, optB.value, optC.value))
    : none

/**
 * Partition Options into [Some values, None count]
 */
export const partition = <T>(options: readonly Option<T>[]): [readonly T[], number] => {
  const values: T[] = []
  let noneCount = 0
  for (const option of options) {
    if (option._tag === 'Some') {
      values.push(option.value)
    } else {
      noneCount++
    }
  }
  return [values, noneCount]
}

// =============================================================================
// Pattern Matching - Handle both cases explicitly
// =============================================================================

/**
 * Pattern match on Option - handle both Some and None cases
 */
export const match = <T, U>(
  option: Option<T>,
  handlers: {
    readonly some: (value: T) => U
    readonly none: () => U
  },
): U => (option._tag === 'Some' ? handlers.some(option.value) : handlers.none())

/**
 * Execute side effect based on Option variant
 */
export const tap = <T>(
  option: Option<T>,
  handlers: {
    readonly some?: (value: T) => void
    readonly none?: () => void
  },
): Option<T> => {
  if (option._tag === 'Some') {
    handlers.some?.(option.value)
  } else {
    handlers.none?.()
  }
  return option
}

// =============================================================================
// Predicates - Boolean checks on Option
// =============================================================================

/**
 * Check if Option is Some containing value that satisfies predicate
 */
export const exists = <T>(option: Option<T>, predicate: (value: T) => boolean): boolean =>
  option._tag === 'Some' && predicate(option.value)

/**
 * Check if Option is None or Some containing value that satisfies predicate
 */
export const forAll = <T>(option: Option<T>, predicate: (value: T) => boolean): boolean =>
  option._tag === 'None' || predicate(option.value)

/**
 * Check if Option is Some containing specific value
 */
export const contains = <T>(option: Option<T>, value: T): boolean =>
  option._tag === 'Some' && option.value === value

// =============================================================================
// Iteration - Execute effects
// =============================================================================

/**
 * Execute effect if Some, return undefined
 */
export const forEach = <T>(option: Option<T>, fn: (value: T) => void): void => {
  if (option._tag === 'Some') {
    fn(option.value)
  }
}

// =============================================================================
// Conversion Utilities - Bridge to other patterns
// =============================================================================

import type { Result } from './result'
import { ok, err } from './result'

/**
 * Convert Option to Result
 * Some becomes Ok, None becomes Err with provided error
 */
export const toResult = <T, E>(option: Option<T>, error: E): Result<T, E> =>
  option._tag === 'Some' ? ok(option.value) : err(error)

/**
 * Convert Option to Result with lazy error
 */
export const toResultLazy = <T, E>(option: Option<T>, getError: () => E): Result<T, E> =>
  option._tag === 'Some' ? ok(option.value) : err(getError())

/**
 * Convert Result to Option (discards error information)
 */
export const fromResult = <T, E>(result: Result<T, E>): Option<T> =>
  result.ok ? some(result.value) : none
