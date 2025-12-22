import { store } from '../state'
import { $$ } from '../utils/dom'
import { updateSoftwareCounter } from './cards'
import { updateSummary } from './summary'

export interface Preset {
  opts: string[]
  software: string[]
}

type PresetName = 'competitive' | 'streaming' | 'balanced' | 'minimal'

// Extreme Gamers profile definitions
// Principles: FPS first, offline-friendly, power-hungry allowed, clear reversibility
export const presets: Record<PresetName, Preset> = {
  competitive: {
    // Max FPS / lowest latency; accepts UX/power cost
    opts: [
      // Safe tier (all enabled)
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
      'razer_block',
      // Caution tier (aggressive)
      'msi_mode',
      'game_bar',
      'fso_disable', // May affect HDR
      'ultimate_perf', // High power plan
      'services_trim',
      'disk_cleanup',
      // Risky tier (network)
      'privacy_tier2', // Aggressive telemetry
      'ipv4_prefer',
      'teredo_disable',
    ],
    software: ['steam', 'discord'],
  },
  streaming: {
    // Low-latency but stable for capture/encoders
    opts: [
      // Safe tier
      'pagefile',
      'fastboot',
      'timer',
      'power_plan',
      'usb_power',
      'pcie_power',
      'dns',
      'audio_enhancements',
      'gamedvr', // Still disable DVR (use OBS instead)
      'background_apps',
      'edge_debloat',
      'copilot_disable',
      'explorer_speed',
      'temp_purge',
      'razer_block',
      // Caution tier (more conservative)
      'fso_disable',
      'ultimate_perf',
      'services_trim',
      'disk_cleanup',
      // Privacy: safe level only
      'privacy_tier1',
    ],
    software: ['steam', 'discord', 'obs', 'vlc', '7zip'],
  },
  balanced: {
    // Sensible gains without risky toggles
    opts: [
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
      'razer_block',
      // Caution tier (conservative)
      'disk_cleanup',
      // Privacy: safe level
      'privacy_tier1',
    ],
    software: ['steam', 'discord', 'vlc', '7zip'],
  },
  minimal: {
    // Bare minimum for FPS; almost no risk
    opts: [
      // Only the safest, most impactful
      'dns',
      'gamedvr', // Even minimal should disable DVR
      'background_apps',
      'edge_debloat',
      'copilot_disable',
      'temp_purge',
      'razer_block',
    ],
    software: ['steam', '7zip'],
  },
}

const PRESET_LABELS: Record<PresetName, string> = {
  competitive: 'Competitive',
  streaming: 'Streaming',
  balanced: 'Balanced',
  minimal: 'Minimal',
}

// =============================================================================
// STATE
// =============================================================================

let currentPreset: PresetName | null = null

// =============================================================================
// PRESET BADGES
// =============================================================================

function updatePresetBadges(presetName: PresetName, opts: string[]): void {
  const optsSet = new Set(opts)

  for (const label of $$<HTMLLabelElement>('label[data-opt]')) {
    const optValue = label.dataset.opt
    const badge = label.querySelector<HTMLSpanElement>('.preset-badge')
    if (!badge || !optValue) continue

    if (optsSet.has(optValue)) {
      badge.textContent = PRESET_LABELS[presetName]
      badge.dataset.preset = presetName
      badge.hidden = false
      badge.classList.remove('faded')
    } else {
      badge.hidden = true
    }
  }
}

function clearAllBadges(): void {
  for (const badge of $$<HTMLSpanElement>('.preset-badge')) {
    badge.hidden = true
  }
}

function fadePresetBadge(optValue: string): void {
  const label = document.querySelector<HTMLLabelElement>(`label[data-opt="${optValue}"]`)
  const badge = label?.querySelector<HTMLSpanElement>('.preset-badge')
  if (badge && !badge.hidden) {
    badge.classList.add('faded')
  }
}

function setupManualToggleDetection(): void {
  for (const checkbox of $$<HTMLInputElement>('input[name="opt"]')) {
    checkbox.addEventListener('change', () => {
      // If user manually changes an option, fade its badge
      fadePresetBadge(checkbox.value)
    })
  }
}

function applyPreset(presetName: PresetName): void {
  const preset = presets[presetName]
  currentPreset = presetName

  // Apply optimization checkboxes
  for (const cb of $$<HTMLInputElement>('input[name="opt"]')) {
    cb.checked = preset.opts.includes(cb.value)
  }

  // Update preset badges
  updatePresetBadges(presetName, preset.opts)

  // Apply software selection
  store.setSelection(preset.software)

  // Update card UI
  for (const card of $$('.software-card')) {
    const key = card.dataset.key
    if (!key) continue

    const selected = preset.software.includes(key)
    card.classList.toggle('selected', selected)
    card.setAttribute('aria-checked', selected ? 'true' : 'false')

    const action = card.querySelector('.back-action')
    if (action) action.textContent = selected ? '✓ Selected' : 'Click to add'
  }

  updateSoftwareCounter()
  updateSummary()
  document.dispatchEvent(new CustomEvent('script-change-request'))
}

export function setupPresets(): void {
  const presetButtons = $$<HTMLButtonElement>('.preset-btn')

  for (const btn of presetButtons) {
    btn.addEventListener('click', () => {
      const presetName = btn.dataset.preset as PresetName | undefined
      if (!presetName || !presets[presetName]) return

      // Update active state on all buttons
      for (const b of presetButtons) {
        b.classList.toggle('active', b === btn)
      }

      applyPreset(presetName)
    })
  }

  setupManualToggleDetection()
}

export function getCurrentPreset(): PresetName | null {
  return currentPreset
}
