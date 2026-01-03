<script lang="ts">
  /**
   * Modal - Reusable dialog wrapper using Svelte 5 snippets
   *
   * Provides:
   * - Native <dialog> element with showModal/close sync
   * - Backdrop click to close
   * - ESC key handling
   * - Scroll position preservation
   * - Consistent header/body/footer structure
   */

  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'

  interface Props {
    open: boolean
    onclose: () => void
    size?: 'sm' | 'md' | 'lg' | 'xl'
    class?: string
    header: Snippet
    children: Snippet
    footer?: Snippet
  }

  let {
    open,
    onclose,
    size = 'md',
    class: className = '',
    header,
    children,
    footer,
  }: Props = $props()

  let dialogEl: HTMLDialogElement | null = $state(null)

  $effect(() => {
    if (!dialogEl) return

    if (open) {
      if (!dialogEl.open) {
        const scrollY = window.scrollY
        dialogEl.showModal()
        window.scrollTo({ top: scrollY, behavior: 'instant' })
      }
    } else {
      if (dialogEl.open) {
        dialogEl.close()
      }
    }
  })

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl) {
      onclose()
    }
  }

  function handleCancel(e: Event) {
    e.preventDefault()
    onclose()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onclose()
    }
  }
</script>

<dialog
  bind:this={dialogEl}
  class="modal-base modal-base--{size} {className}"
  onclick={handleBackdropClick}
  oncancel={handleCancel}
  onkeydown={handleKeydown}
>
  <header class="modal-header">
    {@render header()}
    <button type="button" class="modal-close" aria-label="Close" onclick={onclose}>
      <Icon name="close" size="md" />
    </button>
  </header>

  <div class="modal-body">
    {@render children()}
  </div>

  {#if footer}
    <footer class="modal-footer">
      {@render footer()}
    </footer>
  {/if}
</dialog>
