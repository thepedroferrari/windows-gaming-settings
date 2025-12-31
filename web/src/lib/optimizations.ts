/**
 * Optimization data definitions for the Upgrades section
 *
 * Extracted from index.html optimization fieldsets.
 * Each optimization has a key, tier, category, label, hint, tooltip, and default state.
 */

import type { OptimizationKey, OptimizationTier } from './types'
import { OPTIMIZATION_KEYS, OPTIMIZATION_TIERS } from './types'
import type { StructuredTooltip } from '../utils/tooltips'

/** Optimization category for grouping in UI */
export type OptimizationCategory =
  | 'system'
  | 'power'
  | 'network'
  | 'input'
  | 'display'
  | 'privacy'
  | 'audio'

/** Full optimization definition */
export interface OptimizationDef {
  readonly key: OptimizationKey
  readonly tier: OptimizationTier
  readonly category: OptimizationCategory
  readonly label: string
  readonly hint: string
  readonly tooltip: StructuredTooltip
  readonly defaultChecked: boolean
}

/** Safe System optimizations */
const SAFE_SYSTEM: readonly OptimizationDef[] = [
  {
    key: OPTIMIZATION_KEYS.PAGEFILE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Fixed Page File',
    hint: '4GB for 32GB+ RAM — prevents fragmentation',
    tooltip: {
      title: 'Fixed Page File',
      desc: 'Prevents dynamic resizing and fragmentation',
      pros: [
        'Sets 4GB fixed size (8GB if RAM < 32GB)',
        'Eliminates fragmentation-induced stutters',
        'Reduces disk I/O during gaming',
      ],
      cons: ['Uses fixed disk space', 'Manual adjustment if RAM changes'],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.FASTBOOT,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Disable Fast Startup',
    hint: 'Clean boots, prevents driver issues',
    tooltip: {
      title: 'Disable Fast Startup',
      desc: 'Ensures clean boot cycle instead of hybrid hibernation',
      pros: [
        'Fresh driver initialization every boot',
        'Fixes USB/audio detection issues',
        'Required for dual-boot systems',
      ],
      cons: ['Slightly longer boot time', 'No hibernation resume'],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.TIMER,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Timer Resolution Tool',
    hint: '0.5ms timer for games',
    tooltip: {
      title: 'Timer Resolution Tool',
      desc: 'Sets Windows timer to 0.5ms (from 15.6ms default)',
      pros: [
        'Improves input responsiveness',
        'Better frame pacing',
        'Smoother 128-tick gameplay',
      ],
      cons: ['Must run during gameplay', 'Slightly higher power usage'],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.EXPLORER_SPEED,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Explorer Speed',
    hint: 'Faster folder browsing',
    tooltip: {
      title: 'Explorer Speed',
      desc: 'Disables auto folder-type detection and metadata scanning',
      pros: ['Folders open instantly', 'Big improvement for large folders', 'No functional downside'],
      cons: ['Less automatic folder organization', 'Manual view settings needed'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.TEMP_PURGE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Purge Temp Files',
    hint: 'Free disk space',
    tooltip: {
      title: 'Purge Temp Files',
      desc: 'Clears Windows temp folders, browser caches, and crash dumps',
      pros: ['Reclaims GB of disk space', 'Instant operation', 'Safe — only removes expendable files'],
      cons: ['Some apps may need to rebuild caches'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.RESTORE_POINT,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Restore Point',
    hint: 'Safety backup first',
    tooltip: {
      title: 'Create Restore Point',
      desc: 'Creates Windows restore point before applying any changes',
      pros: ['Instant rollback if needed', 'Best practice before system changes', 'Takes only seconds'],
      cons: [],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.CLASSIC_MENU,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Classic Context Menu',
    hint: 'Win10 style right-click',
    tooltip: {
      title: 'Classic Context Menu',
      desc: 'Restores Windows 10 style right-click menu',
      pros: ['All options visible immediately', 'No extra click needed', 'Easy to revert'],
      cons: ['Loses Win11 menu styling', 'Personal preference'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.STORAGE_SENSE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Storage Sense',
    hint: 'Auto cleanup temp files',
    tooltip: {
      title: 'Storage Sense',
      desc: 'Enables automatic disk cleanup feature',
      pros: ['Set and forget maintenance', 'Auto-cleans old temp files', 'Keeps system lean'],
      cons: ['May delete files you wanted', 'Runs in background'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.END_TASK,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Taskbar End Task',
    hint: 'Right-click to kill apps',
    tooltip: {
      title: 'Taskbar End Task',
      desc: 'Adds "End Task" option to taskbar right-click menu (Win11 23H2+)',
      pros: ['Kill frozen apps instantly', 'No Task Manager needed', 'Huge quality-of-life improvement'],
      cons: [],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.EXPLORER_CLEANUP,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Explorer Cleanup',
    hint: 'Remove clutter from sidebar',
    tooltip: {
      title: 'Explorer Cleanup',
      desc: 'Hides Gallery and duplicate entries from navigation',
      pros: ['Cleaner File Explorer', 'Less cluttered sidebar', 'Easy to revert'],
      cons: ['Hides some default items', 'Personal preference'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.NOTIFICATIONS_OFF,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Quiet Notifications',
    hint: 'Disable non-essential popups',
    tooltip: {
      title: 'Quiet Notifications',
      desc: 'Disables tips, suggestions, and welcome screens',
      pros: ['No random tips mid-game', 'Less notification clutter', 'Critical alerts still work'],
      cons: ['Miss Windows tips', 'Less feature discovery'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.PS7_TELEMETRY,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'PowerShell 7 Telemetry',
    hint: 'Disable PS7 data collection',
    tooltip: {
      title: 'PowerShell 7 Telemetry',
      desc: 'Sets environment variable to disable PowerShell 7 telemetry',
      pros: ['Privacy improvement', 'Zero impact on functionality', 'Simple env variable change'],
      cons: ['Only affects PowerShell 7, not Windows PowerShell 5.1'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.FILESYSTEM_PERF,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Filesystem Performance',
    hint: 'Disable NTFS overhead',
    tooltip: {
      title: 'Filesystem Performance',
      desc: 'Reduces disk I/O overhead from NTFS features',
      pros: ['Faster file operations', 'Reduced SSD write amplification', 'Invisible to users'],
      cons: ['No last access timestamps', 'No 8.3 short filenames'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.DWM_PERF,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'DWM Performance',
    hint: 'Reduce compositor overhead',
    tooltip: {
      title: 'DWM Performance',
      desc: 'Disables visual effects in Desktop Window Manager',
      pros: ['Faster alt-tab transitions', 'Lower GPU usage', 'Reduced DWM overhead'],
      cons: ['Less fancy windows', 'No accent gradients'],
    },
    defaultChecked: false,
  },
]

/** Safe Power optimizations */
const SAFE_POWER: readonly OptimizationDef[] = [
  {
    key: OPTIMIZATION_KEYS.POWER_PLAN,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'power',
    label: 'Balanced+ Power Plan',
    hint: 'Optimized for gaming PCs',
    tooltip: {
      title: 'Balanced+ Power Plan',
      desc: 'Gaming-optimized power plan based on Windows Balanced',
      pros: ['Works with CPU boost (P-States, CPPC)', 'Better than High Perf for X3D', 'No sleep timeouts'],
      cons: ['Slightly higher idle power', 'USB/PCIe always powered'],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.USB_POWER,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'power',
    label: 'USB Full Power',
    hint: 'Prevent device disconnects',
    tooltip: {
      title: 'USB Full Power',
      desc: 'Disables USB selective suspend — devices stay powered',
      pros: ['Eliminates random disconnects', 'Essential for gaming mice/keyboards', 'Fixes wake-from-sleep issues'],
      cons: [],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.PCIE_POWER,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'power',
    label: 'PCIe Full Power',
    hint: 'GPU and NVMe always ready',
    tooltip: {
      title: 'PCIe Full Power',
      desc: 'Disables PCIe ASPM (Active State Power Management)',
      pros: ['GPU/NVMe at full power', 'Reduces micro-stutters', 'Important for GPU games'],
      cons: ['Slightly higher idle power', 'More heat at idle'],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.USB_SUSPEND,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'power',
    label: 'USB Hub Suspend Off',
    hint: 'Per-device power setting',
    tooltip: {
      title: 'USB Hub Suspend Off',
      desc: 'Disables power management on USB hub controllers via Device Manager',
      pros: ['More thorough than power plan settings', 'Targets root hub controllers', 'Fixes stubborn USB issues'],
      cons: [],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.MIN_PROCESSOR_STATE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'power',
    label: 'Min Processor State 5%',
    hint: 'Allow CPU to downclock when idle',
    tooltip: {
      title: 'Min Processor State 5%',
      desc: 'Sets minimum CPU state to 5% for thermal headroom',
      pros: ['Better thermal behavior', 'Essential for AMD X3D', 'Improves boost headroom'],
      cons: ['Slightly slower wake from idle', 'CPU downclocks when idle'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.HIBERNATION_DISABLE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'power',
    label: 'Hibernation Off',
    hint: 'Free disk, cleaner state',
    tooltip: {
      title: 'Hibernation Off',
      desc: 'Removes hibernation file (hiberfil.sys)',
      pros: ['Frees several GB disk space', 'Cleaner boot cycle', 'Prevents resume issues'],
      cons: ['No hibernation option', 'Must fully shutdown'],
    },
    defaultChecked: false,
  },
]

/** Safe Network optimizations */
const SAFE_NETWORK: readonly OptimizationDef[] = [
  {
    key: OPTIMIZATION_KEYS.DNS,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'network',
    label: 'Custom DNS',
    hint: 'Faster, more reliable DNS lookups',
    tooltip: {
      title: 'Custom DNS',
      desc: 'Use faster DNS servers (Cloudflare, Google, Quad9)',
      pros: ['Faster than ISP DNS', 'More reliable', 'Privacy options available'],
      cons: ['Requires DNS provider trust', 'May bypass ISP filtering'],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.NAGLE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'network',
    label: 'Disable Nagle',
    hint: 'Lower network latency',
    tooltip: {
      title: "Disable Nagle's Algorithm",
      desc: 'Sends packets immediately instead of buffering',
      pros: ['Critical for competitive FPS', 'Lower network latency', 'Immediate packet send'],
      cons: ['Slightly higher bandwidth usage', 'More packets sent'],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.RSS_ENABLE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'network',
    label: 'RSS Enable',
    hint: 'Spread network load across CPUs',
    tooltip: {
      title: 'RSS Enable',
      desc: 'Receive Side Scaling — spreads network processing across CPU cores',
      pros: ['Prevents single-core network bottleneck', 'Better throughput on gigabit+', 'Essential for high-speed NICs'],
      cons: [],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.ADAPTER_POWER,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'network',
    label: 'Adapter Power Off',
    hint: 'Disable NIC power saving',
    tooltip: {
      title: 'Adapter Power Off',
      desc: 'Prevents network adapter from entering low-power states',
      pros: ['No network wake-up latency', 'Consistent ping times', 'Prevents connection drops'],
      cons: [],
    },
    defaultChecked: false,
  },
]

/** Safe Input optimizations */
const SAFE_INPUT: readonly OptimizationDef[] = [
  {
    key: OPTIMIZATION_KEYS.MOUSE_ACCEL,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'input',
    label: 'Disable Mouse Accel',
    hint: 'Raw mouse input',
    tooltip: {
      title: 'Disable Mouse Acceleration',
      desc: '1:1 mouse movement with no acceleration curve',
      pros: ['Essential for competitive gaming', 'Consistent aim', 'Faster muscle memory'],
      cons: ['May feel different initially', 'Preference-dependent'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.KEYBOARD_RESPONSE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'input',
    label: 'Keyboard Response',
    hint: 'Faster key repeat',
    tooltip: {
      title: 'Keyboard Response',
      desc: 'Sets fastest key repeat rate and shortest delay',
      pros: ['Snappier typing feel', 'Better for fast-paced games', 'More responsive'],
      cons: ['Personal preference', 'May cause accidental repeats'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.ACCESSIBILITY_SHORTCUTS,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'input',
    label: 'Disable Accessibility Shortcuts',
    hint: 'No Sticky Keys popup mid-game',
    tooltip: {
      title: 'Disable Accessibility Shortcuts',
      desc: 'Prevents Sticky Keys, Filter Keys, Toggle Keys popups',
      pros: ['No popups mid-game', 'Essential for gaming', '5 shifts wont interrupt'],
      cons: ['Accessibility features disabled', 'Need manual re-enable if needed'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.INPUT_BUFFER,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'input',
    label: 'Input Buffer Size',
    hint: 'Larger mouse/keyboard buffers',
    tooltip: {
      title: 'Input Buffer Size',
      desc: 'Increases HID input queue — prevents dropped inputs at high polling rates',
      pros: ['Prevents input loss during CPU spikes', 'Essential for 4000Hz+ mice', 'Recommended for 8KHz polling'],
      cons: [],
    },
    defaultChecked: false,
  },
]

/** Safe Display optimizations */
const SAFE_DISPLAY: readonly OptimizationDef[] = [
  {
    key: OPTIMIZATION_KEYS.DISPLAY_PERF,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'display',
    label: 'Visual Performance',
    hint: 'Disable animations',
    tooltip: {
      title: 'Visual Performance',
      desc: 'Disables window animations and transparency effects',
      pros: ['Reduces DWM overhead', 'Faster alt-tab', 'Lower GPU usage'],
      cons: ['Less polished look', 'No transparency effects'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.MULTIPLANE_OVERLAY,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'display',
    label: 'MPO Off',
    hint: 'Fix display issues',
    tooltip: {
      title: 'Multiplane Overlay Off',
      desc: 'Disables hardware cursor/overlay planes',
      pros: ['Fixes flickering issues', 'Resolves VRR stuttering', 'GPU/monitor compatibility fix'],
      cons: ['Slight GPU overhead increase', 'Only needed if flickering'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.GAMEDVR,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'display',
    label: 'Game DVR Off',
    hint: 'Disable background recording',
    tooltip: {
      title: 'Game DVR Off',
      desc: 'Stops Xbox Game Bar background capture and encoding',
      pros: ['1-3% FPS improvement', 'Frees GPU encoder', 'No hidden recording'],
      cons: ['No instant replay feature', 'Cant use Game Bar clips'],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.GAME_MODE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'display',
    label: 'Game Mode On',
    hint: 'Enable Windows Game Mode',
    tooltip: {
      title: 'Game Mode On',
      desc: 'Prioritizes game processes for CPU/GPU resources',
      pros: ['Essential for AMD X3D CPUs', 'Reduces background interference', 'Works with V-Cache optimizer'],
      cons: ['Minimal impact on non-X3D', 'May affect background tasks'],
    },
    defaultChecked: false,
  },
]

/** Safe Privacy optimizations */
const SAFE_PRIVACY: readonly OptimizationDef[] = [
  {
    key: OPTIMIZATION_KEYS.BACKGROUND_APPS,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'Background Apps',
    hint: 'Stop apps running silently',
    tooltip: {
      title: 'Background Apps',
      desc: 'Prevents UWP apps from running in background',
      pros: ['Significant resource savings', 'Reduces RAM/CPU usage', 'Stops apps phoning home'],
      cons: ['Some apps need exceptions', 'May affect notifications'],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.EDGE_DEBLOAT,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'Edge Debloat',
    hint: 'Remove Edge integrations',
    tooltip: {
      title: 'Edge Debloat',
      desc: 'Disables Edge sidebar, shopping, and Copilot features',
      pros: ['Quieter Edge browser', 'No search hijacking', 'Removes bloat features'],
      cons: ['Only useful if you use Edge', 'Loses some Edge features'],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.COPILOT_DISABLE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'Disable Copilot',
    hint: 'Remove AI assistant',
    tooltip: {
      title: 'Disable Copilot',
      desc: 'Removes Windows Copilot AI assistant',
      pros: ['Privacy improvement', 'Frees RAM and network', 'No AI processes'],
      cons: ['Lose AI assistant features', 'Manual re-enable needed'],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.RAZER_BLOCK,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'Block Razer Services',
    hint: 'Stop Synapse bloat',
    tooltip: {
      title: 'Block Razer Services',
      desc: 'Disables unnecessary Razer services and telemetry',
      pros: ['Stops analytics/telemetry', 'Synapse still works', 'Reduces bloat'],
      cons: ['Only for Razer users', 'Some features may be affected'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.DELIVERY_OPT,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'Delivery Optimization Off',
    hint: 'Stop P2P Windows Update',
    tooltip: {
      title: 'Delivery Optimization Off',
      desc: 'Stops P2P update sharing, downloads only from Microsoft',
      pros: ['Saves upload bandwidth', 'No P2P sharing', 'No impact on update speed'],
      cons: ['Uses more Microsoft bandwidth', 'Slightly slower in some cases'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.WER_DISABLE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'Error Reporting Off',
    hint: 'Stop crash reports',
    tooltip: {
      title: 'Error Reporting Off',
      desc: 'Stops Windows Error Reporting service',
      pros: ['Privacy improvement', 'Faster crash recovery', 'No data sent'],
      cons: ['Microsoft cant diagnose issues', 'No automatic crash reports'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.WIFI_SENSE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'WiFi Sense Off',
    hint: 'Stop network sharing',
    tooltip: {
      title: 'WiFi Sense Off',
      desc: 'Disables automatic hotspot connections and credential sharing',
      pros: ['Privacy/security improvement', 'No auto-connect to open networks', 'No credential sharing'],
      cons: ['No automatic network suggestions', 'Manual network selection'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.SPOTLIGHT_DISABLE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'Spotlight Off',
    hint: 'No lock screen ads',
    tooltip: {
      title: 'Spotlight Off',
      desc: 'Removes Bing images and tips from lock screen',
      pros: ['Reduces background downloads', 'Faster lock screen', 'Cleaner experience'],
      cons: ['No pretty Bing images', 'Static lock screen'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.FEEDBACK_DISABLE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'Feedback Off',
    hint: 'Stop Windows prompts',
    tooltip: {
      title: 'Feedback Off',
      desc: 'Stops "Rate your experience" and feedback request popups',
      pros: ['No random interruptions', 'Cleaner experience', 'Pure quality-of-life improvement'],
      cons: [],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.CLIPBOARD_SYNC,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'Clipboard Sync Off',
    hint: 'Local clipboard only',
    tooltip: {
      title: 'Clipboard Sync Off',
      desc: 'Disables cloud clipboard sync and history',
      pros: ['Privacy improvement', 'No accidental data sync', 'Local clipboard only'],
      cons: ['No cross-device clipboard', 'No clipboard history'],
    },
    defaultChecked: false,
  },
]

/** Safe Audio optimizations */
const SAFE_AUDIO: readonly OptimizationDef[] = [
  {
    key: OPTIMIZATION_KEYS.AUDIO_ENHANCEMENTS,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'audio',
    label: 'Audio Enhancements Off',
    hint: 'Clean audio signal',
    tooltip: {
      title: 'Audio Enhancements Off',
      desc: 'Disables Windows audio processing and enhancements',
      pros: ['Pure audio signal', 'Reduces latency', 'Better for external DACs'],
      cons: ['No virtual surround', 'No Windows audio effects'],
    },
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.AUDIO_COMMUNICATIONS,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'audio',
    label: 'No Volume Ducking',
    hint: 'Keep volume during Discord calls',
    tooltip: {
      title: 'No Volume Ducking',
      desc: 'Prevents volume reduction during voice calls',
      pros: ['Game audio stays at 100%', 'Essential for competitive', 'No auto volume changes'],
      cons: ['May miss call notifications', 'Manual volume needed'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.AUDIO_SYSTEM_SOUNDS,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'audio',
    label: 'Mute System Sounds',
    hint: 'No Windows beeps/chimes',
    tooltip: {
      title: 'Mute System Sounds',
      desc: 'Sets sound scheme to "No Sounds"',
      pros: ['Zero audio interruptions', 'Clean soundscape', 'No error beeps'],
      cons: ['No audio feedback', 'May miss notifications'],
    },
    defaultChecked: false,
  },
]

/** Caution-tier optimizations */
const CAUTION_OPTIMIZATIONS: readonly OptimizationDef[] = [
  {
    key: OPTIMIZATION_KEYS.MSI_MODE,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'MSI Mode',
    hint: 'Reduce DPC latency',
    tooltip: {
      title: 'MSI Mode',
      desc: 'Enables Message Signaled Interrupts for GPU and network adapters',
      pros: ['Reduces DPC latency by ~50μs', 'More efficient interrupt delivery', 'Better for high-refresh gaming'],
      cons: ['Some older hardware incompatible', 'Test with LatencyMon after enabling'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.HPET,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'HPET Off',
    hint: 'Alternative timer source',
    tooltip: {
      title: 'HPET Off',
      desc: 'Forces Windows to use TSC instead of High Precision Event Timer',
      pros: ['TSC is faster on modern CPUs', 'Can improve frame consistency', 'Lower timer query overhead'],
      cons: ['Results vary by system', 'Requires reboot to take effect', 'Benchmark to verify improvement'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.GAME_BAR,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'display',
    label: 'Game Bar Off',
    hint: 'Fully disable Xbox overlay',
    tooltip: {
      title: 'Game Bar Off',
      desc: 'Complete Xbox Game Bar removal',
      pros: ['Removes overlay completely', 'Frees more resources', 'No background processes'],
      cons: ['**Breaks X3D V-Cache optimizer**', 'Keep ON for 7800X3D/9800X3D', 'No quick capture'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.HAGS,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'display',
    label: 'HAGS On',
    hint: 'Hardware accelerated GPU scheduling',
    tooltip: {
      title: 'HAGS On',
      desc: 'Hardware Accelerated GPU Scheduling',
      pros: ['GPU manages own memory', 'Can reduce input latency', 'Benefits newer games'],
      cons: ['Mixed results by GPU/game', 'Some older games worse', 'Test per-game'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.FSO_DISABLE,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'display',
    label: 'Fullscreen Optimizations Off',
    hint: 'Legacy fullscreen mode',
    tooltip: {
      title: 'Fullscreen Optimizations Off',
      desc: 'True exclusive fullscreen mode',
      pros: ['Lower input latency possible', 'Direct GPU access', 'No compositor overhead'],
      cons: ['Alt-tab issues', 'Per-game setting may be better', 'Some games need it on'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.ULTIMATE_PERF,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'power',
    label: 'Ultimate Performance',
    hint: 'Maximum power, no throttling',
    tooltip: {
      title: 'Ultimate Performance',
      desc: 'Hidden maximum power plan',
      pros: ['All power saving disabled', 'Maximum clocks always', 'Zero throttling'],
      cons: ['Higher power consumption', 'May hurt AMD X3D efficiency', 'More heat output'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.SERVICES_TRIM,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Trim Services',
    hint: 'Disable unused Windows services',
    tooltip: {
      title: 'Trim Services',
      desc: 'Sets rarely-used services to Manual (Print Spooler, Fax, Remote Registry)',
      pros: ['Stops services you dont use', 'Fewer background processes', 'Services start if needed'],
      cons: ['Printing may need manual service start', 'Review list matches your usage'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.DISK_CLEANUP,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Deep Disk Cleanup',
    hint: 'Clear Windows Update cache',
    tooltip: {
      title: 'Deep Disk Cleanup',
      desc: 'Thorough system cleaning',
      pros: ['Clears WU download cache', 'Removes old installations', 'Reclaims disk space'],
      cons: ['Cannot roll back updates', 'May need re-downloads', 'One-way operation'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.WPBT_DISABLE,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'WPBT Disable',
    hint: 'Block BIOS software injection',
    tooltip: {
      title: 'WPBT Disable',
      desc: 'Block vendor bloatware injection',
      pros: ['Stops BIOS software injection', 'No OEM auto-installs', 'Cleaner system'],
      cons: ['May affect BIOS features', 'Test after mobo updates', 'Some utilities blocked'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.QOS_GAMING,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'network',
    label: 'QoS Gaming',
    hint: 'Prioritize game traffic',
    tooltip: {
      title: 'QoS Gaming',
      desc: 'Network traffic prioritization',
      pros: ['Game traffic = high priority', 'Background downloads deprioritized', 'Uses Windows QoS'],
      cons: ['Not all routers respect this', 'Test in multiplayer', 'Router QoS may conflict'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.NETWORK_THROTTLING,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'network',
    label: 'Network Throttling Off',
    hint: 'Disable media streaming throttle',
    tooltip: {
      title: 'Network Throttling Off',
      desc: 'Disables Windows multimedia network throttling (NetworkThrottlingIndex)',
      pros: ['Full network throughput always', 'No background throttling during media', 'Better for game downloads'],
      cons: ['Slightly higher CPU usage on network I/O'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.INTERRUPT_AFFINITY,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Interrupt Affinity',
    hint: 'Pin interrupts to CPU cores',
    tooltip: {
      title: 'Interrupt Affinity',
      desc: 'Pin GPU/NIC interrupts to cores',
      pros: ['Reduces core switching', 'Better DPC latency', 'Good for many-core CPUs'],
      cons: ['Hardware-specific tuning', 'Use MSI Utility Tool', 'Wrong settings hurt perf'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.PROCESS_MITIGATION,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Process Mitigations',
    hint: 'Disable exploit protections',
    tooltip: {
      title: 'Process Mitigations',
      desc: 'Disable CFG, CET exploit protections',
      pros: ['1-5% performance gain', 'Less CPU overhead', 'Faster code execution'],
      cons: ['Reduces security protections', 'Only for offline/trusted games', 'Security trade-off'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.MMCSS_GAMING,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'MMCSS Gaming',
    hint: 'GPU/CPU priority for games',
    tooltip: {
      title: 'MMCSS Gaming',
      desc: 'Multimedia Class Scheduler tuning',
      pros: ['GPU Priority = 8 (highest)', 'CPU Priority = 6', 'Scheduling Category = High'],
      cons: ['May affect streaming/capture', 'Test with your games', 'OBS may need adjustment'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.SCHEDULER_OPT,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Scheduler Optimization',
    hint: 'Win32PrioritySeparation tuning',
    tooltip: {
      title: 'Scheduler Optimization',
      desc: 'Win32PrioritySeparation = 26',
      pros: ['Better foreground priority', 'More consistent frame times', 'Optimized quantum'],
      cons: ['May affect background tasks', 'Benchmark before/after', 'Subtle differences'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.CORE_PARKING,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'power',
    label: 'Core Parking Off',
    hint: 'Keep all cores active',
    tooltip: {
      title: 'Core Parking Off',
      desc: 'Disable CPU core sleep states',
      pros: ['All cores always active', 'No unparking latency', 'Instant core availability'],
      cons: ['Higher idle power', 'May hurt AMD X3D efficiency', 'More heat at idle'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.TIMER_REGISTRY,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Timer Registry',
    hint: 'GlobalTimerResolutionRequests',
    tooltip: {
      title: 'Timer Registry',
      desc: 'System timer resolution settings',
      pros: ['GlobalTimerResolutionRequests on', 'SystemResponsiveness = 0', 'Complements timer-tool.ps1'],
      cons: ['May increase power usage', 'Test with timer-tool.ps1', 'Subtle improvements'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.RSC_DISABLE,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'network',
    label: 'RSC Off',
    hint: 'Disable packet coalescing',
    tooltip: {
      title: 'RSC Off',
      desc: 'Disable Receive Segment Coalescing',
      pros: ['No packet batching in NIC', 'May reduce network latency', 'Packets processed immediately'],
      cons: ['Slightly higher CPU usage', 'Not all adapters support', 'Benchmark network perf'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.SYSMAIN_DISABLE,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'SysMain Off',
    hint: 'Disable Superfetch',
    tooltip: {
      title: 'SysMain Off',
      desc: 'Disable Superfetch/prefetch service',
      pros: ['Stops memory prefetching', 'Frees RAM for games', 'Less disk I/O'],
      cons: ['Slower app launches', 'Better for gaming-only PCs', 'First launch slower'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.SERVICES_SEARCH_OFF,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Windows Search Off',
    hint: 'Stop disk indexing spikes',
    tooltip: {
      title: 'Windows Search Off',
      desc: 'Disable indexing service',
      pros: ['WSearch set to Manual', 'No constant disk I/O', 'Search still works'],
      cons: ['File search slower initially', 'Start menu less responsive', 'No instant results'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.MEMORY_GAMING,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Memory Gaming Mode',
    hint: 'Keep kernel in RAM',
    tooltip: {
      title: 'Memory Gaming Mode',
      desc: 'Optimize memory for gaming',
      pros: ['Kernel stays in RAM', 'More RAM for games', 'Optimized NTFS usage'],
      cons: ['Requires 16GB+ RAM', 'Memory pressure on low-RAM', 'Not for 8GB systems'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.POWER_THROTTLE_OFF,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'power',
    label: 'Power Throttling Off',
    hint: 'No background throttling',
    tooltip: {
      title: 'Power Throttling Off',
      desc: 'Disable Windows power throttling',
      pros: ['No background throttling', 'Full CPU power always', 'EcoQoS disabled'],
      cons: ['Higher power consumption', 'Laptop battery drain', 'More heat output'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.PRIORITY_BOOST_OFF,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Priority Boost Off',
    hint: 'Consistent CPU scheduling',
    tooltip: {
      title: 'Priority Boost Off',
      desc: 'Disable dynamic priority boost',
      pros: ['More consistent scheduling', 'Predictable frame times', 'Some pros prefer this'],
      cons: ['May affect multitasking', 'Test before competitive', 'Subtle change'],
    },
    defaultChecked: false,
  },
]

/** Risky-tier optimizations */
const RISKY_OPTIMIZATIONS: readonly OptimizationDef[] = [
  {
    key: OPTIMIZATION_KEYS.PRIVACY_TIER1,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'privacy',
    label: 'Privacy Tier 1',
    hint: 'Disable ads and tracking',
    tooltip: {
      title: 'Privacy Tier 1',
      desc: 'Disables advertising ID, activity history, and Start menu suggestions',
      pros: ['Stops cross-app ad tracking', 'No activity history sync', 'Cleaner Start menu'],
      cons: ['Personalization features disabled', 'Timeline/activity history gone'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.PRIVACY_TIER2,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'privacy',
    label: 'Privacy Tier 2',
    hint: 'Disable diagnostic data',
    tooltip: {
      title: 'Privacy Tier 2',
      desc: 'Extended privacy controls',
      pros: ['Telemetry = Security level', 'No typing/inking collection', 'Blocks feedback prompts'],
      cons: ['Troubleshooting features affected', 'May impact Windows Insider', 'Less diagnostic data'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.PRIVACY_TIER3,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'privacy',
    label: 'Privacy Tier 3',
    hint: 'Maximum telemetry blocking',
    tooltip: {
      title: 'Privacy Tier 3',
      desc: 'Aggressive telemetry blocking',
      pros: ['Disables Connected User Exp', 'Firewall blocks telemetry hosts', 'Minimal data transmission'],
      cons: ['May break MS Store updates', 'Some apps may not work', 'Hard to diagnose issues'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.BLOATWARE,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'system',
    label: 'Remove Bloatware',
    hint: 'Uninstall preinstalled apps',
    tooltip: {
      title: 'Remove Bloatware',
      desc: 'Removes sponsored apps: Candy Crush, TikTok, Spotify promo, etc.',
      pros: ['Cleaner Start menu', 'Frees disk space', 'No sponsored app reinstalls'],
      cons: ['Some apps hard to get back', 'Xbox apps may be affected'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.IPV4_PREFER,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'network',
    label: 'Prefer IPv4',
    hint: 'Disable IPv6 priority',
    tooltip: {
      title: 'Prefer IPv4',
      desc: 'Set IPv4 as preferred protocol',
      pros: ['May reduce DNS lookup time', 'Fixes some game connections', 'Simpler networking'],
      cons: ['Can break IPv6-only services', 'Some ISPs require IPv6', 'Future compatibility'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.TEREDO_DISABLE,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'network',
    label: 'Teredo Off',
    hint: 'Disable IPv6 tunnel',
    tooltip: {
      title: 'Teredo Off',
      desc: 'Remove IPv6 tunneling',
      pros: ['Disables Teredo tunneling', 'Reduces network overhead', 'May improve NAT traversal'],
      cons: ['Breaks Xbox Party Chat', 'May affect P2P games', 'Some features need IPv6'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.NATIVE_NVME,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'system',
    label: 'Native NVMe',
    hint: 'Disable storage stacks',
    tooltip: {
      title: 'Native NVMe',
      desc: 'Configures NVMe to bypass Windows storage abstraction layers',
      pros: ['Lower storage latency', 'Direct NVMe driver access', 'Better queue depth handling'],
      cons: ['NVMe drives only', 'Benchmark to verify gains'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.SMT_DISABLE,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'system',
    label: 'SMT/HT Off',
    hint: 'Disable hyperthreading',
    tooltip: {
      title: 'SMT/HT Off',
      desc: 'Disable simultaneous multithreading',
      pros: ['Better single-thread perf', 'Better cache per core', 'Less thread contention'],
      cons: ['**Significantly reduces multitasking**', 'Streaming affected', 'Half the threads'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.AUDIO_EXCLUSIVE,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'audio',
    label: 'Audio Exclusive Mode',
    hint: 'Game takes over audio',
    tooltip: {
      title: 'Audio Exclusive Mode',
      desc: 'WASAPI exclusive mode',
      pros: ['Bypasses Windows mixer', 'Lowest audio latency', 'Direct hardware access'],
      cons: ['**Discord/music blocked**', 'Only for competitive focus', 'No multitasking audio'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.TCP_OPTIMIZER,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'network',
    label: 'TCP Optimizer',
    hint: 'Aggressive TCP tuning',
    tooltip: {
      title: 'TCP Optimizer',
      desc: 'Aggressive TCP stack tuning',
      pros: ['Custom TCP window size', 'Auto-tuning disabled', 'Custom buffer sizes'],
      cons: ['May hurt some connections', 'Benchmark needed', 'ISP-dependent results'],
    },
    defaultChecked: false,
  },
]

// =============================================================================
// LUDICROUS TIER - "You shouldn't, but here's the power"
// =============================================================================
// These optimizations have REAL, DOCUMENTED security vulnerabilities.
// Not auto-enabled for ANY profile. EVER.
// Requires explicit "I understand the risks" acknowledgment.
// Each has CVE links so users can research the actual threats.
const LUDICROUS_OPTIMIZATIONS: readonly OptimizationDef[] = [
  {
    key: OPTIMIZATION_KEYS.CORE_ISOLATION_OFF,
    tier: OPTIMIZATION_TIERS.LUDICROUS,
    category: 'system',
    label: 'Core Isolation Off',
    hint: 'Disable VBS/HVCI',
    tooltip: {
      title: 'Core Isolation Off',
      desc: 'Disables Memory Integrity (HVCI), Credential Guard, and Kernel DMA Protection',
      pros: ['5-15% FPS gain in CPU-bound games', 'Removes virtualization overhead', 'Benchmark mode only'],
      cons: ['**Malware can inject kernel code**', 'Rootkits become trivial', 'Offline/disposable systems only'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.SPECTRE_MELTDOWN_OFF,
    tier: OPTIMIZATION_TIERS.LUDICROUS,
    category: 'system',
    label: 'Spectre/Meltdown Off',
    hint: 'CPU vulnerability mitigations',
    tooltip: {
      title: 'Spectre/Meltdown Off',
      desc: 'Disables CVE-2017-5753/5715/5754 mitigations — CPU hardware vulnerabilities',
      pros: ['5-30% performance depending on workload', 'No branch prediction penalties', 'Faster syscalls'],
      cons: ['**Any website JS can read your passwords**', 'Hardware-level CPU flaw', '**NEVER connect to network**'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.KERNEL_MITIGATIONS_OFF,
    tier: OPTIMIZATION_TIERS.LUDICROUS,
    category: 'system',
    label: 'Kernel Mitigations Off',
    hint: 'Disable kernel exploit protections',
    tooltip: {
      title: 'Kernel Mitigations Off',
      desc: 'Disables KPTI, SMAP, SMEP — kernel memory protections',
      pros: ['2-10% performance gain', 'No page table isolation overhead', 'Faster user/kernel transitions'],
      cons: ['**Kernel exploits become trivial**', 'Any driver bug = full system compromise', 'Reinstall OS before real use'],
    },
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.DEP_OFF,
    tier: OPTIMIZATION_TIERS.LUDICROUS,
    category: 'system',
    label: 'DEP Off',
    hint: 'Data Execution Prevention off',
    tooltip: {
      title: 'DEP Off',
      desc: 'Disables NX bit — allows code execution in data segments',
      pros: ['Fixes ancient games with DEP issues', 'Compatibility for pre-2004 software'],
      cons: ['**Buffer overflow exploits work again**', 'This is why 2000s had so many viruses', 'Re-enable immediately'],
    },
    defaultChecked: false,
  },
]

/** All optimizations grouped by tier and category */
export const OPTIMIZATIONS: readonly OptimizationDef[] = [
  ...SAFE_SYSTEM,
  ...SAFE_POWER,
  ...SAFE_NETWORK,
  ...SAFE_INPUT,
  ...SAFE_DISPLAY,
  ...SAFE_PRIVACY,
  ...SAFE_AUDIO,
  ...CAUTION_OPTIMIZATIONS,
  ...RISKY_OPTIMIZATIONS,
  ...LUDICROUS_OPTIMIZATIONS,
] as const

/** Get optimizations by tier and category */
export function getOptimizationsByTierAndCategory(
  tier: OptimizationTier,
  category: OptimizationCategory,
): OptimizationDef[] {
  return OPTIMIZATIONS.filter((opt) => opt.tier === tier && opt.category === category)
}

/** Get categories for a specific tier */
export function getCategoriesForTier(tier: OptimizationTier): OptimizationCategory[] {
  return [...new Set(OPTIMIZATIONS.filter((opt) => opt.tier === tier).map((opt) => opt.category))]
}

/** Get default enabled optimizations */
export function getDefaultOptimizations(): OptimizationKey[] {
  return OPTIMIZATIONS.filter((opt) => opt.defaultChecked).map((opt) => opt.key)
}

// =============================================================================
// Profile → Optimization Matrix
// =============================================================================

/** Profile types for optimization matrix */
export const PROFILE_IDS = [
  'minimal_default',
  'gamer',
  'streamer',
  'pro_gamer',
  'benchmarker',
] as const

export type ProfileId = (typeof PROFILE_IDS)[number]

/**
 * Profile → Optimization matrix
 * Defines which optimizations are enabled by default for each profile.
 * minimal_default is the internal baseline (not a visible preset).
 */
const PROFILE_OPTIMIZATIONS: Record<ProfileId, readonly OptimizationKey[]> = {
  // Internal baseline - safe essentials only
  minimal_default: [
    'pagefile',
    'fastboot',
    'restore_point',
    'power_plan',
    'usb_power',
    'pcie_power',
    'audio_enhancements',
    'game_mode', // Windows Game Mode - safe, no downside
  ],

  // Gamer: Conservative safe set, stability over maximum performance
  gamer: [
    'pagefile',
    'fastboot',
    'restore_point',
    'power_plan',
    'usb_power',
    'pcie_power',
    'dns',
    'nagle',
    'gamedvr',
    'background_apps',
    'edge_debloat',
    'copilot_disable',
    'audio_enhancements',
    'audio_communications', // No volume ducking during Discord calls
    'timer', // Safe, significant FPS benefit
    'end_task', // QoL, no downside
    'game_mode', // Windows Game Mode - safe
    'delivery_opt', // Disable P2P updates - frees bandwidth
    'feedback_disable', // No Windows feedback prompts
  ],

  // Streamer: Capture-safe optimizations (NO gamedvr - needed for capture)
  streamer: [
    'pagefile',
    'fastboot',
    'restore_point',
    'power_plan',
    'usb_power',
    'pcie_power',
    'dns',
    'nagle',
    'edge_debloat',
    'copilot_disable',
    'audio_enhancements',
    'audio_communications', // No volume ducking during Discord calls
    'game_mode', // Windows Game Mode - safe
    'delivery_opt', // Disable P2P updates - frees bandwidth for streaming
    'feedback_disable', // No interruptions during stream
    'timer', // Better frame pacing for stream output
    // Note: gamedvr NOT included - streamers need capture
  ],

  // Pro Gamer: Aggressive latency + fps focused for competitive gaming
  pro_gamer: [
    'pagefile',
    'fastboot',
    'timer',
    'restore_point',
    'notifications_off',
    'power_plan',
    'usb_power',
    'pcie_power',
    'usb_suspend',
    'dns',
    'nagle',
    'mouse_accel',
    'display_perf',
    'gamedvr',
    'background_apps',
    'edge_debloat',
    'copilot_disable',
    'audio_enhancements',
    'audio_communications', // No volume ducking during Discord calls
    'audio_system_sounds', // Mute Windows sounds - zero interruptions
    'accessibility_shortcuts', // ESSENTIAL: No Sticky Keys popup mid-clutch
    'msi_mode',
    'fso_disable',
    'ultimate_perf',
    'services_trim',
    'services_search_off', // Stop disk indexing spikes
    'wpbt_disable',
    'qos_gaming',
    'network_throttling',
    'interrupt_affinity',
    'keyboard_response', // Essential for competitive
    'end_task', // QoL, no downside
    // New PS module parity additions
    'game_mode', // Windows Game Mode - safe
    'mmcss_gaming', // MMCSS GPU/CPU priority - competitive edge
    'scheduler_opt', // Win32PrioritySeparation - input latency
    'timer_registry', // GlobalTimerResolutionRequests - frame pacing
    'min_processor_state', // 5% min processor state - better boost
    'delivery_opt', // Disable P2P updates - frees bandwidth
    'feedback_disable', // No prompts during gaming
    'rss_enable', // Network performance - RSS enabled
    // Note: hags removed (mixed results, benchmarker only)
  ],

  // Benchmarker: Maximum control - all safe + caution + most risky
  benchmarker: [
    // Safe tier
    'pagefile',
    'fastboot',
    'timer',
    'explorer_speed',
    'temp_purge',
    'restore_point',
    'classic_menu',
    'storage_sense',
    'end_task',
    'explorer_cleanup',
    'notifications_off',
    'ps7_telemetry',
    'power_plan',
    'usb_power',
    'pcie_power',
    'usb_suspend',
    'dns',
    'nagle',
    'mouse_accel',
    'keyboard_response',
    'accessibility_shortcuts', // Disable Sticky/Filter/Toggle Keys
    'display_perf',
    'multiplane_overlay',
    'gamedvr',
    'background_apps',
    'edge_debloat',
    'copilot_disable',
    'audio_enhancements',
    'audio_communications', // No volume ducking during calls
    'audio_system_sounds', // Mute Windows sounds
    // New PS module parity - Safe tier
    'game_mode',
    'min_processor_state',
    'hibernation_disable',
    'rss_enable',
    'adapter_power',
    'delivery_opt',
    'wer_disable',
    'wifi_sense',
    'spotlight_disable',
    'feedback_disable',
    'clipboard_sync',
    // Caution tier
    'msi_mode',
    'hpet',
    'hags',
    'fso_disable',
    'ultimate_perf',
    'services_trim',
    'services_search_off', // Stop disk indexing
    'disk_cleanup',
    'wpbt_disable',
    'qos_gaming',
    'network_throttling',
    'interrupt_affinity',
    // New PS module parity - Caution tier
    'mmcss_gaming',
    'scheduler_opt',
    'core_parking',
    'timer_registry',
    'rsc_disable',
    'sysmain_disable',
    // Risky tier (selected)
    'privacy_tier1',
    'privacy_tier2',
    'privacy_tier3',
    'bloatware',
    'ipv4_prefer',
    'teredo_disable',
    'native_nvme',
    'smt_disable',
    'audio_exclusive',
    'tcp_optimizer',
  ],
} as const

/** Get optimizations for a profile */
export function getOptimizationsForProfile(profile: ProfileId): readonly OptimizationKey[] {
  return PROFILE_OPTIMIZATIONS[profile] ?? []
}
