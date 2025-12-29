/**
 * Preflight Check Definitions
 *
 * Hardware-dependent prerequisites shown before script generation.
 */

import type { CpuType, GpuType } from './types'

export type PreflightBadgeType = 'required' | 'recommended'

export interface PreflightCheck {
  readonly id: string
  readonly badge: PreflightBadgeType
  readonly title: string
  readonly description: string
  /** Condition for visibility */
  readonly condition: PreflightCondition
  /** Link action (external URL or clipboard copy) */
  readonly action: PreflightAction
}

export type PreflightCondition =
  | { type: 'always' }
  | { type: 'cpu'; cpu: CpuType }
  | { type: 'gpu'; gpu: GpuType }

export type PreflightAction =
  | { type: 'link'; url: string; label: string }
  | { type: 'copy'; text: string; label: string }

export const PREFLIGHT_CHECKS: readonly PreflightCheck[] = [
  {
    id: 'amd-chipset',
    badge: 'required',
    title: 'AMD Chipset Drivers',
    description: 'Required for 3D V-Cache optimizer to work properly',
    condition: { type: 'cpu', cpu: 'amd_x3d' },
    action: {
      type: 'link',
      url: 'https://www.amd.com/en/support',
      label: 'Download from AMD',
    },
  },
  {
    id: 'nvidia-drivers',
    badge: 'recommended',
    title: 'NVIDIA Drivers',
    description: 'Update to latest Game Ready or Studio drivers',
    condition: { type: 'gpu', gpu: 'nvidia' },
    action: {
      type: 'link',
      url: 'https://www.nvidia.com/Download/index.aspx',
      label: 'Download from NVIDIA',
    },
  },
  {
    id: 'amd-gpu-drivers',
    badge: 'recommended',
    title: 'AMD Radeon Drivers',
    description: 'Update to latest Adrenalin drivers',
    condition: { type: 'gpu', gpu: 'amd' },
    action: {
      type: 'link',
      url: 'https://www.amd.com/en/support',
      label: 'Download from AMD',
    },
  },
  {
    id: 'restore-point',
    badge: 'recommended',
    title: 'Create Restore Point',
    description: 'Before running any script, create a Windows restore point',
    condition: { type: 'always' },
    action: {
      type: 'copy',
      text: 'Checkpoint-Computer -Description "Before RockTune"',
      label: 'Copy PowerShell Command',
    },
  },
] as const

/**
 * Check if a preflight check should be visible based on hardware
 */
export function isPreflightVisible(check: PreflightCheck, cpu: CpuType, gpu: GpuType): boolean {
  const { condition } = check

  switch (condition.type) {
    case 'always':
      return true
    case 'cpu':
      return cpu === condition.cpu
    case 'gpu':
      return gpu === condition.gpu
    default:
      return false
  }
}

/**
 * Get visible preflight checks for hardware selection
 */
export function getVisiblePreflightChecks(cpu: CpuType, gpu: GpuType): PreflightCheck[] {
  return PREFLIGHT_CHECKS.filter((check) => isPreflightVisible(check, cpu, gpu))
}
