<script lang="ts">
  /**
   * Driver Cards - Shows relevant driver download links based on hardware selection
   */

  import { app } from '$lib/state.svelte'
  import { DRIVER_CARDS, isDriverCardVisible } from '$lib/hardware'

  // Derived: visible driver cards based on current hardware selection
  let visibleCards = $derived(
    DRIVER_CARDS.filter((card) => isDriverCardVisible(card, app.hardware.cpu, app.hardware.gpu))
  )
</script>

<div class="driver-warning">
  <svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path
      d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
    />
    <path d="M12 9v4" />
    <circle cx="12" cy="17" r="0.5" fill="currentColor" />
  </svg>
  <div class="content">
    <strong>Critical for stability & performance</strong>
    <span
      >Outdated drivers can cause crashes, stuttering, and break optimizations.
      Update these before running any script.</span
    >
  </div>
</div>

<div id="driver-cards" class="driver-cards">
  {#each visibleCards as card (card.id)}
    <div
      class="card"
      class:card--mobo={card.badge === 'mobo'}
      class:active={true}
      data-driver={card.id}
    >
      <span class="badge {card.badge}">{card.badge.toUpperCase()}</span>
      <h4>{card.title}</h4>
      <p>{card.description}</p>
      {#if card.links.length === 1}
        <a href={card.links[0].url} target="_blank" rel="noopener">
          {card.links[0].label} ↗
        </a>
      {:else}
        <div class="links">
          {#each card.links as link}
            <a href={link.url} target="_blank" rel="noopener">{link.label} ↗</a>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>
