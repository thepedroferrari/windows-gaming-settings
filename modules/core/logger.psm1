
<#
.SYNOPSIS
    Logging utilities for the Gaming PC Setup scripts.
.DESCRIPTION
    Provides a small logging surface that writes to a shared log file and the
    console, with severity coloring and a summary helper. Uses module-scoped
    variables to store log path and start time.
.NOTES
    Import this module before any other module that calls Write-Log.
#>

# Module-scoped state for log file path and runtime duration tracking.
$script:LogPath = ".\gaming-pc-setup.log"
$script:StartTime = Get-Date


function Initialize-Logger {
    <#
    .SYNOPSIS
        Initializes logging for the current run.
    .DESCRIPTION
        Sets the log path, records the start time, creates the log directory if
        missing, optionally clears any existing log, and writes a header block.
    .PARAMETER LogPath
        Destination log file path. Defaults to ./gaming-pc-setup.log.
    .PARAMETER ClearExisting
        When true, removes the existing log file before writing new entries.
    .OUTPUTS
        None.
    #>

    [CmdletBinding()]
    param(
        [string]$LogPath = ".\gaming-pc-setup.log",
        [bool]$ClearExisting = $false
    )

    $script:LogPath = $LogPath
    $script:StartTime = Get-Date

    $logDir = Split-Path $LogPath -Parent
    if ($logDir -and -not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    if ($ClearExisting -and (Test-Path $LogPath)) {
        Remove-Item $LogPath -Force
    }

    Write-Log "=== Gaming PC Setup - Log Started ===" "INFO"
    Write-Log "Start Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "INFO"
    Write-Log "PowerShell Version: $($PSVersionTable.PSVersion)" "INFO"
    Write-Log "Operating System: $([System.Environment]::OSVersion.VersionString)" "INFO"
    Write-Log "Log Path: $LogPath" "INFO"
}

function Write-Log {
    <#
    .SYNOPSIS
        Writes a log line to file and console.
    .DESCRIPTION
        Prepends a timestamp and severity level, appends to the log file, and
        writes to the console with a severity-based color.
    .PARAMETER Message
        Message text to record.
    .PARAMETER Level
        Severity label. Accepted values: INFO, SUCCESS, ERROR, WARNING.
    .OUTPUTS
        None.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,

        [Parameter(Mandatory=$false)]
        [ValidateSet('INFO', 'SUCCESS', 'ERROR', 'WARNING')]
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"

    try {
        Add-Content -Path $script:LogPath -Value $logMessage -ErrorAction Stop
    } catch {
        Write-Verbose "Unable to write to log file: $_"
    }

    $color = switch ($Level) {
        'SUCCESS' { 'Green' }
        'ERROR' { 'Red' }
        'WARNING' { 'Yellow' }
        default { 'White' }
    }

    Write-Host $logMessage -ForegroundColor $color
}

function Write-LogSection {
    <#
    .SYNOPSIS
        Writes a banner-style section header to the log.
    .PARAMETER SectionName
        Human-friendly section name to render.
    .OUTPUTS
        None.
    #>

    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$SectionName
    )

    Write-Log "============================================================" "INFO"
    Write-Log "=== $SectionName ===" "INFO"
    Write-Log "============================================================" "INFO"
}

function Get-LogSummary {
    <#
    .SYNOPSIS
        Summarizes log output for reporting.
    .DESCRIPTION
        Counts success/error/warning lines and returns a summary hashtable with
        duration and log metadata. Returns zero counts if the log file is missing.
    .OUTPUTS
        [hashtable] Summary information including counts and duration.
    #>

    [CmdletBinding()]
    param()

    $duration = (Get-Date) - $script:StartTime

    if (-not (Test-Path $script:LogPath)) {
        return @{
            Duration = $duration
            ErrorCount = 0
            SuccessCount = 0
            WarningCount = 0
            TotalLines = 0
        }
    }

    $logContent = Get-Content $script:LogPath

    return @{
        Duration = $duration
        ErrorCount = ($logContent | Select-String '\[ERROR\]').Count
        SuccessCount = ($logContent | Select-String '\[SUCCESS\]').Count
        WarningCount = ($logContent | Select-String '\[WARNING\]').Count
        TotalLines = $logContent.Count
        LogPath = $script:LogPath
    }
}


Export-ModuleMember -Function @(
    'Initialize-Logger',
    'Write-Log',
    'Write-LogSection',
    'Get-LogSummary'
)
