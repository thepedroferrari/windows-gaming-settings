/**
 * Service Optimization Generator
 *
 * Generates PowerShell code for service-based optimizations with:
 * - Tier-prefixed comments
 * - Consistent feedback
 * - Warning messages for breaking changes
 */

import type { ServiceOptConfig } from './types'
import { TIER_PREFIXES } from './types'

/**
 * Generate PowerShell lines for a service optimization
 */
export function generateServiceOpt(config: ServiceOptConfig): string[] {
  const lines: string[] = []
  const tierPrefix = TIER_PREFIXES[config.tier]
  const comment = config.description
    ? `# ${tierPrefix} ${config.description}`
    : `# ${tierPrefix} Modify service(s)`

  lines.push(comment)

  // Add warning if specified
  if (config.warningMessage) {
    lines.push(`Write-Warn "${config.warningMessage}"`)
  }

  const services = Array.isArray(config.services) ? config.services : [config.services]

  if (services.length === 1) {
    // Single service - inline
    const svc = services[0]
    switch (config.action) {
      case 'stop':
        lines.push(`Stop-Service ${svc} -Force -EA SilentlyContinue`)
        break
      case 'disable':
        lines.push(`Set-Service ${svc} -StartupType Disabled -EA SilentlyContinue`)
        break
      case 'manual':
        lines.push(`Set-Service ${svc} -StartupType Manual -EA SilentlyContinue`)
        break
      case 'stop-and-disable':
        lines.push(`Stop-Service ${svc} -Force -EA SilentlyContinue`)
        lines.push(`Set-Service ${svc} -StartupType Disabled -EA SilentlyContinue`)
        break
    }
  } else {
    // Multiple services - use array and loop
    const svcArray = services.map((s) => `"${s}"`).join(',')
    lines.push(`$services = @(${svcArray})`)
    lines.push('foreach ($s in $services) {')

    switch (config.action) {
      case 'stop':
        lines.push('    Stop-Service $s -Force -EA SilentlyContinue')
        break
      case 'disable':
        lines.push('    Set-Service $s -StartupType Disabled -EA SilentlyContinue')
        break
      case 'manual':
        lines.push('    Set-Service $s -StartupType Manual -EA SilentlyContinue')
        break
      case 'stop-and-disable':
        lines.push('    Stop-Service $s -Force -EA SilentlyContinue')
        lines.push('    Set-Service $s -StartupType Disabled -EA SilentlyContinue')
        break
    }

    lines.push('}')
  }

  lines.push(`Write-OK "${config.successMessage}"`)

  if (config.requiresReboot && config.rebootReason) {
    lines.push(`Add-RebootReason "${config.rebootReason}"`)
  }

  return lines
}

/**
 * Generate PowerShell for stopping and disabling services matching a pattern
 */
export function generateServicePatternOpt(
  tier: ServiceOptConfig['tier'],
  description: string,
  pattern: string,
  successMessage: string,
): string[] {
  const lines: string[] = []
  const tierPrefix = TIER_PREFIXES[tier]

  lines.push(`# ${tierPrefix} ${description}`)
  lines.push(
    `Get-Service | Where-Object {$_.Name -like "${pattern}"} | Stop-Service -Force -EA SilentlyContinue`,
  )
  lines.push(
    `Get-Service | Where-Object {$_.Name -like "${pattern}"} | Set-Service -StartupType Disabled -EA SilentlyContinue`,
  )
  lines.push(`Write-OK "${successMessage}"`)

  return lines
}
