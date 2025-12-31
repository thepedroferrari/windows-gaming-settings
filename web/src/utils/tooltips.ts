/**
 * Rich Tooltip System - Self-contained Svelte Action
 *
 * Supports two formats:
 * 1. String (legacy) - markdown-like formatting:
 *    - **bold** for emphasis
 *    - ⚠️ prefix for warnings
 *    - ✓ prefix for benefits
 *    - Lines starting with "- " become list items
 *    - Empty line creates paragraph break
 *
 * 2. Structured object (new) - pros/cons grid layout:
 *    { title, desc, pros: string[], cons: string[] }
 *
 * Usage:
 * ```svelte
 * <button use:tooltip={'Click to submit'}>Submit</button>
 * <label use:tooltip={{ title: 'Feature', desc: '...', pros: [...], cons: [...] }}>Info</label>
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
 * Structured tooltip format with pros/cons
 */
export interface StructuredTooltip {
  title: string
  desc: string
  pros: string[]
  cons: string[]
}

export type TooltipContent = string | StructuredTooltip

/**
 * Type guard for structured tooltip
 */
function isStructuredTooltip(content: TooltipContent): content is StructuredTooltip {
  return typeof content === 'object' && content !== null && 'pros' in content && 'cons' in content
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
 * Parse rich markdown-like content to HTML (legacy string format)
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
      // Strip the warning emoji, CSS ::before will add icon
      const text = trimmed.replace(/^⚠️?\s*/, '')
      parts.push(`<p class="tt-warn">${formatInline(text)}</p>`)
      continue
    }

    if (trimmed.startsWith('✓') || trimmed.startsWith('✔')) {
      // Strip the checkmark, CSS ::before will add icon
      const text = trimmed.replace(/^[✓✔]\s*/, '')
      parts.push(`<p class="tt-ok">${formatInline(text)}</p>`)
      continue
    }

    parts.push(`<p>${formatInline(trimmed)}</p>`)
  }

  if (inList) parts.push('</ul>')

  return parts.join('')
}

/**
 * Render structured tooltip with pros/cons grid layout
 */
function renderStructuredTooltip(content: StructuredTooltip): string {
  const prosItems = content.pros.map((p) => `<li>${formatInline(p)}</li>`).join('')
  const consItems = content.cons.map((c) => `<li>${formatInline(c)}</li>`).join('')

  return `
    <div class="tt-header">
      <strong class="tt-title">${formatInline(content.title)}</strong>
      <p class="tt-desc">${formatInline(content.desc)}</p>
    </div>
    <div class="tt-pros">
      <span class="tt-column-label">Benefits</span>
      <ul>${prosItems}</ul>
    </div>
    <div class="tt-cons">
      <span class="tt-column-label">Risks</span>
      <ul>${consItems}</ul>
    </div>
  `
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

  // Center the tooltip under the trigger if possible
  const centeredLeft = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2

  // Use centered position if it fits
  if (centeredLeft >= 16 && centeredLeft + tooltipRect.width <= viewportWidth - 16) {
    left = centeredLeft
  } else if (left + tooltipRect.width > viewportWidth - 16) {
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
function showTooltipFor(trigger: HTMLElement, content: TooltipContent): void {
  const tooltip = getTooltipElement()

  if (!content) return

  // Clear previous classes
  tooltip.classList.remove('tt-rich', 'tt-structured')

  if (isStructuredTooltip(content)) {
    // Structured tooltip with pros/cons grid
    tooltip.innerHTML = renderStructuredTooltip(content)
    tooltip.classList.add('tt-structured')
  } else {
    // Legacy string format
    const isRich = content.includes('\n') || content.includes('**') || content.includes('- ')

    if (isRich) {
      tooltip.innerHTML = parseRichContent(content)
      tooltip.classList.add('tt-rich')
    } else {
      tooltip.textContent = content
    }
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
 * <label use:tooltip={{ title: 'Feature', desc: '...', pros: [...], cons: [...] }}>Info</label>
 * ```
 */
export function tooltip(node: HTMLElement, content: TooltipContent) {
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

  // Also set data-tooltip for CSS fallback (stringify if object)
  node.dataset.tooltip = typeof content === 'string' ? content : JSON.stringify(content)

  return {
    update(newContent: TooltipContent) {
      currentContent = newContent
      node.dataset.tooltip = typeof newContent === 'string' ? newContent : JSON.stringify(newContent)
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
