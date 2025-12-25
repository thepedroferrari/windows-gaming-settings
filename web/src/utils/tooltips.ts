/**
 * Rich Tooltip System
 * Supports markdown-like formatting in tooltips:
 * - **bold** for emphasis
 * - ⚠️ prefix for warnings
 * - ✓ prefix for benefits
 * - Lines starting with "- " become list items
 * - Empty line creates paragraph break
 */

import type { CleanupController } from './lifecycle'

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

let showTimeout: ReturnType<typeof setTimeout> | null = null
let hideTimeout: ReturnType<typeof setTimeout> | null = null
let currentTrigger: HTMLElement | null = null

function createTooltipElement(): HTMLElement {
  const existing = document.getElementById(TOOLTIP_ID)
  if (existing) return existing

  const el = document.createElement('div')
  el.id = TOOLTIP_ID
  el.setAttribute('role', 'tooltip')
  el.setAttribute('aria-hidden', 'true')
  document.body.appendChild(el)
  return el
}

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

function formatInline(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

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

function showTooltip(trigger: HTMLElement, controller?: CleanupController): void {
  const tooltip = createTooltipElement()
  const content = trigger.dataset.tooltip || ''

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
  currentTrigger = trigger

  const scheduleFrame = (cb: FrameRequestCallback): number =>
    controller ? controller.requestAnimationFrame(cb) : requestAnimationFrame(cb)

  scheduleFrame(() => {
    positionTooltip(tooltip, trigger)
  })
}

function hideTooltip(): void {
  const tooltip = document.getElementById(TOOLTIP_ID)
  if (tooltip) {
    tooltip.classList.remove('tt-visible')
    tooltip.setAttribute('aria-hidden', 'true')
  }
  currentTrigger = null
}

function scheduleTimeout(
  controller: CleanupController | undefined,
  fn: () => void,
  delay: number,
): ReturnType<typeof setTimeout> {
  return controller ? controller.setTimeout(fn, delay) : setTimeout(fn, delay)
}

function clearTimeoutWithController(
  controller: CleanupController | undefined,
  id: ReturnType<typeof setTimeout> | null,
): void {
  if (!id) return
  if (controller) {
    controller.clearTimeout(id)
  } else {
    clearTimeout(id)
  }
}

function clearTimeouts(controller?: CleanupController): void {
  clearTimeoutWithController(controller, showTimeout)
  showTimeout = null
  clearTimeoutWithController(controller, hideTimeout)
  hideTimeout = null
}

function handleMouseEnter(e: Event, controller?: CleanupController): void {
  const target = e.target
  if (!(target instanceof Element)) return

  const trigger = target.closest('[data-tooltip]') as HTMLElement | null
  if (!trigger) return

  if (hideTimeout) {
    clearTimeoutWithController(controller, hideTimeout)
    hideTimeout = null
  }

  if (currentTrigger === trigger) return

  showTimeout = scheduleTimeout(
    controller,
    () => showTooltip(trigger, controller),
    config.showDelay,
  )
}

function handleMouseLeave(controller?: CleanupController): void {
  if (showTimeout) {
    clearTimeoutWithController(controller, showTimeout)
    showTimeout = null
  }

  hideTimeout = scheduleTimeout(
    controller,
    () => {
      hideTooltip()
    },
    config.hideDelay,
  )
}

function handleFocusIn(e: Event, controller?: CleanupController): void {
  const target = e.target
  if (!(target instanceof Element)) return

  const trigger = target.closest('[data-tooltip]') as HTMLElement | null
  if (trigger) showTooltip(trigger, controller)
}

function handleFocusOut(): void {
  hideTooltip()
}

export function setupRichTooltips(controller?: CleanupController): void {
  const mouseEnterHandler = (e: Event): void => handleMouseEnter(e, controller)
  const mouseLeaveHandler = (): void => handleMouseLeave(controller)
  const focusInHandler = (e: Event): void => handleFocusIn(e, controller)

  if (controller) {
    controller.addEventListener(document, 'mouseenter', mouseEnterHandler, { capture: true })
    controller.addEventListener(document, 'mouseleave', mouseLeaveHandler, { capture: true })
    controller.addEventListener(document, 'focusin', focusInHandler)
    controller.addEventListener(document, 'focusout', handleFocusOut)
  } else {
    document.addEventListener('mouseenter', mouseEnterHandler, { capture: true })
    document.addEventListener('mouseleave', mouseLeaveHandler, { capture: true })
    document.addEventListener('focusin', focusInHandler)
    document.addEventListener('focusout', handleFocusOut)
  }

  const scrollHandler = (): void => {
    if (currentTrigger) {
      const tooltip = document.getElementById(TOOLTIP_ID)
      if (tooltip) positionTooltip(tooltip, currentTrigger)
    }
  }

  if (controller) {
    controller.addEventListener(window, 'scroll', scrollHandler, { passive: true })
  } else {
    window.addEventListener('scroll', scrollHandler, { passive: true })
  }

  controller?.onCleanup(() => {
    clearTimeouts(controller)
    hideTooltip()
    const tooltip = document.getElementById(TOOLTIP_ID)
    tooltip?.remove()
  })
}
