<script lang="ts">
  /**
   * PresetCards - Holographic preset card grid
   *
   * Displays battle profile presets with holographic card effects.
   * Each preset configures optimizations and software selections.
   */

  import PresetCard from "./PresetCard.svelte";
  import type { PresetType } from "$lib/types";
  import type { PresetConfig } from "$lib/presets";
  import { PRESET_META, PRESET_ORDER, PRESETS } from "$lib/presets";

  interface Props {
    activePreset?: PresetType | null;
    onPresetSelect?: (preset: PresetType, config: PresetConfig) => void;
  }

  let { activePreset = null, onPresetSelect }: Props = $props();

  function handleSelect(preset: PresetType) {
    onPresetSelect?.(preset, PRESETS[preset]);
  }
</script>

<div class="presets-scroll-container">
  <div class="presets">
    {#each PRESET_ORDER as preset (preset)}
      {@const meta = PRESET_META[preset]}
      {@const config = PRESETS[preset]}
      <PresetCard
        {preset}
        label={meta.label}
        subtitle={meta.subtitle}
        description={meta.description}
        traits={meta.traits}
        rarity={meta.rarity}
        intensity={meta.intensity}
        riskLevel={meta.risk}
        overheadLabel={meta.overheadLabel}
        latencyLabel={meta.latencyLabel}
        softwareCount={config.software.length}
        optimizationCount={config.opts.length}
        active={activePreset === preset}
        onSelect={handleSelect}
      />
    {/each}
  </div>
</div>

<!-- Styles are in presets.styles.css (layer: components) -->
