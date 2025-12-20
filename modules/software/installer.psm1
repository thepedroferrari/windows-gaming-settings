#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Software installation module using winget and software catalog
.DESCRIPTION
    Installs gaming-related software using winget package manager.
    Reads package definitions from data/software-catalog.json.

    Features:
    - Hardware-conditional peripheral software (Logitech, Razer, Corsair)
    - Category-based installation (essential, recommended, optional)
    - Winget availability checking and installation
    - Package status verification

    User decisions:
    - Python/Zed/qBittorrent: Keep for now (future web: optional)
.NOTES
    Author: @thepedroferrari
    Risk Level: TIER_1_LOW
    Reversible: Partial (can uninstall via winget)
#>

# Import core modules
Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global

#region Winget Management

<#
.SYNOPSIS
    Test if winget is available
.OUTPUTS
    [bool] True if winget is available, false otherwise
#>
function Test-WingetAvailable {
    try {
        $null = winget --version 2>&1
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}

<#
.SYNOPSIS
    Install winget (App Installer) if not available
.OUTPUTS
    [bool] True if winget is now available, false otherwise
#>
function Install-Winget {
    Write-Log "Checking for winget..." "INFO"

    # Check if winget is already available
    if (Test-WingetAvailable) {
        $wingetVersion = winget --version 2>&1
        Write-Log "winget is available: $wingetVersion" "SUCCESS"
        return $true
    }

    Write-Log "winget not found. Attempting to install..." "INFO"

    # Method 1: Try to install via Microsoft Store (App Installer)
    Write-Log "Method 1: Installing via Microsoft Store..." "INFO"
    try {
        $storeApp = Get-AppxPackage -Name "Microsoft.WindowsStore" -ErrorAction SilentlyContinue
        if ($storeApp) {
            Write-Log "Microsoft Store found, opening App Installer page..." "INFO"
            Start-Process "ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1" -ErrorAction SilentlyContinue
            Write-Log "Please install 'App Installer' from Microsoft Store, then restart script" "ERROR"
            return $false
        } else {
            Write-Log "Microsoft Store not available (common on X-Lite builds)" "ERROR"
        }
    } catch {
        Write-Log "Could not open Microsoft Store: $_" "ERROR"
    }

    # Method 2: Direct download and install App Installer
    Write-Log "Method 2: Downloading App Installer directly..." "INFO"
    try {
        $appInstallerUrl = "https://aka.ms/getwinget"
        $downloadPath = "$env:TEMP\Microsoft.DesktopAppInstaller.msixbundle"

        Write-Log "Downloading App Installer from Microsoft..." "INFO"
        Invoke-WebRequest -Uri $appInstallerUrl -OutFile $downloadPath -UseBasicParsing -ErrorAction Stop

        Write-Log "Installing App Installer..." "INFO"
        Add-AppxPackage -Path $downloadPath -ErrorAction Stop

        Remove-Item $downloadPath -ErrorAction SilentlyContinue

        Write-Log "App Installer installed successfully. Please restart PowerShell." "SUCCESS"
        return $false  # Requires restart

    } catch {
        Write-Log "Failed to download/install App Installer: $_" "ERROR"
        Write-Log "Install manually from: https://aka.ms/getwinget" "ERROR"
        return $false
    }
}

#endregion

#region Catalog Management

<#
.SYNOPSIS
    Load software catalog from JSON
.OUTPUTS
    [PSCustomObject] Software catalog object or $null
#>
function Get-SoftwareCatalog {
    try {
        $catalogPath = Join-Path $PSScriptRoot "..\..\data\software-catalog.json"

        if (-not (Test-Path $catalogPath)) {
            Write-Log "Software catalog not found: $catalogPath" "ERROR"
            return $null
        }

        $catalog = Get-Content $catalogPath -Raw | ConvertFrom-Json
        Write-Log "Loaded software catalog (version $($catalog.version))" "SUCCESS"

        return $catalog
    } catch {
        Write-Log "Error loading software catalog: $_" "ERROR"
        return $null
    }
}

#endregion

#region Hardware Detection

<#
.SYNOPSIS
    Detect USB peripheral vendor by VID (Vendor ID)
.DESCRIPTION
    Scans USB devices to detect gaming peripheral vendors.

    Vendor IDs:
    - 046D: Logitech
    - 1532: Razer
    - 1B1C: Corsair
.OUTPUTS
    [string[]] Array of detected vendor names
#>
function Test-HardwarePeripherals {
    try {
        Write-Log "Detecting gaming peripheral hardware..." "INFO"

        # Get USB devices
        $usbDevices = Get-PnpDevice -Class "HIDClass", "USB" -ErrorAction SilentlyContinue |
            Where-Object { $_.InstanceId -match "USB\\VID_" }

        $detectedVendors = @()

        foreach ($device in $usbDevices) {
            # Extract VID from instance ID (format: USB\VID_046D&PID_C332\...)
            if ($device.InstanceId -match "VID_([0-9A-F]{4})") {
                $vid = $matches[1]

                switch ($vid) {
                    "046D" {
                        if ($detectedVendors -notcontains "Logitech") {
                            $detectedVendors += "Logitech"
                            Write-Log "Detected Logitech peripheral: $($device.FriendlyName)" "SUCCESS"
                        }
                    }
                    "1532" {
                        if ($detectedVendors -notcontains "Razer") {
                            $detectedVendors += "Razer"
                            Write-Log "Detected Razer peripheral: $($device.FriendlyName)" "SUCCESS"
                        }
                    }
                    "1B1C" {
                        if ($detectedVendors -notcontains "Corsair") {
                            $detectedVendors += "Corsair"
                            Write-Log "Detected Corsair peripheral: $($device.FriendlyName)" "SUCCESS"
                        }
                    }
                }
            }
        }

        if ($detectedVendors.Count -eq 0) {
            Write-Log "No gaming peripherals detected" "INFO"
        }

        return $detectedVendors
    } catch {
        Write-Log "Error detecting hardware peripherals: $_" "ERROR"
        return @()
    }
}

#endregion

#region Installation Functions

<#
.SYNOPSIS
    Install a single package from catalog
.OUTPUTS
    [bool] True if installed successfully, false otherwise
#>
function Install-PackageFromCatalog {
    param(
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Package,

        [Parameter(Mandatory=$true)]
        [string]$PackageName
    )

    try {
        Write-Log "Installing $($Package.name)..." "INFO"

        # Run winget install
        $result = winget install --id $Package.winget_id --source winget --accept-package-agreements --accept-source-agreements --silent 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Log "Installed: $($Package.name)" "SUCCESS"
            return $true
        } else {
            # Check if it's already installed
            $installedCheck = winget list --id $Package.winget_id --source winget --accept-source-agreements 2>&1
            if ($LASTEXITCODE -eq 0 -and $installedCheck -match $Package.winget_id) {
                Write-Log "Already installed: $($Package.name)" "SUCCESS"
                return $true
            } else {
                Write-Log "Failed to install $($Package.name) (exit code: $LASTEXITCODE)" "ERROR"
                return $false
            }
        }
    } catch {
        Write-Log "Error installing $($Package.name): $_" "ERROR"
        return $false
    }
}

<#
.SYNOPSIS
    Install peripheral software if hardware detected
.OUTPUTS
    [int] Number of peripheral packages installed
#>
function Install-PeripheralSoftware {
    param(
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Catalog,

        [string[]]$DetectedVendors
    )

    $installed = 0

    try {
        # Filter peripheral packages
        $peripheralPackages = $Catalog.packages.PSObject.Properties |
            Where-Object { $_.Value.category -eq "peripheral" }

        foreach ($pkg in $peripheralPackages) {
            $package = $pkg.Value
            $packageName = $pkg.Name

            # Check if hardware is detected
            $shouldInstall = $false
            foreach ($vendorId in $package.hardware_detection.vendor_ids) {
                $vendorName = $Catalog.hardware_vendor_ids.$vendorId
                if ($DetectedVendors -contains $vendorName) {
                    $shouldInstall = $true
                    break
                }
            }

            if ($shouldInstall) {
                if (Install-PackageFromCatalog -Package $package -PackageName $packageName) {
                    $installed++
                }
            } else {
                Write-Log "Skipping $($package.name) (hardware not detected)" "INFO"
            }
        }

    } catch {
        Write-Log "Error installing peripheral software: $_" "ERROR"
    }

    return $installed
}

#endregion

#region Main Functions

<#
.SYNOPSIS
    Install software from catalog
.DESCRIPTION
    Main entry point for software installation.
.PARAMETER Categories
    Categories to install (essential, recommended, keep, optional, peripheral)
.PARAMETER IncludeOptional
    Include optional packages (default: false)
.PARAMETER IncludePeripherals
    Include peripheral software based on hardware detection (default: true)
#>
function Invoke-SoftwareInstallation {
    param(
        [string[]]$Categories = @("essential", "recommended", "keep"),
        [bool]$IncludeOptional = $false,
        [bool]$IncludePeripherals = $true
    )

    Write-Log "Starting software installation..." "INFO"

    # Check winget availability
    if (-not (Test-WingetAvailable)) {
        Write-Log "winget not available. Attempting to install..." "INFO"
        if (-not (Install-Winget)) {
            Write-Log "winget installation failed. Skipping software installation." "ERROR"
            return
        }
    }

    # Load catalog
    $catalog = Get-SoftwareCatalog
    if (-not $catalog) {
        Write-Log "Could not load software catalog. Skipping software installation." "ERROR"
        return
    }

    $installed = 0
    $failed = 0

    try {
        # Install packages by category
        $packagesToInstall = $catalog.packages.PSObject.Properties |
            Where-Object { $Categories -contains $_.Value.category }

        foreach ($pkg in $packagesToInstall) {
            $package = $pkg.Value
            $packageName = $pkg.Name

            if (Install-PackageFromCatalog -Package $package -PackageName $packageName) {
                $installed++
            } else {
                $failed++
            }
        }

        # Optional packages (if enabled)
        if ($IncludeOptional) {
            $optionalPackages = $catalog.packages.PSObject.Properties |
                Where-Object { $_.Value.category -eq "optional" }

            foreach ($pkg in $optionalPackages) {
                $package = $pkg.Value
                $packageName = $pkg.Name

                if (Install-PackageFromCatalog -Package $package -PackageName $packageName) {
                    $installed++
                } else {
                    $failed++
                }
            }
        }

        # Peripheral software (hardware-conditional)
        if ($IncludePeripherals) {
            $detectedVendors = Test-HardwarePeripherals
            $peripheralInstalled = Install-PeripheralSoftware -Catalog $catalog -DetectedVendors $detectedVendors
            $installed += $peripheralInstalled
        }

        Write-Log "Software installation complete: $installed installed, $failed failed" "SUCCESS"

    } catch {
        Write-Log "Error during software installation: $_" "ERROR"
    }
}

#endregion

# Export functions
Export-ModuleMember -Function @(
    'Test-WingetAvailable',
    'Install-Winget',
    'Get-SoftwareCatalog',
    'Test-HardwarePeripherals',
    'Install-PackageFromCatalog',
    'Install-PeripheralSoftware',
    'Invoke-SoftwareInstallation'
)
