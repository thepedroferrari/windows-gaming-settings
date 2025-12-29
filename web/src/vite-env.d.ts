/// <reference types="svelte" />

interface ImportMetaEnv {
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
  readonly hot?: {
    readonly data: unknown
    accept(): void
    accept(cb: (mod: unknown) => void): void
    accept(deps: string[], cb: (mods: unknown[]) => void): void
    dispose(cb: (data: unknown) => void): void
    decline(): void
    invalidate(): void
    on(event: string, cb: (...args: unknown[]) => void): void
  }
}

declare module '*.svelte' {
  import type { Component } from 'svelte'
  const component: Component
  export default component
}

declare module 'diff' {
  export interface Change {
    value: string
    added?: boolean
    removed?: boolean
  }
  export function diffLines(oldStr: string, newStr: string): Change[]
}
