/**
 * Result/Either Pattern - Explicit error handling without exceptions
 * ES2024+, TypeScript 5.x advanced patterns
 *
 * The Result type represents either success (Ok) or failure (Err),
 * forcing explicit handling of both cases at compile time.
 */

// =============================================================================
// Core Types - Discriminated Union Pattern
// =============================================================================

/** Success variant containing a value */
export type Ok<T> = { readonly ok: true; readonly value: T }

/** Failure variant containing an error */
export type Err<E> = { readonly ok: false; readonly error: E }

/** Result type - Either success with value T or failure with error E */
export type Result<T, E = Error> = Ok<T> | Err<E>

// =============================================================================
// Constructors - Create Result instances
// =============================================================================

/** Create a successful Result containing a value */
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })

/** Create a failed Result containing an error */
export const err = <E>(error: E): Err<E> => ({ ok: false, error })

// =============================================================================
// Type Guards - Narrow Result types
// =============================================================================

/** Type guard: Check if Result is Ok */
export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result.ok

/** Type guard: Check if Result is Err */
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => !result.ok

// =============================================================================
// Transformations - Functor/Monad operations
// =============================================================================

/**
 * Map over a successful Result (Functor)
 * If Ok, apply fn to value; if Err, pass through unchanged
 */
export const map = <T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  result.ok ? ok(fn(result.value)) : result

/**
 * Map over a failed Result
 * If Err, apply fn to error; if Ok, pass through unchanged
 */
export const mapErr = <T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
  result.ok ? result : err(fn(result.error))

/**
 * FlatMap/Chain over a successful Result (Monad)
 * If Ok, apply fn that returns Result; if Err, pass through unchanged
 */
export const flatMap = <T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> => (result.ok ? fn(result.value) : result)

/**
 * Apply a function wrapped in Result to a value wrapped in Result (Applicative)
 */
export const ap = <T, U, E>(
  resultFn: Result<(value: T) => U, E>,
  result: Result<T, E>,
): Result<U, E> =>
  resultFn.ok && result.ok ? ok(resultFn.value(result.value)) : resultFn.ok ? result : resultFn

// =============================================================================
// Unwrapping - Extract values from Result
// =============================================================================

/**
 * Unwrap Ok value or return default if Err
 */
export const unwrapOr = <T, E>(result: Result<T, E>, defaultValue: T): T =>
  result.ok ? result.value : defaultValue

/**
 * Unwrap Ok value or compute default lazily if Err
 */
export const unwrapOrElse = <T, E>(result: Result<T, E>, fn: (error: E) => T): T =>
  result.ok ? result.value : fn(result.error)

/**
 * Unwrap Ok value or throw error (use sparingly!)
 */
export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (result.ok) return result.value
  throw result.error instanceof Error ? result.error : new Error(String(result.error))
}

/**
 * Unwrap Err value or throw if Ok (for testing/debugging)
 */
export const unwrapErr = <T, E>(result: Result<T, E>): E => {
  if (!result.ok) return result.error
  throw new Error('Called unwrapErr on Ok value')
}

// =============================================================================
// Combining Results - Work with multiple Results
// =============================================================================

/**
 * Combine array of Results into Result of array
 * If all Ok, returns Ok with array of values; if any Err, returns first Err
 */
export const all = <T, E>(results: readonly Result<T, E>[]): Result<readonly T[], E> => {
  const values: T[] = []
  for (const result of results) {
    if (!result.ok) return result
    values.push(result.value)
  }
  return ok(values)
}

/**
 * Return first Ok Result, or last Err if all failed
 */
export const any = <T, E>(results: readonly Result<T, E>[]): Result<T, E> => {
  let lastErr: Result<T, E> = err(new Error('Empty results array') as E)
  for (const result of results) {
    if (result.ok) return result
    lastErr = result
  }
  return lastErr
}

/**
 * Partition Results into [Ok values, Err values]
 */
export const partition = <T, E>(results: readonly Result<T, E>[]): [readonly T[], readonly E[]] => {
  const oks: T[] = []
  const errs: E[] = []
  for (const result of results) {
    if (result.ok) {
      oks.push(result.value)
    } else {
      errs.push(result.error)
    }
  }
  return [oks, errs]
}

// =============================================================================
// Pattern Matching - Handle both cases explicitly
// =============================================================================

/**
 * Pattern match on Result - handle both Ok and Err cases
 */
export const match = <T, E, U>(
  result: Result<T, E>,
  handlers: {
    readonly ok: (value: T) => U
    readonly err: (error: E) => U
  },
): U => (result.ok ? handlers.ok(result.value) : handlers.err(result.error))

/**
 * Execute side effect based on Result variant
 */
export const tap = <T, E>(
  result: Result<T, E>,
  handlers: {
    readonly ok?: (value: T) => void
    readonly err?: (error: E) => void
  },
): Result<T, E> => {
  if (result.ok) {
    handlers.ok?.(result.value)
  } else {
    handlers.err?.(result.error)
  }
  return result
}

// =============================================================================
// Conversion Utilities - Bridge to other patterns
// =============================================================================

/**
 * Convert nullable value to Result
 * null/undefined becomes Err, other values become Ok
 */
export const fromNullable = <T, E>(
  value: T | null | undefined,
  error: E,
): Result<NonNullable<T>, E> => (value != null ? ok(value as NonNullable<T>) : err(error))

/**
 * Convert Result to nullable (loses error information)
 */
export const toNullable = <T, E>(result: Result<T, E>): T | null =>
  result.ok ? result.value : null

/**
 * Wrap a function that might throw into one that returns Result
 */
export const tryCatch = <T, E = Error>(fn: () => T, onError?: (e: unknown) => E): Result<T, E> => {
  try {
    return ok(fn())
  } catch (e) {
    return err(onError ? onError(e) : (e as E))
  }
}

/**
 * Wrap an async function that might throw into one that returns Promise<Result>
 */
export const tryCatchAsync = async <T, E = Error>(
  fn: () => Promise<T>,
  onError?: (e: unknown) => E,
): Promise<Result<T, E>> => {
  try {
    return ok(await fn())
  } catch (e) {
    return err(onError ? onError(e) : (e as E))
  }
}

// =============================================================================
// Filtering - Conditional transformations
// =============================================================================

/**
 * Convert Ok to Err if predicate fails
 */
export const filter = <T, E>(
  result: Result<T, E>,
  predicate: (value: T) => boolean,
  error: E,
): Result<T, E> => (result.ok && !predicate(result.value) ? err(error) : result)

/**
 * Convert Ok to Err if predicate fails (lazy error)
 */
export const filterOrElse = <T, E>(
  result: Result<T, E>,
  predicate: (value: T) => boolean,
  onFalse: (value: T) => E,
): Result<T, E> => (result.ok && !predicate(result.value) ? err(onFalse(result.value)) : result)
