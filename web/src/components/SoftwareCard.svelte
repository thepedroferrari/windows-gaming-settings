<script lang="ts">
  import type { PackageKey, SoftwarePackage, Category } from '$lib/types'
  import { CATEGORY_SVG_ICONS, SIMPLE_ICONS_CDN } from '$lib/types'

  const DESCRIPTION_MAX_LENGTH = 60

  interface Props {
    key: PackageKey
    pkg: SoftwarePackage
    selected: boolean
    delay?: number
    onToggle: (key: PackageKey) => void
  }

  let { key, pkg, selected, delay = 0, onToggle }: Props = $props()

  // Derived state
  let actionText = $derived(selected ? '✓ Selected' : 'Click to add')
  let ariaAction = $derived(selected ? 'remove from' : 'add to')
  let ariaLabel = $derived(
    `${pkg.name}: ${pkg.desc ?? pkg.category}. Press Enter or Space to ${ariaAction} selection.`
  )
  let shortDesc = $derived(
    pkg.desc && pkg.desc.length > DESCRIPTION_MAX_LENGTH
      ? `${pkg.desc.slice(0, DESCRIPTION_MAX_LENGTH - 3)}...`
      : (pkg.desc ?? 'No description available.')
  )

  // Icon type determination
  type LogoType = 'sprite' | 'cdn' | 'emoji' | 'fallback'
  let logoType: LogoType = $derived.by(() => {
    if (pkg.icon) {
      return pkg.icon.endsWith('.svg') || pkg.icon.startsWith('icons/') ? 'sprite' : 'cdn'
    }
    return pkg.emoji ? 'emoji' : 'fallback'
  })

  let spriteId = $derived(pkg.icon?.replace('icons/', '').replace('.svg', '') ?? '')
  let cdnUrl = $derived(`${SIMPLE_ICONS_CDN}/${pkg.icon}/white`)

  function getCategoryIcon(category: Category): string {
    return CATEGORY_SVG_ICONS[category] ?? CATEGORY_SVG_ICONS.default
  }

  // Card tilt state
  let lightX = $state('50%')
  let lightY = $state('50%')
  let transform = $state('')
  let entering = $state(true)
  let iconFailed = $state(false)
  let cardEl: HTMLDivElement | undefined = $state()
  let frameRequest: number | null = null

  // Declarative ripple state
  interface Ripple {
    id: number
    x: number
    y: number
  }
  let ripples = $state<Ripple[]>([])
  let rippleId = 0

  const MAGNETIC_FACTOR = 0.015
  const TILT_FACTOR = 3

  function handleMouseMove(e: MouseEvent) {
    if (!cardEl || frameRequest) return

    frameRequest = requestAnimationFrame(() => {
      frameRequest = null
      if (!cardEl) return

      const isListView = cardEl.closest('.software-grid')?.classList.contains('list-view')
      if (isListView) {
        resetTilt()
        return
      }

      const rect = cardEl.getBoundingClientRect()
      const centerX = e.clientX - rect.left - rect.width / 2
      const centerY = e.clientY - rect.top - rect.height / 2

      const magneticX = centerX * MAGNETIC_FACTOR
      const magneticY = Math.max(0, centerY * MAGNETIC_FACTOR * 0.5)

      const normalizedX = centerX / (rect.width / 2)
      const normalizedY = centerY / (rect.height / 2)
      const rotateY = normalizedX * TILT_FACTOR
      const rotateX = -normalizedY * TILT_FACTOR

      transform = `translate(${magneticX}px, ${magneticY}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
      lightX = `${((e.clientX - rect.left) / rect.width) * 100}%`
      lightY = `${((e.clientY - rect.top) / rect.height) * 100}%`
    })
  }

  function resetTilt() {
    transform = ''
    lightX = '50%'
    lightY = '50%'
  }

  function handleClick(e: MouseEvent) {
    onToggle(key)
    createRipple(e)
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle(key)
    }
  }

  function handleAnimationEnd() {
    entering = false
  }

  function createRipple(e: MouseEvent) {
    if (!cardEl) return
    const rect = cardEl.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    ripples = [...ripples, { id: ++rippleId, x, y }]
  }

  function removeRipple(id: number) {
    ripples = ripples.filter((r) => r.id !== id)
  }

  // Image fallback handler - uses $state to stay in sync with Svelte DOM
  function handleImageError() {
    iconFailed = true
  }

  $effect(() => {
    return () => {
      if (frameRequest) cancelAnimationFrame(frameRequest)
    }
  })
</script>

<div
  bind:this={cardEl}
  class="software-card"
  class:selected
  class:entering
  data-key={key}
  data-category={pkg.category}
  style:animation-delay={`${delay}ms`}
  style:transform
  style:--light-x={lightX}
  style:--light-y={lightY}
  tabindex="0"
  role="switch"
  aria-checked={selected}
  aria-label={ariaLabel}
  onclick={handleClick}
  onkeydown={handleKeydown}
  onmousemove={handleMouseMove}
  onmouseleave={resetTilt}
  onanimationend={handleAnimationEnd}
>
  <!-- Declarative ripple effects -->
  {#each ripples as ripple (ripple.id)}
    <span
      class="ripple"
      style:left="{ripple.x}px"
      style:top="{ripple.y}px"
      onanimationend={() => removeRipple(ripple.id)}
    ></span>
  {/each}

  <div class="inner">
    <div class="scanlines"></div>
    <div class="corner corner--tl"></div>
    <div class="corner corner--tr"></div>
    <div class="corner corner--bl"></div>
    <div class="corner corner--br"></div>

    {#snippet logoIcon()}
      {#if logoType === 'sprite'}
        <svg class="sprite-icon" role="img" aria-label={`${pkg.name} icon`}>
          <use href="icons/sprite.svg#{spriteId}"></use>
        </svg>
      {:else if logoType === 'cdn'}
        {#if iconFailed}
          <svg class="sprite-icon fallback-icon" viewBox="0 0 48 48" role="img" aria-label="Fallback icon">
            <use href="icons/sprite.svg#fallback"></use>
          </svg>
        {:else}
          <img
            src={cdnUrl}
            alt={`${pkg.name} logo`}
            loading="lazy"
            data-category={pkg.category}
            onerror={handleImageError}
          />
        {/if}
      {:else if logoType === 'emoji'}
        <span class="emoji-icon" role="img" aria-label={`${pkg.name} icon`}>{pkg.emoji}</span>
      {:else}
        {@html getCategoryIcon(pkg.category)}
      {/if}
    {/snippet}

    <div class="front">
      <div class="logo">
        {@render logoIcon()}
      </div>
      <span class="name">{pkg.name}</span>
      <span class="list-desc">{shortDesc}</span>
      <span class="list-category">{pkg.category}</span>
    </div>

    <div class="back">
      <span class="back-name">{pkg.name}</span>
      <span class="back-desc">{pkg.desc ?? 'No description available.'}</span>
      <span class="back-category">{pkg.category}</span>
      <span class="back-action">{actionText}</span>
    </div>
  </div>
</div>
