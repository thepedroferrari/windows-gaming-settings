import { existsSync } from 'https://deno.land/std@0.220.0/fs/mod.ts'
import { formatZodErrors, isParseSuccess, safeParseCatalog } from '../src/schemas.ts'
import { MONITOR_TO_PACKAGE, PERIPHERAL_TO_PACKAGE } from '../src/lib/script-generator.ts'

type CatalogEntry = {
  readonly id: string
  readonly name: string
  readonly category: string
  readonly icon?: string
}

type CatalogJson = Record<string, CatalogEntry>

type Issue = {
  readonly level: 'error' | 'warning'
  readonly message: string
}

const CATALOG_PATH = new URL('../public/catalog.json', import.meta.url)
const PERSONAS_PATH = new URL('../docs/personas.json', import.meta.url)
const ICONS_DIR = new URL('../public/icons/', import.meta.url)

const decoder = new TextDecoder()

async function readJson(url: URL): Promise<unknown> {
  const data = await Deno.readFile(url)
  return JSON.parse(decoder.decode(data))
}

function pushIssue(issues: Issue[], level: Issue['level'], message: string): void {
  issues.push({ level, message })
}

function collectPersonaKeys(data: unknown): string[] {
  if (!data || typeof data !== 'object') return []
  const personas = (data as { personas?: unknown }).personas
  if (!Array.isArray(personas)) return []

  const keys: string[] = []
  for (const persona of personas) {
    if (!persona || typeof persona !== 'object') continue
    const softwareGroups = [
      (persona as { recommended_software?: unknown }).recommended_software,
      (persona as { optional_software?: unknown }).optional_software,
      (persona as { avoid_software?: unknown }).avoid_software,
    ]
    for (const group of softwareGroups) {
      if (!Array.isArray(group)) continue
      for (const item of group) {
        if (!item || typeof item !== 'object') continue
        const key = (item as { key?: unknown }).key
        if (typeof key === 'string') {
          keys.push(key)
        }
      }
    }
  }
  return keys
}

function findDuplicate(values: readonly string[]): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value)
    } else {
      seen.add(value)
    }
  }
  return Array.from(duplicates)
}

async function main(): Promise<void> {
  const issues: Issue[] = []

  const rawCatalog = await readJson(CATALOG_PATH)
  const parsed = safeParseCatalog(rawCatalog)

  if (!isParseSuccess(parsed)) {
    pushIssue(issues, 'error', `Catalog schema invalid: ${formatZodErrors(parsed.error, 6)}`)
  } else {
    const catalog = parsed.data as CatalogJson

    const ids = Object.values(catalog)
      .map((entry) => entry.id)
      .filter(Boolean)
    const names = Object.values(catalog)
      .map((entry) => entry.name)
      .filter(Boolean)

    const duplicateIds = findDuplicate(ids)
    if (duplicateIds.length > 0) {
      pushIssue(issues, 'error', `Duplicate winget IDs: ${duplicateIds.join(', ')}`)
    }

    const duplicateNames = findDuplicate(names)
    if (duplicateNames.length > 0) {
      pushIssue(issues, 'warning', `Duplicate names: ${duplicateNames.join(', ')}`)
    }

    for (const [key, entry] of Object.entries(catalog)) {
      if (!entry.name.trim()) {
        pushIssue(issues, 'error', `Empty name for catalog key: ${key}`)
      }

      if (entry.icon?.startsWith('icons/')) {
        const iconPath = new URL(entry.icon.replace(/^icons\//, ''), ICONS_DIR)
        if (!existsSync(iconPath)) {
          pushIssue(issues, 'error', `Missing icon file for ${key}: ${entry.icon}`)
        }
      }
    }

    const personasRaw = await readJson(PERSONAS_PATH)
    const personaKeys = collectPersonaKeys(personasRaw)
    for (const key of personaKeys) {
      if (!(key in catalog)) {
        pushIssue(issues, 'error', `Persona references missing catalog key: ${key}`)
      }
    }

    for (const [peripheral, key] of Object.entries(PERIPHERAL_TO_PACKAGE)) {
      if (key && !(key in catalog)) {
        pushIssue(
          issues,
          'error',
          `Peripheral mapping ${peripheral} references missing catalog key: ${key}`,
        )
      }
    }

    for (const [monitor, key] of Object.entries(MONITOR_TO_PACKAGE)) {
      if (key && !(key in catalog)) {
        pushIssue(
          issues,
          'error',
          `Monitor mapping ${monitor} references missing catalog key: ${key}`,
        )
      }
    }
  }

  if (issues.length === 0) {
    console.log('Catalog audit passed: all entries are internally consistent.')
    return
  }

  for (const issue of issues) {
    const prefix = issue.level === 'error' ? 'ERROR' : 'WARN'
    const log = issue.level === 'error' ? console.error : console.warn
    log(`${prefix}: ${issue.message}`)
  }

  if (issues.some((issue) => issue.level === 'error')) {
    Deno.exit(1)
  }
}

await main()
