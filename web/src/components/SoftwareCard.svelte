<script lang="ts">
  import type { PackageKey, SoftwarePackage, Category } from '$lib/types'
  import { CATEGORY_SVG_ICONS, SIMPLE_ICONS_CDN } from '$lib/types'

  interface Props {
    key: PackageKey
    pkg: SoftwarePackage
    selected: boolean
    onToggle: (key: PackageKey) => void
    overlayPosition?: 'right' | 'left'
  }

  let { key, pkg, selected, onToggle, overlayPosition = 'right' }: Props = $props()

  // Unique ID for checkbox-label association
  let inputId = $derived(`pkg-${key}`)

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

  let iconFailed = $state(false)
  let isHovered = $state(false)

  function handleChange() {
    onToggle(key)
  }

  function handleImageError() {
    iconFailed = true
  }

  function handleMouseEnter() {
    isHovered = true
  }

  function handleMouseLeave() {
    isHovered = false
  }
</script>

<div
  class="software-card"
  class:selected
  class:hovered={isHovered}
  data-key={key}
  data-category={pkg.category}
  data-overlay-position={overlayPosition === 'left' ? 'left' : undefined}
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
>
  <!-- Hidden checkbox for semantic toggle -->
  <input
    type="checkbox"
    id={inputId}
    checked={selected}
    onchange={handleChange}
    class="sr-only"
    aria-describedby="{inputId}-desc"
  />

  <!-- Label wraps entire card for click-to-toggle -->
  <label for={inputId} class="card-label">
    <figure class="logo">
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
            onerror={handleImageError}
          />
        {/if}
      {:else if logoType === 'emoji'}
        <span class="emoji-icon" role="img" aria-label={`${pkg.name} icon`}>{pkg.emoji}</span>
      {:else}
        {@html getCategoryIcon(pkg.category)}
      {/if}
    </figure>

    <span class="name">{pkg.name}</span>
    <span id="{inputId}-desc" class="sr-only">{pkg.desc ?? pkg.category}</span>

    <!-- Overlay inside label - clicking it toggles the checkbox -->
    <div class="card-overlay">
    
    <div class="overlay-card">
      <figure class="overlay-logo">
        {#if logoType === 'sprite'}
          <svg class="sprite-icon" role="img" aria-hidden="true">
            <use href="icons/sprite.svg#{spriteId}"></use>
          </svg>
        {:else if logoType === 'cdn'}
          {#if iconFailed}
            <svg class="sprite-icon fallback-icon" viewBox="0 0 48 48" role="img" aria-hidden="true">
              <use href="icons/sprite.svg#fallback"></use>
            </svg>
          {:else}
            <img src={cdnUrl} alt="" loading="lazy" />
          {/if}
        {:else if logoType === 'emoji'}
          <span class="emoji-icon" aria-hidden="true">{pkg.emoji}</span>
        {:else}
          {@html getCategoryIcon(pkg.category)}
        {/if}
      </figure>
      <span class="overlay-name">{pkg.name}</span>
    </div>

    
    <div class="overlay-info">
      <div class="overlay-header">
        <h3 class="overlay-title">{pkg.name}</h3>
        <span class="overlay-category">{pkg.category}</span>
      </div>
      {#if pkg.desc}
        <p class="overlay-desc">{pkg.desc}</p>
      {/if}
    </div>

    
    <div class="overlay-footer">
      <div class="overlay-winget" title="winget install --id &quot;{pkg.id}&quot;">
        <span class="overlay-winget-label">winget:</span>
        <span class="overlay-winget-id">{pkg.id}</span>
      </div>

      <button
        class="overlay-action"
        class:overlay-action--add={!selected}
        class:overlay-action--remove={selected}
        onclick={(e) => { e.stopPropagation(); e.preventDefault(); handleChange(); }}
        type="button"
      >
        {#if selected}
          <svg class="overlay-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Remove
        {:else}
          <svg class="overlay-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add
        {/if}
      </button>
    </div>
  </div>
  </label>

  <span class="list-desc">{pkg.desc ?? ''}</span>
  <span class="list-category">{pkg.category}</span>
</div>
