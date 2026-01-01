<script lang="ts">
  /**
   * HeroSection - Gaming Energy + Clarity
   *
   * ROG-style gaming energy with Node.js-level clarity.
   * Sharp angles, neon glows, one bold message, instant understanding.
   */

  import { PRESETS, PRESET_META, PRESET_ORDER } from '$lib/presets';
  import {
    app,
    setActivePreset,
    setSelection,
    setRecommendedPackages,
    setFilter,
    setOptimizations,
  } from '$lib/state.svelte';
  import {
    isPackageKey,
    type PackageKey,
    type PresetType,
    FILTER_RECOMMENDED,
  } from '$lib/types';

  /** Profile badge data with OKLCH colors matching rarity */
  const PROFILE_BADGES = PRESET_ORDER.map((id) => {
    const meta = PRESET_META[id];
    const hueMap: Record<string, number> = {
      epic: 300,      // purple - pro_gamer
      uncommon: 160,  // green - gamer
      rare: 240,      // blue - streamer
      legendary: 85,  // gold - benchmarker
    };
    return {
      id,
      label: meta.label.toUpperCase(),
      hue: hueMap[meta.rarity] ?? 200,
    };
  });

  function getDefaultSelection(): PackageKey[] {
    return Object.entries(app.software)
      .filter(([, pkg]) => pkg.selected)
      .map(([key]) => key)
      .filter((key): key is PackageKey => isPackageKey(app.software, key));
  }

  /** Select a profile and scroll to the quick-start section */
  function selectAndScroll(presetId: PresetType) {
    const config = PRESETS[presetId];

    // Apply preset (mirrors PresetSection.handlePresetSelect)
    setActivePreset(presetId);
    setSelection(getDefaultSelection());
    setRecommendedPackages(config.software);
    setFilter(FILTER_RECOMMENDED);
    setOptimizations(config.opts);

    // Scroll to quick-start section
    document.getElementById('quick-start')?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<header class="hero-fold">
  <!-- Grid Layout: 'title card' / 'cta cta' -->
  <div class="hero-content">
    <!-- Title Area -->
    <div class="hero-title">
      <h1 class="hero-logo">ROCKTUNE</h1>

      <div class="hero-headline">
        <p class="headline-main">UNLOCK YOUR RIG</p>
      </div>

      <div class="hero-tagline">
        <p class="tagline-primary">Download more FPS.</p>
        <p class="tagline-secondary">Yes, really.</p>
      </div>
    </div>

    <!-- Stats Panel -->
    <aside class="hero-card">
      <div class="stats-panel">
        <!-- Corner accents -->
        <div class="panel-corner panel-corner--tl"></div>
        <div class="panel-corner panel-corner--br"></div>

        <header class="panel-header">
          <span class="panel-title">WHAT YOU GET</span>
        </header>

        <div class="stats-list">
          <div class="stat-line">
            <span class="stat-label">Network lag</span>
            <span class="stat-dots"></span>
            <span class="stat-value">FIXED</span>
          </div>
          <div class="stat-line">
            <span class="stat-label">Background noise</span>
            <span class="stat-dots"></span>
            <span class="stat-value">GONE</span>
          </div>
          <div class="stat-line">
            <span class="stat-label">Windows tracking</span>
            <span class="stat-dots"></span>
            <span class="stat-value">BLOCKED</span>
          </div>

          <div class="stat-divider"></div>

          <div class="stat-line stat-line--highlight">
            <span class="stat-label">Micro-stutters</span>
            <span class="stat-dots"></span>
            <span class="stat-value stat-value--accent">GONE</span>
          </div>
          <div class="stat-line stat-line--highlight">
            <span class="stat-label">Frame times</span>
            <span class="stat-dots"></span>
            <span class="stat-value stat-value--accent">SMOOTHER</span>
          </div>
          <div class="stat-line stat-line--highlight">
            <span class="stat-label">Input delay</span>
            <span class="stat-dots"></span>
            <span class="stat-value stat-value--accent">FASTER</span>
          </div>
        </div>

        <footer class="panel-footer">
          <p class="trust-line">
            Free ·
            <a
              href="https://github.com/thepedroferrari/rocktune"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open source
            </a>
            · Reversible
          </p>
        </footer>
      </div>
    </aside>

    <!-- CTA Area (full width) -->
    <div class="hero-cta">
      <p class="profile-prompt">WHO ARE YOU?</p>
      <div class="profile-badges">
        {#each PROFILE_BADGES as badge}
          <button
            type="button"
            class="profile-badge"
            style="--badge-hue: {badge.hue}"
            onclick={() => selectAndScroll(badge.id)}
          >
            {badge.label}
          </button>
        {/each}
      </div>
    </div>
  </div>

  <!-- Scroll Affordance -->
  <a href="#quick-start" class="scroll-indicator">
    <span class="scroll-text">CUSTOMIZE YOUR BUILD</span>
    <svg
      class="scroll-chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
    >
      <polyline points="6 6 12 12 18 6" />
      <polyline points="6 12 12 18 18 12" />
    </svg>
  </a>
</header>

<style>
  /* ============================================================
     TOKENS
     ============================================================ */
  .hero-fold {
    --fold-bg: oklch(0.13 0.02 285);
    --fold-ink: oklch(0.96 0.01 285);
    --fold-ink-muted: oklch(0.55 0.02 285);
    --fold-accent: oklch(0.92 0.19 102);
    --fold-accent-dim: oklch(0.75 0.16 102);
    --fold-accent-glow: oklch(0.85 0.2 102 / 50%);
    --fold-cyan: oklch(0.85 0.18 195);
    --fold-cyan-glow: oklch(0.7 0.2 195 / 60%);
    --fold-magenta: oklch(0.72 0.25 330);
    --fold-magenta-glow: oklch(0.6 0.28 330 / 60%);
    --fold-safe: oklch(0.75 0.15 175);
    --fold-safe-glow: oklch(0.7 0.15 175 / 40%);
    --fold-border: oklch(0.28 0.02 285);
    --fold-glass: oklch(0.14 0.02 285 / 0.8);

    /* ROG-style aggressive clip-path */
    --clip-rog: polygon(
      0 0,
      calc(100% - 20px) 0,
      100% 20px,
      100% 100%,
      20px 100%,
      0 calc(100% - 20px)
    );

    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    padding: var(--space-xl) var(--space-md) var(--space-lg);
    background: var(--fold-bg);
    isolation: isolate;
    overflow: hidden;
  }

  /* Grid background */
  .hero-fold::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: linear-gradient(
        oklch(0.25 0.02 285 / 0.15) 1px,
        transparent 1px
      ),
      linear-gradient(90deg, oklch(0.25 0.02 285 / 0.15) 1px, transparent 1px);
    background-size: 60px 60px;
    z-index: -2;
    pointer-events: none;
  }

  /* Scanning line effect */
  .hero-fold::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      transparent 0%,
      oklch(0.85 0.18 195 / 0.03) 50%,
      transparent 100%
    );
    background-size: 100% 200%;
    animation: scanLine 8s linear infinite;
    z-index: -1;
    pointer-events: none;
  }

  @keyframes scanLine {
    0% {
      background-position: 0% 0%;
    }
    100% {
      background-position: 0% 200%;
    }
  }

  /* ============================================================
     LAYOUT - Grid Areas: 'title card' / 'cta cta'
     ============================================================ */
  .hero-content {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-areas:
      'title'
      'card'
      'cta';
    gap: var(--space-xl);
    max-width: 1200px;
    margin: 0 auto;
    flex: 1;
    align-content: center;
  }

  @media (min-width: 900px) {
    .hero-content {
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        'title card'
        'cta   cta';
      align-items: end;
      gap: var(--space-xl) var(--space-2xl);
    }
  }

  /* ============================================================
     TITLE AREA
     ============================================================ */
  .hero-title {
    grid-area: title;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .hero-logo {
    font-family: var(--font-logo);
    font-size: clamp(3rem, 8vw, 5rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    color: var(--fold-accent);
    margin: 0;
    line-height: 1;
    text-shadow:
      0 0 30px var(--fold-accent-glow),
      0 0 60px oklch(0.85 0.2 102 / 30%);
    animation: logoEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
  }

  .hero-headline {
    margin-top: var(--space-sm);
  }

  .headline-main {
    font-family: var(--font-hero);
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800;
    color: var(--fold-ink);
    margin: 0;
    line-height: 1.1;
    letter-spacing: 0.02em;
    animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
  }

  .hero-tagline {
    margin-top: var(--space-xs);
  }

  .tagline-primary {
    font-family: var(--font-mono);
    font-size: clamp(1.1rem, 2vw, 1.4rem);
    color: var(--fold-cyan);
    margin: 0;
    text-shadow: 0 0 15px var(--fold-cyan-glow);
    animation: fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.45s both;
  }

  .tagline-secondary {
    font-family: var(--font-mono);
    font-size: clamp(0.9rem, 1.5vw, 1.1rem);
    color: var(--fold-ink-muted);
    margin: var(--space-2xs) 0 0;
    animation: fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both;
  }

  /* ============================================================
     CTA AREA (Full Width)
     ============================================================ */
  .hero-cta {
    grid-area: cta;
    text-align: center;
    padding-top: var(--space-lg);
    border-top: 1px solid var(--fold-border);
    animation: fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.65s both;
  }

  .profile-prompt {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: oklch(0.75 0.02 285);
    text-shadow:
      0 0 30px oklch(0.95 0.01 285 / 0.6),
      0 0 60px oklch(0.95 0.01 285 / 0.3);
    margin: 0 0 var(--space-md);
    text-transform: uppercase;
  }

  .profile-badges {
    display: flex;
    gap: var(--space-md);
    flex-wrap: wrap;
    justify-content: center;
  }

  .profile-badge {
    padding: var(--space-md) var(--space-lg);
    background: oklch(0.15 0.02 var(--badge-hue) / 0.3);
    border: 1px solid oklch(0.4 0.04 var(--badge-hue));
    color: oklch(0.75 0.08 var(--badge-hue));
    font-family: var(--font-display);
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    clip-path: var(--clip-cyber-xs);
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      box-shadow 0.15s ease,
      transform 0.15s ease,
      border-color 0.15s ease;
  }

  .profile-badge:hover {
    background: oklch(0.18 0.04 var(--badge-hue) / 0.4);
    border-color: oklch(0.5 0.08 var(--badge-hue));
    box-shadow: 0 4px 20px oklch(0 0 0 / 0.3);
    transform: translateY(-3px);
  }

  .profile-badge:active {
    transform: translateY(0) scale(1);
  }

  /* ============================================================
     TRUST LINE
     ============================================================ */
  .trust-line {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--fold-ink-muted);
    margin: var(--space-sm) 0 0;
    animation: fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.8s both;
  }

  .trust-line a {
    color: var(--fold-cyan);
    text-decoration: none;
    transition:
      color 0.15s ease,
      text-shadow 0.15s ease;
  }

  .trust-line a:hover {
    color: var(--fold-accent);
    text-shadow: 0 0 10px var(--fold-accent-glow);
  }

  /* ============================================================
     STATS PANEL (Card Area)
     ============================================================ */
  .hero-card {
    grid-area: card;
    animation: panelSlideIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
  }

  .stats-panel {
    position: relative;
    background: oklch(0.11 0.02 285 / 0.9);
    backdrop-filter: blur(12px);
    border: none;
    clip-path: var(--clip-rog);
    box-shadow:
      0 4px 30px oklch(0 0 0 / 0.4),
      0 0 60px oklch(0 0 0 / 0.2);
  }

  /* Corner accent decorations */
  .panel-corner {
    position: absolute;
    width: 40px;
    height: 40px;
    pointer-events: none;
    z-index: 1;
  }

  .panel-corner--tl {
    top: 8px;
    left: 8px;
    border-top: 2px solid var(--fold-accent);
    border-left: 2px solid var(--fold-accent);
    opacity: 0.6;
  }

  .panel-corner--br {
    bottom: 8px;
    right: 8px;
    border-bottom: 2px solid var(--fold-accent);
    border-right: 2px solid var(--fold-accent);
    opacity: 0.6;
  }

  .panel-header {
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--fold-border);
    background: oklch(0.1 0.02 285 / 0.5);
  }

  .panel-title {
    font-family: var(--font-display);
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: var(--fold-accent);
    text-transform: uppercase;
    text-shadow: 0 0 10px var(--fold-accent-glow);
  }

  .panel-footer {
    padding: var(--space-md) var(--space-lg);
    border-top: 1px solid var(--fold-border);
    background: oklch(0.1 0.02 285 / 0.3);
  }

  .panel-footer .trust-line {
    margin: 0;
    text-align: center;
    animation: none;
  }

  .stats-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: var(--space-lg);
  }

  .stat-line {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-family: var(--font-mono);
    font-size: 0.9rem;
  }

  .stat-label {
    color: var(--fold-ink);
    flex-shrink: 0;
  }

  .stat-dots {
    flex: 1;
    height: 1px;
    background: repeating-linear-gradient(
      90deg,
      var(--fold-ink-muted) 0px,
      var(--fold-ink-muted) 2px,
      transparent 2px,
      transparent 8px
    );
    min-width: 20px;
    opacity: 0.4;
  }

  .stat-value {
    color: var(--fold-safe);
    font-weight: 700;
    font-size: 0.85rem;
    letter-spacing: 0.08em;
    text-shadow: 0 0 8px var(--fold-safe-glow);
  }

  .stat-divider {
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--fold-border) 20%,
      var(--fold-border) 80%,
      transparent
    );
    margin: var(--space-xs) 0;
  }

  .stat-value--accent {
    color: var(--fold-accent);
    text-shadow: 0 0 12px var(--fold-accent-glow);
  }

  /* Staggered stat animations */
  .stat-line:nth-child(1) {
    animation: fadeSlideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.6s both;
  }
  .stat-line:nth-child(2) {
    animation: fadeSlideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.65s both;
  }
  .stat-line:nth-child(3) {
    animation: fadeSlideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.7s both;
  }
  .stat-divider {
    animation: fadeSlideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.75s both;
  }
  .stat-line:nth-child(5) {
    animation: fadeSlideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.8s both;
  }
  .stat-line:nth-child(6) {
    animation: fadeSlideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.85s both;
  }
  .stat-line:nth-child(7) {
    animation: fadeSlideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.9s both;
  }

  /* ============================================================
     SCROLL INDICATOR
     ============================================================ */
  .scroll-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    margin-top: auto;
    padding: var(--space-md);
    background: transparent;
    border: none;
    color: var(--fold-ink-muted);
    text-decoration: none;
    cursor: pointer;
    animation: fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 1.2s both;
    transition: color 0.15s ease;
  }

  .scroll-indicator:hover {
    color: var(--fold-cyan);
  }

  .scroll-text {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .scroll-chevron {
    width: 24px;
    height: 24px;
    animation: scrollBounce 2s ease-in-out infinite;
  }

  @keyframes scrollBounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(6px);
    }
  }

  /* ============================================================
     ENTRANCE ANIMATIONS
     ============================================================ */
  @keyframes logoEntrance {
    from {
      opacity: 0;
      transform: scale(0.9);
      filter: blur(10px);
    }
    to {
      opacity: 1;
      transform: scale(1);
      filter: blur(0);
    }
  }

  @keyframes fadeSlideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeSlideLeft {
    from {
      opacity: 0;
      transform: translateX(-25px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes panelSlideIn {
    from {
      opacity: 0;
      transform: translateX(50px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* ============================================================
     REDUCED MOTION
     ============================================================ */
  @media (prefers-reduced-motion: reduce) {
    .hero-fold::after,
    .scroll-chevron {
      animation: none;
    }

    .hero-logo,
    .headline-main,
    .tagline-primary,
    .tagline-secondary,
    .hero-cta,
    .trust-line,
    .hero-card,
    .stats-panel,
    .stat-line,
    .stat-divider,
    .scroll-indicator {
      animation: none;
    }

    .profile-badge:hover {
      transform: none;
    }

    .hero-logo,
    .tagline-primary,
    .profile-prompt,
    .panel-title,
    .stat-value,
    .stat-value--accent {
      text-shadow: none;
    }
  }

  /* ============================================================
     MOBILE
     ============================================================ */
  @media (max-width: 899px) {
    .hero-fold {
      min-height: auto;
      padding: var(--space-lg) var(--space-md);
    }

    .hero-content {
      align-content: start;
    }

    .profile-badges {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .profile-badge {
      text-align: center;
      justify-content: center;
    }

    .stats-panel {
      clip-path: var(--clip-cyber-sm);
    }
  }

  /* ============================================================
     HIGH CONTRAST
     ============================================================ */
  @media (prefers-contrast: more) {
    .hero-fold {
      --fold-ink: oklch(0.98 0.01 285);
      --fold-ink-muted: oklch(0.7 0.02 285);
      --fold-accent: oklch(0.95 0.22 102);
      --fold-cyan: oklch(0.9 0.2 195);
    }

    .profile-badge {
      border-width: 2px;
    }
  }
</style>
