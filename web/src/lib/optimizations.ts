/**
 * Optimization data definitions for the Upgrades section
 *
 * Extracted from index.html optimization fieldsets.
 * Each optimization has a key, tier, category, label, hint, tooltip, and default state.
 */

import type { OptimizationKey, OptimizationTier } from './types'
import { OPTIMIZATION_KEYS, OPTIMIZATION_TIERS } from './types'

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
  readonly tooltip: string
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
    tooltip: `**Fixed Page File** — prevents dynamic resizing

- Sets **4GB** fixed size (8GB if RAM < 32GB)
- Stops Windows from growing/shrinking page file
- Eliminates fragmentation-induced stutters

✓ Recommended for 16GB+ RAM systems
✓ Reduces disk I/O during gaming sessions`,
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.FASTBOOT,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Disable Fast Startup',
    hint: 'Clean boots, prevents driver issues',
    tooltip: `**Disable Fast Startup** — cleaner boot cycle

- Fast Startup = hybrid hibernation (not true shutdown)
- Can cause driver conflicts on reboot
- Peripherals may not reinitialize properly

✓ Ensures fresh driver initialization every boot
✓ Fixes USB/audio devices not detected issues
✓ Required for dual-boot systems`,
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.TIMER,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Timer Resolution Tool',
    hint: '0.5ms timer for games',
    tooltip: `**Timer Resolution Tool** — run before gaming

- Sets Windows timer to **0.5ms** (from 15.6ms default)
- Improves input responsiveness and frame pacing
- Must be running during gameplay

✓ Why it matters: 15.6ms × 64 ticks ≈ 1 second (Valve's default tickrate)
✓ 0.5ms enables smoother 128-tick gameplay`,
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.EXPLORER_SPEED,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Explorer Speed',
    hint: 'Faster folder browsing',
    tooltip: `**Explorer Speed** — faster folder navigation

- Disables auto folder-type detection
- Skips thumbnail/metadata pre-scanning
- Folders open instantly instead of analyzing

✓ Big improvement for folders with many files
✓ No downside — folder views still work normally`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.TEMP_PURGE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Purge Temp Files',
    hint: 'Free disk space',
    tooltip: `**Purge Temp Files** — clear junk data

- Cleans %TEMP% (user temp folder)
- Cleans %WINDIR%\\Temp (system temp)
- Removes leftover installer files

✓ Instant operation, no reboot needed
✓ Safe — only removes temp/cache files`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.RESTORE_POINT,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Restore Point',
    hint: 'Safety backup first',
    tooltip: `**Create Restore Point** — safety net

- Creates system restore point before changes
- Allows rollback if something goes wrong
- Only takes a few seconds

✓ Always recommended before major changes
✓ No impact on performance`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.CLASSIC_MENU,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Classic Context Menu',
    hint: 'Win10 style right-click',
    tooltip: `**Classic Context Menu** — Win11 right-click fix

- Restores Windows 10 style right-click menu
- No more "Show more options" extra click
- All options visible immediately

✓ Quality-of-life improvement
✓ Easy to revert if needed`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.STORAGE_SENSE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Storage Sense',
    hint: 'Auto cleanup temp files',
    tooltip: `**Storage Sense** — automatic disk cleanup

- Enables Windows Storage Sense feature
- Auto-deletes temp files over 30 days old
- Cleans Recycle Bin automatically

✓ Set and forget disk maintenance
✓ Keeps system running lean`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.END_TASK,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Taskbar End Task',
    hint: 'Right-click to kill apps',
    tooltip: `**Taskbar End Task** — quick process termination

- Adds "End Task" to taskbar right-click menu
- Kill frozen apps without Task Manager
- Win11 feature (often disabled by default)

✓ Huge convenience for stuck apps
✓ No downside`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.EXPLORER_CLEANUP,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Explorer Cleanup',
    hint: 'Remove clutter from sidebar',
    tooltip: `**Explorer Cleanup** — cleaner File Explorer

- Hides "Gallery" from navigation pane
- Removes duplicate drive entries
- Cleaner, less cluttered sidebar

✓ Quality-of-life improvement
✓ Easy to revert`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.NOTIFICATIONS_OFF,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'Quiet Notifications',
    hint: 'Disable non-essential popups',
    tooltip: `**Quiet Notifications** — reduce interruptions

- Disables tips, suggestions, and welcome screens
- Stops lock screen app notifications
- Reduces notification center clutter

✓ No more random Windows tips mid-game
✓ Critical notifications still work`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.PS7_TELEMETRY,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'system',
    label: 'PowerShell 7 Telemetry',
    hint: 'Disable PS7 data collection',
    tooltip: `**PowerShell 7 Telemetry** — disable tracking

- Disables PowerShell 7 telemetry if installed
- Sets POWERSHELL_TELEMETRY_OPTOUT=1
- No effect if using Windows PowerShell 5.1

✓ Privacy improvement
✓ No impact on functionality`,
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
    tooltip: `**Balanced+ Power Plan** — gaming-optimized

- Uses Windows Balanced as base (best for modern CPUs)
- Disables monitor/sleep timeouts
- Keeps USB/PCIe devices at full power

✓ Works with CPU boost features (P-States, CPPC)
✓ Better than High Performance for X3D chips`,
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.USB_POWER,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'power',
    label: 'USB Full Power',
    hint: 'Prevent device disconnects',
    tooltip: `**USB Full Power** — disable USB suspend

- Disables selective suspend in power plan
- Prevents USB devices from sleeping
- Fixes random disconnects on mice/keyboards

✓ Essential for gaming peripherals
✓ Minimal power impact on desktop PCs`,
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.PCIE_POWER,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'power',
    label: 'PCIe Full Power',
    hint: 'GPU and NVMe always ready',
    tooltip: `**PCIe Full Power** — disable power saving

- Disables PCIe ASPM (Active State Power Management)
- GPU and NVMe drives stay at full power
- Reduces micro-stutter from power state changes

✓ Important for GPU-intensive games
✓ May increase idle power slightly`,
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.USB_SUSPEND,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'power',
    label: 'USB Hub Suspend Off',
    hint: 'Per-device power setting',
    tooltip: `**USB Hub Suspend Off** — device-level fix

- Disables suspend on USB hub controllers
- Complements USB Full Power setting
- Fixes issues USB power plan misses

✓ Targets Device Manager settings
✓ More thorough than power plan alone`,
    defaultChecked: false,
  },
]

/** Safe Network optimizations */
const SAFE_NETWORK: readonly OptimizationDef[] = [
  {
    key: OPTIMIZATION_KEYS.DNS,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'network',
    label: 'Cloudflare DNS',
    hint: '1.1.1.1 — faster lookups',
    tooltip: `**Cloudflare DNS** — faster DNS resolution

- Sets DNS to 1.1.1.1 and 1.0.0.1
- Faster than most ISP DNS servers
- Privacy-focused, no logging

✓ Reduces initial connection time
✓ Works with all games and services`,
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.NAGLE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'network',
    label: 'Disable Nagle',
    hint: 'Lower network latency',
    tooltip: `**Disable Nagle's Algorithm** — reduce network delay

- Nagle buffers small packets (adds latency)
- Disabling sends packets immediately
- Per-adapter registry tweak

✓ Critical for competitive FPS games
✓ May increase bandwidth slightly`,
    defaultChecked: true,
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
    tooltip: `**Disable Mouse Acceleration** — consistent aim

- Disables Windows mouse acceleration
- 1:1 mouse movement (no curve)
- Sets pointer precision off

✓ Essential for competitive gaming
✓ Muscle memory builds faster`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.KEYBOARD_RESPONSE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'input',
    label: 'Keyboard Response',
    hint: 'Faster key repeat',
    tooltip: `**Keyboard Response** — snappier typing

- Sets fastest key repeat rate
- Shortest repeat delay
- Improves responsiveness feel

✓ Better for fast-paced games
✓ Personal preference setting`,
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
    tooltip: `**Visual Performance** — reduce UI overhead

- Disables window animations
- Turns off transparency effects
- Faster alt-tab and window switching

✓ Reduces DWM overhead
✓ May look less polished`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.MULTIPLANE_OVERLAY,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'display',
    label: 'MPO Off',
    hint: 'Fix display issues',
    tooltip: `**Multiplane Overlay Off** — fix display glitches

- Disables hardware cursor/overlay planes
- Fixes flickering on some GPU/monitor combos
- Resolves VRR stuttering issues

✓ Try if you see random flickering
✓ Slight GPU overhead increase`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.GAMEDVR,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'display',
    label: 'Game DVR Off',
    hint: 'Disable background recording',
    tooltip: `**Game DVR Off** — stop hidden recording

- Disables Xbox Game Bar background capture
- Stops constant video encoding
- Frees GPU encoder resources

✓ 1-3% FPS improvement in some games
✓ Disable if you don't use Game Bar clips`,
    defaultChecked: true,
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
    tooltip: `**Background Apps** — reduce hidden processes

- Prevents apps from running in background
- Stops UWP apps from phoning home
- Reduces RAM and CPU usage

✓ Significant resource savings
✓ Some apps may need exceptions`,
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.EDGE_DEBLOAT,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'Edge Debloat',
    hint: 'Remove Edge integrations',
    tooltip: `**Edge Debloat** — clean up Edge hooks

- Disables Edge sidebar, shopping features
- Removes Copilot button
- Stops Edge from hijacking searches

✓ Keeps Edge functional but quieter
✓ Only if you use Edge as browser`,
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.COPILOT_DISABLE,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'Disable Copilot',
    hint: 'Remove AI assistant',
    tooltip: `**Disable Copilot** — remove Windows AI

- Disables Windows Copilot feature
- Removes taskbar button
- Stops background AI processes

✓ Privacy improvement
✓ Frees RAM and network`,
    defaultChecked: true,
  },
  {
    key: OPTIMIZATION_KEYS.RAZER_BLOCK,
    tier: OPTIMIZATION_TIERS.SAFE,
    category: 'privacy',
    label: 'Block Razer Services',
    hint: 'Stop Synapse bloat',
    tooltip: `**Block Razer Services** — tame Synapse

- Disables unnecessary Razer services
- Stops analytics and telemetry
- Keeps core device functionality

✓ Only if you have Razer devices
✓ Synapse still works for lighting/macros`,
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
    tooltip: `**Audio Enhancements Off** — pure audio

- Disables Windows audio enhancements
- No virtual surround processing
- Reduces audio latency

✓ Cleaner audio for external DACs
✓ Better for competitive gaming`,
    defaultChecked: true,
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
    tooltip: `**MSI Mode** — Message Signaled Interrupts

- Enables MSI for GPU and network adapters
- Reduces DPC latency by ~50μs
- Better interrupt handling

⚠ Test for stability — some hardware has issues
⚠ Check with LatencyMon after enabling`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.HPET,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'HPET Off',
    hint: 'Alternative timer source',
    tooltip: `**HPET Off** — disable High Precision Event Timer

- Uses TSC (CPU timer) instead of HPET
- Can improve frame times on some systems
- May cause issues on others

⚠ Benchmark before and after
⚠ Requires reboot to take effect`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.GAME_BAR,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'display',
    label: 'Game Bar Off',
    hint: 'Fully disable Xbox overlay',
    tooltip: `**Game Bar Off** — complete removal

- Fully disables Xbox Game Bar
- Removes overlay completely
- Frees more resources than Game DVR alone

⚠ Breaks X3D V-Cache optimizer on AMD
⚠ Keep enabled if you have 7800X3D/7950X3D/9800X3D`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.HAGS,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'display',
    label: 'HAGS On',
    hint: 'Hardware accelerated GPU scheduling',
    tooltip: `**HAGS On** — GPU scheduling optimization

- Lets GPU manage its own memory
- Can reduce latency in newer games
- Mixed results depending on GPU/game

⚠ Test in your specific games
⚠ Some older games run worse`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.FSO_DISABLE,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'display',
    label: 'Fullscreen Optimizations Off',
    hint: 'Legacy fullscreen mode',
    tooltip: `**Fullscreen Optimizations Off** — true exclusive fullscreen

- Disables borderless fullscreen wrapper
- May reduce input latency
- Can cause alt-tab issues

⚠ Per-game setting may be better
⚠ Some games need this, others don't`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.ULTIMATE_PERF,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'power',
    label: 'Ultimate Performance',
    hint: 'Maximum power, no throttling',
    tooltip: `**Ultimate Performance** — power plan

- Enables hidden Ultimate Performance plan
- Disables all power saving features
- Maximum performance at all times

⚠ Higher power consumption
⚠ May reduce AMD X3D efficiency`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.SERVICES_TRIM,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Trim Services',
    hint: 'Disable unused Windows services',
    tooltip: `**Trim Services** — disable bloat services

- Disables Print Spooler, Fax, Xbox services
- Reduces background processes
- Frees RAM and CPU cycles

⚠ May break features you use
⚠ Review service list before enabling`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.DISK_CLEANUP,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Deep Disk Cleanup',
    hint: 'Clear Windows Update cache',
    tooltip: `**Deep Disk Cleanup** — thorough cleaning

- Clears Windows Update download cache
- Removes old Windows installations
- Deletes delivery optimization files

⚠ Cannot roll back Windows updates after
⚠ May need to re-download updates`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.WPBT_DISABLE,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'WPBT Disable',
    hint: 'Block BIOS software injection',
    tooltip: `**WPBT Disable** — block vendor bloatware

- Prevents BIOS from injecting software
- Stops OEM tools from auto-installing
- Registry-based block

⚠ May affect some BIOS features
⚠ Test after motherboard updates`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.QOS_GAMING,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'network',
    label: 'QoS Gaming',
    hint: 'Prioritize game traffic',
    tooltip: `**QoS Gaming** — network priority

- Sets game traffic to high priority
- Deprioritizes background downloads
- Uses Windows QoS policy

⚠ May not work with all routers
⚠ Test in multiplayer games`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.NETWORK_THROTTLING,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'network',
    label: 'Network Throttling Off',
    hint: 'Disable media streaming throttle',
    tooltip: `**Network Throttling Off** — full speed networking

- Disables multimedia throttling
- Network always at full speed
- May improve download speeds

⚠ Can increase CPU usage
⚠ Minimal impact in most cases`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.INTERRUPT_AFFINITY,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Interrupt Affinity',
    hint: 'Pin interrupts to CPU cores',
    tooltip: `**Interrupt Affinity** — CPU core assignment

- Assigns GPU/network interrupts to specific cores
- Reduces core switching overhead
- Better DPC latency on many-core CPUs

⚠ Optimal settings are hardware-specific
⚠ Use MSI Utility Tool to verify`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.PROCESS_MITIGATION,
    tier: OPTIMIZATION_TIERS.CAUTION,
    category: 'system',
    label: 'Process Mitigations',
    hint: 'Disable exploit protections',
    tooltip: `**Process Mitigations** — security vs performance

- Disables CFG, CET, and other mitigations
- Can improve performance 1-5%
- Reduces security protections

⚠ Security trade-off
⚠ Only for offline/trusted games`,
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
    tooltip: `**Privacy Tier 1** — basic telemetry block

- Disables advertising ID
- Blocks activity history upload
- Removes Start menu suggestions

⚠ Some personalization features lost
⚠ Affects Microsoft account features`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.PRIVACY_TIER2,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'privacy',
    label: 'Privacy Tier 2',
    hint: 'Disable diagnostic data',
    tooltip: `**Privacy Tier 2** — extended privacy

- Sets telemetry to Security level (minimum)
- Disables typing/inking data collection
- Blocks feedback prompts

⚠ Some troubleshooting features affected
⚠ May impact Windows Insider access`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.PRIVACY_TIER3,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'privacy',
    label: 'Privacy Tier 3',
    hint: 'Maximum telemetry blocking',
    tooltip: `**Privacy Tier 3** — aggressive blocking

- Disables Connected User Experience service
- Blocks telemetry hosts in firewall
- Stops most data transmission

⚠ May break Microsoft Store updates
⚠ Some apps may not work correctly`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.BLOATWARE,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'system',
    label: 'Remove Bloatware',
    hint: 'Uninstall preinstalled apps',
    tooltip: `**Remove Bloatware** — clean slate

- Removes Candy Crush, Spotify, TikTok, etc.
- Uninstalls Xbox apps (if not needed)
- Clears pinned Start menu items

⚠ Some apps cannot be reinstalled easily
⚠ May affect Microsoft Store functionality`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.IPV4_PREFER,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'network',
    label: 'Prefer IPv4',
    hint: 'Disable IPv6 priority',
    tooltip: `**Prefer IPv4** — legacy networking

- Sets IPv4 as preferred protocol
- May reduce DNS lookup time
- Fixes some game connection issues

⚠ Can break IPv6-only services
⚠ Some ISPs require IPv6`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.TEREDO_DISABLE,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'network',
    label: 'Teredo Off',
    hint: 'Disable IPv6 tunnel',
    tooltip: `**Teredo Off** — remove IPv6 tunnel

- Disables Teredo IPv6 tunneling
- Reduces network overhead
- May improve NAT traversal

⚠ Breaks Xbox Party Chat on some networks
⚠ May affect some P2P games`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.NATIVE_NVME,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'system',
    label: 'Native NVMe',
    hint: 'Disable storage stacks',
    tooltip: `**Native NVMe** — bypass storage layers

- Uses NVMe driver directly
- Bypasses StorPort/AHCI layers
- May reduce storage latency

⚠ Only for NVMe drives
⚠ Verify with benchmarks`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.SMT_DISABLE,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'system',
    label: 'SMT/HT Off',
    hint: 'Disable hyperthreading',
    tooltip: `**SMT/HT Off** — disable hyperthreading

- Disables simultaneous multithreading
- Can improve single-thread performance
- Better cache utilization per core

⚠ Significantly reduces multitasking
⚠ Streaming while gaming affected`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.AUDIO_EXCLUSIVE,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'audio',
    label: 'Audio Exclusive Mode',
    hint: 'Game takes over audio',
    tooltip: `**Audio Exclusive Mode** — WASAPI exclusive

- Allows games to bypass Windows mixer
- Lowest possible audio latency
- Blocks other app audio

⚠ Discord/music won't play during games
⚠ Only for competitive single-focus`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.TCP_OPTIMIZER,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'network',
    label: 'TCP Optimizer',
    hint: 'Aggressive TCP tuning',
    tooltip: `**TCP Optimizer** — network stack tuning

- Adjusts TCP window size
- Disables auto-tuning
- Sets custom buffer sizes

⚠ May hurt performance on some connections
⚠ Benchmark with different settings`,
    defaultChecked: false,
  },
  {
    key: OPTIMIZATION_KEYS.CORE_ISOLATION_OFF,
    tier: OPTIMIZATION_TIERS.RISKY,
    category: 'system',
    label: 'Core Isolation Off',
    hint: 'Disable VBS/HVCI',
    tooltip: `**Core Isolation Off** — disable virtualization security

- Disables Memory Integrity (HVCI)
- Turns off Credential Guard
- 5-10% performance gain in some cases

⚠ Reduces security significantly
⚠ May be required for some anti-cheat`,
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
] as const

/** Get optimizations by tier */
export function getOptimizationsByTier(tier: OptimizationTier): OptimizationDef[] {
  return OPTIMIZATIONS.filter((opt) => opt.tier === tier)
}

/** Get optimizations by category */
export function getOptimizationsByCategory(category: OptimizationCategory): OptimizationDef[] {
  return OPTIMIZATIONS.filter((opt) => opt.category === category)
}

/** Get optimizations by tier and category */
export function getOptimizationsByTierAndCategory(
  tier: OptimizationTier,
  category: OptimizationCategory,
): OptimizationDef[] {
  return OPTIMIZATIONS.filter((opt) => opt.tier === tier && opt.category === category)
}

/** Get all unique categories */
export function getCategories(): OptimizationCategory[] {
  return [...new Set(OPTIMIZATIONS.map((opt) => opt.category))]
}

/** Get categories for a specific tier */
export function getCategoriesForTier(tier: OptimizationTier): OptimizationCategory[] {
  return [...new Set(OPTIMIZATIONS.filter((opt) => opt.tier === tier).map((opt) => opt.category))]
}

/** Find optimization by key */
export function findOptimization(key: OptimizationKey): OptimizationDef | undefined {
  return OPTIMIZATIONS.find((opt) => opt.key === key)
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

const PROFILE_ID_VALUES: readonly string[] = PROFILE_IDS

export function isProfileId(value: unknown): value is ProfileId {
  return typeof value === 'string' && PROFILE_ID_VALUES.includes(value)
}

/**
 * Profile → Optimization matrix
 * Defines which optimizations are enabled by default for each profile.
 * minimal_default is the internal baseline (not a visible preset).
 */
export const PROFILE_OPTIMIZATIONS: Record<ProfileId, readonly OptimizationKey[]> = {
  // Internal baseline - safe essentials only
  minimal_default: [
    'pagefile',
    'fastboot',
    'restore_point',
    'power_plan',
    'usb_power',
    'pcie_power',
    'audio_enhancements',
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
    'timer', // Safe, significant FPS benefit
    'end_task', // QoL, no downside
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
    'msi_mode',
    'fso_disable',
    'ultimate_perf',
    'services_trim',
    'wpbt_disable',
    'qos_gaming',
    'network_throttling',
    'interrupt_affinity',
    'keyboard_response', // Essential for competitive
    'end_task', // QoL, no downside
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
    'display_perf',
    'multiplane_overlay',
    'gamedvr',
    'background_apps',
    'edge_debloat',
    'copilot_disable',
    'audio_enhancements',
    // Caution tier
    'msi_mode',
    'hpet',
    'hags',
    'fso_disable',
    'ultimate_perf',
    'services_trim',
    'disk_cleanup',
    'wpbt_disable',
    'qos_gaming',
    'network_throttling',
    'interrupt_affinity',
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

/** Gate definitions for confirmation dialogs */
export const OPTIMIZATION_GATES = {
  /** Optimizations requiring double confirmation before applying */
  doubleConfirm: new Set<OptimizationKey>([
    'msi_mode',
    'hpet',
    'hags',
    'fso_disable',
    'ultimate_perf',
    'services_trim',
    'disk_cleanup',
    'wpbt_disable',
    'qos_gaming',
    'network_throttling',
    'interrupt_affinity',
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
  ]),

  /** Optimizations requiring manual opt-in (never auto-selected) */
  manualOptIn: new Set<OptimizationKey>(['process_mitigation', 'core_isolation_off']),

  /** UI phrase for acceptance */
  acceptPhrase: 'I ACCEPT THE RISK',
} as const

/** Get optimizations for a profile */
export function getOptimizationsForProfile(profile: ProfileId): readonly OptimizationKey[] {
  return PROFILE_OPTIMIZATIONS[profile] ?? []
}

/** Check if optimization requires double confirmation */
export function requiresDoubleConfirm(key: OptimizationKey): boolean {
  return OPTIMIZATION_GATES.doubleConfirm.has(key)
}

/** Check if optimization is manual opt-in only */
export function isManualOptInOnly(key: OptimizationKey): boolean {
  return OPTIMIZATION_GATES.manualOptIn.has(key)
}
