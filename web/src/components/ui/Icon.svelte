<script lang="ts">
  /**
   * Icon Component
   *
   * Renders icons from the UI sprite with consistent sizing and variants.
   * Uses SVG <use> for efficient sprite loading and caching.
   *
   * @example
   * <Icon name="check" />
   * <Icon name="warning" size="lg" variant="warning" />
   * <Icon name="close" label="Close dialog" />
   */

  import type { IconName, IconSize, IconVariant } from '$lib/icons'
  import './icon.styles.css'

  interface Props {
    /** Icon name from the UI sprite */
    name: IconName
    /** Size preset: xs (12px), sm (16px), md (20px), lg (24px), xl (32px) */
    size?: IconSize
    /** Color variant mapped to theme colors */
    variant?: IconVariant
    /** Accessible label - required for non-decorative icons */
    label?: string
    /** Additional CSS classes */
    class?: string
  }

  let {
    name,
    size = 'md',
    variant = 'inherit',
    label,
    class: className = '',
  }: Props = $props()

  let isDecorative = $derived(!label)
</script>

<svg
  class="icon icon--{size} icon--{variant} {className}"
  role={isDecorative ? 'presentation' : 'img'}
  aria-hidden={isDecorative ? 'true' : undefined}
  aria-label={label}
>
  <use href="/icons/ui-sprite.svg#{name}"></use>
</svg>
