import { $, $$ } from '../../utils/dom'

type CpuType = 'amd_x3d' | 'amd' | 'intel'
type GpuType = 'nvidia' | 'amd' | 'intel'

function getSelectedHardware(): { cpu: CpuType; gpu: GpuType } {
  const cpu = ($<HTMLInputElement>('input[name="cpu"]:checked')?.value || 'amd_x3d') as CpuType
  const gpu = ($<HTMLInputElement>('input[name="gpu"]:checked')?.value || 'nvidia') as GpuType
  return { cpu, gpu }
}

function updateDriverCards(): void {
  const { cpu, gpu } = getSelectedHardware()

  for (const card of $$<HTMLDivElement>('.driver-card[data-driver]')) {
    const cpuMatch = card.dataset.cpu?.split(',') || []
    const gpuMatch = card.dataset.gpu?.split(',') || []
    const isMotherboard = card.dataset.driver === 'motherboard'

    const shouldShow = isMotherboard || cpuMatch.includes(cpu) || gpuMatch.includes(gpu)
    card.hidden = !shouldShow
    card.classList.toggle('active', shouldShow)
  }
}

export function setupDriverLinks(): void {
  const inputs = $$<HTMLInputElement>('input[name="cpu"], input[name="gpu"]')
  for (const input of inputs) {
    input.addEventListener('change', updateDriverCards)
  }
  updateDriverCards()
}
