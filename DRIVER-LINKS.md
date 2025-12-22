# Official Driver & Software Download Links

Essential drivers and software for optimal gaming performance on Windows 11.

## 🔴 AMD (Ryzen 7900X3D)

### AMD Chipset Drivers
**Download:** https://www.amd.com/en/support/chipsets/amd-socket-am5/x670e
- Required for proper CPU performance
- Includes power management drivers
- Updates AGESA microcode
- **Version:** Always get latest stable

### AMD Ryzen Master (Optional - Advanced Users)
**Download:** https://www.amd.com/en/technologies/ryzen-master
- CPU monitoring and overclocking
- Useful for checking CCD temps
- NOT needed for gaming, just monitoring

### AMD Software: Adrenalin Edition (for AMD GPUs)
**Download:** https://www.amd.com/en/support
- Select your GPU model
- Download latest Adrenalin driver
- Includes Radeon Software

## 🟢 NVIDIA (if applicable)

### NVIDIA Game Ready Drivers
**Download:** https://www.nvidia.com/Download/index.aspx
- Select your GPU series (RTX 40, RTX 30, etc.)
- Choose "Game Ready Driver" (not Studio)
- Manual download recommended over GeForce Experience

### NVIDIA Control Panel
- Included with driver
- Opens via: Right-click desktop → NVIDIA Control Panel
- Or search "NVIDIA Control Panel" in Start Menu

## 🎵 Audio Drivers

### Realtek Audio (Most Common)
**Download:** https://www.realtek.com/en/downloads
- Check Device Manager for exact audio device
- Or get from motherboard manufacturer website

### Samsung Q990D Soundbar
**Drivers:** Usually automatic via Windows Update
- **Manual:** https://www.samsung.com/us/support/
- Enable Spatial Audio: Settings → Sound → Spatial audio → DTS:X

### Generic High Definition Audio
- Windows Update usually sufficient
- For better performance: Motherboard manufacturer website

## 🖥️ Motherboard Drivers

### BIOS Updates (IMPORTANT for AMD X3D)
Check your motherboard manufacturer:

**ASUS:** https://www.asus.com/support/download-center/
**MSI:** https://www.msi.com/support/download
**Gigabyte:** https://www.gigabyte.com/Support
**ASRock:** https://www.asrock.com/support/download.asp

**For 7900X3D:** Ensure BIOS has AGESA 1.0.0.7+ for best performance

### Ethernet/WiFi Drivers
**Intel:** https://www.intel.com/content/www/us/en/download/19351/
**Realtek:** https://www.realtek.com/en/downloads
**Killer Networks:** https://www.killernetworking.com/driver-downloads

## 🎮 Essential Software (Manual Install)

### Brave Browser (Privacy-focused)
**Download:** https://brave.com/download/
- Script installs this via winget
- Or download manually

### Steam
**Download:** https://store.steampowered.com/about/
- Script installs this via winget
- Or download manually

### Discord
**Download:** https://discord.com/download
- Script installs this via winget
- Or download manually

### VLC Media Player
**Download:** https://www.videolan.org/vlc/
- Script installs this via winget
- Or download manually

## 📊 Monitoring Tools (Optional)

### HWiNFO64 (Hardware Monitoring)
**Download:** https://www.hwinfo.com/download/
- Monitor temps, voltages, clocks
- Essential for checking X3D CCD temps
- Lightweight, minimal overhead

### MSI Afterburner (GPU Monitoring + OSD)
**Download:** https://www.msi.com/Landing/afterburner/graphics-cards
- GPU monitoring and overclocking
- In-game FPS overlay (RivaTuner)
- Works with any GPU brand

### LatencyMon (DPC Latency Analysis)
**Download:** https://www.resplendence.com/latencymon
- Diagnose micro-stutters
- Identify problematic drivers
- Critical for troubleshooting audio/network issues

## 🔧 Optional Gaming Software

### If You Need Epic Games
**Download:** https://www.epicgames.com/store/download
```powershell
winget install EpicGames.EpicGamesLauncher
```

### If You Stream (OBS Studio)
**Download:** https://obsproject.com/download
```powershell
winget install OBSProject.OBSStudio
```

## 📋 Installation Order (Recommended)

For a fresh Windows install, install in this order:

1. **Windows Updates** (get latest Windows 11)
2. **AMD Chipset Drivers**
3. **GPU Drivers** (NVIDIA or AMD)
4. **Motherboard BIOS Update** (if needed for X3D)
5. **Audio Drivers** (from motherboard manufacturer)
6. **Network Drivers** (Ethernet/WiFi)
7. **Run gaming-pc-setup.ps1**
8. **Reboot**
9. **Install monitoring tools** (HWiNFO64, MSI Afterburner)

## ⚠️ Important Notes

### For AMD Ryzen 7900X3D Users:

**BIOS Settings (Critical):**
- ✅ **Disable CPPC** (Collaborative Processor Performance Control)
  - Provides more consistent gaming performance
  - Prevents Windows scheduler confusion
- ✅ **Disable PBO** (Precision Boost Overdrive) - optional
  - X3D chips don't benefit much from PBO
  - Better temps with it off
- ✅ **Enable EXPO/XMP** for RAM
- ✅ **Disable C-States** (script does this in Windows, but also in BIOS)
- ✅ **Update to latest AGESA** (BIOS update)

**Windows Settings:**
- ✅ Script automatically detects X3D and optimizes
- ✅ Disables CPPC Preferred Cores in Windows
- ✅ Sets heterogeneous policy for V-Cache CCD
- ✅ Ensures Game Bar is disabled (critical!)

### Driver Update Strategy:

**Windows Update:** Let it run once, then pause for 1-2 weeks
**GPU Drivers:** Update when new games release or issues occur
**Chipset Drivers:** Update every 3-6 months
**BIOS:** Only update if you have issues or need X3D support
**Audio Drivers:** If working, don't update unless issues

## 🔗 Quick Reference Links

| Component | Official Site |
|-----------|--------------|
| AMD Chipset | https://www.amd.com/en/support |
| AMD Ryzen Master | https://www.amd.com/en/technologies/ryzen-master |
| NVIDIA Drivers | https://www.nvidia.com/Download/index.aspx |
| Motherboard BIOS | Check manufacturer website |
| HWiNFO64 | https://www.hwinfo.com/download/ |
| LatencyMon | https://www.resplendence.com/latencymon |
| MSI Afterburner | https://www.msi.com/Landing/afterburner |

## 💡 Pro Tips

### AMD Ryzen 7900X3D Specific:
1. **Use Xbox Game Bar disabled** - Script does this, critical for X3D
2. **Monitor CCD temps separately** - Use HWiNFO64 to see both CCDs
3. **CCD0 has V-Cache** - Should be cooler, used for games
4. **CCD1 no V-Cache** - Runs hotter, better for multi-thread
5. **Game on CCD0** - Windows should auto-schedule, script helps
6. **BIOS CPPC off** - More consistent than Windows scheduling

### General:
1. **Always use DDU** (Display Driver Uninstaller) before GPU driver updates
2. **Never install GeForce Experience** if you want privacy
3. **Motherboard website > Windows Update** for drivers
4. **Check BIOS version** before updating (write it down!)

## 🆘 Troubleshooting

### "Which drivers do I actually need?"
**Minimum required:**
- AMD Chipset Drivers
- GPU Drivers (NVIDIA or AMD)
- Audio drivers (usually automatic)

Everything else is optional!

### "Driver installation order matters?"
Yes! Always: Chipset → GPU → Audio → Network

### "NVIDIA drivers causing issues?"
1. Download DDU (Display Driver Uninstaller)
2. Boot Safe Mode
3. Run DDU, select "Clean and Restart"
4. Install NVIDIA driver fresh

### "AMD X3D not performing well?"
1. Check BIOS has latest AGESA (1.0.0.7+)
2. Disable CPPC in BIOS
3. Run this script (auto-detects X3D)
4. Check CCD temps with HWiNFO64
5. Ensure Game Bar is disabled

## 📅 Last Updated
Check manufacturer websites for latest versions.

**Script auto-detects AMD X3D CPUs and applies optimizations automatically!**
