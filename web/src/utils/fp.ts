/**
 * Functional Programming Utilities - Pipe, Compose, and more
 * ES2024+, TypeScript 5.x advanced patterns
 *
 * Type-safe function composition with up to 9 functions in a pipeline.
 * Uses overloads for precise type inference at each step.
 */

// =============================================================================
// Core Types
// =============================================================================

/** Generic unary function type */
export type Fn<A, B> = (a: A) => B

/** Identity function type */
export type Identity<T> = (x: T) => T

/** Predicate function type */
export type Predicate<T> = (x: T) => boolean

/** Refinement predicate for type narrowing */
export type Refinement<T, U extends T> = (x: T) => x is U

// =============================================================================
// Pipe - Left-to-Right Function Composition
// =============================================================================

/**
 * Pipe a value through a series of functions (left-to-right)
 * Type-safe with full inference at each step
 *
 * @example
 * pipe(5, double, addOne, toString) // "11"
 */
export function pipe<A>(a: A): A
export function pipe<A, B>(a: A, ab: Fn<A, B>): B
export function pipe<A, B, C>(a: A, ab: Fn<A, B>, bc: Fn<B, C>): C
export function pipe<A, B, C, D>(a: A, ab: Fn<A, B>, bc: Fn<B, C>, cd: Fn<C, D>): D
export function pipe<A, B, C, D, E>(a: A, ab: Fn<A, B>, bc: Fn<B, C>, cd: Fn<C, D>, de: Fn<D, E>): E
export function pipe<A, B, C, D, E, F>(
  a: A,
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
): F
export function pipe<A, B, C, D, E, F, G>(
  a: A,
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
  fg: Fn<F, G>,
): G
export function pipe<A, B, C, D, E, F, G, H>(
  a: A,
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
  fg: Fn<F, G>,
  gh: Fn<G, H>,
): H
export function pipe<A, B, C, D, E, F, G, H, I>(
  a: A,
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
  fg: Fn<F, G>,
  gh: Fn<G, H>,
  hi: Fn<H, I>,
): I
export function pipe(a: unknown, ...fns: Array<Fn<unknown, unknown>>): unknown {
  return fns.reduce((acc, fn) => fn(acc), a)
}

// =============================================================================
// Flow - Create Pipelines (Point-Free Style)
// =============================================================================

/**
 * Create a function that pipes its argument through a series of functions
 * Similar to pipe, but returns a new function instead of executing immediately
 *
 * @example
 * const transform = flow(double, addOne, toString)
 * transform(5) // "11"
 */
export function flow<A, B>(ab: Fn<A, B>): Fn<A, B>
export function flow<A, B, C>(ab: Fn<A, B>, bc: Fn<B, C>): Fn<A, C>
export function flow<A, B, C, D>(ab: Fn<A, B>, bc: Fn<B, C>, cd: Fn<C, D>): Fn<A, D>
export function flow<A, B, C, D, E>(
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
): Fn<A, E>
export function flow<A, B, C, D, E, F>(
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
): Fn<A, F>
export function flow<A, B, C, D, E, F, G>(
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
  fg: Fn<F, G>,
): Fn<A, G>
export function flow<A, B, C, D, E, F, G, H>(
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
  fg: Fn<F, G>,
  gh: Fn<G, H>,
): Fn<A, H>
export function flow<A, B, C, D, E, F, G, H, I>(
  ab: Fn<A, B>,
  bc: Fn<B, C>,
  cd: Fn<C, D>,
  de: Fn<D, E>,
  ef: Fn<E, F>,
  fg: Fn<F, G>,
  gh: Fn<G, H>,
  hi: Fn<H, I>,
): Fn<A, I>
export function flow(...fns: Array<Fn<unknown, unknown>>): Fn<unknown, unknown> {
  return (a: unknown) => fns.reduce((acc, fn) => fn(acc), a)
}

// =============================================================================
// Compose - Right-to-Left Function Composition
// =============================================================================

/**
 * Compose functions right-to-left (mathematical composition order)
 *
 * @example
 * const transform = compose(toString, addOne, double)
 * transform(5) // "11" (double first, then addOne, then toString)
 */
export function compose<A, B>(ab: Fn<A, B>): Fn<A, B>
export function compose<A, B, C>(bc: Fn<B, C>, ab: Fn<A, B>): Fn<A, C>
export function compose<A, B, C, D>(cd: Fn<C, D>, bc: Fn<B, C>, ab: Fn<A, B>): Fn<A, D>
export function compose<A, B, C, D, E>(
  de: Fn<D, E>,
  cd: Fn<C, D>,
  bc: Fn<B, C>,
  ab: Fn<A, B>,
): Fn<A, E>
export function compose<A, B, C, D, E, F>(
  ef: Fn<E, F>,
  de: Fn<D, E>,
  cd: Fn<C, D>,
  bc: Fn<B, C>,
  ab: Fn<A, B>,
): Fn<A, F>
export function compose(...fns: Array<Fn<unknown, unknown>>): Fn<unknown, unknown> {
  return (a: unknown) => fns.reduceRight((acc, fn) => fn(acc), a)
}

// =============================================================================
// Core Combinators
// =============================================================================

/**
 * Identity function - returns input unchanged
 * Useful as default transformer
 */
export const identity = <T>(x: T): T => x

/**
 * Constant function - always returns the same value
 * Useful for providing default values
 */
export const constant =
  <T>(x: T) =>
  (): T =>
    x

/**
 * Flip argument order of a binary function
 */
export const flip =
  <A, B, C>(fn: (a: A, b: B) => C) =>
  (b: B, a: A): C =>
    fn(a, b)

/**
 * Not combinator - negate a predicate
 */
export const not =
  <T>(predicate: Predicate<T>): Predicate<T> =>
  (x: T) =>
    !predicate(x)

/**
 * Both combinator - combine predicates with AND
 */
export const both =
  <T>(p1: Predicate<T>, p2: Predicate<T>): Predicate<T> =>
  (x: T) =>
    p1(x) && p2(x)

/**
 * Either combinator - combine predicates with OR
 */
export const either =
  <T>(p1: Predicate<T>, p2: Predicate<T>): Predicate<T> =>
  (x: T) =>
    p1(x) || p2(x)

// =============================================================================
// Currying Utilities
// =============================================================================

/**
 * Curry a binary function
 */
export const curry2 =
  <A, B, C>(fn: (a: A, b: B) => C) =>
  (a: A) =>
  (b: B): C =>
    fn(a, b)

/**
 * Curry a ternary function
 */
export const curry3 =
  <A, B, C, D>(fn: (a: A, b: B, c: C) => D) =>
  (a: A) =>
  (b: B) =>
  (c: C): D =>
    fn(a, b, c)

/**
 * Uncurry a curried binary function
 */
export const uncurry2 =
  <A, B, C>(fn: (a: A) => (b: B) => C) =>
  (a: A, b: B): C =>
    fn(a)(b)

/**
 * Uncurry a curried ternary function
 */
export const uncurry3 =
  <A, B, C, D>(fn: (a: A) => (b: B) => (c: C) => D) =>
  (a: A, b: B, c: C): D =>
    fn(a)(b)(c)

// =============================================================================
// Tuple Utilities
// =============================================================================

/**
 * Create a tuple from arguments
 */
export const tuple = <T extends readonly unknown[]>(...args: T): T => args

/**
 * Get first element of tuple
 */
export const fst = <A, B>([a]: readonly [A, B]): A => a

/**
 * Get second element of tuple
 */
export const snd = <A, B>([, b]: readonly [A, B]): B => b

/**
 * Swap tuple elements
 */
export const swap = <A, B>([a, b]: readonly [A, B]): readonly [B, A] => [b, a]

/**
 * Map over first element of tuple
 */
export const mapFst =
  <A, B, C>(fn: Fn<A, C>) =>
  ([a, b]: readonly [A, B]): readonly [C, B] => [fn(a), b]

/**
 * Map over second element of tuple
 */
export const mapSnd =
  <A, B, C>(fn: Fn<B, C>) =>
  ([a, b]: readonly [A, B]): readonly [A, C] => [a, fn(b)]

/**
 * Map over both tuple elements
 */
export const bimap =
  <A, B, C, D>(fnA: Fn<A, C>, fnB: Fn<B, D>) =>
  ([a, b]: readonly [A, B]): readonly [C, D] => [fnA(a), fnB(b)]

// =============================================================================
// Array Utilities (Functional Style)
// =============================================================================

/**
 * Safe head - get first element as Option
 */
import { type Option, some, none } from './option'

export const head = <T>(arr: readonly T[]): Option<T> => (arr.length > 0 ? some(arr[0]) : none)

/**
 * Safe last - get last element as Option
 */
export const last = <T>(arr: readonly T[]): Option<T> =>
  arr.length > 0 ? some(arr[arr.length - 1]) : none

/**
 * Safe init - all elements except last
 */
export const init = <T>(arr: readonly T[]): readonly T[] => (arr.length > 0 ? arr.slice(0, -1) : [])

/**
 * Safe tail - all elements except first
 */
export const tail = <T>(arr: readonly T[]): readonly T[] => (arr.length > 0 ? arr.slice(1) : [])

/**
 * Chunked array - split into chunks of size n
 */
export const chunk = <T>(arr: readonly T[], size: number): readonly (readonly T[])[] => {
  if (size <= 0) return []
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size) as T[])
  }
  return result
}

/**
 * Zip two arrays together
 */
export const zip = <A, B>(as: readonly A[], bs: readonly B[]): readonly (readonly [A, B])[] => {
  const len = Math.min(as.length, bs.length)
  const result: [A, B][] = []
  for (let i = 0; i < len; i++) {
    result.push([as[i], bs[i]])
  }
  return result
}

/**
 * Zip with custom combiner function
 */
export const zipWith = <A, B, C>(
  as: readonly A[],
  bs: readonly B[],
  fn: (a: A, b: B) => C,
): readonly C[] => {
  const len = Math.min(as.length, bs.length)
  const result: C[] = []
  for (let i = 0; i < len; i++) {
    result.push(fn(as[i], bs[i]))
  }
  return result
}

/**
 * Unzip array of tuples into tuple of arrays
 */
export const unzip = <A, B>(
  pairs: readonly (readonly [A, B])[],
): readonly [readonly A[], readonly B[]] => {
  const as: A[] = []
  const bs: B[] = []
  for (const [a, b] of pairs) {
    as.push(a)
    bs.push(b)
  }
  return [as, bs]
}

/**
 * Intersperse - insert element between each array element
 */
export const intersperse = <T>(arr: readonly T[], sep: T): readonly T[] => {
  if (arr.length <= 1) return [...arr]
  const result: T[] = [arr[0]]
  for (let i = 1; i < arr.length; i++) {
    result.push(sep, arr[i])
  }
  return result
}

// =============================================================================
// Object Utilities (Functional Style)
// =============================================================================

/**
 * Pick specific keys from object
 */
export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> => {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

/**
 * Omit specific keys from object
 */
export const omit = <T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Omit<T, K> => {
  const keySet = new Set<K>(keys)
  const result = {} as Omit<T, K>
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (!keySet.has(key as K)) {
      ;(result as Record<string, unknown>)[key as string] = obj[key]
    }
  }
  return result
}

/**
 * Map over object values
 */
export const mapValues = <T extends object, U>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => U,
): Record<keyof T, U> => {
  const result = {} as Record<keyof T, U>
  for (const key of Object.keys(obj) as Array<keyof T>) {
    result[key] = fn(obj[key], key)
  }
  return result
}

/**
 * Filter object entries by predicate
 */
export const filterEntries = <T extends object>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean,
): Partial<T> => {
  const result = {} as Partial<T>
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (predicate(obj[key], key)) {
      result[key] = obj[key]
    }
  }
  return result
}
