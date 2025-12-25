type CleanupFn = () => void

export interface CleanupController {
  readonly signal: AbortSignal
  cleanup: CleanupFn
  onCleanup: (fn: CleanupFn) => void
  addEventListener: <T extends EventTarget>(
    target: T,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => void
  setTimeout: (fn: () => void, delay: number) => ReturnType<typeof setTimeout>
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void
  setInterval: (fn: () => void, delay: number) => ReturnType<typeof setInterval>
  clearInterval: (id: ReturnType<typeof setInterval>) => void
  requestAnimationFrame: (cb: FrameRequestCallback) => number
  cancelAnimationFrame: (id: number) => void
  addObserver: (observer: IntersectionObserver | MutationObserver | ResizeObserver) => void
}

export function createCleanupController(): CleanupController {
  const controller = new AbortController()
  const cleanupFns: CleanupFn[] = []
  const timeoutIds: Set<ReturnType<typeof setTimeout>> = new Set()
  const intervalIds: Set<ReturnType<typeof setInterval>> = new Set()
  const animationFrameIds: Set<number> = new Set()
  const observers: Set<IntersectionObserver | MutationObserver | ResizeObserver> = new Set()
  const cleanupListener: CleanupFn[] = []

  const cleanup: CleanupFn = () => {
    controller.abort()

    for (const id of timeoutIds) {
      clearTimeout(id)
    }
    timeoutIds.clear()

    for (const id of intervalIds) {
      clearInterval(id)
    }
    intervalIds.clear()

    for (const id of animationFrameIds) {
      cancelAnimationFrame(id)
    }
    animationFrameIds.clear()

    for (const observer of observers) {
      observer.disconnect()
    }
    observers.clear()

    for (const fn of cleanupListener) {
      try {
        fn()
      } catch (e) {
        console.error('Cleanup error:', e)
      }
    }
    cleanupListener.length = 0

    for (const fn of cleanupFns) {
      try {
        fn()
      } catch (e) {
        console.error('Cleanup error:', e)
      }
    }
    cleanupFns.length = 0
  }

  return {
    signal: controller.signal,
    cleanup,
    onCleanup: (fn: CleanupFn) => {
      cleanupFns.push(fn)
    },
    addEventListener: <T extends EventTarget>(
      target: T,
      type: string,
      handler: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ): void => {
      if (controller.signal.aborted) return

      let listenerOptions: AddEventListenerOptions | boolean | undefined
      if (options === undefined) {
        listenerOptions = { signal: controller.signal }
      } else if (typeof options === 'boolean') {
        listenerOptions = { capture: options, signal: controller.signal }
      } else {
        listenerOptions = { ...options, signal: controller.signal }
      }

      target.addEventListener(type, handler, listenerOptions)
      cleanupListener.push(() => {
        target.removeEventListener(type, handler, listenerOptions)
      })
    },
    setTimeout: (fn: () => void, delay: number) => {
      const id = globalThis.setTimeout(() => {
        timeoutIds.delete(id)
        if (!controller.signal.aborted) {
          fn()
        }
      }, delay)
      timeoutIds.add(id)
      return id
    },
    clearTimeout: (id: ReturnType<typeof setTimeout>) => {
      if (timeoutIds.has(id)) {
        timeoutIds.delete(id)
      }
      globalThis.clearTimeout(id)
    },
    setInterval: (fn: () => void, delay: number) => {
      const id = globalThis.setInterval(() => {
        if (!controller.signal.aborted) {
          fn()
        }
      }, delay)
      intervalIds.add(id)
      return id
    },
    clearInterval: (id: ReturnType<typeof setInterval>) => {
      if (intervalIds.has(id)) {
        intervalIds.delete(id)
      }
      globalThis.clearInterval(id)
    },
    requestAnimationFrame: (cb: FrameRequestCallback) => {
      const id = globalThis.requestAnimationFrame((time) => {
        animationFrameIds.delete(id)
        if (!controller.signal.aborted) {
          cb(time)
        }
      })
      animationFrameIds.add(id)
      return id
    },
    cancelAnimationFrame: (id: number) => {
      if (animationFrameIds.has(id)) {
        animationFrameIds.delete(id)
      }
      globalThis.cancelAnimationFrame(id)
    },
    addObserver: (observer: IntersectionObserver | MutationObserver | ResizeObserver) => {
      observers.add(observer)
    },
  }
}

let globalController: CleanupController | null = null

export function getGlobalController(): CleanupController {
  if (!globalController) {
    globalController = createCleanupController()
  }
  return globalController
}

export function resetGlobalController(): void {
  if (globalController) {
    globalController.cleanup()
    globalController = null
  }
}
