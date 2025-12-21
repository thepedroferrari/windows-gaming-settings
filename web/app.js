/**
 * RockTune — A Loadout Builder for Windows Gaming
 * Generate personalized PowerShell scripts to tune Windows for gaming
 */

(function () {
    'use strict';

    // =========================================================================
    // STATE
    // =========================================================================

    const state = {
        software: {},
        selectedSoftware: new Set(),
        categoryCounts: {},
        mouseX: 0,
        mouseY: 0
    };

    // Simple Icons CDN base
    const SIMPLE_ICONS_CDN = 'https://cdn.simpleicons.org';

    // SVG fallback icons by category (Lucide-style)
    const CATEGORY_ICONS = {
        launcher: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>',
        gaming: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4m-2-2v4m8 0h.01m2-2h.01"/></svg>',
        streaming: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/><path d="M2 12a9 9 0 0 1 8 8"/><path d="M2 16a5 5 0 0 1 4 4"/><circle cx="2" cy="20" r="1"/></svg>',
        monitoring: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
        browser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
        media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>',
        utility: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
        rgb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83"/></svg>',
        dev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
        runtime: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3m6-3v3M9 20v3m6-3v3M20 9h3m-3 6h3M1 9h3m-3 6h3"/></svg>',
        benchmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20v-6m6 6v-4m-12 4V10m12-6 2 2-2 2m-4-2h4M6 6H2m4 0 2 2M6 6l2-2"/></svg>',
        default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>'
    };

    // Preset configurations
    const presets = {
        competitive: {
            opts: ['pagefile', 'fastboot', 'timer', 'power_plan', 'usb_power', 'pcie_power', 'dns', 'nagle', 'audio_enhancements', 'msi_mode', 'game_bar'],
            software: ['steam', 'discord']
        },
        streaming: {
            opts: ['pagefile', 'fastboot', 'power_plan', 'usb_power', 'pcie_power', 'dns', 'audio_enhancements'],
            software: ['steam', 'discord', 'obs', 'vlc', '7zip']
        },
        balanced: {
            opts: ['pagefile', 'fastboot', 'timer', 'power_plan', 'usb_power', 'pcie_power', 'dns', 'nagle', 'audio_enhancements'],
            software: ['steam', 'discord', 'vlc', '7zip']
        },
        minimal: {
            opts: ['fastboot', 'power_plan', 'dns'],
            software: ['steam', '7zip']
        }
    };

    // =========================================================================
    // CURSOR GLOW
    // =========================================================================

    function setupCursorGlow() {
        const glow = document.querySelector('.cursor-glow');
        if (!glow) return;

        let targetX = 0, targetY = 0;
        let currentX = 0, currentY = 0;

        document.addEventListener('mousemove', (e) => {
            targetX = e.clientX;
            targetY = e.clientY;
            state.mouseX = e.clientX;
            state.mouseY = e.clientY;
        });

        function animate() {
            const ease = 0.08;
            currentX += (targetX - currentX) * ease;
            currentY += (targetY - currentY) * ease;
            glow.style.left = currentX + 'px';
            glow.style.top = currentY + 'px';
            requestAnimationFrame(animate);
        }
        animate();
    }

    // =========================================================================
    // SCROLL ANIMATIONS
    // =========================================================================

    function setupScrollAnimations() {
        const sections = document.querySelectorAll('.step');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('visible');
                    }, index * 100);
                }
            });
        }, { threshold: 0.1, rootMargin: '-50px' });

        sections.forEach(section => observer.observe(section));
    }

    // =========================================================================
    // CATALOG & RENDERING
    // =========================================================================

    async function loadCatalog() {
        try {
            const response = await fetch('catalog.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (e) {
            console.error('Catalog load error:', e);
            return {};
        }
    }

    function countCategories() {
        const counts = { all: 0 };
        for (const pkg of Object.values(state.software)) {
            counts.all++;
            counts[pkg.category] = (counts[pkg.category] || 0) + 1;
        }
        state.categoryCounts = counts;

        // Update badges
        Object.entries(counts).forEach(([cat, count]) => {
            const el = document.getElementById(`count-${cat}`);
            if (el) el.textContent = count;
        });
    }

    function renderSoftwareGrid() {
        const grid = document.getElementById('software-grid');
        if (!grid) return;

        grid.innerHTML = '';
        let delay = 0;

        for (const [key, pkg] of Object.entries(state.software)) {
            const card = createCard(key, pkg, delay);
            grid.appendChild(card);

            if (pkg.selected) {
                state.selectedSoftware.add(key);
            }

            delay += 30; // Stagger delay
        }

        countCategories();
        updateSoftwareCounter();
        updateSummary();
    }

    function createCard(key, pkg, delay) {
        const card = document.createElement('div');
        card.className = 'software-card entering';
        card.dataset.key = key;
        card.dataset.category = pkg.category;
        card.style.animationDelay = delay + 'ms';

        if (pkg.selected) {
            card.classList.add('selected');
        }

        // Build logo HTML
        let logoHtml;
        const fallbackIcon = CATEGORY_ICONS[pkg.category] || CATEGORY_ICONS.default;

        if (pkg.icon) {
            // Check if it's a local SVG file
            if (pkg.icon.endsWith('.svg') || pkg.icon.startsWith('icons/')) {
                logoHtml = `<img src="${pkg.icon}" alt="${pkg.name} icon" loading="lazy" class="local-icon" onerror="this.style.display='none'; this.parentElement.innerHTML='${pkg.emoji || fallbackIcon}';">`;
            } else {
                // Use Simple Icons CDN
                logoHtml = `<img src="${SIMPLE_ICONS_CDN}/${pkg.icon}/white" alt="${pkg.name} logo" loading="lazy" data-category="${pkg.category}" onerror="this.style.display='none'; this.parentElement.innerHTML='${pkg.emoji || fallbackIcon}';">`;
            }
        } else if (pkg.emoji) {
            logoHtml = `<span class="emoji-icon" role="img" aria-label="${pkg.name} icon">${pkg.emoji}</span>`;
        } else {
            logoHtml = fallbackIcon;
        }

        const descText = pkg.desc || 'No description available.';
        const shortDesc = descText.length > 60 ? descText.slice(0, 57) + '...' : descText;

        card.innerHTML = `
            <div class="software-card-inner">
                <div class="software-card-front">
                    <div class="logo">${logoHtml}</div>
                    <span class="name">${pkg.name}</span>
                    <span class="list-desc">${shortDesc}</span>
                    <span class="list-category">${pkg.category}</span>
                </div>
                <div class="software-card-back">
                    <span class="back-name">${pkg.name}</span>
                    <span class="back-desc">${descText}</span>
                    <span class="back-category">${pkg.category}</span>
                    <span class="back-action">${pkg.selected || state.selectedSoftware.has(key) ? '✓ Selected' : 'Click to add'}</span>
                </div>
            </div>
        `;

        // Click handler with ripple
        card.addEventListener('click', (e) => {
            toggleSoftware(key, card);
            createRipple(e, card);
        });

        // Magnetic hover
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            card.style.transform = `translate(${x * 0.05}px, ${y * 0.05}px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });

        // Remove entering class after animation
        card.addEventListener('animationend', () => {
            card.classList.remove('entering');
        });

        return card;
    }

    function createRipple(e, card) {
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const rect = card.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
        ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
        card.querySelector('.software-card-front').appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    }

    function toggleSoftware(key, card) {
        const isSelected = state.selectedSoftware.has(key);
        const actionBtn = card.querySelector('.back-action');

        if (isSelected) {
            state.selectedSoftware.delete(key);
            card.classList.remove('selected');
            if (actionBtn) actionBtn.textContent = 'Click to add';
        } else {
            state.selectedSoftware.add(key);
            card.classList.add('selected');
            if (actionBtn) actionBtn.textContent = '✓ Selected';
        }

        updateSoftwareCounter();
        updateSummary();
    }

    function updateSoftwareCounter() {
        const counter = document.getElementById('software-counter');
        if (counter) {
            counter.textContent = `${state.selectedSoftware.size} selected`;
        }
    }

    // =========================================================================
    // FILTERS
    // =========================================================================

    function setupFilters() {
        const buttons = document.querySelectorAll('.filter');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.dataset.filter;
                const cards = document.querySelectorAll('.software-card');

                cards.forEach((card, i) => {
                    const show = filter === '*' || card.dataset.category === filter;
                    card.classList.toggle('hidden', !show);

                    // Re-animate visible cards
                    if (show) {
                        card.style.animationDelay = i * 20 + 'ms';
                        card.classList.add('entering');
                        card.addEventListener('animationend', () => {
                            card.classList.remove('entering');
                        }, { once: true });
                    }
                });
            });
        });
    }

    // =========================================================================
    // SEARCH
    // =========================================================================

    function setupSearch() {
        const input = document.getElementById('software-search');
        if (!input) return;

        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.software-card');
            const activeFilter = document.querySelector('.filter.active')?.dataset.filter || '*';

            cards.forEach(card => {
                const key = card.dataset.key;
                const pkg = state.software[key];
                if (!pkg) return;

                const matchesSearch = !query ||
                    pkg.name.toLowerCase().includes(query) ||
                    (pkg.desc && pkg.desc.toLowerCase().includes(query)) ||
                    pkg.category.toLowerCase().includes(query);

                const matchesFilter = activeFilter === '*' || card.dataset.category === activeFilter;

                card.classList.toggle('hidden', !(matchesSearch && matchesFilter));
            });
        });
    }

    // =========================================================================
    // VIEW TOGGLE
    // =========================================================================

    function setupViewToggle() {
        const buttons = document.querySelectorAll('.view-btn');
        const grid = document.getElementById('software-grid');
        if (!buttons.length || !grid) return;

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const view = btn.dataset.view;
                grid.classList.toggle('list-view', view === 'list');
            });
        });
    }

    // =========================================================================
    // PRESETS
    // =========================================================================

    function setupPresets() {
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = presets[btn.dataset.preset];
                if (!preset) return;

                // Update active state
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Apply opts
                document.querySelectorAll('input[name="opt"]').forEach(cb => {
                    cb.checked = preset.opts.includes(cb.value);
                });

                // Apply software
                state.selectedSoftware.clear();
                document.querySelectorAll('.software-card').forEach(card => {
                    const key = card.dataset.key;
                    const selected = preset.software.includes(key);
                    card.classList.toggle('selected', selected);
                    const action = card.querySelector('.back-action');
                    if (action) action.textContent = selected ? '✓ Selected' : 'Click to add';
                    if (selected) state.selectedSoftware.add(key);
                });

                updateSoftwareCounter();
                updateSummary();
            });
        });
    }

    // =========================================================================
    // HARDWARE & SUMMARY
    // =========================================================================

    function getHardwareProfile() {
        return {
            cpu: document.querySelector('input[name="cpu"]:checked')?.value || 'amd_x3d',
            gpu: document.querySelector('input[name="gpu"]:checked')?.value || 'nvidia',
            peripherals: Array.from(document.querySelectorAll('input[name="peripheral"]:checked')).map(el => el.value)
        };
    }

    function getSelectedOptimizations() {
        return Array.from(document.querySelectorAll('input[name="opt"]:checked')).map(el => el.value);
    }

    function updateSummary() {
        const hw = getHardwareProfile();
        const opts = getSelectedOptimizations();

        const cpuLabel = { 'amd_x3d': 'X3D', 'amd': 'AMD', 'intel': 'Intel' }[hw.cpu] || hw.cpu;
        const gpuLabel = { 'nvidia': 'NVIDIA', 'amd': 'Radeon', 'intel': 'Arc' }[hw.gpu] || hw.gpu;

        const hwEl = document.getElementById('summary-hardware');
        const optsEl = document.getElementById('summary-opts');
        const softEl = document.getElementById('summary-software');

        if (hwEl) hwEl.textContent = `${cpuLabel} + ${gpuLabel}`;
        if (optsEl) optsEl.textContent = opts.length;
        if (softEl) softEl.textContent = state.selectedSoftware.size;
    }

    // =========================================================================
    // SCRIPT GENERATION
    // =========================================================================

    function generateScript() {
        const hw = getHardwareProfile();
        const opts = getSelectedOptimizations();
        const packages = Array.from(state.selectedSoftware)
            .map(key => state.software[key]?.id)
            .filter(Boolean);

        // Add peripheral software
        const peripheralPkgs = {
            logitech: 'Logitech.GHUB',
            razer: 'Razer.Synapse3',
            corsair: 'Corsair.iCUE.5',
            steelseries: 'SteelSeries.GG'
        };
        hw.peripherals.forEach(p => {
            if (peripheralPkgs[p]) packages.push(peripheralPkgs[p]);
        });

        const timestamp = new Date().toISOString();
        const config = JSON.stringify({ generated: timestamp, hardware: hw, optimizations: opts, packages }, null, 2);

        return `#Requires -RunAsAdministrator
<#
.SYNOPSIS
    RockTune — Loadout generated ${timestamp}
.DESCRIPTION
    Core: ${hw.cpu} + ${hw.gpu}
    Source: https://github.com/thepedroferrari/windows-gaming-settings

    Windows is the arena. RockTune is the upgrade bay.
#>

$Config = @'
${config}
'@ | ConvertFrom-Json

function Write-Step { param([string]$M) Write-Host ""; Write-Host "=== $M ===" -ForegroundColor Cyan }
function Write-OK { param([string]$M) Write-Host "  [OK] $M" -ForegroundColor Green }
function Write-Fail { param([string]$M) Write-Host "  [FAIL] $M" -ForegroundColor Red }

function Set-Reg {
    param([string]$Path, [string]$Name, $Value, [string]$Type = "DWORD")
    try {
        if (-not (Test-Path $Path)) { New-Item -Path $Path -Force | Out-Null }
        Set-ItemProperty -Path $Path -Name $Name -Value $Value -Type $Type -EA Stop
        return $true
    } catch { return $false }
}

Clear-Host
Write-Host ""; Write-Host "  ROCKTUNE LOADOUT" -ForegroundColor Magenta; Write-Host "  ================" -ForegroundColor Magenta; Write-Host ""

$cpu = (Get-CimInstance Win32_Processor).Name
$gpu = (Get-CimInstance Win32_VideoController | ? {$_.Status -eq "OK"} | Select -First 1).Name
$ram = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure -Property Capacity -Sum).Sum / 1GB)
Write-Host "  CPU: $cpu" -ForegroundColor White; Write-Host "  GPU: $gpu" -ForegroundColor White; Write-Host "  RAM: \${ram}GB" -ForegroundColor White

Write-Step "Upgrades"
${generateOptCode(opts, hw)}

Write-Step "Arsenal (winget)"
$pkgs = @(${packages.map(p => `"${p}"`).join(', ')})
foreach ($p in $pkgs) {
    Write-Host "  Installing $p..." -NoNewline
    winget install --id $p -e --accept-package-agreements --accept-source-agreements -h 2>&1 | Out-Null
    if ($?) { Write-OK "" } else { Write-Fail "" }
}

Write-Host ""; Write-Host "  LOADOUT FORGED! Reboot recommended." -ForegroundColor Green; Write-Host ""
pause
`;
    }

    function generateOptCode(opts, hw) {
        const code = [];

        if (opts.includes('pagefile')) code.push(`
$ramGB = [math]::Round((gcim Win32_PhysicalMemory | Measure -Property Capacity -Sum).Sum / 1GB)
$sz = if ($ramGB -ge 32) { 4096 } else { 8192 }
try { $cs = gcim Win32_ComputerSystem; $cs | scim -Property @{AutomaticManagedPagefile=$false}; Write-OK "PageFile \${sz}MB" } catch { Write-Fail "PageFile" }`);

        if (opts.includes('fastboot')) code.push(`
if (Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Power" "HiberbootEnabled" 0) { Write-OK "Fast Startup disabled" }`);

        if (opts.includes('power_plan')) code.push(`
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>$null; Write-OK "High Performance plan"`);

        if (opts.includes('usb_power')) code.push(`
powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0; Write-OK "USB Suspend disabled"`);

        if (opts.includes('pcie_power')) code.push(`
powercfg /setacvalueindex SCHEME_CURRENT 501a4d13-42af-4429-9fd1-a8218c268e20 ee12f906-d277-404b-b6da-e5fa1a576df5 0; Write-OK "PCIe ASPM disabled"`);

        if (opts.includes('dns')) code.push(`
Get-NetAdapter | ? {$_.Status -eq "Up"} | % { Set-DnsClientServerAddress -InterfaceIndex $_.ifIndex -ServerAddresses ("1.1.1.1","1.0.0.1") }; Write-OK "DNS 1.1.1.1"`);

        if (opts.includes('nagle')) code.push(`
gci "HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces" | % { Set-Reg $_.PSPath "TcpAckFrequency" 1; Set-Reg $_.PSPath "TCPNoDelay" 1 }; Write-OK "Nagle disabled"`);

        if (opts.includes('msi_mode')) code.push(`
Get-PnpDevice -Class Display | ? {$_.Status -eq "OK"} | % { $p = "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$($_.InstanceId -replace '\\\\','\\\\')\\Device Parameters\\Interrupt Management\\MessageSignaledInterruptProperties"; if (Test-Path $p) { Set-Reg $p "MSISupported" 1 } }; Write-OK "MSI Mode (reboot needed)"`);

        if (opts.includes('game_bar')) code.push(`
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" "AppCaptureEnabled" 0; Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" "GameDVR_Enabled" 0; Write-OK "Game Bar overlays disabled"`);

        if (hw.cpu === 'amd_x3d') code.push(`
Set-Reg "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power" "CppcEnable" 1; Write-OK "AMD X3D CPPC enabled"`);

        if (opts.includes('privacy_tier1')) code.push(`
Set-Reg "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo" "Enabled" 0; Write-OK "Privacy Tier 1"`);

        if (opts.includes('privacy_tier2')) code.push(`
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" "AllowTelemetry" 1; Write-OK "Privacy Tier 2"`);

        if (opts.includes('privacy_tier3')) code.push(`
Write-Host "  [WARN] Privacy Tier 3 - May break Store/Xbox" -ForegroundColor Yellow
Set-Reg "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" "AllowTelemetry" 0
Stop-Service DiagTrack -Force -EA SilentlyContinue; Set-Service DiagTrack -StartupType Disabled -EA SilentlyContinue
Write-OK "Privacy Tier 3"`);

        return code.join('\n');
    }

    function downloadFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function setupDownload() {
        document.getElementById('download-btn')?.addEventListener('click', () => {
            const script = generateScript();
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            downloadFile(script, `rocktune-setup-${date}.ps1`);
        });
    }

    function setupFormListeners() {
        document.querySelectorAll('input[name="cpu"], input[name="gpu"], input[name="peripheral"], input[name="opt"]')
            .forEach(el => el.addEventListener('change', updateSummary));
    }

    // =========================================================================
    // INIT
    // =========================================================================

    function setupImageFallbacks() {
        document.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG' && e.target.closest('.software-card')) {
                const category = e.target.dataset.category || 'default';
                const fallbackIcon = CATEGORY_ICONS[category] || CATEGORY_ICONS.default;
                e.target.parentElement.innerHTML = fallbackIcon;
            }
        }, true);
    }

    async function init() {
        state.software = await loadCatalog();
        setupCursorGlow();
        setupScrollAnimations();
        setupImageFallbacks();
        renderSoftwareGrid();
        setupFilters();
        setupSearch();
        setupViewToggle();
        setupPresets();
        setupFormListeners();
        setupDownload();
        updateSummary();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
