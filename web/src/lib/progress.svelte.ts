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

    // Version check - reset if outdated
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
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

// Reactive state
let progressData = $state<ProgressData>(getDefaultData())

// Initialize from localStorage on module load
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
 * Mark an item as completed
 */
export function markCompleted(sectionId: string, itemId: string): void {
  if (!progressData.sections[sectionId]) {
    progressData.sections[sectionId] = {}
  }

  progressData.sections[sectionId][itemId] = true
  saveToStorage(progressData)
}

/**
 * Mark an item as not completed
 */
export function markIncomplete(sectionId: string, itemId: string): void {
  if (!progressData.sections[sectionId]) {
    progressData.sections[sectionId] = {}
  }

  progressData.sections[sectionId][itemId] = false
  saveToStorage(progressData)
}

/**
 * Get completion count for a section
 */
export function getSectionProgress(
  sectionId: string,
  totalItems: number,
): { completed: number; total: number; percent: number } {
  const section = progressData.sections[sectionId] ?? {}
  const completed = Object.values(section).filter(Boolean).length

  return {
    completed,
    total: totalItems,
    percent: totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0,
  }
}

/**
 * Get overall completion across all sections
 */
export function getOverallProgress(sectionTotals: Record<string, number>): {
  completed: number
  total: number
  percent: number
} {
  let completed = 0
  let total = 0

  for (const [sectionId, sectionTotal] of Object.entries(sectionTotals)) {
    const section = progressData.sections[sectionId] ?? {}
    completed += Object.values(section).filter(Boolean).length
    total += sectionTotal
  }

  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
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
  // Prefer explicit ID (semantic, stable, collision-free)
  if (typeof item.id === 'string') {
    return item.id
  }

  // Fallback: derive from first matching property (legacy behavior)
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

  // Last resort: hash of stringified item
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
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}
