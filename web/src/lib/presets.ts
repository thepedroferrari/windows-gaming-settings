import personasDoc from '../../docs/personas.json'
import type { OptimizationKey, PackageKey, PresetType } from './types'

export interface PresetConfig {
  readonly opts: readonly OptimizationKey[]
  readonly software: readonly PackageKey[]
}

export interface PresetMeta {
  readonly label: string
  readonly subtitle: string
  readonly description: string
  readonly rarity: 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common'
  readonly intensity: number
  readonly risk: 'low' | 'medium' | 'high'
  readonly overheadLabel: string
  readonly latencyLabel: string
}

export interface RecommendedPreset {
  readonly name: PresetType
  readonly displayName: string
  readonly software: readonly PackageKey[]
}

interface PersonaSoftware {
  readonly key: string
  readonly reason: string
}

interface PersonaDoc {
  readonly meta: {
    readonly version: string
    readonly source: string
    readonly philosophy: string
  }
  readonly personas: readonly PersonaRaw[]
}

interface PersonaRaw {
  readonly id: string
  readonly display_name: string
  readonly card_badge: string
  readonly card_icon: string
  readonly card_blurb: string
  readonly risk: 'low' | 'medium' | 'high'
  readonly intensity: number
  readonly overhead_label: string
  readonly latency_label: string
  readonly mindset: string
  readonly primary_goals: readonly string[]
  readonly constraints: readonly string[]
  readonly recommended_software: readonly PersonaSoftware[]
  readonly optional_software: readonly PersonaSoftware[]
  readonly avoid_software: readonly PersonaSoftware[]
}

const personaSource = personasDoc as PersonaDoc
const personas = personaSource.personas

const rarityByBadge: Record<string, PresetMeta['rarity']> = {
  LEGENDARY: 'legendary',
  EPIC: 'epic',
  RARE: 'rare',
  RECOMMENDED: 'uncommon',
  COMMON: 'common',
}

/**
 * Curated optimization sets per preset based on their philosophy
 */
const PRESET_OPTIMIZATIONS: Record<string, readonly OptimizationKey[]> = {
  // Competitive Gamer: Aggressive latency + fps focused for competitive gaming
  competitive_gamer: [
    // Input latency
    'timer',
    'mouse_accel',
    'keyboard_response',
    'usb_suspend',
    'usb_power',
    // Display latency
    'gamedvr',
    'fso_disable',
    'multiplane_overlay',
    'display_perf',
    // Network latency
    'nagle',
    'network_throttling',
    // System overhead reduction
    'background_apps',
    'notifications_off',
    'copilot_disable',
    // Power for max clocks
    'ultimate_perf',
    // DPC latency
    'msi_mode',
    'interrupt_affinity',
  ],

  // Gamer: Conservative safe set, stability over maximum performance
  gamer: [
    'power_plan',
    'fastboot',
    'temp_purge',
    'storage_sense',
    'explorer_speed',
    'background_apps',
    'notifications_off',
    'classic_menu',
  ],

  // Streamer: Capture-safe optimizations (NO gamedvr/game_bar - needed for capture)
  streamer: [
    'power_plan',
    'audio_enhancements',
    'usb_power',
    'pcie_power',
    'temp_purge',
    'storage_sense',
    'display_perf',
    'notifications_off',
  ],

  // Benchmarker: Maximum control - all safe + caution + most risky optimizations
  benchmarker: [
    // Safe tier
    'pagefile',
    'fastboot',
    'timer',
    'power_plan',
    'usb_power',
    'pcie_power',
    'dns',
    'nagle',
    'audio_enhancements',
    'gamedvr',
    'background_apps',
    'edge_debloat',
    'copilot_disable',
    'explorer_speed',
    'temp_purge',
    'restore_point',
    'classic_menu',
    'storage_sense',
    'display_perf',
    'end_task',
    'explorer_cleanup',
    'notifications_off',
    'ps7_telemetry',
    'multiplane_overlay',
    'mouse_accel',
    'usb_suspend',
    'keyboard_response',
    // Caution tier
    'msi_mode',
    'hpet',
    'game_bar',
    'hags',
    'fso_disable',
    'ultimate_perf',
    'services_trim',
    'disk_cleanup',
    'wpbt_disable',
    'qos_gaming',
    'network_throttling',
    'interrupt_affinity',
    'process_mitigation',
    // Risky tier (experimental)
    'privacy_tier1',
    'privacy_tier2',
    'bloatware',
    'ipv4_prefer',
    'teredo_disable',
    'audio_exclusive',
    'tcp_optimizer',
  ],
} as const

function toIntensity(value: number): number {
  if (value <= 1) return Math.round(value * 100)
  return Math.round(value)
}

function toPresetConfig(persona: PersonaRaw): PresetConfig {
  return {
    opts: PRESET_OPTIMIZATIONS[persona.id] ?? [],
    software: persona.recommended_software.map((item) => item.key as PackageKey),
  }
}

function toPresetMeta(persona: PersonaRaw): PresetMeta {
  return {
    label: persona.display_name,
    subtitle: persona.mindset,
    description: persona.card_blurb,
    rarity: rarityByBadge[persona.card_badge] ?? 'common',
    intensity: toIntensity(persona.intensity),
    risk: persona.risk,
    overheadLabel: persona.overhead_label,
    latencyLabel: persona.latency_label,
  }
}

export const PRESET_ORDER: PresetType[] = personas.map((persona) => persona.id as PresetType)

export const PRESETS = Object.fromEntries(
  personas.map((persona) => [persona.id, toPresetConfig(persona)]),
) as Record<PresetType, PresetConfig>

export const PRESET_META = Object.fromEntries(
  personas.map((persona) => [persona.id, toPresetMeta(persona)]),
) as Record<PresetType, PresetMeta>

export function getRecommendedPreset(preset: PresetType | null): RecommendedPreset | null {
  if (!preset) return null
  const meta = PRESET_META[preset]
  const config = PRESETS[preset]
  if (!meta || !config) return null
  return {
    name: preset,
    displayName: meta.label,
    software: config.software,
  }
}
