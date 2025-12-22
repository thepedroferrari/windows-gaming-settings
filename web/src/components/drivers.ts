import { $, $$ } from '../utils/dom'

type CpuType = 'amd_x3d' | 'amd' | 'intel'
type GpuType = 'nvidia' | 'amd' | 'intel'

interface DriverMapping {
  cpu: Record<CpuType, string[]>
  gpu: Record<GpuType, string[]>
}

const DRIVER_MAPPING: DriverMapping = {
  cpu: {
    amd_x3d: ['amd-chipset'],
    amd: ['amd-chipset'],
    intel: ['intel-chipset'],
  },
  gpu: {
    nvidia: ['nvidia'],
    amd: ['amd-gpu'],
    intel: ['intel-gpu'],
  },
}

function updateDriverCards(): void {
  const cpuValue = $<HTMLInputElement>('input[name="cpu"]:checked')?.value as CpuType | undefined
  const gpuValue = $<HTMLInputElement>('input[name="gpu"]:checked')?.value as GpuType | undefined

  const activeDrivers = new Set<string>()

  if (cpuValue && DRIVER_MAPPING.cpu[cpuValue]) {
    for (const driver of DRIVER_MAPPING.cpu[cpuValue]) {
      activeDrivers.add(driver)
    }
  }

  if (gpuValue && DRIVER_MAPPING.gpu[gpuValue]) {
    for (const driver of DRIVER_MAPPING.gpu[gpuValue]) {
      activeDrivers.add(driver)
    }
  }

  for (const card of $$<HTMLDivElement>('.driver-card[data-driver]')) {
    const driverType = card.dataset.driver
    if (!driverType || driverType === 'motherboard') continue

    card.classList.toggle('active', activeDrivers.has(driverType))
  }
}

export function setupDriverLinks(): void {
  const cpuInputs = $$<HTMLInputElement>('input[name="cpu"]')
  const gpuInputs = $$<HTMLInputElement>('input[name="gpu"]')

  for (const input of cpuInputs) {
    input.addEventListener('change', updateDriverCards)
  }

  for (const input of gpuInputs) {
    input.addEventListener('change', updateDriverCards)
  }

  // Initial update
  updateDriverCards()
}

