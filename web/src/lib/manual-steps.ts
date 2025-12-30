/**
 * Manual Steps Guide - Persona-aware checklist data
 *
 * This module contains manual steps that cannot be scripted but
 * are essential for optimal gaming performance.
 */

import type { PresetType, GpuType } from "./types";
import { GPU_TYPES } from "./types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ManualStepItem {
  readonly step: string;
  readonly check: string;
  readonly why: string;
}

export interface SettingItem {
  readonly setting: string;
  readonly value: string;
  readonly why: string;
}

export interface SoftwareSettingItem {
  readonly path: string;
  readonly value: string;
  readonly why: string;
}

export interface BrowserSettingItem {
  readonly browser: string;
  readonly path: string;
  readonly setting: string;
  readonly value: string;
  readonly why: string;
}

export interface RgbSettingItem {
  readonly software: string;
  readonly action: string;
  readonly why: string;
}

export interface PreflightCheck {
  readonly check: string;
  readonly how: string;
  readonly fail: string;
}

export interface VideoResource {
  readonly id: string;
  readonly title: string;
  readonly creator: string;
  readonly videoId: string; // YouTube video ID
  readonly description?: string;
}

export interface ManualStepSection {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly location?: string;
  readonly note?: string;
  readonly personas?: readonly PresetType[];
  readonly hardware?: GpuType;
  readonly items:
    | readonly ManualStepItem[]
    | readonly SettingItem[]
    | readonly SoftwareSettingItem[]
    | readonly BrowserSettingItem[]
    | readonly RgbSettingItem[]
    | readonly PreflightCheck[];
}

// -----------------------------------------------------------------------------
// Windows Display Settings
// -----------------------------------------------------------------------------

export const WINDOWS_DISPLAY_ALL: ManualStepSection = {
  id: "windows-display",
  title: "Windows Display Settings",
  description: "Classic mistakes that cost people frames without them knowing",
  items: [
    {
      step: "Settings > Display > Advanced display > Refresh rate",
      check: "Set to your monitor's max (144Hz, 165Hz, 240Hz, etc.)",
      why: "The #1 classic mistake. People buy 144Hz monitors and run at 60Hz for months.",
    },
    {
      step: "Settings > Display > Graphics > Default graphics settings",
      check: "Hardware-accelerated GPU scheduling: ON",
      why: "Modern GPUs benefit; can reduce latency 1-2ms.",
    },
    {
      step: "Settings > Display > Graphics > Default graphics settings",
      check: "Variable refresh rate: ON",
      why: "Enables VRR for windowed games (G-Sync/FreeSync).",
    },
    {
      step: "Settings > System > Display > HDR",
      check: "Only enable if monitor supports it AND you've calibrated",
      why: "Bad HDR is worse than no HDR. Washed out colors = misconfigured.",
    },
    {
      step: "Right-click desktop > Display settings > Scale",
      check: "100% recommended for gaming, 125% max",
      why: "Higher scaling can cause input lag in some games.",
    },
  ] as const,
} as const;

export const WINDOWS_DISPLAY_PRO: ManualStepSection = {
  id: "windows-display-pro",
  title: "Windows Display (Pro)",
  description: "Additional display settings for competitive players",
  personas: ["pro_gamer"],
  items: [
    {
      step: "Settings > Display > Graphics",
      check: "Add your games and set to 'High performance'",
      why: "Forces discrete GPU, prevents iGPU mishaps on laptops.",
    },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// NVIDIA Control Panel Settings
// -----------------------------------------------------------------------------

export const NVIDIA_GAMER: ManualStepSection = {
  id: "nvidia-gamer",
  title: "NVIDIA Control Panel",
  description: "Right-click desktop > NVIDIA Control Panel",
  hardware: GPU_TYPES.NVIDIA,
  personas: ["gamer"],
  items: [
    { setting: "Low Latency Mode", value: "On", why: "Reduces render queue without aggressive CPU overhead." },
    { setting: "Power Management Mode", value: "Prefer Maximum Performance", why: "Prevents GPU downclocking mid-game." },
    { setting: "Texture Filtering Quality", value: "Quality", why: "Balanced visuals, no real performance hit." },
    { setting: "Threaded Optimization", value: "Auto", why: "Let driver decide per-game." },
    { setting: "Vertical Sync", value: "Off", why: "Use in-game VSync or cap with RTSS instead." },
    { setting: "G-SYNC", value: "Enable for fullscreen and windowed", why: "VRR everywhere = smoother experience." },
    { setting: "Max Frame Rate", value: "3 below monitor refresh (e.g., 141 for 144Hz)", why: "Keeps you in VRR range, prevents tearing at cap." },
  ] as const,
} as const;

export const NVIDIA_PRO_GAMER: ManualStepSection = {
  id: "nvidia-pro-gamer",
  title: "NVIDIA Control Panel",
  description: "Right-click desktop > NVIDIA Control Panel",
  hardware: GPU_TYPES.NVIDIA,
  personas: ["pro_gamer"],
  note: "Pro Gamers: Consider NVIDIA Reflex in supported games (ON+Boost) - better than driver-level Ultra.",
  items: [
    { setting: "Low Latency Mode", value: "Ultra", why: "Minimum render queue. CPU waits for GPU. Lowest latency." },
    { setting: "Power Management Mode", value: "Prefer Maximum Performance", why: "No downclocking, ever." },
    { setting: "Texture Filtering Quality", value: "High Performance", why: "Frames > fidelity for competitive." },
    { setting: "Threaded Optimization", value: "On", why: "Force multi-threaded driver for consistent frametimes." },
    { setting: "Vertical Sync", value: "Off", why: "VSync = input lag. Use Reflex or uncapped." },
    { setting: "G-SYNC", value: "Enable for fullscreen only", why: "Fullscreen exclusive = lowest latency path." },
    { setting: "Max Frame Rate", value: "Off or use RTSS", why: "RTSS frame limiter has less latency than driver." },
    { setting: "Shader Cache Size", value: "Unlimited", why: "Reduces stutter from shader compilation." },
    { setting: "Prefer maximum performance (per-game)", value: "Add competitive games", why: "Override any eco-mode settings." },
  ] as const,
} as const;

export const NVIDIA_STREAMER: ManualStepSection = {
  id: "nvidia-streamer",
  title: "NVIDIA Control Panel",
  description: "Right-click desktop > NVIDIA Control Panel",
  hardware: GPU_TYPES.NVIDIA,
  personas: ["streamer"],
  note: "Streamers: Don't use Ultra latency mode - it can cause dropped frames in OBS.",
  items: [
    { setting: "Low Latency Mode", value: "On", why: "Ultra can cause frame drops during encoding." },
    { setting: "Power Management Mode", value: "Prefer Maximum Performance", why: "Encoding needs consistent GPU power." },
    { setting: "Vertical Sync", value: "Off or Fast", why: "Fast Sync can help with capture smoothness." },
    { setting: "G-SYNC", value: "Enable for fullscreen and windowed", why: "Windowed games capture better with VRR." },
    { setting: "CUDA - GPUs", value: "All", why: "OBS NVENC needs CUDA access." },
  ] as const,
} as const;

export const NVIDIA_BENCHMARKER: ManualStepSection = {
  id: "nvidia-benchmarker",
  title: "NVIDIA Control Panel",
  description: "Right-click desktop > NVIDIA Control Panel",
  hardware: GPU_TYPES.NVIDIA,
  personas: ["benchmarker"],
  note: "Benchmarkers: Run 3+ passes, discard first run (shader compilation), average the rest.",
  items: [
    { setting: "Low Latency Mode", value: "Off for benchmarks, Ultra for latency tests", why: "Off = consistent frametimes for comparisons." },
    { setting: "Power Management Mode", value: "Prefer Maximum Performance", why: "Consistent power state for repeatable runs." },
    { setting: "Vertical Sync", value: "Off", why: "Uncapped for max FPS benchmarks." },
    { setting: "G-SYNC", value: "Off during benchmarks", why: "VRR can skew frametime graphs." },
    { setting: "Max Frame Rate", value: "Off", why: "Let it rip for benchmark scores." },
    { setting: "Shader Cache", value: "Clear before each run", why: "C:\\Users\\[you]\\AppData\\Local\\NVIDIA\\DXCache" },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// AMD Adrenalin Settings
// -----------------------------------------------------------------------------

export const AMD_GAMER: ManualStepSection = {
  id: "amd-gamer",
  title: "AMD Adrenalin Settings",
  description: "Right-click desktop > AMD Software: Adrenalin Edition",
  hardware: GPU_TYPES.AMD,
  personas: ["gamer"],
  items: [
    { setting: "Anti-Lag", value: "Enabled", why: "AMD's answer to Reflex. Reduces input latency." },
    { setting: "Radeon Boost", value: "Enabled", why: "Dynamic resolution during fast motion. Barely noticeable, good FPS gain." },
    { setting: "Enhanced Sync", value: "Off", why: "Can cause stuttering. Use FreeSync instead." },
    { setting: "FreeSync", value: "Enabled", why: "VRR for tear-free gaming." },
    { setting: "Wait for Vertical Refresh", value: "Off, unless application specifies", why: "Let games control VSync." },
    { setting: "Frame Rate Target Control", value: "3 below refresh (e.g., 141)", why: "Stay in FreeSync range." },
  ] as const,
} as const;

export const AMD_PRO_GAMER: ManualStepSection = {
  id: "amd-pro-gamer",
  title: "AMD Adrenalin Settings",
  description: "Right-click desktop > AMD Software: Adrenalin Edition",
  hardware: GPU_TYPES.AMD,
  personas: ["pro_gamer"],
  items: [
    { setting: "Anti-Lag", value: "Enabled (Anti-Lag+ if supported)", why: "Anti-Lag+ is driver-level Reflex equivalent." },
    { setting: "Radeon Boost", value: "Disabled", why: "Competitive players want consistent resolution." },
    { setting: "Enhanced Sync", value: "Off", why: "Any sync = latency." },
    { setting: "FreeSync", value: "Enabled", why: "Still helps with tearing without VSync latency." },
    { setting: "Radeon Chill", value: "Off", why: "Frame rate limiting = bad for competitive." },
    { setting: "Image Sharpening", value: "Off or minimal", why: "Processing overhead." },
  ] as const,
} as const;

export const AMD_STREAMER: ManualStepSection = {
  id: "amd-streamer",
  title: "AMD Adrenalin Settings",
  description: "Right-click desktop > AMD Software: Adrenalin Edition",
  hardware: GPU_TYPES.AMD,
  personas: ["streamer"],
  items: [
    { setting: "Anti-Lag", value: "Enabled", why: "Helps without hurting capture." },
    { setting: "Radeon Boost", value: "Off", why: "Resolution changes look bad on stream." },
    { setting: "FreeSync", value: "Enabled", why: "Smooth frames = smooth stream." },
    { setting: "Record & Stream (ReLive)", value: "Configure if using AMD encoder", why: "Alternative to OBS NVENC." },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// BIOS Settings
// -----------------------------------------------------------------------------

export const BIOS_ALL: ManualStepSection = {
  id: "bios-all",
  title: "BIOS Settings",
  description: "Restart > DEL/F2 during POST > Enter BIOS",
  items: [
    { setting: "XMP / EXPO / DOCP", value: "Enabled", why: "RAM runs at advertised speed instead of JEDEC (2133MHz). Free performance." },
    { setting: "Resizable BAR / Smart Access Memory", value: "Enabled", why: "GPU can access full VRAM. 5-10% in some games." },
    { setting: "CSM (Compatibility Support Module)", value: "Disabled", why: "Use UEFI boot. CSM is legacy." },
    { setting: "Above 4G Decoding", value: "Enabled", why: "Required for Resizable BAR." },
  ] as const,
} as const;

export const BIOS_AMD_X3D: ManualStepSection = {
  id: "bios-amd-x3d",
  title: "AMD X3D CPU Settings",
  description: "For 7800X3D, 9800X3D, and similar V-Cache CPUs",
  note: "X3D users: Game Mode in Windows + Game Bar enabled = V-Cache optimizer works. Don't disable Game Bar!",
  items: [
    { setting: "CPPC (Collaborative Processor Performance Control)", value: "Enabled / Auto", why: "REQUIRED for Windows to use V-Cache optimizer. DO NOT disable." },
    { setting: "CPPC Preferred Cores", value: "Enabled / Auto", why: "Lets Windows know which cores have V-Cache." },
    { setting: "PBO (Precision Boost Overdrive)", value: "Auto or Enabled", why: "Safe on X3D. Don't use Curve Optimizer aggressively." },
    { setting: "Core Performance Boost", value: "Enabled", why: "Allows boost clocks." },
  ] as const,
} as const;

export const BIOS_INTEL: ManualStepSection = {
  id: "bios-intel",
  title: "Intel CPU Settings",
  items: [
    { setting: "C-States", value: "Enabled for daily use, Disabled for benchmarking", why: "C-States save power but add wake latency." },
    { setting: "Speed Shift / HWP", value: "Enabled", why: "Modern Intel frequency scaling. Better than legacy SpeedStep." },
    { setting: "Turbo Boost", value: "Enabled", why: "Higher clocks when thermal headroom exists." },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// Software Settings - Discord
// -----------------------------------------------------------------------------

export const DISCORD_GAMER: ManualStepSection = {
  id: "discord-gamer",
  title: "Discord",
  location: "Settings (gear icon)",
  personas: ["gamer"],
  items: [
    { path: "App Settings > Advanced > Hardware Acceleration", value: "On (usually fine)", why: "Offloads to GPU. Disable only if you see issues." },
    { path: "App Settings > Game Overlay", value: "On if you want it", why: "Casual use, fine to keep." },
    { path: "App Settings > Streamer Mode", value: "Off", why: "Only needed when streaming." },
  ] as const,
} as const;

export const DISCORD_PRO_GAMER: ManualStepSection = {
  id: "discord-pro-gamer",
  title: "Discord",
  location: "Settings (gear icon)",
  personas: ["pro_gamer"],
  note: "Pro tip: Run Discord in browser during matches = no background processes.",
  items: [
    { path: "App Settings > Advanced > Hardware Acceleration", value: "Off", why: "Can cause micro-stutters in competitive games. CPU handles it fine." },
    { path: "App Settings > Game Overlay", value: "Off", why: "Any overlay = potential frame drop. Disable everything." },
    { path: "App Settings > Activity Status", value: "Off", why: "Less background activity." },
    { path: "Voice & Video > Echo Cancellation", value: "Off if good mic", why: "Processing overhead." },
    { path: "Voice & Video > Noise Suppression", value: "Off or Krisp", why: "Standard mode uses more CPU." },
    { path: "Voice & Video > Automatic Gain Control", value: "Off", why: "Consistent mic levels, less processing." },
  ] as const,
} as const;

export const DISCORD_STREAMER: ManualStepSection = {
  id: "discord-streamer",
  title: "Discord",
  location: "Settings (gear icon)",
  personas: ["streamer"],
  items: [
    { path: "App Settings > Advanced > Hardware Acceleration", value: "On", why: "GPU handles Discord, CPU focuses on encoding." },
    { path: "App Settings > Game Overlay", value: "On for chat", why: "Read chat during gameplay." },
    { path: "App Settings > Streamer Mode", value: "On when live", why: "Hides sensitive info automatically." },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// Software Settings - Steam
// -----------------------------------------------------------------------------

export const STEAM_GAMER: ManualStepSection = {
  id: "steam-gamer",
  title: "Steam",
  location: "Steam > Settings",
  personas: ["gamer"],
  items: [
    { path: "In-Game > Steam Overlay", value: "On", why: "Useful for guides, chat, browser." },
    { path: "In-Game > FPS counter", value: "Optional", why: "Built-in, low overhead." },
    { path: "Downloads > Allow downloads during gameplay", value: "Off", why: "Background downloads cause stutters." },
    { path: "Interface > GPU accelerated rendering", value: "On", why: "Smoother Steam UI." },
  ] as const,
} as const;

export const STEAM_PRO_GAMER: ManualStepSection = {
  id: "steam-pro-gamer",
  title: "Steam",
  location: "Steam > Settings",
  personas: ["pro_gamer"],
  note: "Launch options for competitive games: -novid -high -threads X (check per-game)",
  items: [
    { path: "In-Game > Steam Overlay", value: "Off", why: "Any overlay = potential stutter." },
    { path: "In-Game > FPS counter", value: "Off (use RTSS)", why: "RTSS is more accurate and configurable." },
    { path: "Downloads > Allow downloads during gameplay", value: "Off", why: "Zero background network." },
    { path: "Library > Low Bandwidth Mode", value: "On", why: "Less network chatter." },
    { path: "Interface > Notify me about...", value: "Off", why: "No popups during matches." },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// Software Settings - Browsers
// -----------------------------------------------------------------------------

export const BROWSERS_ALL: ManualStepSection = {
  id: "browsers-all",
  title: "Browser Settings",
  description: "Browsers eat resources even when 'closed'",
  note: "Best practice: Close browsers before gaming. Use a lightweight browser (Brave) or mobile for Discord/Twitch.",
  items: [
    { browser: "Chrome/Edge", path: "Settings > System", setting: "Continue running background apps when closed", value: "Off", why: "Chrome stays in RAM otherwise." },
    { browser: "Chrome/Edge", path: "Settings > System", setting: "Use hardware acceleration", value: "Off when gaming", why: "Can conflict with game GPU usage." },
    { browser: "Edge", path: "Settings > System", setting: "Startup boost", value: "Off", why: "Edge preloads at Windows startup. Wasteful." },
    { browser: "Edge", path: "Settings > System", setting: "Continue running background extensions", value: "Off", why: "Extensions run even after close." },
    { browser: "Firefox", path: "Settings > General > Performance", setting: "Use hardware acceleration", value: "Off when gaming", why: "Same GPU conflict issue." },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// Software Settings - RGB
// -----------------------------------------------------------------------------

export const RGB_PRO_GAMER: ManualStepSection = {
  id: "rgb-pro-gamer",
  title: "RGB Software",
  description: "Pretty lights, ugly overhead",
  personas: ["pro_gamer"],
  note: "Store RGB profiles in hardware memory when possible. Then close the software.",
  items: [
    { software: "iCUE (Corsair)", action: "Close before competitive matches", why: "Polling rate overhead on USB bus." },
    { software: "Synapse (Razer)", action: "Close or use Hardware Mode", why: "Save profiles to device, run software-free." },
    { software: "Armoury Crate (ASUS)", action: "Uninstall or disable services", why: "Notorious for background bloat." },
    { software: "G Hub (Logitech)", action: "Set profiles, then exit", why: "Onboard memory mode if available." },
  ] as const,
} as const;

export const RGB_GAMER: ManualStepSection = {
  id: "rgb-gamer",
  title: "RGB Software",
  description: "Pretty lights, ugly overhead",
  personas: ["gamer"],
  items: [
    { software: "All RGB software", action: "Keep if you want, it's fine", why: "Minimal impact for casual play." },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// Pre-Flight Checklist
// -----------------------------------------------------------------------------

export const PREFLIGHT_ALL: ManualStepSection = {
  id: "preflight-all",
  title: "Pre-Flight Checklist",
  description: "Quick sanity checks before a gaming session",
  items: [
    { check: "Monitor running at native refresh rate?", how: "Settings > Display > Advanced > Refresh rate", fail: "Stuck at 60Hz = wasted hardware" },
    { check: "G-Sync/FreeSync indicator showing?", how: "Enable OSD in NVIDIA/AMD panel, look for VRR indicator", fail: "VRR not active = tearing or latency" },
    { check: "Game running on discrete GPU (laptops)?", how: "Task Manager > GPU column, should show GPU 1", fail: "Using integrated GPU = terrible FPS" },
    { check: "No background downloads?", how: "Check Steam, Windows Update, game launchers", fail: "Downloads cause network and disk stutters" },
    { check: "Power plan correct?", how: "powercfg /getactivescheme in terminal", fail: "Balanced/Power Saver = throttled performance" },
    { check: "Timer tool running? (if enabled)", how: "Check system tray for timer-tool.ps1", fail: "Default 15.6ms timer = micro-stutters" },
    { check: "Unnecessary apps closed?", how: "Check system tray, Task Manager", fail: "Background apps steal frames" },
    { check: "Drivers up to date?", how: "GeForce Experience / AMD Software / Windows Update", fail: "Old drivers = bugs, missing optimizations" },
  ] as const,
} as const;

export const PREFLIGHT_PRO: ManualStepSection = {
  id: "preflight-pro",
  title: "Pre-Flight (Pro)",
  description: "Extra checks for competitive players",
  personas: ["pro_gamer"],
  items: [
    { check: "Discord hardware acceleration off?", how: "Discord Settings > Advanced", fail: "Can cause stutters in competitive" },
    { check: "Steam overlay disabled for this game?", how: "Right-click game > Properties > In-Game", fail: "Overlay can drop frames" },
    { check: "Fullscreen exclusive (not borderless)?", how: "In-game display settings", fail: "Borderless adds 1+ frame of latency" },
    { check: "NVIDIA Reflex ON+Boost (if available)?", how: "In-game settings", fail: "Missing free latency reduction" },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// Troubleshooting - Hard-to-diagnose issues
// -----------------------------------------------------------------------------

export const TROUBLESHOOTING_WIFI_BLUETOOTH: ManualStepSection = {
  id: "troubleshooting-wifi-bt",
  title: "Wireless/Bluetooth Stutter Fix",
  description: "Onboard WiFi/Bluetooth adapters can cause mouse-move stutters that don't appear in synthetic benchmarks",
  note: "This is a known issue where I/O from onboard wireless adapters causes GPU power to drop to ~20% during mouse movement, causing micro-stutters. Synthetic benchmarks won't show this because they have no I/O!",
  items: [
    {
      step: "Test: Move mouse during gameplay",
      check: "Watch GPU power/usage in overlay - does it drop when moving mouse?",
      why: "If GPU usage drops significantly when moving the mouse, onboard wireless adapters may be the culprit.",
    },
    {
      step: "Best Fix: Disable in BIOS (if you can)",
      check: "BIOS > Onboard Devices > Disable WiFi/Bluetooth",
      why: "Complete fix. Only do this if you don't need onboard wireless or have alternatives.",
    },
    {
      step: "Alternative: Install official motherboard drivers",
      check: "Download from your motherboard manufacturer's support page (not Windows Update)",
      why: "May fix or reduce the issue. Generic Windows drivers are often the problem.",
    },
    {
      step: "Workaround: Use separate adapters",
      check: "Disable onboard in BIOS, use PCIe WiFi card or USB Bluetooth dongle",
      why: "Dedicated adapters don't share the same I/O path as onboard chips.",
    },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// Section Groups for UI
// -----------------------------------------------------------------------------

export type SectionCategory =
  | "windows"
  | "gpu"
  | "bios"
  | "software"
  | "preflight"
  | "troubleshooting";

export interface SectionGroup {
  readonly id: SectionCategory;
  readonly title: string;
  readonly icon: string;
  readonly sections: readonly ManualStepSection[];
  readonly videos?: readonly VideoResource[];
}

// -----------------------------------------------------------------------------
// Video Resources
// -----------------------------------------------------------------------------

export const VIDEOS = {
  INTEL_SETTINGS: {
    id: "intel-settings",
    title: "Intel CPU Settings You NEED to Change",
    creator: "JayzTwoCents",
    videoId: "B3EW5lRIZYc",
    description: "Essential BIOS and Windows settings for Intel CPUs",
  },
  POST_BUILD: {
    id: "post-build",
    title: "What to do AFTER Building Your PC",
    creator: "JayzTwoCents",
    videoId: "xhHtHMQygzE",
    description: "First steps after a fresh Windows install",
  },
  STUTTERING_FIXES: {
    id: "stuttering-fixes",
    title: "Fix Game Stuttering & Micro-Stutters",
    creator: "JayzTwoCents",
    videoId: "YWTZkB9rVU0",
    description: "Diagnose and fix stuttering issues including mouse-move stutters",
  },
} as const;

export const SECTION_GROUPS: readonly SectionGroup[] = [
  {
    id: "windows",
    title: "Windows Display",
    icon: "monitor",
    sections: [WINDOWS_DISPLAY_ALL, WINDOWS_DISPLAY_PRO],
    videos: [VIDEOS.POST_BUILD],
  },
  {
    id: "gpu",
    title: "GPU Settings",
    icon: "gpu",
    sections: [
      NVIDIA_GAMER,
      NVIDIA_PRO_GAMER,
      NVIDIA_STREAMER,
      NVIDIA_BENCHMARKER,
      AMD_GAMER,
      AMD_PRO_GAMER,
      AMD_STREAMER,
    ],
  },
  {
    id: "bios",
    title: "BIOS Settings",
    icon: "chip",
    sections: [BIOS_ALL, BIOS_AMD_X3D, BIOS_INTEL],
    videos: [VIDEOS.INTEL_SETTINGS],
  },
  {
    id: "software",
    title: "Software Settings",
    icon: "apps",
    sections: [
      DISCORD_GAMER,
      DISCORD_PRO_GAMER,
      DISCORD_STREAMER,
      STEAM_GAMER,
      STEAM_PRO_GAMER,
      BROWSERS_ALL,
      RGB_PRO_GAMER,
      RGB_GAMER,
    ],
  },
  {
    id: "preflight",
    title: "Pre-Flight Checklist",
    icon: "checklist",
    sections: [PREFLIGHT_ALL, PREFLIGHT_PRO],
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: "wrench",
    sections: [TROUBLESHOOTING_WIFI_BLUETOOTH],
    videos: [VIDEOS.STUTTERING_FIXES],
  },
] as const;

// -----------------------------------------------------------------------------
// Filter Functions
// -----------------------------------------------------------------------------

/**
 * Filter sections based on persona and GPU type
 * Intel GPUs don't have dedicated control panels, so GPU-specific sections are filtered out
 */
export function filterSections(
  sections: readonly ManualStepSection[],
  persona: PresetType,
  gpuType: GpuType
): ManualStepSection[] {
  return sections.filter((section) => {
    // Check hardware filter
    if (section.hardware) {
      // Intel integrated GPUs don't have control panels like NVIDIA/AMD
      if (gpuType === GPU_TYPES.INTEL) {
        return false;
      }
      if (section.hardware !== gpuType) {
        return false;
      }
    }

    // Check persona filter
    if (section.personas && !section.personas.includes(persona)) {
      return false;
    }

    return true;
  });
}

/**
 * Get filtered section groups for a specific persona and GPU
 */
export function getFilteredSectionGroups(
  persona: PresetType,
  gpuType: GpuType
): SectionGroup[] {
  return SECTION_GROUPS.map((group) => ({
    ...group,
    sections: filterSections(group.sections, persona, gpuType),
  })).filter((group) => group.sections.length > 0);
}

/**
 * Count total items across all filtered sections
 */
export function countTotalItems(
  persona: PresetType,
  gpuType: GpuType
): number {
  const groups = getFilteredSectionGroups(persona, gpuType);
  return groups.reduce(
    (total, group) =>
      total +
      group.sections.reduce(
        (sectionTotal, section) => sectionTotal + section.items.length,
        0
      ),
    0
  );
}
