<script lang="ts">
  /**
   * SRAnnounce - Screen Reader Announcements
   *
   * Provides a live region for announcing dynamic content changes
   * to screen reader users.
   */

  import { app } from '$lib/state.svelte'

  // Track previous counts for announcements
  let prevSelectedCount = $state(0)
  let prevOptCount = $state(0)

  // Announcement message
  let message = $state('')

  // React to selection changes
  $effect(() => {
    const currentSelected = app.selected.size
    const currentOpts = app.optimizations.size

    // Announce software selection changes
    if (currentSelected !== prevSelectedCount) {
      const diff = currentSelected - prevSelectedCount
      if (diff > 0) {
        message = `Added ${diff} software package${diff > 1 ? 's' : ''} to selection. Total: ${currentSelected}`
      } else if (diff < 0) {
        message = `Removed ${Math.abs(diff)} software package${Math.abs(diff) > 1 ? 's' : ''} from selection. Total: ${currentSelected}`
      }
      prevSelectedCount = currentSelected
    }

    // Announce optimization changes
    if (currentOpts !== prevOptCount && prevOptCount > 0) {
      const diff = currentOpts - prevOptCount
      if (diff > 0) {
        message = `Enabled ${diff} optimization${diff > 1 ? 's' : ''}. Total: ${currentOpts}`
      } else if (diff < 0) {
        message = `Disabled ${Math.abs(diff)} optimization${Math.abs(diff) > 1 ? 's' : ''}. Total: ${currentOpts}`
      }
      prevOptCount = currentOpts
    } else if (prevOptCount === 0) {
      prevOptCount = currentOpts
    }
  })

  // Clear message after announcement
  $effect(() => {
    if (message) {
      const timeout = setTimeout(() => {
        message = ''
      }, 1000)
      return () => clearTimeout(timeout)
    }
  })
</script>

<div
  id="sr-announce"
  aria-live="polite"
  aria-atomic="true"
  class="sr-only"
>
  {message}
</div>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
