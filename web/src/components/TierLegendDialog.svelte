<script lang="ts">
  /**
   * TierLegendDialog - Simple modal explaining S-F tier ranking system
   * Uses Modal wrapper for consistent dialog behavior
   */

  import { EFFECTIVENESS_RANKS, RANK_LABELS } from '$lib/types'
  import Modal from './ui/Modal.svelte'

  interface Props {
    open: boolean
    onclose: () => void
  }

  let { open, onclose }: Props = $props()

  const tiers = Object.values(EFFECTIVENESS_RANKS).map((rank) => ({
    rank,
    label: RANK_LABELS[rank],
  }))
</script>

<Modal {open} {onclose} size="sm" class="tier-dialog">
  {#snippet header()}
    <h2 class="modal-title tier-dialog__title">Tier Rankings</h2>
  {/snippet}

  <pre class="tier-dialog__body">{#each tiers as tier}
[{tier.rank}] {tier.label}
{/each}</pre>

  {#snippet footer()}
    <p class="tier-dialog__note">Rankings based on measurable impact and community testing. Your mileage may vary.</p>
  {/snippet}
</Modal>

<style>
  /* Only component-specific overrides - layout comes from modal pattern */
  :global(.tier-dialog) {
    --_width: 320px;
    --_clip: var(--clip-cyber-sm);
  }

  .tier-dialog__title {
    font-family: var(--font-mono);
    font-size: 0.85rem;
  }

  .tier-dialog__body {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.8;
    color: var(--text-secondary);
    white-space: pre-line;
  }

  :global(.tier-dialog .modal-footer) {
    justify-content: center;
  }

  .tier-dialog__note {
    margin: 0;
    font-size: 0.7rem;
    color: var(--text-hint);
  }
</style>
