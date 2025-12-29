/**
 * Hardware data definitions for the Hardware section
 */

import type { CpuType, GpuType } from './types'
import { CPU_TYPES, GPU_TYPES } from './types'

/** CPU option definition */
export interface CpuOption {
  readonly value: CpuType
  readonly label: string
  readonly hint: string
}

/** GPU option definition */
export interface GpuOption {
  readonly value: GpuType
  readonly label: string
  readonly hint: string
}

/** Driver card badge type */
export type DriverBadgeType = 'cpu' | 'gpu' | 'mobo'

/** Driver card link */
export interface DriverLink {
  readonly label: string
  readonly url: string
}

/** Driver card definition */
export interface DriverCard {
  readonly id: string
  readonly badge: DriverBadgeType
  readonly title: string
  readonly description: string
  /** CPU types this driver applies to (empty = all) */
  readonly cpuTypes: readonly CpuType[]
  /** GPU types this driver applies to (empty = all) */
  readonly gpuTypes: readonly GpuType[]
  /** Links to driver downloads */
  readonly links: readonly DriverLink[]
  /** Always show regardless of hardware selection */
  readonly alwaysShow?: boolean
}

/** CPU options for the selector */
export const CPU_OPTIONS: readonly CpuOption[] = [
  {
    value: CPU_TYPES.AMD_X3D,
    label: 'AMD Ryzen X3D',
    hint: '7800X3D, 7900X3D, 7950X3D, 9800X3D — CPPC optimization included',
  },
  {
    value: CPU_TYPES.AMD,
    label: 'AMD Ryzen (non-X3D)',
    hint: '5600X, 7700X, 9700X and similar',
  },
  {
    value: CPU_TYPES.INTEL,
    label: 'Intel Core',
    hint: '12th, 13th, 14th gen, Core Ultra',
  },
] as const

/** GPU options for the selector */
export const GPU_OPTIONS: readonly GpuOption[] = [
  {
    value: GPU_TYPES.NVIDIA,
    label: 'NVIDIA GeForce',
    hint: 'RTX 30/40/50 series',
  },
  {
    value: GPU_TYPES.AMD,
    label: 'AMD Radeon',
    hint: 'RX 6000/7000/9000 series',
  },
  {
    value: GPU_TYPES.INTEL,
    label: 'Intel Arc',
    hint: 'A770, A750, B580',
  },
] as const

/** Driver cards configuration */
export const DRIVER_CARDS: readonly DriverCard[] = [
  {
    id: 'amd-chipset',
    badge: 'cpu',
    title: 'AMD Chipset',
    description: 'Required for Ryzen & X3D V-Cache',
    cpuTypes: [CPU_TYPES.AMD_X3D, CPU_TYPES.AMD],
    gpuTypes: [],
    links: [{ label: 'AMD', url: 'https://www.amd.com/en/support/download/drivers.html' }],
  },
  {
    id: 'intel-chipset',
    badge: 'cpu',
    title: 'Intel Chipset',
    description: 'INF Utility & Management Engine',
    cpuTypes: [CPU_TYPES.INTEL],
    gpuTypes: [],
    links: [
      {
        label: 'Intel',
        url: 'https://www.intel.com/content/www/us/en/download-center/home.html',
      },
    ],
  },
  {
    id: 'nvidia',
    badge: 'gpu',
    title: 'NVIDIA GeForce',
    description: 'Game Ready or Studio drivers',
    cpuTypes: [],
    gpuTypes: [GPU_TYPES.NVIDIA],
    links: [{ label: 'NVIDIA', url: 'https://www.nvidia.com/Download/index.aspx' }],
  },
  {
    id: 'amd-gpu',
    badge: 'gpu',
    title: 'AMD Radeon',
    description: 'Adrenalin Edition drivers',
    cpuTypes: [],
    gpuTypes: [GPU_TYPES.AMD],
    links: [{ label: 'AMD', url: 'https://www.amd.com/en/support/download/drivers.html' }],
  },
  {
    id: 'intel-gpu',
    badge: 'gpu',
    title: 'Intel Arc',
    description: 'Arc Graphics drivers',
    cpuTypes: [],
    gpuTypes: [GPU_TYPES.INTEL],
    links: [
      {
        label: 'Intel',
        url: 'https://www.intel.com/content/www/us/en/download/785597/intel-arc-iris-xe-graphics-windows.html',
      },
    ],
  },
  {
    id: 'motherboard',
    badge: 'mobo',
    title: 'Motherboard',
    description: 'BIOS, audio, LAN drivers',
    cpuTypes: [],
    gpuTypes: [],
    alwaysShow: true,
    links: [
      { label: 'ASUS', url: 'https://www.asus.com/support/download-center/' },
      { label: 'MSI', url: 'https://www.msi.com/support/download' },
      { label: 'Gigabyte', url: 'https://www.gigabyte.com/Support' },
      { label: 'ASRock', url: 'https://www.asrock.com/support/index.asp' },
    ],
  },
] as const

/**
 * Check if a driver card should be visible based on hardware selection
 */
export function isDriverCardVisible(card: DriverCard, cpu: CpuType, gpu: GpuType): boolean {
  if (card.alwaysShow) return true

  const matchesCpu = card.cpuTypes.length === 0 || card.cpuTypes.includes(cpu)
  const matchesGpu = card.gpuTypes.length === 0 || card.gpuTypes.includes(gpu)

  // Card must match the relevant hardware type
  if (card.badge === 'cpu') return matchesCpu
  if (card.badge === 'gpu') return matchesGpu

  return matchesCpu || matchesGpu
}
