import personasDoc from '../../docs/personas.json'
import { getOptimizationsForProfile, type ProfileId } from './optimizations'
import type { OptimizationKey, PackageKey, PresetType } from './types'

export interface PresetConfig {
  readonly opts: readonly OptimizationKey[]
  readonly software: readonly PackageKey[]
}

export interface PresetMeta {
  readonly label: string
  readonly subtitle: string
  readonly description: string
  readonly traits: readonly string[]
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

function toIntensity(value: number): number {
  if (value <= 1) return Math.round(value * 100)
  return Math.round(value)
}

function toPresetConfig(persona: PersonaRaw): PresetConfig {
  return {
    opts: getOptimizationsForProfile(persona.id as ProfileId),
    software: persona.recommended_software.map((item) => item.key as PackageKey),
  }
}

function toPresetMeta(persona: PersonaRaw): PresetMeta {
  return {
    label: persona.display_name,
    subtitle: persona.mindset,
    description: persona.card_blurb,
    traits: persona.constraints.slice(0, 2),
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
