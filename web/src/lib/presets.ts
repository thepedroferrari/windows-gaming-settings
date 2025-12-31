import { z } from 'zod'
import personasDoc from '../../docs/personas.json'
import { PackageKeySchema } from '../schemas'
import { getOptimizationsForProfile, PROFILE_IDS, OPTIMIZATIONS } from './optimizations'
import {
  isPresetType,
  OPTIMIZATION_TIERS,
  type OptimizationKey,
  type PackageKey,
  type PresetType,
} from './types'

export interface PresetConfig {
  readonly opts: readonly OptimizationKey[]
  readonly software: readonly PackageKey[]
}

/** Tier breakdown for optimizations */
export interface TierBreakdown {
  readonly safe: number
  readonly caution: number
  readonly risky: number
  readonly ludicrous: number
  readonly total: number
}

export interface PresetMeta {
  readonly label: string
  readonly subtitle: string
  readonly description: string
  readonly bestFor: string
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

const PersonaSoftwareSchema = z.object({
  key: PackageKeySchema,
  reason: z.string(),
})

const PersonaSchema = z.object({
  id: z.enum(PROFILE_IDS),
  display_name: z.string(),
  card_badge: z.string(),
  card_icon: z.string(),
  card_blurb: z.string(),
  best_for: z.string(),
  risk: z.enum(['low', 'medium', 'high']),
  intensity: z.number(),
  overhead_label: z.string(),
  latency_label: z.string(),
  mindset: z.string(),
  primary_goals: z.array(z.string()),
  constraints: z.array(z.string()),
  recommended_software: z.array(PersonaSoftwareSchema),
  optional_software: z.array(PersonaSoftwareSchema),
  avoid_software: z.array(PersonaSoftwareSchema),
})

const PersonaDocSchema = z.object({
  meta: z.object({
    version: z.string(),
    source: z.string(),
    philosophy: z.string(),
  }),
  personas: z.array(PersonaSchema),
})

type PersonaRaw = z.infer<typeof PersonaSchema>

const personaSource = PersonaDocSchema.parse(personasDoc)
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

function toPackageKey(value: unknown): PackageKey {
  return PackageKeySchema.parse(value) as unknown as PackageKey
}

function toPresetConfig(persona: PersonaRaw): PresetConfig {
  const software = persona.recommended_software.map((item) => toPackageKey(item.key))
  return {
    opts: getOptimizationsForProfile(persona.id),
    software,
  }
}

function toPresetMeta(persona: PersonaRaw): PresetMeta {
  return {
    label: persona.display_name,
    subtitle: persona.mindset,
    description: persona.card_blurb,
    bestFor: persona.best_for,
    traits: persona.constraints.slice(0, 2),
    rarity: rarityByBadge[persona.card_badge] ?? 'common',
    intensity: toIntensity(persona.intensity),
    risk: persona.risk,
    overheadLabel: persona.overhead_label,
    latencyLabel: persona.latency_label,
  }
}

/** Calculate tier breakdown for a set of optimizations */
export function getTierBreakdown(opts: readonly OptimizationKey[]): TierBreakdown {
  const optSet = new Set(opts)
  let safe = 0
  let caution = 0
  let risky = 0
  let ludicrous = 0

  for (const opt of OPTIMIZATIONS) {
    if (optSet.has(opt.key)) {
      switch (opt.tier) {
        case OPTIMIZATION_TIERS.SAFE:
          safe++
          break
        case OPTIMIZATION_TIERS.CAUTION:
          caution++
          break
        case OPTIMIZATION_TIERS.RISKY:
          risky++
          break
        case OPTIMIZATION_TIERS.LUDICROUS:
          ludicrous++
          break
      }
    }
  }

  return { safe, caution, risky, ludicrous, total: safe + caution + risky + ludicrous }
}

/** Get tier breakdown for a preset */
export function getPresetTierBreakdown(preset: PresetType): TierBreakdown {
  const config = PRESETS[preset]
  if (!config) return { safe: 0, caution: 0, risky: 0, ludicrous: 0, total: 0 }
  return getTierBreakdown(config.opts)
}

const presetPersonas = personas.filter((persona): persona is PersonaRaw & { id: PresetType } =>
  isPresetType(persona.id),
)

export const PRESET_ORDER: PresetType[] = presetPersonas.map((persona) => persona.id)

export const PRESETS = Object.fromEntries(
  presetPersonas.map((persona) => [persona.id, toPresetConfig(persona)]),
)

export const PRESET_META = Object.fromEntries(
  presetPersonas.map((persona) => [persona.id, toPresetMeta(persona)]),
)

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
