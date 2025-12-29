<script lang="ts">
  /**
   * CodeViewer - Script viewer with Current/Diff/Edit tabs
   *
   * Displays generated PowerShell scripts with:
   * - Current: Plain text view
   * - Diff: Line-by-line comparison with previous version
   * - Edit: Editable textarea for modifications
   */

  import { diffLines } from 'diff'
  import type { ScriptMode } from '$lib/state.svelte'
  import { copyToClipboard } from '../utils/clipboard'
  import { downloadText } from '../utils/download'
  import { SCRIPT_FILENAME } from '$lib/types'

  interface Props {
    /** Current script content */
    script: string
    /** Previous script content (for diff) */
    previousScript: string
    /** Current view mode */
    mode?: ScriptMode
    /** Label for the pill badge */
    pillLabel?: string
    /** Whether to show footer actions (copy, download) */
    showActions?: boolean
    /** Callback when mode changes */
    onModeChange?: (mode: ScriptMode) => void
    /** Callback when script is edited */
    onEdit?: (content: string) => void
  }

  let {
    script,
    previousScript,
    mode = 'current',
    pillLabel = 'Preview',
    showActions = true,
    onModeChange,
    onEdit,
  }: Props = $props()

  // Local state - activeMode derived from prop with local override capability
  let localModeOverride = $state<ScriptMode | null>(null)
  let activeMode = $derived(localModeOverride ?? mode)
  let diffIndex = $state(0)
  let isEditing = $state(false)
  let editContent = $state('')
  let copyText = $state('Copy')
  let copyTimeout: ReturnType<typeof setTimeout> | null = null
  let diffPaneEl: HTMLDivElement | null = null

  // Reset local override when prop changes
  $effect(() => {
    // When mode prop changes, clear local override
    void mode
    localModeOverride = null
  })

  // Initialize edit content when script changes
  $effect(() => {
    if (!isEditing) {
      editContent = script
    }
  })

  // Computed stats
  let lines = $derived(script ? script.split('\n').length : 0)
  let sizeKb = $derived(script ? (new Blob([script]).size / 1024).toFixed(1) : '0.0')

  // Computed diff
  interface DiffLine {
    type: 'added' | 'removed' | 'unchanged'
    oldLineNum: number | null
    newLineNum: number | null
    content: string
  }

  let diffLines$ = $derived.by(() => {
    const result: DiffLine[] = []
    let oldLine = 1
    let newLine = 1

    const changes = diffLines(previousScript || '', script || '')

    for (const part of changes) {
      const lines = part.value.split('\n')
      // Remove trailing empty string from split
      if (lines.length > 0 && lines[lines.length - 1] === '') {
        lines.pop()
      }

      for (const line of lines) {
        if (part.added) {
          result.push({
            type: 'added',
            oldLineNum: null,
            newLineNum: newLine,
            content: line,
          })
          newLine += 1
        } else if (part.removed) {
          result.push({
            type: 'removed',
            oldLineNum: oldLine,
            newLineNum: null,
            content: line,
          })
          oldLine += 1
        } else {
          result.push({
            type: 'unchanged',
            oldLineNum: oldLine,
            newLineNum: newLine,
            content: line,
          })
          oldLine += 1
          newLine += 1
        }
      }
    }

    return result
  })

  // Diff targets (lines with changes)
  let diffTargets = $derived(
    diffLines$
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.type !== 'unchanged'),
  )

  // Navigation visibility
  let showNav = $derived(activeMode === 'diff' && diffTargets.length > 0)

  function setMode(newMode: ScriptMode) {
    localModeOverride = newMode
    onModeChange?.(newMode)
  }

  function handleTabClick(tabMode: ScriptMode) {
    setMode(tabMode)
  }

  function handleEditFocus() {
    isEditing = true
  }

  function handleEditBlur() {
    isEditing = false
  }

  function handleEditInput(event: Event & { currentTarget: HTMLTextAreaElement }) {
    const { value } = event.currentTarget
    editContent = value
    onEdit?.(value)
  }

  function navigateDiff(direction: 'prev' | 'next') {
    if (diffTargets.length === 0) return

    if (direction === 'prev') {
      diffIndex = (diffIndex - 1 + diffTargets.length) % diffTargets.length
    } else {
      diffIndex = (diffIndex + 1) % diffTargets.length
    }

    scrollToCurrentDiff()
  }

  function scrollToCurrentDiff() {
    if (!diffPaneEl) return
    const target = diffTargets[diffIndex]
    if (!target) return

    const lineEls = diffPaneEl.querySelectorAll('.cv-line')
    const targetEl = lineEls[target.index]
    targetEl?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  async function handleCopy() {
    if (!script) return

    const success = await copyToClipboard(script)
    if (success) {
      copyText = 'Copied!'
      if (copyTimeout) clearTimeout(copyTimeout)
      copyTimeout = setTimeout(() => {
        copyText = 'Copy'
      }, 1800)
    }
  }

  function handleDownload() {
    if (!script.trim()) return
    downloadText(script, SCRIPT_FILENAME)
  }

  // Cleanup
  $effect(() => {
    return () => {
      if (copyTimeout) clearTimeout(copyTimeout)
    }
  })
</script>

<div class="code-viewer">
  <div class="toolbar">
    <button
      type="button"
      class="tab"
      class:active={activeMode === 'current'}
      onclick={() => handleTabClick('current')}
    >
      Current
    </button>
    <button
      type="button"
      class="tab"
      class:active={activeMode === 'diff'}
      onclick={() => handleTabClick('diff')}
    >
      Diff
    </button>
    <button
      type="button"
      class="tab"
      class:active={activeMode === 'edit'}
      onclick={() => handleTabClick('edit')}
    >
      Edit
    </button>

    {#if showNav}
      <div class="nav">
        <button
          type="button"
          class="nav-btn"
          title="Previous change"
          onclick={() => navigateDiff('prev')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <span class="nav-count">{diffIndex + 1}/{diffTargets.length}</span>
        <button
          type="button"
          class="nav-btn"
          title="Next change"
          onclick={() => navigateDiff('next')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    {/if}

    <div class="pill">{pillLabel}</div>
  </div>

  <div class="body">
    <!-- Current View -->
    <pre class="pane" class:active={activeMode === 'current'}>{script || '// No script generated'}</pre>

    <!-- Diff View -->
    <div class="pane diff" class:active={activeMode === 'diff'} bind:this={diffPaneEl}>
      {#each diffLines$ as line, index (index)}
        <div
          class="line"
          class:diff-added={line.type === 'added'}
          class:diff-removed={line.type === 'removed'}
          class:diff-unchanged={line.type === 'unchanged'}
          class:diff-focus={diffTargets[diffIndex]?.index === index}
        >
          <span class="ln">{line.oldLineNum ?? ''}</span>
          <span class="ln">{line.newLineNum ?? ''}</span>
          <span class="code">{line.content}</span>
        </div>
      {/each}
    </div>

    <!-- Edit View -->
    <textarea
      class="pane edit"
      class:active={activeMode === 'edit'}
      spellcheck="false"
      value={editContent}
      onfocus={handleEditFocus}
      onblur={handleEditBlur}
      oninput={handleEditInput}
    ></textarea>
  </div>

  <div class="footer">
    <div class="stats">
      <span>{lines} lines</span>
      <span>{sizeKb} KB</span>
    </div>
    {#if showActions}
      <div class="actions">
        <button type="button" class="btn-secondary" onclick={handleCopy}>
          {copyText}
        </button>
        <button type="button" class="download-btn" onclick={handleDownload}>
          <span class="text">Download</span>
          <span class="shimmer"></span>
        </button>
      </div>
    {/if}
  </div>
</div>
