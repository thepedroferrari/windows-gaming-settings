#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Compiles gaming-pc-setup.ps1 to executable using PS2EXE
    
.DESCRIPTION
    This helper script installs PS2EXE module if needed and compiles
    the main gaming PC setup script to a standalone executable.
#>

$ErrorActionPreference = "Stop"

Write-Host "=== Gaming PC Setup - Compiler ===" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Join-Path $PSScriptRoot "gaming-pc-setup.ps1"
$outputPath = Join-Path $PSScriptRoot "gaming-pc-setup.exe"

# Check if source script exists
if (-not (Test-Path $scriptPath)) {
    Write-Host "Error: gaming-pc-setup.ps1 not found in current directory" -ForegroundColor Red
    exit 1
}

# Check if PS2EXE module is installed
$ps2exeModule = Get-Module -ListAvailable -Name PS2EXE

if (-not $ps2exeModule) {
    Write-Host "PS2EXE module not found. Installing..." -ForegroundColor Yellow
    
    try {
        Install-Module -Name PS2EXE -Force -Scope CurrentUser -AllowClobber
        Write-Host "PS2EXE module installed successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install PS2EXE module: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install manually:" -ForegroundColor Yellow
        Write-Host "  Install-Module -Name PS2EXE -Force -Scope CurrentUser" -ForegroundColor White
        exit 1
    }
}

# Import PS2EXE module
try {
    Import-Module PS2EXE -Force
    Write-Host "PS2EXE module loaded" -ForegroundColor Green
} catch {
    Write-Host "Failed to import PS2EXE module: $_" -ForegroundColor Red
    exit 1
}

# Compile the script
Write-Host ""
Write-Host "Compiling gaming-pc-setup.ps1 to gaming-pc-setup.exe..." -ForegroundColor Yellow

try {
    Invoke-PS2EXE `
        -inputFile $scriptPath `
        -outputFile $outputPath `
        -requireAdmin `
        -noConsole `
        -title "Gaming PC Setup" `
        -description "Gaming PC Setup Script - Optimizes Windows for gaming performance" `
        -company "Gaming PC Setup" `
        -product "Gaming PC Setup" `
        -copyright "Copyright (C) $(Get-Date -Format 'yyyy')" `
        -version "1.0.0.0"
    
    Write-Host ""
    Write-Host "Compilation successful!" -ForegroundColor Green
    Write-Host "Output: $outputPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You can now run gaming-pc-setup.exe directly." -ForegroundColor Yellow
    Write-Host "Note: The executable will require administrator privileges." -ForegroundColor Yellow
    
} catch {
    Write-Host ""
    Write-Host "Compilation failed: $_" -ForegroundColor Red
    exit 1
}
