/**
 * Rich Tooltip System - Self-contained Svelte Action
 *
 * Supports markdown-like formatting in tooltips:
 * - **bold** for emphasis
 * - ⚠️ prefix for warnings
 * - ✓ prefix for benefits
 * - Lines starting with "- " become list items
 * - Empty line creates paragraph break
 *
 * Usage:
 * ```svelte
 * <button use:tooltip={'Click to submit'}>Submit</button>
 * <label use:tooltip={`**Bold** text\n- List item`}>Info</label>
 * ```
 */

const TOOLTIP_ID = 'rich-tooltip'

interface TooltipConfig {
  showDelay: number
  hideDelay: number
  offset: number
}

const config: TooltipConfig = {
  showDelay: 200,
  hideDelay: 100,
  offset: 8,
}

/**
 * Get or create the shared tooltip element
 */
function getTooltipElement(): HTMLElement {
  const existing = document.getElementById(TOOLTIP_ID)
  if (existing) return existing

  const el = document.createElement('div')
  el.id = TOOLTIP_ID
  el.setAttribute('role', 'tooltip')
  el.setAttribute('aria-hidden', 'true')
  document.body.appendChild(el)
  return el
}

/**
 * Parse rich markdown-like content to HTML
 */
function parseRichContent(raw: string): string {
  const lines = raw.split('\n')
  const parts: string[] = []
  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      if (inList) {
        parts.push('</ul>')
        inList = false
      }
      continue
    }

    if (trimmed.startsWith('- ')) {
      if (!inList) {
        parts.push('<ul>')
        inList = true
      }
      const content = formatInline(trimmed.slice(2))
      parts.push(`<li>${content}</li>`)
      continue
    }

    if (inList) {
      parts.push('</ul>')
      inList = false
    }

    if (trimmed.startsWith('⚠️') || trimmed.startsWith('⚠')) {
      parts.push(`<p class="tt-warn">${formatInline(trimmed)}</p>`)
      continue
    }

    if (trimmed.startsWith('✓') || trimmed.startsWith('✔')) {
      parts.push(`<p class="tt-ok">${formatInline(trimmed)}</p>`)
      continue
    }

    parts.push(`<p>${formatInline(trimmed)}</p>`)
  }

  if (inList) parts.push('</ul>')

  return parts.join('')
}

/**
 * Format inline markdown (bold)
 */
function formatInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

/**
 * Position the tooltip relative to the trigger element
 */
function positionTooltip(tooltip: HTMLElement, trigger: HTMLElement): void {
  const triggerRect = trigger.getBoundingClientRect()
  const tooltipRect = tooltip.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let top = triggerRect.bottom + config.offset
  let left = triggerRect.left

  if (left + tooltipRect.width > viewportWidth - 16) {
    left = triggerRect.right - tooltipRect.width
  }

  if (left < 16) {
    left = 16
  }

  if (top + tooltipRect.height > viewportHeight - 16) {
    top = triggerRect.top - tooltipRect.height - config.offset
    tooltip.classList.add('tt-above')
  } else {
    tooltip.classList.remove('tt-above')
  }

  tooltip.style.top = `${top + window.scrollY}px`
  tooltip.style.left = `${left + window.scrollX}px`
}

/**
 * Show the tooltip for a given trigger
 */
function showTooltipFor(trigger: HTMLElement, content: string): void {
  const tooltip = getTooltipElement()

  if (!content) return

  const isRich = content.includes('\n') || content.includes('**') || content.includes('- ')

  if (isRich) {
    tooltip.innerHTML = parseRichContent(content)
    tooltip.classList.add('tt-rich')
  } else {
    tooltip.textContent = content
    tooltip.classList.remove('tt-rich')
  }

  tooltip.classList.add('tt-visible')
  tooltip.setAttribute('aria-hidden', 'false')

  requestAnimationFrame(() => {
    positionTooltip(tooltip, trigger)
  })
}

/**
 * Hide the tooltip
 */
function hideTooltipElement(): void {
  const tooltip = document.getElementById(TOOLTIP_ID)
  if (tooltip) {
    tooltip.classList.remove('tt-visible')
    tooltip.setAttribute('aria-hidden', 'true')
  }
}

// ============================================================================
// Self-contained Svelte Action
// ============================================================================

/**
 * Svelte action for tooltips - SELF-CONTAINED
 *
 * Each element using this action manages its own event listeners.
 * No global setup required.
 *
 * Usage:
 * ```svelte
 * <button use:tooltip={'Click to submit'}>Submit</button>
 * <label use:tooltip={`**Bold** text\n- List item`}>Info</label>
 * ```
 */
export function tooltip(node: HTMLElement, content: string) {
  let showTimeout: ReturnType<typeof setTimeout> | null = null
  let hideTimeout: ReturnType<typeof setTimeout> | null = null
  let currentContent = content
  let isActive = false

  function show() {
    if (isActive) return
    isActive = true
    showTooltipFor(node, currentContent)
  }

  function hide() {
    if (!isActive) return
    isActive = false
    hideTooltipElement()
  }

  function clearTimeouts() {
    if (showTimeout) {
      clearTimeout(showTimeout)
      showTimeout = null
    }
    if (hideTimeout) {
      clearTimeout(hideTimeout)
      hideTimeout = null
    }
  }

  function handleMouseEnter() {
    clearTimeouts()
    showTimeout = setTimeout(show, config.showDelay)
  }

  function handleMouseLeave() {
    clearTimeouts()
    hideTimeout = setTimeout(hide, config.hideDelay)
  }

  function handleFocusIn() {
    clearTimeouts()
    show()
  }

  function handleFocusOut() {
    clearTimeouts()
    hide()
  }

  function handlePointerDown() {
    // Hide immediately on click to prevent sticky tooltips
    clearTimeouts()
    hide()
  }

  // Set up event listeners
  node.addEventListener('mouseenter', handleMouseEnter)
  node.addEventListener('mouseleave', handleMouseLeave)
  node.addEventListener('focusin', handleFocusIn)
  node.addEventListener('focusout', handleFocusOut)
  node.addEventListener('pointerdown', handlePointerDown)

  // Also set data-tooltip for CSS fallback
  node.dataset.tooltip = content

  return {
    update(newContent: string) {
      currentContent = newContent
      node.dataset.tooltip = newContent
      if (isActive) {
        showTooltipFor(node, newContent)
      }
    },
    destroy() {
      clearTimeouts()
      hide()

      // Clean up event listeners
      node.removeEventListener('mouseenter', handleMouseEnter)
      node.removeEventListener('mouseleave', handleMouseLeave)
      node.removeEventListener('focusin', handleFocusIn)
      node.removeEventListener('focusout', handleFocusOut)
      node.removeEventListener('pointerdown', handlePointerDown)

      delete node.dataset.tooltip
    },
  }
}
