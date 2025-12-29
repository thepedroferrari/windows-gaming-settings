<script lang="ts">
  /**
   * CursorGlow - Ambient cursor following glow effect
   *
   * Creates a subtle radial glow that follows the mouse cursor
   * with eased animation for a smooth, ambient effect.
   */

  import { onMount } from 'svelte'

  let glowEl: HTMLElement | undefined = $state()
  let targetX = $state(0)
  let targetY = $state(0)
  let currentX = $state(0)
  let currentY = $state(0)
  let isAnimating = $state(false)
  let rafId: number | null = null

  const EASE = 0.12
  const SETTLE_THRESHOLD = 0.5

  function handleMouseMove(e: MouseEvent) {
    targetX = e.clientX
    targetY = e.clientY

    if (!isAnimating) {
      isAnimating = true
      rafId = requestAnimationFrame(animate)
    }
  }

  function animate() {
    if (!glowEl) {
      isAnimating = false
      return
    }

    const dx = targetX - currentX
    const dy = targetY - currentY

    currentX += dx * EASE
    currentY += dy * EASE

    glowEl.style.left = `${currentX}px`
    glowEl.style.top = `${currentY}px`

    const settled = Math.abs(dx) < SETTLE_THRESHOLD && Math.abs(dy) < SETTLE_THRESHOLD
    if (settled) {
      isAnimating = false
      rafId = null
    } else {
      rafId = requestAnimationFrame(animate)
    }
  }

  onMount(() => {
    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
    }
  })
</script>

<div class="cursor-glow" bind:this={glowEl} aria-hidden="true"></div>

<style>
  .cursor-glow {
    position: fixed;
    width: 400px;
    height: 400px;
    pointer-events: none;
    z-index: 0;
    transform: translate(-50%, -50%);
    background: radial-gradient(
      circle,
      color-mix(in oklch, var(--accent) 15%, transparent) 0%,
      color-mix(in oklch, var(--accent) 5%, transparent) 30%,
      transparent 70%
    );
    filter: blur(40px);
    opacity: 0.6;
    will-change: left, top;
  }

  @media (prefers-reduced-motion: reduce) {
    .cursor-glow {
      display: none;
    }
  }
</style>
