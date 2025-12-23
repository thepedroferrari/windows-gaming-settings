type CleanupFn = () => void

export interface CleanupController {
  readonly signal: AbortSignal
  cleanup: CleanupFn
  onCleanup: (fn: CleanupFn) => void
  addTimeout: (id: ReturnType<typeof setTimeout>) => void
  addInterval: (id: ReturnType<typeof setInterval>) => void
  addAnimationFrame: (id: number) => void
  addObserver: (observer: IntersectionObserver | MutationObserver | ResizeObserver) => void
}

export function createCleanupController(): CleanupController {
  const controller = new AbortController()
  const cleanupFns: CleanupFn[] = []
  const timeoutIds: Set<ReturnType<typeof setTimeout>> = new Set()
  const intervalIds: Set<ReturnType<typeof setInterval>> = new Set()
  const animationFrameIds: Set<number> = new Set()
  const observers: Set<IntersectionObserver | MutationObserver | ResizeObserver> = new Set()

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
    addTimeout: (id: ReturnType<typeof setTimeout>) => {
      timeoutIds.add(id)
    },
    addInterval: (id: ReturnType<typeof setInterval>) => {
      intervalIds.add(id)
    },
    addAnimationFrame: (id: number) => {
      animationFrameIds.add(id)
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
