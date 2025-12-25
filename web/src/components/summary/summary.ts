import { store } from '../../state'
import type {
  CpuType,
  GpuType,
  HardwareProfile,
  MonitorSoftwareType,
  PeripheralType,
} from '../../types'
import { $, $$, $id } from '../../utils/dom'
import type { CleanupController } from '../../utils/lifecycle'

export function getHardwareProfile(): HardwareProfile {
  return {
    cpu: (($('input[name="cpu"]:checked') as HTMLInputElement)?.value as CpuType) || 'amd_x3d',
    gpu: (($('input[name="gpu"]:checked') as HTMLInputElement)?.value as GpuType) || 'nvidia',
    peripherals: Array.from($$<HTMLInputElement>('input[name="peripheral"]:checked')).map(
      (el) => el.value as PeripheralType,
    ),
    monitorSoftware: Array.from($$<HTMLInputElement>('input[name="monitor-software"]:checked')).map(
      (el) => el.value as MonitorSoftwareType,
    ),
  }
}

export function getSelectedOptimizations(): string[] {
  return Array.from($$<HTMLInputElement>('input[name="opt"]:checked')).map((el) => el.value)
}

export function updateSummary(): void {
  const hw = getHardwareProfile()
  const opts = getSelectedOptimizations()

  const cpuLabels = { amd_x3d: 'X3D', amd: 'AMD', intel: 'Intel' } as const satisfies Record<
    CpuType,
    string
  >
  const gpuLabels = { nvidia: 'NVIDIA', amd: 'Radeon', intel: 'Arc' } as const satisfies Record<
    GpuType,
    string
  >

  const cpuLabel = cpuLabels[hw.cpu] || hw.cpu
  const gpuLabel = gpuLabels[hw.gpu] || hw.gpu

  const hwEl = $id('summary-hardware')
  const optsEl = $id('summary-opts')
  const softEl = $id('summary-software')

  if (hwEl) hwEl.textContent = `${cpuLabel} + ${gpuLabel}`
  if (optsEl) optsEl.textContent = String(opts.length)
  if (softEl) softEl.textContent = String(store.selectedSoftware.size)

  updatePreflightCheck(hw)
}

export function updatePreflightCheck(hw: HardwareProfile): void {
  const prereqs = $$('.preflight-card[data-prereq]')

  prereqs.forEach((card) => {
    const prereq = card.dataset.prereq
    let show = false

    switch (prereq) {
      case 'amd_x3d':
        show = hw.cpu === 'amd_x3d'
        break
      case 'nvidia':
        show = hw.gpu === 'nvidia'
        break
      case 'amd_gpu':
        show = hw.gpu === 'amd'
        break
      case 'always':
        show = true
        break
    }

    card.style.display = show ? 'block' : 'none'
  })
}

function addListener(
  controller: CleanupController | undefined,
  target: EventTarget,
  type: string,
  handler: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): void {
  if (controller) {
    controller.addEventListener(target, type, handler, options)
  } else {
    target.addEventListener(type, handler, options)
  }
}

export function setupFormListeners(controller?: CleanupController): void {
  $$(
    'input[name="cpu"], input[name="gpu"], input[name="peripheral"], input[name="monitor-software"], input[name="opt"]',
  ).forEach((el) => {
    addListener(controller, el, 'change', () => {
      updateSummary()
      document.dispatchEvent(new CustomEvent('script-change-request'))
    })
  })

  ;['#dns-provider', '#telemetry-level'].forEach((selector) => {
    const el = document.querySelector<HTMLSelectElement>(selector)
    if (el) {
      addListener(controller, el, 'change', () => {
        document.dispatchEvent(new CustomEvent('script-change-request'))
      })
    }
  })
}
