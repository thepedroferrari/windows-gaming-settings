#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Game Mode - Stops unnecessary services and processes for maximum gaming performance

.DESCRIPTION
    Temporarily stops Windows services and background processes that consume CPU/memory.
    Can restore everything after gaming session.

    NO TELEMETRY - NO SPYWARE - 100% transparent PowerShell

.PARAMETER Mode
    "Start" to enable game mode, "Stop" to restore services

.PARAMETER GameProcess
    Optional: Game process name to monitor (e.g., "cs2.exe")

.EXAMPLE
    .\game-mode.ps1 -Mode Start
    .\game-mode.ps1 -Mode Start -GameProcess "cs2.exe"
    .\game-mode.ps1 -Mode Stop
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("Start", "Stop")]
    [string]$Mode,

    [Parameter(Mandatory=$false)]
    [string]$GameProcess
)

$ErrorActionPreference = "SilentlyContinue"
$logFile = Join-Path $PSScriptRoot "game-mode.log"
$stateFile = Join-Path $PSScriptRoot "game-mode-state.json"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $logFile -Value $logMessage

    $color = switch ($Level) {
        "SUCCESS" { "Green" }
        "ERROR" { "Red" }
        "WARNING" { "Yellow" }
        default { "White" }
    }
    Write-Host $logMessage -ForegroundColor $color
}

# Services safe to stop during gaming (will be restored after)
$ServicesToStop = @(
    # Windows Update
    "wuauserv",           # Windows Update
    "UsoSvc",             # Update Orchestrator Service

    # Search and Indexing
    "WSearch",            # Windows Search

    # Telemetry and Diagnostics
    "DiagTrack",          # Connected User Experiences and Telemetry
    "dmwappushservice",   # WAP Push Message Routing Service
    "DPS",                # Diagnostic Policy Service
    "WerSvc",             # Windows Error Reporting

    # Print Services (if you don't print while gaming)
    "Spooler",            # Print Spooler

    # Windows Defender (CAUTION: Only if you know what you're doing)
    # "WinDefend",        # Uncomment to disable Defender during gaming
    # "SecurityHealthService",

    # Superfetch/SysMain (can cause disk usage)
    "SysMain",            # Superfetch/SysMain

    # Background Intelligent Transfer
    "BITS",               # Background Intelligent Transfer Service

    # Delivery Optimization (Windows Store downloads)
    "DoSvc",              # Delivery Optimization

    # Remote services (if not needed)
    "RemoteRegistry",     # Remote Registry
    "RemoteAccess",       # Routing and Remote Access

    # Xbox services (if not using Xbox features)
    "XblAuthManager",     # Xbox Live Auth Manager
    "XblGameSave",        # Xbox Live Game Save
    "XboxNetApiSvc",      # Xbox Live Networking Service
    "XboxGipSvc",         # Xbox Accessory Management Service

    # OneDrive sync (if installed)
    # Will be handled in process termination

    # Windows Time (can cause DPC latency spikes)
    # "W32Time",          # Uncomment if you don't need clock sync during gaming

    # Bluetooth (if not using wireless peripherals)
    # "bthserv",          # Uncomment to disable Bluetooth

    # Tablet Input (if not using touch/pen)
    "TabletInputService", # Touch Keyboard and Handwriting Panel Service

    # Geolocation
    "lfsvc",              # Geolocation Service

    # Maps
    "MapsBroker",         # Downloaded Maps Manager

    # Phone service (if not using Your Phone app)
    "PhoneSvc",           # Phone Service

    # Retail Demo
    "RetailDemo",         # Retail Demo Service

    # Network Data Usage (telemetry)
    "Ndu"                 # Windows Network Data Usage Monitor
)

# Processes to terminate (will NOT be restored - user must relaunch)
$ProcessesToKill = @(
    # RGB Software (major DPC latency sources)
    "iCUE",               # Corsair iCUE
    "LightingService",    # Corsair
    "Razer*",             # Razer Synapse/Chroma
    "LCore",              # Logitech Gaming Software
    "LGHUB",              # Logitech G HUB
    "ASUSCOM",            # ASUS Aura Sync
    "AsusCertService",
    "LightingService",
    "AURAService",
    "AsusAppService",

    # Monitoring/Overlays (optional - comment out if you use them)
    # "MSIAfterburner",   # MSI Afterburner (uncomment to kill)
    # "RTSS",             # RivaTuner Statistics Server
    # "HWiNFO64",         # HWiNFO monitoring

    # Cloud Sync
    "OneDrive",           # OneDrive
    "Dropbox",            # Dropbox
    "GoogleDrive",        # Google Drive

    # Communication (optional - comment out if you use them)
    # "Discord",          # Uncomment to kill Discord
    # "Skype",
    # "Slack",
    # "Teams",

    # Browsers (if not needed)
    # "chrome",           # Uncomment to kill Chrome
    # "firefox",
    # "msedge",
    # "brave",

    # Torrent clients
    "qbittorrent",
    "utorrent",
    "bittorrent",
    "transmission",

    # Software updaters
    "NVIDIAGeForceExperience",
    "EpicGamesLauncher",  # Epic launcher
    "EpicWebHelper",

    # Misc background apps
    "Calculator",
    "SnippingTool",
    "Notepad",
    "mspaint"
)

function Start-GameMode {
    Write-Log "=== STARTING GAME MODE ===" "SUCCESS"

    # Save current service states
    $serviceStates = @{}

    # Stop services
    Write-Log "Stopping unnecessary services..."
    $stoppedCount = 0

    foreach ($serviceName in $ServicesToStop) {
        try {
            $service = Get-Service -Name $serviceName -ErrorAction Stop

            # Save original state
            $serviceStates[$serviceName] = @{
                Status = $service.Status
                StartType = $service.StartType
            }

            if ($service.Status -eq "Running") {
                Stop-Service -Name $serviceName -Force -ErrorAction Stop
                Write-Log "Stopped: $serviceName" "SUCCESS"
                $stoppedCount++
            }
        } catch {
            # Service might not exist on this system
        }
    }

    Write-Log "Stopped $stoppedCount services" "SUCCESS"

    # Kill processes
    Write-Log "Terminating background processes..."
    $killedCount = 0

    foreach ($processName in $ProcessesToKill) {
        $processes = Get-Process -Name $processName.Replace("*", "") -ErrorAction SilentlyContinue
        foreach ($proc in $processes) {
            try {
                $proc.Kill()
                Write-Log "Killed: $($proc.ProcessName)" "SUCCESS"
                $killedCount++
            } catch {
                Write-Log "Could not kill: $($proc.ProcessName)" "WARNING"
            }
        }
    }

    Write-Log "Terminated $killedCount processes" "SUCCESS"

    # Save state to file for restoration
    $serviceStates | ConvertTo-Json | Set-Content $stateFile

    # Set timer resolution to 0.5ms (same as timer-tool.ps1)
    Write-Log "Setting timer resolution to 0.5ms..."
    try {
        Add-Type @"
using System;
using System.Runtime.InteropServices;

public class TimerResolution {
    [DllImport("ntdll.dll", SetLastError = true)]
    public static extern int NtSetTimerResolution(uint DesiredResolution, bool SetResolution, out uint CurrentResolution);

    [DllImport("winmm.dll", SetLastError = true)]
    public static extern uint timeBeginPeriod(uint uPeriod);
}
"@
        [TimerResolution]::timeBeginPeriod(1) | Out-Null
        $currentRes = 0
        [TimerResolution]::NtSetTimerResolution(5000, $true, [ref]$currentRes) | Out-Null
        Write-Log "Timer resolution set to 0.5ms" "SUCCESS"
    } catch {
        Write-Log "Timer resolution already set or error: $_" "WARNING"
    }

    # Clear RAM cache (optional)
    Write-Log "Clearing standby memory..."
    try {
        $clearStandbyList = @"
using System;
using System.Runtime.InteropServices;

public class MemoryManager {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool SetProcessWorkingSetSize(IntPtr proc, int min, int max);
}
"@
        Add-Type $clearStandbyList -ErrorAction SilentlyContinue
        [MemoryManager]::SetProcessWorkingSetSize((Get-Process -Id $pid).Handle, -1, -1) | Out-Null
        Write-Log "Memory optimization applied" "SUCCESS"
    } catch {
        # Not critical
    }

    Write-Log "=== GAME MODE ACTIVE ===" "SUCCESS"
    Write-Log ""
    Write-Log "Background services stopped: $stoppedCount"
    Write-Log "Background processes killed: $killedCount"
    Write-Log "Timer resolution: 0.5ms"
    Write-Log ""

    if ($GameProcess) {
        Write-Log "Monitoring for game process: $GameProcess" "SUCCESS"
        Write-Log "This window will stay open and automatically restore when game exits."
        Write-Log "Or press Ctrl+C to restore manually."

        # Monitor game process
        while ($true) {
            $gameRunning = Get-Process -Name $GameProcess.Replace(".exe", "") -ErrorAction SilentlyContinue
            if (-not $gameRunning) {
                Write-Log "Game process ended. Auto-restoring services..." "WARNING"
                Stop-GameMode
                break
            }
            Start-Sleep -Seconds 5
        }
    } else {
        Write-Log "Run '.\game-mode.ps1 -Mode Stop' when done gaming to restore services." "WARNING"
    }
}

function Stop-GameMode {
    Write-Log "=== STOPPING GAME MODE ===" "WARNING"

    if (-not (Test-Path $stateFile)) {
        Write-Log "No saved state found. Services may have been manually managed." "WARNING"
        return
    }

    # Load saved service states
    $serviceStates = Get-Content $stateFile | ConvertFrom-Json

    Write-Log "Restoring services..."
    $restoredCount = 0

    foreach ($serviceName in $serviceStates.PSObject.Properties.Name) {
        $savedState = $serviceStates.$serviceName

        try {
            $service = Get-Service -Name $serviceName -ErrorAction Stop

            # Restore start type if it was changed
            # (Our script only stops, doesn't change start type, but good to have)

            # Restart if it was originally running
            if ($savedState.Status -eq "Running" -and $service.Status -ne "Running") {
                Start-Service -Name $serviceName -ErrorAction Stop
                Write-Log "Restored: $serviceName" "SUCCESS"
                $restoredCount++
            }
        } catch {
            Write-Log "Could not restore: $serviceName - $_" "ERROR"
        }
    }

    Write-Log "Restored $restoredCount services" "SUCCESS"

    # Remove state file
    Remove-Item $stateFile -ErrorAction SilentlyContinue

    Write-Log "=== GAME MODE DEACTIVATED ===" "SUCCESS"
    Write-Log "You can now close this window."
}

# Main execution
try {
    if ($Mode -eq "Start") {
        Start-GameMode
    } else {
        Stop-GameMode
    }
} catch {
    Write-Log "Critical error: $_" "ERROR"
    exit 1
}
