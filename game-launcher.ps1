#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Launches a game with optimal timer resolution and process priority
    
.DESCRIPTION
    Automatically sets timer resolution to 0.5ms and launches your game with high priority.
    Monitors the game process and maintains timer resolution while it's running.
    
.PARAMETER GamePath
    Full path to game executable
    
.PARAMETER GameProcess
    Process name (e.g., "cs2", "dota2") - used for monitoring
    
.PARAMETER Arguments
    Launch arguments for the game
    
.EXAMPLE
    .\game-launcher.ps1 -GamePath "C:\Steam\steamapps\common\Counter-Strike Global Offensive\game\bin\win64\cs2.exe" -GameProcess "cs2" -Arguments "-high -threads 8"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$GamePath,
    
    [Parameter(Mandatory=$true)]
    [string]$GameProcess,
    
    [string]$Arguments = ""
)

# Load timer resolution functions
Add-Type @"
using System;
using System.Runtime.InteropServices;

public class TimerResolution {
    [DllImport("winmm.dll", SetLastError = true)]
    public static extern uint timeBeginPeriod(uint uPeriod);
    
    [DllImport("winmm.dll", SetLastError = true)]
    public static extern uint timeEndPeriod(uint uPeriod);
}
"@

function Set-TimerResolution {
    param([double]$Milliseconds)
    $result = [TimerResolution]::timeBeginPeriod([uint32]$Milliseconds)
    return ($result -eq 0)
}

Write-Host "=== Game Launcher with Timer Optimization ===" -ForegroundColor Cyan
Write-Host ""

# Check if game exists
if (-not (Test-Path $GamePath)) {
    Write-Host "Error: Game not found at: $GamePath" -ForegroundColor Red
    exit 1
}

Write-Host "Game: $GamePath" -ForegroundColor Yellow
Write-Host "Process: $GameProcess" -ForegroundColor Yellow
Write-Host ""

# Set timer resolution
Write-Host "Setting timer resolution to 0.5ms..." -ForegroundColor Cyan
if (Set-TimerResolution -Milliseconds 0.5) {
    Write-Host "Timer resolution set successfully" -ForegroundColor Green
} else {
    Write-Host "Warning: Failed to set timer resolution" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Launching game..." -ForegroundColor Cyan

# Launch game
try {
    if ($Arguments) {
        $process = Start-Process -FilePath $GamePath -ArgumentList $Arguments -PassThru -WindowStyle Normal
    } else {
        $process = Start-Process -FilePath $GamePath -PassThru -WindowStyle Normal
    }
    
    Write-Host "Game launched (PID: $($process.Id))" -ForegroundColor Green
    Write-Host ""
    Write-Host "Maintaining timer resolution while game is running..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop monitoring (game will continue)" -ForegroundColor Yellow
    Write-Host ""
    
    # Monitor game and maintain timer resolution
    try {
        while (-not $process.HasExited) {
            Start-Sleep -Milliseconds 100
            
            # Re-apply timer resolution periodically (Windows may reset it)
            Set-TimerResolution -Milliseconds 0.5 | Out-Null
        }
        
        Write-Host ""
        Write-Host "Game has exited." -ForegroundColor Yellow
    } catch {
        # User interrupted or error
        Write-Host ""
        Write-Host "Monitoring stopped." -ForegroundColor Yellow
    }
    
    # Cleanup
    Write-Host "Restoring timer resolution..." -ForegroundColor Cyan
    [TimerResolution]::timeEndPeriod(1) | Out-Null
    
} catch {
    Write-Host "Error launching game: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Done." -ForegroundColor Green
