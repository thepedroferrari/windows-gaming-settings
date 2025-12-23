import {
  formatZodErrors,
  isParseSuccess,
  safeParseProfile,
  type ValidatedProfile,
} from '../../schemas'
import { store } from '../../state'
import type { SavedProfile } from '../../types'
import { isPeripheralType, PROFILE_VERSION } from '../../types'
import { $, $$, $id, isInputElement } from '../../utils/dom'
import { renderSoftwareGrid } from '../cards'
import { getHardwareProfile, getSelectedOptimizations, updateSummary } from '../summary/'

// =============================================================================
// PROFILE SAVE
// =============================================================================

export function saveProfile(): void {
  const profile = buildProfile()
  downloadProfile(profile)
}

function buildProfile(): SavedProfile {
  return {
    version: PROFILE_VERSION,
    created: new Date().toISOString(),
    hardware: getHardwareProfile(),
    optimizations: getSelectedOptimizations(),
    software: Array.from(store.selectedSoftware),
  }
}

function downloadProfile(profile: SavedProfile): void {
  const json = JSON.stringify(profile, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `rocktune-profile-${Date.now()}.json`
  link.click()

  URL.revokeObjectURL(url)
}

// =============================================================================
// PROFILE LOAD
// =============================================================================

type LoadResult =
  | { readonly success: true; readonly profile: ValidatedProfile }
  | { readonly success: false; readonly error: string }

export function loadProfile(file: File): void {
  const reader = new FileReader()

  reader.onload = (e) => {
    const result = parseProfileFile(e)
    if (!result.success) {
      alert(`Failed to load profile: ${result.error}`)
      return
    }

    applyProfile(result.profile)
    showLoadSuccess(result.profile)
  }

  reader.readAsText(file)
}

function parseProfileFile(event: ProgressEvent<FileReader>): LoadResult {
  try {
    const content = event.target?.result
    if (typeof content !== 'string') {
      return { success: false, error: 'Invalid file content' }
    }

    const rawData: unknown = JSON.parse(content)
    const parseResult = safeParseProfile(rawData)

    if (!isParseSuccess(parseResult)) {
      return { success: false, error: formatZodErrors(parseResult.error) }
    }

    return { success: true, profile: parseResult.data }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

// =============================================================================
// PROFILE APPLICATION
// =============================================================================

function applyProfile(profile: ValidatedProfile): void {
  applyHardwareSettings(profile)
  applyOptimizations(profile.optimizations)
  applySoftwareSelections(profile.software)
  updateSummary()
}

function applyHardwareSettings(profile: ValidatedProfile): void {
  const { hardware } = profile

  // Apply CPU
  const cpuInput = $<HTMLInputElement>(`input[name="cpu"][value="${hardware.cpu}"]`)
  if (isInputElement(cpuInput)) {
    cpuInput.checked = true
  }

  // Apply GPU
  const gpuInput = $<HTMLInputElement>(`input[name="gpu"][value="${hardware.gpu}"]`)
  if (isInputElement(gpuInput)) {
    gpuInput.checked = true
  }

  // Apply peripherals
  const peripheralInputs = $$<HTMLInputElement>('input[name="peripheral"]')
  for (const input of peripheralInputs) {
    const value = input.value
    input.checked = isPeripheralType(value) && hardware.peripherals.includes(value)
  }
}

function applyOptimizations(optimizations: readonly string[]): void {
  const optSet = new Set(optimizations)
  const inputs = $$<HTMLInputElement>('input[name="opt"]')

  for (const input of inputs) {
    input.checked = optSet.has(input.value)
  }
}

function applySoftwareSelections(software: readonly string[]): void {
  store.setSelection([...software])
  renderSoftwareGrid()
}

function showLoadSuccess(profile: ValidatedProfile): void {
  const packageCount = profile.software.length
  const optCount = profile.optimizations.length
  alert(`Profile loaded: ${packageCount} packages, ${optCount} optimizations`)
}

// =============================================================================
// SETUP
// =============================================================================

export function setupProfileActions(): void {
  $id('save-profile-btn')?.addEventListener('click', saveProfile)

  const loadInput = $id('load-profile-input')
  if (isInputElement(loadInput)) {
    loadInput.addEventListener('change', handleFileSelect)
  }
}

function handleFileSelect(event: Event): void {
  const target = event.target
  if (!isInputElement(target)) return

  const file = target.files?.[0]
  if (file) {
    loadProfile(file)
    target.value = '' // Reset for next load
  }
}
