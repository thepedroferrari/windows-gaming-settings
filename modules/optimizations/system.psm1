#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global



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


function Test-SystemOptimizations {
    $allPassed = $true

    Write-Log "Verifying system optimizations..." "INFO"

    try {
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

        $hiberboot = Get-RegistryValue -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -Name "HiberbootEnabled"
        if ($hiberboot -eq 0) {
            Write-Log "✓ Fast Startup disabled" "SUCCESS"
        } else {
            Write-Log "✗ Fast Startup not disabled (current value: $hiberboot)" "ERROR"
            $allPassed = $false
        }

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




function Set-PageFile {
    try {
        $totalRAM = Get-SystemRAM

        if ($totalRAM -lt 16) {
            Write-Log "System has ${totalRAM}GB RAM - keeping automatic page file management" "INFO"
            return
        }

        $pageFileSize = if ($totalRAM -ge 32) {
            4096
        } else {
            8192
        }

        Write-Log "System has ${totalRAM}GB RAM - setting ${pageFileSize}MB fixed page file" "INFO"

        $ComputerSystem = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
        if ($ComputerSystem.AutomaticManagedPagefile) {
            $ComputerSystem.AutomaticManagedPagefile = $false
            $ComputerSystem.Put() | Out-Null
            Write-Log "Disabled automatic page file management" "SUCCESS"
        }

        $PageFile = Get-WmiObject -Query "Select * From Win32_PageFileSetting Where Name='C:\\pagefile.sys'"
        if ($PageFile) {
            $PageFile.InitialSize = $pageFileSize
            $PageFile.MaximumSize = $pageFileSize
            $PageFile.Put() | Out-Null
            $sizeGB = [math]::Round($pageFileSize / 1024, 1)
            Write-Log "Set page file to fixed ${pageFileSize}MB size (${sizeGB}GB)" "SUCCESS"
        } else {
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


function Disable-FastStartup {
    $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power"

    Backup-RegistryKey -Path $regPath

    try {
        Set-RegistryValue -Path $regPath -Name "HiberbootEnabled" -Value 0 -Type "DWORD"
        Write-Log "Disabled Fast Startup (cleaner boots, better for gaming)" "SUCCESS"

    } catch {
        Write-Log "Error disabling fast startup: $_" "ERROR"
        throw
    }
}


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


function Invoke-DiskCleanup {
    param(
        [switch]$Async,
        [int]$ThresholdPercent = 90
    )

    try {
        # Check disk usage before running expensive cleanup
        $sysDrive = (Get-CimInstance Win32_OperatingSystem).SystemDrive
        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='$sysDrive'"
        $usedPercent = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 1)
        $freeGB = [math]::Round($disk.FreeSpace / 1GB, 1)

        if ($usedPercent -lt $ThresholdPercent) {
            Write-Log "System drive $usedPercent% full (${freeGB}GB free) - skipping cleanup (threshold: ${ThresholdPercent}%)" "INFO"
            return
        }

        Write-Log "System drive $usedPercent% full (${freeGB}GB free) - running cleanup" "INFO"

        # Set cleanup flags for cleanmgr
        $cleanupKey = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\VolumeCaches"
        Get-ChildItem $cleanupKey -EA SilentlyContinue | ForEach-Object {
            Set-ItemProperty -Path $_.PSPath -Name "StateFlags0100" -Value 2 -EA SilentlyContinue
        }

        # Run cleanmgr synchronously (reasonably fast)
        Start-Process "cleanmgr.exe" -ArgumentList "/sagerun:100" -Wait -WindowStyle Hidden
        Write-Log "Disk Cleanup (cleanmgr) complete" "SUCCESS"

        if ($Async) {
            # DISM ResetBase can take 10-30+ minutes, run async with notification
            $dismJob = Start-Job -ScriptBlock {
                Dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase 2>&1 | Out-Null
            }

            Register-ObjectEvent -InputObject $dismJob -EventName StateChanged -Action {
                if ($Sender.State -eq 'Completed') {
                    try {
                        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
                        $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
                        $text = $template.GetElementsByTagName("text")
                        $text.Item(0).AppendChild($template.CreateTextNode("Gaming PC Setup")) | Out-Null
                        $text.Item(1).AppendChild($template.CreateTextNode("DISM ResetBase complete! Disk space reclaimed.")) | Out-Null
                        $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Gaming PC Setup")
                        $notifier.Show([Windows.UI.Notifications.ToastNotification]::new($template))
                    } catch {
                        # Toast failed silently
                    }
                    Unregister-Event -SourceIdentifier $Event.SourceIdentifier
                    Remove-Job $Sender
                }
            } | Out-Null

            Write-Log "DISM ResetBase started in background (toast notification on completion)" "INFO"
        } else {
            # Synchronous mode for backwards compatibility
            Dism.exe /Online /Cleanup-Image /StartComponentCleanup /ResetBase 2>&1 | Out-Null
            Write-Log "DISM ResetBase complete" "SUCCESS"
        }
    } catch {
        Write-Log "Error running Disk Cleanup: $_" "ERROR"
        throw
    }
}


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


function New-RestorePoint {
    <#
    .SYNOPSIS
        Creates a Windows System Restore Point before applying optimizations.
    .DESCRIPTION
        Safety feature - creates a restore point so user can roll back if needed.
        Requires System Restore to be enabled on the system drive.
    #>
    param(
        [string]$Description = "Pre-Gaming-PC-Setup"
    )

    try {
        # Check if System Restore is enabled
        $srStatus = Get-ComputerRestorePoint -ErrorAction SilentlyContinue

        # Enable System Restore on C: if needed (will fail silently if already enabled)
        Enable-ComputerRestore -Drive "C:\" -ErrorAction SilentlyContinue

        # Create restore point
        Checkpoint-Computer -Description $Description -RestorePointType "MODIFY_SETTINGS" -ErrorAction Stop
        Write-Log "Created System Restore Point: $Description" "SUCCESS"
        return $true
    } catch {
        if ($_.Exception.Message -like "*1058*" -or $_.Exception.Message -like "*disabled*") {
            Write-Log "System Restore is disabled - skipping restore point creation" "INFO"
        } elseif ($_.Exception.Message -like "*frequency*" -or $_.Exception.Message -like "*already*") {
            Write-Log "Restore point recently created (Windows limits frequency) - continuing" "INFO"
        } else {
            Write-Log "Could not create restore point: $_" "ERROR"
        }
        return $false
    }
}


function Set-ClassicContextMenu {
    <#
    .SYNOPSIS
        Restores the classic Windows 10-style right-click context menu on Windows 11.
    .DESCRIPTION
        Windows 11's new context menu is slower and requires extra clicks.
        This tweak restores the full classic menu for faster navigation.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Classic context menu: skipped" "INFO"
        return
    }

    try {
        # Check if Windows 11
        $build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
        if ($build -lt 22000) {
            Write-Log "Classic context menu: Not needed (Windows 10 detected)" "INFO"
            return
        }

        $classicMenuPath = "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32"

        # Create the key path if it doesn't exist
        if (-not (Test-Path $classicMenuPath)) {
            New-Item -Path $classicMenuPath -Force | Out-Null
        }

        # Set empty default value to enable classic menu
        Set-ItemProperty -Path $classicMenuPath -Name "(Default)" -Value "" -Force

        Write-Log "Classic right-click context menu enabled (restart Explorer to apply)" "SUCCESS"
    } catch {
        Write-Log "Error setting classic context menu: $_" "ERROR"
    }
}


function Disable-StorageSense {
    <#
    .SYNOPSIS
        Disables Windows Storage Sense automatic cleanup.
    .DESCRIPTION
        Storage Sense can cause background disk activity during gaming.
        Disabling it prevents unexpected cleanup operations.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Disable Storage Sense: skipped" "INFO"
        return
    }

    try {
        $storagePath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy"
        Backup-RegistryKey -Path $storagePath

        # Disable Storage Sense
        Set-RegistryValue -Path $storagePath -Name "01" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $storagePath -Name "StoragePoliciesNotified" -Value 1 -Type "DWORD"

        Write-Log "Disabled Storage Sense (no background cleanup during gaming)" "SUCCESS"
    } catch {
        Write-Log "Error disabling Storage Sense: $_" "ERROR"
    }
}


function Set-DisplayPerformance {
    <#
    .SYNOPSIS
        Configures Windows visual effects for maximum performance.
    .DESCRIPTION
        Disables animations, shadows, and other visual effects that consume GPU/CPU resources.
        Reduces visual overhead for slightly better gaming performance.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Display performance mode: skipped" "INFO"
        return
    }

    try {
        $visualPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects"
        Backup-RegistryKey -Path $visualPath
        Set-RegistryValue -Path $visualPath -Name "VisualFXSetting" -Value 2 -Type "DWORD"  # 2 = Custom (we'll set individual settings)

        $advancedPath = "HKCU:\Control Panel\Desktop"
        Backup-RegistryKey -Path $advancedPath
        Set-RegistryValue -Path $advancedPath -Name "DragFullWindows" -Value "0" -Type "String"
        Set-RegistryValue -Path $advancedPath -Name "MenuShowDelay" -Value "0" -Type "String"

        $windowMetrics = "HKCU:\Control Panel\Desktop\WindowMetrics"
        Backup-RegistryKey -Path $windowMetrics
        Set-RegistryValue -Path $windowMetrics -Name "MinAnimate" -Value "0" -Type "String"

        $explorerPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced"
        Backup-RegistryKey -Path $explorerPath
        Set-RegistryValue -Path $explorerPath -Name "TaskbarAnimations" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $explorerPath -Name "ListviewAlphaSelect" -Value 0 -Type "DWORD"
        Set-RegistryValue -Path $explorerPath -Name "ListviewShadow" -Value 0 -Type "DWORD"

        Write-Log "Set display for performance (reduced visual effects)" "SUCCESS"
    } catch {
        Write-Log "Error setting display performance: $_" "ERROR"
    }
}


function Enable-TaskbarEndTask {
    <#
    .SYNOPSIS
        Enables "End Task" option when right-clicking taskbar items.
    .DESCRIPTION
        Useful for quickly killing frozen games or unresponsive applications
        without needing to open Task Manager.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Taskbar End Task: skipped" "INFO"
        return
    }

    try {
        $taskbarPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings"

        if (-not (Test-Path $taskbarPath)) {
            New-Item -Path $taskbarPath -Force | Out-Null
        }

        Backup-RegistryKey -Path $taskbarPath
        Set-RegistryValue -Path $taskbarPath -Name "TaskbarEndTask" -Value 1 -Type "DWORD"

        Write-Log "Enabled 'End Task' in taskbar right-click menu" "SUCCESS"
    } catch {
        Write-Log "Error enabling taskbar End Task: $_" "ERROR"
    }
}


function Remove-ExplorerClutter {
    <#
    .SYNOPSIS
        Removes Home and Gallery from Windows 11 Explorer navigation pane.
    .DESCRIPTION
        Cleans up Explorer navigation for faster access to files.
        Only applies to Windows 11.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Remove Explorer clutter: skipped" "INFO"
        return
    }

    try {
        # Check if Windows 11
        $build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
        if ($build -lt 22000) {
            Write-Log "Remove Explorer clutter: Not needed (Windows 10 detected)" "INFO"
            return
        }

        # Remove Home from Explorer
        $homePath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}"
        if (Test-Path $homePath) {
            Remove-Item -Path $homePath -Force -ErrorAction SilentlyContinue
            Write-Log "Removed 'Home' from Explorer navigation" "SUCCESS"
        }

        # Remove Gallery from Explorer
        $galleryPath = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}"
        if (Test-Path $galleryPath) {
            Remove-Item -Path $galleryPath -Force -ErrorAction SilentlyContinue
            Write-Log "Removed 'Gallery' from Explorer navigation" "SUCCESS"
        }

    } catch {
        Write-Log "Error removing Explorer clutter: $_" "ERROR"
    }
}




function Invoke-SystemOptimizations {
    param(
        [bool]$DisableMemoryCompression = $false,
        [bool]$DisableExplorerAutoType = $true,
        [bool]$RunDiskCleanup = $true,
        [bool]$RunTempPurge = $true,
        [bool]$ServiceTrimSafe = $true,
        [bool]$BlockRazer = $true,
        [bool]$ClassicContextMenu = $true,
        [bool]$DisableStorageSense = $true,
        [bool]$DisplayPerformance = $true,
        [bool]$TaskbarEndTask = $true,
        [bool]$RemoveExplorerClutter = $true
    )

    Write-Log "Applying system optimizations..." "INFO"

    try {
        Set-PageFile

        Disable-FastStartup

        Set-MemoryCompression -Disable $DisableMemoryCompression

        if ($DisableExplorerAutoType) {
            Disable-ExplorerAutoType
        }

        if ($RunDiskCleanup) {
            Invoke-DiskCleanup -Async
        }

        if ($RunTempPurge) {
            Invoke-TempPurge
        }

        Set-ServiceTrimSafe -Enable $ServiceTrimSafe

        Disable-RazerAutoInstall -Enable $BlockRazer

        # New WinUtil-inspired tweaks
        Set-ClassicContextMenu -Enable $ClassicContextMenu

        Disable-StorageSense -Enable $DisableStorageSense

        Set-DisplayPerformance -Enable $DisplayPerformance

        Enable-TaskbarEndTask -Enable $TaskbarEndTask

        Remove-ExplorerClutter -Enable $RemoveExplorerClutter

        Write-Log "System optimizations complete" "SUCCESS"

    } catch {
        Write-Log "Error applying system optimizations: $_" "ERROR"
        throw
    }
}


function Undo-SystemOptimizations {
    Write-Log "Rolling back system optimizations..." "INFO"

    try {
        $ComputerSystem = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
        if (-not $ComputerSystem.AutomaticManagedPagefile) {
            $ComputerSystem.AutomaticManagedPagefile = $true
            $ComputerSystem.Put() | Out-Null
            Write-Log "Restored automatic page file management" "SUCCESS"
        }

        $PageFile = Get-WmiObject -Query "Select * From Win32_PageFileSetting Where Name='C:\\pagefile.sys'"
        if ($PageFile) {
            $PageFile.Delete()
            Write-Log "Removed custom page file settings" "SUCCESS"
        }

        $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power"
        if (Restore-RegistryKey -Path $regPath) {
            Write-Log "Restored Fast Startup registry settings" "SUCCESS"
        } else {
            Set-RegistryValue -Path $regPath -Name "HiberbootEnabled" -Value 1 -Type "DWORD"
            Write-Log "Re-enabled Fast Startup" "SUCCESS"
        }

        $shellPath = "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\Bags\AllFolders\Shell"
        Restore-RegistryKey -Path $shellPath | Out-Null

        Enable-MMAgent -MemoryCompression -ErrorAction SilentlyContinue
        Write-Log "Re-enabled memory compression" "SUCCESS"

        Write-Log "System optimization rollback complete (restart required)" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}


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
    'New-RestorePoint',
    'Set-ClassicContextMenu',
    'Disable-StorageSense',
    'Set-DisplayPerformance',
    'Enable-TaskbarEndTask',
    'Remove-ExplorerClutter',
    'Test-SystemOptimizations',
    'Invoke-SystemOptimizations',
    'Undo-SystemOptimizations'
)

