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
  readonly id: string;
  readonly step: string;
  readonly check: string;
  readonly why: string;
}

export interface SettingItem {
  readonly id: string;
  readonly setting: string;
  readonly value: string;
  readonly why: string;
}

export interface SoftwareSettingItem {
  readonly id: string;
  readonly path: string;
  readonly value: string;
  readonly why: string;
}

export interface BrowserSettingItem {
  readonly id: string;
  readonly browser: string;
  readonly path: string;
  readonly setting: string;
  readonly value: string;
  readonly why: string;
}

export interface RgbSettingItem {
  readonly id: string;
  readonly software: string;
  readonly action: string;
  readonly why: string;
}

export interface PreflightCheck {
  readonly id: string;
  readonly check: string;
  readonly how: string;
  readonly fail: string;
}

export interface TroubleshootingItem {
  readonly id: string;
  readonly problem: string;
  readonly causes: readonly string[];
  readonly quickFix: string;
}

export interface GameLaunchItem {
  readonly id: string;
  readonly game: string;
  readonly platform: "Steam" | "Epic" | "Battle.net" | "Riot" | "Origin" | "EA App";
  readonly launchOptions?: string;
  readonly notes: readonly string[];
}

export interface StreamingTroubleshootItem {
  readonly id: string;
  readonly problem: string;
  readonly solution: string;
  readonly why: string;
}

export interface DiagnosticTool {
  readonly id: string;
  readonly tool: string;
  readonly use: string;
  readonly arsenalKey?: string;
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
    | readonly PreflightCheck[]
    | readonly TroubleshootingItem[]
    | readonly GameLaunchItem[]
    | readonly StreamingTroubleshootItem[]
    | readonly DiagnosticTool[];
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
      id: "refresh-rate",
      step: "Settings > Display > Advanced display > Refresh rate",
      check: "Set to your monitor's max (144Hz, 165Hz, 240Hz, etc.)",
      why: "The #1 classic mistake. People buy 144Hz monitors and run at 60Hz for months.",
    },
    {
      id: "gpu-scheduling",
      step: "Settings > Display > Graphics > Default graphics settings",
      check: "Hardware-accelerated GPU scheduling: ON",
      why: "Modern GPUs benefit; can reduce latency 1-2ms.",
    },
    {
      id: "vrr-enable",
      step: "Settings > Display > Graphics > Default graphics settings",
      check: "Variable refresh rate: ON",
      why: "Enables VRR for windowed games (G-Sync/FreeSync).",
    },
    {
      id: "hdr-setting",
      step: "Settings > System > Display > HDR",
      check: "Only enable if monitor supports it AND you've calibrated",
      why: "Bad HDR is worse than no HDR. Washed out colors = misconfigured.",
    },
    {
      id: "display-scale",
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
      id: "gpu-preference",
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
    { id: "nv-low-latency", setting: "Low Latency Mode", value: "On", why: "Reduces render queue without aggressive CPU overhead." },
    { id: "nv-power-mode", setting: "Power Management Mode", value: "Prefer Maximum Performance", why: "Prevents GPU downclocking mid-game." },
    { id: "nv-texture-quality", setting: "Texture Filtering Quality", value: "Quality", why: "Balanced visuals, no real performance hit." },
    { id: "nv-threaded-opt", setting: "Threaded Optimization", value: "Auto", why: "Let driver decide per-game." },
    { id: "nv-vsync", setting: "Vertical Sync", value: "Off", why: "Use in-game VSync or cap with RTSS instead." },
    { id: "nv-gsync", setting: "G-SYNC", value: "Enable for fullscreen and windowed", why: "VRR everywhere = smoother experience." },
    { id: "nv-max-fps", setting: "Max Frame Rate", value: "3 below monitor refresh (e.g., 141 for 144Hz)", why: "Keeps you in VRR range, prevents tearing at cap." },
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
    { id: "nv-pro-low-latency", setting: "Low Latency Mode", value: "Ultra", why: "Minimum render queue. CPU waits for GPU. Lowest latency." },
    { id: "nv-pro-power-mode", setting: "Power Management Mode", value: "Prefer Maximum Performance", why: "No downclocking, ever." },
    { id: "nv-pro-texture-quality", setting: "Texture Filtering Quality", value: "High Performance", why: "Frames > fidelity for competitive." },
    { id: "nv-pro-threaded-opt", setting: "Threaded Optimization", value: "On", why: "Force multi-threaded driver for consistent frametimes." },
    { id: "nv-pro-vsync", setting: "Vertical Sync", value: "Off", why: "VSync = input lag. Use Reflex or uncapped." },
    { id: "nv-pro-gsync", setting: "G-SYNC", value: "Enable for fullscreen only", why: "Fullscreen exclusive = lowest latency path." },
    { id: "nv-pro-max-fps", setting: "Max Frame Rate", value: "Off or use RTSS", why: "RTSS frame limiter has less latency than driver." },
    { id: "nv-pro-shader-cache", setting: "Shader Cache Size", value: "Unlimited", why: "Reduces stutter from shader compilation." },
    { id: "nv-pro-per-game", setting: "Prefer maximum performance (per-game)", value: "Add competitive games", why: "Override any eco-mode settings." },
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
    { id: "nv-stream-low-latency", setting: "Low Latency Mode", value: "On", why: "Ultra can cause frame drops during encoding." },
    { id: "nv-stream-power-mode", setting: "Power Management Mode", value: "Prefer Maximum Performance", why: "Encoding needs consistent GPU power." },
    { id: "nv-stream-vsync", setting: "Vertical Sync", value: "Off or Fast", why: "Fast Sync can help with capture smoothness." },
    { id: "nv-stream-gsync", setting: "G-SYNC", value: "Enable for fullscreen and windowed", why: "Windowed games capture better with VRR." },
    { id: "nv-stream-cuda", setting: "CUDA - GPUs", value: "All", why: "OBS NVENC needs CUDA access." },
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
    { id: "nv-bench-low-latency", setting: "Low Latency Mode", value: "Off for benchmarks, Ultra for latency tests", why: "Off = consistent frametimes for comparisons." },
    { id: "nv-bench-power-mode", setting: "Power Management Mode", value: "Prefer Maximum Performance", why: "Consistent power state for repeatable runs." },
    { id: "nv-bench-vsync", setting: "Vertical Sync", value: "Off", why: "Uncapped for max FPS benchmarks." },
    { id: "nv-bench-gsync", setting: "G-SYNC", value: "Off during benchmarks", why: "VRR can skew frametime graphs." },
    { id: "nv-bench-max-fps", setting: "Max Frame Rate", value: "Off", why: "Let it rip for benchmark scores." },
    { id: "nv-bench-shader-cache", setting: "Shader Cache", value: "Clear before each run", why: "C:\\Users\\[you]\\AppData\\Local\\NVIDIA\\DXCache" },
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
    { id: "amd-anti-lag", setting: "Anti-Lag", value: "Enabled", why: "AMD's answer to Reflex. Reduces input latency." },
    { id: "amd-radeon-boost", setting: "Radeon Boost", value: "Enabled", why: "Dynamic resolution during fast motion. Barely noticeable, good FPS gain." },
    { id: "amd-enhanced-sync", setting: "Enhanced Sync", value: "Off", why: "Can cause stuttering. Use FreeSync instead." },
    { id: "amd-freesync", setting: "FreeSync", value: "Enabled", why: "VRR for tear-free gaming." },
    { id: "amd-vsync", setting: "Wait for Vertical Refresh", value: "Off, unless application specifies", why: "Let games control VSync." },
    { id: "amd-frtc", setting: "Frame Rate Target Control", value: "3 below refresh (e.g., 141)", why: "Stay in FreeSync range." },
  ] as const,
} as const;

export const AMD_PRO_GAMER: ManualStepSection = {
  id: "amd-pro-gamer",
  title: "AMD Adrenalin Settings",
  description: "Right-click desktop > AMD Software: Adrenalin Edition",
  hardware: GPU_TYPES.AMD,
  personas: ["pro_gamer"],
  items: [
    { id: "amd-pro-anti-lag", setting: "Anti-Lag", value: "Enabled (Anti-Lag+ if supported)", why: "Anti-Lag+ is driver-level Reflex equivalent." },
    { id: "amd-pro-radeon-boost", setting: "Radeon Boost", value: "Disabled", why: "Competitive players want consistent resolution." },
    { id: "amd-pro-enhanced-sync", setting: "Enhanced Sync", value: "Off", why: "Any sync = latency." },
    { id: "amd-pro-freesync", setting: "FreeSync", value: "Enabled", why: "Still helps with tearing without VSync latency." },
    { id: "amd-pro-chill", setting: "Radeon Chill", value: "Off", why: "Frame rate limiting = bad for competitive." },
    { id: "amd-pro-sharpening", setting: "Image Sharpening", value: "Off or minimal", why: "Processing overhead." },
  ] as const,
} as const;

export const AMD_STREAMER: ManualStepSection = {
  id: "amd-streamer",
  title: "AMD Adrenalin Settings",
  description: "Right-click desktop > AMD Software: Adrenalin Edition",
  hardware: GPU_TYPES.AMD,
  personas: ["streamer"],
  items: [
    { id: "amd-stream-anti-lag", setting: "Anti-Lag", value: "Enabled", why: "Helps without hurting capture." },
    { id: "amd-stream-radeon-boost", setting: "Radeon Boost", value: "Off", why: "Resolution changes look bad on stream." },
    { id: "amd-stream-freesync", setting: "FreeSync", value: "Enabled", why: "Smooth frames = smooth stream." },
    { id: "amd-stream-relive", setting: "Record & Stream (ReLive)", value: "Configure if using AMD encoder", why: "Alternative to OBS NVENC." },
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
    { id: "bios-xmp", setting: "XMP / EXPO / DOCP", value: "Enabled", why: "RAM runs at advertised speed instead of JEDEC (2133MHz). Free performance." },
    { id: "bios-rebar", setting: "Resizable BAR / Smart Access Memory", value: "Enabled", why: "GPU can access full VRAM. 5-10% in some games." },
    { id: "bios-csm", setting: "CSM (Compatibility Support Module)", value: "Disabled", why: "Use UEFI boot. CSM is legacy." },
    { id: "bios-above4g", setting: "Above 4G Decoding", value: "Enabled", why: "Required for Resizable BAR." },
  ] as const,
} as const;

export const BIOS_AMD_X3D: ManualStepSection = {
  id: "bios-amd-x3d",
  title: "AMD X3D CPU Settings",
  description: "For 7800X3D, 9800X3D, and similar V-Cache CPUs",
  note: "X3D users: Game Mode in Windows + Game Bar enabled = V-Cache optimizer works. Don't disable Game Bar!",
  items: [
    { id: "bios-cppc", setting: "CPPC (Collaborative Processor Performance Control)", value: "Enabled / Auto", why: "REQUIRED for Windows to use V-Cache optimizer. DO NOT disable." },
    { id: "bios-cppc-preferred", setting: "CPPC Preferred Cores", value: "Enabled / Auto", why: "Lets Windows know which cores have V-Cache." },
    { id: "bios-pbo", setting: "PBO (Precision Boost Overdrive)", value: "Auto or Enabled", why: "Safe on X3D. Don't use Curve Optimizer aggressively." },
    { id: "bios-cpb", setting: "Core Performance Boost", value: "Enabled", why: "Allows boost clocks." },
  ] as const,
} as const;

export const BIOS_INTEL: ManualStepSection = {
  id: "bios-intel",
  title: "Intel CPU Settings",
  items: [
    { id: "bios-cstates", setting: "C-States", value: "Enabled for daily use, Disabled for benchmarking", why: "C-States save power but add wake latency." },
    { id: "bios-speedshift", setting: "Speed Shift / HWP", value: "Enabled", why: "Modern Intel frequency scaling. Better than legacy SpeedStep." },
    { id: "bios-turbo", setting: "Turbo Boost", value: "Enabled", why: "Higher clocks when thermal headroom exists." },
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
    { id: "discord-hw-accel", path: "App Settings > Advanced > Hardware Acceleration", value: "On (usually fine)", why: "Offloads to GPU. Disable only if you see issues." },
    { id: "discord-overlay", path: "App Settings > Game Overlay", value: "On if you want it", why: "Casual use, fine to keep." },
    { id: "discord-streamer-mode", path: "App Settings > Streamer Mode", value: "Off", why: "Only needed when streaming." },
  ] as const,
} as const;

export const DISCORD_PRO_GAMER: ManualStepSection = {
  id: "discord-pro-gamer",
  title: "Discord",
  location: "Settings (gear icon)",
  personas: ["pro_gamer"],
  note: "Pro tip: Run Discord in browser during matches = no background processes.",
  items: [
    { id: "discord-pro-hw-accel", path: "App Settings > Advanced > Hardware Acceleration", value: "Off", why: "Can cause micro-stutters in competitive games. CPU handles it fine." },
    { id: "discord-pro-overlay", path: "App Settings > Game Overlay", value: "Off", why: "Any overlay = potential frame drop. Disable everything." },
    { id: "discord-pro-activity", path: "App Settings > Activity Status", value: "Off", why: "Less background activity." },
    { id: "discord-pro-echo", path: "Voice & Video > Echo Cancellation", value: "Off if good mic", why: "Processing overhead." },
    { id: "discord-pro-noise", path: "Voice & Video > Noise Suppression", value: "Off or Krisp", why: "Standard mode uses more CPU." },
    { id: "discord-pro-agc", path: "Voice & Video > Automatic Gain Control", value: "Off", why: "Consistent mic levels, less processing." },
  ] as const,
} as const;

export const DISCORD_STREAMER: ManualStepSection = {
  id: "discord-streamer",
  title: "Discord",
  location: "Settings (gear icon)",
  personas: ["streamer"],
  items: [
    { id: "discord-stream-hw-accel", path: "App Settings > Advanced > Hardware Acceleration", value: "On", why: "GPU handles Discord, CPU focuses on encoding." },
    { id: "discord-stream-overlay", path: "App Settings > Game Overlay", value: "On for chat", why: "Read chat during gameplay." },
    { id: "discord-stream-mode", path: "App Settings > Streamer Mode", value: "On when live", why: "Hides sensitive info automatically." },
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
    { id: "steam-overlay", path: "In-Game > Steam Overlay", value: "On", why: "Useful for guides, chat, browser." },
    { id: "steam-fps-counter", path: "In-Game > FPS counter", value: "Optional", why: "Built-in, low overhead." },
    { id: "steam-downloads", path: "Downloads > Allow downloads during gameplay", value: "Off", why: "Background downloads cause stutters." },
    { id: "steam-gpu-render", path: "Interface > GPU accelerated rendering", value: "On", why: "Smoother Steam UI." },
  ] as const,
} as const;

export const STEAM_PRO_GAMER: ManualStepSection = {
  id: "steam-pro-gamer",
  title: "Steam",
  location: "Steam > Settings",
  personas: ["pro_gamer"],
  note: "Launch options for competitive games: -novid -high -threads X (check per-game)",
  items: [
    { id: "steam-pro-overlay", path: "In-Game > Steam Overlay", value: "Off", why: "Any overlay = potential stutter." },
    { id: "steam-pro-fps-counter", path: "In-Game > FPS counter", value: "Off (use RTSS)", why: "RTSS is more accurate and configurable." },
    { id: "steam-pro-downloads", path: "Downloads > Allow downloads during gameplay", value: "Off", why: "Zero background network." },
    { id: "steam-pro-low-bandwidth", path: "Library > Low Bandwidth Mode", value: "On", why: "Less network chatter." },
    { id: "steam-pro-notifications", path: "Interface > Notify me about...", value: "Off", why: "No popups during matches." },
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
    { id: "chrome-bg-apps", browser: "Chrome/Edge", path: "Settings > System", setting: "Continue running background apps when closed", value: "Off", why: "Chrome stays in RAM otherwise." },
    { id: "chrome-hw-accel", browser: "Chrome/Edge", path: "Settings > System", setting: "Use hardware acceleration", value: "Off when gaming", why: "Can conflict with game GPU usage." },
    { id: "edge-startup-boost", browser: "Edge", path: "Settings > System", setting: "Startup boost", value: "Off", why: "Edge preloads at Windows startup. Wasteful." },
    { id: "edge-bg-extensions", browser: "Edge", path: "Settings > System", setting: "Continue running background extensions", value: "Off", why: "Extensions run even after close." },
    { id: "firefox-hw-accel", browser: "Firefox", path: "Settings > General > Performance", setting: "Use hardware acceleration", value: "Off when gaming", why: "Same GPU conflict issue." },
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
    { id: "rgb-icue", software: "iCUE (Corsair)", action: "Close before competitive matches", why: "Polling rate overhead on USB bus." },
    { id: "rgb-synapse", software: "Synapse (Razer)", action: "Close or use Hardware Mode", why: "Save profiles to device, run software-free." },
    { id: "rgb-armoury", software: "Armoury Crate (ASUS)", action: "Uninstall or disable services", why: "Notorious for background bloat." },
    { id: "rgb-ghub", software: "G Hub (Logitech)", action: "Set profiles, then exit", why: "Onboard memory mode if available." },
  ] as const,
} as const;

export const RGB_GAMER: ManualStepSection = {
  id: "rgb-gamer",
  title: "RGB Software",
  description: "Pretty lights, ugly overhead",
  personas: ["gamer"],
  items: [
    { id: "rgb-casual", software: "All RGB software", action: "Keep if you want, it's fine", why: "Minimal impact for casual play." },
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
    { id: "preflight-refresh-rate", check: "Monitor running at native refresh rate?", how: "Settings > Display > Advanced > Refresh rate", fail: "Stuck at 60Hz = wasted hardware" },
    { id: "preflight-vrr", check: "G-Sync/FreeSync indicator showing?", how: "Enable OSD in NVIDIA/AMD panel, look for VRR indicator", fail: "VRR not active = tearing or latency" },
    { id: "preflight-discrete-gpu", check: "Game running on discrete GPU (laptops)?", how: "Task Manager > GPU column, should show GPU 1", fail: "Using integrated GPU = terrible FPS" },
    { id: "preflight-downloads", check: "No background downloads?", how: "Check Steam, Windows Update, game launchers", fail: "Downloads cause network and disk stutters" },
    { id: "preflight-power-plan", check: "Power plan correct?", how: "powercfg /getactivescheme in terminal", fail: "Balanced/Power Saver = throttled performance" },
    { id: "preflight-timer", check: "Timer tool running? (if enabled)", how: "Check system tray for timer-tool.ps1", fail: "Default 15.6ms timer = micro-stutters" },
    { id: "preflight-apps", check: "Unnecessary apps closed?", how: "Check system tray, Task Manager", fail: "Background apps steal frames" },
    { id: "preflight-drivers", check: "Drivers up to date?", how: "GeForce Experience / AMD Software / Windows Update", fail: "Old drivers = bugs, missing optimizations" },
  ] as const,
} as const;

export const PREFLIGHT_PRO: ManualStepSection = {
  id: "preflight-pro",
  title: "Pre-Flight (Pro)",
  description: "Extra checks for competitive players",
  personas: ["pro_gamer"],
  items: [
    { id: "preflight-pro-discord", check: "Discord hardware acceleration off?", how: "Discord Settings > Advanced", fail: "Can cause stutters in competitive" },
    { id: "preflight-pro-overlay", check: "Steam overlay disabled for this game?", how: "Right-click game > Properties > In-Game", fail: "Overlay can drop frames" },
    { id: "preflight-pro-fullscreen", check: "Fullscreen exclusive (not borderless)?", how: "In-game display settings", fail: "Borderless adds 1+ frame of latency" },
    { id: "preflight-pro-reflex", check: "NVIDIA Reflex ON+Boost (if available)?", how: "In-game settings", fail: "Missing free latency reduction" },
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
      id: "wifi-bt-test",
      step: "Test: Move mouse during gameplay",
      check: "Watch GPU power/usage in overlay - does it drop when moving mouse?",
      why: "If GPU usage drops significantly when moving the mouse, onboard wireless adapters may be the culprit.",
    },
    {
      id: "wifi-bt-bios-fix",
      step: "Best Fix: Disable in BIOS (if you can)",
      check: "BIOS > Onboard Devices > Disable WiFi/Bluetooth",
      why: "Complete fix. Only do this if you don't need onboard wireless or have alternatives.",
    },
    {
      id: "wifi-bt-drivers",
      step: "Alternative: Install official motherboard drivers",
      check: "Download from your motherboard manufacturer's support page (not Windows Update)",
      why: "May fix or reduce the issue. Generic Windows drivers are often the problem.",
    },
    {
      id: "wifi-bt-separate",
      step: "Workaround: Use separate adapters",
      check: "Disable onboard in BIOS, use PCIe WiFi card or USB Bluetooth dongle",
      why: "Dedicated adapters don't share the same I/O path as onboard chips.",
    },
  ] as const,
} as const;

export const TROUBLESHOOTING_PERFORMANCE: ManualStepSection = {
  id: "troubleshooting-performance",
  title: "Performance Issues",
  description: "Common FPS and stuttering problems",
  items: [
    {
      id: "trouble-60fps-cap",
      problem: "Game runs at 60 FPS even though I have a 144Hz monitor",
      causes: ["V-Sync enabled in-game", "Windows refresh rate set to 60Hz", "Frame rate cap in game settings", "NVIDIA Control Panel capping frames"],
      quickFix: "Settings → Display → Advanced → Refresh rate → Set to 144Hz",
    },
    {
      id: "trouble-micro-stutters",
      problem: "Micro-stutters every few seconds",
      causes: ["Background downloads (Steam, Windows Update)", "Timer resolution at default 15.6ms", "Power plan throttling", "Shader compilation"],
      quickFix: "Run timer-tool.ps1, pause all downloads, set High Performance power plan",
    },
    {
      id: "trouble-alt-tab",
      problem: "FPS drops when alt-tabbing",
      causes: ["Fullscreen Optimizations enabled", "Game loses GPU priority", "V-Sync mismatch"],
      quickFix: "Right-click game .exe → Properties → Compatibility → Disable fullscreen optimizations",
    },
    {
      id: "trouble-high-fps-laggy",
      problem: "High FPS but feels laggy",
      causes: ["High input latency (render queue)", "V-Sync enabled", "Pre-rendered frames too high", "Display not in VRR range"],
      quickFix: "Enable NVIDIA Low Latency Mode Ultra or Reflex, disable V-Sync, cap FPS 3 below refresh",
    },
    {
      id: "trouble-igpu",
      problem: "Game uses integrated GPU instead of dedicated",
      causes: ["Laptop hybrid graphics", "Windows GPU preference not set", "Monitor plugged into wrong port"],
      quickFix: "Settings → Display → Graphics → Add game → High performance. Check monitor is plugged into GPU, not motherboard.",
    },
    {
      id: "trouble-1-percent-lows",
      problem: "Terrible 1% lows / stuttering",
      causes: ["RAM not in XMP/EXPO", "Background apps", "CPU thermal throttling", "Driver issues"],
      quickFix: "Enable XMP in BIOS, close background apps, check temps with HWiNFO, DDU and reinstall drivers",
    },
  ] as const,
} as const;

export const TROUBLESHOOTING_AUDIO: ManualStepSection = {
  id: "troubleshooting-audio",
  title: "Audio Issues",
  description: "Crackling, directional audio, and mic problems",
  items: [
    {
      id: "trouble-audio-crackling",
      problem: "Audio crackling/popping during games",
      causes: ["DPC latency spikes", "Audio driver issues", "Sample rate mismatch", "USB power saving"],
      quickFix: "Run LatencyMon to diagnose. Disable USB selective suspend. Update audio drivers from manufacturer.",
    },
    {
      id: "trouble-audio-directional",
      problem: "Can't hear footsteps / directional audio is off",
      causes: ["Virtual surround enabled", "Loudness equalization on", "Wrong audio channels"],
      quickFix: "Disable Windows Sonic/Dolby Atmos. Use stereo. Disable audio enhancements in Sound settings.",
    },
    {
      id: "trouble-mic-quiet",
      problem: "Mic too quiet / others can't hear me",
      causes: ["Mic boost disabled", "Wrong input device", "Discord noise gate too aggressive"],
      quickFix: "Sound settings → Recording → Microphone → Properties → Levels → Enable Mic Boost (+10-20dB)",
    },
  ] as const,
} as const;

export const TROUBLESHOOTING_NETWORK: ManualStepSection = {
  id: "troubleshooting-network",
  title: "Network Issues",
  description: "Ping, packet loss, and connection problems",
  items: [
    {
      id: "trouble-high-ping",
      problem: "High ping in games but speed test is fine",
      causes: ["QoS not configured", "Background uploads", "WiFi interference", "ISP routing issues"],
      quickFix: "Use Ethernet. Disable background apps. Try different DNS (1.1.1.1 or 8.8.8.8). Check for packet loss with: ping google.com -t",
    },
    {
      id: "trouble-rubberbanding",
      problem: "Rubber-banding / teleporting in-game",
      causes: ["Packet loss", "WiFi instability", "Server issues", "Firewall blocking"],
      quickFix: "Test with: ping google.com -t (look for timeouts/spikes). Switch to Ethernet if on WiFi.",
    },
    {
      id: "trouble-nat-type",
      problem: "NAT type Strict / Moderate",
      causes: ["Router UPnP disabled", "Ports not forwarded", "Double NAT (modem + router)"],
      quickFix: "Enable UPnP in router settings. Port forward game-specific ports. Check if modem has routing enabled (put in bridge mode).",
    },
  ] as const,
} as const;

export const TROUBLESHOOTING_CRASHES: ManualStepSection = {
  id: "troubleshooting-crashes",
  title: "Crashes & Stability",
  description: "CTDs, blue screens, and random restarts",
  items: [
    {
      id: "trouble-ctd",
      problem: "Game crashes to desktop with no error",
      causes: ["GPU driver issue", "Overclock instability", "Corrupted game files", "Anti-cheat conflict"],
      quickFix: "DDU and reinstall GPU drivers. Remove any overclock. Verify game files in launcher. Check Windows Event Viewer for clues.",
    },
    {
      id: "trouble-bsod",
      problem: "Blue screen (BSOD) during gaming",
      causes: ["Unstable overclock", "Driver conflict", "RAM issues", "Overheating"],
      quickFix: "Reset BIOS to defaults. Run memtest86 overnight. Check temps with HWiNFO. Note the STOP code and search it.",
    },
    {
      id: "trouble-restart",
      problem: "PC restarts during gaming (no BSOD)",
      causes: ["PSU insufficient for GPU power spikes", "CPU/GPU overheating", "Overclock instability"],
      quickFix: "Check temps during gaming (>95°C = throttling). Ensure PSU has enough wattage + headroom. Remove any overclock. Check PSU cables are fully seated.",
    },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// Peripheral Settings
// -----------------------------------------------------------------------------

export const PERIPHERAL_MOUSE_ALL: ManualStepSection = {
  id: "peripheral-mouse-all",
  title: "Mouse Settings",
  description: "Essential mouse configuration for gaming",
  items: [
    { id: "mouse-polling", setting: "Polling Rate", value: "1000Hz minimum, 4000Hz+ if supported", why: "Higher = more frequent position updates = smoother tracking" },
    { id: "mouse-dpi", setting: "DPI", value: "Personal preference, 400-1600 common for FPS", why: "Higher DPI ≠ better. Find your eDPI sweet spot (DPI × in-game sens)." },
    { id: "mouse-angle-snapping", setting: "Angle Snapping", value: "Off", why: "Artificial straightening = bad for raw aim" },
    { id: "mouse-acceleration", setting: "Acceleration", value: "Off (both Windows and mouse software)", why: "Inconsistent movement speed breaks muscle memory" },
    { id: "mouse-lod", setting: "LOD (Lift-off Distance)", value: "Low/1mm if available", why: "Reduces unwanted tracking when lifting mouse to reposition" },
    { id: "mouse-debounce", setting: "Debounce", value: "Lowest stable setting", why: "Lower = faster click registration, but too low may cause double-clicks" },
  ] as const,
} as const;

export const PERIPHERAL_MOUSE_PRO: ManualStepSection = {
  id: "peripheral-mouse-pro",
  title: "Mouse (Pro)",
  description: "Advanced mouse settings for competitive players",
  personas: ["pro_gamer"],
  items: [
    { id: "mouse-pro-calibration", setting: "Surface Calibration", value: "Calibrate to your mousepad", why: "Optimal tracking for your specific surface" },
    { id: "mouse-pro-dpi-stages", setting: "DPI Stages", value: "Remove unused stages", why: "Prevents accidental DPI changes mid-game" },
    { id: "mouse-pro-onboard", setting: "Onboard Memory", value: "Save profile to mouse", why: "Settings work without software running (less background processes)" },
  ] as const,
} as const;

export const PERIPHERAL_KEYBOARD_ALL: ManualStepSection = {
  id: "peripheral-keyboard-all",
  title: "Keyboard Settings",
  description: "Essential keyboard configuration",
  items: [
    { id: "kb-polling", setting: "Polling Rate", value: "1000Hz+", why: "Faster key press registration" },
    { id: "kb-nkro", setting: "N-Key Rollover (NKRO)", value: "Enabled / Full", why: "All simultaneous key presses register (important for complex inputs)" },
    { id: "kb-game-mode", setting: "Game Mode", value: "Enable during gaming", why: "Disables Windows key to prevent accidental alt-tabs" },
  ] as const,
} as const;

export const PERIPHERAL_KEYBOARD_PRO: ManualStepSection = {
  id: "peripheral-keyboard-pro",
  title: "Keyboard (Pro)",
  description: "Advanced keyboard settings for competitive players",
  personas: ["pro_gamer"],
  items: [
    { id: "kb-pro-rapid-trigger", setting: "Rapid Trigger (if available)", value: "Enable for movement keys", why: "Faster direction changes in strafing games (Wooting, etc.)" },
    { id: "kb-pro-actuation", setting: "Actuation Point", value: "Adjust based on preference", why: "Higher for less fatigue, lower for speed (analog keyboards)" },
  ] as const,
} as const;

export const PERIPHERAL_AUDIO_ALL: ManualStepSection = {
  id: "peripheral-audio-all",
  title: "Audio/Headset Settings",
  description: "Sound settings in Windows",
  location: "Right-click speaker icon → Sound settings → Device properties → Additional device properties",
  items: [
    { id: "audio-sample-rate", setting: "Sample Rate", value: "48000 Hz", why: "Match game audio (most games use 48kHz)" },
    { id: "audio-bit-depth", setting: "Bit Depth", value: "24-bit", why: "Higher dynamic range than 16-bit" },
    { id: "audio-spatial", setting: "Spatial Audio", value: "Off for competitive, preference otherwise", why: "Virtual surround can muddy directional audio in competitive" },
    { id: "audio-exclusive", setting: "Exclusive Mode", value: "Allow applications to take exclusive control", why: "Reduces audio latency" },
  ] as const,
} as const;

export const PERIPHERAL_AUDIO_PRO: ManualStepSection = {
  id: "peripheral-audio-pro",
  title: "Audio (Pro)",
  description: "Competitive audio settings",
  personas: ["pro_gamer"],
  location: "Speaker properties → Enhancements tab",
  items: [
    { id: "audio-pro-sonic", setting: "Windows Sonic/Dolby Atmos", value: "Off", why: "Adds processing latency. Use stereo for competitive." },
    { id: "audio-pro-loudness", setting: "Loudness Equalization", value: "Off", why: "Compresses dynamic range, makes footsteps harder to hear" },
    { id: "audio-pro-enhance", setting: "Audio Enhancements", value: "All Off", why: "Pure unprocessed signal to headphones" },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// Network Adapter Settings
// -----------------------------------------------------------------------------

export const NETWORK_ADAPTER_ALL: ManualStepSection = {
  id: "network-adapter-all",
  title: "Network Adapter Settings",
  description: "Device Manager → Network adapters → Your NIC → Properties → Advanced",
  note: "Setting names vary by manufacturer (Intel, Realtek, Killer). Use PowerShell: Get-NetAdapterAdvancedProperty -Name 'Ethernet' to see available options.",
  items: [
    { id: "nic-interrupt-mod", setting: "Interrupt Moderation", value: "Disabled", why: "Reduces latency by not batching interrupts. May slightly increase CPU usage." },
    { id: "nic-interrupt-rate", setting: "Interrupt Moderation Rate", value: "Off/Minimal", why: "Same as above, for adapters with a rate setting instead of on/off." },
    { id: "nic-flow-control", setting: "Flow Control", value: "Disabled", why: "Prevents network pausing. Can improve latency slightly." },
    { id: "nic-eee", setting: "Energy Efficient Ethernet", value: "Disabled", why: "Prevents power saving on NIC that can cause latency spikes." },
    { id: "nic-green", setting: "Green Ethernet", value: "Disabled", why: "Same as above, different manufacturer name." },
    { id: "nic-speed-duplex", setting: "Speed & Duplex", value: "1 Gbps Full Duplex (if wired)", why: "Don't auto-negotiate if you know your connection speed." },
  ] as const,
} as const;

export const NETWORK_ADAPTER_PRO: ManualStepSection = {
  id: "network-adapter-pro",
  title: "Network (Pro)",
  description: "Additional NIC settings for competitive",
  personas: ["pro_gamer"],
  note: "These settings may increase CPU usage slightly but reduce network latency.",
  items: [
    { id: "nic-pro-lso", setting: "Large Send Offload (LSO) v1/v2", value: "Disabled", why: "Reduces CPU usage but adds latency. Disable for lowest ping." },
    { id: "nic-pro-rx-buffers", setting: "Receive Buffers", value: "Maximum (e.g., 2048)", why: "More buffer = handle traffic bursts better." },
    { id: "nic-pro-tx-buffers", setting: "Transmit Buffers", value: "Maximum", why: "Same for outgoing traffic." },
    { id: "nic-pro-master-slave", setting: "Gigabit Master Slave Mode", value: "Auto or Force Master", why: "Some NICs default to slave mode, which has worse latency." },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// Game Launch Options
// -----------------------------------------------------------------------------

export const GAME_LAUNCH_FPS: ManualStepSection = {
  id: "game-launch-fps",
  title: "FPS / Shooter Games",
  description: "Launch options for competitive shooters",
  items: [
    {
      id: "game-cs2",
      game: "CS2 / CS:GO",
      platform: "Steam",
      launchOptions: "-novid -high -tickrate 128 +fps_max 0",
      notes: [
        "-novid: Skip intro video",
        "-high: High CPU priority",
        "-tickrate 128: Practice server tickrate",
        "+fps_max 0: Uncapped (or set to monitor refresh + 1)",
        "In-game: NVIDIA Reflex = On + Boost",
        "In-game: Multicore Rendering = Enabled",
      ],
    },
    {
      id: "game-valorant",
      game: "Valorant",
      platform: "Riot",
      notes: [
        "No launch options (Riot launcher)",
        "In-game: NVIDIA Reflex = On + Boost",
        "In-game: Multithreaded Rendering = On",
        "In-game: Limit FPS = Off or slightly above refresh",
        "Note: Vanguard anti-cheat runs at boot",
        "Warning: Some Core Isolation settings conflict with Vanguard",
      ],
    },
    {
      id: "game-apex",
      game: "Apex Legends",
      platform: "Steam",
      launchOptions: "-novid -high +fps_max unlimited",
      notes: [
        "Origin/EA App: +fps_max unlimited",
        "In-game: NVIDIA Reflex = Enabled + Boost",
        "In-game: Adaptive Resolution FPS Target = 0 (disabled)",
        "In-game: V-Sync = Disabled",
        "Config: videoconfig.txt → setting.fps_max \"0\"",
      ],
    },
    {
      id: "game-overwatch2",
      game: "Overwatch 2",
      platform: "Battle.net",
      launchOptions: "--tank_WorkerThreadCount X",
      notes: [
        "Replace X with your physical core count",
        "In-game: NVIDIA Reflex = Enabled",
        "In-game: Reduce Buffering = On (crucial for latency!)",
        "In-game: Limit FPS = Display-based or custom cap",
        "In-game: Triple Buffering = Off",
      ],
    },
    {
      id: "game-fortnite",
      game: "Fortnite",
      platform: "Epic",
      launchOptions: "-USEALLAVAILABLECORES",
      notes: [
        "Epic launcher → Settings → Additional Command Line",
        "-PREFERREDPROCESSOR X: Pin to specific core (advanced)",
        "In-game: NVIDIA Reflex = On + Boost",
        "In-game: DirectX 12 for newer GPUs, DX11 for stability",
        "In-game: Rendering Mode = Performance for max FPS",
      ],
    },
  ] as const,
} as const;

export const GAME_LAUNCH_MOBA: ManualStepSection = {
  id: "game-launch-moba",
  title: "MOBA / Strategy Games",
  description: "Launch options for MOBAs and RTS games",
  items: [
    {
      id: "game-dota2",
      game: "Dota 2",
      platform: "Steam",
      launchOptions: "-novid -high -dx11 +fps_max 0",
      notes: [
        "-dx11: Force DirectX 11 (more stable than Vulkan for some)",
        "-vulkan: Try Vulkan for AMD GPUs",
        "In-game: Compute Shaders = Enabled",
        "In-game: Async Compute = Enabled (NVIDIA 10-series+)",
      ],
    },
    {
      id: "game-lol",
      game: "League of Legends",
      platform: "Riot",
      notes: [
        "No launch options (Riot launcher)",
        "In-game: Cap FPS to monitor refresh (prevents GPU heat)",
        "In-game: V-Sync = Off",
        "Config: game.cfg → [Performance] → TargetFrameRate",
        "Client: Low Spec Mode = faster load times",
      ],
    },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// OBS/Streaming Settings (Streamer-only)
// -----------------------------------------------------------------------------

export const OBS_OUTPUT: ManualStepSection = {
  id: "obs-output",
  title: "OBS Output Settings",
  description: "Settings → Output → Streaming/Recording",
  personas: ["streamer"],
  items: [
    { id: "obs-encoder", setting: "Encoder", value: "NVENC (NVIDIA) or AMF (AMD)", why: "Hardware encoding = minimal CPU impact, GPU handles it" },
    { id: "obs-rate-control", setting: "Rate Control", value: "CBR for streaming, CQP for recording", why: "CBR = consistent bitrate for Twitch/YouTube" },
    { id: "obs-bitrate", setting: "Bitrate (1080p60)", value: "6000 Kbps (Twitch), 10000+ (YouTube)", why: "Twitch caps at 6000, YouTube allows more headroom" },
    { id: "obs-keyframe", setting: "Keyframe Interval", value: "2 seconds", why: "Required by most streaming platforms" },
    { id: "obs-preset", setting: "Preset", value: "Quality or Max Quality", why: "NVENC Quality ≈ x264 Medium with only ~10% GPU usage" },
    { id: "obs-profile", setting: "Profile", value: "High", why: "Better compression efficiency than Baseline or Main" },
    { id: "obs-lookahead", setting: "Look-ahead", value: "Off for low latency, On for quality", why: "Adds encoding delay but better bitrate allocation" },
    { id: "obs-psycho-visual", setting: "Psycho Visual Tuning", value: "On", why: "Better perceived quality at same bitrate" },
    { id: "obs-bframes", setting: "Max B-frames", value: "2", why: "Balance of quality and encoding latency" },
  ] as const,
} as const;

export const OBS_VIDEO: ManualStepSection = {
  id: "obs-video",
  title: "OBS Video Settings",
  description: "Settings → Video",
  personas: ["streamer"],
  items: [
    { id: "obs-canvas-res", setting: "Base (Canvas) Resolution", value: "Your monitor resolution", why: "Capture at native, scale down if needed" },
    { id: "obs-output-res", setting: "Output (Scaled) Resolution", value: "1920x1080 for most", why: "Higher than 1080p rarely worth the bitrate on Twitch" },
    { id: "obs-downscale", setting: "Downscale Filter", value: "Lanczos (Sharpened scaling, 36 samples)", why: "Best quality downscale, slight performance cost" },
    { id: "obs-fps", setting: "FPS", value: "60 FPS", why: "Match your content. 30 FPS is fine for slow-paced games." },
  ] as const,
} as const;

export const OBS_ADVANCED: ManualStepSection = {
  id: "obs-advanced",
  title: "OBS Advanced Settings",
  description: "Settings → Advanced",
  personas: ["streamer"],
  items: [
    { id: "obs-priority", setting: "Process Priority", value: "Above Normal", why: "OBS gets CPU time over background apps, but not before games" },
    { id: "obs-renderer", setting: "Renderer", value: "Direct3D 11", why: "Most compatible. Avoid Vulkan unless troubleshooting." },
    { id: "obs-color-format", setting: "Color Format", value: "NV12", why: "Standard for streaming, hardware encoder native format" },
    { id: "obs-color-space", setting: "Color Space", value: "709", why: "HD standard color space" },
    { id: "obs-color-range", setting: "Color Range", value: "Partial", why: "Full range can cause issues on some platforms/players" },
  ] as const,
} as const;

export const OBS_SOURCES: ManualStepSection = {
  id: "obs-sources",
  title: "OBS Source Settings",
  description: "When adding game sources",
  personas: ["streamer"],
  note: "Game Capture is always preferred over Display Capture when the game supports it",
  items: [
    { id: "obs-capture-type", setting: "Game Capture vs Display Capture", value: "Game Capture when possible", why: "Lower overhead, captures only the game, not entire screen" },
    { id: "obs-capture-mode", setting: "Game Capture → Mode", value: "Capture specific window", why: "More reliable than 'Capture any fullscreen application'" },
    { id: "obs-sli-capture", setting: "Game Capture → SLI/Crossfire Capture", value: "Off unless multi-GPU", why: "Adds overhead when enabled unnecessarily" },
    { id: "obs-transparency", setting: "Game Capture → Allow Transparency", value: "Off", why: "Unnecessary processing for most games" },
  ] as const,
} as const;

export const OBS_TROUBLESHOOTING: ManualStepSection = {
  id: "obs-troubleshooting",
  title: "Common Streaming Issues",
  description: "Quick fixes for OBS problems",
  personas: ["streamer"],
  items: [
    { id: "obs-encoding-overload", problem: "Encoding overloaded", solution: "Lower preset (Quality → Performance) or output resolution", why: "GPU encoder can't keep up with encoding demand" },
    { id: "obs-dropped-network", problem: "Dropped frames (Network)", solution: "Lower bitrate or check upload speed", why: "Internet can't sustain the set bitrate" },
    { id: "obs-dropped-rendering", problem: "Dropped frames (Rendering)", solution: "Cap game FPS, close background apps", why: "GPU overloaded between game rendering and encoding" },
    { id: "obs-game-stutters", problem: "Game stutters while streaming", solution: "Use NVENC/AMF, cap FPS 10 below max", why: "Leave GPU headroom for encoding work" },
    { id: "obs-black-screen", problem: "Black screen in Game Capture", solution: "Run OBS as admin, or use Display Capture", why: "Anti-cheat or game capture hook compatibility issue" },
  ] as const,
} as const;

// -----------------------------------------------------------------------------
// Diagnostic Tools
// -----------------------------------------------------------------------------

export const DIAGNOSTIC_TOOLS_PERFORMANCE: ManualStepSection = {
  id: "diagnostic-performance",
  title: "Performance Diagnostics",
  description: "Tools to diagnose FPS issues, stuttering, and system bottlenecks",
  items: [
    { id: "diag-latencymon", tool: "LatencyMon", use: "Diagnose DPC latency spikes causing audio crackle or micro-stutters", arsenalKey: "latencymon" },
    { id: "diag-hwinfo", tool: "HWiNFO64", use: "Monitor temps, clocks, and detect thermal throttling during gaming", arsenalKey: "hwinfo" },
    { id: "diag-capframex", tool: "CapFrameX", use: "Capture and analyze frametimes for detailed benchmark comparisons", arsenalKey: "capframex" },
    { id: "diag-afterburner", tool: "MSI Afterburner", use: "GPU monitoring overlay, frametime graphs, and overclocking", arsenalKey: "msiafterburner" },
    { id: "diag-procexp", tool: "Process Explorer", use: "Deep process inspection, find CPU/memory hogs", arsenalKey: "sysinternals" },
  ] as const,
} as const;

export const DIAGNOSTIC_TOOLS_HARDWARE: ManualStepSection = {
  id: "diagnostic-hardware",
  title: "Hardware Diagnostics",
  description: "Tools to test and verify hardware stability",
  items: [
    { id: "diag-ddu", tool: "DDU (Display Driver Uninstaller)", use: "Clean GPU driver removal before fresh install - fixes many issues", arsenalKey: "ddu" },
    { id: "diag-crystaldisk", tool: "CrystalDiskMark", use: "Test SSD/HDD speeds, diagnose slow load times", arsenalKey: "crystaldiskmark" },
    { id: "diag-memtest", tool: "memtest86", use: "Test RAM stability overnight - catches unstable XMP profiles" },
    { id: "diag-occt", tool: "OCCT", use: "Stress test CPU, GPU, RAM, and PSU to find stability issues" },
    { id: "diag-prime95", tool: "Prime95", use: "Heavy CPU stress test, reveals thermal throttling" },
  ] as const,
} as const;

export const DIAGNOSTIC_TOOLS_NETWORK: ManualStepSection = {
  id: "diagnostic-network",
  title: "Network Diagnostics",
  description: "Tools to diagnose ping, packet loss, and connection issues",
  items: [
    { id: "diag-winmtr", tool: "WinMTR", use: "Network path analysis - find where packet loss occurs between you and server" },
    { id: "diag-pingplotter", tool: "PingPlotter", use: "Visual network route analysis with graphs over time" },
    { id: "diag-wireshark", tool: "Wireshark", use: "Deep packet inspection - for advanced network troubleshooting" },
  ] as const,
} as const;

export const DIAGNOSTIC_TOOLS_CRASHES: ManualStepSection = {
  id: "diagnostic-crashes",
  title: "Crash Diagnostics",
  description: "Tools to analyze BSODs and game crashes",
  items: [
    { id: "diag-whocrashed", tool: "WhoCrashed", use: "Analyze BSOD minidump files, identifies faulty drivers" },
    { id: "diag-bluescreenview", tool: "BlueScreenView", use: "Simple BSOD log viewer, shows crash history" },
    { id: "diag-eventviewer", tool: "Event Viewer", use: "Built-in Windows logs - check Application and System for errors" },
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
  | "peripherals"
  | "network"
  | "preflight"
  | "troubleshooting"
  | "games"
  | "streaming"
  | "diagnostics";

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
    id: "peripherals",
    title: "Peripherals",
    icon: "mouse",
    sections: [
      PERIPHERAL_MOUSE_ALL,
      PERIPHERAL_MOUSE_PRO,
      PERIPHERAL_KEYBOARD_ALL,
      PERIPHERAL_KEYBOARD_PRO,
      PERIPHERAL_AUDIO_ALL,
      PERIPHERAL_AUDIO_PRO,
    ],
  },
  {
    id: "network",
    title: "Network Adapter",
    icon: "wifi",
    sections: [NETWORK_ADAPTER_ALL, NETWORK_ADAPTER_PRO],
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
    sections: [
      TROUBLESHOOTING_PERFORMANCE,
      TROUBLESHOOTING_AUDIO,
      TROUBLESHOOTING_NETWORK,
      TROUBLESHOOTING_CRASHES,
      TROUBLESHOOTING_WIFI_BLUETOOTH,
    ],
    videos: [VIDEOS.STUTTERING_FIXES],
  },
  {
    id: "games",
    title: "Game Launch Options",
    icon: "gamepad",
    sections: [GAME_LAUNCH_FPS, GAME_LAUNCH_MOBA],
  },
  {
    id: "streaming",
    title: "Streaming (OBS)",
    icon: "broadcast",
    sections: [OBS_OUTPUT, OBS_VIDEO, OBS_ADVANCED, OBS_SOURCES, OBS_TROUBLESHOOTING],
  },
  {
    id: "diagnostics",
    title: "Diagnostic Tools",
    icon: "stethoscope",
    sections: [DIAGNOSTIC_TOOLS_PERFORMANCE, DIAGNOSTIC_TOOLS_HARDWARE, DIAGNOSTIC_TOOLS_NETWORK, DIAGNOSTIC_TOOLS_CRASHES],
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
