import { z } from 'zod'
import { CATEGORIES, CPU_TYPES, GPU_TYPES, PERIPHERAL_TYPES, PROFILE_VERSION } from './types.ts'

// =============================================================================
// Branded String Schemas - Zod brands for nominal typing
// =============================================================================

/**
 * Package key schema - branded string for catalog keys
 * Ensures unique identification across the software catalog
 */
export const PackageKeySchema = z
  .string()
  .min(1, 'Package key cannot be empty')
  .regex(/^[a-z0-9-]+$/, 'Package key must be lowercase alphanumeric with hyphens')
  .describe('Unique lowercase identifier for a software package')
  .brand<'PackageKey'>()

/**
 * Winget ID schema - branded string for package installation
 * Format: Publisher.PackageName (e.g., "Valve.Steam")
 */
export const WingetIdSchema = z
  .string()
  .min(1, 'Winget ID is required')
  .regex(/^[\w.-]+$/, 'Winget ID must contain only alphanumeric characters, dots, and hyphens')
  .describe('Winget package identifier (e.g., Valve.Steam)')
  .brand<'WingetId'>()

// =============================================================================
// Enum Schemas with Descriptions
// =============================================================================

export const CategorySchema = z
  .enum(CATEGORIES)
  .describe('Software category for filtering and organization')

export const CpuTypeSchema = z
  .enum([CPU_TYPES.AMD_X3D, CPU_TYPES.AMD, CPU_TYPES.INTEL])
  .describe('CPU manufacturer/type for hardware-specific optimizations')

export const GpuTypeSchema = z
  .enum([GPU_TYPES.NVIDIA, GPU_TYPES.AMD, GPU_TYPES.INTEL])
  .describe('GPU manufacturer for driver-specific settings')

export const PeripheralTypeSchema = z
  .enum([
    PERIPHERAL_TYPES.LOGITECH,
    PERIPHERAL_TYPES.RAZER,
    PERIPHERAL_TYPES.CORSAIR,
    PERIPHERAL_TYPES.STEELSERIES,
  ])
  .describe('Peripheral manufacturer for software recommendations')

// =============================================================================
// Transform Schemas - Parse and normalize data
// =============================================================================

/**
 * Trimmed non-empty string - removes whitespace and validates
 */
const TrimmedStringSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s.length > 0, 'String cannot be empty after trimming')

/**
 * Emoji schema - validates single emoji character
 */
const EmojiSchema = z
  .string()
  .regex(/^\p{Emoji}$/u, 'Must be a single emoji')
  .optional()
  .describe('Optional emoji icon for visual display')

/**
 * Icon slug schema - validates icon identifier format
 */
const IconSlugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$|^icons\/[a-z0-9-]+\.svg$/, 'Invalid icon format')
  .optional()
  .describe('Simple Icons slug or local SVG path')

/**
 * Description schema - limited length with trimming
 */
const DescriptionSchema = z
  .string()
  .max(200, 'Description must be 200 characters or less')
  .transform((s) => s.trim())
  .optional()
  .describe('Brief description of the software package')

// =============================================================================
// Software Package Schema - Enhanced with transforms and refinements
// =============================================================================

export const SoftwarePackageSchema = z
  .object({
    id: WingetIdSchema,
    name: TrimmedStringSchema.describe('Human-readable package display name'),
    category: CategorySchema,
    icon: IconSlugSchema,
    emoji: EmojiSchema,
    desc: DescriptionSchema,
    selected: z.boolean().default(false).describe('Default selection state'),
  })
  .describe('Software package definition for the arsenal catalog')

// =============================================================================
// Catalog Schema - With preprocessing for normalization
// =============================================================================

/**
 * Software catalog schema with preprocessing
 * Normalizes keys to lowercase and filters out null entries
 */
export const SoftwareCatalogSchema = z
  .preprocess(
    (data) => {
      if (typeof data !== 'object' || data === null) return data
      // Filter null/undefined entries and normalize keys
      return Object.fromEntries(
        Object.entries(data as Record<string, unknown>)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k.toLowerCase(), v]),
      )
    },
    z.record(z.string().min(1), SoftwarePackageSchema),
  )
  .describe('Complete software catalog with package definitions')

// =============================================================================
// Hardware Profile Schema - With array refinements
// =============================================================================

export const HardwareProfileSchema = z
  .object({
    cpu: CpuTypeSchema,
    gpu: GpuTypeSchema,
    peripherals: z
      .array(PeripheralTypeSchema)
      .max(6, 'Maximum 6 peripherals allowed')
      .refine((arr) => new Set(arr).size === arr.length, 'Duplicate peripherals are not allowed')
      .default([])
      .describe('Selected peripheral manufacturers'),
  })
  .describe('Hardware configuration for optimization targeting')

// =============================================================================
// Saved Profile Schema - With date transform
// =============================================================================

/**
 * Date schema that transforms string to Date object
 */
const DateStringSchema = z
  .string()
  .datetime({ message: 'Invalid ISO date format' })
  .or(z.string().min(1))
  .describe('ISO 8601 date string')

export const SavedProfileSchema = z
  .object({
    version: z.literal(PROFILE_VERSION).describe('Profile schema version'),
    created: DateStringSchema,
    hardware: HardwareProfileSchema,
    optimizations: z.array(z.string().min(1)).describe('Selected optimization keys'),
    software: z.array(z.string().min(1)).describe('Selected software package keys'),
  })
  .describe('Saved user profile for persistence')

export type ValidatedPackage = z.infer<typeof SoftwarePackageSchema>
export type ValidatedCatalog = z.infer<typeof SoftwareCatalogSchema>
export type ValidatedHardware = z.infer<typeof HardwareProfileSchema>
export type ValidatedProfile = z.infer<typeof SavedProfileSchema>

type ParseSuccess<T> = { readonly success: true; readonly data: T }
type ParseFailure = { readonly success: false; readonly error: z.ZodError }
type ParseResult<T> = ParseSuccess<T> | ParseFailure

export function isParseSuccess<T>(result: ParseResult<T>): result is ParseSuccess<T> {
  return result.success
}

export function isParseFailure<T>(result: ParseResult<T>): result is ParseFailure {
  return !result.success
}

export function validateCatalog(data: unknown): ValidatedCatalog {
  return SoftwareCatalogSchema.parse(data)
}

export function validateProfile(data: unknown): ValidatedProfile {
  return SavedProfileSchema.parse(data)
}

export function validatePackage(data: unknown): ValidatedPackage {
  return SoftwarePackageSchema.parse(data)
}

export function safeParseCatalog(data: unknown): ParseResult<ValidatedCatalog> {
  const result = SoftwareCatalogSchema.safeParse(data)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

export function safeParseProfile(data: unknown): ParseResult<ValidatedProfile> {
  const result = SavedProfileSchema.safeParse(data)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

export function safeParsePackage(data: unknown): ParseResult<ValidatedPackage> {
  const result = SoftwarePackageSchema.safeParse(data)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, error: result.error }
}

export function isCatalogEntry(value: unknown): value is [string, ValidatedPackage] {
  if (!Array.isArray(value) || value.length !== 2) return false
  const [key, pkg] = value
  if (typeof key !== 'string') return false
  return SoftwarePackageSchema.safeParse(pkg).success
}

export function isValidCatalog(value: unknown): value is ValidatedCatalog {
  return SoftwareCatalogSchema.safeParse(value).success
}

export function isValidProfile(value: unknown): value is ValidatedProfile {
  return SavedProfileSchema.safeParse(value).success
}

export function formatZodErrors(error: z.ZodError, maxIssues = 3): string {
  return error.issues
    .slice(0, maxIssues)
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : ''
      return `${path}${issue.message}`
    })
    .join(', ')
}
