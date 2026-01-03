<#
.SYNOPSIS
    One-click installer and launcher for a reproducible FPS + frametime benchmark stack.
.DESCRIPTION
    This script installs and launches the minimum free tools required to produce
    credible before/after FPS and frametime results:
      - CapFrameX (frametime capture, 1%/0.1% lows)
      - Unigine Superposition (repeatable GPU benchmark)
      - LatencyMon (DPC/ISR latency diagnostics)

    The script is intentionally verbose and transparent. It explains:
      - What each tool does
      - Why it is included
      - What configuration is required for repeatable runs
      - How to launch the tools and capture results

    Configuration is done via explicit instructions because these tools do not
    expose stable, documented config file formats for automation. This approach
    avoids silently writing unknown settings and keeps the process reproducible.

    Run this script in an elevated PowerShell (Run as Administrator).

.PARAMETER ResetConsent
    Clears the saved install consent cache and re-prompts on next run.
    Use this if you previously declined installs but now want to allow them.

.PARAMETER AutoAccept
    Automatically accepts install consent without prompting.
    Useful for CI/CD pipelines, automated testing, or scripted deployments.
    This bypasses both the install prompt and the "remember choice" prompt.

.USAGE
    1) Right-click this file and select "Run as administrator".
    2) Let the script install tools via winget if missing.
    3) Follow the configuration checklist printed for each tool.
    4) Run the benchmark before/after your changes and export results.

    Hosted one-liner (downloads and runs this script):
      irm https://rocktune.pedroferrari.com/benchmark.ps1 | iex

    You can inspect the source before running:
      .\benchmark-setup.ps1
      https://rocktune.pedroferrari.com/benchmark.ps1

    If double-clicking closes the window immediately, run:
      powershell -ExecutionPolicy Bypass -File .\benchmark-setup.ps1

    Unattended/automated execution (skips all prompts):
      .\benchmark-setup.ps1 -AutoAccept

    To clear the saved install consent and re-prompt:
      .\benchmark-setup.ps1 -ResetConsent

.NOTES
    Requires Administrator because winget installation and app installs may
    require elevation on some systems. Also uses the Microsoft Store fallback
    flow if winget is missing.

    Documentation: https://rocktune.pedroferrari.com
    Source: https://github.com/thepedroferrari/rocktune
    Issues: https://github.com/thepedroferrari/rocktune/issues
#>
#Requires -RunAsAdministrator

[CmdletBinding()]
param(
    [switch]$ResetConsent,
    [switch]$AutoAccept
)


# ----------------------------
# Global behavior and helpers
# ----------------------------

$ErrorActionPreference = "Stop"
$script:HadFailures = $false
$script:WingetAvailable = $false
$script:ResetConsent = $ResetConsent
$script:ConsentRoot = Join-Path $env:LOCALAPPDATA "WindowsGamingSettings"
$script:ConsentFilePath = Join-Path $script:ConsentRoot "benchmark-consent.json"

# Progress tracking
$script:SectionIndex = 0
$script:SectionTotal = 10  # Total number of Write-Section calls in main flow

function Write-Section {
    <#
    .SYNOPSIS
        Writes a high-visibility section header to the console.
    .DESCRIPTION
        Used to separate major phases such as installs, configuration, and launch.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Title
    )

    $script:SectionIndex++
    $pct = [math]::Min(100, [math]::Round(($script:SectionIndex / $script:SectionTotal) * 100))
    Write-Progress -Activity "Benchmark Setup" -Status $Title -PercentComplete $pct -CurrentOperation "Step $($script:SectionIndex) of $($script:SectionTotal)"

    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Write-Note {
    <#
    .SYNOPSIS
        Writes informational messages in a consistent format.
    .DESCRIPTION
        These messages are non-fatal and describe what the script is doing.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message
    )

    Write-Host "[INFO] $Message" -ForegroundColor Gray
}

function Write-Warn {
    <#
    .SYNOPSIS
        Writes warnings that do not stop execution.
    .DESCRIPTION
        Warnings indicate reduced automation or missing optional data.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message
    )

    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
    <#
    .SYNOPSIS
        Writes a failure message and marks the run as having errors.
    .DESCRIPTION
        The script will still continue to the exit prompt for transparency.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message
    )

    $script:HadFailures = $true
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Write-Ok {
    <#
    .SYNOPSIS
        Writes a success message.
    .DESCRIPTION
        Used to confirm expected outcomes like successful installs.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message
    )

    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Wait-ForUserExit {
    <#
    .SYNOPSIS
        Always waits for a user key press before exiting.
    .DESCRIPTION
        This keeps the console open for users who double-click the script
        and would otherwise lose the output.
    #>
    # Always pause so the user can read output, even on failure.
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor Cyan
    try {
        $null = [System.Console]::ReadKey($true)
    } catch {
        # Fallback for hosts that do not support ReadKey (e.g., some terminals).
        Read-Host "Press Enter to exit"
    }
}

function Show-RockTuneFinalChecklist {
    <#
    .SYNOPSIS
        Prints a no-guesswork, step-by-step checklist after tools launch.
    .DESCRIPTION
        This is intentionally explicit for first-time users who need to know
        exactly what to click and in what order. The checklist is short and
        ends with clear completion cues.
    #>
    Write-Section "ROCKTUNE Benchmark Steps"

    $consoleWidth = 0
    try {
        $consoleWidth = $Host.UI.RawUI.WindowSize.Width
    } catch {
        $consoleWidth = 0
    }

    function Get-LeftPad {
        param(
            [Parameter(Mandatory=$true)]
            [int]$Width,

            [Parameter(Mandatory=$true)]
            [int]$MaxLineLength
        )

        if ($Width -le 0 -or $MaxLineLength -le 0) {
            return ""
        }

        $pad = [math]::Floor(($Width - $MaxLineLength) / 2)
        if ($pad -lt 0) {
            $pad = 0
        }

        return (" " * $pad)
    }

    $bannerLines = @(
        "  ____   ___   ____ _  __ _______ _   _ _   _ _____",
        " |  _ \ / _ \ / ___| |/ /|_   _| | | | | \ | | ____|",
        " | |_) | | | | |   | ' /   | | | | | | |  \| |  _|",
        " |  _ <| |_| | |___| . \   | | | |_| | | |\  | |___",
        " |_| \_\\___/ \____|_|\_\  |_|  \___/|_|_| \_|_____|"
    )

    $bannerMax = ($bannerLines | Measure-Object -Property Length -Maximum).Maximum
    $bannerPad = Get-LeftPad -Width $consoleWidth -MaxLineLength $bannerMax

    foreach ($line in $bannerLines) {
        Write-Host ($bannerPad + $line) -ForegroundColor Cyan
    }

    $useTwoColumns = $false
    if ($consoleWidth -ge 120) {
        $useTwoColumns = $true
    }

    $sections = @(
        @{
            Title = "FIRST STEPS"
            Lines = @(
                "[ ] Confirm the tools are open",
                "    - CapFrameX is running",
                "    - Unigine Superposition is open",
                "    - LatencyMon is open"
            )
        },
        @{
            Title = "CONFIGURE CAPFRAMEX (ONCE)"
            Lines = @(
                "[ ] Capture API: PresentMon",
                "[ ] Capture duration: 60s",
                "[ ] Start delay: 3s",
                "[ ] Hotkey: F11 (start/stop capture)"
            )
        },
        @{
            Title = "CONFIGURE SUPERPOSITION (ONCE)"
            Lines = @(
                "[ ] Preset: 1080p Medium",
                "[ ] Fullscreen: On",
                "[ ] VSync: Off"
            )
        },
        @{
            Title = "BEFORE CHANGES"
            Lines = @(
                "[ ] Warm-up run (no capture)",
                "    - Click RUN in Superposition",
                "    - Let the run finish",
                "[ ] Captured runs (before)",
                "    - Press F11 at start, F11 at end",
                "    - Do 2 valid runs; discard first if shader compilation occurs"
            )
        },
        @{
            Title = "LATENCYMON"
            Lines = @(
                "[ ] Click Start, run for ~5 minutes",
                "    - Screenshot Main tab",
                "    - Screenshot Drivers tab"
            )
        },
        @{
            Title = "APPLY ROCKTUNE CHANGES"
            Lines = @(
                "[ ] Run your optimization flow",
                "[ ] Reboot if requested"
            )
        },
        @{
            Title = "AFTER CHANGES"
            Lines = @(
                "[ ] Repeat the captured runs",
                "    - Same settings, same steps, same number of runs"
            )
        },
        @{
            Title = "EXPORT EVIDENCE"
            Lines = @(
                "[ ] CapFrameX -> Analysis -> Aggregate",
                "[ ] Export CSV + HTML summary"
            )
        },
        @{
            Title = "OPTIONAL INPUT LAG (FREE METHOD)"
            Lines = @(
                "[ ] Record 10 clicks at 240fps",
                "[ ] Count frames from click to pixel change",
                "[ ] 1 frame at 240fps = 4.17ms"
            )
        }
    )

    function Get-SectionLines {
        param(
            [Parameter(Mandatory=$true)]
            [hashtable]$Section
        )

        $lines = @("== $($Section.Title) ==")
        foreach ($line in $Section.Lines) {
            $lines += $line
        }

        return $lines
    }

    $lineItems = @()

    if ($useTwoColumns) {
        $leftWidth = 58
        for ($i = 0; $i -lt $sections.Count; $i += 2) {
            $left = Get-SectionLines -Section $sections[$i]
            $right = @()
            if ($i + 1 -lt $sections.Count) {
                $right = Get-SectionLines -Section $sections[$i + 1]
            }

            $maxLines = [math]::Max($left.Count, $right.Count)
            for ($lineIndex = 0; $lineIndex -lt $maxLines; $lineIndex++) {
                $leftText = ""
                $rightText = ""
                if ($lineIndex -lt $left.Count) {
                    $leftText = $left[$lineIndex]
                }
                if ($lineIndex -lt $right.Count) {
                    $rightText = $right[$lineIndex]
                }

                $lineItems += ($leftText.PadRight($leftWidth) + $rightText)
            }

            $lineItems += ""
        }
    } else {
        foreach ($section in $sections) {
            $lineItems += ""
            $lineItems += "== $($section.Title) =="
            foreach ($line in $section.Lines) {
                $lineItems += $line
            }
        }
    }

    if ($lineItems.Count -gt 0 -and $lineItems[0] -eq "") {
        $lineItems = $lineItems[1..($lineItems.Count - 1)]
    }

    $maxLineLength = ($lineItems | Measure-Object -Property Length -Maximum).Maximum
    $checklistPad = Get-LeftPad -Width $consoleWidth -MaxLineLength $maxLineLength
    foreach ($line in $lineItems) {
        Write-Host ($checklistPad + $line) -ForegroundColor White
    }
}

function Prompt-YesNo {
    <#
    .SYNOPSIS
        Prompts until a valid yes/no response is provided.
    .DESCRIPTION
        Accepts Y/Yes or N/No (case-insensitive). Returns $true for yes,
        $false for no. This avoids accidental defaults on invalid input.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message
    )

    while ($true) {
        $response = Read-Host $Message
        if ($response -match '^(y|yes)$') {
            return $true
        }
        if ($response -match '^(n|no)$') {
            return $false
        }

        Write-Warn "Please answer Y or N."
    }
}

function Get-ConsentCache {
    <#
    .SYNOPSIS
        Reads the stored install consent, if present.
    .DESCRIPTION
        Returns $true or $false when a saved choice exists, otherwise $null.
        The cache is stored under the current user profile in LocalAppData.
    #>
    if (-not (Test-Path $script:ConsentFilePath)) {
        return $null
    }

    try {
        $data = Get-Content $script:ConsentFilePath -Raw | ConvertFrom-Json
    } catch {
        return $null
    }

    if ($null -eq $data) {
        return $null
    }

    if ($data.PSObject.Properties.Name -contains "InstallConsent") {
        return [bool]$data.InstallConsent
    }

    return $null
}

function Set-ConsentCache {
    <#
    .SYNOPSIS
        Persists the install consent choice for future runs.
    .DESCRIPTION
        Stores a small JSON file with the user's choice and a timestamp.
        Users can reset it with -ResetConsent or by deleting the file.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [bool]$InstallConsent
    )

    if (-not (Test-Path $script:ConsentRoot)) {
        New-Item -Path $script:ConsentRoot -ItemType Directory -Force | Out-Null
    }

    $payload = @{
        InstallConsent = $InstallConsent
        UpdatedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
        Source = "benchmark-setup.ps1"
    }

    $payload | ConvertTo-Json -Depth 3 | Set-Content -Path $script:ConsentFilePath -Encoding UTF8
}

function Confirm-InstallConsent {
    <#
    .SYNOPSIS
        Prompts the user for explicit consent before installing software.
    .DESCRIPTION
        This script uses winget to install tools. Some users want a hard
        opt-in before any install activity starts. This function ensures
        that no package installation occurs without a clear confirmation.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$PackageNames
    )

    Write-Section "Install Consent"
    Write-Note "This script can install the following tools via winget:"
    foreach ($name in $PackageNames) {
        Write-Host "  - $name" -ForegroundColor White
    }
    Write-Note "No installations will occur without your consent."
    Write-Note "Consent cache path: $script:ConsentFilePath"
    Write-Note "Reset the cached choice with: .\\benchmark-setup.ps1 -ResetConsent"

    if ($script:ResetConsent -and (Test-Path $script:ConsentFilePath)) {
        try {
            Remove-Item -Path $script:ConsentFilePath -Force
            Write-Ok "Consent cache cleared."
        } catch {
            Write-Warn "Unable to remove consent cache. You may need to delete it manually."
        }
        $script:ResetConsent = $false
    }

    # -------------------------------------------------------------------------
    # AUTO-ACCEPT MODE
    # -------------------------------------------------------------------------
    # When -AutoAccept is specified, we skip all interactive prompts and
    # automatically grant install consent. This is useful for:
    #   - CI/CD pipelines where no human is present to answer prompts
    #   - Automated testing environments
    #   - Scripted deployments where you've already reviewed the tools
    #
    # The auto-accept does NOT save to the consent cache - it only affects
    # the current execution. If you want to permanently allow installs without
    # prompts, run once interactively and choose "Y" to remember.
    #
    # Usage: .\benchmark-setup.ps1 -AutoAccept
    # -------------------------------------------------------------------------
    if ($script:AutoAccept) {
        Write-Ok "Auto-accept mode: installs are allowed."
        return $true
    }

    $cached = Get-ConsentCache
    if ($null -ne $cached) {
        if ($cached) {
            Write-Ok "Using saved consent: installs are allowed."
        } else {
            Write-Warn "Using saved consent: installs are blocked."
        }
        return $cached
    }

    $installConsent = Prompt-YesNo -Message "Install missing tools now? (Y/N)"

    $remember = Prompt-YesNo -Message "Remember this choice for next time? (Y/N)"
    if ($remember) {
        try {
            Set-ConsentCache -InstallConsent $installConsent
            Write-Ok "Consent saved."
        } catch {
            Write-Warn "Unable to save consent cache. It will ask again next time."
        }
    }

    if ($installConsent) {
        Write-Ok "Consent granted. Proceeding with installs when needed."
    } else {
        Write-Warn "Consent not granted. Skipping winget install and package installs."
    }

    return $installConsent
}


# ----------------------------
# Winget detection and install
# ----------------------------

function Test-WingetAvailable {
    <#
    .SYNOPSIS
        Returns true if winget is callable.
    .DESCRIPTION
        Uses "winget --version" and checks the exit code. This avoids relying
        on PATH heuristics and provides a simple availability check.
    #>
    try {
        $null = winget --version 2>&1
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

function Install-WingetIfMissing {
    <#
    .SYNOPSIS
        Attempts to install winget if not already available.
    .DESCRIPTION
        The Microsoft-supported path is the App Installer package. This function:
          1) Tries to open the Microsoft Store App Installer page.
          2) Falls back to downloading the App Installer bundle from aka.ms.

        This mirrors the logic used in the main gaming-pc-setup script, but is
        fully self-contained here for a standalone benchmark script.
    #>
    Write-Section "Winget Availability"
    Write-Note "Checking if winget is available..."

    if (Test-WingetAvailable) {
        $version = winget --version 2>&1
        Write-Ok "winget is available ($version)."
        return $true
    }

    Write-Warn "winget is not available. Attempting installation."

    # Method 1: Microsoft Store App Installer page.
    try {
        $storeApp = Get-AppxPackage -Name "Microsoft.WindowsStore" -ErrorAction SilentlyContinue
        if ($storeApp) {
            Write-Note "Opening Microsoft Store App Installer page."
            Start-Process "ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1" -ErrorAction SilentlyContinue
            Write-Warn "Install 'App Installer' from the Store, then rerun this script."
            return $false
        } else {
            Write-Warn "Microsoft Store not detected. Using direct download fallback."
        }
    } catch {
        Write-Warn "Unable to open the Microsoft Store. Using direct download fallback."
    }

    # Method 2: Direct download from Microsoft.
    try {
        $appInstallerUrl = "https://aka.ms/getwinget"
        $downloadPath = Join-Path $env:TEMP "Microsoft.DesktopAppInstaller.msixbundle"

        Write-Note "Downloading App Installer bundle from $appInstallerUrl"
        Invoke-WebRequest -Uri $appInstallerUrl -OutFile $downloadPath -UseBasicParsing -TimeoutSec 60 -ErrorAction Stop

        Write-Note "Installing App Installer bundle"
        Add-AppxPackage -Path $downloadPath -ErrorAction Stop

        Remove-Item $downloadPath -ErrorAction SilentlyContinue

        Write-Ok "App Installer installed. Please restart PowerShell and rerun this script."
        return $false
    } catch {
        Write-Fail "Failed to install App Installer. Install manually from https://aka.ms/getwinget"
        return $false
    }
}


# ----------------------------
# Package install and path resolution
# ----------------------------

function Test-WingetPackageInstalled {
    <#
    .SYNOPSIS
        Checks if a package is installed via winget list output.
    .DESCRIPTION
        Uses "winget list" and matches the package identifier in the output.
        This works even when winget cannot reliably report install locations.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$PackageId
    )

    try {
        $output = winget list --id $PackageId --source winget --accept-source-agreements 2>&1
        if ($LASTEXITCODE -ne 0) {
            return $false
        }

        return ($output -match [regex]::Escape($PackageId))
    } catch {
        return $false
    }
}

function Install-WingetPackage {
    <#
    .SYNOPSIS
        Installs a package by winget ID, with verification.
    .DESCRIPTION
        Some winget installers return non-zero exit codes even when successful.
        This function re-checks install state to avoid false negatives.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$PackageId,

        [Parameter(Mandatory=$true)]
        [string]$PackageName
    )

    if (Test-WingetPackageInstalled -PackageId $PackageId) {
        Write-Ok "$PackageName already installed."
        return $true
    }

    Write-Note "Installing $PackageName via winget ($PackageId)."
    $null = winget install --id $PackageId --source winget --accept-package-agreements --accept-source-agreements --silent 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Ok "$PackageName installed."
        return $true
    }

    # Some installs return a non-zero exit code even if the package is present.
    if (Test-WingetPackageInstalled -PackageId $PackageId) {
        Write-Ok "$PackageName already installed (post-install verification)."
        return $true
    }

    Write-Fail "Failed to install $PackageName (winget exit code $LASTEXITCODE)."
    return $false
}

function Get-RegistryInstallLocations {
    <#
    .SYNOPSIS
        Finds install locations using registry uninstall entries.
    .DESCRIPTION
        This is a reliable fallback when installers register their paths.
        It checks both 64-bit and 32-bit views to cover legacy installers.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$DisplayNamePattern
    )

    # Look for installer entries in HKLM and HKCU (both 64-bit and 32-bit views).
    $registryPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )

    $locations = @()
    foreach ($path in $registryPaths) {
        try {
            $items = Get-ItemProperty -Path $path -ErrorAction SilentlyContinue |
                Where-Object { $_.DisplayName -like $DisplayNamePattern }

            foreach ($item in $items) {
                if ($item.InstallLocation) {
                    $locations += $item.InstallLocation
                } elseif ($item.DisplayIcon) {
                    $locations += (Split-Path -Parent $item.DisplayIcon)
                }
            }
        } catch {
            # Ignore registry access errors to keep the script robust.
        }
    }

    return $locations | Select-Object -Unique
}

function Get-WingetInstalledLocation {
    <#
    .SYNOPSIS
        Attempts to read the installed location from winget JSON output.
    .DESCRIPTION
        Newer winget versions can output JSON for "winget list".
        When present, the JSON may include an install location field.
        This is not guaranteed across versions, so this is best-effort only.
    .OUTPUTS
        [string] Install location path or $null if not available.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$PackageId
    )

    if (-not $script:WingetAvailable) {
        return $null
    }

    try {
        $jsonText = winget list --id $PackageId --source winget --accept-source-agreements --output json 2>&1
        if ($LASTEXITCODE -ne 0) {
            return $null
        }

        $data = $jsonText | ConvertFrom-Json -ErrorAction Stop
    } catch {
        return $null
    }

    $packages = @()
    if ($data.Sources) {
        foreach ($source in $data.Sources) {
            if ($source.Packages) {
                $packages += $source.Packages
            }
        }
    } elseif ($data.Packages) {
        $packages += $data.Packages
    }

    $match = $packages | Where-Object {
        $_.PackageIdentifier -eq $PackageId -or $_.Id -eq $PackageId
    } | Select-Object -First 1

    if (-not $match) {
        return $null
    }

    $locationProps = @("InstallLocation", "InstalledLocation", "Location", "InstallPath", "InstalledPath")
    foreach ($prop in $locationProps) {
        if ($match.PSObject.Properties.Name -contains $prop -and $match.$prop) {
            return $match.$prop
        }
    }

    return $null
}

function Resolve-ExecutablePath {
    <#
    .SYNOPSIS
        Resolves the full path to a tool executable.
    .DESCRIPTION
        Uses a multi-step strategy:
          1) Known default paths (fast and deterministic)
          2) Winget JSON install location (best effort)
          3) Registry uninstall entries (best effort)
          4) Limited folder scan under known vendor roots
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$ExeNames,

        [Parameter(Mandatory=$true)]
        [string[]]$DefaultCandidates,

        [Parameter(Mandatory=$true)]
        [string]$RegistryNamePattern,

        [Parameter(Mandatory=$true)]
        [string]$PackageId
    )

    # Winget does not reliably expose install paths for all packages, so we use:
    # 1) Known default paths (fast and predictable)
    # 2) Winget JSON install location (best effort)
    # 3) Registry uninstall entries (best effort)
    # 4) Limited directory search under known vendor roots
    #
    # This keeps the script deterministic while still finding installs that
    # do not use the defaults.

    # 1) Check known default paths first (fast and predictable).
    foreach ($candidate in $DefaultCandidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    # 2) Check winget JSON install location (if supported by the local winget).
    $wingetLocation = Get-WingetInstalledLocation -PackageId $PackageId
    if ($wingetLocation -and (Test-Path $wingetLocation)) {
        $wingetItem = Get-Item $wingetLocation -ErrorAction SilentlyContinue
        if ($wingetItem -and -not $wingetItem.PSIsContainer) {
            return $wingetLocation
        }

        foreach ($exeName in $ExeNames) {
            $wingetExe = Join-Path $wingetLocation $exeName
            if (Test-Path $wingetExe) {
                return $wingetExe
            }

            $wingetBinExe = Join-Path (Join-Path $wingetLocation "bin") $exeName
            if (Test-Path $wingetBinExe) {
                return $wingetBinExe
            }
        }
    }

    # 3) Check install locations reported in the registry.
    $registryLocations = Get-RegistryInstallLocations -DisplayNamePattern $RegistryNamePattern
    foreach ($location in $registryLocations) {
        foreach ($exeName in $ExeNames) {
            $exePath = Join-Path $location $exeName
            if (Test-Path $exePath) {
                return $exePath
            }

            # Some installers put binaries in a subfolder like "bin".
            $binExePath = Join-Path (Join-Path $location "bin") $exeName
            if (Test-Path $binExePath) {
                return $binExePath
            }
        }
    }

    # 4) Last resort: search a specific root if it exists.
    # This is intentionally limited to known vendor roots to avoid a full disk scan.
    foreach ($location in $registryLocations) {
        if (Test-Path $location) {
            try {
                foreach ($exeName in $ExeNames) {
                    $found = Get-ChildItem -Path $location -Recurse -Filter $exeName -ErrorAction SilentlyContinue |
                        Select-Object -First 1
                    if ($found) {
                        return $found.FullName
                    }
                }
            } catch {
                # Ignore access errors.
            }
        }
    }

    return $null
}


# ----------------------------
# Benchmark stack definition
# ----------------------------

Write-Section "Benchmark Stack"
Write-Note "This script installs a small, free toolchain for FPS and frametime testing."
Write-Note "It does not change system settings. It only installs tools and launches them."
Write-Note "These tools were chosen because they are repeatable and measurable:"
Write-Note "- CapFrameX: frametime capture and percentile lows (more honest than avg FPS alone)."
Write-Note "- Superposition: fixed GPU workload with repeatable scoring."
Write-Note "- LatencyMon: validates DPC/ISR latency to explain micro-stutter."
Write-Note "Windows 10 and 11 use the same default install paths for these tools."
Write-Note "The script targets 64-bit installs and still checks legacy locations for safety."

$packages = @(
    # Each package entry defines:
    #   - Winget ID for installation
    #   - Default executable paths for x64 installs
    #   - Config checklist steps for repeatable results
    #   - Whether to launch automatically when found
    @{
        Id = "CXWorld.CapFrameX"
        Name = "CapFrameX"
        Purpose = "Captures frametimes and computes avg FPS, 1% low, and 0.1% low."
        ExeNames = @("CapFrameX.exe")
        RegistryPattern = "*CapFrameX*"
        DefaultPaths = @(
            "C:\Program Files\CapFrameX\CapFrameX.exe",
            "C:\Program Files (x86)\CapFrameX\CapFrameX.exe"
        )
        Configure = @(
            "Capture API: PresentMon",
            "Capture duration: 60s",
            "Start delay: 3s",
            "Hotkey: F11 (start/stop capture)",
            "Overlay optional; do not enable additional overlays for clean results"
        )
        Launch = $true
    },
    @{
        Id = "Unigine.SuperpositionBenchmark"
        Name = "Unigine Superposition"
        Purpose = "Repeatable GPU benchmark for consistent before/after comparisons."
        ExeNames = @("Superposition.exe")
        RegistryPattern = "*Superposition*"
        DefaultPaths = @(
            "C:\Program Files\Unigine\Superposition\Superposition.exe",
            "C:\Program Files\Unigine\Superposition\bin\Superposition.exe"
        )
        Configure = @(
            "Preset: 1080p Medium",
            "Fullscreen: On",
            "VSync: Off",
            "Run 3 passes; discard the first (shader compilation), average the rest"
        )
        Launch = $true
    },
    @{
        Id = "Resplendence.LatencyMon"
        Name = "LatencyMon"
        Purpose = "Detects DPC/ISR latency spikes that can cause stutter or audio crackle."
        ExeNames = @("LatencyMon.exe", "LatMon.exe")
        RegistryPattern = "*LatencyMon*"
        DefaultPaths = @(
            "C:\Program Files\LatencyMon\LatencyMon.exe",
            "C:\Program Files\LatencyMon\LatMon.exe",
            "C:\Program Files (x86)\LatencyMon\LatencyMon.exe",
            "C:\Program Files (x86)\LatencyMon\LatMon.exe",
            "C:\Program Files\Resplendence\LatencyMon\LatencyMon.exe",
            "C:\Program Files\Resplendence\LatencyMon\LatMon.exe",
            "C:\Program Files (x86)\Resplendence\LatencyMon\LatencyMon.exe",
            "C:\Program Files (x86)\Resplendence\LatencyMon\LatMon.exe"
        )
        Configure = @(
            "Run for 5 minutes while Superposition is running",
            "Record Main + Drivers tab screenshots for evidence"
        )
        Launch = $true
    }
)


# ----------------------------
# Main flow
# ----------------------------

try {
    Write-Section "Pre-Checks"
    Write-Note "Ensure the following for fair results:"
    Write-Note "- Close browsers, launchers, and overlays (except CapFrameX)."
    Write-Note "- Keep power plan and NVIDIA Control Panel settings identical before/after."
    Write-Note "- Reboot before the before and after runs, if possible."
    Write-Note "- If you double-clicked this script and it closes immediately, run:"
    Write-Note "  powershell -ExecutionPolicy Bypass -File .\\benchmark-setup.ps1"

    $installConsent = Confirm-InstallConsent -PackageNames ($packages | ForEach-Object { $_.Name })

    if ($installConsent) {
        if (-not (Install-WingetIfMissing)) {
            throw "winget is required to continue."
        }

        $script:WingetAvailable = Test-WingetAvailable

        Write-Section "Install Required Tools"
        $totalPkgs = $packages.Count
        $currentPkg = 0
        foreach ($package in $packages) {
            $currentPkg++
            $pct = [math]::Round(($currentPkg / $totalPkgs) * 100)
            Write-Progress -Activity "Installing Tools" -Status $package.Name -PercentComplete $pct -CurrentOperation "$currentPkg of $totalPkgs"
            Write-Note "$($package.Name): $($package.Purpose)"
            $installed = Install-WingetPackage -PackageId $package.Id -PackageName $package.Name
            if (-not $installed) {
                Write-Warn "$($package.Name) failed to install. The script will continue, but launching may fail."
            }
        }
        Write-Progress -Activity "Installing Tools" -Completed
    } else {
        # The user did not approve installs. We still try to locate and launch
        # any tools that are already installed.
        $script:WingetAvailable = Test-WingetAvailable
        if (-not $script:WingetAvailable) {
            Write-Warn "winget is not available, so install-location lookup via winget is disabled."
        }
    }

    Write-Section "Locate Executables"
    foreach ($package in $packages) {
        $path = Resolve-ExecutablePath -ExeNames $package.ExeNames `
            -DefaultCandidates $package.DefaultPaths `
            -RegistryNamePattern $package.RegistryPattern `
            -PackageId $package.Id

        if ($path) {
            Write-Ok "$($package.Name) executable found at: $path"
            $package["Path"] = $path
        } else {
            Write-Warn "Could not locate $($package.Name) executable. Launch will be skipped."
            $package["Path"] = $null
        }
    }

    Write-Section "Configuration Checklist"
    foreach ($package in $packages) {
        Write-Host ""
        Write-Host "$($package.Name) configuration:" -ForegroundColor Cyan
        foreach ($step in $package.Configure) {
            Write-Host "  - $step" -ForegroundColor White
        }
    }

    Write-Section "Launch Tools"
    foreach ($package in $packages) {
        if (-not $package.Launch) {
            continue
        }

        if ($package["Path"]) {
            Write-Note "Launching $($package.Name)..."
            try {
                $process = Start-Process -FilePath $package["Path"] -PassThru -ErrorAction Stop
                Start-Sleep -Milliseconds 300
                if ($process -and -not $process.HasExited) {
                    Write-Ok "$($package.Name) launched (PID $($process.Id))."
                } else {
                    Write-Warn "$($package.Name) launched but exited immediately. Try starting it manually:"
                    Write-Warn "  $($package["Path"])"
                }
            } catch {
                Write-Warn "Failed to launch $($package.Name). Try starting it manually:"
                Write-Warn "  $($package["Path"])"
                Write-Warn "Error: $($_.Exception.Message)"
            }
        } else {
            Write-Warn "Skipping launch for $($package.Name) (path not found)."
        }
    }

    Write-Section "Input Lag Evidence (Free Method)"
    Write-Note "Use a 240fps phone video to measure click-to-photon latency:"
    Write-Note "1) Fullscreen a click-response test (any simple local page or app)."
    Write-Note "2) Record 10 clicks in slow motion."
    Write-Note "3) Count frames between click and on-screen change."
    Write-Note "At 240fps, 1 frame = 4.17ms. Average the 10 results."

    Write-Section "Run Protocol Summary"
    Write-Note "Warm up once without capturing."
    Write-Note "Capture 2 valid runs with CapFrameX (press F11 to start/stop)."
    Write-Note "Apply your app changes."
    Write-Note "Repeat the warmup + 2 runs."
    Write-Note "Compare Avg FPS, 1% low, 0.1% low, and frametime graphs."

    Write-Ok "Benchmark stack is ready."
    Write-Progress -Activity "Benchmark Setup" -Completed

    Show-RockTuneFinalChecklist
} catch {
    Write-Fail "Script failed: $($_.Exception.Message)"
} finally {
    if ($script:HadFailures) {
        Write-Warn "One or more steps failed. Review the messages above."
    }
    Wait-ForUserExit
}
