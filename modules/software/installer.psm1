<#
.SYNOPSIS
    Software installation helpers based on the catalog definition.
.DESCRIPTION
    Ensures winget availability, loads the software catalog, detects peripherals,
    and installs packages by category.
.NOTES
    Requires Administrator. Uses winget and may prompt for Store installation.
#>
#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global



function Test-WingetAvailable {
    <#
    .SYNOPSIS
        Checks whether winget is available.
    .DESCRIPTION
        Invokes winget --version and returns success based on exit code.
    .OUTPUTS
        [bool] True if winget is callable.
    #>
    try {
        $null = winget --version 2>&1
        return ($LASTEXITCODE -eq 0)
    } catch {
        return $false
    }
}


function Install-Winget {
    <#
    .SYNOPSIS
        Attempts to install winget if missing.
    .DESCRIPTION
        First attempts to open the Microsoft Store App Installer page, then
        falls back to downloading the App Installer bundle directly.
    .OUTPUTS
        [bool] True if winget is already installed; otherwise false to indicate
        a restart/install is required.
    #>
    Write-Log "Checking for winget..." "INFO"

    if (Test-WingetAvailable) {
        $wingetVersion = winget --version 2>&1
        Write-Log "winget is available: $wingetVersion" "SUCCESS"
        return $true
    }

    Write-Log "winget not found. Attempting to install..." "INFO"

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
        return $false

    } catch {
        Write-Log "Failed to download/install App Installer: $_" "ERROR"
        Write-Log "Install manually from: https://aka.ms/getwinget" "ERROR"
        return $false
    }
}




function Get-SoftwareCatalog {
    <#
    .SYNOPSIS
        Loads the software catalog JSON.
    .DESCRIPTION
        Reads the catalog from the web folder and returns it as a PSCustomObject.
    .OUTPUTS
        [PSCustomObject] Catalog data or $null on failure.
    #>
    try {
        $catalogPath = Join-Path $PSScriptRoot "..\..\web\catalog.json"

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




function Test-HardwarePeripherals {
    <#
    .SYNOPSIS
        Detects connected gaming peripherals by vendor ID.
    .DESCRIPTION
        Scans HID/USB devices for known VID values and returns vendor names.
    .OUTPUTS
        [string[]] Detected vendor names.
    #>
    try {
        Write-Log "Detecting gaming peripheral hardware..." "INFO"

        $usbDevices = Get-PnpDevice -Class "HIDClass", "USB" -ErrorAction SilentlyContinue |
            Where-Object { $_.InstanceId -match "USB\\VID_" }

        $detectedVendors = @()

        foreach ($device in $usbDevices) {
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




function Install-PackageFromCatalog {
    <#
    .SYNOPSIS
        Installs a single package from the catalog using winget.
    .DESCRIPTION
        Runs winget install for the given package id, then verifies install
        status when winget returns a non-zero exit code.
    .PARAMETER Package
        Package object from the catalog.
    .PARAMETER PackageName
        Catalog key name used for logging.
    .OUTPUTS
        [bool] True if installed or already present, else false.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Package,

        [Parameter(Mandatory=$true)]
        [string]$PackageName
    )

    try {
        Write-Log "Installing $($Package.name)..." "INFO"

        $result = winget install --id $Package.id --source winget --accept-package-agreements --accept-source-agreements --silent 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Log "Installed: $($Package.name)" "SUCCESS"
            return $true
        } else {
            $installedCheck = winget list --id $Package.id --source winget --accept-source-agreements 2>&1
            if ($LASTEXITCODE -eq 0 -and $installedCheck -match $Package.id) {
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


function Install-PeripheralSoftware {
    <#
    .SYNOPSIS
        Installs peripheral software based on detected hardware.
    .DESCRIPTION
        Compares detected vendor names to the catalog's hardware vendor map
        and installs matching peripheral packages.
    .PARAMETER Catalog
        Catalog object containing package definitions.
    .PARAMETER DetectedVendors
        List of detected vendor names.
    .OUTPUTS
        [int] Count of installed packages.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Catalog,

        [string[]]$DetectedVendors
    )

    $installed = 0

    try {
        $peripheralPackages = $Catalog.packages.PSObject.Properties |
            Where-Object { $_.Value.category -eq "peripheral" }

        foreach ($pkg in $peripheralPackages) {
            $package = $pkg.Value
            $packageName = $pkg.Name

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




function Invoke-SoftwareInstallation {
    <#
    .SYNOPSIS
        Installs software packages by category.
    .DESCRIPTION
        Ensures winget is available, loads the catalog, installs packages in
        the requested categories, and optionally includes optional/peripheral
        packages.
    .PARAMETER Categories
        List of catalog categories to install (default: essential, recommended, keep).
    .PARAMETER IncludeOptional
        When true, also installs optional category packages.
    .PARAMETER IncludePeripherals
        When true, installs peripheral packages based on hardware detection.
    .OUTPUTS
        None.
    #>
    param(
        [string[]]$Categories = @("essential", "recommended", "keep"),
        [bool]$IncludeOptional = $false,
        [bool]$IncludePeripherals = $true
    )

    Write-Log "Starting software installation..." "INFO"

    if (-not (Test-WingetAvailable)) {
        Write-Log "winget not available. Attempting to install..." "INFO"
        if (-not (Install-Winget)) {
            Write-Log "winget installation failed. Skipping software installation." "ERROR"
            return
        }
    }

    $catalog = Get-SoftwareCatalog
    if (-not $catalog) {
        Write-Log "Could not load software catalog. Skipping software installation." "ERROR"
        return
    }

    $installed = 0
    $failed = 0

    try {
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


Export-ModuleMember -Function @(
    'Test-WingetAvailable',
    'Install-Winget',
    'Get-SoftwareCatalog',
    'Test-HardwarePeripherals',
    'Install-PackageFromCatalog',
    'Install-PeripheralSoftware',
    'Invoke-SoftwareInstallation'
)
