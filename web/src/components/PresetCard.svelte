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
          ? "Low"
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

    transform = `rotateY(${round(springRotate.current.x)}deg) rotateX(${round(
      springRotate.current.y,
    )}deg)`;
  }

  function animate() {
    springRotate.update();
    springGlare.update();
    springBackground.update();
    applyStyles();

    const settled =
      springRotate.isSettled() &&
      springGlare.isSettled() &&
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
          <span class="stat-value stat-value--risk-{riskLevel}">{riskText}</span
          >
        </div>
      </div>
    </div>

    <!-- Holographic layers -->
    <div class="preset-card__shine"></div>
    <div class="preset-card__glare"></div>
  </div>
</button>

<!-- Styles are in presets.styles.css -->
