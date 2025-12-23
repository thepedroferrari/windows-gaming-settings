import { store } from '../../state'
import type {
  CpuType,
  GpuType,
  HardwareProfile,
  MonitorSoftwareType,
  PeripheralType,
} from '../../types'
import { $, $$, $id } from '../../utils/dom'

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

  const cpuLabels: Record<CpuType, string> = { amd_x3d: 'X3D', amd: 'AMD', intel: 'Intel' }
  const gpuLabels: Record<GpuType, string> = { nvidia: 'NVIDIA', amd: 'Radeon', intel: 'Arc' }

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

export function setupFormListeners(): void {
  $$(
    'input[name="cpu"], input[name="gpu"], input[name="peripheral"], input[name="monitor-software"], input[name="opt"]',
  ).forEach((el) => {
    el.addEventListener('change', () => {
      updateSummary()
      document.dispatchEvent(new CustomEvent('script-change-request'))
    })
  })

  // Selectors that influence script output
  ;['#dns-provider', '#telemetry-level'].forEach((selector) => {
    const el = document.querySelector<HTMLSelectElement>(selector)
    el?.addEventListener('change', () => {
      document.dispatchEvent(new CustomEvent('script-change-request'))
    })
  })
}
