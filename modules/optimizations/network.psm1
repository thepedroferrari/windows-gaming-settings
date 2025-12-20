#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Network optimizations for gaming
.DESCRIPTION
    Evidence-based network optimizations. Most TCP tweaks removed per PRD research.

    CRITICAL FINDING from PRD: Most modern games use UDP, not TCP.
    TCP tweaks like TcpAckFrequency, TCPNoDelay, NetworkThrottlingIndex are folklore
    and have NO EFFECT on UDP traffic.

    What actually matters:
    - DNS provider selection (doesn't affect ping, but improves name resolution speed)
    - RSS (Receive Side Scaling) - keep enabled
    - RSC (Receive Segment Coalescing) - disable only if measured jitter
    - NIC driver stability
    - Router QoS/SQM (out of scope for this script)

    Breaking Changes from old script:
    - Removed TcpAckFrequency (irrelevant for UDP games)
    - Removed TCPNoDelay (irrelevant for UDP games)
    - Removed NetworkThrottlingIndex (folklore, no evidence)
    - DNS: User choice, with note that it doesn't affect ping
.NOTES
    Author: @thepedroferrari
    Risk Level: TIER_1_LOW
    Reversible: Yes (via Undo-NetworkOptimizations)
#>

# Import core modules
Import-Module (Join-Path $PSScriptRoot "..\core\logger.psm1") -Force -Global
Import-Module (Join-Path $PSScriptRoot "..\core\registry.psm1") -Force -Global

#region Detection Functions

<#
.SYNOPSIS
    Get active network adapter
.OUTPUTS
    [Microsoft.Management.Infrastructure.CimInstance] Network adapter object or $null
#>
function Get-ActiveNetworkAdapter {
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

<#
.SYNOPSIS
    Verify network optimizations are applied correctly
.OUTPUTS
    [bool] True if all optimizations verified, false otherwise
#>
function Test-NetworkOptimizations {
    $allPassed = $true

    Write-Log "Verifying network optimizations..." "INFO"

    # Check RSS enabled
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

#endregion

#region Apply Functions

<#
.SYNOPSIS
    Set network adapter optimizations
.DESCRIPTION
    Configures NIC-level settings for reduced latency.

    Evidence-based optimizations only:
    - RSS: Keep enabled (multi-core packet processing)
    - RSC: Disable only if measured jitter (opt-in)
    - NIC power saving: Disabled

    WEB_CONFIG: network.adapter_optimized (boolean, default: true)
    Description: "Optimize network adapter (RSS enabled, power saving disabled)"
    Risk Level: TIER_1_LOW
.PARAMETER DisableRSC
    Opt-in to disable RSC (Receive Segment Coalescing). Only enable if you've
    measured jitter with network monitoring tools.
#>
function Set-NetworkAdapterOptimizations {
    param(
        [bool]$DisableRSC = $false
    )

    try {
        $adapter = Get-ActiveNetworkAdapter
        if (-not $adapter) { return }

        # Global TCP/IP settings
        $tcpPath = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters"
        Backup-RegistryKey -Path $tcpPath

        # Keep RSS enabled (Receive Side Scaling) - improves performance on multi-core
        Set-RegistryValue -Path $tcpPath -Name "EnableRSS" -Value 1 -Type "DWORD"
        Write-Log "Enabled RSS (Receive Side Scaling) for multi-core performance" "SUCCESS"

        # RSC (Receive Segment Coalescing) - disable only if measured jitter
        if ($DisableRSC) {
            Set-RegistryValue -Path $tcpPath -Name "EnableRSC" -Value 0 -Type "DWORD"
            Write-Log "Disabled RSC (opt-in, validate with network monitoring)" "SUCCESS"
        } else {
            Write-Log "RSC kept enabled (default, disable only if measured jitter)" "INFO"
        }

        # Disable network adapter power saving
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

<#
.SYNOPSIS
    Set DNS provider
.DESCRIPTION
    Configures DNS servers. Note: DNS provider does NOT affect ping to game servers.
    It only affects name resolution speed (e.g., when typing a URL).

    Providers:
    - Cloudflare: 1.1.1.1, 1.0.0.1 (high privacy, fast)
    - Google: 8.8.8.8, 8.8.4.4 (reliable, medium privacy)
    - Quad9: 9.9.9.9, 149.112.112.112 (high privacy, blocks malware)
    - ISP Default: Use DHCP (recommended if ISP is close and reliable)

    WEB_CONFIG: network.dns_provider (dropdown: "cloudflare", "google", "quad9", "isp-default", default: "cloudflare")
    Description: "DNS provider (does NOT affect ping, only name resolution speed)"
    Risk Level: TIER_0_SAFE
.PARAMETER Provider
    DNS provider: "cloudflare", "google", "quad9", or "isp" (DHCP)
#>
function Set-DNSProvider {
    param(
        [ValidateSet("cloudflare", "google", "quad9", "isp")]
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
            "isp" {
                Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ResetServerAddresses
                Write-Log "Restored ISP default DNS (DHCP)" "SUCCESS"
                return
            }
        }

        # Set IPv4 DNS servers
        Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses ($primaryDNS, $secondaryDNS) -ErrorAction Stop
        Write-Log "IPv4 DNS set to ${Provider}: ${primaryDNS}, ${secondaryDNS}" "SUCCESS"

        # Flush DNS cache
        ipconfig /flushdns 2>&1 | Out-Null
        Write-Log "DNS cache flushed" "SUCCESS"

        # Test DNS resolution
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

<#
.SYNOPSIS
    Set QoS (Quality of Service) policies for game executables
.DESCRIPTION
    Creates Windows QoS policies to prioritize game traffic.

    DSCP value 46 (EF - Expedited Forwarding) gives highest priority.
    Requires Windows Pro/Enterprise and router QoS support.

    WEB_CONFIG: network.qos_enabled (boolean, default: false)
    Description: "Enable QoS policies for game traffic (requires Pro/Enterprise)"
    Risk Level: TIER_1_LOW
    Note: "Requires router QoS/SQM support to be effective"
.PARAMETER GameExecutables
    Array of game executable names to prioritize
#>
function Set-QoSConfiguration {
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

#endregion

#region Main Functions

<#
.SYNOPSIS
    Apply all network optimizations
.DESCRIPTION
    Main entry point for network optimizations.
.PARAMETER DNSProvider
    DNS provider: "cloudflare", "google", "quad9", or "isp" (default)
.PARAMETER DisableRSC
    Opt-in to disable RSC (only if measured jitter)
.PARAMETER EnableQoS
    Enable QoS policies (requires Pro/Enterprise)
.PARAMETER GameExecutables
    Game executables for QoS policies
#>
function Invoke-NetworkOptimizations {
    param(
        [ValidateSet("cloudflare", "google", "quad9", "isp")]
        [string]$DNSProvider = "cloudflare",

        [bool]$DisableRSC = $false,

        [bool]$EnableQoS = $false,

        [string[]]$GameExecutables = @("cs2.exe", "dota2.exe", "helldivers2.exe", "SpaceMarine2.exe")
    )

    Write-Log "Applying network optimizations..." "INFO"

    try {
        # Network adapter optimizations
        Set-NetworkAdapterOptimizations -DisableRSC $DisableRSC

        # DNS provider
        Set-DNSProvider -Provider $DNSProvider

        # QoS (opt-in)
        if ($EnableQoS) {
            Set-QoSConfiguration -GameExecutables $GameExecutables
        }

        Write-Log "Network optimizations complete" "SUCCESS"

    } catch {
        Write-Log "Error applying network optimizations: $_" "ERROR"
        throw
    }
}

<#
.SYNOPSIS
    Rollback network optimizations to defaults
.DESCRIPTION
    Restores network settings to Windows defaults.
#>
function Undo-NetworkOptimizations {
    Write-Log "Rolling back network optimizations..." "INFO"

    try {
        # Restore DNS to ISP default (DHCP)
        $adapter = Get-ActiveNetworkAdapter
        if ($adapter) {
            Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ResetServerAddresses
            Write-Log "Restored ISP default DNS" "SUCCESS"
        }

        # Remove QoS policies
        $qosPolicies = Get-NetQosPolicy | Where-Object { $_.Name -like "Game-*" }
        foreach ($policy in $qosPolicies) {
            Remove-NetQosPolicy -Name $policy.Name -Confirm:$false -ErrorAction SilentlyContinue
            Write-Log "Removed QoS policy: $($policy.Name)" "SUCCESS"
        }

        # Restore registry
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

#endregion

# Export functions
Export-ModuleMember -Function @(
    'Get-ActiveNetworkAdapter',
    'Set-NetworkAdapterOptimizations',
    'Set-DNSProvider',
    'Set-QoSConfiguration',
    'Test-NetworkOptimizations',
    'Invoke-NetworkOptimizations',
    'Undo-NetworkOptimizations'
)
