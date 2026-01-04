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
# OS DETECTION
# ════════════════════════════════════════════════════════════════════════════

$script:WinBuild = [int](Get-CimInstance Win32_OperatingSystem).BuildNumber
$script:IsWin11 = $script:WinBuild -ge 22000
$script:IsWin11_24H2 = $script:WinBuild -ge 26100
$script:WinVersion = if ($script:IsWin11) { "Windows 11" } else { "Windows 10" }

# IDs that only work on Windows 11
$script:Win11OnlyIds = @('18', '21', '22')  # Classic menu, End Task, Explorer cleanup
$script:Win11_24H2OnlyIds = @('86')  # Native NVMe

# ════════════════════════════════════════════════════════════════════════════
# PARSE CONFIGURATION
# ════════════════════════════════════════════════════════════════════════════
# Configuration is passed via $env:RT environment variable as query string format
# Example: $env:RT='c=1&g=1&o=1,2,3&s=steam'; irm url | iex

$configString = $env:RT
if (-not $configString) {
    Write-Host ""
    Write-Host "  ERROR: No configuration found." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Usage:" -ForegroundColor Yellow
    Write-Host '  $env:RT="c=1&g=1&o=1,2,3&s=steam"; irm https://rocktune.pedroferrari.com/run.ps1 | iex' -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Get your one-liner at: https://rocktune.pedroferrari.com" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Parse the config string as query parameters
try {
    Add-Type -AssemblyName System.Web
    $query = [System.Web.HttpUtility]::ParseQueryString($configString)
} catch {
    Write-Host "ERROR: Invalid configuration format." -ForegroundColor Red
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

$validCpuIds = @('1', '2', '3')
$validGpuIds = @('1', '2', '3')
$validDnsIds = @('1', '2', '3', '4', '5')

if ($cpuId -and $cpuId -notin $validCpuIds) {
    Write-Host "  WARNING: Invalid CPU ID '$cpuId' - defaulting to AMD" -ForegroundColor Yellow
    $cpuId = '2'
}
if ($gpuId -and $gpuId -notin $validGpuIds) {
    Write-Host "  WARNING: Invalid GPU ID '$gpuId' - defaulting to NVIDIA" -ForegroundColor Yellow
    $gpuId = '1'
}
if ($dnsId -and $dnsId -notin $validDnsIds) {
    Write-Host "  WARNING: Invalid DNS ID '$dnsId' - DNS optimization will be skipped" -ForegroundColor Yellow
    $dnsId = $null
}

$optIds = $optIds | Where-Object { $_ -match '^\d+$' }
$pkgKeys = $pkgKeys | Where-Object { $_ -match '^[a-zA-Z0-9._-]+$' }

# Clear the env var after reading (security)
$env:RT = $null

# ════════════════════════════════════════════════════════════════════════════
# ID MAPPINGS - MUST STAY IN SYNC with web/src/lib/share-registry.ts
# ════════════════════════════════════════════════════════════════════════════
#
# To find next available ID:
#   cd web && deno task share:audit
#
# When adding a new optimization:
# 1. Add to share-registry.ts with next sequential ID
# 2. Add entry to $OPT_DESCRIPTIONS below
# 3. Add entry to $OPT_FUNCTIONS below
# 4. Run: cd web && deno task share:audit (verify passes)
#
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
$script:ScanResults = @()

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

function Add-ScanResult {
    param([string]$Name, [string]$Current, [string]$Target, [string]$Status = "CHANGE")
    $script:ScanResults += [PSCustomObject]@{
        Name = $Name
        Current = $Current
        Target = $Target
        Status = $Status
    }
}

function Write-ScanResults {
    if ($script:ScanResults.Count -eq 0) { return }

    $nameWidth = 36
    $currentWidth = 14
    $targetWidth = 18

    Write-Host ""
    Write-Host "  ╔$('═' * $nameWidth)╤$('═' * $currentWidth)╤$('═' * $targetWidth)╗" -ForegroundColor White
    Write-Host "  ║ Setting$(' ' * ($nameWidth - 9))│ Current$(' ' * ($currentWidth - 9))│ Target$(' ' * ($targetWidth - 8))║" -ForegroundColor White
    Write-Host "  ╠$('═' * $nameWidth)╪$('═' * $currentWidth)╪$('═' * $targetWidth)╣" -ForegroundColor White

    foreach ($result in $script:ScanResults) {
        $name = $result.Name
        if ($name.Length -gt ($nameWidth - 2)) { $name = $name.Substring(0, $nameWidth - 5) + "..." }
        $name = " " + $name.PadRight($nameWidth - 2)

        $current = $result.Current
        if ($current.Length -gt ($currentWidth - 2)) { $current = $current.Substring(0, $currentWidth - 5) + "..." }
        $current = " " + $current.PadRight($currentWidth - 2)

        $target = $result.Target
        if ($target.Length -gt ($targetWidth - 2)) { $target = $target.Substring(0, $targetWidth - 5) + "..." }
        $target = " " + $target.PadRight($targetWidth - 2)

        $color = switch ($result.Status) {
            "OK"      { "Green" }
            "CHANGE"  { "Yellow" }
            "INFO"    { "Cyan" }
            "PENDING" { "Gray" }
            default   { "White" }
        }

        Write-Host "  ║" -NoNewline -ForegroundColor White
        Write-Host $name -NoNewline -ForegroundColor $color
        Write-Host "│" -NoNewline -ForegroundColor White
        Write-Host $current -NoNewline -ForegroundColor $color
        Write-Host "│" -NoNewline -ForegroundColor White
        Write-Host $target -NoNewline -ForegroundColor $color
        Write-Host "║" -ForegroundColor White
    }

    Write-Host "  ╚$('═' * $nameWidth)╧$('═' * $currentWidth)╧$('═' * $targetWidth)╝" -ForegroundColor White
    Write-Host ""

    $changeCount = ($script:ScanResults | Where-Object { $_.Status -eq "CHANGE" }).Count
    $okCount = ($script:ScanResults | Where-Object { $_.Status -eq "OK" }).Count
    Write-Host "  Summary: $changeCount changes needed, $okCount already configured" -ForegroundColor Gray
    Write-Host ""
}

# ════════════════════════════════════════════════════════════════════════════
# OPTIMIZATION DESCRIPTIONS (for interactive mode)
# ════════════════════════════════════════════════════════════════════════════

$OPT_DESCRIPTIONS = @{
    # SAFE tier (1-45)
    '1'  = @{ name='Page File'; tier='SAFE'; desc='Set fixed page file size based on RAM (4GB for 32GB+, 8GB for 16GB)' }
    '2'  = @{ name='Fast Startup'; tier='SAFE'; desc='Disable Fast Boot for cleaner shutdowns and driver resets' }
    '3'  = @{ name='Timer Resolution'; tier='SAFE'; desc='Manual step: Requires timer-tool.ps1 before gaming' }
    '4'  = @{ name='Power Plan'; tier='SAFE'; desc='Enable High Performance power plan' }
    '5'  = @{ name='USB Power'; tier='SAFE'; desc='Disable USB selective suspend (prevents device disconnects)' }
    '6'  = @{ name='PCIe Power'; tier='SAFE'; desc='Disable PCIe power saving for GPU stability' }
    '7'  = @{ name='DNS Provider'; tier='SAFE'; desc='Set DNS servers to selected provider' }
    '8'  = @{ name='Nagle Algorithm'; tier='SAFE'; desc='Disable Nagle buffering for lower network latency' }
    '9'  = @{ name='Audio Ducking'; tier='SAFE'; desc='Disable audio volume reduction during calls' }
    '10' = @{ name='Game DVR'; tier='SAFE'; desc='Disable background game recording' }
    '11' = @{ name='Background Apps'; tier='SAFE'; desc='Disable background app activity' }
    '12' = @{ name='Edge Debloat'; tier='SAFE'; desc='Disable Edge shopping assistant and widgets' }
    '13' = @{ name='Copilot'; tier='SAFE'; desc='Disable Windows Copilot' }
    '14' = @{ name='Explorer Speed'; tier='SAFE'; desc='Optimize folder type detection for faster browsing' }
    '15' = @{ name='Temp Purge'; tier='SAFE'; desc='Clear temporary folders' }
    '16' = @{ name='Razer Block'; tier='SAFE'; desc='Stop and disable Razer background services' }
    '17' = @{ name='Restore Point'; tier='SAFE'; desc='Create system restore point before changes' }
    '18' = @{ name='Classic Menu'; tier='SAFE'; desc='Enable Windows 10 style context menu' }
    '19' = @{ name='Storage Sense'; tier='SAFE'; desc='Disable automatic storage cleanup' }
    '20' = @{ name='Visual Effects'; tier='SAFE'; desc='Set visual effects to performance mode' }
    '21' = @{ name='End Task'; tier='SAFE'; desc='Enable End Task option in taskbar' }
    '22' = @{ name='Explorer Cleanup'; tier='SAFE'; desc='Remove OneDrive and Gallery from Explorer' }
    '23' = @{ name='Notifications'; tier='SAFE'; desc='Disable notification center and toasts' }
    '24' = @{ name='PS7 Telemetry'; tier='SAFE'; desc='Disable PowerShell 7 telemetry' }
    '25' = @{ name='Multiplane Overlay'; tier='SAFE'; desc='Disable DWM overlay for cleaner fullscreen' }
    '26' = @{ name='Mouse Acceleration'; tier='SAFE'; desc='Disable mouse acceleration for raw input' }
    '27' = @{ name='USB Suspend'; tier='SAFE'; desc='Disable USB selective suspend' }
    '28' = @{ name='Keyboard Response'; tier='SAFE'; desc='Minimize keyboard delay and maximize repeat rate' }
    '29' = @{ name='Game Mode'; tier='SAFE'; desc='Enable Windows Game Mode' }
    '30' = @{ name='Min Processor'; tier='SAFE'; desc='Set minimum processor state to 5% (better thermals)' }
    '31' = @{ name='Hibernation'; tier='SAFE'; desc='Disable hibernation (saves disk space)' }
    '32' = @{ name='RSS'; tier='SAFE'; desc='Enable Receive Side Scaling for network' }
    '33' = @{ name='Adapter Power'; tier='SAFE'; desc='Disable network adapter power saving' }
    '34' = @{ name='Delivery Opt'; tier='SAFE'; desc='Disable P2P update delivery' }
    '35' = @{ name='Error Reporting'; tier='SAFE'; desc='Disable Windows Error Reporting' }
    '36' = @{ name='WiFi Sense'; tier='SAFE'; desc='Disable WiFi Sense auto-connect' }
    '37' = @{ name='Spotlight'; tier='SAFE'; desc='Disable Windows Spotlight on lock screen' }
    '38' = @{ name='Feedback'; tier='SAFE'; desc='Disable Windows feedback prompts' }
    '39' = @{ name='Clipboard Sync'; tier='SAFE'; desc='Disable cloud clipboard sync' }
    '40' = @{ name='Accessibility'; tier='SAFE'; desc='Disable Sticky Keys and other shortcuts' }
    '41' = @{ name='Audio Comm'; tier='SAFE'; desc='Disable volume ducking during communications' }
    '42' = @{ name='System Sounds'; tier='SAFE'; desc='Mute Windows system sounds' }
    '43' = @{ name='Input Buffer'; tier='SAFE'; desc='Increase input buffer for high poll rate devices' }
    '44' = @{ name='Filesystem'; tier='SAFE'; desc='Optimize NTFS settings (disable last access, 8.3 names)' }
    '45' = @{ name='DWM Perf'; tier='SAFE'; desc='Optimize Desktop Window Manager settings' }

    # CAUTION tier (50-72)
    '50' = @{ name='MSI Mode'; tier='CAUTION'; desc='Enable Message Signaled Interrupts for GPU (lower DPC latency)' }
    '51' = @{ name='HPET'; tier='CAUTION'; desc='Disable High Precision Event Timer (test before/after)' }
    '52' = @{ name='Game Bar Overlay'; tier='CAUTION'; desc='Disable Game Bar overlays (keep core enabled)' }
    '53' = @{ name='HAGS'; tier='CAUTION'; desc='Enable Hardware Accelerated GPU Scheduling' }
    '54' = @{ name='FSO'; tier='CAUTION'; desc='Disable fullscreen optimizations globally' }
    '55' = @{ name='Ultimate Perf'; tier='CAUTION'; desc='Enable Ultimate Performance power plan' }
    '56' = @{ name='Services Trim'; tier='CAUTION'; desc='Set unnecessary services to manual startup' }
    '57' = @{ name='Disk Cleanup'; tier='CAUTION'; desc='Run Windows disk cleanup utility' }
    '58' = @{ name='WPBT'; tier='CAUTION'; desc='Disable WPBT (blocks OEM pre-installed software)' }
    '59' = @{ name='QoS Gaming'; tier='CAUTION'; desc='Remove bandwidth reservations for gaming' }
    '60' = @{ name='Network Throttle'; tier='CAUTION'; desc='Disable network throttling during multimedia' }
    '61' = @{ name='GPU Affinity'; tier='CAUTION'; desc='Set GPU interrupt affinity to CPU 0' }
    '62' = @{ name='Mitigations'; tier='CAUTION'; desc='Disable kernel shadow stacks (reduces security)' }
    '63' = @{ name='MMCSS'; tier='CAUTION'; desc='Configure multimedia class scheduler for games' }
    '64' = @{ name='Scheduler'; tier='CAUTION'; desc='Optimize thread scheduler for responsiveness' }
    '65' = @{ name='Core Parking'; tier='CAUTION'; desc='Disable CPU core parking' }
    '66' = @{ name='Timer Registry'; tier='CAUTION'; desc='Enable global timer resolution requests' }
    '67' = @{ name='RSC'; tier='CAUTION'; desc='Disable Receive Segment Coalescing' }
    '68' = @{ name='SysMain'; tier='CAUTION'; desc='Disable SysMain/Superfetch service' }
    '69' = @{ name='Search'; tier='CAUTION'; desc='Set Windows Search to manual (stops indexing)' }
    '70' = @{ name='Memory Gaming'; tier='CAUTION'; desc='Keep kernel in RAM (disable paging executive)' }
    '71' = @{ name='Power Throttle'; tier='CAUTION'; desc='Disable CPU power throttling' }
    '72' = @{ name='Priority Boost'; tier='CAUTION'; desc='Disable priority boost (consistent scheduling)' }

    # RISKY tier (80-89)
    '80' = @{ name='Privacy T1'; tier='RISKY'; desc='Disable advertising ID and tailored experiences' }
    '81' = @{ name='Privacy T2'; tier='RISKY'; desc='Minimize diagnostic telemetry' }
    '82' = @{ name='Privacy T3'; tier='RISKY'; desc='Disable Xbox services (breaks Game Pass!)' }
    '83' = @{ name='Bloatware'; tier='RISKY'; desc='Remove pre-installed bloatware apps' }
    '84' = @{ name='IPv4 Prefer'; tier='RISKY'; desc='Prefer IPv4 over IPv6' }
    '85' = @{ name='Teredo'; tier='RISKY'; desc='Disable Teredo tunneling' }
    '86' = @{ name='Native NVMe'; tier='RISKY'; desc='Enable native NVMe stack (Win11 24H2+)' }
    '87' = @{ name='SMT'; tier='RISKY'; desc='Disable SMT/Hyperthreading (physical cores only)' }
    '88' = @{ name='Audio Exclusive'; tier='RISKY'; desc='Configure audio for exclusive mode apps' }
    '89' = @{ name='TCP Optimizer'; tier='RISKY'; desc='Apply TCP optimizations for gaming' }

    # FR33THY Phase (104+)
    '104' = @{ name='Background Polling'; tier='SAFE'; desc='Unlock full mouse polling rate in background windows' }
    '105' = @{ name='AMD ULPS'; tier='CAUTION'; desc='Disable AMD Ultra Low Power State (prevents downclock stutters)' }
    '106' = @{ name='NVIDIA P0 State'; tier='RISKY'; desc='Force GPU to max clocks (increases heat/power!)' }
    '107' = @{ name='Network Binding Strip'; tier='RISKY'; desc='Remove IPv6/sharing bindings (breaks file sharing!)' }
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
        $itemsRemoved = 0
        if ($env:TEMP -and (Test-Path $env:TEMP)) {
            $tempPath = [System.IO.Path]::GetFullPath($env:TEMP)
            if ($tempPath -like "*\Temp*" -or $tempPath -like "*\tmp*") {
                Get-ChildItem $tempPath -Force -EA SilentlyContinue | ForEach-Object {
                    try { Remove-Item $_.FullName -Recurse -Force -EA Stop; $itemsRemoved++ } catch {}
                }
            }
        }
        $winTemp = Join-Path $env:WINDIR "Temp"
        if (Test-Path $winTemp) {
            Get-ChildItem $winTemp -Force -EA SilentlyContinue | ForEach-Object {
                try { Remove-Item $_.FullName -Recurse -Force -EA Stop; $itemsRemoved++ } catch {}
            }
        }
        Write-OK "Temp folders purged ($itemsRemoved items)"
    }
    '16' = { # razer_block
        Get-Service | Where-Object {$_.Name -like "Razer*"} | Stop-Service -Force -EA SilentlyContinue
        Get-Service | Where-Object {$_.Name -like "Razer*"} | Set-Service -StartupType Disabled -EA SilentlyContinue
        Write-OK "Razer services blocked"
    }
    '17' = { # restore_point
        $recentRestorePoint = $null
        # Check if System Protection is enabled first
        $srEnabled = $false
        try {
            $sr = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore" -Name "RPSessionInterval" -EA SilentlyContinue
            $srEnabled = ($null -ne $sr -and $sr.RPSessionInterval -ne 0)
        } catch { }

        if (-not $srEnabled) {
            Write-Warn "System Restore disabled (enable in System Protection to create restore points)"
        } else {
            try { $recentRestorePoint = Get-ComputerRestorePoint -EA Stop | Sort-Object CreationTime -Descending | Select-Object -First 1 } catch { $recentRestorePoint = $null }
            if ($recentRestorePoint -and $recentRestorePoint.CreationTime -gt (Get-Date).AddMinutes(-1440)) {
                Write-Warn "Restore point already created within last 24 hours (skipped)"
            } else {
                try {
                    Checkpoint-Computer -Description "Before RockTune" -RestorePointType MODIFY_SETTINGS -EA Stop -WarningAction SilentlyContinue
                    Write-OK "Restore point created"
                } catch {
                    Write-Warn "Could not create restore point (System Restore may be disabled)"
                }
            }
        }
    }
    '18' = { # classic_menu
        if (-not $script:IsWin11) {
            Write-Warn "Classic context menu is a Windows 11 feature (Win10 already has it)"
            return
        }
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
        if (-not $script:IsWin11) {
            Write-Warn "End Task in taskbar is a Windows 11 feature"
            return
        }
        if (Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings" "TaskbarEndTask" 1 -PassThru) { Write-OK "End Task enabled in taskbar" }
    }
    '22' = { # explorer_cleanup
        if (-not $script:IsWin11) {
            Write-Warn "Explorer Home/Gallery are Windows 11 features (Win10 doesn't have them)"
            return
        }
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

    # FR33THY Phase (104+)
    '104' = { # background_polling
        if (Set-Reg "HKCU:\Control Panel\Mouse" "RawMouseThrottleEnabled" 0 -PassThru) {
            Write-OK "Background mouse polling unlocked (full rate in background windows)"
        }
    }
    '105' = { # amd_ulps_disable
        $gpuPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}"
        $foundAmd = $false
        Get-ChildItem $gpuPath -EA SilentlyContinue | ForEach-Object {
            try {
                $desc = Get-ItemPropertyValue $_.PSPath "DriverDesc" -EA SilentlyContinue
                if ($desc -match "AMD|Radeon") {
                    $foundAmd = $true
                    Set-Reg $_.PSPath "EnableUlps" 0
                    Set-Reg $_.PSPath "EnableUlps_NA" 0
                }
            } catch {}
        }
        if ($foundAmd) { Write-OK "AMD ULPS disabled (no more downclock stutters)" }
        else { Write-Warn "No AMD GPU found, ULPS skip" }
    }
    '106' = { # nvidia_p0_state
        $gpuPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}"
        $foundNv = $false
        Get-ChildItem $gpuPath -EA SilentlyContinue | ForEach-Object {
            try {
                $desc = Get-ItemPropertyValue $_.PSPath "DriverDesc" -EA SilentlyContinue
                if ($desc -match "NVIDIA|GeForce") {
                    $foundNv = $true
                    Set-Reg $_.PSPath "DisableDynamicPstate" 1
                }
            } catch {}
        }
        if ($foundNv) {
            Write-OK "NVIDIA P0 state forced (constant max clocks)"
            Write-Warn "GPU will run hotter - monitor temperatures!"
        }
        else { Write-Warn "No NVIDIA GPU found, P0 skip" }
    }
    '107' = { # network_binding_strip
        Write-Warn "Stripping network bindings (breaks file/printer sharing!)"
        $bindings = @("ms_lldp","ms_lltdio","ms_implat","ms_rspndr","ms_tcpip6","ms_server","ms_msclient","ms_pacer")
        $adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}
        $count = 0
        foreach ($adapter in $adapters) {
            foreach ($binding in $bindings) {
                try {
                    $current = Get-NetAdapterBinding -Name $adapter.Name -ComponentID $binding -EA Stop
                    if ($current.Enabled) {
                        Disable-NetAdapterBinding -Name $adapter.Name -ComponentID $binding -EA Stop
                        $count++
                    }
                } catch {}
            }
        }
        if ($count -gt 0) { Write-OK "Stripped $count network bindings (IPv4 only mode)" }
        else { Write-Warn "No bindings modified (may already be stripped)" }
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
Write-Host "    OS:  $script:WinVersion (Build $script:WinBuild)" -ForegroundColor $(if ($script:IsWin11) { "Gray" } else { "Yellow" })
Write-Host "    CPU: $cpu" -ForegroundColor Gray
Write-Host "    GPU: $gpu" -ForegroundColor Gray
Write-Host "    RAM: ${ram}GB" -ForegroundColor Gray

# Win10 compatibility notice
if (-not $script:IsWin11) {
    Write-Host ""
    Write-Host "  ⚠ Windows 10 detected - some Win11-only options will be skipped" -ForegroundColor Yellow
}
Write-Host ""

# ════════════════════════════════════════════════════════════════════════════
# PRE-FLIGHT SCAN
# ════════════════════════════════════════════════════════════════════════════

if ($optIds.Count -gt 0) {
    Write-Host "  Scanning current system state..." -ForegroundColor Gray

    # Scan each selected optimization
    foreach ($id in $optIds) {
        $info = $OPT_DESCRIPTIONS[$id]
        if (-not $info) { continue }

        $name = "[$($info.tier)] $($info.name)"
        $current = "—"
        $target = "Will apply"
        $status = "PENDING"

        switch ($id) {
            '1' { # pagefile
                try {
                    $cs = Get-WmiObject Win32_ComputerSystem
                    if ($cs.AutomaticManagedPagefile) {
                        $current = "Auto"
                        $target = "Fixed size"
                        $status = "CHANGE"
                    } else {
                        $current = "Fixed"
                        $status = "OK"
                    }
                } catch { }
            }
            '2' { # fastboot
                try {
                    $val = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -Name "HiberbootEnabled" -EA SilentlyContinue
                    if ($val.HiberbootEnabled -eq 0) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '10' { # gamedvr
                try {
                    $val = Get-ItemProperty "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -EA SilentlyContinue
                    if ($val.GameDVR_Enabled -eq 0) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '11' { # background_apps
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -EA SilentlyContinue
                    if ($val.GlobalUserDisabled -eq 1) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '13' { # copilot_disable
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Policies\Microsoft\Windows\WindowsCopilot" -Name "TurnOffWindowsCopilot" -EA SilentlyContinue
                    if ($val.TurnOffWindowsCopilot -eq 1) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '21' { # end_task
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced\TaskbarDeveloperSettings" -Name "TaskbarEndTask" -EA SilentlyContinue
                    if ($val.TaskbarEndTask -eq 1) { $current = "ON"; $status = "OK" }
                    else { $current = "OFF"; $target = "ON"; $status = "CHANGE" }
                } catch { }
            }
            '23' { # notifications_off
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Policies\Microsoft\Windows\Explorer" -Name "DisableNotificationCenter" -EA SilentlyContinue
                    if ($val.DisableNotificationCenter -eq 1) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '26' { # mouse_accel
                try {
                    $val = Get-ItemProperty "HKCU:\Control Panel\Mouse" -Name "MouseSpeed" -EA SilentlyContinue
                    if ($val.MouseSpeed -eq "0") { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '28' { # keyboard_response
                try {
                    $val = Get-ItemProperty "HKCU:\Control Panel\Keyboard" -Name "KeyboardDelay" -EA SilentlyContinue
                    if ($val.KeyboardDelay -eq "0") { $current = "0ms"; $status = "OK" }
                    else { $current = "$($val.KeyboardDelay)"; $target = "0ms"; $status = "CHANGE" }
                } catch { }
            }
            '29' { # game_mode
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Microsoft\GameBar" -Name "AutoGameModeEnabled" -EA SilentlyContinue
                    if ($val.AutoGameModeEnabled -eq 1) { $current = "ON"; $status = "OK" }
                    else { $current = "OFF"; $target = "ON"; $status = "CHANGE" }
                } catch { }
            }
            '52' { # game_bar
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Microsoft\GameBar" -Name "ShowStartupPanel" -EA SilentlyContinue
                    if ($val.ShowStartupPanel -eq 0) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '53' { # hags
                try {
                    $val = Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers" -Name "HwSchMode" -EA SilentlyContinue
                    if ($val.HwSchMode -eq 2) { $current = "ON"; $status = "OK" }
                    else { $current = "OFF"; $target = "ON"; $status = "CHANGE" }
                } catch { }
            }
            '54' { # fso_disable
                try {
                    $val = Get-ItemProperty "HKCU:\System\GameConfigStore" -Name "GameDVR_FSEBehaviorMode" -EA SilentlyContinue
                    if ($val.GameDVR_FSEBehaviorMode -eq 2) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '68' { # sysmain_disable
                try {
                    $svc = Get-Service SysMain -EA SilentlyContinue
                    if ($svc.StartType -eq 'Disabled') { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '69' { # services_search_off
                try {
                    $svc = Get-Service WSearch -EA SilentlyContinue
                    if ($svc.StartType -eq 'Manual' -or $svc.StartType -eq 'Disabled') { $current = "Manual"; $status = "OK" }
                    else { $current = "Auto"; $target = "Manual"; $status = "CHANGE" }
                } catch { }
            }
            '80' { # privacy_tier1
                try {
                    $val = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\AdvertisingInfo" -Name "Enabled" -EA SilentlyContinue
                    if ($val.Enabled -eq 0) { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '81' { # privacy_tier2
                try {
                    $val = Get-ItemProperty "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -EA SilentlyContinue
                    if ($val.AllowTelemetry -eq 0) { $current = "Minimal"; $status = "OK" }
                    else { $current = "Full"; $target = "Minimal"; $status = "CHANGE" }
                } catch { }
            }
            '85' { # teredo_disable
                try {
                    $teredo = netsh interface teredo show state 2>$null | Select-String "Type"
                    if ($teredo -match "disabled") { $current = "OFF"; $status = "OK" }
                    else { $current = "ON"; $target = "OFF"; $status = "CHANGE" }
                } catch { }
            }
            '104' { # background_polling
                try {
                    $val = Get-ItemProperty "HKCU:\Control Panel\Mouse" -Name "RawMouseThrottleEnabled" -EA SilentlyContinue
                    if ($val.RawMouseThrottleEnabled -eq 0) { $current = "Unlocked"; $status = "OK" }
                    else { $current = "Throttled"; $target = "Unlocked"; $status = "CHANGE" }
                } catch { }
            }
            '105' { # amd_ulps_disable
                $current = "Check GPU"; $target = "Disabled"; $status = "PENDING"
            }
            '106' { # nvidia_p0_state
                $current = "Check GPU"; $target = "P0 Forced"; $status = "PENDING"
            }
            '107' { # network_binding_strip
                $current = "Multiple"; $target = "IPv4 Only"; $status = "PENDING"
            }
            '7' { # dns - special handling
                if ($dnsId -and $DNS_MAP[$dnsId]) {
                    $dns = $DNS_MAP[$dnsId]
                    $name = "[SAFE] DNS Provider"
                    $target = $dns.name
                    try {
                        $adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1
                        if ($adapter) {
                            $dnsServers = (Get-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4).ServerAddresses
                            if ($dnsServers -contains $dns.primary) { $current = $dns.name; $status = "OK" }
                            else { $current = "Other"; $status = "CHANGE" }
                        }
                    } catch { }
                }
            }
        }

        Add-ScanResult $name $current $target $status
    }

    Write-ScanResults
}

# ════════════════════════════════════════════════════════════════════════════
# INTERACTIVE APPROVAL MODE
# ════════════════════════════════════════════════════════════════════════════

function Get-TierColor {
    param([string]$Tier)
    switch ($Tier) {
        'SAFE'    { 'Green' }
        'CAUTION' { 'Yellow' }
        'RISKY'   { 'Red' }
        default   { 'Gray' }
    }
}

function Show-OptimizationPrompt {
    param([string]$Id, [int]$Current, [int]$Total)

    $info = $OPT_DESCRIPTIONS[$Id]
    if (-not $info) {
        $info = @{ name="Unknown ($Id)"; tier='UNKNOWN'; desc='No description available' }
    }

    $tierColor = Get-TierColor $info.tier

    Write-Host ""
    Write-Host "  [$Current/$Total] " -NoNewline -ForegroundColor DarkGray
    Write-Host $info.name -NoNewline -ForegroundColor White
    Write-Host " [" -NoNewline -ForegroundColor DarkGray
    Write-Host $info.tier -NoNewline -ForegroundColor $tierColor
    Write-Host "]" -ForegroundColor DarkGray
    Write-Host "  $($info.desc)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Apply? [Y]es / [N]o / [A]ll remaining / [Q]uit: " -NoNewline -ForegroundColor Cyan
}

# Execute optimizations
if ($optIds.Count -gt 0) {
    Write-Step "Upgrades"
    Write-Host ""
    Write-Host "  ╔════════════════════════════════════════════════════════════════╗" -ForegroundColor White
    Write-Host "  ║  INTERACTIVE MODE - Review each optimization before applying   ║" -ForegroundColor White
    Write-Host "  ╚════════════════════════════════════════════════════════════════╝" -ForegroundColor White
    Write-Host ""
    Write-Host "  This loadout contains $($optIds.Count) optimization(s)." -ForegroundColor Gray
    Write-Host "  You will be prompted to approve each one." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Tier legend:" -ForegroundColor White
    Write-Host "    SAFE    - " -NoNewline; Write-Host "Low risk, recommended for everyone" -ForegroundColor Green
    Write-Host "    CAUTION - " -NoNewline; Write-Host "May affect some features, test after" -ForegroundColor Yellow
    Write-Host "    RISKY   - " -NoNewline; Write-Host "May break features, know what you're doing" -ForegroundColor Red
    Write-Host ""

    $autoApprove = $false
    $consecutiveYes = 0  # Track consecutive Y responses for smart auto-All
    $approvedIds = @()
    $skippedIds = @()
    $quit = $false
    $current = 0
    $total = $optIds.Count

    # Handle DNS separately if specified
    if ($dnsId -and $DNS_MAP[$dnsId] -and ($optIds -contains '7')) {
        $current++
        $dns = $DNS_MAP[$dnsId]
        if (-not $autoApprove) {
            Write-Host ""
            Write-Host "  [$current/$total] " -NoNewline -ForegroundColor DarkGray
            Write-Host "DNS Provider" -NoNewline -ForegroundColor White
            Write-Host " [" -NoNewline -ForegroundColor DarkGray
            Write-Host "SAFE" -NoNewline -ForegroundColor Green
            Write-Host "]" -ForegroundColor DarkGray
            Write-Host "  Set DNS to $($dns.name) ($($dns.primary), $($dns.secondary))" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  Apply? [Y]es / [N]o / [A]ll remaining / [Q]uit: " -NoNewline -ForegroundColor Cyan
            $response = Read-Host
        } else {
            $response = 'y'
        }

        switch ($response.ToLower()) {
            'a' { $autoApprove = $true; $response = 'y' }
            'q' { $quit = $true }
            'n' { $consecutiveYes = 0 }  # Reset on skip
        }

        if (-not $quit -and $response.ToLower() -eq 'y') {
            $consecutiveYes++
            # Smart Auto-All: after 3 consecutive Y, auto-approve remaining
            if ($consecutiveYes -ge 3 -and -not $autoApprove) {
                $autoApprove = $true
                $remaining = $total - $current
                Write-Host ""
                Write-Host "  $([char]0x2192) Auto-applying remaining $remaining optimizations (3 consecutive approvals)" -ForegroundColor Cyan
                Write-Host "  $([char]0x2192) Press Ctrl+C to abort if needed" -ForegroundColor DarkGray
                Write-Host ""
            }
            Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Set-DnsClientServerAddress -ServerAddresses $dns.primary,$dns.secondary
            Write-OK "DNS set to $($dns.name)"
            $approvedIds += '7'
        } else {
            $skippedIds += '7'
            if (-not $quit) { Write-Host "  [SKIP] DNS" -ForegroundColor DarkGray }
        }
    }

    foreach ($id in $optIds) {
        if ($quit) { break }
        if ($id -eq '7') { continue } # Skip DNS, handled above

        $current++

        if (-not $OPT_FUNCTIONS.ContainsKey($id)) {
            Write-Warn "Unknown optimization ID: $id (skipped)"
            continue
        }

        # Skip Win11-only features on Win10
        if (-not $script:IsWin11 -and $id -in $script:Win11OnlyIds) {
            $info = $OPT_DESCRIPTIONS[$id]
            $name = if ($info) { $info.name } else { $id }
            Write-Host "  [SKIP] $name (requires Windows 11)" -ForegroundColor DarkGray
            $skippedIds += $id
            continue
        }

        # Skip Win11 24H2+ features on older builds
        if (-not $script:IsWin11_24H2 -and $id -in $script:Win11_24H2OnlyIds) {
            $info = $OPT_DESCRIPTIONS[$id]
            $name = if ($info) { $info.name } else { $id }
            Write-Host "  [SKIP] $name (requires Windows 11 24H2+)" -ForegroundColor DarkGray
            $skippedIds += $id
            continue
        }

        if (-not $autoApprove) {
            Show-OptimizationPrompt -Id $id -Current $current -Total $total
            $response = Read-Host
        } else {
            $response = 'y'
        }

        switch ($response.ToLower()) {
            'a' { $autoApprove = $true; $response = 'y' }
            'q' { $quit = $true }
            'n' { $consecutiveYes = 0 }  # Reset on skip
        }

        if (-not $quit -and $response.ToLower() -eq 'y') {
            $consecutiveYes++
            # Smart Auto-All: after 3 consecutive Y, auto-approve remaining
            if ($consecutiveYes -ge 3 -and -not $autoApprove) {
                $autoApprove = $true
                $remaining = $total - $current
                Write-Host ""
                Write-Host "  $([char]0x2192) Auto-applying remaining $remaining optimizations (3 consecutive approvals)" -ForegroundColor Cyan
                Write-Host "  $([char]0x2192) Press Ctrl+C to abort if needed" -ForegroundColor DarkGray
                Write-Host ""
            }
            try {
                & $OPT_FUNCTIONS[$id]
                $approvedIds += $id
            } catch {
                Write-Fail "Optimization $id failed: $($_.Exception.Message)"
            }
        } else {
            $skippedIds += $id
            if (-not $quit) {
                $info = $OPT_DESCRIPTIONS[$id]
                $name = if ($info) { $info.name } else { $id }
                Write-Host "  [SKIP] $name" -ForegroundColor DarkGray
            }
        }
    }

    # Show approval summary
    Write-Host ""
    Write-Host "  ────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  Applied: $($approvedIds.Count) | Skipped: $($skippedIds.Count)" -ForegroundColor Gray
    if ($quit) { Write-Host "  (User quit early)" -ForegroundColor Yellow }
}

# Install packages
if ($pkgKeys.Count -gt 0) {
    Write-Step "Arsenal (winget)"
    Write-Host ""
    Write-Host "  ╔════════════════════════════════════════════════════════════════╗" -ForegroundColor White
    Write-Host "  ║  PACKAGE INSTALLATION - Review each software before install    ║" -ForegroundColor White
    Write-Host "  ╚════════════════════════════════════════════════════════════════╝" -ForegroundColor White
    Write-Host ""
    Write-Host "  This loadout includes $($pkgKeys.Count) package(s) to install via winget." -ForegroundColor Gray
    Write-Host ""

    $wingetPath = Get-Command winget -EA SilentlyContinue
    if (-not $wingetPath) {
        Write-Fail "winget not found. Install App Installer from Microsoft Store."
    } else {
        $pkgAutoApprove = $false
        $pkgConsecutiveYes = 0  # Track consecutive Y responses for smart auto-All
        $installedPkgs = @()
        $skippedPkgs = @()
        $pkgQuit = $false
        $pkgCurrent = 0
        $pkgTotal = $pkgKeys.Count

        foreach ($key in $pkgKeys) {
            if ($pkgQuit) { break }
            $pkgCurrent++

            if (-not $PACKAGE_MAP.ContainsKey($key)) {
                Write-Warn "Unknown package: $key (skipped)"
                continue
            }

            $pkg = $PACKAGE_MAP[$key]

            if (-not $pkgAutoApprove) {
                Write-Host ""
                Write-Host "  [$pkgCurrent/$pkgTotal] " -NoNewline -ForegroundColor DarkGray
                Write-Host $pkg.name -NoNewline -ForegroundColor White
                Write-Host " [" -NoNewline -ForegroundColor DarkGray
                Write-Host "SOFTWARE" -NoNewline -ForegroundColor Cyan
                Write-Host "]" -ForegroundColor DarkGray
                Write-Host "  winget: $($pkg.id)" -ForegroundColor Gray
                Write-Host ""
                Write-Host "  Install? [Y]es / [N]o / [A]ll remaining / [Q]uit: " -NoNewline -ForegroundColor Cyan
                $pkgResponse = Read-Host
            } else {
                $pkgResponse = 'y'
            }

            switch ($pkgResponse.ToLower()) {
                'a' { $pkgAutoApprove = $true; $pkgResponse = 'y' }
                'q' { $pkgQuit = $true }
                'n' { $pkgConsecutiveYes = 0 }  # Reset on skip
            }

            if (-not $pkgQuit -and $pkgResponse.ToLower() -eq 'y') {
                $pkgConsecutiveYes++
                # Smart Auto-All: after 3 consecutive Y, auto-approve remaining
                if ($pkgConsecutiveYes -ge 3 -and -not $pkgAutoApprove) {
                    $pkgAutoApprove = $true
                    $remaining = $pkgTotal - $pkgCurrent
                    Write-Host ""
                    Write-Host "  $([char]0x2192) Auto-installing remaining $remaining packages (3 consecutive approvals)" -ForegroundColor Cyan
                    Write-Host "  $([char]0x2192) Press Ctrl+C to abort if needed" -ForegroundColor DarkGray
                    Write-Host ""
                }
                Write-Host "  Installing $($pkg.name)..." -NoNewline
                $installOutput = winget install --id "$($pkg.id)" --silent --accept-package-agreements --accept-source-agreements 2>&1
                if ($LASTEXITCODE -eq 0) { Write-OK ""; $installedPkgs += $key }
                elseif ($installOutput -match "No available upgrade found|No newer package versions are available|already installed") { Write-OK "Already installed"; $installedPkgs += $key }
                else { Write-Fail ""; $installOutput | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray } }
            } else {
                $skippedPkgs += $key
                if (-not $pkgQuit) { Write-Host "  [SKIP] $($pkg.name)" -ForegroundColor DarkGray }
            }
        }

        # Show package summary
        Write-Host ""
        Write-Host "  ────────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host "  Installed: $($installedPkgs.Count) | Skipped: $($skippedPkgs.Count)" -ForegroundColor Gray
        if ($pkgQuit) { Write-Host "  (User quit early)" -ForegroundColor Yellow }
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
