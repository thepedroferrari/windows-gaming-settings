# RockTune Share System

This document explains how the share URL and PowerShell one-liner systems work, and how to maintain the ID registry.

## Overview

RockTune has two ways to share builds:

1. **Share URL** - Compressed URL hash for web sharing
2. **PowerShell One-Liner** - Environment variable config for terminal execution

Both systems use numeric IDs to keep URLs compact while maintaining backward compatibility.

---

## Share URL Format

```
https://rocktune.pedroferrari.com/#b=1.eJxLTc7PLShKLS5RBABJtQPi
                                    │ │ └── LZ-compressed JSON
                                    │ └── Schema version
                                    └── "b" = build marker
```

### Encoding Chain

```
User Selections → ShareDataV1 object → JSON → LZ-String compress → URL hash
```

### ShareDataV1 Schema

```typescript
interface ShareDataV1 {
  v: 1              // Schema version (always 1 for now)
  c?: number        // CPU ID
  g?: number        // GPU ID
  d?: number        // DNS provider ID
  p?: number[]      // Peripheral IDs
  m?: number[]      // Monitor software IDs
  o?: number[]      // Optimization IDs  ← This is the big one
  s?: string[]      // Package keys (strings, not IDs)
  r?: number        // Preset ID
}
```

---

## PowerShell One-Liner Format

```powershell
$env:RT='c=1&g=1&o=1,2,10,50&s=steam,discord'; irm https://rocktune.pedroferrari.com/run.ps1 | iex
```

### Parameters

| Key | Description | Example |
|-----|-------------|---------|
| `c` | CPU ID | `c=1` (AMD X3D) |
| `g` | GPU ID | `g=1` (NVIDIA) |
| `d` | DNS provider ID | `d=1` (Cloudflare) |
| `o` | Optimization IDs (comma-separated) | `o=1,2,10,50` |
| `s` | Package keys (comma-separated) | `s=steam,discord` |
| `p` | Peripheral IDs | `p=1,2` |
| `m` | Monitor software IDs | `m=1` |

---

## ID Registry

All IDs are defined in `src/lib/share-registry.ts`. This file is the **source of truth**.

### Why Numeric IDs?

URLs have length limits (~2000 chars). Compare:

```
# Numeric (compact)
o=1,2,10,50,80

# String keys (verbose)
o=pagefile,fastboot,gamedvr,msi_mode,privacy_tier1
```

LZ-string compression helps, but numeric IDs are still more compact for the uncompressed PowerShell format.

### Current ID Ranges (Legacy)

These ranges are **historical organization only**. New IDs use sequential assignment.

| Tier | Range | Example IDs |
|------|-------|-------------|
| SAFE | 1-49 | 1=pagefile, 10=gamedvr, 26=mouse_accel |
| CAUTION | 50-79 | 50=msi_mode, 54=fso_disable |
| RISKY | 80-99 | 80=privacy_tier1, 85=teredo_disable |
| LUDICROUS | 100+ | 100=spectre_meltdown_off (blocked from sharing) |

---

## Adding a New Optimization

### Step 1: Find Next ID

```bash
cd web
deno task share:audit
```

Output:
```
ℹ️  Next available ID: 104
```

### Step 2: Add to Registry

In `src/lib/share-registry.ts`:

```typescript
export const OPT_ID_TO_VALUE: Record<number, OptimizationKey | null> = {
  // ... existing entries ...
  104: 'new_feature',  // Add at the end
}
```

### Step 3: Add to Types

In `src/lib/types.ts`:

```typescript
export const OPTIMIZATION_KEYS = {
  // ... existing keys ...
  NEW_FEATURE: 'new_feature',
} as const
```

### Step 4: Add to Optimizations

In `src/lib/optimizations.ts`:

```typescript
{
  key: 'new_feature',
  tier: 'safe',
  category: 'system',
  label: 'New Feature',
  hint: 'Short description',
  tooltip: { /* ... */ },
  defaultChecked: false,
  rank: 'B',
}
```

### Step 5: Add Script Generation

In `src/lib/script-generator.ts`:

```typescript
if (selected.has('new_feature')) {
  lines.push('# [SAFE] New Feature')
  lines.push('Set-Reg "HKCU:\\Path" "Name" 1')
  lines.push('Write-OK "New Feature enabled"')
}
```

### Step 6: Add to PowerShell Runner

In `public/run.ps1`, add to both:

**$OPT_DESCRIPTIONS:**
```powershell
'104' = @{ name='New Feature'; tier='SAFE'; desc='Description here' }
```

**$OPT_FUNCTIONS:**
```powershell
'104' = {
    Set-Reg "HKCU:\Path" "Name" 1
    Write-OK "New Feature enabled"
}
```

### Step 7: Verify

```bash
deno task share:audit
```

---

## Deprecating an Optimization

When an optimization is no longer needed (Windows changed, feature removed, etc.):

### Step 1: Tombstone the ID

In `src/lib/share-registry.ts`:

```typescript
export const OPT_ID_TO_VALUE: Record<number, OptimizationKey | null> = {
  // ...
  45: null,  // Was 'old_feature'
  // ...
}
```

### Step 2: Add to Deprecation Registry

In `src/lib/share-registry.ts`:

```typescript
export const DEPRECATED_OPT_IDS: ReadonlyArray<{...}> = [
  { id: 45, was: 'old_feature', removed: '2025-01-03', reason: 'No longer needed on Win11 24H2' },
]
```

### Step 3: Remove from Other Files

- Remove from `types.ts` OPTIMIZATION_KEYS
- Remove from `optimizations.ts`
- Remove from `script-generator.ts`
- Comment out in `run.ps1` (keep for reference)

### Step 4: Verify

```bash
deno task share:audit
```

The audit will:
- Confirm the tombstone is documented
- Prevent anyone from reusing ID 45
- Show deprecation history in output

---

## Critical Rules

### DO

- Use `deno task share:audit` to find the next ID
- Add deprecations to `DEPRECATED_OPT_IDS` (not just comments)
- Keep `run.ps1` in sync with `share-registry.ts`
- Test share URLs after changes

### DON'T

- Reuse a deprecated ID for a different optimization
- Assign IDs based on tier ranges (use sequential)
- Delete entries from `DEPRECATED_OPT_IDS`
- Change the meaning of an existing ID

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/share-registry.ts` | ID ↔ value mappings, deprecation registry |
| `src/lib/share.ts` | URL encoding/decoding logic |
| `src/lib/types.ts` | OPTIMIZATION_KEYS constant |
| `src/lib/optimizations.ts` | Full optimization definitions |
| `src/lib/script-generator.ts` | PowerShell generation |
| `public/run.ps1` | PowerShell one-liner runner |
| `scripts/audit-share-registry.ts` | Validation script |

---

## Troubleshooting

### "Audit says missing ID for key X"

You added a key to `OPTIMIZATION_KEYS` but forgot to add it to `OPT_ID_TO_VALUE`.

### "Audit says tombstoned ID missing from DEPRECATED_OPT_IDS"

You set an ID to `null` but forgot to document it in `DEPRECATED_OPT_IDS`.

### "Share URL doesn't load my optimization"

Check that the ID exists in both:
1. `share-registry.ts` (for web)
2. `run.ps1` (for PowerShell one-liner)

### "URL is too long"

The system warns at 2000 characters. Options:
- Remove some optimizations from the share
- LUDICROUS tier (100+) is already blocked from sharing
