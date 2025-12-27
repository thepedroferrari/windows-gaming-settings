/**
 * Memoization Utilities - Cache expensive computations
 * ES2024+, TypeScript 5.x advanced patterns
 *
 * Various memoization strategies for different use cases:
 * - Simple: Single-argument functions with Map cache
 * - WeakMap: Object-key functions with automatic GC
 * - Custom Key: Multi-argument functions with custom cache key
 * - LRU: Limited-size cache with eviction
 */

// =============================================================================
// Core Types
// =============================================================================

/** Generic function type */
type AnyFunction = (...args: never[]) => unknown

/** Memoized function with cache control */
export interface MemoizedFunction<T extends AnyFunction> {
  (...args: Parameters<T>): ReturnType<T>
  /** Clear the memoization cache */
  clear: () => void
  /** Get current cache size */
  readonly size: number
}

// =============================================================================
// Simple Memoization - Single primitive argument
// =============================================================================

/**
 * Memoize a single-argument function with primitive keys
 * Uses Map for caching - keys are compared by identity
 *
 * @example
 * const expensiveFn = memoize((n: number) => computeFactorial(n))
 * expensiveFn(10) // Computed
 * expensiveFn(10) // Cached
 */
export function memoize<T extends (arg: string | number | boolean) => unknown>(
  fn: T,
): MemoizedFunction<T> {
  const cache = new Map<Parameters<T>[0], ReturnType<T>>()

  const memoized = (arg: Parameters<T>[0]): ReturnType<T> => {
    if (cache.has(arg)) {
      return cache.get(arg)!
    }
    const result = fn(arg) as ReturnType<T>
    cache.set(arg, result)
    return result
  }

  memoized.clear = () => cache.clear()
  Object.defineProperty(memoized, 'size', { get: () => cache.size })

  return memoized as MemoizedFunction<T>
}

// =============================================================================
// WeakMap Memoization - Object argument with automatic GC
// =============================================================================

/**
 * Memoize a single-argument function with object keys
 * Uses WeakMap - entries are automatically garbage collected
 *
 * @example
 * const getMetadata = memoizeWeak((obj: MyObject) => computeMetadata(obj))
 * getMetadata(someObj) // Computed
 * getMetadata(someObj) // Cached
 * // When someObj is GC'd, cache entry is also cleaned up
 */
export function memoizeWeak<K extends object, V>(fn: (key: K) => V): (key: K) => V {
  const cache = new WeakMap<K, V>()

  return (key: K): V => {
    if (cache.has(key)) {
      return cache.get(key)!
    }
    const result = fn(key)
    cache.set(key, result)
    return result
  }
}

// =============================================================================
// Custom Key Memoization - Multi-argument functions
// =============================================================================

/**
 * Memoize with a custom cache key function
 * Use when you need to memoize multi-argument functions
 *
 * @example
 * const compute = memoizeBy(
 *   (a: number, b: string) => expensiveComputation(a, b),
 *   (a, b) => `${a}:${b}`
 * )
 */
export function memoizeBy<T extends AnyFunction>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string,
): MemoizedFunction<T> {
  const cache = new Map<string, ReturnType<T>>()

  const memoized = (...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn(...args)
    if (cache.has(key)) {
      return cache.get(key)!
    }
    const result = fn(...args) as ReturnType<T>
    cache.set(key, result)
    return result
  }

  memoized.clear = () => cache.clear()
  Object.defineProperty(memoized, 'size', { get: () => cache.size })

  return memoized as MemoizedFunction<T>
}

/**
 * Memoize with JSON.stringify as the default key function
 * Convenient for simple cases but slower for complex args
 *
 * @example
 * const compute = memoizeJSON((opts: Options) => expensiveComputation(opts))
 */
export function memoizeJSON<T extends AnyFunction>(fn: T): MemoizedFunction<T> {
  return memoizeBy(fn, (...args) => JSON.stringify(args))
}

// =============================================================================
// LRU Memoization - Limited cache size with eviction
// =============================================================================

/** LRU memoized function with size limit */
export interface LRUMemoizedFunction<T extends AnyFunction> extends MemoizedFunction<T> {
  /** Maximum cache size */
  readonly maxSize: number
}

/**
 * Memoize with LRU (Least Recently Used) eviction
 * Prevents unbounded memory growth by limiting cache size
 *
 * @example
 * const compute = memoizeLRU(
 *   (id: string) => fetchData(id),
 *   100 // Max 100 entries
 * )
 */
export function memoizeLRU<T extends (arg: string | number) => unknown>(
  fn: T,
  maxSize: number,
): LRUMemoizedFunction<T> {
  // Map maintains insertion order - we use this for LRU
  const cache = new Map<Parameters<T>[0], ReturnType<T>>()

  const memoized = (arg: Parameters<T>[0]): ReturnType<T> => {
    if (cache.has(arg)) {
      // Move to end (most recently used)
      const value = cache.get(arg)!
      cache.delete(arg)
      cache.set(arg, value)
      return value
    }

    const result = fn(arg) as ReturnType<T>

    // Evict oldest if at capacity
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value
      if (oldestKey !== undefined) {
        cache.delete(oldestKey)
      }
    }

    cache.set(arg, result)
    return result
  }

  memoized.clear = () => cache.clear()
  Object.defineProperty(memoized, 'size', { get: () => cache.size })
  Object.defineProperty(memoized, 'maxSize', { value: maxSize })

  return memoized as LRUMemoizedFunction<T>
}

/**
 * LRU memoize with custom key function
 */
export function memoizeLRUBy<T extends AnyFunction>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string,
  maxSize: number,
): LRUMemoizedFunction<T> {
  const cache = new Map<string, ReturnType<T>>()

  const memoized = (...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn(...args)

    if (cache.has(key)) {
      const value = cache.get(key)!
      cache.delete(key)
      cache.set(key, value)
      return value
    }

    const result = fn(...args) as ReturnType<T>

    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value
      if (oldestKey !== undefined) {
        cache.delete(oldestKey)
      }
    }

    cache.set(key, result)
    return result
  }

  memoized.clear = () => cache.clear()
  Object.defineProperty(memoized, 'size', { get: () => cache.size })
  Object.defineProperty(memoized, 'maxSize', { value: maxSize })

  return memoized as LRUMemoizedFunction<T>
}

// =============================================================================
// TTL Memoization - Time-based cache expiration
// =============================================================================

/** TTL memoized function with time-based expiration */
export interface TTLMemoizedFunction<T extends AnyFunction> extends MemoizedFunction<T> {
  /** Time-to-live in milliseconds */
  readonly ttl: number
}

/**
 * Memoize with TTL (Time To Live) expiration
 * Cache entries expire after specified milliseconds
 *
 * @example
 * const fetchUser = memoizeTTL(
 *   (id: string) => api.getUser(id),
 *   5 * 60 * 1000 // 5 minutes
 * )
 */
export function memoizeTTL<T extends (arg: string | number) => unknown>(
  fn: T,
  ttl: number,
): TTLMemoizedFunction<T> {
  const cache = new Map<Parameters<T>[0], { value: ReturnType<T>; expires: number }>()

  const memoized = (arg: Parameters<T>[0]): ReturnType<T> => {
    const now = Date.now()
    const entry = cache.get(arg)

    if (entry && entry.expires > now) {
      return entry.value
    }

    const result = fn(arg) as ReturnType<T>
    cache.set(arg, { value: result, expires: now + ttl })
    return result
  }

  memoized.clear = () => cache.clear()
  Object.defineProperty(memoized, 'size', { get: () => cache.size })
  Object.defineProperty(memoized, 'ttl', { value: ttl })

  return memoized as TTLMemoizedFunction<T>
}

// =============================================================================
// Once - Execute function only once
// =============================================================================

/**
 * Create a function that only executes once
 * Subsequent calls return the cached result
 *
 * @example
 * const initialize = once(() => expensiveSetup())
 * initialize() // Setup runs
 * initialize() // Returns cached result
 */
export function once<T extends () => unknown>(fn: T): () => ReturnType<T> {
  let called = false
  let result: ReturnType<T>

  return (): ReturnType<T> => {
    if (!called) {
      called = true
      result = fn() as ReturnType<T>
    }
    return result
  }
}

/**
 * Create a lazily-evaluated value
 * Computation only runs on first access
 *
 * @example
 * const expensive = lazy(() => computeExpensiveValue())
 * expensive() // Computed
 * expensive() // Cached
 */
export const lazy = once

// =============================================================================
// Async Memoization - Promise-based caching
// =============================================================================

/**
 * Memoize an async function
 * Caches the promise, not just the resolved value
 * Prevents duplicate in-flight requests
 *
 * @example
 * const fetchData = memoizeAsync((id: string) => api.fetch(id))
 * // Multiple simultaneous calls with same id share one request
 * await Promise.all([fetchData('1'), fetchData('1'), fetchData('1')])
 */
export function memoizeAsync<T extends (arg: string | number) => Promise<unknown>>(
  fn: T,
): MemoizedFunction<T> {
  const cache = new Map<Parameters<T>[0], ReturnType<T>>()

  const memoized = (arg: Parameters<T>[0]): ReturnType<T> => {
    if (cache.has(arg)) {
      return cache.get(arg)!
    }

    const promise = fn(arg) as ReturnType<T>
    cache.set(arg, promise)

    // Remove from cache if promise rejects
    ;(promise as Promise<unknown>).catch(() => {
      cache.delete(arg)
    })

    return promise
  }

  memoized.clear = () => cache.clear()
  Object.defineProperty(memoized, 'size', { get: () => cache.size })

  return memoized as MemoizedFunction<T>
}
