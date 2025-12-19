# Gaming PC Setup Wizard - User Guide

## 🎯 What is the Setup Wizard?

The **Setup Wizard** is an interactive GUI program that guides you step-by-step through the entire Windows 11 gaming optimization process. No command-line experience needed!

![Wizard Interface](https://via.placeholder.com/800x500?text=Gaming+PC+Setup+Wizard)

## ✨ Features

- ✅ **Step-by-step guidance** - Never miss a critical step
- ✅ **Automated script execution** - Runs optimization scripts for you
- ✅ **Manual configuration guides** - Detailed instructions for NVIDIA, audio, etc.
- ✅ **Progress tracking** - See what's done and what's left
- ✅ **Built-in diagnostics** - Verify optimizations are working
- ✅ **Beginner-friendly** - Clear instructions with helpful buttons
- ✅ **No dependencies** - Uses Windows Forms (built into Windows)

## 🚀 Quick Start

### 1. Launch the Wizard

**Right-click** `setup-wizard.ps1` → **Run with PowerShell as Administrator**

Or from PowerShell (as Admin):
```powershell
.\setup-wizard.ps1
```

### 2. Follow the Steps

The wizard has **10 steps** that guide you through everything:

#### Step 1: Welcome
- Overview of the optimization process
- Create a System Restore point (recommended!)
- Detect Windows X-Lite if applicable

#### Step 2: System Check
- Verifies your hardware specs
- Checks for required scripts
- Shows current optimization status

#### Step 3: Run Main Script
- Executes `gaming-pc-setup-enhanced.ps1`
- Optional: Enable aggressive optimizations
- Watch progress in real-time

#### Step 4: Reboot Reminder
- Reminds you to reboot (CRITICAL!)
- Option to reboot now or later
- Skip if already rebooted

#### Step 5: NVIDIA Configuration
- Step-by-step NVIDIA Control Panel settings
- Optimized for maximum gaming performance
- Button to open NVIDIA Control Panel directly

#### Step 6: DTS Audio Setup
- Configure Windows audio settings
- Samsung Q990D specific instructions
- Exclusive mode & spatial audio setup

#### Step 7: Timer Tool (CRITICAL)
- **Most important step for micro-stutters!**
- Explains why timer tool is critical
- Test button to verify it works
- Usage instructions for different games

#### Step 8: Additional Settings
- Game Mode verification
- GPU Scheduling toggle recommendations
- Mouse settings for competitive gaming
- Background app management

#### Step 9: Verification
- Runs `diagnose-stutters.ps1`
- Verifies all optimizations are applied
- Shows what needs attention

#### Step 10: Complete
- Quick reference card for future use
- Troubleshooting guide
- Expected performance improvements

## 📋 What the Wizard Does

### Automated Tasks:
- ✅ System information gathering
- ✅ Pre-optimization checks
- ✅ Runs gaming-pc-setup-enhanced.ps1
- ✅ Post-setup diagnostics

### Guided Manual Tasks:
- ✅ NVIDIA Control Panel configuration
- ✅ DTS Audio setup
- ✅ Timer tool usage instructions
- ✅ Additional Windows settings
- ✅ GPU Scheduling recommendations

### Helpful Features:
- ✅ Direct buttons to open settings
- ✅ Checkboxes to track completion
- ✅ Progress indicator (Step X of 10)
- ✅ Reboot automation option
- ✅ Built-in script testing

## 🎮 Using the Wizard

### Navigation:
- **Next >** - Go to next step
- **< Previous** - Go back to previous step
- **Finish** - Close wizard (on last step)

### Tips:
1. **Don't skip steps** - Each is important!
2. **Read the instructions** - Especially for manual configuration
3. **Use the buttons** - They open relevant settings for you
4. **Check the boxes** - Track what you've completed
5. **Reboot when told** - Critical for many optimizations

## ⚠️ Important Notes

### Before Running:
1. **Create a System Restore point** (Wizard prompts you)
2. **Close all other programs**
3. **Save your work**
4. **Have 30-45 minutes available**

### During Setup:
1. **Follow steps in order**
2. **Don't skip the reboot** (Step 4)
3. **Actually configure NVIDIA** - don't just click through
4. **Test the timer tool** before marking it complete

### After Setup:
1. **MUST run timer-tool.ps1 before gaming** (every time!)
2. **Keep timer tool running during gameplay**
3. **Run diagnostics if stutters persist**

## 🔧 Troubleshooting

### Wizard Won't Launch:
```powershell
# Check execution policy
Get-ExecutionPolicy

# If restricted, set to RemoteSigned
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run as Administrator
Right-click → Run with PowerShell as Administrator
```

### Script Execution Failed:
- Check `gaming-pc-setup-enhanced.log` for details
- Verify all scripts are in the same folder
- Ensure you have Administrator privileges

### Settings Won't Open:
- Some buttons require specific software (e.g., NVIDIA Control Panel)
- Open settings manually if buttons don't work
- Follow the text instructions as backup

### Reboot Required But Don't Want to Reboot Now:
- It's safe to reboot later
- Just run the wizard again after reboot
- Jump to "Step 5: NVIDIA Configuration"

## 📁 File Requirements

The wizard needs these files in the same folder:

```
setup-wizard.ps1                 ← The wizard (this file)
gaming-pc-setup-enhanced.ps1     ← Main optimization script
timer-tool.ps1                   ← Timer resolution tool
diagnose-stutters.ps1            ← Diagnostic tool
game-launcher.ps1                ← Optional: Game launcher
extreme-privacy.ps1              ← Optional: Extra privacy
```

## 🆚 Wizard vs Manual

### Use the Wizard if:
- ✅ First time optimizing Windows for gaming
- ✅ You prefer guided step-by-step process
- ✅ Want to ensure you don't miss any steps
- ✅ Like GUI interfaces over command-line
- ✅ Need help with manual configuration (NVIDIA, audio)

### Use Manual Scripts if:
- ✅ You're experienced with PowerShell
- ✅ Want to automate without GUI
- ✅ Running on remote/headless systems
- ✅ Only need specific optimizations
- ✅ Prefer command-line control

## 💡 Pro Tips

### For Best Results:
1. **Run the wizard fresh after Windows install** - Clean slate = best results
2. **Follow ALL steps** - Skipping steps reduces effectiveness
3. **Actually configure NVIDIA** - Default settings are NOT optimal
4. **Test timer tool** - Verify it works before gaming
5. **Run diagnostics** - Confirm everything is applied

### Save Time:
1. **Create restore point first** - So you can skip that step
2. **Download drivers beforehand** - Have NVIDIA/audio drivers ready
3. **Read while scripts run** - Use script execution time to read ahead
4. **Bookmark Step 7** - You'll reference timer tool instructions often

### After First Run:
1. **Bookmark the wizard** - Easy to relaunch if needed
2. **Save Step 10 reference card** - Print or screenshot it
3. **Keep wizard folder** - You'll need timer-tool.ps1 for every gaming session

## 📞 Support

### If You Need Help:
1. **Read the error message** - Often tells you what's wrong
2. **Check log files** - `gaming-pc-setup-enhanced.log`
3. **Run diagnostics** - Step 9 in wizard
4. **Review CHANGES-ENHANCED.md** - Detailed technical docs
5. **Check README-ENHANCED.md** - FAQ and troubleshooting

### Common Issues:

**"Administrator privileges required"**
- Right-click script → Run as Administrator
- Or launch PowerShell as Admin first

**"Scripts not found"**
- Ensure all scripts are in same folder
- Check file names match exactly
- Don't rename files

**"NVIDIA Control Panel won't open"**
- Open manually: Right-click desktop → NVIDIA Control Panel
- Or search "NVIDIA Control Panel" in Start Menu
- Install NVIDIA drivers if missing

**"Audio settings don't apply"**
- Try different audio devices in Sound settings
- Update audio drivers
- Restart audio service

## 🎯 Success Checklist

After completing the wizard, you should have:

- ✅ Main setup script executed successfully
- ✅ Computer rebooted at least once
- ✅ NVIDIA Control Panel configured
- ✅ Audio settings optimized
- ✅ Timer tool tested and understood
- ✅ Diagnostics run and verified
- ✅ Reference card saved for future use

## 🏁 Final Step

**BEFORE EVERY GAMING SESSION:**
```powershell
.\timer-tool.ps1 -GameProcess "yourgame"
```

This is the #1 most important thing for eliminating micro-stutters!

---

**Enjoy your optimized gaming PC!** 🎮🚀
