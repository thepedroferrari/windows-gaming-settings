# Windows X-Lite Post-Installation Gaming Setup Guide

This guide is specifically for **Windows X-Lite 'Optimum 11' 25H2 Pro v2** installations.

## What X-Lite Already Does

Windows X-Lite is already heavily optimized:
- ✅ **Defender disabled** (optional)
- ✅ **UAC disabled**
- ✅ **Bloatware removed** (Edge, UWP apps, Widgets)
- ✅ **Telemetry disabled**
- ✅ **Updates paused until 3000**
- ✅ **Indexing disabled**
- ✅ **Error reporting disabled**
- ✅ **Power throttling disabled**
- ✅ **Hibernation disabled**

## Post-Installation Steps

### 1. Install Essential Drivers

**CRITICAL - Do this first:**

```powershell
# Download from Windows X-Lite Software Page:
# - DirectX 9 Runtime
# - Visual C++ Runtimes (all versions)
# - AMD Chipset Drivers (if AMD Ryzen)
```

**Direct Links (if available):**
- Visit: https://windowsxlite.com/software/
- Download: DX9, VC++ Runtimes, Chipset Drivers

### 2. Run Gaming PC Setup Script

```powershell
# Run as Administrator
.\gaming-pc-setup.ps1
```

**Note about winget:**
- X-Lite may not include Microsoft Store (needed for winget)
- Script will attempt to install winget automatically
- If installation fails, software installation is skipped
- **All other optimizations still apply** (network, power plan, stutter fixes, etc.)
- You can install software manually if needed

**What the script will do on X-Lite:**
- ✅ Skip bloatware removal (already done)
- ✅ Skip Defender optimizations (already disabled)
- ✅ Attempt winget installation (if Microsoft Store available)
- ✅ Focus on gaming-specific optimizations:
  - Timer resolution fixes (CRITICAL for micro-stutters)
  - HPET disable
  - MSI Mode for GPU/network
  - Network optimizations
  - Process priority tweaks
  - Audio driver optimizations
  - CPU scheduling optimizations

### 3. Reboot (Required)

After running the script:
```powershell
Restart-Computer
```

**Why reboot is needed:**
- HPET changes require reboot
- MSI Mode changes require reboot
- Some registry changes need reboot

### 4. Install Gaming Software

**If winget is available**, the script will install via winget:
- Steam
- Discord
- VLC Media Player
- Brave Browser

**If winget is not available** (common on X-Lite without Microsoft Store):
- Software installation is skipped automatically
- Install software manually from official websites
- Or install Microsoft Store/App Installer first, then rerun script

### 5. Configure Timer Resolution (CRITICAL)

**Before every gaming session**, run:

```powershell
# Option 1: Monitor specific game
.\timer-tool.ps1 -GameProcess "cs2"

# Option 2: Run indefinitely (keep open while gaming)
.\timer-tool.ps1
```

**Why this is critical:**
- Windows X-Lite still uses default 15.6ms timer resolution
- This causes micro-stutters and poor 1% lows
- The timer tool forces 0.5ms resolution (like Linux)
- **This is the #1 fix for micro-stutters**

### 6. Optional: Enable Widgets/Gallery (if needed)

If you want Widgets or File Explorer Gallery:

**Widgets:**
1. Install Edge and Webview2 from X-Lite extras folder
2. Run 'Widgets On' shortcut from extras folder
3. Download Widgets App from X-Lite website
4. Restart PC

**Gallery:**
1. Download Gallery Enabler from X-Lite website
2. Run the enabler
3. Restart PC

**Note:** These are optional and not needed for gaming.

## X-Lite Specific Optimizations

### What's Already Optimized

Since X-Lite is pre-optimized, the script will:
- ✅ Detect X-Lite build automatically
- ✅ Skip redundant operations
- ✅ Focus on gaming-specific tweaks
- ✅ Add timer resolution fixes (not in X-Lite)
- ✅ Add MSI Mode (not in X-Lite)
- ✅ Add network optimizations (not in X-Lite)

### Additional Manual Steps

1. **Install DirectX 9 Runtime**
   - Required for older games
   - Download from X-Lite software page

2. **Install Visual C++ Runtimes**
   - Required for many games
   - Download all versions from X-Lite software page

3. **AMD Ryzen Users**
   - Install latest chipset drivers from X-Lite software page
   - Critical for proper CPU performance

4. **NVIDIA Users**
   - Install latest NVIDIA drivers from nvidia.com
   - Configure NVIDIA Control Panel:
     - Power: Maximum Performance
     - Low Latency: Ultra
     - V-Sync: Off (or Fast for G-Sync)

5. **Audio Setup (Samsung Q990D)**
   - Install Samsung audio drivers
   - Enable Spatial Audio in Windows Settings
   - Configure DTS settings

## Gaming Performance Checklist

After setup, verify:

- [ ] Timer tool running during gameplay (`timer-tool.ps1`)
- [ ] HPET disabled (check with `diagnose-stutters.ps1`)
- [ ] MSI Mode enabled for GPU (check with `diagnose-stutters.ps1`)
- [ ] Network optimizations applied
- [ ] Game directories in Defender exclusions (if Defender enabled)
- [ ] Audio set to exclusive mode
- [ ] RGB software closed (iCUE, Razer Synapse, etc.)
- [ ] Background apps closed
- [ ] Exclusive fullscreen mode in games

## Troubleshooting

### Script Detects X-Lite Incorrectly

If the script doesn't detect X-Lite but you know it is:
- The script will still work fine
- It will just run all optimizations (many will be idempotent)
- No harm done

### Defender Still Running

If Defender is still active (unlikely on X-Lite):
- Add game directories to exclusions manually
- Or disable via Group Policy if needed

### Updates Want to Resume

X-Lite pauses updates until 3000, but if they try to resume:
- Script sets registry to pause again
- Check Windows Update settings
- Use Group Policy if needed

### Missing Features

If you need features X-Lite removed:
- Widgets: Use Widgets Enabler from X-Lite
- Edge: Install from X-Lite extras folder
- UWP Apps: Install from Microsoft Store
- Gallery: Use Gallery Enabler from X-Lite

## Expected Performance

With X-Lite + Gaming Setup Script:

- ✅ **Eliminated micro-stutters** (with timer tool)
- ✅ **Improved 1% low FPS** (closer to Linux)
- ✅ **Lower system overhead** (X-Lite removes bloat)
- ✅ **Faster boot times** (X-Lite optimizations)
- ✅ **More consistent frame times** (timer resolution fixes)

## Notes

- X-Lite is already heavily optimized, so the script focuses on gaming-specific tweaks
- The timer tool is **critical** - don't skip it
- Reboot after running the script
- Keep timer tool running during gameplay
- Monitor with `diagnose-stutters.ps1` if issues persist

## Support

- X-Lite Support: https://windowsxlite.com/
- X-Lite Guides: https://windowsxlite.com/guides/
- X-Lite Software: https://windowsxlite.com/software/
