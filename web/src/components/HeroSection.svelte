<script lang="ts">
  /**
   * HeroSection - Gaming Energy + Clarity
   *
   * ROG-style gaming energy with Node.js-level clarity.
   * Sharp angles, neon glows, one bold message, instant understanding.
   */

  import { PRESETS, PRESET_META, PRESET_ORDER } from "$lib/presets";
  import {
    app,
    setActivePreset,
    setSelection,
    setRecommendedPackages,
    setFilter,
    setOptimizations,
  } from "$lib/state.svelte";
  import {
    isPackageKey,
    type PackageKey,
    type PresetType,
    FILTER_RECOMMENDED,
  } from "$lib/types";

  /** Profile badge data - GAMER is the default/highlighted choice */
  const PROFILE_BADGES = PRESET_ORDER.map((id) => {
    const meta = PRESET_META[id];
    return {
      id,
      label: meta.label.toUpperCase(),
      rarity: meta.rarity,
      isDefault: id === "gamer",
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

    setActivePreset(presetId);
    setSelection(getDefaultSelection());
    setRecommendedPackages(config.software);
    setFilter(FILTER_RECOMMENDED);
    setOptimizations(config.opts);

    document
      .getElementById("quick-start")
      ?.scrollIntoView({ behavior: "smooth" });
  }

  /** Check if user prefers reduced motion */
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** 3D tilt effect on mouse move (Codrops-style) */
  function handleBadgeMouseMove(event: MouseEvent) {
    if (prefersReducedMotion) return;
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateY(${x * 15}deg) rotateX(${-y * 15}deg) translateY(-3px)`;
  }

  /** Reset tilt on mouse leave */
  function handleBadgeMouseLeave(event: MouseEvent) {
    if (prefersReducedMotion) return;
    const el = event.currentTarget as HTMLElement;
    el.style.transform = "";
  }
</script>

<header class="hero-fold">
  <div class="hero-content">
    <div class="hero-title">
      <h1 class="hero-logo">ROCKTUNE</h1>

      <div class="hero-headline">
        <p class="headline-main">UNLOCK YOUR RIG</p>
      </div>

      <div class="hero-tagline">
        <p class="tagline-primary">Download more FPS.</p>
        <p class="tagline-secondary">Yes, really.</p>
      </div>

      <div class="provenance-bar" role="group" aria-label="Project information">
        <a
          href="https://github.com/thepedroferrari/rocktune/tree/{__BUILD_COMMIT__}"
          target="_blank"
          rel="noopener noreferrer"
          class="proof-chip"
          title="Built from commit {__BUILD_COMMIT__} on {__BUILD_DATE__}"
        >
          <svg
            class="chip-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
            />
          </svg>
          <span class="chip-label"
            >Build: {__BUILD_COMMIT__.substring(0, 7)}</span
          >
        </a>

        <a
          href="https://github.com/thepedroferrari/rocktune/blob/master/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          class="proof-chip"
          title="MIT License - Free to use, modify, and distribute"
        >
          <svg
            class="chip-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9 4l-2 2H5v2h14V6h-2l-2-2H9zm10 4H5v12h14V8z" />
          </svg>
          <span class="chip-label">MIT License</span>
        </a>

        <a
          href="https://github.com/thepedroferrari/rocktune"
          target="_blank"
          rel="noopener noreferrer"
          class="proof-chip"
          title="Open source on GitHub - inspect the code"
        >
          <svg
            class="chip-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
            />
          </svg>
          <span class="chip-label">Open source</span>
        </a>

        <a
          href="#verification-hud"
          class="proof-chip"
          title="SHA-256 checksum available for verification"
        >
          <svg
            class="chip-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span class="chip-label">SHA-256</span>
        </a>
      </div>
    </div>

    <aside class="hero-card">
      <div class="stats-panel">
        <div class="panel-corner panel-corner--tl"></div>
        <div class="panel-corner panel-corner--br"></div>

        <header class="panel-header">
          <span class="panel-title">WHAT YOU GET</span>
        </header>

        <dl class="stats-list">
          <div class="stat-line">
            <dt class="stat-label">Network lag</dt>
            <span class="stat-dots" aria-hidden="true"></span>
            <dd class="stat-value">OPTIMIZED</dd>
          </div>
          <div class="stat-line">
            <dt class="stat-label">Background noise</dt>
            <span class="stat-dots" aria-hidden="true"></span>
            <dd class="stat-value">REDUCED</dd>
          </div>
          <div class="stat-line">
            <dt class="stat-label">Windows tracking</dt>
            <span class="stat-dots" aria-hidden="true"></span>
            <dd class="stat-value">BLOCKED</dd>
          </div>

          <div class="stat-divider" role="presentation"></div>

          <div class="stat-line stat-line--highlight">
            <dt class="stat-label">Micro-stutters</dt>
            <span class="stat-dots" aria-hidden="true"></span>
            <dd class="stat-value stat-value--accent">MINIMIZED</dd>
          </div>
          <div class="stat-line stat-line--highlight">
            <dt class="stat-label">Frame times</dt>
            <span class="stat-dots" aria-hidden="true"></span>
            <dd class="stat-value stat-value--accent">SMOOTHER</dd>
          </div>
          <div class="stat-line stat-line--highlight">
            <dt class="stat-label">Input delay</dt>
            <span class="stat-dots" aria-hidden="true"></span>
            <dd class="stat-value stat-value--accent">FASTER</dd>
          </div>
        </dl>

        <footer class="panel-footer">
          <p class="trust-line">Free · Open source · Reversible · Secure</p>
        </footer>
      </div>
    </aside>

    <div class="hero-cta">
      <p class="profile-prompt">WHO ARE YOU?</p>
      <div class="profile-badges">
        {#each PROFILE_BADGES as badge}
          <button
            type="button"
            class="profile-badge"
            class:profile-badge--default={badge.isDefault}
            data-rarity={badge.rarity}
            onclick={() => selectAndScroll(badge.id)}
            onmousemove={handleBadgeMouseMove}
            onmouseleave={handleBadgeMouseLeave}
          >
            {badge.label}
          </button>
        {/each}
      </div>
    </div>
  </div>

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

  .hero-content {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-areas:
      "title"
      "card"
      "cta";
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
        "title card"
        "cta   cta";
      align-items: end;
      gap: var(--space-xl) var(--space-2xl);
    }
  }

  .hero-title {
    grid-area: title;
    display: flex;
    flex-direction: column;
    align-self: center;
  }

  .hero-logo {
    font-family: var(--font-logo);
    font-size: clamp(3rem, 8vw, 5rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    line-height: 1;
    color: var(--fold-accent);
    margin-left: -2px;
    text-shadow:
      0 0 30px var(--fold-accent-glow),
      0 0 60px oklch(0.85 0.2 102 / 30%);
    animation: logoEntrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
  }

  .hero-headline {
    margin-top: -0.75em;
  }

  .headline-main {
    font-family: var(--font-hero);
    font-size: clamp(2rem, 5vw, 3.5rem);
    font-weight: 800;
    color: var(--fold-ink);
    line-height: 1.1;
    letter-spacing: 0.02em;
    animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both;
  }

  .hero-tagline {
    margin-top: var(--space-lg);
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

  .provenance-bar {
    display: flex;
    gap: var(--space-xs);
    margin-top: var(--space-md);
    flex-wrap: wrap;
    justify-content: center;
    animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.65s both;
  }

  .proof-chip {
    --chip-bg: oklch(0.15 0.02 285 / 0.4);
    --chip-border: oklch(0.35 0.04 285);
    --chip-text: oklch(0.7 0.04 285);
    --chip-glow: oklch(0.55 0.1 195 / 0);

    display: inline-flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-xs) var(--space-sm);
    background: var(--chip-bg);
    border: 1px solid var(--chip-border);
    color: var(--chip-text);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 500;
    text-decoration: none;
    letter-spacing: 0.02em;
    border-radius: 4px;
    clip-path: polygon(
      0 0,
      calc(100% - 6px) 0,
      100% 6px,
      100% 100%,
      6px 100%,
      0 calc(100% - 6px)
    );
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    cursor: pointer;
  }

  .chip-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    opacity: 0.7;
    transition: opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .chip-label {
    line-height: 1;
  }

  .proof-chip:where(a):hover,
  .proof-chip:where(a):focus-visible {
    --chip-bg: oklch(0.18 0.04 195 / 0.5);
    --chip-border: oklch(0.55 0.12 195);
    --chip-text: oklch(0.85 0.08 195);
    --chip-glow: oklch(0.7 0.2 195 / 0.4);

    box-shadow:
      0 0 20px var(--chip-glow),
      0 4px 12px oklch(0 0 0 / 0.3);
    transform: translateY(-2px) scale(1.02);
  }

  .proof-chip:where(a):hover .chip-icon,
  .proof-chip:where(a):focus-visible .chip-icon {
    opacity: 1;
  }

  .proof-chip:where(a):active {
    transform: translateY(0) scale(1);
    transition-duration: 0.1s;
  }

  /* Keyboard focus ring (accessibility) */
  .proof-chip:focus-visible {
    outline: 2px solid var(--fold-cyan);
    outline-offset: 2px;
  }

  .hero-cta {
    grid-area: cta;
    text-align: center;
    padding-top: var(--space-2xl);
    margin-top: var(--space-lg);
    border-top: 1px solid var(--fold-border);
    animation: fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.65s both;
  }

  .profile-prompt {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    color: oklch(0.65 0.01 285);
    text-shadow: 0 1px 0 oklch(0.2 0 285);
    margin: 0 0 var(--space-md);
    text-transform: uppercase;
  }

  .profile-badges {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
    justify-content: center;
  }

  .profile-badge {
    /* Rarity color variables - matched to card colors */
    --rarity-color: oklch(0.55 0.03 102);
    --rarity-glow: oklch(0.55 0.03 102 / 0.4);

    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) var(--space-sm);
    background: none;
    border: none;
    color: var(--rarity-color);
    font-family: var(--font-display);
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transform-style: preserve-3d;
    will-change: transform;
    transition:
      color 0.15s ease,
      text-shadow 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
      transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* Rarity-specific colors - high saturation for neon punch */
  .profile-badge[data-rarity="legendary"] {
    --rarity-color: oklch(0.82 0.18 85);
    --rarity-glow: oklch(0.85 0.2 85 / 0.6);
  }

  .profile-badge[data-rarity="epic"] {
    --rarity-color: oklch(0.72 0.24 300);
    --rarity-glow: oklch(0.75 0.26 300 / 0.6);
  }

  .profile-badge[data-rarity="rare"] {
    --rarity-color: oklch(0.8 0.18 220);
    --rarity-glow: oklch(0.82 0.2 220 / 0.6);
  }

  .profile-badge[data-rarity="uncommon"] {
    --rarity-color: oklch(0.78 0.2 155);
    --rarity-glow: oklch(0.8 0.22 155 / 0.6);
  }

  .profile-badge:not(:first-child)::before {
    content: "";
    width: 1px;
    height: 1em;
    margin-right: var(--space-xs);
    background: linear-gradient(
      180deg,
      transparent 0%,
      oklch(0.4 0.02 285 / 0.5) 20%,
      oklch(0.5 0.02 285 / 0.6) 50%,
      oklch(0.4 0.02 285 / 0.5) 80%,
      transparent 100%
    );
    box-shadow: 0 0 4px oklch(0.5 0.02 285 / 0.2);
  }

  .profile-badge:hover {
    text-shadow: 0 0 20px var(--rarity-glow);
    filter: brightness(1.2);
  }

  /* Default badge gets enhanced glow */
  .profile-badge--default {
    text-shadow:
      0 0 20px var(--rarity-glow),
      0 0 40px var(--rarity-glow);
    filter: brightness(1.15);
  }

  .profile-badge--default:hover {
    filter: brightness(1.3);
  }

  .profile-badge:active {
    transform: perspective(800px) translateY(0) scale(0.98) !important;
  }

  .trust-line {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--fold-ink-muted);
    margin: var(--space-sm) 0 0;
    animation: fadeSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.8s both;
  }

  .hero-card {
    grid-area: card;
    animation: panelSlideIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both;
  }

  .stats-panel {
    position: relative;
    background: linear-gradient(
      135deg,
      oklch(0.13 0.03 285 / 0.95) 0%,
      oklch(0.11 0.02 200 / 0.9) 50%,
      oklch(0.12 0.025 260 / 0.92) 100%
    );
    background-size: 200% 200%;
    animation: holoShimmer 12s ease-in-out infinite;
    backdrop-filter: blur(12px);
    border: none;
    clip-path: var(--clip-rog);
    box-shadow:
      0 4px 30px oklch(0 0 0 / 0.4),
      0 0 60px oklch(0 0 0 / 0.2),
      inset 0 1px 0 oklch(0.85 0.18 195 / 0.1);
  }

  @keyframes holoShimmer {
    0%,
    100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

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

  @media (max-width: 899px) {
    .hero-fold {
      min-height: auto;
      padding: var(--space-lg) var(--space-md);
    }

    .hero-content {
      align-content: start;
    }

    /* Loosen lockup on mobile to prevent overlap */
    .hero-headline {
      margin-top: -0.35em;
    }

    .profile-badges {
      display: flex;
      flex-wrap: wrap;
    }

    .profile-badge {
      font-size: 1rem;
    }

    .stats-panel {
      clip-path: var(--clip-cyber-sm);
    }

    .provenance-bar {
      gap: var(--space-2xs);
      margin-top: var(--space-sm);
    }

    .proof-chip {
      font-size: 0.7rem;
      padding: var(--space-2xs) var(--space-xs);
    }

    .chip-icon {
      width: 12px;
      height: 12px;
    }
  }

  @media (prefers-contrast: more) {
    .hero-fold {
      --fold-ink: oklch(0.98 0.01 285);
      --fold-ink-muted: oklch(0.7 0.02 285);
      --fold-accent: oklch(0.95 0.22 102);
      --fold-cyan: oklch(0.9 0.2 195);
    }

    /* Increase rarity color brightness for high contrast */
    .profile-badge[data-rarity="legendary"] {
      --rarity-color: oklch(0.85 0.16 85);
    }

    .profile-badge[data-rarity="epic"] {
      --rarity-color: oklch(0.78 0.2 300);
    }

    .profile-badge[data-rarity="rare"] {
      --rarity-color: oklch(0.85 0.16 220);
    }

    .profile-badge[data-rarity="uncommon"] {
      --rarity-color: oklch(0.8 0.16 160);
    }

    .profile-badge--default {
      filter: brightness(1.25);
    }
  }
</style>
