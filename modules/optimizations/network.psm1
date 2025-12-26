<#
.SYNOPSIS
    Network performance and latency optimizations.
.DESCRIPTION
    Tunes adapter settings, DNS providers, IPv4 preference, Teredo, QoS, and
    TCP stack parameters aimed at gaming latency and stability.
.NOTES
    Requires Administrator. Some changes require reboot or router QoS support.
#>
#Requires -RunAsAdministrator



Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global



function Get-ActiveNetworkAdapter {
    <#
    .SYNOPSIS
        Finds the first active Ethernet or Wi-Fi adapter.
    .DESCRIPTION
        Scans enabled adapters and selects the first matching Ethernet/Wi-Fi
        interface for subsequent configuration.
    .OUTPUTS
        [Microsoft.Management.Infrastructure.CimInstance] Adapter object or $null.
    #>
    try {
        $adapter = Get-NetAdapter | Where-Object {
            $_.Status -eq "Up" -and
            ($_.InterfaceDescription -like "*Ethernet*" -or $_.InterfaceDescription -like "*Wi-Fi*")
        } | Select-Object -First 1

        if ($adapter) {
            Write-Log "Detected network adapter: $($adapter.Name)" "INFO"
        } else {
            Write-Log "No active network adapter found" "ERROR"
        }

        return $adapter
    } catch {
        Write-Log "Error detecting network adapter: $_" "ERROR"
        return $null
    }
}


function Test-NetworkOptimizations {
    <#
    .SYNOPSIS
        Verifies network-related registry settings.
    .DESCRIPTION
        Checks for Receive Side Scaling (RSS) enablement.
    .OUTPUTS
        [bool] True when checks pass, else false.
    #>
    $allPassed = $true

    Write-Log "Verifying network optimizations..." "INFO"

    $tcpPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
    $rssEnabled = Get-RegistryValue -Path $tcpPath -Name "EnableRSS"
    if ($rssEnabled -eq 1) {
        Write-Log "✓ RSS (Receive Side Scaling) enabled" "SUCCESS"
    } else {
        Write-Log "✗ RSS not enabled" "ERROR"
        $allPassed = $false
    }

    return $allPassed
}




function Set-NetworkAdapterOptimizations {
    <#
    .SYNOPSIS
        Applies adapter-level network optimizations.
    .DESCRIPTION
        Enables RSS and optionally disables RSC. Attempts to disable adapter
        power saving for more consistent latency.
    .PARAMETER DisableRSC
        When true, disables Receive Segment Coalescing (opt-in).
    .OUTPUTS
        None.
    #>
    param(
        [bool]$DisableRSC = $false
    )

    try {
        $adapter = Get-ActiveNetworkAdapter
        if (-not $adapter) { return }

        $tcpPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
        Backup-RegistryKey -Path $tcpPath

        Set-RegistryValue -Path $tcpPath -Name "EnableRSS" -Value 1 -Type "DWORD"
        Write-Log "Enabled RSS (Receive Side Scaling) for multi-core performance" "SUCCESS"

        if ($DisableRSC) {
            Set-RegistryValue -Path $tcpPath -Name "EnableRSC" -Value 0 -Type "DWORD"
            Write-Log "Disabled RSC (opt-in, validate with network monitoring)" "SUCCESS"
        } else {
            Write-Log "RSC kept enabled (default, disable only if measured jitter)" "INFO"
        }

        try {
            $adapterGuid = $adapter.InterfaceGuid
            $powerMgmt = Get-WmiObject MSPower_DeviceEnable -Namespace root\wmi | Where-Object { $_.InstanceName -like "*$adapterGuid*" }
            if ($powerMgmt) {
                $powerMgmt.Enable = $false
                $powerMgmt.Put() | Out-Null
                Write-Log "Disabled power saving for network adapter" "SUCCESS"
            }
        } catch {
            Write-Log "Could not disable network adapter power saving (may require manual config)" "ERROR"
        }

    } catch {
        Write-Log "Error optimizing network adapter: $_" "ERROR"
        throw
    }
}


function Set-DNSProvider {
    <#
    .SYNOPSIS
        Sets the DNS resolver for the active adapter.
    .DESCRIPTION
        Applies a well-known DNS provider or restores ISP defaults via DHCP.
        Flushes DNS cache and performs a simple resolution test.
    .PARAMETER Provider
        DNS provider name: cloudflare, google, quad9, adguard, opendns, isp.
    .OUTPUTS
        None.
    #>
    param(
        [ValidateSet("cloudflare", "google", "quad9", "adguard", "opendns", "isp")]
        [string]$Provider = "cloudflare"
    )

    try {
        $adapter = Get-ActiveNetworkAdapter
        if (-not $adapter) { return }

        $primaryDNS = ""
        $secondaryDNS = ""

        switch ($Provider) {
            "cloudflare" {
                $primaryDNS = "1.1.1.1"
                $secondaryDNS = "1.0.0.1"
                Write-Log "Setting Cloudflare DNS (high privacy)" "INFO"
            }
            "google" {
                $primaryDNS = "8.8.8.8"
                $secondaryDNS = "8.8.4.4"
                Write-Log "Setting Google DNS (reliable)" "INFO"
            }
            "quad9" {
                $primaryDNS = "9.9.9.9"
                $secondaryDNS = "149.112.112.112"
                Write-Log "Setting Quad9 DNS (high privacy, blocks malware)" "INFO"
            }
            "adguard" {
                $primaryDNS = "94.140.14.14"
                $secondaryDNS = "94.140.15.15"
                Write-Log "Setting AdGuard DNS (privacy + blocking)" "INFO"
            }
            "opendns" {
                $primaryDNS = "208.67.222.222"
                $secondaryDNS = "208.67.220.220"
                Write-Log "Setting OpenDNS (reliable, filtering options)" "INFO"
            }
            "isp" {
                Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ResetServerAddresses
                Write-Log "Restored ISP default DNS (DHCP)" "SUCCESS"
                return
            }
        }

        Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses ($primaryDNS, $secondaryDNS) -ErrorAction Stop
        Write-Log "IPv4 DNS set to ${Provider}: ${primaryDNS}, ${secondaryDNS}" "SUCCESS"

        ipconfig /flushdns 2>&1 | Out-Null
        Write-Log "DNS cache flushed" "SUCCESS"

        try {
            $testResult = Resolve-DnsName -Name "google.com" -Server $primaryDNS -ErrorAction Stop -QuickTimeout
            if ($testResult) {
                Write-Log "DNS resolution test successful" "SUCCESS"
            }
        } catch {
            Write-Log "DNS resolution test failed (network may need time to update)" "ERROR"
        }

        Write-Log "NOTE: DNS provider does NOT affect ping to game servers" "INFO"
        Write-Log "It only improves name resolution speed (e.g., when typing URLs)" "INFO"

    } catch {
        Write-Log "Error configuring DNS: $_" "ERROR"
        throw
    }
}


function Set-IPv4Preference {
    <#
    .SYNOPSIS
        Optionally prefers IPv4 over IPv6.
    .DESCRIPTION
        Sets the DisabledComponents value to prefer IPv4. Requires reboot.
    .PARAMETER Enable
        When true, applies IPv4 preference.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $false
    )

    if (-not $Enable) {
        Write-Log "IPv4 preference skipped" "INFO"
        return
    }

    try {
        $path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
        Backup-RegistryKey -Path $path
        Set-RegistryValue -Path $path -Name "DisabledComponents" -Value 32 -Type "DWORD"
        Write-Log "Set IPv4 preference over IPv6 (reboot required)" "SUCCESS"
    } catch {
        Write-Log "Error setting IPv4 preference: $_" "ERROR"
    }
}


function Disable-Teredo {
    <#
    .SYNOPSIS
        Optionally disables Teredo IPv6 tunneling.
    .DESCRIPTION
        Disables Teredo via netsh when requested. Requires reboot for full effect.
    .PARAMETER Enable
        When true, disables Teredo.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $false
    )

    if (-not $Enable) {
        Write-Log "Teredo disable skipped" "INFO"
        return
    }

    try {
        netsh interface teredo set state disabled 2>&1 | Out-Null
        Write-Log "Teredo disabled (reboot recommended)" "SUCCESS"
    } catch {
        Write-Log "Error disabling Teredo: $_" "ERROR"
    }
}


function Set-QoSConfiguration {
    <#
    .SYNOPSIS
        Creates QoS policies for selected game executables.
    .DESCRIPTION
        Adds per-executable QoS policies with DSCP 46 for priority handling.
    .PARAMETER GameExecutables
        Executable names to target (e.g., cs2.exe).
    .OUTPUTS
        None.
    #>
    param(
        [string[]]$GameExecutables = @("cs2.exe", "dota2.exe", "helldivers2.exe", "SpaceMarine2.exe")
    )

    try {
        Write-Log "Configuring QoS policies..." "INFO"

        foreach ($exe in $GameExecutables) {
            $qosPolicy = Get-NetQosPolicy -Name "Game-$exe" -ErrorAction SilentlyContinue
            if (-not $qosPolicy) {
                New-NetQosPolicy -Name "Game-$exe" -AppPathNameMatchCondition $exe -DSCPAction 46 -NetworkProfile All -ErrorAction Stop | Out-Null
                Write-Log "Created QoS policy for $exe (DSCP 46)" "SUCCESS"
            } else {
                Write-Log "QoS policy for $exe already exists" "INFO"
            }
        }

        Write-Log "QoS configuration complete" "SUCCESS"
        Write-Log "NOTE: Requires router QoS/SQM support to be effective" "INFO"

    } catch {
        Write-Log "Error configuring QoS (requires Windows Pro/Enterprise): $_" "ERROR"
    }
}




function Set-IPv4Preference {
    <#
    .SYNOPSIS
        Prefers IPv4 over IPv6 (registry-based).
    .DESCRIPTION
        Writes DisabledComponents to prefer IPv4 and warns about feature impact.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Setting IPv4 preference..." "INFO"

        $ipv6Path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
        Backup-RegistryKey -Path $ipv6Path

        # Value 32 = Prefer IPv4 over IPv6 (see Microsoft KB 929852)
        Set-RegistryValue -Path $ipv6Path -Name "DisabledComponents" -Value 32 -Type "DWORD"

        Write-Log "IPv4 preferred over IPv6" "SUCCESS"
        Write-Log "Warning: May break IPv6-only paths or Xbox/Store features" "INFO"
        Write-Log "Requires reboot to take effect" "INFO"

    } catch {
        Write-Log "Error setting IPv4 preference: $_" "ERROR"
        throw
    }
}


function Disable-Teredo {
    <#
    .SYNOPSIS
        Disables Teredo IPv6 tunneling (registry + netsh).
    .DESCRIPTION
        Disables Teredo and updates DisabledComponents to prevent tunneling.
    .OUTPUTS
        None.
    #>
    try {
        Write-Log "Disabling Teredo IPv6 tunneling..." "INFO"

        $result = netsh interface teredo set state disabled 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Teredo disabled via netsh" "SUCCESS"
        }

        $ipv6Path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters"
        Backup-RegistryKey -Path $ipv6Path

        $currentValue = Get-RegistryValue -Path $ipv6Path -Name "DisabledComponents"
        if ($null -eq $currentValue) { $currentValue = 0 }

        $newValue = $currentValue -bor 1
        Set-RegistryValue -Path $ipv6Path -Name "DisabledComponents" -Value $newValue -Type "DWORD"

        Write-Log "Teredo IPv6 tunneling disabled" "SUCCESS"
        Write-Log "Warning: May break Xbox Live connectivity" "INFO"
        Write-Log "Requires reboot to take effect" "INFO"

    } catch {
        Write-Log "Error disabling Teredo: $_" "ERROR"
        throw
    }
}


function Enable-QoSGaming {
    <#
    .SYNOPSIS
        Creates QoS policies to prioritize gaming network traffic.
    .DESCRIPTION
        Configures Windows QoS to mark gaming UDP traffic with high priority
        DSCP values for better handling by routers that support QoS.
    .PARAMETER Enable
        When true, creates QoS policies for gaming traffic.
    .PARAMETER GamePorts
        UDP port ranges to mark with DSCP 46.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true,
        [string[]]$GamePorts = @("27015-27030", "3478-3480", "7000-9000")  # Common game ports
    )

    if (-not $Enable) {
        Write-Log "QoS Gaming: skipped" "INFO"
        return
    }

    try {
        # Remove existing gaming QoS policies first
        Get-NetQosPolicy | Where-Object { $_.Name -like "RockTune-*" } | Remove-NetQosPolicy -Confirm:$false -ErrorAction SilentlyContinue

        # Create QoS policy for UDP gaming traffic with DSCP 46 (Expedited Forwarding)
        foreach ($portRange in $GamePorts) {
            $policyName = "RockTune-Gaming-$($portRange -replace '-','to')"
            New-NetQosPolicy -Name $policyName `
                -NetworkProfile All `
                -IPProtocolMatchCondition UDP `
                -IPDstPortMatchCondition $portRange `
                -DSCPAction 46 `
                -ErrorAction SilentlyContinue | Out-Null
        }

        # Create policy for common voice chat (Discord, etc.)
        New-NetQosPolicy -Name "RockTune-VoiceChat" `
            -NetworkProfile All `
            -IPProtocolMatchCondition UDP `
            -IPDstPortMatchCondition "50000-50100" `
            -DSCPAction 46 `
            -ErrorAction SilentlyContinue | Out-Null

        Write-Log "QoS Gaming policies created (DSCP 46 for game traffic)" "SUCCESS"
        Write-Log "Note: Router must support QoS for full benefit" "INFO"
    } catch {
        Write-Log "Error enabling QoS Gaming: $_" "ERROR"
    }
}


function Disable-NetworkThrottling {
    <#
    .SYNOPSIS
        Disables Windows network throttling mechanisms.
    .DESCRIPTION
        Removes the NetworkThrottlingIndex limit that Windows applies
        to multimedia streaming to prevent network congestion.
        This can improve network performance for games.
    .PARAMETER Enable
        When true, disables network throttling.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "Disable network throttling: skipped" "INFO"
        return
    }

    try {
        $mmcssPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile"
        Backup-RegistryKey -Path $mmcssPath

        # Set NetworkThrottlingIndex to maximum (0xFFFFFFFF = disabled)
        Set-RegistryValue -Path $mmcssPath -Name "NetworkThrottlingIndex" -Value 0xFFFFFFFF -Type "DWORD"

        # Also set SystemResponsiveness to 0 for minimum reserved bandwidth
        Set-RegistryValue -Path $mmcssPath -Name "SystemResponsiveness" -Value 0 -Type "DWORD"

        Write-Log "Disabled network throttling (maximum throughput)" "SUCCESS"
    } catch {
        Write-Log "Error disabling network throttling: $_" "ERROR"
    }
}


function Set-TCPOptimizations {
    <#
    .SYNOPSIS
        Optimizes TCP stack settings for gaming.
    .DESCRIPTION
        Configures TCP settings for lower latency gaming including
        disabling Nagle's algorithm, optimizing ACK behavior, and
        tuning window scaling.
    .PARAMETER Enable
        When true, applies TCP stack changes.
    .OUTPUTS
        None.
    #>
    param(
        [bool]$Enable = $true
    )

    if (-not $Enable) {
        Write-Log "TCP optimizations: skipped" "INFO"
        return
    }

    try {
        $tcpPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
        Backup-RegistryKey -Path $tcpPath

        # Disable Nagle's Algorithm globally (reduces latency)
        Set-RegistryValue -Path $tcpPath -Name "TcpNoDelay" -Value 1 -Type "DWORD"

        # Reduce TCP ACK frequency for faster acknowledgments
        Set-RegistryValue -Path $tcpPath -Name "TcpAckFrequency" -Value 1 -Type "DWORD"

        # Disable TCP/IP auto-tuning for more predictable behavior
        netsh int tcp set global autotuninglevel=disabled 2>&1 | Out-Null

        # Disable ECN (Explicit Congestion Notification) - can cause issues with some games
        netsh int tcp set global ecncapability=disabled 2>&1 | Out-Null

        # Disable timestamps for slightly lower overhead
        netsh int tcp set global timestamps=disabled 2>&1 | Out-Null

        # Set higher initial RTO (Retransmission Timeout) for stable connections
        netsh int tcp set global initialRto=2000 2>&1 | Out-Null

        Write-Log "TCP stack optimized for gaming (Nagle off, fast ACK)" "SUCCESS"
    } catch {
        Write-Log "Error applying TCP optimizations: $_" "ERROR"
    }
}


function Invoke-NetworkOptimizations {
    <#
    .SYNOPSIS
        Applies the full network optimization set.
    .DESCRIPTION
        Tunes adapter settings, DNS, IPv4/Teredo, and optional QoS policies.
    .PARAMETER DNSProvider
        DNS provider to apply (cloudflare, google, quad9, adguard, opendns, isp).
    .PARAMETER DisableRSC
        Disables Receive Segment Coalescing when true.
    .PARAMETER PreferIPv4
        Prefers IPv4 over IPv6 when true.
    .PARAMETER DisableTeredo
        Disables Teredo tunneling when true.
    .PARAMETER EnableQoS
        Enables per-game QoS policies when true.
    .PARAMETER GameExecutables
        Executable names for per-game QoS policy creation.
    .OUTPUTS
        None.
    #>
    param(
        [ValidateSet("cloudflare", "google", "quad9", "adguard", "opendns", "isp")]
        [string]$DNSProvider = "cloudflare",

        [bool]$DisableRSC = $false,

        [bool]$PreferIPv4 = $false,

        [bool]$DisableTeredo = $false,

        [bool]$EnableQoS = $false,

        [string[]]$GameExecutables = @("cs2.exe", "dota2.exe", "helldivers2.exe", "SpaceMarine2.exe")
    )

    Write-Log "Applying network optimizations..." "INFO"

    try {
        Set-NetworkAdapterOptimizations -DisableRSC $DisableRSC

        Set-DNSProvider -Provider $DNSProvider

        Set-IPv4Preference -Enable $PreferIPv4

        Disable-Teredo -Enable $DisableTeredo

        if ($EnableQoS) {
            Set-QoSConfiguration -GameExecutables $GameExecutables
        }

        if ($PreferIPv4) {
            Set-IPv4Preference
        }

        if ($DisableTeredo) {
            Disable-Teredo
        }

        Write-Log "Network optimizations complete" "SUCCESS"

    } catch {
        Write-Log "Error applying network optimizations: $_" "ERROR"
        throw
    }
}


function Undo-NetworkOptimizations {
    <#
    .SYNOPSIS
        Reverts network-related changes.
    .DESCRIPTION
        Resets DNS to DHCP, restores IPv6 defaults, removes QoS policies,
        and restores TCP/IP registry settings.
    .OUTPUTS
        None.
    #>
    Write-Log "Rolling back network optimizations..." "INFO"

    try {
        $adapter = Get-ActiveNetworkAdapter
        if ($adapter) {
            Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ResetServerAddresses
            Write-Log "Restored ISP default DNS" "SUCCESS"
        }

        try {
            Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" -Name "DisabledComponents" -Value 0 -ErrorAction SilentlyContinue
            Write-Log "Restored IPv6 component defaults" "SUCCESS"
        } catch {}

        try { netsh interface teredo set state default 2>&1 | Out-Null } catch {}

        $qosPolicies = Get-NetQosPolicy | Where-Object { $_.Name -like "Game-*" }
        foreach ($policy in $qosPolicies) {
            Remove-NetQosPolicy -Name $policy.Name -Confirm:$false -ErrorAction SilentlyContinue
            Write-Log "Removed QoS policy: $($policy.Name)" "SUCCESS"
        }

        $tcpPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
        if (Restore-RegistryKey -Path $tcpPath) {
            Write-Log "Restored TCP/IP registry settings" "SUCCESS"
        }

        Write-Log "Network optimization rollback complete" "SUCCESS"

    } catch {
        Write-Log "Error during rollback: $_" "ERROR"
        throw
    }
}


Export-ModuleMember -Function @(
    'Get-ActiveNetworkAdapter',
    'Set-NetworkAdapterOptimizations',
    'Set-DNSProvider',
    'Set-IPv4Preference',
    'Disable-Teredo',
    'Set-QoSConfiguration',
    'Enable-QoSGaming',
    'Disable-NetworkThrottling',
    'Set-TCPOptimizations',
    'Test-NetworkOptimizations',
    'Invoke-NetworkOptimizations',
    'Undo-NetworkOptimizations'
)
