import { store } from '../../state'
import type { PresetType } from '../../types'
import { $$ } from '../../utils/dom'
import type { CleanupController } from '../../utils/lifecycle'
import { adjust, clamp, round, Spring, SPRING_PRESETS } from '../../utils/spring'
import { updateSoftwareCounter } from '../cards'
import { showRecommendedFilter } from '../filters'
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
      // New optimizations
      'restore_point',
      'classic_menu',
      'storage_sense',
      'display_perf',
      'end_task',
      'explorer_cleanup',
      'notifications_off',
      'ps7_telemetry',
      'multiplane_overlay',
      'mouse_accel',
      'usb_suspend',
      'keyboard_response',
      'wpbt_disable',
      'qos_gaming',
      'network_throttling',
      'interrupt_affinity',
      'process_mitigation',
      'tcp_optimizer',
      'audio_exclusive',
      'core_isolation_off',
    ],
    software: [
      'steam',
      'discord',
      'processlasso',
      'hwinfo',
      'afterburner',
      'rtss',
      'capframex',
      'cinebench',
      'furmark',
      'occt',
      'nvcleanstall',
      'displaydriveruninstaller',
    ],
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
      // Competitive-focused new opts
      'storage_sense',
      'display_perf',
      'notifications_off',
      'mouse_accel',
      'keyboard_response',
      'usb_suspend',
      'qos_gaming',
      'network_throttling',
      'tcp_optimizer',
      'audio_exclusive',
    ],
    software: [
      'steam',
      'discord',
      'processlasso',
      'hwinfo',
      'afterburner',
      'rtss',
      '7zip',
      'sharex',
    ],
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
      // Streaming-focused new opts
      'storage_sense',
      'notifications_off',
      'multiplane_overlay',
      'qos_gaming',
      'network_throttling',
    ],
    software: [
      'steam',
      'discord',
      'obs',
      'vlc',
      '7zip',
      'voicemeeter',
      'nvidiabroadcast',
      'elgato',
      'sharex',
      'moonlight',
      'sunshine',
    ],
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
      // Safe additions for balanced
      'classic_menu',
      'storage_sense',
      'mouse_accel',
      'keyboard_response',
    ],
    software: [
      'steam',
      'discord',
      'vlc',
      '7zip',
      'brave',
      'bitwarden',
      'powertoys',
      'sharex',
      'spotify',
      'qbittorrent',
    ],
  },
} as const satisfies Record<PresetType, PresetConfig>

const PRESET_LABELS = {
  overkill: 'Benchmarker',
  competitive: 'Competitive',
  streaming: 'Streamer',
  balanced: 'Gamer',
} as const satisfies Record<PresetType, string>

const CATEGORY_OPTS = {
  system: {
    label: 'System',
    opts: [
      'pagefile',
      'fastboot',
      'timer',
      'explorer_speed',
      'temp_purge',
      'restore_point',
      'classic_menu',
      'storage_sense',
      'end_task',
      'explorer_cleanup',
    ],
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
      'display_perf',
      'multiplane_overlay',
      'hags',
    ],
  },
  power: {
    label: 'Power',
    opts: ['power_plan', 'usb_power', 'pcie_power', 'ultimate_perf', 'usb_suspend'],
  },
  input: {
    label: 'Input',
    opts: ['mouse_accel', 'keyboard_response', 'audio_exclusive'],
  },
  network: {
    label: 'Network',
    opts: [
      'dns',
      'nagle',
      'ipv4_prefer',
      'teredo_disable',
      'qos_gaming',
      'network_throttling',
      'tcp_optimizer',
    ],
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
      'notifications_off',
      'ps7_telemetry',
      'wpbt_disable',
    ],
  },
  experimental: {
    label: 'Experimental',
    opts: [
      'msi_mode',
      'services_trim',
      'disk_cleanup',
      'native_nvme',
      'hpet',
      'interrupt_affinity',
      'process_mitigation',
      'smt_disable',
      'core_isolation_off',
    ],
  },
} as const satisfies Record<string, { label: string; opts: readonly string[] }>

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

function updatePresetBadges(presetName: PresetType, opts: readonly string[]): void {
  // ES2024: Use Set for O(1) lookups
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

  // ES2024: Use Set for efficient membership testing
  const optsSet = new Set(preset.opts)
  const softwareSet = new Set(preset.software)

  for (const cb of $$<HTMLInputElement>('input[name="opt"]')) {
    cb.checked = optsSet.has(cb.value)
  }

  updatePresetBadges(presetName, preset.opts)

  store.setSelection([...preset.software])

  // Update software card UI with Set.has() for O(1) lookup
  for (const card of $$('.software-card')) {
    const key = card.dataset.key
    if (!key) continue
    const selected = softwareSet.has(key)
    card.classList.toggle('selected', selected)
    card.setAttribute('aria-checked', String(selected))
    const action = card.querySelector('.back-action')
    if (action) action.textContent = selected ? '✓ Selected' : 'Click to add'
  }

  updateSoftwareCounter()
  updateSummary()
  document.dispatchEvent(new CustomEvent('script-change-request'))

  // Show recommended filter for this preset
  showRecommendedFilter(presetName, preset.software)

  // Show action buttons when a preset is selected
  const actionsEl = document.getElementById('preset-actions')
  if (actionsEl) {
    actionsEl.hidden = false
  }
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

  rotator.style.transform = `rotateY(${round(
    springRotate.current.x,
  )}deg) rotateX(${round(springRotate.current.y)}deg)`
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

  // ES2024: Use SPRING_PRESETS for semantic spring configurations
  const { stiffness, damping } = SPRING_PRESETS.INTERACTIVE
  state.springRotate.stiffness = stiffness
  state.springRotate.damping = damping
  state.springGlare.stiffness = stiffness
  state.springGlare.damping = damping
  state.springBackground.stiffness = stiffness
  state.springBackground.damping = damping

  startAnimation(state)
}

function handlePointerLeave(state: CardState): void {
  if (state.aborted) return
  state.interacting = false
  state.card.classList.remove('interacting')

  // Use gentle preset for snap-back animation
  const { stiffness, damping } = SPRING_PRESETS.GENTLE

  state.springRotate.stiffness = stiffness
  state.springRotate.damping = damping
  state.springRotate.set({ x: 0, y: 0 })

  state.springGlare.stiffness = stiffness
  state.springGlare.damping = damping
  state.springGlare.set({ x: 50, y: 50, o: 0 })

  state.springBackground.stiffness = stiffness
  state.springBackground.damping = damping
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

  const addListener = (
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void => {
    if (controller) {
      controller.addEventListener(target, type, handler, options)
    } else {
      target.addEventListener(type, handler, options)
    }
  }

  addListener(
    rotator,
    'pointermove',
    (e: PointerEvent) => {
      handlePointerMove(state, e)
    },
    { passive: true },
  )

  addListener(
    rotator,
    'pointerenter',
    () => {
      handlePointerEnter(state)
    },
    { passive: true },
  )

  addListener(
    rotator,
    'pointerleave',
    () => {
      handlePointerLeave(state)
    },
    { passive: true },
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

  // Update software count
  const softwareEl = card.querySelector<HTMLElement>('[data-stat="software"]')
  if (softwareEl) softwareEl.textContent = String(preset.software.length)

  // ES2024: Use Set.intersection() for efficient category overlap calculation
  const presetOptsSet = new Set(preset.opts)

  for (const [catKey, catConfig] of Object.entries(CATEGORY_OPTS)) {
    const el = card.querySelector<HTMLElement>(`[data-stat="${catKey}"]`)
    if (el) {
      const categoryOptsSet = new Set(catConfig.opts)
      // ES2024 Set.intersection() - returns Set of common elements
      const enabledOpts = presetOptsSet.intersection(categoryOptsSet)
      const enabled = enabledOpts.size
      const total = catConfig.opts.length
      el.textContent = `${enabled}/${total}`
      el.dataset.enabled = String(enabled)
      el.dataset.total = String(total)
    }
  }
}

export function setupPresets(controller?: CleanupController): void {
  const cards = $$<HTMLButtonElement>('.preset-card')
  const addListener = (
    target: EventTarget,
    type: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void => {
    if (controller) {
      controller.addEventListener(target, type, handler, options)
    } else {
      target.addEventListener(type, handler, options)
    }
  }

  for (const card of cards) {
    populateCardStats(card)
    setupCardHolographicEffect(card, controller)

    const handleCardClick = (): void => {
      const name = card.dataset.preset as PresetType | undefined
      if (!name || !PRESETS[name]) return
      for (const c of cards) c.classList.toggle('active', c === card)
      applyPreset(name)
    }

    addListener(card, 'click', handleCardClick)
    const rotator = card.querySelector<HTMLElement>('.preset-card__rotator')
    if (rotator) {
      addListener(rotator, 'click', (e) => {
        e.stopPropagation()
        handleCardClick()
      })
    }
  }

  for (const cb of $$<HTMLInputElement>('input[name="opt"]')) {
    addListener(cb, 'change', () => fadePresetBadge(cb.value))
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
