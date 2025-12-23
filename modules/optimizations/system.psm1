#Requires -RunAsAdministrator

<#
.SYNOPSIS
    System-level optimizations (page file, memory compression, fast startup)
.DESCRIPTION
    Core Windows system optimizations for gaming performance:
    - Fixed page file sizing (4GB for 32GB+ RAM, 8GB for 16GB RAM)
    - Memory compression management (opt-in disable for 32GB+ RAM)
    - Fast startup disable (cleaner boots)

    Page File Logic (User Decision):
    - 32GB+ RAM: 4GB fixed page file
    - 16GB RAM: 8GB fixed page file
    - < 16GB RAM: Keep system-managed (not modified)
.NOTES
    Author: @thepedroferrari
    Risk Level: TIER_2_MED (page file changes can affect stability)
    Reversible: Yes (via Undo-SystemOptimizations)
#>

# Import core modules
Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global

#region Detection Functions

<#
.SYNOPSIS
    Get total system RAM in GB
.OUTPUTS
    [int] Total RAM in gigabytes (rounded)
#>
function Get-SystemRAM {
    try {
        $totalRAM = [math]::Round((Get-CimInstance Win32_PhysicalMemory -ErrorAction Stop |
            Measure-Object -Property Capacity -Sum).Sum / 1GB)

        Write-Log "System RAM detected: ${totalRAM}GB" "INFO"
        return $totalRAM
    } catch {
        Write-Log "Error detecting system RAM: $_" "ERROR"
        return 0
    }
}

<#
.SYNOPSIS
    Verify system optimizations are applied correctly
.OUTPUTS
    [bool] True if all optimizations verified, false otherwise
#>
function Test-SystemOptimizations {
    $allPassed = $true

    Write-Log "Verifying system optimizations..." "INFO"

    try {
        # Check 1: Page file configuration
        $ComputerSystem = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
        $totalRAM = Get-SystemRAM

        if ($totalRAM -ge 16) {
            if ($ComputerSystem.AutomaticManagedPagefile -eq $false) {
                Write-Log "✓ Automatic page file management disabled" "SUCCESS"

                $PageFile = Get-WmiObject -Query "Select * From Win32_PageFileSetting Where Name='C:\\pagefile.sys'"
                if ($PageFile) {
                    $expectedSize = if ($totalRAM -ge 32) { 4096 } else { 8192 }

                    if ($PageFile.InitialSize -eq $expectedSize -and $PageFile.MaximumSize -eq $expectedSize) {
                        Write-Log "✓ Page file size: ${expectedSize}MB (correct for ${totalRAM}GB RAM)" "SUCCESS"
                    } else {
                        Write-Log "✗ Page file size mismatch (current: $($PageFile.InitialSize)MB, expected: ${expectedSize}MB)" "ERROR"
                        $allPassed = $false
                    }
                } else {
                    Write-Log "✗ Page file not found" "ERROR"
                    $allPassed = $false
                }
            } else {
                Write-Log "✗ Automatic page file management still enabled" "ERROR"
                $allPassed = $false
            }
        }

        # Check 2: Fast startup disabled
        $hiberboot = Get-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -Name "HiberbootEnabled"
        if ($hiberboot -eq 0) {
            Write-Log "✓ Fast Startup disabled" "SUCCESS"
        } else {
            Write-Log "✗ Fast Startup not disabled (current value: $hiberboot)" "ERROR"
            $allPassed = $false
        }

        # Check 3: Memory compression (informational only)
        $mmAgent = Get-MMAgent -ErrorAction SilentlyContinue
        if ($mmAgent) {
            $compressionStatus = if ($mmAgent.MemoryCompression) { "enabled" } else { "disabled" }
            Write-Log "Memory compression: $compressionStatus" "INFO"
        }

    } catch {
        Write-Log "Error during verification: $_" "ERROR"
        $allPassed = $false
    }

    return $allPassed
}

#endregion

#region Apply Functions

<#
.SYNOPSIS
    Set fixed page file size based on system RAM
.DESCRIPTION
    Configures page file with fixed sizing strategy:
    - 32GB+ RAM: 4GB (4096 MB) fixed
    - 16GB RAM: 8GB (8192 MB) fixed
    - < 16GB RAM: Keep system-managed (no change)

    Fixed sizing provides predictable performance and prevents dynamic resizing overhead.

    WEB_CONFIG: system.page_file_size_gb (dropdown: 4, 8, 16, "system-managed", default: "auto-detect")
    Description: "4GB for 32GB+ RAM, 8GB for 16GB RAM (user preference)"
    Risk Level: TIER_2_MED
#>
function Set-PageFile {
    try {
        $totalRAM = Get-SystemRAM

        if ($totalRAM -lt 16) {
            Write-Log "System has ${totalRAM}GB RAM - keeping automatic page file management" "INFO"
            return
        }

        # Determine page file size based on RAM
        $pageFileSize = if ($totalRAM -ge 32) {
            4096  # 32GB+ RAM: 4GB page file
        } else {
            8192  # 16GB RAM: 8GB page file
        }

        Write-Log "System has ${totalRAM}GB RAM - setting ${pageFileSize}MB fixed page file" "INFO"

        # Disable automatic page file management
        $ComputerSystem = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
        if ($ComputerSystem.AutomaticManagedPagefile) {
            $ComputerSystem.AutomaticManagedPagefile = $false
            $ComputerSystem.Put() | Out-Null
            Write-Log "Disabled automatic page file management" "SUCCESS"
        }

        # Set fixed size page file
        $PageFile = Get-WmiObject -Query "Select * From Win32_PageFileSetting Where Name='C:\\pagefile.sys'"
        if ($PageFile) {
            $PageFile.InitialSize = $pageFileSize
            $PageFile.MaximumSize = $pageFileSize
            $PageFile.Put() | Out-Null
            $sizeGB = [math]::Round($pageFileSize / 1024, 1)
            Write-Log "Set page file to fixed ${pageFileSize}MB size (${sizeGB}GB)" "SUCCESS"
        } else {
            # Create page file if it doesn't exist
            $PageFile = ([WMIClass]"Win32_PageFileSetting").CreateInstance()
            $PageFile.Name = "C:\pagefile.sys"
            $PageFile.InitialSize = $pageFileSize
            $PageFile.MaximumSize = $pageFileSize
            $PageFile.Put() | Out-Null
            Write-Log "Created fixed ${pageFileSize}MB page file" "SUCCESS"
        }

        Write-Log "Page file changes require restart to take effect" "INFO"

    } catch {
        Write-Log "Error configuring page file: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Disable memory compression on systems with 32GB+ RAM (opt-in)
.DESCRIPTION
    Memory compression trades CPU cycles for reduced memory pressure.
    On systems with ample RAM (32GB+), disabling can reduce CPU overhead.

    Default: KEEP ENABLED (even on 32GB+ systems) unless validated with ETW traces.

    WEB_CONFIG: system.memory_compression_disabled (boolean, default: false)
    Description: "Disable memory compression on 32GB+ RAM (opt-in, validate with ETW first)"
    Risk Level: TIER_1_LOW
#>
function Set-MemoryCompression {
    param(
        [bool]$Disable = $false
    )

    try {
        $totalRAM = Get-SystemRAM

        if ($Disable -and $totalRAM -ge 32) {
            Disable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue
            Write-Log "Disabled memory compression (system has ${totalRAM}GB RAM)" "SUCCESS"
        } else {
            if ($totalRAM -ge 32) {
                Write-Log "Keeping memory compression enabled (default, even with ${totalRAM}GB RAM)" "INFO"
            } else {
                Write-Log "Keeping memory compression enabled (system has ${totalRAM}GB RAM)" "INFO"
            }
        }

    } catch {
        Write-Log "Error configuring memory compression: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Disable Fast Startup (hybrid boot)
.DESCRIPTION
    Fast Startup uses hibernation for faster boot times, but can cause issues:
    - Hardware not fully reinitialized
    - Driver state inconsistencies
    - Boot from true cold state preferred for gaming PCs

    WEB_CONFIG: system.fast_startup_disabled (boolean, default: true)
    Description: "Disable Fast Startup for cleaner boots (recommended for gaming)"
    Risk Level: TIER_1_LOW
#>
function Disable-FastStartup {
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power"

    # Backup registry before changes
    Backup-RegistryKey -Path $regPath

    try {
        Set-RegistryValue -Path $regPath -Name "HiberbootEnabled" -Value 0 -Type "DWORD"
        Write-Log "Disabled Fast Startup (cleaner boots, better for gaming)" "SUCCESS"

    } catch {
        Write-Log "Error disabling fast startup: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Disable Explorer auto folder-type detection
.DESCRIPTION
    Prevents Explorer from rescanning folder types; improves responsiveness.
#>
function Disable-ExplorerAutoType {
    try {
        $shellPath = "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\Bags\AllFolders\Shell"
        Backup-RegistryKey -Path $shellPath
        Set-RegistryValue -Path $shellPath -Name "FolderType" -Value "NotSpecified" -Type "String"
        Write-Log "Disabled Explorer auto folder-type detection" "SUCCESS"
    } catch {
        Write-Log "Error disabling Explorer auto-type: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Run Disk Cleanup (ResetBase)
.DESCRIPTION
    Frees component store space before updates.
#>
function Invoke-DiskCleanup {
    try {
        Dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase 2>&1 | Out-Null
        Write-Log "Disk cleanup complete" "SUCCESS"
    } catch {
        Write-Log "Error running Disk Cleanup: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Purge TEMP folders
.DESCRIPTION
    Clears user and system temp to avoid cache bloat.
#>
function Invoke-TempPurge {
    try {
        $tempPaths = @("$env:TEMP","$env:WINDIR\Temp")
        foreach ($p in $tempPaths) {
            if (Test-Path $p) {
                Get-ChildItem -Path $p -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
            }
        }
        Write-Log "Temp folders cleared" "SUCCESS"
    } catch {
        Write-Log "Error purging temp folders: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Trim non-critical services to Manual
.DESCRIPTION
    Sets curated list of services to Manual and stops them.
#>
function Set-ServiceTrimSafe {
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Service trim skipped" "INFO"
        return
    }

    $services = @("DiagTrack","dmwappushservice","lfsvc","RetailDemo","Fax","SharedAccess","XblGameSave","XblAuthManager","XboxNetApiSvc")

    foreach ($svc in $services) {
        try {
            Set-Service -Name $svc -StartupType Manual -EA SilentlyContinue
            Stop-Service -Name $svc -Force -EA SilentlyContinue
            Write-Log "Trimmed service to Manual: $svc" "SUCCESS"
        } catch {
            Write-Log "Could not trim service $svc : $_" "ERROR"
        }
    }
}

<#
.SYNOPSIS
    Block Razer/OEM auto-installs
.DESCRIPTION
    Disables Razer-related services/tasks if present to avoid WPBT-style installs.
#>
function Disable-RazerAutoInstall {
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Razer/OEM block skipped" "INFO"
        return
    }

    try {
        $razerServices = Get-Service | Where-Object { $_.Name -like "Razer*" }
        foreach ($svc in $razerServices) {
            try { Stop-Service $svc -Force -EA SilentlyContinue; Set-Service $svc -StartupType Disabled -EA SilentlyContinue } catch {}
        }

        $razerTasks = Get-ScheduledTask | Where-Object { $_.TaskName -like "*Razer*" }
        if ($razerTasks) { $razerTasks | Disable-ScheduledTask -EA SilentlyContinue | Out-Null }

        Write-Log "Razer/OEM auto-install payloads blocked (services/tasks disabled)" "SUCCESS"
    } catch {
        Write-Log "Error blocking Razer/OEM auto-installs: $_" "ERROR"
    }
}

#endregion

#region Main Functions

<#
.SYNOPSIS
    Apply all system optimizations
.DESCRIPTION
    Main entry point for system-level optimizations.
    Applies page file, fast startup, and optionally memory compression settings.
.PARAMETER DisableMemoryCompression
    If true, disables memory compression on systems with 32GB+ RAM (opt-in)
#>
function Invoke-SystemOptimizations {
    param(
        [bool]$DisableMemoryCompression = $false,
        [bool]$DisableExplorerAutoType = $true,
        [bool]$RunDiskCleanup = $true,
        [bool]$RunTempPurge = $true,
        [bool]$ServiceTrimSafe = $true,
        [bool]$BlockRazer = $true
    )

    Write-Log "Applying system optimizations..." "INFO"

    try {
        # Set fixed page file (4GB for 32GB+ RAM, 8GB for 16GB RAM)
        Set-PageFile

        # Disable fast startup
        Disable-FastStartup

        # Memory compression (opt-in disable for 32GB+ RAM)
        Set-MemoryCompression -Disable $DisableMemoryCompression

        if ($DisableExplorerAutoType) {
            Disable-ExplorerAutoType
        }

        if ($RunDiskCleanup) {
            Invoke-DiskCleanup
        }

        if ($RunTempPurge) {
            Invoke-TempPurge
        }

        Set-ServiceTrimSafe -Enable $ServiceTrimSafe

        Disable-RazerAutoInstall -Enable $BlockRazer

        Write-Log "System optimizations complete" "SUCCESS"

    } catch {
        Write-Log "Error applying system optimizations: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Rollback system optimizations to defaults
.DESCRIPTION
    Restores system settings to Windows defaults:
    - Page file: System-managed (automatic)
    - Fast startup: Enabled
    - Memory compression: Enabled
#>
function Undo-SystemOptimizations {
    Write-Log "Rolling back system optimizations..." "INFO"

    try {
        # Restore page file to system-managed
        $ComputerSystem = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
        if (-not $ComputerSystem.AutomaticManagedPagefile) {
            $ComputerSystem.AutomaticManagedPagefile = $true
            $ComputerSystem.Put() | Out-Null
            Write-Log "Restored automatic page file management" "SUCCESS"
        }

        # Remove custom page file settings
        $PageFile = Get-WmiObject -Query "Select * From Win32_PageFileSetting Where Name='C:\\pagefile.sys'"
        if ($PageFile) {
            $PageFile.Delete()
            Write-Log "Removed custom page file settings" "SUCCESS"
        }

        # Restore fast startup registry
        $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power"
        if (Restore-RegistryKey -Path $regPath) {
            Write-Log "Restored Fast Startup registry settings" "SUCCESS"
        } else {
            # Fallback: enable fast startup manually
            Set-RegistryValue -Path $regPath -Name "HiberbootEnabled" -Value 1 -Type "DWORD"
            Write-Log "Re-enabled Fast Startup" "SUCCESS"
        }

        # Restore Explorer auto-type
        $shellPath = "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\Bags\AllFolders\Shell"
        Restore-RegistryKey -Path $shellPath | Out-Null

        # Re-enable memory compression
        Enable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue
        Write-Log "Re-enabled memory compression" "SUCCESS"

        Write-Log "System optimization rollback complete (restart required)" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}

#endregion

# Export functions
Export-ModuleMember -Function @(
    'Get-SystemRAM',
    'Set-PageFile',
    'Set-MemoryCompression',
    'Disable-FastStartup',
    'Disable-ExplorerAutoType',
    'Invoke-DiskCleanup',
    'Invoke-TempPurge',
    'Set-ServiceTrimSafe',
    'Disable-RazerAutoInstall',
    'Test-SystemOptimizations',
    'Invoke-SystemOptimizations',
    'Undo-SystemOptimizations'
)

