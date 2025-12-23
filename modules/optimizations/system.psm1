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
    'Test-SystemOptimizations',
    'Invoke-SystemOptimizations',
    'Undo-SystemOptimizations'
)

