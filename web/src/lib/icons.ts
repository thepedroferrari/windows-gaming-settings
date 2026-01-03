/**
 * Icon System - Type definitions and registry
 *
 * Provides type-safe icon names, sizes, and variants for the Icon component.
 */

/**
 * All available icon names in the UI sprite
 */
export const ICON_NAMES = [
  // Actions
  'check',
  'close',
  'copy',
  'download',
  'share',
  'refresh',
  'print',
  'plus',
  'minus',
  'trash',

  // Navigation
  'chevron-right',
  'chevron-down',
  'chevron-up',
  'chevron-left',
  'arrow-up',
  'arrow-right',
  'external-link',
  'triangle-right',

  // Status
  'warning',
  'info',
  'success',
  'error',
  'star',
  'star-filled',
  'shield',
  'shield-check',
  'eye',

  // Objects
  'code',
  'folder',
  'settings',
  'cpu',
  'gpu',
  'question',
  'fingerprint',
  'github',
  'play',
  'search',
  'link',
  'email',
  'skull',

  // Social
  'twitter',
  'reddit',
  'linkedin',
  'discord',
] as const

export type IconName = (typeof ICON_NAMES)[number]

/**
 * Type guard for valid icon names
 */
export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && ICON_NAMES.includes(value as IconName)
}

/**
 * Icon size presets
 */
export const ICON_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const
export type IconSize = (typeof ICON_SIZES)[number]

/**
 * Size values in pixels
 */
export const ICON_SIZE_VALUES: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
}

/**
 * Icon color variants
 */
export const ICON_VARIANTS = [
  'default',
  'accent',
  'success',
  'warning',
  'danger',
  'muted',
  'inherit',
] as const
export type IconVariant = (typeof ICON_VARIANTS)[number]
