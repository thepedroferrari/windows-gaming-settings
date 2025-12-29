<script lang="ts">
  /**
   * PresetCard - Holographic battle profile card
   *
   * Features:
   * - Spring physics for smooth 3D tilt effect
   * - Holographic shine/glare layers
   * - Rarity-based color schemes
   * - Intensity bar for risk visualization
   */

  import {
    adjust,
    clamp,
    round,
    Spring,
    SPRING_PRESETS,
  } from "../utils/spring";
  import type { PresetType } from "$lib/types";

  interface Props {
    preset: PresetType;
    label: string;
    subtitle?: string;
    description?: string;
    rarity?: "legendary" | "epic" | "rare" | "uncommon" | "common";
    intensity?: number;
    riskLevel?: "low" | "medium" | "high";
    overheadLabel?: string;
    latencyLabel?: string;
    traits?: readonly string[];
    softwareCount: number;
    optimizationCount?: number;
    active?: boolean;
    onSelect: (preset: PresetType) => void;
  }

  let {
    preset,
    label,
    subtitle = "",
    description = "",
    rarity = "common",
    intensity = 50,
    riskLevel = "low",
    overheadLabel = "",
    latencyLabel = "",
    traits = [],
    softwareCount,
    optimizationCount = 0,
    active = false,
    onSelect,
  }: Props = $props();

  // Risk label text
  const riskLabels = {
    low: "Low",
    medium: "Medium",
    high: "High",
  } as const;
  let riskText = $derived(
    riskLevel === "low"
      ? preset === "gamer" || preset === "streamer"
        ? "Safe"
        : preset === "pro_gamer"
        ? "Low risk"
        : riskLabels[riskLevel]
      : riskLabels[riskLevel],
  );

  // Spring physics state
  let rotator: HTMLElement | undefined = $state();
  let springRotate = new Spring({ x: 0, y: 0 }, SPRING_PRESETS.INTERACTIVE);
  let springGlare = new Spring(
    { x: 50, y: 50, o: 0 },
    SPRING_PRESETS.INTERACTIVE,
  );
  let springBackground = new Spring(
    { x: 50, y: 50 },
    SPRING_PRESETS.INTERACTIVE,
  );

  let interacting = $state(false);
  let animationId: number | null = null;

  // CSS custom properties for rendering
  let pointerX = $state("50%");
  let pointerY = $state("50%");
  let pointerFromCenter = $state("0");
  let pointerFromTop = $state("0.5");
  let pointerFromLeft = $state("0.5");
  let cardOpacity = $state("0");
  let rotateX = $state("0deg");
  let rotateY = $state("0deg");
  let backgroundX = $state("50%");
  let backgroundY = $state("50%");
  let transform = $state("");

  function applyStyles() {
    const glareX = springGlare.current.x;
    const glareY = springGlare.current.y;
    const glareO = springGlare.current.o ?? 0;

    const pfc = clamp(
      Math.sqrt((glareY - 50) ** 2 + (glareX - 50) ** 2) / 50,
      0,
      1,
    );
    const pft = glareY / 100;
    const pfl = glareX / 100;

    pointerX = `${round(glareX)}%`;
    pointerY = `${round(glareY)}%`;
    pointerFromCenter = round(pfc).toString();
    pointerFromTop = round(pft).toString();
    pointerFromLeft = round(pfl).toString();
    cardOpacity = round(glareO).toString();
    rotateX = `${round(springRotate.current.x)}deg`;
    rotateY = `${round(springRotate.current.y)}deg`;
    backgroundX = `${round(springBackground.current.x)}%`;
    backgroundY = `${round(springBackground.current.y)}%`;

    transform = `rotateY(${round(springRotate.current.x)}deg) rotateX(${
      round(springRotate.current.y)
    }deg)`;
  }

  function animate() {
    springRotate.update();
    springGlare.update();
    springBackground.update();
    applyStyles();

    const settled = springRotate.isSettled() && springGlare.isSettled() &&
      springBackground.isSettled();

    if (!settled || interacting) {
      animationId = requestAnimationFrame(animate);
    } else {
      animationId = null;
    }
  }

  function startAnimation() {
    if (animationId === null) {
      animationId = requestAnimationFrame(animate);
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (!rotator) return;
    const rect = rotator.getBoundingClientRect();

    const absolute = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const percent = {
      x: clamp(round((100 / rect.width) * absolute.x)),
      y: clamp(round((100 / rect.height) * absolute.y)),
    };

    const center = {
      x: percent.x - 50,
      y: percent.y - 50,
    };

    springBackground.set({
      x: adjust(percent.x, 0, 100, 37, 63),
      y: adjust(percent.y, 0, 100, 33, 67),
    });

    springRotate.set({
      x: round(center.x / 3.5),
      y: round(-(center.y / 3.5)),
    });

    springGlare.set({
      x: round(percent.x),
      y: round(percent.y),
      o: 1,
    });

    startAnimation();
  }

  function handlePointerEnter() {
    interacting = true;
    const { stiffness, damping } = SPRING_PRESETS.INTERACTIVE;
    springRotate.stiffness = stiffness;
    springRotate.damping = damping;
    springGlare.stiffness = stiffness;
    springGlare.damping = damping;
    springBackground.stiffness = stiffness;
    springBackground.damping = damping;
    startAnimation();
  }

  function handlePointerLeave() {
    interacting = false;
    const { stiffness, damping } = SPRING_PRESETS.GENTLE;

    springRotate.stiffness = stiffness;
    springRotate.damping = damping;
    springRotate.set({ x: 0, y: 0 });

    springGlare.stiffness = stiffness;
    springGlare.damping = damping;
    springGlare.set({ x: 50, y: 50, o: 0 });

    springBackground.stiffness = stiffness;
    springBackground.damping = damping;
    springBackground.set({ x: 50, y: 50 });

    startAnimation();
  }

  function handleClick() {
    onSelect(preset);
  }

  // Cleanup animation on unmount
  $effect(() => {
    return () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
    };
  });
</script>

<button
  type="button"
  class="preset-card"
  class:active
  class:interacting
  data-preset={preset}
  data-rarity={rarity}
  style:--pointer-x={pointerX}
  style:--pointer-y={pointerY}
  style:--pointer-from-center={pointerFromCenter}
  style:--pointer-from-top={pointerFromTop}
  style:--pointer-from-left={pointerFromLeft}
  style:--card-opacity={cardOpacity}
  style:--rotate-x={rotateX}
  style:--rotate-y={rotateY}
  style:--background-x={backgroundX}
  style:--background-y={backgroundY}
  onclick={handleClick}
>
  <div
    bind:this={rotator}
    class="preset-card__rotator"
    style:transform
    onpointermove={handlePointerMove}
    onpointerenter={handlePointerEnter}
    onpointerleave={handlePointerLeave}
  >
    <div class="preset-card__front">
      <div class="preset-card__header">
        <h3 class="preset-card__title">{label}</h3>
      </div>

      <div class="preset-card__body">
        {#if subtitle}
          <div class="preset-card__subtitle">
            <span class="subtitle-label">Mode</span>
            <span class="subtitle-value">{subtitle}</span>
          </div>
        {/if}

        {#if description}
          <p class="preset-card__desc">{description}</p>
        {/if}

        {#if traits.length}
          <div class="preset-card__traits">
            <span class="traits-label">Guardrails</span>
            <ul class="traits-list">
              {#each traits as trait (trait)}
                <li>{trait}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>

      <!-- Decorative intensity bar -->
      <div class="preset-card__bar">
        <div class="bar-fill" style:--fill={`${intensity}%`}></div>
      </div>

      <!-- Stats (label left, value right) -->
      <div class="preset-card__stats">
        {#if overheadLabel}
          <div class="stat-row">
            <span class="stat-label">Overhead</span>
            <span class="stat-value">{overheadLabel}</span>
          </div>
        {/if}
        {#if latencyLabel}
          <div class="stat-row">
            <span class="stat-label">Latency</span>
            <span class="stat-value">{latencyLabel}</span>
          </div>
        {/if}
        <div class="stat-row">
          <span class="stat-label">Optimizations</span>
          <span class="stat-value">{optimizationCount}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Software</span>
          <span class="stat-value">{softwareCount}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Risk</span>
          <span class="stat-value stat-value--risk-{riskLevel}">{
            riskText
          }</span>
        </div>
      </div>
    </div>

    <!-- Holographic layers -->
    <div class="preset-card__shine"></div>
    <div class="preset-card__glare"></div>
  </div>
</button>

<style>
  /* CSS Variables */
  .preset-card {
    --pointer-x: 50%;
    --pointer-y: 50%;
    --pointer-from-center: 0;
    --pointer-from-top: 0.5;
    --pointer-from-left: 0.5;
    --card-opacity: 0;
    --rotate-x: 0deg;
    --rotate-y: 0deg;
    --background-x: 50%;
    --background-y: 50%;
    --card-scale: 1;

    /* Default rarity colors */
    --card-glow: hsl(175, 100%, 90%);
    --card-edge: hsl(47, 100%, 78%);

    /* Sunpillar rainbow */
    --sunpillar-1: hsl(2, 100%, 73%);
    --sunpillar-2: hsl(53, 100%, 69%);
    --sunpillar-3: hsl(93, 100%, 69%);
    --sunpillar-4: hsl(176, 100%, 76%);
    --sunpillar-5: hsl(228, 100%, 74%);
    --sunpillar-6: hsl(283, 100%, 73%);

    --card-aspect: 2.5 / 3.5;
    --card-radius: 5% / 3.5%;
  }

  /* Card base */
  .preset-card {
    all: unset;
    display: block;
    width: 100%;
    aspect-ratio: var(--card-aspect);
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    contain: layout style;
    transform: translate3d(0, 0, 0.01px);
    will-change: transform;
    transform-style: preserve-3d;
    z-index: calc(var(--card-scale) * 2);
  }

  .preset-card.interacting {
    z-index: calc(var(--card-scale) * 120);
  }

  .preset-card.active {
    z-index: calc(var(--card-scale) * 100);
    transform: translate3d(0, 0, 0.01px) scale(1.03);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    --card-opacity: 0.6;
  }

  /* Rotator */
  .preset-card__rotator {
    width: 100%;
    height: 100%;
    display: grid;
    perspective: 600px;
    transform-origin: center;
    transform-style: preserve-3d;
    will-change: transform, box-shadow;
    border-radius: var(--card-radius);
    aspect-ratio: var(--card-aspect);
    pointer-events: auto;
    touch-action: none;
    transform: rotateY(var(--rotate-x)) rotateX(var(--rotate-y));
    transition: box-shadow 0.4s ease, opacity 0.33s ease-out;
    box-shadow:
      0 0 3px -1px transparent,
      0 0 2px 1px transparent,
      0 0 5px 0px transparent,
      0px 10px 20px -5px black,
      0 2px 15px -5px black,
      0 0 20px 0px transparent;
  }

  .preset-card__rotator > * {
    width: 100%;
    display: grid;
    grid-area: 1 / 1;
    aspect-ratio: var(--card-aspect);
    border-radius: var(--card-radius);
    transform-style: preserve-3d;
    pointer-events: none;
    overflow: hidden;
  }

  .preset-card:hover .preset-card__rotator,
  .preset-card:focus-visible .preset-card__rotator,
  .preset-card.active .preset-card__rotator {
    box-shadow:
      0 0 3px -1px white,
      0 0 3px 1px var(--card-edge),
      0 0 12px 2px var(--card-glow),
      0px 10px 20px -5px black,
      0 0 40px -30px var(--card-glow),
      0 0 50px -20px var(--card-glow);
  }

  .preset-card.active .preset-card__rotator {
    box-shadow:
      0 0 4px 0px white,
      0 0 4px 2px var(--card-edge),
      0 0 16px 4px var(--card-glow),
      0px 10px 20px -5px black,
      0 0 50px -20px var(--card-glow),
      0 0 60px -10px var(--card-glow),
      0 0 120px 30px color-mix(in oklch, var(--card-glow) 20%, transparent);
    animation: card-pulse 2.5s ease-in-out infinite;
  }

  @keyframes card-pulse {
    0%, 100% {
      box-shadow:
        0 0 4px 0px white,
        0 0 4px 2px var(--card-edge),
        0 0 16px 4px var(--card-glow),
        0px 10px 20px -5px black,
        0 0 50px -20px var(--card-glow),
        0 0 60px -10px var(--card-glow),
        0 0 120px 30px color-mix(in oklch, var(--card-glow) 20%, transparent);
    }
    50% {
      box-shadow:
        0 0 6px 1px white,
        0 0 6px 3px var(--card-edge),
        0 0 20px 6px var(--card-glow),
        0px 12px 24px -4px black,
        0 0 60px -15px var(--card-glow),
        0 0 70px -5px var(--card-glow),
        0 0 140px 40px color-mix(in oklch, var(--card-glow) 25%, transparent);
    }
  }

  /* Front face */
  .preset-card__front {
    position: relative;
    background-color: #040712;
    background-image:
      url("/textures/card-texture.png"),
      radial-gradient(
      ellipse 100% 80% at 50% -20%,
      oklch(1 0 0 / 0.12),
      transparent 50%
    ),
      linear-gradient(
      180deg,
      oklch(1 0 0 / 0.04) 0%,
      oklch(0 0 0 / 0.4) 100%
    );
    border: 2px solid oklch(1 0 0 / 0.15);
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    padding: 0.6rem 0.5rem;
    gap: 0.45rem;
    transform: translate3d(0, 0, 0.01px);
    backface-visibility: hidden;
    isolation: isolate;
  }

  /* Shine layer */
  .preset-card__shine {
    position: absolute;
    inset: 0;
    z-index: 10;
    pointer-events: none;
    border-radius: inherit;
    overflow: hidden;
    background-image: linear-gradient(
      115deg,
      transparent 10%,
      var(--sunpillar-1) 28%,
      var(--sunpillar-2) 38%,
      var(--sunpillar-3) 48%,
      var(--sunpillar-4) 58%,
      var(--sunpillar-5) 68%,
      var(--sunpillar-6) 78%,
      transparent 90%
    );
    background-size: 200% 200%;
    background-position: calc(50% + (var(--pointer-from-left) - 0.5) * 100%)
      calc(50% + (var(--pointer-from-top) - 0.5) * 100%);
    filter: brightness(calc(var(--pointer-from-center) * 0.15 + 0.45)) contrast(
      1.2
    ) saturate(0.7);
    mix-blend-mode: color-dodge;
    opacity: calc(var(--card-opacity) * 0.5);
    will-change: transform, opacity, background-position, filter;
  }

  /* Glare layer */
  .preset-card__glare {
    position: absolute;
    inset: 0;
    z-index: 11;
    pointer-events: none;
    border-radius: inherit;
    overflow: hidden;
    background-image: radial-gradient(
      farthest-corner circle at var(--pointer-x) var(--pointer-y),
      oklch(1 0 0 / 0.8) 10%,
      oklch(1 0 0 / 0.65) 20%,
      oklch(0 0 0 / 0.5) 90%
    );
    mix-blend-mode: overlay;
    opacity: var(--card-opacity);
    will-change: transform, opacity, background-image;
  }

  /* Content elements */
  .preset-card__header {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.7rem 0.5rem 0.1rem;
    z-index: 2;
    position: relative;
  }

  .preset-card__body {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    padding: 0 0.4rem;
    min-height: 0;
  }

  .preset-card__title {
    font-family: var(--font-display);
    font-size: clamp(0.95rem, 1.7vw, 1.35rem);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--card-glow);
    text-shadow:
      0 0 14px color-mix(in oklch, var(--card-glow) 45%, transparent),
      0 6px 20px oklch(0 0 0 / 0.6);
    margin: 0;
    text-align: center;
    line-height: 1.05;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }

  .preset-card__subtitle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: oklch(1 0 0 / 0.55);
    font-weight: 600;
  }

  .preset-card__subtitle .subtitle-label {
    color: var(--card-glow);
    font-weight: 700;
  }

  .preset-card__subtitle .subtitle-value {
    color: oklch(1 0 0 / 0.7);
  }

  .preset-card__desc {
    font-size: 0.72rem;
    font-weight: 500;
    line-height: 1.5;
    color: oklch(1 0 0 / 0.86);
    text-align: left;
    padding: 0.45rem 0.5rem;
    margin: 0;
    background: oklch(0 0 0 / 0.35);
    border-radius: 4px;
    border: 1px solid oklch(1 0 0 / 0.08);
    z-index: 2;
    position: relative;
    text-wrap: pretty;
  }

  .preset-card__traits {
    display: grid;
    gap: 0.35rem;
    padding: 0.45rem 0.5rem 0.4rem;
    background: oklch(0 0 0 / 0.25);
    border-radius: 4px;
    border: 1px solid oklch(1 0 0 / 0.06);
  }

  .traits-label {
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--card-glow);
    font-weight: 700;
  }

  .traits-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.25rem;
  }

  .traits-list li {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.6rem;
    color: oklch(1 0 0 / 0.78);
    letter-spacing: 0.02em;
  }

  .traits-list li::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 2px;
    background: linear-gradient(135deg, var(--card-glow) 0%, transparent 100%);
    box-shadow: 0 0 6px color-mix(in oklch, var(--card-glow) 50%, transparent);
    flex-shrink: 0;
  }

  /* Decorative bar (cool factor only) */
  .preset-card__bar {
    height: 6px;
    background: oklch(1 0 0 / 0.1);
    border-radius: 3px;
    overflow: hidden;
    position: relative;
    z-index: 2;
    margin: 0.25rem 0;
  }

  .bar-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: var(--fill, 50%);
    background: linear-gradient(
      90deg,
      var(--safe, #4ade80) 0%,
      var(--caution, #fbbf24) 50%,
      var(--risky, #ef4444) 100%
    );
    border-radius: 3px;
    transition: width 0.3s ease;
    box-shadow: 0 0 8px color-mix(in oklch, var(--card-glow) 50%, transparent);
  }

  /* Stats (label left, value right) */
  .preset-card__stats {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.5rem;
    background: oklch(0 0 0 / 0.45);
    border-radius: 6px;
    border: 1px solid oklch(1 0 0 / 0.08);
    z-index: 2;
    position: relative;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .stat-label {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: oklch(1 0 0 / 0.6);
    font-weight: 600;
  }

  .stat-value {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--card-glow);
    font-family: "JetBrains Mono", "SF Mono", ui-monospace, monospace;
    text-shadow: 0 0 8px color-mix(in oklch, var(--card-glow) 40%, transparent);
    text-align: right;
  }

  /* Risk value colors */
  .stat-value--risk-low {
    color: #4ade80;
    text-shadow: 0 0 6px color-mix(in oklch, #4ade80 40%, transparent);
  }

  .stat-value--risk-medium {
    color: #fbbf24;
    text-shadow: 0 0 6px color-mix(in oklch, #fbbf24 40%, transparent);
  }

  .stat-value--risk-high {
    color: #ef4444;
    text-shadow: 0 0 6px color-mix(in oklch, #ef4444 40%, transparent);
  }

  /* Rarity: Legendary (Gold/Orange) */
  .preset-card[data-rarity="legendary"] {
    --card-glow: hsl(40, 100%, 65%);
    --card-edge: hsl(45, 100%, 70%);
    --sunpillar-1: hsl(25, 100%, 65%);
    --sunpillar-2: hsl(35, 100%, 65%);
    --sunpillar-3: hsl(45, 100%, 60%);
    --sunpillar-4: hsl(40, 100%, 65%);
    --sunpillar-5: hsl(30, 100%, 70%);
    --sunpillar-6: hsl(20, 100%, 65%);
  }

  .preset-card[data-rarity="legendary"] .preset-card__front {
    background-color: #0d0604;
    border-color: hsl(40, 80%, 50%);
    background-image:
      url("/textures/card-texture.png"),
      radial-gradient(
        ellipse 80% 60% at 50% -10%,
        color-mix(in oklch, var(--card-glow) 25%, transparent),
        transparent 50%
      ),
      linear-gradient(
        180deg,
        color-mix(in oklch, var(--card-glow) 18%, transparent) 0%,
        oklch(0 0 0 / 0.5) 100%
      );
  }

  .preset-card[data-rarity="legendary"] .preset-card__title {
    color: hsl(45, 100%, 88%);
    text-shadow:
      0 0 12px hsl(40, 100%, 55%),
      0 2px 10px oklch(0 0 0 / 0.6);
  }

  .preset-card[data-rarity="legendary"] .preset-card__shine {
    filter: brightness(calc(var(--pointer-from-center) * 0.35 + 0.6)) contrast(
      1.6
    ) saturate(1);
  }

  /* Rarity: Epic (Purple) */
  .preset-card[data-rarity="epic"] {
    --card-glow: hsl(280, 80%, 70%);
    --card-edge: hsl(270, 80%, 75%);
    --sunpillar-1: hsl(260, 90%, 70%);
    --sunpillar-2: hsl(280, 90%, 70%);
    --sunpillar-3: hsl(300, 90%, 70%);
    --sunpillar-4: hsl(290, 90%, 70%);
    --sunpillar-5: hsl(270, 90%, 75%);
    --sunpillar-6: hsl(250, 90%, 70%);
  }

  .preset-card[data-rarity="epic"] .preset-card__front {
    background-color: #08040d;
    border-color: hsl(280, 60%, 45%);
  }

  .preset-card[data-rarity="epic"] .preset-card__title {
    color: hsl(280, 100%, 88%);
    text-shadow:
      0 0 10px hsl(280, 80%, 60%),
      0 2px 10px oklch(0 0 0 / 0.6);
  }

  /* Rarity: Rare (Blue) */
  .preset-card[data-rarity="rare"] {
    --card-glow: hsl(210, 90%, 70%);
    --card-edge: hsl(200, 90%, 70%);
    --sunpillar-1: hsl(180, 100%, 70%);
    --sunpillar-2: hsl(195, 100%, 70%);
    --sunpillar-3: hsl(210, 100%, 75%);
    --sunpillar-4: hsl(225, 100%, 75%);
    --sunpillar-5: hsl(240, 100%, 75%);
    --sunpillar-6: hsl(260, 100%, 70%);
  }

  .preset-card[data-rarity="rare"] .preset-card__front {
    background-color: #040610;
    border-color: hsl(210, 60%, 40%);
  }

  .preset-card[data-rarity="rare"] .preset-card__title {
    color: hsl(210, 90%, 85%);
    text-shadow:
      0 0 10px hsl(210, 80%, 60%),
      0 2px 10px oklch(0 0 0 / 0.6);
  }

  /* Rarity: Uncommon (Green) */
  .preset-card[data-rarity="uncommon"] {
    --card-glow: hsl(150, 70%, 60%);
    --card-edge: hsl(140, 60%, 55%);
    --sunpillar-1: hsl(100, 80%, 60%);
    --sunpillar-2: hsl(120, 80%, 60%);
    --sunpillar-3: hsl(140, 80%, 60%);
    --sunpillar-4: hsl(160, 80%, 60%);
    --sunpillar-5: hsl(180, 80%, 60%);
    --sunpillar-6: hsl(200, 80%, 60%);
  }

  .preset-card[data-rarity="uncommon"] .preset-card__front {
    background-color: #040906;
    border-color: hsl(150, 50%, 30%);
  }

  .preset-card[data-rarity="uncommon"] .preset-card__title {
    color: hsl(150, 70%, 75%);
    text-shadow:
      0 0 8px hsl(150, 60%, 50%),
      0 2px 10px oklch(0 0 0 / 0.6);
  }

  /* Rarity: Common (Gray, no holographic) */
  .preset-card[data-rarity="common"] {
    --card-glow: hsl(0, 0%, 60%);
    --card-edge: hsl(0, 0%, 50%);
  }

  .preset-card[data-rarity="common"] .preset-card__front {
    background-color: #0a0a0a;
    border-color: oklch(1 0 0 / 0.12);
  }

  .preset-card[data-rarity="common"] .preset-card__title {
    color: hsl(0, 0%, 75%);
    text-shadow: 0 0 8px oklch(1 0 0 / 0.2);
  }

  .preset-card[data-rarity="common"] .preset-card__shine {
    background-image: linear-gradient(
      115deg,
      transparent 40%,
      oklch(1 0 0 / 0.15) 50%,
      transparent 60%
    );
    filter: brightness(0.8) contrast(1) saturate(0);
    mix-blend-mode: overlay;
  }

  .preset-card[data-rarity="common"] .preset-card__glare {
    opacity: calc(var(--card-opacity) * 0.5);
  }

  /* CSS hover fallback */
  .preset-card:hover,
  .preset-card:focus-visible {
    --pointer-x: 40%;
    --pointer-y: 35%;
    --pointer-from-center: 0.5;
    --pointer-from-top: 0.35;
    --pointer-from-left: 0.4;
    --card-opacity: 1;
    --background-x: 45%;
    --background-y: 40%;
  }

  /* Idle shimmer */
  .preset-card:not(:hover):not(.interacting) .preset-card__shine {
    animation: shimmer 5s ease-in-out infinite;
    opacity: 0.08;
  }

  @keyframes shimmer {
    0%, 100% {
      background-position: 30% 30%;
    }
    50% {
      background-position: 70% 70%;
    }
  }

  .preset-card.interacting .preset-card__rotator {
    transition: none;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .preset-card__rotator {
      transition: none;
      transform: none;
    }
    .preset-card__shine,
    .preset-card__glare {
      display: none;
    }
  }

  /* Responsive */
  @media (max-width: 1100px) {
    .preset-card__title {
      font-size: 1rem;
      letter-spacing: 0.07em;
    }
    .preset-card__desc {
      font-size: 0.65rem;
    }
    .traits-list li {
      font-size: 0.58rem;
    }
  }

  @media (max-width: 640px) {
    .preset-card__front {
      padding: 0.35rem;
      gap: 0.35rem;
    }
    .preset-card__header {
      padding: 0.3rem 0.2rem 0;
    }
    .preset-card__title {
      font-size: 0.85rem;
      letter-spacing: 0.06em;
    }
    .preset-card__subtitle {
      font-size: 0.5rem;
      letter-spacing: 0.1em;
    }
    .preset-card__desc {
      font-size: 0.65rem;
      padding: 0.35rem;
    }
    .preset-card__traits {
      padding: 0.35rem;
    }
    .traits-list li {
      font-size: 0.55rem;
    }
    .preset-card__stats {
      padding: 0.4rem;
      gap: 0.25rem;
    }
    .stat-value {
      font-size: 0.65rem;
    }
    .stat-label {
      font-size: 0.5rem;
    }
  }
</style>
