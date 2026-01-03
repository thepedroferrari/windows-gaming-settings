/**
 * Icon System - Type definitions and registry
 *
 * Provides type-safe icon names, sizes, and variants for the Icon component.
 */

/**
 * All available icon names in the UI sprite
 */
const ICON_NAMES = [
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
 * Icon size presets
 */
const ICON_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const
export type IconSize = (typeof ICON_SIZES)[number]

/**
 * Icon color variants
 */
const ICON_VARIANTS = [
  'default',
  'accent',
  'success',
  'warning',
  'danger',
  'muted',
  'inherit',
] as const
export type IconVariant = (typeof ICON_VARIANTS)[number]
