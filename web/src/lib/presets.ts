import { z } from 'zod'
import personasDoc from '../../docs/personas.json'
import { PackageKeySchema } from '../schemas'
import { getOptimizationsForProfile, PROFILE_IDS } from './optimizations'
import { isPresetType, type OptimizationKey, type PackageKey, type PresetType } from './types'

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

function toPresetConfig(persona: PersonaRaw): PresetConfig {
  return {
    opts: getOptimizationsForProfile(persona.id),
    software: persona.recommended_software.map((item) => item.key),
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
