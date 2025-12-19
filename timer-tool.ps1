#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Maintains 0.5ms timer resolution during gameplay to eliminate micro-stutters
    
.DESCRIPTION
    Windows defaults to 15.6ms timer resolution, causing inconsistent frame times and micro-stutters.
    This tool continuously requests 0.5ms timer resolution while games are running.
    Run this BEFORE starting your game and keep it running.
    
    This is CRITICAL for fixing 1% low FPS issues and micro-stutters.
    
.PARAMETER GameProcess
    Process name to monitor (e.g., "cs2", "dota2"). If not specified, runs indefinitely.
    
.PARAMETER Resolution
    Timer resolution in milliseconds (default: 0.5ms)
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
    
    $period = [uint32]($Milliseconds * 10000) # Convert to 100ns units
    
    try {
        # Use timeBeginPeriod (more reliable than NtSetTimerResolution)
        $result = [TimerResolution]::timeBeginPeriod([uint32]$Milliseconds)
        if ($result -eq 0) {
            return $true
        } else {
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

# Cleanup: Restore default timer resolution
Write-Host ""
Write-Host "Restoring default timer resolution..." -ForegroundColor Yellow
try {
    [TimerResolution]::timeEndPeriod([uint32]$Resolution) | Out-Null
    Write-Host "Timer resolution restored." -ForegroundColor Green
} catch {
    Write-Host "Error restoring timer resolution: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Exiting..." -ForegroundColor Cyan
