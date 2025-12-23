import { diffLines } from 'diff'
import { escapeHtml } from '../../utils/dom'

// Skip header lines when finding "meaningful" changes (timestamp always changes)
const SKIP_HEADER_LINES = 12

export interface DiffResult {
  html: string
  changedLineIds: string[]
  totalChanges: number
}

export interface CodeViewer {
  setMode: (mode: string) => void
  setContent: (content: { current: string; previous?: string }) => void
  getContent: () => string
  navigateDiff: (direction: 'prev' | 'next') => void
  getChangedCount: () => number
  getCurrentChangeIndex: () => number
}

export function renderDiffHtml(previous = '', current = ''): DiffResult {
  const diffParts = diffLines(previous, current)
  let oldLine = 1
  let newLine = 1
  let rowIndex = 0
  const rows: string[] = []
  const changedLineIds: string[] = []

  // Debug logging (can remove after verification)
  console.log('[Diff Debug] Previous length:', previous.length, 'Current length:', current.length)
  console.log('[Diff Debug] Parts count:', diffParts.length)

  for (const part of diffParts) {
    const lines = part.value.split('\n')
    // Drop trailing empty line caused by split on final newline
    if (lines[lines.length - 1] === '') lines.pop()

    const isAdded = Boolean(part.added)
    const isRemoved = Boolean(part.removed)

    if (isAdded || isRemoved) {
      console.log(`[Diff Debug] ${isAdded ? 'ADDED' : 'REMOVED'} ${lines.length} lines`)
    }

    for (const line of lines) {
      const cls = isAdded ? 'diff-added' : isRemoved ? 'diff-removed' : 'diff-unchanged'
      const changeType = isAdded ? 'added' : isRemoved ? 'removed' : 'unchanged'
      const displayOld = isAdded ? '' : oldLine++
      const displayNew = isRemoved ? '' : newLine++
      const escaped = escapeHtml(line)
      const lineId = `diff-line-${rowIndex}`

      // Track changed lines for navigation
      if (isAdded || isRemoved) {
        changedLineIds.push(lineId)
      }

      rows.push(
        `<div id="${lineId}" class="cv-line ${cls}" data-change="${changeType}"><span class="cv-ln old">${displayOld || '•'}</span><span class="cv-ln new">${displayNew || '•'}</span><span class="cv-code">${escaped || ' '}</span></div>`,
      )
      rowIndex++
    }
  }

  console.log('[Diff Debug] Total changed lines:', changedLineIds.length)

  return {
    html: rows.join(''),
    changedLineIds,
    totalChanges: changedLineIds.length,
  }
}

// Get meaningful changes (skip header/timestamp lines)
export function getMeaningfulChanges(changedLineIds: string[]): string[] {
  return changedLineIds.filter((id) => {
    const lineNum = parseInt(id.split('-')[2], 10)
    return lineNum >= SKIP_HEADER_LINES
  })
}

export function createCodeViewer(root: HTMLElement | null): CodeViewer | null {
  if (!root) return null

  const tabs = Array.from(root.querySelectorAll('.cv-tab')) as HTMLElement[]
  const panes: Record<string, HTMLElement | HTMLTextAreaElement | null> = {
    current: root.querySelector('[data-pane="current"]'),
    diff: root.querySelector('[data-pane="diff"]'),
    edit: root.querySelector('[data-pane="edit"]'),
  }
  const navContainer = root.querySelector('.cv-nav') as HTMLElement | null
  const navCount = root.querySelector('.cv-nav-count') as HTMLElement | null
  const navPrev = root.querySelector('.cv-nav-btn[data-dir="prev"]') as HTMLButtonElement | null
  const navNext = root.querySelector('.cv-nav-btn[data-dir="next"]') as HTMLButtonElement | null

  let mode = 'current'
  let previousValue = ''
  let currentValue = ''
  let changedLineIds: string[] = []
  let currentChangeIndex = -1

  function updateNavUI(): void {
    if (!navContainer || !navCount) return

    const meaningfulChanges = getMeaningfulChanges(changedLineIds)
    const total = meaningfulChanges.length

    if (total === 0) {
      navContainer.hidden = true
      return
    }

    navContainer.hidden = mode !== 'diff'

    // Find current index within meaningful changes
    const currentId = meaningfulChanges[currentChangeIndex] || ''
    const displayIndex = currentChangeIndex >= 0 ? currentChangeIndex + 1 : 0
    navCount.textContent = `${displayIndex}/${total}`

    // Update button states
    if (navPrev) navPrev.disabled = currentChangeIndex <= 0
    if (navNext) navNext.disabled = currentChangeIndex >= total - 1
  }

  function scrollToChange(index: number): void {
    const meaningfulChanges = getMeaningfulChanges(changedLineIds)
    if (index < 0 || index >= meaningfulChanges.length) return

    currentChangeIndex = index
    const lineId = meaningfulChanges[index]
    const element = root?.querySelector(`#${lineId}`)

    if (element) {
      // Remove focus from all lines
      root?.querySelectorAll('.cv-line.diff-focus').forEach((el) => {
        el.classList.remove('diff-focus')
      })

      // Add focus to current line
      element.classList.add('diff-focus')
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    updateNavUI()
  }

  function navigateDiff(direction: 'prev' | 'next'): void {
    const meaningfulChanges = getMeaningfulChanges(changedLineIds)
    if (meaningfulChanges.length === 0) return

    if (direction === 'next') {
      const nextIndex = currentChangeIndex + 1
      if (nextIndex < meaningfulChanges.length) {
        scrollToChange(nextIndex)
      }
    } else {
      const prevIndex = currentChangeIndex - 1
      if (prevIndex >= 0) {
        scrollToChange(prevIndex)
      }
    }
  }

  function setMode(next: string): void {
    if (!panes[next]) return
    mode = next
    for (const t of tabs) {
      t.classList.toggle('active', t.dataset.mode === next)
    }

    for (const [key, pane] of Object.entries(panes)) {
      if (!pane) continue
      pane.classList.toggle('active', key === next)
    }

    if (next === 'edit' && panes.edit && currentValue) {
      ;(panes.edit as HTMLTextAreaElement).value = currentValue
    }

    // Show/hide navigation based on mode
    updateNavUI()

    // Auto-scroll to last meaningful change when switching to diff mode
    if (next === 'diff') {
      const meaningfulChanges = getMeaningfulChanges(changedLineIds)
      if (meaningfulChanges.length > 0) {
        // Scroll to the last change (most recent addition)
        setTimeout(() => scrollToChange(meaningfulChanges.length - 1), 100)
      }
    }
  }

  function setContent({
    current = '',
    previous = '',
  }: {
    current: string
    previous?: string
  }): void {
    currentValue = current
    previousValue = previous || ''
    if (panes.current) panes.current.textContent = currentValue
    if (panes.edit) (panes.edit as HTMLTextAreaElement).value = currentValue

    if (panes.diff) {
      const diffResult = renderDiffHtml(previousValue, currentValue)
      panes.diff.innerHTML = diffResult.html
      changedLineIds = diffResult.changedLineIds
      currentChangeIndex = -1
      updateNavUI()
    }
  }

  function getContent(): string {
    if (mode === 'edit' && panes.edit) return (panes.edit as HTMLTextAreaElement).value
    return currentValue
  }

  function getChangedCount(): number {
    return getMeaningfulChanges(changedLineIds).length
  }

  function getCurrentChangeIndex(): number {
    return currentChangeIndex
  }

  // Tab click handlers
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const tabMode = tab.dataset.mode
      if (tabMode) setMode(tabMode)
    })
  }

  // Navigation button handlers
  navPrev?.addEventListener('click', () => navigateDiff('prev'))
  navNext?.addEventListener('click', () => navigateDiff('next'))

  // Default to current view
  setMode('current')

  return {
    setMode,
    setContent,
    getContent,
    navigateDiff,
    getChangedCount,
    getCurrentChangeIndex,
  }
}

export function computeStats(text = ''): { lines: number; sizeKb: string } {
  const lines = text.split('\n').length
  const sizeKb = (new Blob([text]).size / 1024).toFixed(1)
  return { lines, sizeKb }
}
