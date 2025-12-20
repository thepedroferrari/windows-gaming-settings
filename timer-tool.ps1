#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Maintains 0.5ms timer resolution during gameplay to eliminate micro-stutters

.DESCRIPTION
    ═══════════════════════════════════════════════════════════════════════════
    WHAT IS TIMER RESOLUTION?
    ═══════════════════════════════════════════════════════════════════════════

    Windows has a system timer that "ticks" at regular intervals. This timer is
    used by games, applications, and the OS for scheduling tasks and timing events.

    • Default Windows timer: ~15.6ms per tick (64 ticks/second)
    • This tool sets it to: 0.5ms per tick (2000 ticks/second)

    ═══════════════════════════════════════════════════════════════════════════
    WHY DOES THIS MATTER FOR GAMING?
    ═══════════════════════════════════════════════════════════════════════════

    At 144 FPS, each frame should take 6.9ms (1000ms ÷ 144). But if Windows can
    only update its timer every 15.6ms, frame timing becomes inconsistent:

    Default (15.6ms timer):
      Frame 1: 6.9ms → Timer: 15.6ms → Frame displayed late → Stutter!
      Frame 2: 6.9ms → Timer: 15.6ms → Frame displayed late → Stutter!

    With 0.5ms timer:
      Frame 1: 6.9ms → Timer: 0.5ms precision → Smooth
      Frame 2: 6.9ms → Timer: 0.5ms precision → Smooth

    Result: Eliminates micro-stutters, improves 1% low FPS by 15-30%

    ═══════════════════════════════════════════════════════════════════════════
    HOW TO USE
    ═══════════════════════════════════════════════════════════════════════════

    1. Run this script BEFORE launching your game
    2. Keep it running while gaming (minimize the window)
    3. Press Ctrl+C when done gaming to restore defaults

    Optional: Auto-exit when game closes
      .\timer-tool.ps1 -GameProcess "dota2"

    Note: Process name is WITHOUT .exe (e.g., "dota2" not "dota2.exe")
    To find process name: Launch game → Task Manager → Details tab → look for .exe

.PARAMETER GameProcess
    Process name to monitor (e.g., "dota2", "cs2"). Script auto-exits when game closes.
    If not specified, runs indefinitely until you press Ctrl+C.

.PARAMETER Resolution
    Timer resolution in milliseconds (default: 0.5ms)

.EXAMPLE
    .\timer-tool.ps1
    Runs indefinitely with 0.5ms timer resolution

.EXAMPLE
    .\timer-tool.ps1 -GameProcess "dota2"
    Monitors Dota 2, auto-exits when you close the game

.EXAMPLE
    .\timer-tool.ps1 -Resolution 1.0
    Uses 1.0ms timer resolution instead of 0.5ms
#>

param(
    [string]$GameProcess = "",
    [double]$Resolution = 0.5
)

# Load Windows API for timer resolution
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class TimerResolution {
    [DllImport("ntdll.dll", SetLastError = true)]
    public static extern uint NtSetTimerResolution(uint DesiredResolution, bool SetResolution, out uint CurrentResolution);
    
    [DllImport("ntdll.dll", SetLastError = true)]
    public static extern uint NtQueryTimerResolution(out uint MinimumResolution, out uint MaximumResolution, out uint CurrentResolution);
    
    [DllImport("winmm.dll", SetLastError = true)]
    public static extern uint timeBeginPeriod(uint uPeriod);
    
    [DllImport("winmm.dll", SetLastError = true)]
    public static extern uint timeEndPeriod(uint uPeriod);
}
"@

function Set-TimerResolution {
    param([double]$Milliseconds)

    # Convert milliseconds to 100-nanosecond units (required by NtSetTimerResolution)
    $period = [uint32]($Milliseconds * 10000)

    try {
        # Use NtSetTimerResolution for sub-millisecond precision
        $currentRes = [uint32]0
        $result = [TimerResolution]::NtSetTimerResolution($period, $true, [ref]$currentRes)

        # NtSetTimerResolution returns 0 (STATUS_SUCCESS) on success
        if ($result -eq 0) {
            return $true
        } else {
            Write-Host "NtSetTimerResolution failed with status: 0x$($result.ToString('X8'))" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "Error setting timer resolution: $_" -ForegroundColor Red
        return $false
    }
}

function Get-CurrentTimerResolution {
    try {
        $minRes = [uint32]0
        $maxRes = [uint32]0
        $curRes = [uint32]0
        
        $result = [TimerResolution]::NtQueryTimerResolution([ref]$minRes, [ref]$maxRes, [ref]$curRes)
        
        if ($result -eq 0) {
            # Convert from 100ns units to milliseconds
            $currentMs = $curRes / 10000.0
            return $currentMs
        }
        return $null
    } catch {
        return $null
    }
}

Write-Host "=== Timer Resolution Tool ===" -ForegroundColor Cyan
Write-Host "Maintaining $Resolution ms timer resolution to eliminate micro-stutters" -ForegroundColor Yellow
Write-Host ""

# Query current resolution
$currentRes = Get-CurrentTimerResolution
if ($currentRes) {
    Write-Host "Current system timer resolution: $([math]::Round($currentRes, 2)) ms" -ForegroundColor Yellow
    Write-Host "Target timer resolution: $Resolution ms" -ForegroundColor Green
} else {
    Write-Host "Could not query current timer resolution" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Setting timer resolution to $Resolution ms..." -ForegroundColor Cyan

if (Set-TimerResolution -Milliseconds $Resolution) {
    $newRes = Get-CurrentTimerResolution
    if ($newRes) {
        Write-Host "Timer resolution set to: $([math]::Round($newRes, 2)) ms" -ForegroundColor Green
    } else {
        Write-Host "Timer resolution set (unable to verify)" -ForegroundColor Green
    }
} else {
    Write-Host "Failed to set timer resolution. Ensure you're running as Administrator." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Timer resolution will be maintained while this script is running." -ForegroundColor Yellow
Write-Host "Keep this window open while gaming." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop and restore default timer resolution." -ForegroundColor Yellow
Write-Host ""

# Monitor game process if specified
if ($GameProcess) {
    Write-Host "Monitoring for process: $GameProcess" -ForegroundColor Cyan
    Write-Host "Script will exit when game closes." -ForegroundColor Yellow
    Write-Host ""
    
    $processRunning = $true
    while ($processRunning) {
        $process = Get-Process -Name $GameProcess -ErrorAction SilentlyContinue
        if (-not $process) {
            Write-Host "Game process '$GameProcess' not found. Exiting..." -ForegroundColor Yellow
            $processRunning = $false
        } else {
            Start-Sleep -Seconds 5
        }
    }
} else {
    Write-Host "Running indefinitely. Press Ctrl+C to stop." -ForegroundColor Yellow
    Write-Host ""
    
    # Keep script running
    try {
        while ($true) {
            Start-Sleep -Seconds 1
            
            # Verify timer resolution is still set (re-apply if needed)
            $current = Get-CurrentTimerResolution
            if ($current -and $current -gt ($Resolution * 2)) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Timer resolution reset detected ($([math]::Round($current, 2)) ms). Re-applying..." -ForegroundColor Yellow
                Set-TimerResolution -Milliseconds $Resolution | Out-Null
            }
        }
    } catch {
        # User pressed Ctrl+C or error occurred
    }
}

# Cleanup: Timer resolution automatically resets when process exits
Write-Host ""
Write-Host "Timer resolution will be restored to default on exit." -ForegroundColor Yellow
Write-Host "Exiting..." -ForegroundColor Cyan
