import { store } from '../../state'
import type { PresetType } from '../../types'
import { $$ } from '../../utils/dom'
import type { CleanupController } from '../../utils/lifecycle'
import { updateSoftwareCounter } from '../cards'
import { updateSummary } from '../summary/'

interface PresetConfig {
  readonly opts: readonly string[]
  readonly software: readonly string[]
}

const PRESETS = {
  overkill: {
    opts: [
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
      'msi_mode',
      'game_bar',
      'fso_disable',
      'ultimate_perf',
      'services_trim',
      'disk_cleanup',
      'privacy_tier1',
      'privacy_tier2',
      'privacy_tier3',
      'bloatware',
      'ipv4_prefer',
      'teredo_disable',
    ],
    software: ['steam', 'discord', 'processlasso'],
  },
  competitive: {
    opts: [
      'pagefile',
      'fastboot',
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
      'msi_mode',
      'game_bar',
      'fso_disable',
      'ultimate_perf',
      'services_trim',
      'disk_cleanup',
      'privacy_tier2',
    ],
    software: ['steam', 'discord', 'processlasso'],
  },
  streaming: {
    opts: [
      'pagefile',
      'fastboot',
      'power_plan',
      'usb_power',
      'pcie_power',
      'dns',
      'audio_enhancements',
      'gamedvr',
      'background_apps',
      'edge_debloat',
      'copilot_disable',
      'explorer_speed',
      'temp_purge',
      'razer_block',
      'fso_disable',
      'ultimate_perf',
      'services_trim',
      'disk_cleanup',
      'privacy_tier1',
    ],
    software: ['steam', 'discord', 'obs', 'vlc', '7zip'],
  },
  balanced: {
    opts: [
      'pagefile',
      'fastboot',
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
      'disk_cleanup',
      'privacy_tier1',
    ],
    software: ['steam', 'discord', 'vlc', '7zip'],
  },
  minimal: {
    opts: [
      'dns',
      'gamedvr',
      'background_apps',
      'edge_debloat',
      'copilot_disable',
      'temp_purge',
      'razer_block',
    ],
    software: ['steam', '7zip'],
  },
} as const satisfies Record<PresetType, PresetConfig>

const PRESET_LABELS = {
  overkill: 'Overkill',
  competitive: 'Competitive',
  streaming: 'Streaming',
  balanced: 'Balanced',
  minimal: 'Minimal',
} as const satisfies Record<PresetType, string>

const _OPT_DISPLAY_NAMES = {
  pagefile: 'Pagefile',
  fastboot: 'Fast Boot',
  timer: 'Timer 0.5ms',
  power_plan: 'Power Plan',
  usb_power: 'USB Power',
  pcie_power: 'PCIe Link',
  dns: 'DNS',
  nagle: 'Nagle Off',
  audio_enhancements: 'Audio',
  gamedvr: 'GameDVR Off',
  background_apps: 'BG Apps',
  edge_debloat: 'Edge Trim',
  copilot_disable: 'Copilot Off',
  explorer_speed: 'Explorer',
  temp_purge: 'Temp Purge',
  razer_block: 'Razer Block',
  msi_mode: 'MSI Mode',
  game_bar: 'Game Bar',
  fso_disable: 'FSO Off',
  ultimate_perf: 'Ultimate',
  services_trim: 'Services',
  disk_cleanup: 'Disk Clean (if 90%+ full)',
  privacy_tier1: 'Privacy T1',
  privacy_tier2: 'Privacy T2',
  privacy_tier3: 'Privacy T3',
  bloatware: 'Bloatware',
  ipv4_prefer: 'IPv4 Pref',
  teredo_disable: 'Teredo Off',
} as const satisfies Record<string, string>

const CATEGORY_OPTS = {
  system: {
    label: 'System',
    opts: ['pagefile', 'fastboot', 'timer', 'explorer_speed', 'temp_purge'],
  },
  performance: {
    label: 'Performance',
    opts: [
      'gamedvr',
      'background_apps',
      'razer_block',
      'audio_enhancements',
      'game_bar',
      'fso_disable',
    ],
  },
  power: {
    label: 'Power',
    opts: ['power_plan', 'usb_power', 'pcie_power', 'ultimate_perf'],
  },
  network: {
    label: 'Network',
    opts: ['dns', 'nagle', 'ipv4_prefer', 'teredo_disable'],
  },
  privacy: {
    label: 'Privacy',
    opts: [
      'edge_debloat',
      'copilot_disable',
      'privacy_tier1',
      'privacy_tier2',
      'privacy_tier3',
      'bloatware',
    ],
  },
  experimental: {
    label: 'Experimental',
    opts: ['msi_mode', 'services_trim', 'disk_cleanup'],
  },
} as const satisfies Record<string, { label: string; opts: readonly string[] }>

const _RISK_LEVELS = {
  overkill: { stars: '★★★★★', level: 5 },
  competitive: { stars: '★★★☆☆', level: 3 },
  streaming: { stars: '★☆☆☆☆', level: 1 },
  balanced: { stars: '☆☆☆☆☆', level: 0 },
  minimal: { stars: '☆☆☆☆☆', level: 0 },
} as const satisfies Record<PresetType, { stars: string; level: number }>

let currentPreset: PresetType | null = null

const round = (value: number, precision = 3): number => parseFloat(value.toFixed(precision))

const clamp = (value: number, min = 0, max = 100): number => Math.min(Math.max(value, min), max)

const adjust = (
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number,
): number => round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin))

interface SpringConfig {
  stiffness?: number
  damping?: number
}

interface SpringValue {
  x: number
  y: number
  o?: number
}

class Spring {
  target: SpringValue
  current: SpringValue
  velocity: SpringValue
  stiffness: number
  damping: number

  constructor(initialValue: SpringValue, config: SpringConfig = {}) {
    this.target = { ...initialValue }
    this.current = { ...initialValue }
    this.velocity = { x: 0, y: 0, o: 0 }
    this.stiffness = config.stiffness ?? 0.066
    this.damping = config.damping ?? 0.25
  }

  set(target: SpringValue, options?: { soft?: boolean; hard?: boolean }): void {
    this.target = { ...target }
    if (options?.hard) {
      this.current = { ...target }
      this.velocity = { x: 0, y: 0, o: 0 }
    }
  }

  update(): SpringValue {
    const keys: (keyof SpringValue)[] = ['x', 'y', 'o']
    for (const key of keys) {
      if (this.target[key] !== undefined && this.current[key] !== undefined) {
        const delta = (this.target[key] as number) - (this.current[key] as number)
        this.velocity[key] =
          ((this.velocity[key] as number) + delta * this.stiffness) * (1 - this.damping)
        ;(this.current[key] as number) += this.velocity[key] as number
      }
    }
    return this.current
  }

  isSettled(threshold = 0.01): boolean {
    const dx = Math.abs(this.target.x - this.current.x)
    const dy = Math.abs(this.target.y - this.current.y)
    const vx = Math.abs(this.velocity.x)
    const vy = Math.abs(this.velocity.y)
    return dx < threshold && dy < threshold && vx < threshold && vy < threshold
  }
}

interface CardState {
  card: HTMLButtonElement
  rotator: HTMLElement
  shine: HTMLElement
  glare: HTMLElement
  springRotate: Spring
  springGlare: Spring
  springBackground: Spring
  interacting: boolean
  animationId: number | null
  aborted: boolean
}

const cardStates = new Map<HTMLButtonElement, CardState>()

function updatePresetBadges(presetName: PresetType, opts: string[]): void {
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

function fadePresetBadge(optValue: string): void {
  const badge = document.querySelector<HTMLSpanElement>(
    `label[data-opt="${optValue}"] .preset-badge`,
  )
  if (badge && !badge.hidden) badge.classList.add('faded')
}

export function applyPreset(presetName: PresetType): void {
  const preset = PRESETS[presetName]
  currentPreset = presetName

  const optsArray = preset.opts as readonly string[]
  for (const cb of $$<HTMLInputElement>('input[name="opt"]')) {
    cb.checked = optsArray.includes(cb.value)
  }

  updatePresetBadges(presetName, [...optsArray])
  store.setSelection([...preset.software])

  const softwareArray = preset.software as readonly string[]
  for (const card of $$('.software-card')) {
    const key = card.dataset.key
    if (!key) continue
    const selected = softwareArray.includes(key)
    card.classList.toggle('selected', selected)
    card.setAttribute('aria-checked', String(selected))
    const action = card.querySelector('.back-action')
    if (action) action.textContent = selected ? '✓ Selected' : 'Click to add'
  }

  updateSoftwareCounter()
  updateSummary()
  document.dispatchEvent(new CustomEvent('script-change-request'))
}

function applyCardStyles(state: CardState): void {
  const { card, rotator, springRotate, springGlare, springBackground } = state

  const glareX = springGlare.current.x
  const glareY = springGlare.current.y
  const glareO = springGlare.current.o ?? 0

  const pointerFromCenter = clamp(
    Math.sqrt((glareY - 50) * (glareY - 50) + (glareX - 50) * (glareX - 50)) / 50,
    0,
    1,
  )
  const pointerFromTop = glareY / 100
  const pointerFromLeft = glareX / 100

  card.style.setProperty('--pointer-x', `${round(glareX)}%`)
  card.style.setProperty('--pointer-y', `${round(glareY)}%`)
  card.style.setProperty('--pointer-from-center', round(pointerFromCenter).toString())
  card.style.setProperty('--pointer-from-top', round(pointerFromTop).toString())
  card.style.setProperty('--pointer-from-left', round(pointerFromLeft).toString())
  card.style.setProperty('--card-opacity', round(glareO).toString())
  card.style.setProperty('--rotate-x', `${round(springRotate.current.x)}deg`)
  card.style.setProperty('--rotate-y', `${round(springRotate.current.y)}deg`)
  card.style.setProperty('--background-x', `${round(springBackground.current.x)}%`)
  card.style.setProperty('--background-y', `${round(springBackground.current.y)}%`)

  rotator.style.transform = `rotateY(${round(springRotate.current.x)}deg) rotateX(${round(springRotate.current.y)}deg)`
}

function animateCard(state: CardState): void {
  if (state.aborted) {
    state.animationId = null
    return
  }

  state.springRotate.update()
  state.springGlare.update()
  state.springBackground.update()

  applyCardStyles(state)

  const allSettled =
    state.springRotate.isSettled() &&
    state.springGlare.isSettled() &&
    state.springBackground.isSettled()

  if (!allSettled || state.interacting) {
    state.animationId = requestAnimationFrame(() => animateCard(state))
  } else {
    state.animationId = null
  }
}

function startAnimation(state: CardState): void {
  if (state.aborted) return
  if (state.animationId === null) {
    state.animationId = requestAnimationFrame(() => animateCard(state))
  }
}

function handlePointerMove(state: CardState, e: PointerEvent): void {
  if (state.aborted) return
  const rect = state.rotator.getBoundingClientRect()

  const absolute = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }

  const percent = {
    x: clamp(round((100 / rect.width) * absolute.x)),
    y: clamp(round((100 / rect.height) * absolute.y)),
  }

  const center = {
    x: percent.x - 50,
    y: percent.y - 50,
  }

  state.springBackground.set({
    x: adjust(percent.x, 0, 100, 37, 63),
    y: adjust(percent.y, 0, 100, 33, 67),
  })

  state.springRotate.set({
    x: round(center.x / 3.5),
    y: round(-(center.y / 3.5)),
  })

  state.springGlare.set({
    x: round(percent.x),
    y: round(percent.y),
    o: 1,
  })

  startAnimation(state)
}

function handlePointerEnter(state: CardState): void {
  if (state.aborted) return
  state.interacting = true
  state.card.classList.add('interacting')

  state.springRotate.stiffness = 0.066
  state.springRotate.damping = 0.25
  state.springGlare.stiffness = 0.066
  state.springGlare.damping = 0.25
  state.springBackground.stiffness = 0.066
  state.springBackground.damping = 0.25

  startAnimation(state)
}

function handlePointerLeave(state: CardState): void {
  if (state.aborted) return
  state.interacting = false
  state.card.classList.remove('interacting')

  const snapStiff = 0.01
  const snapDamp = 0.06

  state.springRotate.stiffness = snapStiff
  state.springRotate.damping = snapDamp
  state.springRotate.set({ x: 0, y: 0 })

  state.springGlare.stiffness = snapStiff
  state.springGlare.damping = snapDamp
  state.springGlare.set({ x: 50, y: 50, o: 0 })

  state.springBackground.stiffness = snapStiff
  state.springBackground.damping = snapDamp
  state.springBackground.set({ x: 50, y: 50 })

  startAnimation(state)
}

function setupCardHolographicEffect(card: HTMLButtonElement, controller?: CleanupController): void {
  const rotator = card.querySelector<HTMLElement>('.preset-card__rotator')
  const shine = card.querySelector<HTMLElement>('.preset-card__shine')
  const glare = card.querySelector<HTMLElement>('.preset-card__glare')

  if (!rotator || !shine || !glare) return

  const springInteractSettings = { stiffness: 0.066, damping: 0.25 }

  const state: CardState = {
    card,
    rotator,
    shine,
    glare,
    springRotate: new Spring({ x: 0, y: 0 }, springInteractSettings),
    springGlare: new Spring({ x: 50, y: 50, o: 0 }, springInteractSettings),
    springBackground: new Spring({ x: 50, y: 50 }, springInteractSettings),
    interacting: false,
    animationId: null,
    aborted: false,
  }

  cardStates.set(card, state)

  card.style.setProperty('--pointer-x', '50%')
  card.style.setProperty('--pointer-y', '50%')
  card.style.setProperty('--pointer-from-center', '0')
  card.style.setProperty('--pointer-from-top', '0.5')
  card.style.setProperty('--pointer-from-left', '0.5')
  card.style.setProperty('--card-opacity', '0')
  card.style.setProperty('--rotate-x', '0deg')
  card.style.setProperty('--rotate-y', '0deg')
  card.style.setProperty('--background-x', '50%')
  card.style.setProperty('--background-y', '50%')

  rotator.addEventListener(
    'pointermove',
    (e: PointerEvent) => {
      handlePointerMove(state, e)
    },
    { passive: true, signal: controller?.signal },
  )

  rotator.addEventListener(
    'pointerenter',
    () => {
      handlePointerEnter(state)
    },
    { passive: true, signal: controller?.signal },
  )

  rotator.addEventListener(
    'pointerleave',
    () => {
      handlePointerLeave(state)
    },
    { passive: true, signal: controller?.signal },
  )

  controller?.onCleanup(() => {
    state.aborted = true
    if (state.animationId !== null) {
      cancelAnimationFrame(state.animationId)
      state.animationId = null
    }
  })
}

function populateCardStats(card: HTMLButtonElement): void {
  const presetName = card.dataset.preset as PresetType | undefined
  if (!presetName || !PRESETS[presetName]) return

  const preset = PRESETS[presetName]

  const presetOpts = preset.opts as readonly string[]
  for (const [catKey, catConfig] of Object.entries(CATEGORY_OPTS)) {
    const el = card.querySelector<HTMLElement>(`[data-stat="${catKey}"]`)
    if (el) {
      const enabled = catConfig.opts.filter((opt) => presetOpts.includes(opt)).length
      const total = catConfig.opts.length
      el.textContent = `${enabled}/${total}`
      el.dataset.enabled = String(enabled)
      el.dataset.total = String(total)
    }
  }

  const softwareEl = card.querySelector<HTMLElement>('[data-stat="software"]')
  if (softwareEl) softwareEl.textContent = String(preset.software.length)
}

export function setupPresets(controller?: CleanupController): void {
  const cards = $$<HTMLButtonElement>('.preset-card')

  for (const card of cards) {
    populateCardStats(card)
    setupCardHolographicEffect(card, controller)

    const handleCardClick = (): void => {
      const name = card.dataset.preset as PresetType | undefined
      if (!name || !PRESETS[name]) return
      for (const c of cards) c.classList.toggle('active', c === card)
      applyPreset(name)
    }

    card.addEventListener('click', handleCardClick, { signal: controller?.signal })
    const rotator = card.querySelector<HTMLElement>('.preset-card__rotator')
    if (rotator) {
      rotator.addEventListener(
        'click',
        (e) => {
          e.stopPropagation()
          handleCardClick()
        },
        { signal: controller?.signal },
      )
    }
  }

  for (const cb of $$<HTMLInputElement>('input[name="opt"]')) {
    cb.addEventListener('change', () => fadePresetBadge(cb.value), { signal: controller?.signal })
  }

  controller?.onCleanup(() => {
    for (const state of cardStates.values()) {
      state.aborted = true
      if (state.animationId !== null) {
        cancelAnimationFrame(state.animationId)
        state.animationId = null
      }
    }
    cardStates.clear()
  })
}

export function getCurrentPreset(): PresetType | null {
  return currentPreset
}

export { PRESETS as presets }
