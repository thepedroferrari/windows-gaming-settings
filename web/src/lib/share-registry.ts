/**
 * Stable ID Registry for Shareable Build URLs
 *
 * CRITICAL RULES - READ BEFORE MODIFYING:
 * 1. IDs are PERMANENT - once assigned, they NEVER change meaning
 * 2. Never reuse an ID for a different value
 * 3. To deprecate: set value to null (decoder will skip it)
 * 4. To rename: update the value string, keep the same ID
 * 5. New values get the next sequential ID
 *
 * This registry enables backward-compatible shareable URLs.
 * Old URLs will always decode correctly (with graceful degradation).
 */

import type {
  CpuType,
  DnsProviderType,
  GpuType,
  MonitorSoftwareType,
  OptimizationKey,
  PeripheralType,
  PresetType,
} from './types'

// Schema version for URL format
export const SHARE_SCHEMA_VERSION = 1

/**
 * CPU type stable IDs
 * @example ID 1 always means 'amd_x3d', even if we rename it later
 */
export const CPU_ID_TO_VALUE: Record<number, CpuType | null> = {
  1: 'amd_x3d',
  2: 'amd',
  3: 'intel',
  // Future: 4: 'qualcomm' (ARM support)
}

export const CPU_VALUE_TO_ID: Record<CpuType, number> = {
  amd_x3d: 1,
  amd: 2,
  intel: 3,
}

/**
 * GPU type stable IDs
 */
export const GPU_ID_TO_VALUE: Record<number, GpuType | null> = {
  1: 'nvidia',
  2: 'amd',
  3: 'intel',
}

export const GPU_VALUE_TO_ID: Record<GpuType, number> = {
  nvidia: 1,
  amd: 2,
  intel: 3,
}

/**
 * DNS provider stable IDs
 */
export const DNS_ID_TO_VALUE: Record<number, DnsProviderType | null> = {
  1: 'cloudflare',
  2: 'google',
  3: 'quad9',
  4: 'opendns',
  5: 'adguard',
}

export const DNS_VALUE_TO_ID: Record<DnsProviderType, number> = {
  cloudflare: 1,
  google: 2,
  quad9: 3,
  opendns: 4,
  adguard: 5,
}

/**
 * Peripheral type stable IDs
 */
export const PERIPHERAL_ID_TO_VALUE: Record<number, PeripheralType | null> = {
  1: 'logitech',
  2: 'razer',
  3: 'corsair',
  4: 'steelseries',
  5: 'asus',
  6: 'wooting',
}

export const PERIPHERAL_VALUE_TO_ID: Record<PeripheralType, number> = {
  logitech: 1,
  razer: 2,
  corsair: 3,
  steelseries: 4,
  asus: 5,
  wooting: 6,
}

/**
 * Monitor software stable IDs
 */
export const MONITOR_ID_TO_VALUE: Record<number, MonitorSoftwareType | null> = {
  1: 'dell',
  2: 'lg',
  3: 'hp',
}

export const MONITOR_VALUE_TO_ID: Record<MonitorSoftwareType, number> = {
  dell: 1,
  lg: 2,
  hp: 3,
}

/**
 * Preset type stable IDs
 */
export const PRESET_ID_TO_VALUE: Record<number, PresetType | null> = {
  1: 'benchmarker',
  2: 'pro_gamer',
  3: 'streamer',
  4: 'gamer',
}

export const PRESET_VALUE_TO_ID: Record<PresetType, number> = {
  benchmarker: 1,
  pro_gamer: 2,
  streamer: 3,
  gamer: 4,
}

/**
 * Optimization stable IDs
 *
 * This is the largest registry (~70+ entries).
 * Organized by tier for readability, but IDs are assigned sequentially.
 */
export const OPT_ID_TO_VALUE: Record<number, OptimizationKey | null> = {
  // SAFE tier (1-40)
  1: 'pagefile',
  2: 'fastboot',
  3: 'timer',
  4: 'power_plan',
  5: 'usb_power',
  6: 'pcie_power',
  7: 'dns',
  8: 'nagle',
  9: 'audio_enhancements',
  10: 'gamedvr',
  11: 'background_apps',
  12: 'edge_debloat',
  13: 'copilot_disable',
  14: 'explorer_speed',
  15: 'temp_purge',
  16: 'razer_block',
  17: 'restore_point',
  18: 'classic_menu',
  19: 'storage_sense',
  20: 'display_perf',
  21: 'end_task',
  22: 'explorer_cleanup',
  23: 'notifications_off',
  24: 'ps7_telemetry',
  25: 'multiplane_overlay',
  26: 'mouse_accel',
  27: 'usb_suspend',
  28: 'keyboard_response',
  29: 'game_mode',
  30: 'min_processor_state',
  31: 'hibernation_disable',
  32: 'rss_enable',
  33: 'adapter_power',
  34: 'delivery_opt',
  35: 'wer_disable',
  36: 'wifi_sense',
  37: 'spotlight_disable',
  38: 'feedback_disable',
  39: 'clipboard_sync',
  40: 'accessibility_shortcuts',
  41: 'audio_communications',
  42: 'audio_system_sounds',
  43: 'input_buffer',
  44: 'filesystem_perf',
  45: 'dwm_perf',

  // CAUTION tier (50-70)
  50: 'msi_mode',
  51: 'hpet',
  52: 'game_bar',
  53: 'hags',
  54: 'fso_disable',
  55: 'ultimate_perf',
  56: 'services_trim',
  57: 'disk_cleanup',
  58: 'wpbt_disable',
  59: 'qos_gaming',
  60: 'network_throttling',
  61: 'interrupt_affinity',
  62: 'process_mitigation',
  63: 'mmcss_gaming',
  64: 'scheduler_opt',
  65: 'core_parking',
  66: 'timer_registry',
  67: 'rsc_disable',
  68: 'sysmain_disable',
  69: 'services_search_off',
  70: 'memory_gaming',
  71: 'power_throttle_off',
  72: 'priority_boost_off',

  // RISKY tier (80-90)
  80: 'privacy_tier1',
  81: 'privacy_tier2',
  82: 'privacy_tier3',
  83: 'bloatware',
  84: 'ipv4_prefer',
  85: 'teredo_disable',
  86: 'native_nvme',
  87: 'smt_disable',
  88: 'audio_exclusive',
  89: 'tcp_optimizer',

  // LUDICROUS tier (100-110)
  100: 'spectre_meltdown_off',
  101: 'core_isolation_off',
  102: 'kernel_mitigations_off',
  103: 'dep_off',
}

// Build reverse mapping
export const OPT_VALUE_TO_ID: Record<OptimizationKey, number> = Object.fromEntries(
  Object.entries(OPT_ID_TO_VALUE)
    .filter(([_, value]) => value !== null)
    .map(([id, value]) => [value, Number(id)])
) as Record<OptimizationKey, number>

/**
 * Type guard to check if an optimization ID maps to a valid (non-deprecated) value
 */
export function isValidOptId(id: number): boolean {
  return id in OPT_ID_TO_VALUE && OPT_ID_TO_VALUE[id] !== null
}

/**
 * Get optimization key from ID, returns undefined for unknown/deprecated IDs
 */
export function getOptFromId(id: number): OptimizationKey | undefined {
  const value = OPT_ID_TO_VALUE[id]
  return value ?? undefined
}

/**
 * Get ID from optimization key, returns undefined for unknown keys
 */
export function getIdFromOpt(key: OptimizationKey): number | undefined {
  return OPT_VALUE_TO_ID[key]
}
