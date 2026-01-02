#Requires -RunAsAdministrator
<#
.SYNOPSIS
    RockTune Universal Loader - Execute shared loadouts via one-liner

.DESCRIPTION
    This script enables direct execution of RockTune loadouts from a URL.
    Configuration is passed via query parameters, parsed at runtime.

    SECURITY: LUDICROUS tier optimizations (IDs 100-103) are NOT included.
    Recipients must use the web UI to enable dangerous optimizations.

.EXAMPLE
    irm "https://rocktune.pedroferrari.com/run.ps1?c=1&g=1&o=1,2,10" | iex

.EXAMPLE
    irm "https://rocktune.pedroferrari.com/run.ps1?c=1&g=1&d=1&o=1,2,3,10,11&s=steam,discord" | iex

.NOTES
    Generated from RockTune web app: https://rocktune.pedroferrari.com
    Source: https://github.com/thepedroferrari/rocktune
#>

# ════════════════════════════════════════════════════════════════════════════
# PARSE URL FROM INVOCATION
# ════════════════════════════════════════════════════════════════════════════

$invokedLine = $MyInvocation.Line
$urlMatch = [regex]::Match($invokedLine, 'irm\s+[''"]?([^''"|\s]+)')
if (-not $urlMatch.Success) {
    Write-Host "ERROR: Could not parse URL from invocation." -ForegroundColor Red
    Write-Host "Usage: irm `"https://rocktune.pedroferrari.com/run.ps1?c=1&g=1&o=1,2,3`" | iex" -ForegroundColor Yellow
    exit 1
}
$url = $urlMatch.Groups[1].Value

# Parse query string
try {
    $uri = [System.Uri]$url
    Add-Type -AssemblyName System.Web
    $query = [System.Web.HttpUtility]::ParseQueryString($uri.Query)
} catch {
    Write-Host "ERROR: Invalid URL format." -ForegroundColor Red
    exit 1
}

# Extract parameters
$cpuId = $query['c']
$gpuId = $query['g']
$dnsId = $query['d']
$peripheralIds = if ($query['p']) { $query['p'] -split ',' } else { @() }
$monitorIds = if ($query['m']) { $query['m'] -split ',' } else { @() }
$optIds = if ($query['o']) { $query['o'] -split ',' } else { @() }
$pkgKeys = if ($query['s']) { $query['s'] -split ',' } else { @() }

# ════════════════════════════════════════════════════════════════════════════
# ID MAPPINGS (from share-registry.ts)
# ════════════════════════════════════════════════════════════════════════════

$CPU_MAP = @{ '1'='amd_x3d'; '2'='amd'; '3'='intel' }
$GPU_MAP = @{ '1'='nvidia'; '2'='amd'; '3'='intel' }
$DNS_MAP = @{
    '1' = @{ name='Cloudflare'; primary='1.1.1.1'; secondary='1.0.0.1' }
    '2' = @{ name='Google'; primary='8.8.8.8'; secondary='8.8.4.4' }
    '3' = @{ name='Quad9'; primary='9.9.9.9'; secondary='149.112.112.112' }
    '4' = @{ name='OpenDNS'; primary='208.67.222.222'; secondary='208.67.220.220' }
    '5' = @{ name='AdGuard'; primary='94.140.14.14'; secondary='94.140.15.15' }
}

# ════════════════════════════════════════════════════════════════════════════
# PACKAGE MAPPINGS (from catalog.json)
# ════════════════════════════════════════════════════════════════════════════

$PACKAGE_MAP = @{
    'steam' = @{ id='Valve.Steam'; name='Steam' }
    'epic' = @{ id='EpicGames.EpicGamesLauncher'; name='Epic Games' }
    'gog' = @{ id='GOG.Galaxy'; name='GOG Galaxy' }
    'battlenet' = @{ id='Blizzard.BattleNet'; name='Battle.net' }
    'ea' = @{ id='ElectronicArts.EADesktop'; name='EA App' }
    'ubisoft' = @{ id='Ubisoft.Connect'; name='Ubisoft Connect' }
    'xbox' = @{ id='Microsoft.GamingApp'; name='Xbox' }
    'riot' = @{ id='RiotGames.LeagueOfLegends.EUW'; name='Riot Client' }
    'rockstar' = @{ id='Rockstar.RockstarGamesLauncher'; name='Rockstar' }
    'itch' = @{ id='itch.itch'; name='itch.io' }
    'amazon' = @{ id='Amazon.Games'; name='Amazon Games' }
    'playnite' = @{ id='Playnite.Playnite'; name='Playnite' }
    'heroic' = @{ id='HeroicGamesLauncher.HeroicGamesLauncher'; name='Heroic' }
    'discord' = @{ id='Discord.Discord'; name='Discord' }
    'teamspeak' = @{ id='TeamSpeakSystems.TeamSpeakClient'; name='TeamSpeak' }
    'guilded' = @{ id='Guilded.Guilded'; name='Guilded' }
    'parsec' = @{ id='Parsec.Parsec'; name='Parsec' }
    'moonlight' = @{ id='MoonlightGameStreamingProject.Moonlight'; name='Moonlight' }
    'obs' = @{ id='OBSProject.OBSStudio'; name='OBS Studio' }
    'streamlabs' = @{ id='Streamlabs.Streamlabs'; name='Streamlabs' }
    'twitchstudio' = @{ id='Twitch.TwitchStudio'; name='Twitch Studio' }
    'voicemeeter' = @{ id='VB-Audio.Voicemeeter.Potato'; name='Voicemeeter' }
    'nvidiabroadcast' = @{ id='Nvidia.Broadcast'; name='NVIDIA Broadcast' }
    'medal' = @{ id='Medal.Medal'; name='Medal.tv' }
    'elgato' = @{ id='Elgato.StreamDeck'; name='Stream Deck' }
    'prism' = @{ id='PRISMLiveStudio.PRISMLiveStudio'; name='Prism Live' }
    'sunshine' = @{ id='LizardByte.Sunshine'; name='Sunshine' }
    'steamlink' = @{ id='Valve.SteamLink'; name='Steam Link' }
    'hwinfo' = @{ id='REALiX.HWiNFO'; name='HWiNFO' }
    'afterburner' = @{ id='Guru3D.Afterburner'; name='Afterburner' }
    'cpuz' = @{ id='CPUID.CPU-Z'; name='CPU-Z' }
    'gpuz' = @{ id='TechPowerUp.GPU-Z'; name='GPU-Z' }
    'coretemp' = @{ id='ALCPU.CoreTemp'; name='Core Temp' }
    'crystaldiskinfo' = @{ id='CrystalDewWorld.CrystalDiskInfo'; name='CrystalDiskInfo' }
    'crystaldiskmark' = @{ id='CrystalDewWorld.CrystalDiskMark'; name='CrystalDiskMark' }
    'fpsmonitor' = @{ id='FPSMonitor.FPSMonitor'; name='FPS Monitor' }
    'openhardwaremonitor' = @{ id='OpenHardwareMonitor.OpenHardwareMonitor'; name='Open Hardware Monitor' }
    'nvcleanstall' = @{ id='TechPowerUp.NVCleanstall'; name='NVCleanstall' }
    'displaydriveruninstaller' = @{ id='Wagnardsoft.DisplayDriverUninstaller'; name='DDU' }
    'processlasso' = @{ id='BitSum.ProcessLasso'; name='Process Lasso' }
    'rtss' = @{ id='Guru3D.RTSS'; name='RTSS' }
    'capframex' = @{ id='CXWorld.CapFrameX'; name='CapFrameX' }
    'latencymon' = @{ id='Resplendence.LatencyMon'; name='LatencyMon' }
    'fancontrol' = @{ id='Rem0o.FanControl'; name='FanControl' }
    'librehardwaremonitor' = @{ id='LibreHardwareMonitor.LibreHardwareMonitor'; name='Libre Hardware Monitor' }
    'brave' = @{ id='Brave.Brave'; name='Brave' }
    'firefox' = @{ id='Mozilla.Firefox'; name='Firefox' }
    'chrome' = @{ id='Google.Chrome'; name='Chrome' }
    'edge' = @{ id='Microsoft.Edge'; name='Edge' }
    'operagx' = @{ id='Opera.OperaGX'; name='Opera GX' }
    'vivaldi' = @{ id='Vivaldi.Vivaldi'; name='Vivaldi' }
    'librewolf' = @{ id='LibreWolf.LibreWolf'; name='LibreWolf' }
    'torbrowser' = @{ id='TorProject.TorBrowser'; name='Tor Browser' }
    'vlc' = @{ id='VideoLAN.VLC'; name='VLC' }
    'spotify' = @{ id='Spotify.Spotify'; name='Spotify' }
    'foobar2000' = @{ id='PeterPawlowski.foobar2000'; name='foobar2000' }
    'mpchc' = @{ id='clsid2.mpc-hc'; name='MPC-HC' }
    'plex' = @{ id='Plex.Plex'; name='Plex' }
    'jellyfin' = @{ id='Jellyfin.JellyfinMediaPlayer'; name='Jellyfin' }
    'audacity' = @{ id='Audacity.Audacity'; name='Audacity' }
    'handbrake' = @{ id='HandBrake.HandBrake'; name='HandBrake' }
    'stremio' = @{ id='Stremio.Stremio'; name='Stremio' }
    'musicbee' = @{ id='MusicBee.MusicBee'; name='MusicBee' }
    '7zip' = @{ id='7zip.7zip'; name='7-Zip' }
    'sharex' = @{ id='ShareX.ShareX'; name='ShareX' }
    'powertoys' = @{ id='Microsoft.PowerToys'; name='PowerToys' }
    'everything' = @{ id='voidtools.Everything'; name='Everything' }
    'qbittorrent' = @{ id='qBittorrent.qBittorrent'; name='qBittorrent' }
    'bitwarden' = @{ id='Bitwarden.Bitwarden'; name='Bitwarden' }
    'keepassxc' = @{ id='KeePassXCTeam.KeePassXC'; name='KeePassXC' }
    'notepadplusplus' = @{ id='Notepad++.Notepad++'; name='Notepad++' }
    'wiztree' = @{ id='AntibodySoftware.WizTree'; name='WizTree' }
    'windirstat' = @{ id='WinDirStat.WinDirStat'; name='WinDirStat' }
    'autohotkey' = @{ id='AutoHotkey.AutoHotkey'; name='AutoHotkey' }
    'f.lux' = @{ id='flux.flux'; name='f.lux' }
    'winrar' = @{ id='RARLab.WinRAR'; name='WinRAR' }
    'peazip' = @{ id='Giorgiotani.Peazip'; name='PeaZip' }
    'revo' = @{ id='RevoUninstaller.RevoUninstaller'; name='Revo Uninstaller' }
    'bulk' = @{ id='TGRMNSoftware.BulkRenameUtility'; name='Bulk Rename' }
    'imageglass' = @{ id='ImageGlass.ImageGlass'; name='ImageGlass' }
    'flameshot' = @{ id='Flameshot.Flameshot'; name='Flameshot' }
    'ditto' = @{ id='Ditto.Ditto'; name='Ditto' }
    'eartrumpet' = @{ id='File-New-Project.EarTrumpet'; name='EarTrumpet' }
    'bcuninstaller' = @{ id='Klocman.BulkCrapUninstaller'; name='Bulk Crap Uninstaller' }
    'sysinternals_suite' = @{ id='Microsoft.Sysinternals.Suite'; name='Sysinternals Suite' }
    'rainmeter' = @{ id='Rainmeter.Rainmeter'; name='Rainmeter' }
    'lively' = @{ id='rocksdanister.LivelyWallpaper'; name='Lively Wallpaper' }
    'logitechghub' = @{ id='Logitech.GHUB'; name='Logitech G HUB' }
    'razersynapse' = @{ id='RazerInc.RazerInstaller'; name='Razer Synapse' }
    'icue' = @{ id='Corsair.iCUE.5'; name='Corsair iCUE' }
    'steelseriesgg' = @{ id='SteelSeries.GG'; name='SteelSeries GG' }
    'armourycrate' = @{ id='ASUS.ArmouryCrate'; name='ASUS Armoury Crate' }
    'nzxtcam' = @{ id='NZXT.CAM'; name='NZXT CAM' }
    'signalrgb' = @{ id='WhirlwindFX.SignalRgb'; name='SignalRGB' }
    'openrgb' = @{ id='OpenRGB.OpenRGB'; name='OpenRGB' }
    'wooting' = @{ id='Wooting.Wootility'; name='Wootility' }
    'delldisplaymanager' = @{ id='Dell.DisplayManager'; name='Dell Display Manager' }
    'lgonscreencontrol' = @{ id='LG.OnScreenControl'; name='LG OnScreen Control' }
    'hpdisplaycenter' = @{ id='HP.DisplayCenter'; name='HP Display Center' }
    'vscode' = @{ id='Microsoft.VisualStudioCode'; name='VS Code' }
    'git' = @{ id='Git.Git'; name='Git' }
    'python' = @{ id='Python.Python.3.12'; name='Python' }
    'nodejs' = @{ id='OpenJS.NodeJS.LTS'; name='Node.js' }
    'wt' = @{ id='Microsoft.WindowsTerminal'; name='Terminal' }
    'docker' = @{ id='Docker.DockerDesktop'; name='Docker' }
    'postman' = @{ id='Postman.Postman'; name='Postman' }
    'github' = @{ id='GitHub.GitHubDesktop'; name='GitHub Desktop' }
    'sublime' = @{ id='SublimeHQ.SublimeText.4'; name='Sublime Text' }
    'neovim' = @{ id='Neovim.Neovim'; name='Neovim' }
    'wsl' = @{ id='Canonical.Ubuntu.2404'; name='Ubuntu (WSL)' }
    'jetbrains' = @{ id='JetBrains.Toolbox'; name='JetBrains Toolbox' }
    'powershell' = @{ id='Microsoft.PowerShell'; name='PowerShell' }
    'gh' = @{ id='GitHub.cli'; name='GitHub CLI' }
    'vcredist' = @{ id='Microsoft.VCRedist.2015+.x64'; name='VC++ Runtime' }
    'vcredist_x86' = @{ id='Microsoft.VCRedist.2015+.x86'; name='VC++ Runtime (x86)' }
    'dotnet' = @{ id='Microsoft.DotNet.DesktopRuntime.8'; name='.NET Runtime' }
    'dotnet_runtime_8' = @{ id='Microsoft.DotNet.Runtime.8'; name='.NET Runtime 8' }
    'dotnet_sdk_8' = @{ id='Microsoft.DotNet.SDK.8'; name='.NET SDK 8' }
    'directx' = @{ id='Microsoft.DirectX'; name='DirectX' }
    'java' = @{ id='Oracle.JavaRuntimeEnvironment'; name='Java' }
    'webview2' = @{ id='Microsoft.EdgeWebView2Runtime'; name='WebView2' }
    '3dmark' = @{ id='Futuremark.3DMark'; name='3DMark' }
    'cinebench' = @{ id='Maxon.Cinebench'; name='Cinebench' }
    'geekbench' = @{ id='Geekbench.Geekbench.6'; name='Geekbench' }
    'furmark' = @{ id='Geeks3D.FurMark'; name='FurMark' }
    'occt' = @{ id='OCBase.OCCT.Personal'; name='OCCT' }
    'unigine_heaven' = @{ id='Unigine.HeavenBenchmark'; name='Unigine Heaven' }
    'unigine_valley' = @{ id='Unigine.ValleyBenchmark'; name='Unigine Valley' }
    'unigine_superposition' = @{ id='Unigine.SuperpositionBenchmark'; name='Unigine Superposition' }
}

# ════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════

$script:SuccessCount = 0
$script:FailCount = 0
$script:WarningCount = 0

function Write-Banner {
    Write-Host @'
    ____             __   ______
   / __ \____  _____/ /__/_  __/_  ______  ___
  / /_/ / __ \/ ___/ //_/ / / / / / / __ \/ _ \
 / _, _/ /_/ / /__/ ,<   / / / /_/ / / / /  __/
/_/ |_|\____/\___/_/|_| /_/  \__,_/_/ /_/\___/

        Windows Gaming Loadout Builder
'@ -ForegroundColor Magenta
}

function Write-Step { param([string]$M) Write-Host "`n>> $M" -ForegroundColor Cyan }
function Write-OK { param([string]$M) $script:SuccessCount++; Write-Host "  [OK] $M" -ForegroundColor Green }
function Write-Fail { param([string]$M) $script:FailCount++; Write-Host "  [FAIL] $M" -ForegroundColor Red }
function Write-Warn { param([string]$M) $script:WarningCount++; Write-Host "  [!] $M" -ForegroundColor Yellow }

function Set-Reg {
    param([string]$Path, [string]$Name, $Value, [string]$Type = "DWORD", [switch]$PassThru)
    $success = $false
    try {
        if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
        $existing = Get-ItemProperty -Path $Path -Name $Name -EA SilentlyContinue
        if ($null -eq $existing) {
            New-ItemProperty -Path $Path -Name $Name -Value $Value -PropertyType $Type -Force | Out-Null
        } else {
            Set-ItemProperty -Path $Path -Name $Name -Value $Value -EA Stop
        }
        $success = $true
    } catch { $success = $false }
    if ($PassThru) { return $success }
}

# ════════════════════════════════════════════════════════════════════════════
# OPTIMIZATION FUNCTIONS (by ID from share-registry.ts)
# NOTE: LUDICROUS tier IDs (100-103) are intentionally NOT included
# ════════════════════════════════════════════════════════════════════════════

$OPT_FUNCTIONS = @{
    # SAFE tier (1-45)
    '1' = { # pagefile
        $ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object Capacity -Sum).Sum/1GB)
        if ($ram -ge 16) {
            $size = if ($ram -ge 32) { 4096 } else { 8192 }
            $cs = Get-WmiObject Win32_ComputerSystem -EnableAllPrivileges
            $cs.AutomaticManagedPagefile = $false; $cs.Put() | Out-Null
            $pf = Get-WmiObject -Query "Select * From Win32_PageFileSetting Where Name='C:\\pagefile.sys'" -EA SilentlyContinue
            if ($pf) {
                $pf.InitialSize = $size; $pf.MaximumSize = $size; $pf.Put() | Out-Null
                Write-OK "Page file set to ${size}MB fixed"
            } else { Write-Warn "Page file setting not found" }
        }
    }
    '2' = { # fastboot
        if (Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" "HiberbootEnabled" 0 -PassThru) { Write-OK "Fast startup disabled" }
    }
    '3' = { # timer
        Write-Host ""
        Write-Host "  [!] MANUAL STEP: Timer Resolution" -ForegroundColor Yellow
        Write-Host "      Download and run timer-tool.ps1 before gaming" -ForegroundColor Yellow
        Write-Host "      https://github.com/thepedroferrari/rocktune" -ForegroundColor Cyan
        Write-Host ""
    }
    '4' = { # power_plan
        powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-OK "High Performance power plan enabled" } else { Write-Warn "High Performance plan not available" }
    }
    '5' = { # usb_power
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\USB\DisableSelectiveSuspend" "DisableSelectiveSuspend" 1
        Write-OK "USB selective suspend disabled"
    }
    '6' = { # pcie_power
        powercfg /setacvalueindex scheme_current sub_pciexpress ee12f906-d166-476a-8f3a-af931b6e9d31 0 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            powercfg /setactive scheme_current 2>&1 | Out-Null
            Write-OK "PCIe power saving disabled"
        } else { Write-Warn "PCIe power setting not supported" }
    }
    '7' = { # dns - handled separately with dnsId
        # This is a placeholder - actual DNS setting is done in main logic
    }
    '8' = { # nagle
        $adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
        foreach ($adapter in $adapters) {
            $path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\$($adapter.InterfaceGuid)"
            Set-Reg $path "TcpAckFrequency" 1
            Set-Reg $path "TCPNoDelay" 1
        }
        Write-OK "Nagle algorithm disabled"
    }
    '9' = { # audio_enhancements
        Set-Reg "HKCU:\Software\Microsoft\Multimedia\Audio" "UserDuckingPreference" 3
        Write-OK "Audio ducking disabled"
    }
    '10' = { # gamedvr
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_Enabled" 0
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" "AllowGameDVR" 0
        Write-OK "Game DVR disabled"
    }
    '11' = { # background_apps
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" "GlobalUserDisabled" 1
        Write-OK "Background apps disabled"
    }
    '12' = { # edge_debloat
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Edge" "HideFirstRunExperience" 1
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Edge" "EdgeShoppingAssistantEnabled" 0
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Edge" "WebWidgetAllowed" 0
        Write-OK "Edge debloated"
    }
    '13' = { # copilot_disable
        Set-Reg "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot" "TurnOffWindowsCopilot" 1
        Write-OK "Copilot disabled"
    }
    '14' = { # explorer_speed
        Set-Reg "HKCU:\Software\Classes\Local Settings\Software\Microsoft\Windows\Shell\Bags\AllFolders\Shell" "FolderType" "NotSpecified" "String"
        Write-OK "Explorer speed optimized"
    }
    '15' = { # temp_purge
        Remove-Item "$env:TEMP\*" -Recurse -Force -EA SilentlyContinue
        Remove-Item "$env:WINDIR\Temp\*" -Recurse -Force -EA SilentlyContinue
        Write-OK "Temp folders purged"
    }
    '16' = { # razer_block
        Get-Service | Where-Object {$_.Name -like "Razer*"} | Stop-Service -Force -EA SilentlyContinue
        Get-Service | Where-Object {$_.Name -like "Razer*"} | Set-Service -StartupType Disabled -EA SilentlyContinue
        Write-OK "Razer services blocked"
    }
    '17' = { # restore_point
        $recentRestorePoint = $null
        try { $recentRestorePoint = Get-ComputerRestorePoint -EA Stop | Sort-Object CreationTime -Descending | Select-Object -First 1 } catch { $recentRestorePoint = $null }
        if ($recentRestorePoint -and $recentRestorePoint.CreationTime -gt (Get-Date).AddMinutes(-1440)) {
            Write-Warn "Restore point already created within last 24 hours (skipped)"
        } else {
            try {
                Checkpoint-Computer -Description "Before RockTune" -RestorePointType MODIFY_SETTINGS -EA Stop -WarningAction SilentlyContinue
                Write-OK "Restore point created"
            } catch {
                Write-Warn "Could not create restore point: $($_.Exception.Message)"
            }
        }
    }
    '18' = { # classic_menu
        $clsid = "{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}"
        $path = "HKCU:\Software\Classes\CLSID\$clsid\InprocServer32"
        if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
        Set-ItemProperty -Path $path -Name "(Default)" -Value ""
        Write-OK "Classic context menu enabled"
    }
    '19' = { # storage_sense
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\StorageSense\Parameters\StoragePolicy" "01" 0
        Write-OK "Storage Sense disabled"
    }
    '20' = { # display_perf
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" "VisualFXSetting" 2
        Write-OK "Visual effects set to performance"
    }
    '21' = { # end_task
        if (Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings" "TaskbarEndTask" 1 -PassThru) { Write-OK "End Task enabled in taskbar" }
    }
    '22' = { # explorer_cleanup
        Remove-Item "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}" -Force -EA SilentlyContinue
        Remove-Item "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Explorer\Desktop\NameSpace\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}" -Force -EA SilentlyContinue
        Write-OK "Explorer clutter removed"
    }
    '23' = { # notifications_off
        Set-Reg "HKCU:\Software\Policies\Microsoft\Windows\Explorer" "DisableNotificationCenter" 1
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications" "ToastEnabled" 0
        Write-OK "Notifications disabled"
    }
    '24' = { # ps7_telemetry
        [Environment]::SetEnvironmentVariable("POWERSHELL_TELEMETRY_OPTOUT", "1", "Machine")
        Write-OK "PS7 telemetry disabled"
    }
    '25' = { # multiplane_overlay
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows\Dwm" "OverlayTestMode" 5
        Write-OK "Multiplane Overlay disabled"
    }
    '26' = { # mouse_accel
        if (Set-Reg "HKCU:\Control Panel\Mouse" "MouseSpeed" 0 -PassThru) { Write-OK "Mouse acceleration disabled" }
        Set-Reg "HKCU:\Control Panel\Mouse" "MouseThreshold1" 0
        Set-Reg "HKCU:\Control Panel\Mouse" "MouseThreshold2" 0
    }
    '27' = { # usb_suspend
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\USB\DisableSelectiveSuspend" "DisableSelectiveSuspend" 1
        Write-OK "USB selective suspend disabled"
    }
    '28' = { # keyboard_response
        if (Set-Reg "HKCU:\Control Panel\Keyboard" "KeyboardDelay" 0 -PassThru) { Write-OK "Keyboard delay minimized" }
        Set-Reg "HKCU:\Control Panel\Keyboard" "KeyboardSpeed" 31
    }
    '29' = { # game_mode
        Set-Reg "HKCU:\Software\Microsoft\GameBar" "AllowAutoGameMode" 1
        Set-Reg "HKCU:\Software\Microsoft\GameBar" "AutoGameModeEnabled" 1
        Write-OK "Game Mode enabled"
    }
    '30' = { # min_processor_state
        powercfg /setacvalueindex scheme_current sub_processor PROCTHROTTLEMIN 5 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            powercfg /setactive scheme_current 2>&1 | Out-Null
            Write-OK "Min processor state set to 5%"
        } else { Write-Warn "Min processor state setting not supported" }
    }
    '31' = { # hibernation_disable
        powercfg /hibernate off 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Write-OK "Hibernation disabled" } else { Write-Warn "Could not disable hibernation" }
    }
    '32' = { # rss_enable
        Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {
            Enable-NetAdapterRss -Name $_.Name -EA SilentlyContinue
        }
        Write-OK "RSS enabled on active adapters"
    }
    '33' = { # adapter_power
        Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {
            Set-NetAdapterPowerManagement -Name $_.Name -WakeOnMagicPacket Disabled -WakeOnPattern Disabled -EA SilentlyContinue
        }
        Write-OK "Network adapter power saving disabled"
    }
    '34' = { # delivery_opt
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Config" "DODownloadMode" 0
        Write-OK "Delivery Optimization P2P disabled"
    }
    '35' = { # wer_disable
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows\Windows Error Reporting" "Disabled" 1
        Stop-Service WerSvc -Force -EA SilentlyContinue
        Set-Service WerSvc -StartupType Disabled -EA SilentlyContinue
        Write-OK "Windows Error Reporting disabled"
    }
    '36' = { # wifi_sense
        Set-Reg "HKLM:\SOFTWARE\Microsoft\WcmSvc\wifinetworkmanager\config" "AutoConnectAllowedOEM" 0
        Write-OK "WiFi Sense disabled"
    }
    '37' = { # spotlight_disable
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "RotatingLockScreenEnabled" 0
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "RotatingLockScreenOverlayEnabled" 0
        Write-OK "Windows Spotlight disabled"
    }
    '38' = { # feedback_disable
        Set-Reg "HKCU:\Software\Microsoft\Siuf\Rules" "NumberOfSIUFInPeriod" 0
        Write-OK "Windows Feedback prompts disabled"
    }
    '39' = { # clipboard_sync
        Set-Reg "HKCU:\Software\Microsoft\Clipboard" "EnableClipboardHistory" 0
        Write-OK "Cloud Clipboard sync disabled"
    }
    '40' = { # accessibility_shortcuts
        Set-Reg "HKCU:\Control Panel\Accessibility\StickyKeys" "Flags" "506" "String"
        Set-Reg "HKCU:\Control Panel\Accessibility\Keyboard Response" "Flags" "122" "String"
        Set-Reg "HKCU:\Control Panel\Accessibility\ToggleKeys" "Flags" "58" "String"
        Set-Reg "HKCU:\Control Panel\Accessibility\MouseKeys" "Flags" "58" "String"
        Write-OK "Accessibility shortcuts disabled (no more Sticky Keys popup)"
    }
    '41' = { # audio_communications
        Set-Reg "HKCU:\Software\Microsoft\Multimedia\Audio" "UserDuckingPreference" 3
        Write-OK "Volume ducking disabled (full volume during calls)"
    }
    '42' = { # audio_system_sounds
        Set-Reg "HKCU:\AppEvents\Schemes" "(Default)" ".None" "String"
        Get-ChildItem "HKCU:\AppEvents\Schemes\Apps" -Recurse | Where-Object {$_.PSChildName -eq ".Current"} | ForEach-Object { Set-ItemProperty -Path $_.PSPath -Name "(Default)" -Value "" -EA SilentlyContinue }
        Write-OK "Windows system sounds muted"
    }
    '43' = { # input_buffer
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\mouclass\Parameters" "MouseDataQueueSize" 32
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\kbdclass\Parameters" "KeyboardDataQueueSize" 32
        Write-OK "Input buffer size increased (prevents drops at 8000Hz)"
    }
    '44' = { # filesystem_perf
        fsutil behavior set disablelastaccess 1 >$null 2>&1
        fsutil behavior set disable8dot3 1 >$null 2>&1
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" "NtfsMemoryUsage" 2
        Write-OK "Filesystem performance optimized"
    }
    '45' = { # dwm_perf
        Set-Reg "HKCU:\Software\Microsoft\Windows\DWM" "AccentColorInactive" 1
        Set-Reg "HKCU:\Software\Microsoft\Windows\DWM" "ColorPrevalence" 0
        Set-Reg "HKCU:\Software\Microsoft\Windows\DWM" "EnableAeroPeek" 0
        Write-OK "DWM performance optimized"
    }

    # CAUTION tier (50-72)
    '50' = { # msi_mode
        $gpu = Get-PnpDevice -Class Display | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1
        if ($gpu) {
            $msiPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($gpu.InstanceId)\Device Parameters\Interrupt Management\MessageSignaledInterruptProperties"
            if (Test-Path $msiPath) { Set-Reg $msiPath "MSISupported" 1; Write-OK "MSI mode enabled for GPU" }
        }
    }
    '51' = { # hpet
        bcdedit /set useplatformclock false 2>$null
        bcdedit /set disabledynamictick yes 2>$null
        Write-OK "HPET disabled (reboot required)"
    }
    '52' = { # game_bar
        Set-Reg "HKCU:\Software\Microsoft\GameBar" "ShowStartupPanel" 0
        Set-Reg "HKCU:\Software\Microsoft\GameBar" "GamePanelStartupTipIndex" 3
        Write-OK "Game Bar overlays disabled"
    }
    '53' = { # hags
        if (Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" "HwSchMode" 2 -PassThru) { Write-OK "HAGS enabled" }
    }
    '54' = { # fso_disable
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_FSEBehaviorMode" 2
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_HonorUserFSEBehaviorMode" 1
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_FSEBehavior" 2
        Write-OK "Fullscreen optimizations disabled"
    }
    '55' = { # ultimate_perf
        powercfg /duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 >$null 2>&1
        $planOutput = powercfg /list 2>&1
        $plans = $planOutput | Select-String "Ultimate Performance"
        if ($plans) {
            $guidMatch = [regex]::Match($plans.Line, "([A-Fa-f0-9-]{36})")
            if ($guidMatch.Success) {
                $guid = $guidMatch.Value
                powercfg /setactive $guid 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) { Write-OK "Ultimate Performance enabled" } else { Write-Warn "Could not activate Ultimate Performance" }
            } else { Write-Warn "Could not parse Ultimate Performance GUID" }
        } else { Write-Warn "Ultimate Performance plan not available" }
    }
    '56' = { # services_trim
        $trimSvc = @("DiagTrack","dmwappushservice","lfsvc","RetailDemo","Fax","SharedAccess")
        foreach ($s in $trimSvc) { Set-Service $s -StartupType Manual -EA SilentlyContinue; Stop-Service $s -Force -EA SilentlyContinue }
        Write-OK "Services trimmed"
    }
    '57' = { # disk_cleanup
        Start-Process "cleanmgr.exe" -ArgumentList "/sagerun:100" -Wait -WindowStyle Hidden
        Write-OK "Disk cleanup complete"
    }
    '58' = { # wpbt_disable
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager" "DisableWpbtExecution" 1
        Write-OK "WPBT disabled (blocks OEM bloatware)"
    }
    '59' = { # qos_gaming
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Psched" "NonBestEffortLimit" 0
        Write-OK "QoS gaming configured"
    }
    '60' = { # network_throttling
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" "NetworkThrottlingIndex" 0xffffffff
        Write-OK "Network throttling disabled"
    }
    '61' = { # interrupt_affinity
        $gpu = Get-PnpDevice -Class Display | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1
        if ($gpu) {
            $affPath = "HKLM:\SYSTEM\CurrentControlSet\Enum\$($gpu.InstanceId)\Device Parameters\Interrupt Management\Affinity Policy"
            if (-not (Test-Path $affPath)) { New-Item -Path $affPath -Force | Out-Null }
            Set-Reg $affPath "DevicePolicy" 3
            Set-Reg $affPath "AssignmentSetOverride" 1
            Write-OK "GPU interrupt affinity set to CPU 0"
        }
    }
    '62' = { # process_mitigation
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" "KernelShadowStacksForceDisabled" 1
        Write-OK "Process mitigations disabled (security reduced)"
    }
    '63' = { # mmcss_gaming
        $mmcss = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile\Tasks\Games"
        Set-Reg $mmcss "GPU Priority" 8
        Set-Reg $mmcss "Priority" 6
        Set-Reg $mmcss "Scheduling Category" "High" "String"
        Set-Reg $mmcss "SFIO Priority" "High" "String"
        Write-OK "MMCSS gaming priority configured"
    }
    '64' = { # scheduler_opt
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" "Win32PrioritySeparation" 26
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" "IRQ8Priority" 1
        Write-OK "Scheduler optimized for gaming"
    }
    '65' = { # core_parking
        powercfg /setacvalueindex scheme_current sub_processor CPMINCORES 100 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            powercfg /setactive scheme_current 2>&1 | Out-Null
            Write-OK "Core parking disabled"
        } else { Write-Warn "Core parking setting not supported" }
    }
    '66' = { # timer_registry
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\kernel" "GlobalTimerResolutionRequests" 1
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile" "SystemResponsiveness" 0
        Write-OK "Timer resolution registry configured"
    }
    '67' = { # rsc_disable
        Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | ForEach-Object {
            Disable-NetAdapterRsc -Name $_.Name -EA SilentlyContinue
        }
        Write-OK "RSC disabled on active adapters"
    }
    '68' = { # sysmain_disable
        Stop-Service SysMain -Force -EA SilentlyContinue
        Set-Service SysMain -StartupType Disabled -EA SilentlyContinue
        Write-OK "SysMain/Superfetch disabled"
    }
    '69' = { # services_search_off
        Stop-Service WSearch -Force -EA SilentlyContinue
        Set-Service WSearch -StartupType Manual -EA SilentlyContinue
        Write-OK "Windows Search set to Manual (stops disk indexing)"
    }
    '70' = { # memory_gaming
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" "DisablePagingExecutive" 1
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Memory Management" "LargeSystemCache" 0
        Write-OK "Memory gaming mode enabled (kernel stays in RAM)"
    }
    '71' = { # power_throttle_off
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Power\PowerThrottling" "PowerThrottlingOff" 1
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" "EcoQosPolicyDisabled" 1
        Write-OK "Power throttling disabled"
    }
    '72' = { # priority_boost_off
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\PriorityControl" "Win32PriorityBoost" 0
        Write-OK "Priority boost disabled (consistent scheduling)"
    }

    # RISKY tier (80-89)
    '80' = { # privacy_tier1
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo" "Enabled" 0
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\Privacy" "TailoredExperiencesWithDiagnosticDataEnabled" 0
        Write-OK "Advertising ID and tailored experiences disabled"
    }
    '81' = { # privacy_tier2
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" "AllowTelemetry" 0
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" "Start_TrackProgs" 0
        Write-OK "Telemetry minimized"
    }
    '82' = { # privacy_tier3
        $xboxSvc = @("XblAuthManager","XblGameSave","XboxGipSvc","XboxNetApiSvc")
        foreach ($s in $xboxSvc) { Stop-Service $s -Force -EA SilentlyContinue; Set-Service $s -StartupType Disabled -EA SilentlyContinue }
        Write-OK "Xbox services disabled (Game Pass broken)"
    }
    '83' = { # bloatware
        $bloatApps = @("Microsoft.BingNews", "Microsoft.GetHelp", "Microsoft.Getstarted", "Microsoft.MicrosoftSolitaireCollection", "Microsoft.People", "Microsoft.PowerAutomateDesktop", "Microsoft.Todos", "Microsoft.WindowsAlarms", "Microsoft.WindowsFeedbackHub", "Microsoft.WindowsMaps", "Microsoft.WindowsSoundRecorder", "Microsoft.YourPhone", "Microsoft.ZuneMusic", "Microsoft.ZuneVideo", "Clipchamp.Clipchamp", "Microsoft.549981C3F5F10")
        foreach ($app in $bloatApps) {
            Get-AppxPackage -Name $app -AllUsers | Remove-AppxPackage -AllUsers -EA SilentlyContinue
        }
        Write-OK "Bloatware removed"
    }
    '84' = { # ipv4_prefer
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" "DisabledComponents" 32
        Write-OK "IPv4 preferred over IPv6"
    }
    '85' = { # teredo_disable
        netsh interface teredo set state disabled 2>$null
        Write-OK "Teredo disabled"
    }
    '86' = { # native_nvme
        $build = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
        if ($build -ge 26100) {
            $nvmePath = "HKLM:\SYSTEM\CurrentControlSet\Policies\Microsoft\FeatureManagement\Overrides"
            if (-not (Test-Path $nvmePath)) { New-Item -Path $nvmePath -Force | Out-Null }
            Set-Reg $nvmePath "1176759950" 1
            Write-OK "Native NVMe enabled (reboot required)"
        } else { Write-Fail "Native NVMe requires Win11 24H2+" }
    }
    '87' = { # smt_disable
        $cores = (Get-CimInstance Win32_Processor).NumberOfCores; bcdedit /set numproc $cores 2>$null
        Write-OK "SMT disabled (reboot required)"
    }
    '88' = { # audio_exclusive
        Set-Reg "HKCU:\AppEvents\Schemes" "(Default)" ".None" "String"
        Write-OK "System sounds disabled for exclusive mode"
    }
    '89' = { # tcp_optimizer
        $adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
        foreach ($adapter in $adapters) {
            $path = "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\$($adapter.InterfaceGuid)"
            Set-Reg $path "TcpAckFrequency" 1
            Set-Reg $path "TCPNoDelay" 1
        }
        Write-OK "TCP optimizer applied"
    }

    # NOTE: LUDICROUS tier (100-103) intentionally NOT included for security
    # IDs 100, 101, 102, 103 would disable critical security mitigations
}

# ════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ════════════════════════════════════════════════════════════════════════════

Clear-Host
Write-Banner
Write-Host ""

# Display configuration
$cpuName = if ($cpuId -and $CPU_MAP[$cpuId]) { $CPU_MAP[$cpuId].ToUpper() } else { "Not specified" }
$gpuName = if ($gpuId -and $GPU_MAP[$gpuId]) { $GPU_MAP[$gpuId].ToUpper() } else { "Not specified" }

Write-Host "  Configuration:" -ForegroundColor White
Write-Host "    CPU: $cpuName" -ForegroundColor Gray
Write-Host "    GPU: $gpuName" -ForegroundColor Gray
Write-Host "    Optimizations: $($optIds.Count)" -ForegroundColor Gray
Write-Host "    Packages: $($pkgKeys.Count)" -ForegroundColor Gray
Write-Host ""

# Show system info
$cpu = (Get-CimInstance Win32_Processor).Name
$gpu = (Get-CimInstance Win32_VideoController | Where-Object {$_.Status -eq "OK"} | Select-Object -First 1).Name
$ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property Capacity -Sum).Sum / 1GB)
Write-Host "  System:" -ForegroundColor White
Write-Host "    CPU: $cpu" -ForegroundColor Gray
Write-Host "    GPU: $gpu" -ForegroundColor Gray
Write-Host "    RAM: ${ram}GB" -ForegroundColor Gray
Write-Host ""

# Execute optimizations
if ($optIds.Count -gt 0) {
    Write-Step "Upgrades"

    # Handle DNS separately if specified
    if ($dnsId -and $DNS_MAP[$dnsId] -and ($optIds -contains '7')) {
        $dns = $DNS_MAP[$dnsId]
        Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Set-DnsClientServerAddress -ServerAddresses $dns.primary,$dns.secondary
        Write-OK "DNS set to $($dns.name) ($($dns.primary), $($dns.secondary))"
    }

    foreach ($id in $optIds) {
        if ($id -eq '7') { continue } # Skip DNS, handled above
        if ($OPT_FUNCTIONS.ContainsKey($id)) {
            try {
                & $OPT_FUNCTIONS[$id]
            } catch {
                Write-Fail "Optimization $id failed: $($_.Exception.Message)"
            }
        } else {
            Write-Warn "Unknown optimization ID: $id (skipped)"
        }
    }
}

# Install packages
if ($pkgKeys.Count -gt 0) {
    Write-Step "Arsenal (winget)"
    $wingetPath = Get-Command winget -EA SilentlyContinue
    if (-not $wingetPath) {
        Write-Fail "winget not found. Install App Installer from Microsoft Store."
    } else {
        foreach ($key in $pkgKeys) {
            if ($PACKAGE_MAP.ContainsKey($key)) {
                $pkg = $PACKAGE_MAP[$key]
                Write-Host "  Installing $($pkg.name)..." -NoNewline
                $installOutput = winget install --id "$($pkg.id)" --silent --accept-package-agreements --accept-source-agreements 2>&1
                if ($LASTEXITCODE -eq 0) { Write-OK "" }
                elseif ($installOutput -match "No available upgrade found|No newer package versions are available|already installed") { Write-OK "Already installed" }
                else { Write-Fail ""; $installOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray } }
            } else {
                Write-Warn "Unknown package: $key (skipped)"
            }
        }
    }
}

# Summary
Write-Step "Complete"
Write-Host ""
Write-Host "  ╔════════════════════════════════════════╗" -ForegroundColor White
Write-Host "  ║           LOADOUT SUMMARY              ║" -ForegroundColor White
Write-Host "  ╚════════════════════════════════════════╝" -ForegroundColor White
Write-Host ""
Write-Host "  Applied:  $($script:SuccessCount) changes" -ForegroundColor Green
if ($script:WarningCount -gt 0) { Write-Host "  Warnings: $($script:WarningCount)" -ForegroundColor Yellow }
if ($script:FailCount -gt 0) { Write-Host "  Failed:   $($script:FailCount)" -ForegroundColor Red }
Write-Host ""
Write-Host "  Reboot recommended for all changes to take effect." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Source: https://rocktune.pedroferrari.com" -ForegroundColor DarkGray
Write-Host ""
