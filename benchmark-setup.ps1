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
.NOTES
    Requires Administrator because winget installation and app installs may
    require elevation on some systems. Also uses the Microsoft Store fallback
    flow if winget is missing.
#>
#Requires -RunAsAdministrator

[CmdletBinding()]
param()


# ----------------------------
# Global behavior and helpers
# ----------------------------

$ErrorActionPreference = "Stop"
$script:HadFailures = $false

function Write-Section {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Title
    )

    Write-Host ""
    Write-Host "=== $Title ===" -ForegroundColor Cyan
}

function Write-Note {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message
    )

    Write-Host "[INFO] $Message" -ForegroundColor Gray
}

function Write-Warn {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message
    )

    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Fail {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message
    )

    $script:HadFailures = $true
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

function Write-Ok {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message
    )

    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Wait-ForUserExit {
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
        Invoke-WebRequest -Uri $appInstallerUrl -OutFile $downloadPath -UseBasicParsing -ErrorAction Stop

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

function Resolve-ExecutablePath {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ExeName,

        [Parameter(Mandatory=$true)]
        [string[]]$DefaultCandidates,

        [Parameter(Mandatory=$true)]
        [string]$RegistryNamePattern
    )

    # Winget does not reliably expose install paths for all packages, so we use:
    # 1) Known default paths (fast and predictable)
    # 2) Registry uninstall entries (best effort)
    # 3) Limited directory search under known vendor roots
    #
    # This keeps the script deterministic while still finding installs that
    # do not use the defaults.

    # 1) Check known default paths first (fast and predictable).
    foreach ($candidate in $DefaultCandidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    # 2) Check install locations reported in the registry.
    $registryLocations = Get-RegistryInstallLocations -DisplayNamePattern $RegistryNamePattern
    foreach ($location in $registryLocations) {
        $exePath = Join-Path $location $ExeName
        if (Test-Path $exePath) {
            return $exePath
        }

        # Some installers put binaries in a subfolder like "bin".
        $binExePath = Join-Path (Join-Path $location "bin") $ExeName
        if (Test-Path $binExePath) {
            return $binExePath
        }
    }

    # 3) Last resort: search a specific root if it exists.
    # This is intentionally limited to known vendor roots to avoid a full disk scan.
    foreach ($location in $registryLocations) {
        if (Test-Path $location) {
            try {
                $found = Get-ChildItem -Path $location -Recurse -Filter $ExeName -ErrorAction SilentlyContinue |
                    Select-Object -First 1
                if ($found) {
                    return $found.FullName
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

$packages = @(
    @{
        Id = "CXWorld.CapFrameX"
        Name = "CapFrameX"
        Purpose = "Captures frametimes and computes avg FPS, 1% low, and 0.1% low."
        ExeName = "CapFrameX.exe"
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
        ExeName = "Superposition.exe"
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
        ExeName = "LatencyMon.exe"
        RegistryPattern = "*LatencyMon*"
        DefaultPaths = @(
            "C:\Program Files\LatencyMon\LatencyMon.exe",
            "C:\Program Files (x86)\LatencyMon\LatencyMon.exe"
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

    if (-not (Install-WingetIfMissing)) {
        throw "winget is required to continue."
    }

    Write-Section "Install Required Tools"
    foreach ($package in $packages) {
        Write-Note "$($package.Name): $($package.Purpose)"
        $installed = Install-WingetPackage -PackageId $package.Id -PackageName $package.Name
        if (-not $installed) {
            Write-Warn "$($package.Name) failed to install. The script will continue, but launching may fail."
        }
    }

    Write-Section "Locate Executables"
    foreach ($package in $packages) {
        $path = Resolve-ExecutablePath -ExeName $package.ExeName `
            -DefaultCandidates $package.DefaultPaths `
            -RegistryNamePattern $package.RegistryPattern

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
            Start-Process -FilePath $package["Path"] | Out-Null
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
} catch {
    Write-Fail "Script failed: $($_.Exception.Message)"
} finally {
    if ($script:HadFailures) {
        Write-Warn "One or more steps failed. Review the messages above."
    }
    Wait-ForUserExit
}
