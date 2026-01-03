/**
 * Command Optimization Generator
 *
 * Generates PowerShell code for command-based optimizations (bcdedit, powercfg, netsh)
 * with proper error handling and feedback.
 */

import type { CommandOptConfig, NetworkAdapterOptConfig, PowerCfgOptConfig } from './types'
import { TIER_PREFIXES } from './types'

/**
 * Generate PowerShell lines for a command optimization
 */
export function generateCommandOpt(config: CommandOptConfig): string[] {
  const lines: string[] = []
  const tierPrefix = TIER_PREFIXES[config.tier]
  const comment = config.description
    ? `# ${tierPrefix} ${config.description}`
    : `# ${tierPrefix} Execute command`

  lines.push(comment)

  const commands = Array.isArray(config.commands) ? config.commands : [config.commands]
  const successCheck = config.successCheck ?? 'exitcode'

  if (commands.length === 1) {
    const cmd = commands[0]

    if (successCheck === 'always') {
      // Always report success
      lines.push(`${cmd}`)
      lines.push(`Write-OK "${config.successMessage}"`)
    } else if (successCheck === 'exitcode') {
      // Check exit code
      lines.push(`$result = ${cmd} 2>&1`)
      lines.push('if ($LASTEXITCODE -eq 0) {')
      lines.push(`    Write-OK "${config.successMessage}"`)
      if (config.requiresReboot && config.rebootReason) {
        lines.push(`    Add-RebootReason "${config.rebootReason}"`)
      }
      lines.push('} else {')
      lines.push(
        `    Write-Fail "${config.failMessage ?? `${config.successMessage} failed`}: $result"`,
      )
      lines.push('}')
    }
  } else {
    // Multiple commands - execute all, check last exit code
    for (let i = 0; i < commands.length - 1; i++) {
      lines.push(`${commands[i]} 2>&1 | Out-Null`)
    }
    lines.push(`$result = ${commands[commands.length - 1]} 2>&1`)

    if (successCheck === 'always') {
      lines.push(`Write-OK "${config.successMessage}"`)
    } else {
      lines.push('if ($LASTEXITCODE -eq 0) {')
      lines.push(`    Write-OK "${config.successMessage}"`)
      if (config.requiresReboot && config.rebootReason) {
        lines.push(`    Add-RebootReason "${config.rebootReason}"`)
      }
      lines.push('} else {')
      lines.push(`    Write-Fail "${config.failMessage ?? 'Command failed'}"`)
      lines.push('}')
    }
  }

  return lines
}

/**
 * Generate PowerShell lines for a powercfg optimization
 */
export function generatePowerCfgOpt(config: PowerCfgOptConfig): string[] {
  const lines: string[] = []
  const tierPrefix = TIER_PREFIXES[config.tier]
  const comment = config.description
    ? `# ${tierPrefix} ${config.description}`
    : `# ${tierPrefix} Power configuration`

  lines.push(comment)
  lines.push(`powercfg ${config.subcommand} 2>&1 | Out-Null`)
  lines.push('if ($LASTEXITCODE -eq 0) {')
  lines.push('    powercfg /setactive scheme_current 2>&1 | Out-Null')
  lines.push(`    Write-OK "${config.successMessage}"`)
  if (config.requiresReboot && config.rebootReason) {
    lines.push(`    Add-RebootReason "${config.rebootReason}"`)
  }
  lines.push(`} else { Write-Warn "${config.fallbackMessage ?? 'Setting not supported'}" }`)

  return lines
}

/**
 * Generate PowerShell lines for a network adapter optimization
 */
export function generateNetworkAdapterOpt(config: NetworkAdapterOptConfig): string[] {
  const lines: string[] = []
  const tierPrefix = TIER_PREFIXES[config.tier]
  const comment = config.description
    ? `# ${tierPrefix} ${config.description}`
    : `# ${tierPrefix} Network adapter configuration`

  lines.push(comment)
  lines.push('$adapterCount = 0')
  lines.push('Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {')
  lines.push(`    try { ${config.cmdlet}; $adapterCount++ } catch { }`)
  lines.push('}')
  lines.push(
    `if ($adapterCount -gt 0) { Write-OK "${config.successMessage.replace('$count', '$adapterCount')}" }`,
  )
  lines.push(`else { Write-Warn "${config.fallbackMessage ?? 'No adapters affected'}" }`)

  return lines
}

/**
 * Generate bcdedit command with proper error handling
 */
export function generateBcdeditOpt(
  tier: CommandOptConfig['tier'],
  description: string,
  bcdeditArgs: string,
  successMessage: string,
  rebootReason?: string,
): string[] {
  const lines: string[] = []
  const tierPrefix = TIER_PREFIXES[tier]

  lines.push(`# ${tierPrefix} ${description}`)
  lines.push(`$bcdeditResult = bcdedit ${bcdeditArgs} 2>&1`)
  lines.push('if ($LASTEXITCODE -eq 0) {')
  lines.push(`    Write-OK "${successMessage}"`)
  if (rebootReason) {
    lines.push(`    Add-RebootReason "${rebootReason}"`)
  }
  lines.push('} else {')
  lines.push(`    Write-Fail "${successMessage} failed: $bcdeditResult"`)
  lines.push('}')

  return lines
}
