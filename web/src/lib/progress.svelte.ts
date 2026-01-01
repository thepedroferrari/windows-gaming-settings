/**
 * Progress tracking store with localStorage persistence
 *
 * Tracks completion of manual steps across sections.
 * Persists to localStorage so progress survives browser sessions.
 * Resets on new computer (no cloud sync - intentional).
 */

const STORAGE_KEY = 'rocktune_progress'
const STORAGE_VERSION = 1

interface ProgressData {
  version: number
  lastUpdated: string
  sections: Record<string, Record<string, boolean>>
}

function getDefaultData(): ProgressData {
  return {
    version: STORAGE_VERSION,
    lastUpdated: new Date().toISOString(),
    sections: {},
  }
}

function loadFromStorage(): ProgressData {
  if (typeof window === 'undefined') return getDefaultData()

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return getDefaultData()

    const data = JSON.parse(stored) as ProgressData

    if (data.version !== STORAGE_VERSION) {
      return getDefaultData()
    }

    return data
  } catch {
    return getDefaultData()
  }
}

function saveToStorage(data: ProgressData): void {
  if (typeof window === 'undefined') return

  try {
    data.lastUpdated = new Date().toISOString()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {}
}

let progressData = $state<ProgressData>(getDefaultData())

if (typeof window !== 'undefined') {
  progressData = loadFromStorage()
}

/**
 * Check if an item is completed
 */
export function isCompleted(sectionId: string, itemId: string): boolean {
  return progressData.sections[sectionId]?.[itemId] ?? false
}

/**
 * Toggle completion status of an item
 */
export function toggleItem(sectionId: string, itemId: string): void {
  if (!progressData.sections[sectionId]) {
    progressData.sections[sectionId] = {}
  }

  const current = progressData.sections[sectionId][itemId] ?? false
  progressData.sections[sectionId][itemId] = !current

  saveToStorage(progressData)
}

/**
 * Reset progress for a specific section
 */
export function resetSection(sectionId: string): void {
  delete progressData.sections[sectionId]
  saveToStorage(progressData)
}

/**
 * Reset all progress
 */
export function resetAll(): void {
  progressData = getDefaultData()
  saveToStorage(progressData)
}

/**
 * Get reactive progress data (for UI binding)
 */
export function getProgressData(): ProgressData {
  return progressData
}

/**
 * Create a unique item ID from item properties
 * Prefers explicit `id` field, falls back to deriving from content
 */
export function createItemId(item: Record<string, unknown>): string {
  if (typeof item.id === 'string') {
    return item.id
  }

  const keys = [
    'setting',
    'step',
    'check',
    'problem',
    'game',
    'tool',
    'path',
    'software',
    'browser',
  ]
  for (const key of keys) {
    if (typeof item[key] === 'string') {
      return slugify(item[key] as string)
    }
  }

  return hashCode(JSON.stringify(item))
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

function hashCode(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}
