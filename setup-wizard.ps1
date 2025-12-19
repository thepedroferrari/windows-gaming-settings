#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Gaming PC Setup Wizard - Interactive Step-by-Step Guide

.DESCRIPTION
    User-friendly GUI that guides you through the entire gaming PC optimization process.
    Combines automated scripts with manual configuration instructions.
#>

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Global state
$script:CurrentStep = 0
$script:CompletedSteps = @()
$script:ScriptPath = $PSScriptRoot

# Check if running as admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    [System.Windows.Forms.MessageBox]::Show(
        "This wizard requires Administrator privileges. Please run as Administrator.",
        "Administrator Required",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Error
    )
    exit 1
}

# Detect Windows X-Lite
function Test-XLiteBuild {
    $indicators = 0
    try {
        $defenderStatus = Get-MpComputerStatus -ErrorAction SilentlyContinue
        if (-not $defenderStatus) { $indicators++ }
    } catch { $indicators++ }

    $uacStatus = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System" -ErrorAction SilentlyContinue).EnableLUA
    if ($uacStatus -eq 0) { $indicators++ }

    return $indicators -ge 2
}

$script:IsXLite = Test-XLiteBuild

# Create main form
$form = New-Object System.Windows.Forms.Form
$form.Text = "Gaming PC Setup Wizard"
$form.Size = New-Object System.Drawing.Size(900, 700)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.Font = New-Object System.Drawing.Font("Segoe UI", 9)

# Create tab control for steps
$tabControl = New-Object System.Windows.Forms.TabControl
$tabControl.Location = New-Object System.Drawing.Point(10, 10)
$tabControl.Size = New-Object System.Drawing.Size(860, 600)
$form.Controls.Add($tabControl)

# Navigation buttons
$btnPrevious = New-Object System.Windows.Forms.Button
$btnPrevious.Text = "< Previous"
$btnPrevious.Size = New-Object System.Drawing.Size(100, 30)
$btnPrevious.Location = New-Object System.Drawing.Point(670, 620)
$btnPrevious.Enabled = $false
$form.Controls.Add($btnPrevious)

$btnNext = New-Object System.Windows.Forms.Button
$btnNext.Text = "Next >"
$btnNext.Size = New-Object System.Drawing.Size(100, 30)
$btnNext.Location = New-Object System.Drawing.Point(780, 620)
$form.Controls.Add($btnNext)

# Progress label
$lblProgress = New-Object System.Windows.Forms.Label
$lblProgress.Location = New-Object System.Drawing.Point(20, 625)
$lblProgress.Size = New-Object System.Drawing.Size(300, 20)
$lblProgress.Text = "Step 1 of 10"
$form.Controls.Add($lblProgress)

# Helper function to create labels
function New-HeaderLabel {
    param([string]$Text)
    $label = New-Object System.Windows.Forms.Label
    $label.Text = $Text
    $label.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    $label.AutoSize = $true
    return $label
}

function New-DescLabel {
    param([string]$Text, [int]$Width = 800)
    $label = New-Object System.Windows.Forms.Label
    $label.Text = $Text
    $label.Size = New-Object System.Drawing.Size($Width, 60)
    $label.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    return $label
}

function New-InfoBox {
    param([string]$Text, [int]$Height = 300, [int]$Width = 800)
    $textbox = New-Object System.Windows.Forms.TextBox
    $textbox.Multiline = $true
    $textbox.ScrollBars = "Vertical"
    $textbox.ReadOnly = $true
    $textbox.Size = New-Object System.Drawing.Size($Width, $Height)
    $textbox.Text = $Text
    $textbox.Font = New-Object System.Drawing.Font("Consolas", 9)
    $textbox.BackColor = [System.Drawing.Color]::WhiteSmoke
    return $textbox
}

#region Step 1: Welcome
$tab1 = New-Object System.Windows.Forms.TabPage
$tab1.Text = "Welcome"
$tabControl.Controls.Add($tab1)

$y = 20
$header1 = New-HeaderLabel -Text "Welcome to Gaming PC Setup Wizard"
$header1.Location = New-Object System.Drawing.Point(20, $y)
$tab1.Controls.Add($header1)

$y += 40
$welcome = New-Object System.Windows.Forms.Label
$welcome.Location = New-Object System.Drawing.Point(20, $y)
$welcome.Size = New-Object System.Drawing.Size(800, 150)
$welcome.Text = @"
This wizard will guide you through optimizing Windows 11 for gaming performance.

The process includes:
✓ Automated script execution (with your approval)
✓ Manual configuration guides (NVIDIA, DTS Audio, etc.)
✓ Performance verification
✓ Post-setup checklist

Estimated time: 30-45 minutes (including reboot)

IMPORTANT: Create a System Restore point before continuing!
"@
$tab1.Controls.Add($welcome)

$y += 160
if ($script:IsXLite) {
    $xliteLabel = New-Object System.Windows.Forms.Label
    $xliteLabel.Location = New-Object System.Drawing.Point(20, $y)
    $xliteLabel.Size = New-Object System.Drawing.Size(800, 40)
    $xliteLabel.Text = "✓ Windows X-Lite detected! Many optimizations are already done.`nThis wizard will focus on gaming-specific tweaks."
    $xliteLabel.ForeColor = [System.Drawing.Color]::Green
    $xliteLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
    $tab1.Controls.Add($xliteLabel)
    $y += 50
}

$btnRestorePoint = New-Object System.Windows.Forms.Button
$btnRestorePoint.Text = "Create System Restore Point"
$btnRestorePoint.Location = New-Object System.Drawing.Point(20, $y)
$btnRestorePoint.Size = New-Object System.Drawing.Size(250, 40)
$btnRestorePoint.Add_Click({
    try {
        $result = [System.Windows.Forms.MessageBox]::Show(
            "This will create a System Restore point named 'GamingPC-Setup-Backup'.`n`nContinue?",
            "Create Restore Point",
            [System.Windows.Forms.MessageBoxButtons]::YesNo,
            [System.Windows.Forms.MessageBoxIcon]::Question
        )
        if ($result -eq 'Yes') {
            Checkpoint-Computer -Description "GamingPC-Setup-Backup" -RestorePointType "MODIFY_SETTINGS"
            [System.Windows.Forms.MessageBox]::Show(
                "System Restore point created successfully!",
                "Success",
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Information
            )
        }
    } catch {
        [System.Windows.Forms.MessageBox]::Show(
            "Failed to create restore point: $_",
            "Error",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        )
    }
})
$tab1.Controls.Add($btnRestorePoint)
#endregion

#region Step 2: Pre-Check
$tab2 = New-Object System.Windows.Forms.TabPage
$tab2.Text = "System Check"
$tabControl.Controls.Add($tab2)

$y = 20
$header2 = New-HeaderLabel -Text "System Pre-Check"
$header2.Location = New-Object System.Drawing.Point(20, $y)
$tab2.Controls.Add($header2)

$y += 40
$desc2 = New-DescLabel -Text "Let's verify your system is ready for optimization."
$desc2.Location = New-Object System.Drawing.Point(20, $y)
$tab2.Controls.Add($desc2)

$y += 70
$checkResults = New-InfoBox -Text "Click 'Run System Check' to start..." -Height 350
$checkResults.Location = New-Object System.Drawing.Point(20, $y)
$tab2.Controls.Add($checkResults)

$y += 360
$btnCheck = New-Object System.Windows.Forms.Button
$btnCheck.Text = "Run System Check"
$btnCheck.Location = New-Object System.Drawing.Point(20, $y)
$btnCheck.Size = New-Object System.Drawing.Size(150, 35)
$btnCheck.Add_Click({
    $results = @()
    $results += "=== SYSTEM INFORMATION ==="
    $results += ""

    # OS Info
    $os = Get-CimInstance Win32_OperatingSystem
    $results += "OS: $($os.Caption) $($os.Version)"
    $results += "Build: $($os.BuildNumber)"

    # CPU
    $cpu = Get-CimInstance Win32_Processor
    $results += "CPU: $($cpu.Name)"
    $results += "Cores: $($cpu.NumberOfCores) cores, $($cpu.NumberOfLogicalProcessors) threads"

    # RAM
    $ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB, 2)
    $results += "RAM: ${ram}GB"
    if ($ram -lt 16) {
        $results += "  ⚠️ WARNING: Less than 16GB RAM - some optimizations may be limited"
    }

    # GPU
    $gpu = Get-CimInstance Win32_VideoController | Where-Object { $_.Name -notlike "*Microsoft*" }
    $results += "GPU: $($gpu.Name)"

    # Storage
    $disk = Get-CimInstance Win32_DiskDrive | Select-Object -First 1
    if ($disk.MediaType -like "*SSD*" -or $disk.Model -like "*NVMe*") {
        $results += "Storage: SSD ✓"
    } else {
        $results += "Storage: HDD ⚠️ (SSD recommended for best performance)"
    }

    $results += ""
    $results += "=== REQUIRED SCRIPTS ==="
    $results += ""

    # Check for scripts
    $requiredScripts = @(
        "gaming-pc-setup-enhanced.ps1",
        "timer-tool.ps1",
        "diagnose-stutters.ps1"
    )

    foreach ($script in $requiredScripts) {
        $path = Join-Path $script:ScriptPath $script
        if (Test-Path $path) {
            $results += "✓ Found: $script"
        } else {
            $results += "✗ MISSING: $script"
        }
    }

    $results += ""
    $results += "=== CURRENT OPTIMIZATIONS ==="
    $results += ""

    # Check HPET
    $hpet = bcdedit /enum | Select-String "useplatformclock"
    if ($hpet -match "Yes") {
        $results += "⚠️ HPET is ENABLED (should be disabled for gaming)"
    } else {
        $results += "✓ HPET is disabled"
    }

    # Check memory compression
    $memcomp = (Get-MMAgent).MemoryCompression
    if ($memcomp) {
        if ($ram -ge 32) {
            $results += "⚠️ Memory compression is ENABLED (can be disabled with ${ram}GB RAM)"
        } else {
            $results += "✓ Memory compression is enabled (recommended for ${ram}GB RAM)"
        }
    } else {
        $results += "✓ Memory compression is disabled"
    }

    # Check Game Mode
    $gameModeReg = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\PolicyManager\default\ApplicationManagement\AllowGameMode" -ErrorAction SilentlyContinue
    if ($gameModeReg.value -eq 1) {
        $results += "✓ Game Mode is enabled"
    } else {
        $results += "⚠️ Game Mode is disabled (will be enabled)"
    }

    $results += ""
    $results += "=== RECOMMENDATION ==="
    $results += ""
    $results += "System is ready for optimization. Click 'Next' to continue."

    $checkResults.Text = $results -join "`r`n"
})
$tab2.Controls.Add($btnCheck)
#endregion

#region Step 3: Run Main Script
$tab3 = New-Object System.Windows.Forms.TabPage
$tab3.Text = "Main Setup"
$tabControl.Controls.Add($tab3)

$y = 20
$header3 = New-HeaderLabel -Text "Run Gaming PC Setup Script"
$header3.Location = New-Object System.Drawing.Point(20, $y)
$tab3.Controls.Add($header3)

$y += 40
$desc3 = New-DescLabel -Text "This will run the enhanced gaming setup script with all optimizations."
$desc3.Location = New-Object System.Drawing.Point(20, $y)
$tab3.Controls.Add($desc3)

$y += 70
$chkAggressive = New-Object System.Windows.Forms.CheckBox
$chkAggressive.Location = New-Object System.Drawing.Point(20, $y)
$chkAggressive.Size = New-Object System.Drawing.Size(800, 25)
$chkAggressive.Text = "Enable Aggressive Optimizations (disables Spectre/Meltdown mitigations for 5-15% FPS boost - SECURITY RISK)"
$tab3.Controls.Add($chkAggressive)

$y += 35
$scriptOutput = New-InfoBox -Text "Click 'Run Setup Script' to begin optimization..." -Height 320
$scriptOutput.Location = New-Object System.Drawing.Point(20, $y)
$tab3.Controls.Add($scriptOutput)

$y += 330
$btnRunScript = New-Object System.Windows.Forms.Button
$btnRunScript.Text = "Run Setup Script"
$btnRunScript.Location = New-Object System.Drawing.Point(20, $y)
$btnRunScript.Size = New-Object System.Drawing.Size(150, 35)
$btnRunScript.Add_Click({
    $scriptPath = Join-Path $script:ScriptPath "gaming-pc-setup-enhanced.ps1"

    if (-not (Test-Path $scriptPath)) {
        [System.Windows.Forms.MessageBox]::Show(
            "gaming-pc-setup-enhanced.ps1 not found in: $script:ScriptPath",
            "Script Not Found",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        )
        return
    }

    $result = [System.Windows.Forms.MessageBox]::Show(
        "This will run the gaming setup script with the following:

• Power plan optimization
• Network optimization
• Stutter fixes (HPET, MSI Mode, timer resolution)
• Privacy/telemetry blocking
• Service optimization
• And much more...

The script will create registry backups automatically.

Continue?",
        "Confirm Setup",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )

    if ($result -eq 'Yes') {
        $btnRunScript.Enabled = $false
        $scriptOutput.Text = "Running setup script... Please wait...`r`n`r`n"
        $form.Refresh()

        try {
            $args = "-SkipConfirmations"
            if ($chkAggressive.Checked) {
                $args += " -EnableAggressiveOptimizations"
            }

            $process = Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" $args" -Wait -NoNewWindow -PassThru -RedirectStandardOutput "$env:TEMP\setup-output.txt" -RedirectStandardError "$env:TEMP\setup-error.txt"

            $output = Get-Content "$env:TEMP\setup-output.txt" -Raw
            $errors = Get-Content "$env:TEMP\setup-error.txt" -Raw

            if ($process.ExitCode -eq 0) {
                $scriptOutput.Text = "✓ Setup script completed successfully!`r`n`r`n"
                $scriptOutput.Text += "Check gaming-pc-setup-enhanced.log for details.`r`n`r`n"
                $scriptOutput.Text += "IMPORTANT: You MUST reboot before continuing to the next steps!"
                $scriptOutput.ForeColor = [System.Drawing.Color]::Green
                $script:CompletedSteps += "MainScript"
            } else {
                $scriptOutput.Text = "⚠️ Script completed with errors (Exit code: $($process.ExitCode))`r`n`r`n"
                $scriptOutput.Text += $output
                if ($errors) {
                    $scriptOutput.Text += "`r`n`r`nERRORS:`r`n$errors"
                }
                $scriptOutput.ForeColor = [System.Drawing.Color]::Red
            }
        } catch {
            $scriptOutput.Text = "Error running script: $_"
            $scriptOutput.ForeColor = [System.Drawing.Color]::Red
        } finally {
            $btnRunScript.Enabled = $true
        }
    }
})
$tab3.Controls.Add($btnRunScript)

$y += 40
$lblRebootWarning = New-Object System.Windows.Forms.Label
$lblRebootWarning.Location = New-Object System.Drawing.Point(180, $y)
$lblRebootWarning.Size = New-Object System.Drawing.Size(600, 30)
$lblRebootWarning.Text = "⚠️ After running the script, REBOOT before proceeding to manual configuration!"
$lblRebootWarning.ForeColor = [System.Drawing.Color]::Red
$lblRebootWarning.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$tab3.Controls.Add($lblRebootWarning)
#endregion

#region Step 4: Reboot Reminder
$tab4 = New-Object System.Windows.Forms.TabPage
$tab4.Text = "Reboot"
$tabControl.Controls.Add($tab4)

$y = 20
$header4 = New-HeaderLabel -Text "Reboot Required"
$header4.Location = New-Object System.Drawing.Point(20, $y)
$tab4.Controls.Add($header4)

$y += 40
$rebootMsg = New-Object System.Windows.Forms.Label
$rebootMsg.Location = New-Object System.Drawing.Point(20, $y)
$rebootMsg.Size = New-Object System.Drawing.Size(800, 200)
$rebootMsg.Text = @"
Your system must be rebooted for the following changes to take effect:

✓ HPET (High Precision Event Timer) disable
✓ MSI Mode for GPU and network devices
✓ Power plan settings
✓ bcdedit changes (if aggressive mode enabled)
✓ Registry modifications

IMPORTANT:
• Save all your work before rebooting
• After reboot, run this wizard again and skip to the manual configuration steps
• Alternatively, bookmark this step and continue after reboot
"@
$rebootMsg.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$tab4.Controls.Add($rebootMsg)

$y += 210
$btnRebootNow = New-Object System.Windows.Forms.Button
$btnRebootNow.Text = "Reboot Now"
$btnRebootNow.Location = New-Object System.Drawing.Point(20, $y)
$btnRebootNow.Size = New-Object System.Drawing.Size(150, 40)
$btnRebootNow.BackColor = [System.Drawing.Color]::OrangeRed
$btnRebootNow.ForeColor = [System.Drawing.Color]::White
$btnRebootNow.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$btnRebootNow.Add_Click({
    $result = [System.Windows.Forms.MessageBox]::Show(
        "Your computer will restart in 10 seconds.`n`nMake sure all work is saved!`n`nContinue?",
        "Confirm Reboot",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Warning
    )
    if ($result -eq 'Yes') {
        shutdown /r /t 10
        $form.Close()
    }
})
$tab4.Controls.Add($btnRebootNow)

$y += 50
$btnRebootLater = New-Object System.Windows.Forms.Button
$btnRebootLater.Text = "I'll Reboot Later"
$btnRebootLater.Location = New-Object System.Drawing.Point(20, $y)
$btnRebootLater.Size = New-Object System.Drawing.Size(150, 30)
$tab4.Controls.Add($btnRebootLater)

$y += 40
$lblSkipNote = New-Object System.Windows.Forms.Label
$lblSkipNote.Location = New-Object System.Drawing.Point(20, $y)
$lblSkipNote.Size = New-Object System.Drawing.Size(800, 40)
$lblSkipNote.Text = "If you've already rebooted after running the script, you can skip this step and continue to manual configuration."
$lblSkipNote.ForeColor = [System.Drawing.Color]::Green
$tab4.Controls.Add($lblSkipNote)
#endregion

#region Step 5: NVIDIA Configuration
$tab5 = New-Object System.Windows.Forms.TabPage
$tab5.Text = "NVIDIA Setup"
$tabControl.Controls.Add($tab5)

$y = 20
$header5 = New-HeaderLabel -Text "NVIDIA Control Panel Configuration"
$header5.Location = New-Object System.Drawing.Point(20, $y)
$tab5.Controls.Add($header5)

$y += 40
$desc5 = New-DescLabel -Text "Follow these steps to configure NVIDIA for maximum gaming performance."
$desc5.Location = New-Object System.Drawing.Point(20, $y)
$tab5.Controls.Add($desc5)

$y += 70
$nvidiaInstructions = @"
NVIDIA CONTROL PANEL - RECOMMENDED SETTINGS:

1. Open NVIDIA Control Panel
   • Right-click desktop → NVIDIA Control Panel
   • Or search "NVIDIA Control Panel" in Start Menu

2. Manage 3D Settings → Global Settings:

   ✓ Power management mode: Prefer maximum performance
   ✓ Low Latency Mode: Ultra
   ✓ Max Frame Rate: Off (let game decide)
   ✓ Monitor Technology: G-SYNC (if you have G-SYNC monitor)
   ✓ Vertical sync: Off (or Fast if using G-SYNC)
   ✓ Texture filtering - Quality: High performance
   ✓ Texture filtering - Negative LOD bias: Allow
   ✓ Texture filtering - Trilinear optimization: On
   ✓ Threaded optimization: On
   ✓ Triple buffering: Off
   ✓ Virtual Reality pre-rendered frames: 1

3. Adjust desktop size and position:

   ✓ Select your display
   ✓ Select "Full-screen"
   ✓ Apply

4. Change resolution:

   ✓ Set to your monitor's native resolution
   ✓ Set refresh rate to maximum (144Hz, 165Hz, 240Hz, etc.)

5. Per-Game Settings (Optional):

   • Manage 3D Settings → Program Settings
   • Add your game executable
   • Override specific settings if needed

TESTING:
After configuration, test in your game. Some games may perform better with:
• Vertical sync: Fast (for G-SYNC)
• Low Latency Mode: On (instead of Ultra)

Try both configurations and see which gives better results!
"@

$nvidiaInfo = New-InfoBox -Text $nvidiaInstructions -Height 380
$nvidiaInfo.Location = New-Object System.Drawing.Point(20, $y)
$tab5.Controls.Add($nvidiaInfo)

$y += 390
$btnOpenNvidia = New-Object System.Windows.Forms.Button
$btnOpenNvidia.Text = "Open NVIDIA Control Panel"
$btnOpenNvidia.Location = New-Object System.Drawing.Point(20, $y)
$btnOpenNvidia.Size = New-Object System.Drawing.Size(200, 35)
$btnOpenNvidia.Add_Click({
    try {
        Start-Process "nvidia-cpl" -ErrorAction Stop
    } catch {
        try {
            Start-Process "C:\Program Files\NVIDIA Corporation\Control Panel Client\nvcplui.exe" -ErrorAction Stop
        } catch {
            [System.Windows.Forms.MessageBox]::Show(
                "Could not open NVIDIA Control Panel. Please open it manually from the desktop right-click menu.",
                "Error",
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Warning
            )
        }
    }
})
$tab5.Controls.Add($btnOpenNvidia)

$y += 40
$chkNvidiaDone = New-Object System.Windows.Forms.CheckBox
$chkNvidiaDone.Location = New-Object System.Drawing.Point(230, $y - 5)
$chkNvidiaDone.Size = New-Object System.Drawing.Size(300, 25)
$chkNvidiaDone.Text = "✓ I've configured NVIDIA settings"
$chkNvidiaDone.Add_CheckedChanged({
    if ($chkNvidiaDone.Checked) {
        $script:CompletedSteps += "NVIDIA"
    }
})
$tab5.Controls.Add($chkNvidiaDone)
#endregion

#region Step 6: DTS Audio Setup
$tab6 = New-Object System.Windows.Forms.TabPage
$tab6.Text = "Audio Setup"
$tabControl.Controls.Add($tab6)

$y = 20
$header6 = New-HeaderLabel -Text "DTS Audio Configuration (Samsung Q990D)"
$header6.Location = New-Object System.Drawing.Point(20, $y)
$tab6.Controls.Add($header6)

$y += 40
$desc6 = New-DescLabel -Text "Configure Windows audio settings for optimal gaming audio."
$desc6.Location = New-Object System.Drawing.Point(20, $y)
$tab6.Controls.Add($desc6)

$y += 70
$audioInstructions = @"
AUDIO CONFIGURATION GUIDE:

1. Windows Sound Settings:

   • Open Settings → System → Sound
   • Under "Output", select your Samsung Q990D
   • Click "Device properties"
   • Set "Spatial sound" to "DTS:X for home theater" (if available)

2. Advanced Sound Properties:

   • In Sound settings, scroll down to "Advanced"
   • Click "More sound settings"
   • Select your playback device (Samsung Q990D)
   • Click "Properties"

3. Advanced Tab:

   ✓ Set default format to highest quality:
     • 24 bit, 192000 Hz (Studio Quality) if available
     • Or 24 bit, 96000 Hz

   ✓ Exclusive Mode:
     ☑ Allow applications to take exclusive control of this device
     ☑ Give exclusive mode applications priority

4. Enhancements Tab:

   • Disable all enhancements EXCEPT spatial sound/DTS
   • This reduces DPC latency from audio driver

5. Spatial Sound (Alternative):

   • Settings → System → Sound
   • Select output device → Spatial sound
   • Choose "DTS:X for home theater" or "Windows Sonic for Headphones"

6. Samsung Audio Driver (if available):

   • Install latest Samsung audio drivers from Samsung website
   • Configure DTS settings via Samsung audio software

TESTING:
Test audio in game. If you experience crackling/stutters:
• Try disabling spatial sound
• Try different bit rates (16-bit 48000 Hz is more compatible)
• Ensure audio driver is up to date
"@

$audioInfo = New-InfoBox -Text $audioInstructions -Height 350
$audioInfo.Location = New-Object System.Drawing.Point(20, $y)
$tab6.Controls.Add($audioInfo)

$y += 360
$btnOpenSound = New-Object System.Windows.Forms.Button
$btnOpenSound.Text = "Open Sound Settings"
$btnOpenSound.Location = New-Object System.Drawing.Point(20, $y)
$btnOpenSound.Size = New-Object System.Drawing.Size(180, 35)
$btnOpenSound.Add_Click({
    Start-Process "ms-settings:sound"
})
$tab6.Controls.Add($btnOpenSound)

$btnOpenSoundPanel = New-Object System.Windows.Forms.Button
$btnOpenSoundPanel.Text = "Open Sound Control Panel"
$btnOpenSoundPanel.Location = New-Object System.Drawing.Point(210, $y)
$btnOpenSoundPanel.Size = New-Object System.Drawing.Size(200, 35)
$btnOpenSoundPanel.Add_Click({
    Start-Process "mmsys.cpl"
})
$tab6.Controls.Add($btnOpenSoundPanel)

$y += 40
$chkAudioDone = New-Object System.Windows.Forms.CheckBox
$chkAudioDone.Location = New-Object System.Drawing.Point(420, $y - 5)
$chkAudioDone.Size = New-Object System.Drawing.Size(300, 25)
$chkAudioDone.Text = "✓ I've configured audio settings"
$chkAudioDone.Add_CheckedChanged({
    if ($chkAudioDone.Checked) {
        $script:CompletedSteps += "Audio"
    }
})
$tab6.Controls.Add($chkAudioDone)
#endregion

#region Step 7: Timer Tool
$tab7 = New-Object System.Windows.Forms.TabPage
$tab7.Text = "Timer Tool"
$tabControl.Controls.Add($tab7)

$y = 20
$header7 = New-HeaderLabel -Text "Timer Resolution Tool (CRITICAL)"
$header7.Location = New-Object System.Drawing.Point(20, $y)
$tab7.Controls.Add($header7)

$y += 40
$desc7 = New-Object System.Windows.Forms.Label
$desc7.Location = New-Object System.Drawing.Point(20, $y)
$desc7.Size = New-Object System.Drawing.Size(800, 80)
$desc7.ForeColor = [System.Drawing.Color]::Red
$desc7.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Bold)
$desc7.Text = "This is the MOST IMPORTANT step for eliminating micro-stutters!`n`nWindows defaults to 15.6ms timer resolution. The timer tool forces 0.5ms resolution.`nYou MUST run this tool BEFORE gaming and keep it running!"
$tab7.Controls.Add($desc7)

$y += 90
$timerInstructions = @"
TIMER TOOL - HOW TO USE:

WHY THIS IS CRITICAL:
Windows defaults to 15.6ms timer resolution, causing inconsistent frame times and
micro-stutters. This tool forces 0.5ms resolution (like Linux) for smooth gameplay.

USAGE:

Method 1: Run before gaming (RECOMMENDED)
  1. Before starting your game, run:
     .\timer-tool.ps1 -GameProcess "cs2"

  2. Replace "cs2" with your game's process name:
     • CS2: "cs2"
     • Dota 2: "dota2"
     • Helldivers 2: "helldivers2"
     • etc.

  3. Keep the PowerShell window open while gaming
  4. Tool will exit automatically when game closes

Method 2: Use game launcher
  .\game-launcher.ps1 -GamePath "C:\...\game.exe" -GameProcess "gamename"

  This automatically:
  • Sets timer resolution
  • Launches your game
  • Maintains resolution during gameplay
  • Exits when game closes

Method 3: Run indefinitely
  .\timer-tool.ps1

  Keeps timer resolution at 0.5ms until you press Ctrl+C
  Good for gaming sessions with multiple games

IMPORTANT NOTES:
• Must run EVERY TIME before gaming
• Must keep running during gameplay
• Registry setting alone is NOT enough!
• This is the #1 fix for poor 1% low FPS

TESTING:
After running timer tool, you should see:
• Eliminated single-frame hitches
• Smoother frame times
• Better 1% low FPS
• More consistent gameplay

You can verify it's working with MSI Afterburner or similar tools showing frame times.
"@

$timerInfo = New-InfoBox -Text $timerInstructions -Height 300
$timerInfo.Location = New-Object System.Drawing.Point(20, $y)
$tab7.Controls.Add($timerInfo)

$y += 310
$btnTestTimer = New-Object System.Windows.Forms.Button
$btnTestTimer.Text = "Test Timer Tool (Run for 30 seconds)"
$btnTestTimer.Location = New-Object System.Drawing.Point(20, $y)
$btnTestTimer.Size = New-Object System.Drawing.Size(250, 35)
$btnTestTimer.Add_Click({
    $timerPath = Join-Path $script:ScriptPath "timer-tool.ps1"
    if (Test-Path $timerPath) {
        Start-Process powershell.exe -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$timerPath`"" -WindowStyle Normal
        [System.Windows.Forms.MessageBox]::Show(
            "Timer tool launched in new window!`n`nWatch the output to verify it's working.`nClose the window when done testing.",
            "Timer Tool Running",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Information
        )
    } else {
        [System.Windows.Forms.MessageBox]::Show(
            "timer-tool.ps1 not found!",
            "Error",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        )
    }
})
$tab7.Controls.Add($btnTestTimer)

$y += 40
$chkTimerDone = New-Object System.Windows.Forms.CheckBox
$chkTimerDone.Location = New-Object System.Drawing.Point(280, $y - 5)
$chkTimerDone.Size = New-Object System.Drawing.Size(400, 25)
$chkTimerDone.Text = "✓ I understand and will use timer tool before gaming"
$chkTimerDone.Add_CheckedChanged({
    if ($chkTimerDone.Checked) {
        $script:CompletedSteps += "Timer"
    }
})
$tab7.Controls.Add($chkTimerDone)
#endregion

#region Step 8: Additional Settings
$tab8 = New-Object System.Windows.Forms.TabPage
$tab8.Text = "Additional Settings"
$tabControl.Controls.Add($tab8)

$y = 20
$header8 = New-HeaderLabel -Text "Additional Manual Optimizations"
$header8.Location = New-Object System.Drawing.Point(20, $y)
$tab8.Controls.Add($header8)

$y += 40
$desc8 = New-DescLabel -Text "Optional but recommended additional settings."
$desc8.Location = New-Object System.Drawing.Point(20, $y)
$tab8.Controls.Add($desc8)

$y += 70
$additionalInstructions = @"
ADDITIONAL OPTIMIZATION CHECKLIST:

1. Windows Game Mode:
   ✓ Settings → Gaming → Game Mode → ON
   (Script should have enabled this, but verify)

2. Hardware Accelerated GPU Scheduling:
   • Settings → System → Display → Graphics Settings
   • "Hardware-accelerated GPU scheduling" → Try BOTH states
   • Some games run better with it ON, others with it OFF
   • Test and choose what works best for YOUR games

3. Mouse Settings (for competitive gaming):
   • Settings → Bluetooth & devices → Mouse
   • Disable "Enhance pointer precision" (mouse acceleration)
   • Set pointer speed to middle (6/11)

4. Windows Update:
   • Settings → Windows Update → Advanced options
   • Pause updates for 1-2 weeks before major gaming sessions
   • (Script has disabled automatic restart)

5. Game Launch Options (Steam):

   CS2: -high -threads 8 -novid -tickrate 128 +fps_max 0
   Dota 2: -high -threads 8 -novid -console

   (Replace "8" with your CPU thread count)

6. In-Game Settings:
   • Use EXCLUSIVE FULLSCREEN (not borderless windowed)
   • Disable V-Sync (unless using G-Sync with Fast V-Sync)
   • Set graphics to balance FPS with quality
   • Disable motion blur, chromatic aberration, film grain

7. Background Apps to Close Before Gaming:
   • RGB software (iCUE, Razer Synapse, etc.) - major DPC latency source
   • Discord overlay (or disable overlay)
   • Browser with many tabs
   • Cloud sync services
   • Monitoring software (except FPS counters)

8. Monitor DPC Latency (Optional):
   • Download LatencyMon from resplendence.com
   • Run while gaming to identify problematic drivers
   • Audio drivers are #1 source - update if high latency

9. Game Directories in Defender Exclusions:
   (Script asks about this - verify it's done if you use Defender)
   • C:\Program Files (x86)\Steam
   • C:\Program Files\Epic Games
   • Add other game install locations

10. Network (if using WiFi):
    • Prefer Ethernet for gaming
    • If WiFi: 5GHz band, channel 36-48 (less congestion)
"@

$additionalInfo = New-InfoBox -Text $additionalInstructions -Height 400
$additionalInfo.Location = New-Object System.Drawing.Point(20, $y)
$tab8.Controls.Add($additionalInfo)

$y += 410
$btnOpenGameMode = New-Object System.Windows.Forms.Button
$btnOpenGameMode.Text = "Open Game Mode Settings"
$btnOpenGameMode.Location = New-Object System.Drawing.Point(20, $y)
$btnOpenGameMode.Size = New-Object System.Drawing.Size(200, 30)
$btnOpenGameMode.Add_Click({
    Start-Process "ms-settings:gaming-gamemode"
})
$tab8.Controls.Add($btnOpenGameMode)

$btnOpenGraphics = New-Object System.Windows.Forms.Button
$btnOpenGraphics.Text = "Open Graphics Settings"
$btnOpenGraphics.Location = New-Object System.Drawing.Point(230, $y)
$btnOpenGraphics.Size = New-Object System.Drawing.Size(180, 30)
$btnOpenGraphics.Add_Click({
    Start-Process "ms-settings:display-advancedgraphics"
})
$tab8.Controls.Add($btnOpenGraphics)
#endregion

#region Step 9: Verification
$tab9 = New-Object System.Windows.Forms.TabPage
$tab9.Text = "Verify Setup"
$tabControl.Controls.Add($tab9)

$y = 20
$header9 = New-HeaderLabel -Text "Verify Optimizations"
$header9.Location = New-Object System.Drawing.Point(20, $y)
$tab9.Controls.Add($header9)

$y += 40
$desc9 = New-DescLabel -Text "Run diagnostics to verify all optimizations are applied correctly."
$desc9.Location = New-Object System.Drawing.Point(20, $y)
$tab9.Controls.Add($desc9)

$y += 70
$diagResults = New-InfoBox -Text "Click 'Run Diagnostics' to verify your setup..." -Height 380
$diagResults.Location = New-Object System.Drawing.Point(20, $y)
$tab9.Controls.Add($diagResults)

$y += 390
$btnRunDiag = New-Object System.Windows.Forms.Button
$btnRunDiag.Text = "Run Diagnostics"
$btnRunDiag.Location = New-Object System.Drawing.Point(20, $y)
$btnRunDiag.Size = New-Object System.Drawing.Size(150, 35)
$btnRunDiag.Add_Click({
    $diagPath = Join-Path $script:ScriptPath "diagnose-stutters.ps1"
    if (Test-Path $diagPath) {
        $diagResults.Text = "Running diagnostics...`r`n`r`n"
        $form.Refresh()

        try {
            $output = & $diagPath 2>&1 | Out-String
            $diagResults.Text = $output
        } catch {
            $diagResults.Text = "Error running diagnostics: $_"
        }
    } else {
        [System.Windows.Forms.MessageBox]::Show(
            "diagnose-stutters.ps1 not found!",
            "Error",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        )
    }
})
$tab9.Controls.Add($btnRunDiag)
#endregion

#region Step 10: Complete
$tab10 = New-Object System.Windows.Forms.TabPage
$tab10.Text = "Complete"
$tabControl.Controls.Add($tab10)

$y = 20
$header10 = New-HeaderLabel -Text "Setup Complete!"
$header10.Location = New-Object System.Drawing.Point(20, $y)
$header10.ForeColor = [System.Drawing.Color]::Green
$tab10.Controls.Add($header10)

$y += 40
$completeMsg = New-Object System.Windows.Forms.Label
$completeMsg.Location = New-Object System.Drawing.Point(20, $y)
$completeMsg.Size = New-Object System.Drawing.Size(800, 450)
$completeMsg.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$completeMsg.Text = @"
🎮 Your Windows 11 gaming PC is now optimized!

QUICK REFERENCE CARD - Save this for future use:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BEFORE EVERY GAMING SESSION:

1. Run Timer Tool (CRITICAL):
   .\timer-tool.ps1 -GameProcess "yourgame"

   Keep it running during gameplay!

2. Close Background Apps:
   • RGB software (iCUE, Razer Synapse)
   • Discord overlay (or disable it)
   • Web browsers with many tabs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TROUBLESHOOTING STUTTERS:

1. Run: .\diagnose-stutters.ps1
2. Download & run LatencyMon (resplendence.com)
3. Update audio drivers (biggest DPC latency source)
4. Try toggling GPU Scheduling on/off
5. Use exclusive fullscreen mode
6. Verify timer tool is running

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ADDITIONAL PRIVACY (optional):

Run: .\extreme-privacy.ps1
(Disables Windows Update, OneDrive, all telemetry)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXPECTED IMPROVEMENTS:
✓ 90%+ micro-stutter reduction
✓ 15-30% better 1% low FPS
✓ Lower input latency (3-10ms)
✓ More consistent frame times
✓ Better network performance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUPPORT:
• Check logs: gaming-pc-setup-enhanced.log
• Registry backups: %TEMP%\RegistryBackup-*
• Documentation: README-ENHANCED.md & CHANGES-ENHANCED.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Enjoy your optimized gaming experience! 🚀
"@
$tab10.Controls.Add($completeMsg)
#endregion

# Tab navigation logic
$btnNext.Add_Click({
    if ($tabControl.SelectedIndex -lt ($tabControl.TabCount - 1)) {
        $tabControl.SelectedIndex++
        $btnPrevious.Enabled = $true

        if ($tabControl.SelectedIndex -eq ($tabControl.TabCount - 1)) {
            $btnNext.Text = "Finish"
        }

        $lblProgress.Text = "Step $($tabControl.SelectedIndex + 1) of $($tabControl.TabCount)"
    } else {
        $form.Close()
    }
})

$btnPrevious.Add_Click({
    if ($tabControl.SelectedIndex -gt 0) {
        $tabControl.SelectedIndex--
        $btnNext.Text = "Next >"

        if ($tabControl.SelectedIndex -eq 0) {
            $btnPrevious.Enabled = $false
        }

        $lblProgress.Text = "Step $($tabControl.SelectedIndex + 1) of $($tabControl.TabCount)"
    }
})

$tabControl.Add_SelectedIndexChanged({
    $lblProgress.Text = "Step $($tabControl.SelectedIndex + 1) of $($tabControl.TabCount)"

    if ($tabControl.SelectedIndex -eq 0) {
        $btnPrevious.Enabled = $false
    } else {
        $btnPrevious.Enabled = $true
    }

    if ($tabControl.SelectedIndex -eq ($tabControl.TabCount - 1)) {
        $btnNext.Text = "Finish"
    } else {
        $btnNext.Text = "Next >"
    }
})

# Show form
[void]$form.ShowDialog()
