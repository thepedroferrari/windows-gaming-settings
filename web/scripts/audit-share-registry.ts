/**
 * Share Registry Audit Script
 *
 * Validates the share-registry.ts ID assignments to prevent:
 * - Duplicate IDs
 * - Missing IDs for optimization keys
 * - Orphaned IDs (pointing to non-existent keys)
 * - Accidental ID reuse
 *
 * Run: deno task share:audit
 *
 * This script also reports:
 * - Next available ID for new optimizations
 * - List of tombstoned (deprecated) IDs
 */

import {
  DEPRECATED_OPT_ID_SET,
  DEPRECATED_OPT_IDS,
  OPT_ID_TO_VALUE,
  OPT_VALUE_TO_ID,
} from '../src/lib/share-registry.ts'
import { OPTIMIZATION_KEYS } from '../src/lib/types.ts'

type Issue = {
  readonly level: 'error' | 'warning' | 'info'
  readonly message: string
}

function pushIssue(issues: Issue[], level: Issue['level'], message: string): void {
  issues.push({ level, message })
}

function audit(): Issue[] {
  const issues: Issue[] = []

  // Get all valid optimization keys from types.ts
  const allKeys = new Set(Object.values(OPTIMIZATION_KEYS))

  // Get all IDs and values from registry
  const idToValue = OPT_ID_TO_VALUE
  const valueToId = OPT_VALUE_TO_ID

  // ═══════════════════════════════════════════════════════════════════════════
  // Check 1: Every OptimizationKey must have an ID
  // ═══════════════════════════════════════════════════════════════════════════
  for (const key of allKeys) {
    if (!(key in valueToId)) {
      pushIssue(issues, 'error', `Missing ID for optimization key: ${key}`)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Check 2: Every active ID must map to a valid key (not orphaned)
  // ═══════════════════════════════════════════════════════════════════════════
  for (const [id, value] of Object.entries(idToValue)) {
    if (value !== null && !allKeys.has(value)) {
      pushIssue(issues, 'error', `ID ${id} maps to unknown key: ${value}`)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Check 3: No duplicate IDs
  // ═══════════════════════════════════════════════════════════════════════════
  const seenIds = new Set<number>()
  for (const idStr of Object.keys(idToValue)) {
    const id = Number(idStr)
    if (seenIds.has(id)) {
      pushIssue(issues, 'error', `Duplicate ID found: ${id}`)
    }
    seenIds.add(id)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Check 4: No duplicate values (excluding tombstones)
  // ═══════════════════════════════════════════════════════════════════════════
  const seenValues = new Set<string>()
  for (const value of Object.values(idToValue)) {
    if (value !== null) {
      if (seenValues.has(value)) {
        pushIssue(issues, 'error', `Duplicate value found: ${value}`)
      }
      seenValues.add(value)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Check 5: VALUE_TO_ID must be inverse of ID_TO_VALUE
  // ═══════════════════════════════════════════════════════════════════════════
  for (const [key, id] of Object.entries(valueToId)) {
    const reverseValue = idToValue[id]
    if (reverseValue !== key) {
      pushIssue(
        issues,
        'error',
        `Bidirectional mismatch: ${key} → ID ${id} → ${reverseValue ?? 'null'}`,
      )
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Check 6: All null (tombstoned) IDs must be in DEPRECATED_OPT_IDS
  // ═══════════════════════════════════════════════════════════════════════════
  const nullIds = Object.entries(idToValue)
    .filter(([_, v]) => v === null)
    .map(([id]) => Number(id))

  for (const id of nullIds) {
    if (!DEPRECATED_OPT_ID_SET.has(id)) {
      pushIssue(issues, 'error', `Tombstoned ID ${id} is missing from DEPRECATED_OPT_IDS registry`)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Check 7: All DEPRECATED_OPT_IDS entries must have null in OPT_ID_TO_VALUE
  // ═══════════════════════════════════════════════════════════════════════════
  for (const dep of DEPRECATED_OPT_IDS) {
    const currentValue = idToValue[dep.id]
    if (currentValue !== null && currentValue !== undefined) {
      pushIssue(
        issues,
        'error',
        `DEPRECATED_OPT_IDS has ID ${dep.id} (was: ${dep.was}) but OPT_ID_TO_VALUE[${dep.id}] = '${currentValue}' (should be null)`,
      )
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Check 8: No deprecated ID is being reused (already covered, but explicit)
  // ═══════════════════════════════════════════════════════════════════════════
  for (const dep of DEPRECATED_OPT_IDS) {
    const currentValue = idToValue[dep.id]
    if (currentValue !== null && currentValue !== undefined && currentValue !== dep.was) {
      pushIssue(
        issues,
        'error',
        `REUSE VIOLATION: ID ${dep.id} was '${dep.was}' (deprecated ${dep.removed}), now illegally assigned to '${currentValue}'`,
      )
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Info: Report statistics
  // ═══════════════════════════════════════════════════════════════════════════
  const allIds = Object.keys(idToValue).map(Number)
  const maxId = Math.max(...allIds)
  const activeCount = Object.values(idToValue).filter((v) => v !== null).length
  const tombstoneCount = Object.values(idToValue).filter((v) => v === null).length
  const tombstoneIds = Object.entries(idToValue)
    .filter(([_, v]) => v === null)
    .map(([id]) => id)
    .sort((a, b) => Number(a) - Number(b))

  pushIssue(
    issues,
    'info',
    `Total IDs: ${allIds.length} (${activeCount} active, ${tombstoneCount} tombstoned)`,
  )
  pushIssue(issues, 'info', `Next available ID: ${maxId + 1}`)

  if (tombstoneIds.length > 0) {
    pushIssue(issues, 'info', `Tombstoned IDs: ${tombstoneIds.join(', ')}`)
  }

  // Show deprecation history
  if (DEPRECATED_OPT_IDS.length > 0) {
    pushIssue(issues, 'info', `Deprecation history:`)
    for (const dep of DEPRECATED_OPT_IDS) {
      const reason = dep.reason ? ` (${dep.reason})` : ''
      pushIssue(issues, 'info', `  ID ${dep.id}: was '${dep.was}', removed ${dep.removed}${reason}`)
    }
  }

  return issues
}

function main(): void {
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  Share Registry Audit')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('')

  const issues = audit()

  const errors = issues.filter((i) => i.level === 'error')
  const warnings = issues.filter((i) => i.level === 'warning')
  const infos = issues.filter((i) => i.level === 'info')

  // Print errors first
  for (const issue of errors) {
    console.error(`❌ ERROR: ${issue.message}`)
  }

  // Then warnings
  for (const issue of warnings) {
    console.warn(`⚠️  WARN: ${issue.message}`)
  }

  // Then info
  console.log('')
  for (const issue of infos) {
    console.log(`ℹ️  ${issue.message}`)
  }

  console.log('')

  if (errors.length > 0) {
    console.error(`❌ Audit FAILED with ${errors.length} error(s)`)
    Deno.exit(1)
  } else if (warnings.length > 0) {
    console.warn(`⚠️  Audit passed with ${warnings.length} warning(s)`)
  } else {
    console.log('✅ Audit PASSED - Share registry is consistent')
  }
}

main()
